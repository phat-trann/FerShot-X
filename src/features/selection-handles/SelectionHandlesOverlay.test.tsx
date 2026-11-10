// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Annotation } from "../../contracts/editor";
import {
  ALL_RESIZE_HANDLES,
  SelectionHandlesOverlay,
  moveAnnotationPoints,
  resizeAnnotationPoints,
} from "./SelectionHandlesOverlay";

describe("SelectionHandlesOverlay (A32)", () => {
  const samplePenAnnotation: Annotation = Object.freeze({
    id: "ann-pen-1",
    tool: "pen",
    points: Object.freeze([
      Object.freeze({ x: 20, y: 30 }),
      Object.freeze({ x: 60, y: 50 }),
      Object.freeze({ x: 100, y: 90 }),
    ]),
    style: Object.freeze({ color: "#ff0000", strokeWidth: 3, opacity: 1 }),
  });

  it("preserves relative multi-point geometry during clamped move and proportional resize without mutating source", () => {
    // Move past right/bottom edge of 150x120 image -> clamped to max (+50, +30)
    const moved = moveAnnotationPoints(
      samplePenAnnotation,
      90,
      80,
      150,
      120,
    );
    expect(moved.points).toEqual([
      { x: 70, y: 60 },
      { x: 110, y: 80 },
      { x: 150, y: 120 },
    ]);
    expect(Object.isFrozen(moved)).toBe(true);
    expect(Object.isFrozen(moved.points)).toBe(true);
    // Original unchanged
    expect(samplePenAnnotation.points[0]).toEqual({ x: 20, y: 30 });

    // Resize SE handle by (+80, +60): width 80 -> 160 (2x), height 60 -> 120 (2x)
    const resized = resizeAnnotationPoints(
      samplePenAnnotation,
      "se",
      80,
      60,
      300,
      300,
    );
    expect(resized.points).toEqual([
      { x: 20, y: 30 },
      { x: 100, y: 70 },
      { x: 180, y: 150 },
    ]);
  });

  it("renders all 8 resize handles, accounts for zoom scale, ignores secondary pointers, and cancels on Escape or pointercancel", () => {
    const onMove = vi.fn();
    const onResize = vi.fn();
    const onCancel = vi.fn();

    render(
      <SelectionHandlesOverlay
        annotation={samplePenAnnotation}
        imageWidth={300}
        imageHeight={250}
        zoom={2}
        onMove={onMove}
        onResize={onResize}
        onCancel={onCancel}
      />,
    );

    for (const handle of ALL_RESIZE_HANDLES) {
      expect(
        screen.getByRole("button", {
          name: `Resize handle ${handle.toUpperCase()}`,
        }),
      ).toBeInTheDocument();
    }

    const group = screen.getByRole("group", {
      name: "Selection handles for ann-pen-1",
    });
    const body = screen.getByRole("button", {
      name: "Move selected annotation",
    });

    // Move drag with zoom=2: screen delta (+40, +20) => image delta (+20, +10)
    fireEvent.pointerDown(body, {
      pointerId: 1,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    // Secondary pointer (pointerId=2) ignored
    fireEvent.pointerUp(group, {
      pointerId: 2,
      clientX: 250,
      clientY: 250,
    });
    expect(onMove).not.toHaveBeenCalled();

    fireEvent.pointerUp(group, {
      pointerId: 1,
      clientX: 140,
      clientY: 120,
    });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0][1]).toEqual({ x: 20, y: 10 });
    expect(onMove.mock.calls[0][0].points[0]).toEqual({ x: 40, y: 40 });

    // Start resize on SE handle, then press Escape to cancel before pointerUp
    const seHandle = screen.getByRole("button", { name: "Resize handle SE" });
    fireEvent.pointerDown(seHandle, {
      pointerId: 3,
      button: 0,
      clientX: 200,
      clientY: 180,
    });
    fireEvent.keyDown(group, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(group, {
      pointerId: 3,
      clientX: 280,
      clientY: 240,
    });
    expect(onResize).not.toHaveBeenCalled();
  });

  it("emits live preview during pointerMove, rolls back on pointercancel, and blocks gestures when disabled or busy", () => {
    const onMove = vi.fn();
    const onResize = vi.fn();
    const onPreviewChange = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <SelectionHandlesOverlay
        annotation={samplePenAnnotation}
        imageWidth={300}
        imageHeight={250}
        zoom={2}
        onMove={onMove}
        onResize={onResize}
        onPreviewChange={onPreviewChange}
        onCancel={onCancel}
      />,
    );

    const group = screen.getByRole("group", {
      name: "Selection handles for ann-pen-1",
    });
    const body = screen.getByRole("button", {
      name: "Move selected annotation",
    });

    fireEvent.pointerDown(body, {
      pointerId: 5,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(group, {
      pointerId: 5,
      clientX: 140,
      clientY: 120,
    });
    expect(onPreviewChange).toHaveBeenCalledWith(
      expect.objectContaining({
        points: [
          { x: 40, y: 40 },
          { x: 80, y: 60 },
          { x: 120, y: 100 },
        ],
      }),
    );
    expect(onMove).not.toHaveBeenCalled();

    // pointercancel rolls back preview without committing onMove
    fireEvent.pointerCancel(group, { pointerId: 5 });
    expect(onPreviewChange).toHaveBeenLastCalledWith(null);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onMove).not.toHaveBeenCalled();

    // lostpointercapture rolls back active gesture
    fireEvent.pointerDown(body, {
      pointerId: 11,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(group, {
      pointerId: 11,
      clientX: 120,
      clientY: 110,
    });
    fireEvent(
      group,
      new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 11 }),
    );
    expect(onPreviewChange).toHaveBeenLastCalledWith(null);
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onMove).not.toHaveBeenCalled();

    // Active gesture rolls back immediately if busy transitions to true mid-drag
    fireEvent.pointerDown(body, {
      pointerId: 12,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(group, {
      pointerId: 12,
      clientX: 140,
      clientY: 120,
    });
    rerender(
      <SelectionHandlesOverlay
        annotation={samplePenAnnotation}
        imageWidth={300}
        imageHeight={250}
        zoom={2}
        busy={true}
        onMove={onMove}
        onResize={onResize}
        onPreviewChange={onPreviewChange}
        onCancel={onCancel}
      />,
    );
    expect(onPreviewChange).toHaveBeenLastCalledWith(null);
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(group).toHaveClass("fershot-selection-handles");

    // busy=true blocks starting gestures
    fireEvent.pointerDown(body, {
      pointerId: 6,
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerUp(group, {
      pointerId: 6,
      clientX: 160,
      clientY: 160,
    });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("caches stage scale at pointerDown, skips no-op commits and duplicate preview updates, and aborts gesture if annotation or image changes", () => {
    const onMove = vi.fn();
    const onResize = vi.fn();
    const onPreviewChange = vi.fn();
    const onCancel = vi.fn();

    const secondAnnotation: Annotation = Object.freeze({
      id: "ann-rect-2",
      tool: "rectangle",
      points: Object.freeze([
        Object.freeze({ x: 10, y: 10 }),
        Object.freeze({ x: 50, y: 50 }),
      ]),
      style: Object.freeze({ color: "#00ff00", strokeWidth: 2, opacity: 1 }),
    });

    const { container, rerender } = render(
      <div>
        <SelectionHandlesOverlay
          annotation={samplePenAnnotation}
          imageWidth={300}
          imageHeight={250}
          zoom={1}
          onMove={onMove}
          onResize={onResize}
          onPreviewChange={onPreviewChange}
          onCancel={onCancel}
        />
      </div>,
    );

    const parent = container.firstElementChild as HTMLElement;
    const rectSpy = vi.spyOn(parent, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 150,
      height: 125,
      right: 150,
      bottom: 125,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const group = screen.getByRole("group", {
      name: "Selection handles for ann-pen-1",
    });
    const body = screen.getByRole("button", {
      name: "Move selected annotation",
    });

    // 1. Zero-delta click does not commit a no-op move
    fireEvent.pointerDown(body, {
      pointerId: 21,
      button: 0,
      clientX: 50,
      clientY: 50,
    });
    expect(rectSpy).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(group, {
      pointerId: 21,
      clientX: 50,
      clientY: 50,
    });
    expect(onMove).not.toHaveBeenCalled();

    // 2. Fitted parent rect (150x125 for 300x250 image => 0.5 scale) is read once at pointerDown; duplicate pointerMove coordinates do not re-emit preview
    onPreviewChange.mockClear();
    rectSpy.mockClear();
    fireEvent.pointerDown(body, {
      pointerId: 22,
      button: 0,
      clientX: 40,
      clientY: 40,
    });
    expect(rectSpy).toHaveBeenCalledTimes(1);

    fireEvent.pointerMove(group, {
      pointerId: 22,
      clientX: 55,
      clientY: 50,
    });
    expect(onPreviewChange).toHaveBeenCalledTimes(1);
    // Identical pointerMove coordinates do not re-emit preview
    fireEvent.pointerMove(group, {
      pointerId: 22,
      clientX: 55,
      clientY: 50,
    });
    expect(onPreviewChange).toHaveBeenCalledTimes(1);
    expect(rectSpy).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(group, {
      pointerId: 22,
      clientX: 55,
      clientY: 50,
    });
    // Duplicate pointerUp in same tick is ignored
    fireEvent.pointerUp(group, {
      pointerId: 22,
      clientX: 55,
      clientY: 50,
    });
    expect(onMove).toHaveBeenCalledTimes(1);
    // Screen delta (+15, +10) at 0.5 Fit scale => image delta (+30, +20)
    expect(onMove.mock.calls[0]?.[1]).toEqual({ x: 30, y: 20 });

    // 3. Changing annotation.id mid-drag aborts gesture and prevents stale commit onto new annotation
    fireEvent.pointerDown(body, {
      pointerId: 23,
      button: 0,
      clientX: 40,
      clientY: 40,
    });
    fireEvent.pointerMove(group, {
      pointerId: 23,
      clientX: 70,
      clientY: 60,
    });
    rerender(
      <div>
        <SelectionHandlesOverlay
          annotation={secondAnnotation}
          imageWidth={300}
          imageHeight={250}
          zoom={1}
          onMove={onMove}
          onResize={onResize}
          onPreviewChange={onPreviewChange}
          onCancel={onCancel}
        />
      </div>,
    );
    expect(onCancel).toHaveBeenCalledTimes(1);
    const secondGroup = screen.getByRole("group", {
      name: "Selection handles for ann-rect-2",
    });
    fireEvent.pointerUp(secondGroup, {
      pointerId: 23,
      clientX: 70,
      clientY: 60,
    });
    expect(onMove).toHaveBeenCalledTimes(1);
  });
});

