// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  LocalOutputPanel,
  computePrintSheetLayout,
  createDragImagePayload,
} from "./local-output";

describe("LocalOutputPanel (A30)", () => {
  it("disables unavailable print and drag independently", () => {
    const doc = { id: "capability", name: "image.png", src: "blob:synthetic", width: 2, height: 2, mimeType: "image/png", byteSize: 24 };
    const onPrint = vi.fn(), onDrag = vi.fn();
    const view = render(<LocalOutputPanel document={doc} paper="a4" orientation="portrait" marginPt={36} onRequestNativePrint={onPrint} />);
    expect(screen.getByRole("button", { name: "Print Image…" })).toBeEnabled();
    expect(screen.getByLabelText("Drag image payload")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByLabelText("Drag image payload")).toHaveAttribute("draggable", "false");
    view.rerender(<LocalOutputPanel document={doc} paper="a4" orientation="portrait" marginPt={36} onInitiateImageDrag={onDrag} />);
    expect(screen.getByRole("button", { name: "Print Image…" })).toBeDisabled();
    expect(screen.getByLabelText("Drag image payload")).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(screen.getByRole("button", { name: "Print Image…" }));
    expect(onPrint).not.toHaveBeenCalled();
    view.rerender(<LocalOutputPanel document={{ ...doc, mimeType: "image/webp" }} paper="a4" orientation="portrait" marginPt={36} onRequestNativePrint={onPrint} />);
    expect(screen.getByRole("button", { name: "Print Image…" })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("computes portrait and landscape sheet layouts and enforces image-only drag MIME boundaries without invoking window.print", () => {
    const printSpy = vi.fn();
    Object.defineProperty(window, "print", {
      value: printSpy,
      configurable: true,
      writable: true,
    });

    const onRequestNativePrint = vi.fn();
    const onInitiateImageDrag = vi.fn();

    const doc = Object.freeze({
      id: "doc-1",
      name: "Receipt 2026",
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
      width: 400,
      height: 200,
      mimeType: "image/png",
      byteSize: 256,
    });

    render(
      <LocalOutputPanel
        document={doc}
        paper="a4"
        orientation="landscape"
        marginPt={36}
        onRequestNativePrint={onRequestNativePrint}
        onInitiateImageDrag={onInitiateImageDrag}
      />,
    );

    expect(printSpy).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Sheet dimensions")).toHaveTextContent(
      "842 × 595 pt",
    );

    fireEvent.click(screen.getByRole("button", { name: "Print Image…" }));
    expect(printSpy).not.toHaveBeenCalled();
    expect(onRequestNativePrint).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Drag image payload"));
    expect(onInitiateImageDrag).toHaveBeenCalledTimes(1);
    expect(onInitiateImageDrag.mock.calls[0][0].mimeType).toBe("image/png");
    expect(onInitiateImageDrag.mock.calls[0][0].fileName).toBe(
      "Receipt-2026.png",
    );

    // Reject non-image MIME or unsafe URL scheme
    expect(() =>
      createDragImagePayload({
        ...doc,
        mimeType: "text/html",
      }),
    ).toThrow(/Unsupported drag image MIME type/);

    expect(() =>
      createDragImagePayload({
        ...doc,
        src: "javascript:alert(1)",
      }),
    ).toThrow(/Drag image source must be/);

    const layout = computePrintSheetLayout({
      imageWidth: 400,
      imageHeight: 200,
      paper: "letter",
      orientation: "portrait",
      marginPt: 36,
    });
    expect(layout.pageWidthPt).toBe(612);
    expect(layout.pageHeightPt).toBe(792);
    expect(layout.drawWidthPt / layout.drawHeightPt).toBeCloseTo(2, 2);
  });
});

