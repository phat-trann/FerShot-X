// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocalOutputWorkspace } from "../features/local-output-workspace/LocalOutputWorkspace";

const image = { id: "output-image", name: "test.png", src: "blob:owned", width: 80, height: 40, mimeType: "image/png", byteSize: 100 };
const callbacks = () => ({ onCopy: vi.fn(), onSave: vi.fn(), onPrint: vi.fn(), onDrag: vi.fn() });

describe("local output workspace capability boundary", () => {
  it("actual-size selection enters the explicit print callback and disables when unavailable or busy", () => {
    const handlers = callbacks();
    const view = render(<LocalOutputWorkspace image={image} busy={false} canPrint canDrag={false} {...handlers} />);
    fireEvent.change(screen.getByLabelText("Print scale"), { target: { value: "actual" } });
    expect(handlers.onPrint).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Print Image…" }));
    expect(handlers.onPrint).toHaveBeenLastCalledWith(expect.objectContaining({ scaleMode: "actual" }));
    view.rerender(<LocalOutputWorkspace image={image} busy={false} canPrint={false} canDrag {...handlers} />);
    expect(screen.getByLabelText("Print scale")).toBeDisabled();
    view.rerender(<LocalOutputWorkspace image={image} busy canPrint canDrag {...handlers} />);
    expect(screen.getByLabelText("Print scale")).toBeDisabled();
  });

  it("copy and save emit only from explicit buttons", () => {
    const handlers = callbacks(); render(<LocalOutputWorkspace image={image} busy={false} canPrint={false} canDrag={false} {...handlers} />);
    for (const handler of Object.values(handlers)) expect(handler).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Copy Image" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Image" }));
    expect(handlers.onCopy).toHaveBeenCalledTimes(1); expect(handlers.onSave).toHaveBeenCalledTimes(1);
  });

  it("print and drag availability remain independent", () => {
    const handlers = callbacks(); const view = render(<LocalOutputWorkspace image={image} busy={false} canPrint canDrag={false} {...handlers} />);
    expect(screen.getByRole("button", { name: "Print Image…" })).toBeEnabled();
    expect(screen.getByLabelText("Drag image payload")).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByLabelText("Drag image payload")); expect(handlers.onDrag).not.toHaveBeenCalled();
    view.rerender(<LocalOutputWorkspace image={image} busy={false} canPrint={false} canDrag {...handlers} />);
    expect(screen.getByRole("button", { name: "Print Image…" })).toBeDisabled();
    expect(screen.getByLabelText("Drag image payload")).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(screen.getByLabelText("Drag image payload"));
    expect(handlers.onDrag).toHaveBeenCalledWith(expect.objectContaining({ documentId: image.id, mimeType: "image/png", src: image.src }));
  });

  it("selected paper, orientation and margin enter the explicit print options with fit policy", () => {
    const handlers = callbacks(); render(<LocalOutputWorkspace image={image} busy={false} canPrint canDrag={false} {...handlers} />);
    fireEvent.change(screen.getByLabelText("Paper size"), { target: { value: "letter" } });
    fireEvent.change(screen.getByLabelText("Page orientation"), { target: { value: "landscape" } });
    fireEvent.change(screen.getByLabelText("Margin (pt)"), { target: { value: "18.5" } });
    expect(handlers.onPrint).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Print Image…" }));
    expect(handlers.onPrint).toHaveBeenCalledWith({ imageWidth: 80, imageHeight: 40, paper: "letter", orientation: "landscape", marginPt: 18.5, scaleMode: "fit" });
  });

  it("busy state suppresses copy/save/print/drag callbacks", () => {
    const handlers = callbacks(); render(<LocalOutputWorkspace image={image} busy canPrint canDrag {...handlers} />);
    for (const name of ["Copy Image", "Save Image", "Print Image…"]) {
      const button = screen.getByRole("button", { name }); expect(button).toBeDisabled(); fireEvent.click(button);
    }
    fireEvent.click(screen.getByLabelText("Drag image payload"));
    for (const handler of Object.values(handlers)) expect(handler).not.toHaveBeenCalled();
  });

  it("invalid print margin disables printing instead of emitting an invalid request", () => {
    const handlers = callbacks(); render(<LocalOutputWorkspace image={image} busy={false} canPrint canDrag={false} {...handlers} />);
    fireEvent.change(screen.getByLabelText("Margin (pt)"), { target: { value: "145" } });
    expect(screen.getByRole("alert")).toHaveTextContent("marginPt");
    expect(screen.getByRole("button", { name: "Print Image…" })).toBeDisabled();
    expect(handlers.onPrint).not.toHaveBeenCalled();
  });
});
