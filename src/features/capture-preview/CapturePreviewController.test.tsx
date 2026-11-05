// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CapturePreviewController } from "./CapturePreviewController";
import type { ImageDocument } from "../../contracts/media";

const SYNTHETIC_DOC: ImageDocument = Object.freeze({
  id: "cap-101",
  name: "Capture 101.png",
  src: "blob:synthetic-101",
  width: 320,
  height: 200,
  mimeType: "image/png",
  byteSize: 2048,
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CapturePreviewController", () => {
  it("auto-dismisses after timeout and cleans up timer on unmount without firing duplicate callbacks", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <CapturePreviewController
        document={SYNTHETIC_DOC}
        autoDismissMs={2000}
        onEdit={vi.fn()}
        onCopy={vi.fn()}
        onSave={vi.fn()}
        onOcr={vi.fn()}
        onPin={vi.fn()}
        onClose={onClose}
      />,
    );

    vi.advanceTimersByTime(1999);
    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onClose).toHaveBeenCalledExactlyOnceWith("cap-101", "timeout");

    // Subsequent clicks after timeout do not trigger duplicate callbacks
    fireEvent.click(screen.getByRole("button", { name: "Close Preview" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("cancels timeout when Keep Open is clicked or when component unmounts early", () => {
    const onClose = vi.fn();
    const onCancelAutoDismiss = vi.fn();

    const { unmount } = render(
      <CapturePreviewController
        document={SYNTHETIC_DOC}
        autoDismissMs={1500}
        onEdit={vi.fn()}
        onCopy={vi.fn()}
        onSave={vi.fn()}
        onOcr={vi.fn()}
        onPin={vi.fn()}
        onClose={onClose}
        onCancelAutoDismiss={onCancelAutoDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Keep Open" }));
    expect(onCancelAutoDismiss).toHaveBeenCalledExactlyOnceWith("cap-101");

    vi.advanceTimersByTime(5000);
    expect(onClose).not.toHaveBeenCalled();

    unmount();
  });

  it("supports keyboard Escape close and prevents duplicate action callbacks", () => {
    const onEdit = vi.fn();
    const onCopy = vi.fn();
    const onSave = vi.fn();
    const onOcr = vi.fn();
    const onPin = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <CapturePreviewController
        document={SYNTHETIC_DOC}
        autoDismissMs={3000}
        onEdit={onEdit}
        onCopy={onCopy}
        onSave={onSave}
        onOcr={onOcr}
        onPin={onPin}
        onClose={onClose}
      />,
    );

    const dialog = screen.getByRole("dialog", {
      name: /post-capture preview: capture 101\.png/i,
    });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalledExactlyOnceWith("cap-101", "escape");

    // Action button after Escape is ignored for the same document id
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).not.toHaveBeenCalled();

    // New document resets completion guard
    const secondDoc: ImageDocument = {
      ...SYNTHETIC_DOC,
      id: "cap-102",
      name: "Capture 102.png",
    };
    rerender(
      <CapturePreviewController
        document={secondDoc}
        autoDismissMs={3000}
        onEdit={onEdit}
        onCopy={onCopy}
        onSave={onSave}
        onOcr={onOcr}
        onPin={onPin}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(onEdit).toHaveBeenCalledExactlyOnceWith("cap-102");
    expect(onCopy).not.toHaveBeenCalled();
  });
});

