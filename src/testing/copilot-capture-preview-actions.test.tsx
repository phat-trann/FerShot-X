// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ImageDocument } from "../contracts/media";
import { CaptureWorkflowController } from "../features/capture-workflow/CaptureWorkflowController";

const previewOnly = {
  copyToClipboard: false,
  autoSave: false,
  showPreview: true,
  openInEditor: false,
  revealWindow: false,
};

const docA: ImageDocument = Object.freeze({
  id: "preview-doc-a",
  name: "Preview A",
  src: "blob:preview-a",
  width: 200,
  height: 120,
  mimeType: "image/png",
  byteSize: 512,
});

const docB: ImageDocument = Object.freeze({
  id: "preview-doc-b",
  name: "Preview B",
  src: "blob:preview-b",
  width: 300,
  height: 180,
  mimeType: "image/png",
  byteSize: 768,
});

async function startCapture() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Capture area" }));
    await Promise.resolve();
    await Promise.resolve();
  });
  await screen.findByRole("dialog");
}

describe("CaptureWorkflowController preview action regressions", () => {
  it("keeps the preview recoverable for rejected and synchronous callback failures", async () => {
    const onCopy = vi.fn(async () => {
      throw new Error("copy failed");
    });
    const onSave = vi.fn(() => {
      throw new Error("save failed");
    });
    const onOpenEditor = vi.fn(async () => {
      throw new Error("edit failed");
    });
    const onRecognize = vi.fn(() => {
      throw new Error("ocr failed");
    });
    const onPin = vi.fn(async () => {
      throw new Error("pin failed");
    });

    render(
      <CaptureWorkflowController
        preferences={previewOnly}
        autoDismissMs={null}
        onCapture={async () => docA}
        onCopy={onCopy}
        onSave={onSave}
        onOpenEditor={onOpenEditor}
        onRecognize={onRecognize}
        onPin={onPin}
      />,
    );
    await startCapture();

    for (const [label, message] of [
      ["Copy", "copy failed"],
      ["Save", "save failed"],
      ["Edit", "edit failed"],
      ["OCR", "ocr failed"],
      ["Pin", "pin failed"],
    ] as const) {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: label }));
      });
      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    }

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onOpenEditor).toHaveBeenCalledTimes(1);
    expect(onRecognize).toHaveBeenCalledTimes(1);
    expect(onPin).toHaveBeenCalledTimes(1);
  });

  it("suppresses duplicate preview clicks while an action is pending", async () => {
    let resolveCopy!: () => void;
    const copy = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCopy = resolve;
        }),
    );
    render(
      <CaptureWorkflowController
        preferences={previewOnly}
        autoDismissMs={null}
        onCapture={async () => docA}
        onCopy={copy}
      />,
    );
    await startCapture();

    const copyButton = screen.getByRole("button", { name: "Copy" });
    fireEvent.click(copyButton);
    fireEvent.click(copyButton);
    expect(copy).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Workflow status")).toHaveTextContent(
      "running-post-actions",
    );

    await act(async () => resolveCopy());
    expect(screen.getByLabelText("Workflow status")).toHaveTextContent(
      "completed",
    );
  });

  it("ignores a late preview completion after a newer capture supersedes it", async () => {
    let resolveCopy!: () => void;
    const copy = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCopy = resolve;
        }),
    );
    let captures = 0;
    render(
      <CaptureWorkflowController
        preferences={previewOnly}
        autoDismissMs={null}
        onCapture={async () => (captures++ === 0 ? docA : docB)}
        onCopy={copy}
      />,
    );
    await startCapture();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Capture window" }));
      await Promise.resolve();
    });
    await act(async () => resolveCopy());

    expect(screen.getByRole("dialog", { name: "Post-capture preview: Preview B" }))
      .toBeInTheDocument();
    expect(screen.getByLabelText("Workflow status")).toHaveTextContent(
      "preview-open",
    );
  });
});
