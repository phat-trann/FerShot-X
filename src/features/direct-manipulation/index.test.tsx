// Codex C70: preserve gesture regressions, commit drafts explicitly with Enter.
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ImageDocument } from "../../contracts/media";
import {
  ALL_CROP_HANDLES,
  ALL_RESIZE_CORNER_HANDLES,
  DirectEffectsSurface,
  DirectTransformSurface,
  applyCropHandleDelta,
  applyResizeHandleDelta,
  clampCropRect,
  fitAspectPreservingResize,
} from "./index";

afterEach(() => {
  cleanup();
});

const sampleImage: ImageDocument = {
  id: "img-transform-1",
  name: "capture-1.png",
  src: "blob:synthetic-transform",
  width: 400,
  height: 300,
  mimeType: "image/png",
  byteSize: 2048,
};

describe("DirectTransformSurface (A204)", () => {
  it("clamps crop rectangles and computes aspect-preserving resize deltas matching native Raster::resize", () => {
    expect(
      clampCropRect({ x: -20, y: 10, width: 999, height: 500 }, 400, 300),
    ).toEqual({
      x: 0,
      y: 10,
      width: 400,
      height: 290,
    });

    expect(
      applyCropHandleDelta(
        { x: 20, y: 30, width: 100, height: 80 },
        "se",
        50,
        40,
        400,
        300,
      ),
    ).toEqual({
      x: 20,
      y: 30,
      width: 150,
      height: 120,
    });

    // Candidate box 300x250 on 400x300 (4:3) -> fits to 300x225 preserving aspect ratio
    expect(
      applyResizeHandleDelta(
        { width: 400, height: 300 },
        "se",
        -100,
        -50,
        400,
        300,
      ),
    ).toEqual({
      width: 300,
      height: 225,
    });

    // Enlargement candidate 520x360 on 400x300 -> fits to 480x360 (1.2x)
    expect(fitAspectPreservingResize(520, 360, 400, 300)).toEqual({
      width: 480,
      height: 360,
    });
  });

  it("lets initial drag on full-image crop body create a new crop region, then supports body move, handle resize, and stage reselection", () => {
    const onTransform = vi.fn();
    const onCancel = vi.fn();

    render(
      <DirectTransformSurface
        image={sampleImage}
        busy={false}
        mode="crop"
        onTransform={onTransform}
        onCancel={onCancel}
      />,
    );

    for (const handle of ALL_CROP_HANDLES) {
      expect(
        screen.getByRole("button", {
          name: `Crop handle ${handle.toUpperCase()}`,
        }),
      ).toBeInTheDocument();
    }

    const stage = screen.getByTestId("direct-transform-stage");
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 150,
      right: 200,
      bottom: 150,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const moveBody = screen.getByRole("button", { name: "Move crop region" });
    // Initially full-image crop body has passthrough pointer-events and crop-drag hit mode
    expect(moveBody).toHaveStyle({ pointerEvents: "none" });
    expect(moveBody).toHaveAttribute("data-hit-mode", "crop-drag");

    // 1. Even if pointerDown hits moveBody initially, it draws a new crop selection (0.5x DOM scale)
    fireEvent.pointerDown(moveBody, {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 15,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 1,
      clientX: 60,
      clientY: 65,
    });
    expect(onTransform).not.toHaveBeenCalled();

    fireEvent.pointerUp(stage, {
      pointerId: 1,
      clientX: 110,
      clientY: 90,
    });
    expect(onTransform).toHaveBeenCalledTimes(0);
    fireEvent.keyDown(stage, { key: "Enter" });
    expect(onTransform).toHaveBeenCalledTimes(1);
    expect(onTransform).toHaveBeenLastCalledWith({
      crop: { x: 20, y: 30, width: 200, height: 150 },
    });

    // Now that a sub-region is active, moveBody is interactive for crop-move
    expect(moveBody).toHaveStyle({ pointerEvents: "auto" });
    expect(moveBody).toHaveAttribute("data-hit-mode", "crop-move");

    // 2. Drag moveBody by (+10, +10) screen => (+20, +20) image -> moves crop to (40, 50)
    fireEvent.pointerDown(moveBody, {
      button: 0,
      pointerId: 2,
      clientX: 50,
      clientY: 50,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 2,
      clientX: 60,
      clientY: 60,
    });
    expect(onTransform).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(stage, { key: "Enter" });
    expect(onTransform).toHaveBeenCalledTimes(2);
    expect(onTransform).toHaveBeenLastCalledWith({
      crop: { x: 40, y: 50, width: 200, height: 150 },
    });

    // 3. Drag SE crop handle to expand crop width/height and release outside stage
    const seHandle = screen.getByRole("button", { name: "Crop handle SE" });
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 3,
      clientX: 120,
      clientY: 100,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 3,
      clientX: 250,
      clientY: 200,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 3,
      clientX: 140,
      clientY: 120,
    });
    expect(onTransform).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(stage, { key: "Enter" });
    expect(onTransform).toHaveBeenCalledTimes(3);
    expect(onTransform).toHaveBeenLastCalledWith({
      crop: { x: 40, y: 50, width: 240, height: 190 },
    });

    // 4. Dragging stage outside the crop box reselects a brand new crop region
    fireEvent.pointerDown(stage, {
      button: 0,
      pointerId: 4,
      clientX: 5,
      clientY: 5,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 4,
      clientX: 35,
      clientY: 25,
    });
    expect(onTransform).toHaveBeenCalledTimes(3);
    fireEvent.keyDown(stage, { key: "Enter" });
    expect(onTransform).toHaveBeenCalledTimes(4);
    expect(onTransform).toHaveBeenLastCalledWith({
      crop: { x: 10, y: 10, width: 60, height: 40 },
    });
  });

  it("supports aspect-preserving corner resize with enlargement preview, and rolls back on Escape, lostpointercapture, or mid-gesture busy transition", () => {
    const onTransform = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <DirectTransformSurface
        image={sampleImage}
        busy={false}
        mode="resize"
        onTransform={onTransform}
        onCancel={onCancel}
      />,
    );

    for (const handle of ALL_RESIZE_CORNER_HANDLES) {
      expect(
        screen.getByRole("button", {
          name: `Resize handle ${handle.toUpperCase()}`,
        }),
      ).toBeInTheDocument();
    }

    const stage = screen.getByTestId("direct-transform-stage");
    const resizeBox = screen.getByRole("group", { name: "Resize frame box" });
    const seHandle = screen.getByRole("button", { name: "Resize handle SE" });

    // 1. Drag SE corner handle (+120, +60) -> candidate 520x360 fits aspect-preserving 480x360 (120% enlargement preview)
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 1,
      clientX: 400,
      clientY: 300,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 1,
      clientX: 520,
      clientY: 360,
    });
    expect(screen.getByTestId("direct-transform-readout")).toHaveTextContent(
      "480 × 360 px",
    );
    expect(resizeBox).toHaveStyle({ width: "120%", height: "120%" });
    expect(onTransform).not.toHaveBeenCalled();

    fireEvent.pointerUp(stage, {
      pointerId: 1,
      clientX: 520,
      clientY: 360,
    });
    expect(onTransform).toHaveBeenCalledTimes(0);
    fireEvent.keyDown(stage, { key: "Enter" });
    expect(onTransform).toHaveBeenCalledTimes(1);
    expect(onTransform).toHaveBeenLastCalledWith({
      resize: { width: 480, height: 360 },
    });

    // 2. Start resize and press Escape -> rolls back without calling onTransform
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 2,
      clientX: 480,
      clientY: 360,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 2,
      clientX: 600,
      clientY: 450,
    });
    fireEvent.keyDown(stage, { key: "Escape" });
    fireEvent.pointerUp(stage, {
      pointerId: 2,
      clientX: 600,
      clientY: 450,
    });
    expect(onTransform).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    // 3. lostpointercapture rolls back active resize
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 3,
      clientX: 480,
      clientY: 360,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 3,
      clientX: 600,
      clientY: 450,
    });
    fireEvent(
      stage,
      new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 3 }),
    );
    fireEvent.pointerUp(stage, {
      pointerId: 3,
      clientX: 600,
      clientY: 450,
    });
    expect(onTransform).toHaveBeenCalledTimes(1);

    // 4. Mid-gesture busy transition rolls back active gesture
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 4,
      clientX: 480,
      clientY: 360,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 4,
      clientX: 600,
      clientY: 450,
    });
    rerender(
      <DirectTransformSurface
        image={sampleImage}
        busy={true}
        mode="resize"
        onTransform={onTransform}
        onCancel={onCancel}
      />,
    );
    fireEvent.pointerUp(stage, {
      pointerId: 4,
      clientX: 600,
      clientY: 450,
    });
    expect(onTransform).toHaveBeenCalledTimes(1);
  });
});

describe("DirectEffectsSurface (A204)", () => {
  it("starts with inset default region where initial body drag draws a new region, then supports body move, handle resize, lostpointercapture, Escape, and busy transitions", () => {
    const onApply = vi.fn();
    const { rerender } = render(
      <DirectEffectsSurface
        image={sampleImage}
        busy={false}
        zoom={2}
        onApply={onApply}
      />,
    );

    const stage = screen.getByTestId("direct-effects-stage");
    const moveBody = screen.getByRole("button", { name: "Move effect region" });

    // Default inset region is 16, 16 — 120 × 80 px, with passthrough hit mode before first custom region
    expect(screen.getByTestId("direct-effects-readout")).toHaveTextContent(
      "16, 16 — 120 × 80 px",
    );
    expect(moveBody).toHaveStyle({ pointerEvents: "none" });
    expect(moveBody).toHaveAttribute("data-hit-mode", "draw");

    // 1. Initial pointerDown even inside the default region body draws a new blur region (zoom=2)
    fireEvent.pointerDown(moveBody, {
      button: 0,
      pointerId: 1,
      clientX: 40,
      clientY: 60,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 1,
      clientX: 240,
      clientY: 180,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 1,
      clientX: 240,
      clientY: 180,
    });

    expect(onApply).toHaveBeenCalledTimes(0);
    fireEvent.keyDown(stage, { key: "Enter" });
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenLastCalledWith({
      kind: "blur",
      rect: { x: 20, y: 30, width: 100, height: 60 },
      radius: 8,
    });

    // After first region is drawn, moveBody becomes active for moving the region
    expect(moveBody).toHaveStyle({ pointerEvents: "auto" });
    expect(moveBody).toHaveAttribute("data-hit-mode", "move");

    // 2. Drag moveBody by (+20, +10) screen => (+10, +5) image
    fireEvent.pointerDown(moveBody, {
      button: 0,
      pointerId: 2,
      clientX: 60,
      clientY: 80,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 2,
      clientX: 80,
      clientY: 90,
    });
    expect(onApply).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(stage, { key: "Enter" });
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(onApply).toHaveBeenLastCalledWith({
      kind: "blur",
      rect: { x: 30, y: 35, width: 100, height: 60 },
      radius: 8,
    });

    // 3. Switch to mosaic, drag SE handle by (+40,+20) screen => (+20,+10) image
    fireEvent.click(screen.getByRole("button", { name: "Effect: mosaic" }));
    const seHandle = screen.getByRole("button", { name: "Effect handle SE" });
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 3,
      clientX: 260,
      clientY: 190,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 3,
      clientX: 300,
      clientY: 210,
    });
    expect(onApply).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(stage, { key: "Enter" });
    expect(onApply).toHaveBeenCalledTimes(3);
    expect(onApply).toHaveBeenLastCalledWith({
      kind: "mosaic",
      rect: { x: 30, y: 35, width: 120, height: 70 },
      blockSize: 8,
    });

    // 4. Switch to solidCover, start drag, press Escape -> rolls back without calling onApply
    fireEvent.click(screen.getByRole("button", { name: "Effect: solidCover" }));
    fireEvent.pointerDown(stage, {
      button: 0,
      pointerId: 4,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 4,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.keyDown(stage, { key: "Escape" });
    fireEvent.pointerUp(stage, {
      pointerId: 4,
      clientX: 100,
      clientY: 100,
    });
    expect(onApply).toHaveBeenCalledTimes(3);

    // 5. lostpointercapture and mid-gesture busy transitions roll back active gesture
    fireEvent.pointerDown(stage, {
      button: 0,
      pointerId: 5,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 5,
      clientX: 100,
      clientY: 100,
    });
    fireEvent(
      stage,
      new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 5 }),
    );
    fireEvent.pointerUp(stage, {
      pointerId: 5,
      clientX: 100,
      clientY: 100,
    });
    expect(onApply).toHaveBeenCalledTimes(3);

    fireEvent.pointerDown(stage, {
      button: 0,
      pointerId: 6,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 6,
      clientX: 100,
      clientY: 100,
    });
    rerender(
      <DirectEffectsSurface
        image={sampleImage}
        busy={true}
        zoom={2}
        onApply={onApply}
      />,
    );
    fireEvent.pointerUp(stage, {
      pointerId: 6,
      clientX: 100,
      clientY: 100,
    });
    expect(onApply).toHaveBeenCalledTimes(3);
  });
});
