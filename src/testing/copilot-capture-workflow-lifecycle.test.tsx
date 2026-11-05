// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImageDocument } from "../contracts/media";
import { CaptureWorkflowController } from "../features/capture-workflow/CaptureWorkflowController";

const preferences = {
  copyToClipboard: false,
  autoSave: false,
  showPreview: true,
  openInEditor: false,
  revealWindow: false,
};

const sameId = (src: string): ImageDocument =>
  Object.freeze({
    id: "reused-id",
    name: "Reused",
    src,
    width: 100,
    height: 80,
    mimeType: "image/png",
    byteSize: 128,
  });

async function startCapture() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Capture area" }));
    await Promise.resolve();
    await Promise.resolve();
  });
  await screen.findByRole("dialog");
}

describe("CaptureWorkflowController lifecycle regressions", () => {
  afterEach(() => vi.useRealTimers());

  it("uses the latest release callback after a rerender during a pending action", async () => {
    let resolveCopy!: () => void;
    const copy = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCopy = resolve;
        }),
    );
    const originalRelease = vi.fn();
    const latestRelease = vi.fn();
    const view = render(
      <CaptureWorkflowController
        preferences={preferences}
        autoDismissMs={null}
        onCapture={async () => sameId("blob:pending")}
        onCopy={copy}
        onReleaseSource={originalRelease}
      />,
    );
    await startCapture();
    const copyButton = screen.getByRole("button", { name: "Copy" });
    fireEvent.click(copyButton);
    view.rerender(
      <CaptureWorkflowController
        preferences={preferences}
        autoDismissMs={null}
        onCapture={async () => sameId("blob:pending")}
        onCopy={copy}
        onReleaseSource={latestRelease}
      />,
    );
    await act(async () => resolveCopy());
    view.unmount();

    expect(originalRelease).not.toHaveBeenCalled();
    expect(latestRelease).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: "reused-id" }),
    );
  });

  it("releases a timed-out source once and does not release again on unmount", async () => {
    const release = vi.fn();
    const view = render(
      <CaptureWorkflowController
        preferences={preferences}
        autoDismissMs={500}
        onCapture={async () => sameId("blob:timeout")}
        onReleaseSource={release}
      />,
    );
    await startCapture();
    vi.useFakeTimers();
    await act(async () => vi.advanceTimersByTime(500));
    view.unmount();

    expect(release).toHaveBeenCalledTimes(1);
  });

  it("releases each distinct capture when the document ID is reused", async () => {
    const release = vi.fn();
    let captureCount = 0;
    render(
      <CaptureWorkflowController
        preferences={preferences}
        autoDismissMs={null}
        onCapture={async () =>
          sameId(`blob:reuse-${++captureCount}`)}
        onReleaseSource={release}
      />,
    );
    await startCapture();
    fireEvent.click(screen.getByRole("button", { name: "Close Preview" }));
    await startCapture();

    expect(release).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close Preview" }));
    expect(release).toHaveBeenCalledTimes(2);
  });
});
