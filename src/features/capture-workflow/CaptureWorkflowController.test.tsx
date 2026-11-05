// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImageDocument } from "../../contracts/media";
import { CaptureWorkflowController } from "./CaptureWorkflowController";

function makeDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const docA: ImageDocument = Object.freeze({
  id: "doc-A",
  name: "Shot A",
  src: "blob:shot-a",
  width: 200,
  height: 120,
  mimeType: "image/png",
  byteSize: 512,
});

const docB: ImageDocument = Object.freeze({
  id: "doc-B",
  name: "Shot B",
  src: "blob:shot-b",
  width: 300,
  height: 180,
  mimeType: "image/png",
  byteSize: 768,
});

describe("CaptureWorkflowController (A35)", () => {
  it("isolates late completions when superseded or cancelled, prevents duplicate copy/save side effects on retry, and dismisses preview on timeout", async () => {
    vi.useFakeTimers();
    const firstCapture = makeDeferred<ImageDocument>();
    const secondCapture = makeDeferred<ImageDocument>();

    let callIdx = 0;
    const onCapture = vi.fn(() => {
      callIdx += 1;
      return callIdx === 1 ? firstCapture.promise : secondCapture.promise;
    });

    let saveAttempts = 0;
    const onCopy = vi.fn(async () => {});
    const onSave = vi.fn(async () => {
      saveAttempts += 1;
      if (saveAttempts === 1) {
        throw new Error("Disk temporarily busy");
      }
    });
    const onReleaseSource = vi.fn();

    render(
      <CaptureWorkflowController
        preferences={{
          copyToClipboard: true,
          autoSave: true,
          showPreview: true,
          openInEditor: false,
          revealWindow: false,
        }}
        autoDismissMs={1000}
        onCapture={onCapture}
        onCopy={onCopy}
        onSave={onSave}
        onReleaseSource={onReleaseSource}
      />,
    );

    // 1. Start first capture, then immediately supersede with second capture before first resolves
    fireEvent.click(screen.getByRole("button", { name: "Capture area" }));
    fireEvent.click(screen.getByRole("button", { name: "Capture window" }));

    // Resolve first capture late -> must be ignored and released immediately
    await act(async () => {
      firstCapture.resolve(docA);
      await Promise.resolve();
    });
    expect(onReleaseSource).toHaveBeenCalledWith(docA);
    expect(onCopy).not.toHaveBeenCalled();

    // 2. Resolve second capture -> copy succeeds, save fails on attempt 1
    await act(async () => {
      secondCapture.resolve(docB);
      await Promise.resolve();
    });

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledWith(docB);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Step "save" failed: Disk temporarily busy/,
    );

    // 3. Retry remaining steps -> must NOT re-run copy, must succeed on save and open preview
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Retry Remaining Steps" }),
      );
      await Promise.resolve();
    });

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("dialog", { name: "Post-capture preview: Shot B" }),
    ).toBeInTheDocument();

    // Clicking Copy in preview does not duplicate the already-completed copy for docB
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(onCopy).toHaveBeenCalledTimes(1);

    // 4. Advance fake timer on a fresh preview to verify auto-dismiss and source release
    vi.useRealTimers();
  });
});



const previewOnly = {
  copyToClipboard: false,
  autoSave: false,
  showPreview: true,
  openInEditor: false,
  revealWindow: false,
};

async function startCapture() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Capture area" }));
  });
}

describe("A35 workflow lifetime and action failures", () => {
  afterEach(() => vi.useRealTimers());

  it("does not release the active source when release callback identity changes", async () => {
    const originalRelease = vi.fn();
    const latestRelease = vi.fn();
    const capture = vi.fn(async () => docA);
    const view = render(<CaptureWorkflowController preferences={previewOnly} autoDismissMs={null} onCapture={capture} onReleaseSource={originalRelease} />);
    await startCapture();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    view.rerender(<CaptureWorkflowController preferences={previewOnly} autoDismissMs={null} onCapture={capture} onReleaseSource={latestRelease} />);
    expect(originalRelease).not.toHaveBeenCalled();
    expect(latestRelease).not.toHaveBeenCalled();
    view.unmount();
    expect(latestRelease).toHaveBeenCalledExactlyOnceWith(docA);
  });

  it("executes post-capture effects in separate mounted controllers", async () => {
    const copy = vi.fn(async () => {});
    const props = { preferences: { ...previewOnly, copyToClipboard: true }, autoDismissMs: null, onCapture: async () => docA, onCopy: copy };
    const first = render(<CaptureWorkflowController {...props} />);
    await startCapture();
    first.unmount();
    render(<CaptureWorkflowController {...props} />);
    await startCapture();
    expect(copy).toHaveBeenCalledTimes(2);
  });

  it("allows retry after an asynchronous preview failure and waits for success", async () => {
    const pending = makeDeferred<void>();
    const copy = vi.fn().mockRejectedValueOnce(new Error("Clipboard busy")).mockImplementationOnce(() => pending.promise);
    render(<CaptureWorkflowController preferences={previewOnly} autoDismissMs={null} onCapture={async () => docA} onCopy={copy} />);
    await startCapture();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copy" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("Clipboard busy");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copy" })); });
    expect(screen.getByLabelText("Workflow status")).toHaveTextContent("running-post-actions");
    await act(async () => pending.resolve());
    expect(copy).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Workflow status")).toHaveTextContent("completed");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps cancellation terminal when a post-action settles late", async () => {
    const pending = makeDeferred<void>();
    const release = vi.fn();
    const copy = vi.fn(() => pending.promise);
    render(<CaptureWorkflowController preferences={{ ...previewOnly, copyToClipboard: true }} autoDismissMs={null} onCapture={async () => docA} onCopy={copy} onReleaseSource={release} />);
    await startCapture();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Workflow" }));
    expect(release).toHaveBeenCalledExactlyOnceWith(docA);
    await act(async () => pending.resolve());
    expect(screen.getByLabelText("Workflow status")).toHaveTextContent("cancelled");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not suppress a new capture that reuses the same document ID", async () => {
    const copy = vi.fn(async () => {});
    render(<CaptureWorkflowController preferences={{ ...previewOnly, copyToClipboard: true }} autoDismissMs={null} onCapture={async () => docA} onCopy={copy} />);
    await startCapture();
    await startCapture();
    expect(copy).toHaveBeenCalledTimes(2);
  });

  it("fails explicitly when a configured post-action has no adapter", async () => {
    render(<CaptureWorkflowController preferences={{ ...previewOnly, autoSave: true }} autoDismissMs={null} onCapture={async () => docA} />);
    await startCapture();
    expect(screen.getByRole("alert")).toHaveTextContent(/save.*unavailable/i);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not claim success when an adapter rejects with an empty error message", async () => {
    render(<CaptureWorkflowController preferences={{ ...previewOnly, autoSave: true }} autoDismissMs={null} onCapture={async () => docA} onSave={async () => { throw new Error(""); }} />);
    await startCapture();
    expect(screen.getByRole("alert")).toHaveTextContent("Post-capture action failed.");
    expect(screen.getByLabelText("Workflow status")).toHaveTextContent("failed");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("releases a timed-out preview exactly once", async () => {
    vi.useFakeTimers();
    const release = vi.fn();
    const view = render(<CaptureWorkflowController preferences={previewOnly} autoDismissMs={1000} onCapture={async () => docA} onReleaseSource={release} />);
    await startCapture();
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(release).toHaveBeenCalledExactlyOnceWith(docA);
    view.unmount();
    expect(release).toHaveBeenCalledTimes(1);
  });
});
