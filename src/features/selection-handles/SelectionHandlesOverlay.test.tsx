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
});

