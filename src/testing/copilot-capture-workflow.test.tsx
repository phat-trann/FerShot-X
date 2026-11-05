// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ImageDocument } from "../contracts/media";
import { CaptureWorkflowController } from "../features/capture-workflow/CaptureWorkflowController";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const docA: ImageDocument = Object.freeze({
  id: "qa-a",
  name: "QA A",
  src: "blob:qa-a",
  width: 20,
  height: 20,
  mimeType: "image/png",
  byteSize: 400,
});

const docB: ImageDocument = Object.freeze({
  id: "qa-b",
  name: "QA B",
  src: "blob:qa-b",
  width: 24,
  height: 24,
  mimeType: "image/png",
  byteSize: 576,
});

const preferences = {
  copyToClipboard: false,
  autoSave: false,
  showPreview: true,
  openInEditor: false,
  revealWindow: false,
};

describe("CaptureWorkflowController independent regressions", () => {
  it("releases a late capture result after the component unmounts", async () => {
    const pending = deferred<ImageDocument>();
    const onReleaseSource = vi.fn();
    const view = render(
      <CaptureWorkflowController
        preferences={preferences}
        onCapture={() => pending.promise}
        onReleaseSource={onReleaseSource}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Capture area" }));
    view.unmount();
    await act(async () => {
      pending.resolve(docA);
      await Promise.resolve();
    });

    expect(onReleaseSource).toHaveBeenCalledWith(docA);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("releases the superseded document and ignores its late preview", async () => {
    const first = deferred<ImageDocument>();
    const second = deferred<ImageDocument>();
    let calls = 0;
    const onReleaseSource = vi.fn();
    render(
      <CaptureWorkflowController
        preferences={preferences}
        onCapture={() => {
          calls += 1;
          return calls === 1 ? first.promise : second.promise;
        }}
        onReleaseSource={onReleaseSource}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Capture area" }));
    fireEvent.click(screen.getByRole("button", { name: "Capture window" }));
    await act(async () => {
      first.resolve(docA);
      await Promise.resolve();
    });
    expect(onReleaseSource).toHaveBeenCalledWith(docA);
    expect(screen.queryByRole("dialog")).toBeNull();

    await act(async () => {
      second.resolve(docB);
      await Promise.resolve();
    });
    expect(screen.getByRole("dialog", { name: "Post-capture preview: QA B" })).toBeInTheDocument();
  });

  it("does not run post-capture side effects after explicit cancellation", async () => {
    const pending = deferred<ImageDocument>();
    const onCopy = vi.fn();
    const onSave = vi.fn();
    const onReleaseSource = vi.fn();
    render(
      <CaptureWorkflowController
        preferences={{ ...preferences, copyToClipboard: true, autoSave: true }}
        onCapture={() => pending.promise}
        onCopy={onCopy}
        onSave={onSave}
        onReleaseSource={onReleaseSource}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Capture area" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Workflow" }));
    await act(async () => {
      pending.resolve(docA);
      await Promise.resolve();
    });

    expect(onCopy).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(onReleaseSource).toHaveBeenCalledWith(docA);
  });
});
