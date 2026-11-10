// C70 Codex: drafts require explicit Enter; producer gesture coverage retained.
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ImageDocument } from "../contracts/media";
import {
  DirectEffectsSurface,
  DirectLayoutSurface,
  DirectTransformSurface,
  fitAspectPreservingResize,
} from "../features/direct-manipulation";

const SOURCE_A: ImageDocument = {
  id: "src-a",
  name: "wide-banner.png",
  src: "blob:synthetic-src-a",
  width: 400,
  height: 200,
  mimeType: "image/png",
  byteSize: 8192,
};

const SOURCE_B: ImageDocument = {
  id: "src-b",
  name: "square-card.png",
  src: "blob:synthetic-src-b",
  width: 240,
  height: 240,
  mimeType: "image/png",
  byteSize: 4096,
};

afterEach(() => {
  cleanup();
});

describe("A207 Direct editing gesture-boundary regressions", () => {
  it("supports initial full-image crop body drag, sub-region move/handle resize, and stage re-selection clamping outside bounds", () => {
    const onTransform = vi.fn();
    const onCancel = vi.fn();

    render(
      <DirectTransformSurface
        image={SOURCE_A}
        busy={false}
        mode="crop"
        onTransform={onTransform}
        onCancel={onCancel}
      />,
    );

    const stage = screen.getByTestId("direct-transform-stage");
    const moveBody = screen.getByRole("button", { name: "Move crop region" });

    // Initial full-image crop passes pointer hits through to crop-drag
    expect(moveBody).toHaveAttribute("data-hit-mode", "crop-drag");
    expect(moveBody).toHaveStyle({ pointerEvents: "none" });

    fireEvent.pointerDown(moveBody, {
      button: 0,
      pointerId: 1,
      clientX: 40,
      clientY: 30,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 1,
      clientX: 160,
      clientY: 120,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 1,
      clientX: 160,
      clientY: 120,
    });
    fireEvent.keyDown(stage, {key:"Enter"});

    expect(onTransform).toHaveBeenCalledTimes(1);
    expect(onTransform).toHaveBeenLastCalledWith({
      crop: { x: 40, y: 30, width: 120, height: 90 },
    });

    // Sub-region crop body switches to crop-move
    expect(moveBody).toHaveAttribute("data-hit-mode", "crop-move");
    expect(moveBody).toHaveStyle({ pointerEvents: "auto" });

    fireEvent.pointerDown(moveBody, {
      button: 0,
      pointerId: 2,
      clientX: 60,
      clientY: 50,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 2,
      clientX: 90,
      clientY: 70,
    });
    fireEvent.keyDown(stage, {key:"Enter"});
    expect(onTransform).toHaveBeenLastCalledWith({
      crop: { x: 70, y: 50, width: 120, height: 90 },
    });

    // Re-dragging on stage outside the crop box starts a new selection and clamps pointer release outside stage bounds
    fireEvent.pointerDown(stage, {
      button: 0,
      pointerId: 3,
      clientX: 300,
      clientY: 100,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 3,
      clientX: 520,
      clientY: 260,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 3,
      clientX: 520,
      clientY: 260,
    });
    fireEvent.keyDown(stage, {key:"Enter"});
    expect(onTransform).toHaveBeenLastCalledWith({
      crop: { x: 300, y: 100, width: 100, height: 100 },
    });
  });

  it("preserves source aspect ratio during corner resize for both downscaling and >100% enlargement", () => {
    expect(fitAspectPreservingResize(300, 180, 400, 200)).toEqual({
      width: 300,
      height: 150,
    });
    expect(fitAspectPreservingResize(600, 400, 400, 200)).toEqual({
      width: 600,
      height: 300,
    });

    const onTransform = vi.fn();
    render(
      <DirectTransformSurface
        image={SOURCE_A}
        busy={false}
        mode="resize"
        onTransform={onTransform}
        onCancel={vi.fn()}
      />,
    );

    const stage = screen.getByTestId("direct-transform-stage");
    const seHandle = screen.getByRole("button", { name: "Resize handle SE" });
    const resizeBox = screen.getByRole("group", { name: "Resize frame box" });

    // Downscale drag: candidate (300, 180) fits 2:1 -> (300, 150)
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 10,
      clientX: 400,
      clientY: 200,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 10,
      clientX: 300,
      clientY: 180,
    });
    fireEvent.keyDown(stage, {key:"Enter"});
    expect(onTransform).toHaveBeenLastCalledWith({
      resize: { width: 300, height: 150 },
    });
    expect(resizeBox).toHaveStyle({ width: "75%", height: "75%" });

    // Enlargement drag (>100%): +300 width, +250 height from (300, 150) -> candidate (600, 400) -> fits (600, 300) (150%)
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 11,
      clientX: 300,
      clientY: 150,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 11,
      clientX: 600,
      clientY: 400,
    });
    fireEvent.keyDown(stage, {key:"Enter"});
    expect(onTransform).toHaveBeenLastCalledWith({
      resize: { width: 600, height: 300 },
    });
    expect(resizeBox).toHaveStyle({ width: "150%", height: "150%" });
  });

  it("rolls back active gestures on pointercancel, lostpointercapture, Escape, mid-gesture busy transitions, and resets on source change", () => {
    const onTransform = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <DirectTransformSurface
        image={SOURCE_A}
        busy={false}
        mode="crop"
        onTransform={onTransform}
        onCancel={onCancel}
      />,
    );

    const stage = screen.getByTestId("direct-transform-stage");
    const moveBody = screen.getByRole("button", { name: "Move crop region" });

    // 1. pointercancel rolls back
    fireEvent.pointerDown(moveBody, {
      button: 0,
      pointerId: 21,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 21,
      clientX: 120,
      clientY: 100,
    });
    fireEvent.pointerCancel(stage, { pointerId: 21 });
    expect(screen.getByTestId("direct-transform-readout")).toHaveTextContent(
      "0, 0 — 400 × 200 px",
    );
    expect(onTransform).not.toHaveBeenCalled();

    // 2. lostpointercapture rolls back
    fireEvent.pointerDown(moveBody, {
      button: 0,
      pointerId: 22,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 22,
      clientX: 140,
      clientY: 110,
    });
    fireEvent(
      stage,
      new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 22 }),
    );
    expect(screen.getByTestId("direct-transform-readout")).toHaveTextContent(
      "0, 0 — 400 × 200 px",
    );

    // 3. Escape during active gesture cancels gesture first without closing surface
    fireEvent.pointerDown(moveBody, {
      button: 0,
      pointerId: 23,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 23,
      clientX: 140,
      clientY: 110,
    });
    fireEvent.keyDown(stage, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByTestId("direct-transform-readout")).toHaveTextContent(
      "0, 0 — 400 × 200 px",
    );

    // 4. Mid-gesture busy=true transition rolls back and blocks commit
    fireEvent.pointerDown(moveBody, {
      button: 0,
      pointerId: 24,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 24,
      clientX: 160,
      clientY: 120,
    });
    rerender(
      <DirectTransformSurface
        image={SOURCE_A}
        busy={true}
        mode="crop"
        onTransform={onTransform}
        onCancel={onCancel}
      />,
    );
    fireEvent.pointerUp(stage, {
      pointerId: 24,
      clientX: 160,
      clientY: 120,
    });
    expect(onTransform).not.toHaveBeenCalled();

    // 5. Source image change resets dimensions and readout to SOURCE_B
    rerender(
      <DirectTransformSurface
        image={SOURCE_B}
        busy={false}
        mode="crop"
        onTransform={onTransform}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByTestId("direct-transform-readout")).toHaveTextContent(
      "0, 0 — 240 × 240 px",
    );
  });

  it("validates DirectEffectsSurface and DirectLayoutSurface gesture boundaries, exact onApply callback payloads, cancellation/busy rollback, and source resets", () => {
    const onApply = vi.fn();
    const { rerender: rerenderEffects } = render(
      <DirectEffectsSurface
        image={SOURCE_A}
        busy={false}
        onApply={onApply}
      />,
    );

    const effectsStage = screen.getByTestId("direct-effects-stage");
    const effectsBody = screen.getByRole("button", {
      name: "Move effect region",
    });
    expect(effectsBody).toHaveAttribute("data-hit-mode", "draw");

    fireEvent.pointerDown(effectsBody, {
      button: 0,
      pointerId: 31,
      clientX: 30,
      clientY: 20,
    });
    fireEvent.pointerUp(effectsStage, {
      pointerId: 31,
      clientX: 130,
      clientY: 100,
    });
    fireEvent.keyDown(effectsStage, {key:"Enter"});
    expect(screen.getByTestId("direct-effects-readout")).toHaveTextContent(
      "30, 20 — 100 × 80 px",
    );
    expect(effectsBody).toHaveAttribute("data-hit-mode", "move");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledExactlyOnceWith({
      kind: "blur",
      rect: { x: 30, y: 20, width: 100, height: 80 },
      radius: 8,
    });

    // Cancellation (pointerCancel) and mid-gesture busy=true transition do not commit onApply
    fireEvent.pointerDown(effectsBody, {
      button: 0,
      pointerId: 32,
      clientX: 40,
      clientY: 30,
    });
    fireEvent.pointerMove(effectsStage, {
      pointerId: 32,
      clientX: 100,
      clientY: 80,
    });
    fireEvent.pointerCancel(effectsStage, { pointerId: 32 });
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.pointerDown(effectsBody, {
      button: 0,
      pointerId: 33,
      clientX: 40,
      clientY: 30,
    });
    fireEvent.pointerMove(effectsStage, {
      pointerId: 33,
      clientX: 110,
      clientY: 90,
    });
    rerenderEffects(
      <DirectEffectsSurface
        image={SOURCE_A}
        busy={true}
        onApply={onApply}
      />,
    );
    fireEvent.pointerUp(effectsStage, {
      pointerId: 33,
      clientX: 110,
      clientY: 90,
    });
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();

    rerenderEffects(
      <DirectEffectsSurface
        image={SOURCE_B}
        busy={false}
        onApply={onApply}
      />,
    );
    expect(screen.getByTestId("direct-effects-readout")).toHaveTextContent(
      "16, 16 — 120 × 80 px",
    );
    expect(effectsBody).toHaveAttribute("data-hit-mode", "draw");
    expect(screen.queryByRole("alert")).toBeNull();

    // DirectLayoutSurface inset and layer gesture boundaries
    const onCompose = vi.fn();
    render(
      <DirectLayoutSurface
        images={[SOURCE_A, SOURCE_B]}
        selected={SOURCE_A}
        busy={false}
        onCompose={onCompose}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: /add backdrop/i }));
    const layoutStage = screen.getByTestId("direct-layout-stage");
    const insetHandle = screen.getByRole("button", {
      name: "Drag backdrop inset handle",
    });

    fireEvent.pointerDown(insetHandle, {
      button: 0,
      pointerId: 41,
      clientX: 100,
      clientY: 50,
    });
    fireEvent.pointerMove(insetHandle, {
      pointerId: 41,
      clientX: 120,
      clientY: 50,
    });
    fireEvent.pointerUp(insetHandle, {
      pointerId: 41,
      clientX: 120,
      clientY: 50,
    });

    // Inset 64 + 20 = 84 -> Output (400 + 168) x (200 + 168) = 568 x 368, layer offset (84, 84)
    expect(layoutStage).toHaveStyle({ width: "568px", height: "368px" });
    expect(screen.getByTestId("layout-layer-src-a")).toHaveStyle({
      left: "84px",
      top: "84px",
      width: "400px",
      height: "200px",
    });
  });
});
