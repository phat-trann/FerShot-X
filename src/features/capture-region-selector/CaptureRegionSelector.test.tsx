// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CaptureRegionSelector } from "./CaptureRegionSelector";

const image = { id: "source", name: "synthetic.png", src: "blob:synthetic", width: 1000, height: 800, mimeType: "image/png", byteSize: 100 };
beforeEach(() => {
  vi.stubGlobal("PointerEvent", MouseEvent);
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", { configurable: true, value: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup(busy = false) {
  const confirm = vi.fn(), cancel = vi.fn();
  const result = render(<CaptureRegionSelector image={image} busy={busy} onConfirm={confirm} onCancel={cancel} />);
  vi.spyOn(screen.getByRole("img"), "getBoundingClientRect").mockReturnValue({ x: 100, y: 50, left: 100, top: 50, width: 333, height: 266.4, right: 433, bottom: 316.4, toJSON() {} });
  return { ...result, confirm, cancel, wrap: result.container.querySelector(".ferby-region-selector__canvas-wrap")! };
}
describe("area selector physical pixel and keyboard boundaries", () => {
  it("rounds fractional scaled pointer origins before reverse dragging", () => {
    const { wrap, confirm } = setup();
    fireEvent.pointerDown(wrap, { button: 0, clientX: 201, clientY: 151, pointerId: 1 });
    fireEvent.pointerMove(wrap, { clientX: 111, clientY: 61, pointerId: 1 });
    fireEvent.pointerUp(wrap, { pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Selection" }));
    expect(confirm).toHaveBeenCalledWith({ x: 33, y: 33, width: 270, height: 270 });
    expect(Object.values(confirm.mock.calls[0][0]).every(Number.isInteger)).toBe(true);
  });
  it("anchors its resize-safe percentage overlay to the image rather than the centered canvas", () => {
    const { container } = setup();
    fireEvent.change(screen.getByLabelText("X (px)"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Y (px)"), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Width (px)"), { target: { value: "400" } });
    fireEvent.change(screen.getByLabelText("Height (px)"), { target: { value: "320" } });
    const box = screen.getByTestId("region-selector-overlay");
    expect(box.parentElement).toBe(container.querySelector(".ferby-region-selector__image-wrap"));
    expect(box).toHaveStyle({ left: "10%", top: "10%", width: "40%", height: "40%" });
  });
  it("bounds manual rectangles, traps keyboard focus, and cancels with Escape", () => {
    const { confirm, cancel } = setup();
    const first = screen.getByLabelText("X (px)");
    expect(first).toHaveFocus();
    fireEvent.change(first, { target: { value: "900" } });
    fireEvent.change(screen.getByLabelText("Width (px)"), { target: { value: "300" } });
    fireEvent.change(screen.getByLabelText("Height (px)"), { target: { value: "100" } });
    const last = screen.getByRole("button", { name: "Confirm Selection" });
    last.focus(); fireEvent.keyDown(last, { key: "Tab" }); expect(first).toHaveFocus();
    fireEvent.click(last); expect(confirm).toHaveBeenCalledWith({ x: 900, y: 0, width: 100, height: 100 });
    fireEvent.keyDown(first, { key: "Escape" }); expect(cancel).toHaveBeenCalledOnce();
  });
  it("does not select or cancel while processing", () => {
    const { wrap, cancel, confirm } = setup(true);
    fireEvent.pointerDown(wrap, { button: 0, clientX: 201, clientY: 151 });
    fireEvent.pointerMove(wrap, { clientX: 300, clientY: 200 });
    fireEvent.keyDown(wrap, { key: "Escape" });
    expect(confirm).not.toHaveBeenCalled(); expect(cancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm Selection" })).toBeDisabled();
  });
});
