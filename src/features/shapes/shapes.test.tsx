// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  SHAPE_CONTRACT_ADAPTER_PROPOSAL,
  ShapesOverlay,
  computeEllipseGeometry,
  computeLineGeometry,
  toContractEllipseAnnotation,
  type ShapePrimitiveAnnotation,
} from "./shapes";
import type { Point } from "../../contracts/editor";

afterEach(() => {
  cleanup();
});

function mockSvgBounds(svg: HTMLElement) {
  vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

describe("shapes primitives (A16)", () => {
  it("computes bounded ellipse and line geometry for reverse drags, zero sizes, and frozen inputs", () => {
    const start: Point = Object.freeze({ x: 300, y: 180 });
    const end: Point = Object.freeze({ x: -20, y: 40 });

    const ellipse = computeEllipseGeometry(start, end, 250, 150);
    expect(ellipse).toEqual({
      cx: 125,
      cy: 95,
      rx: 125,
      ry: 55,
      bounds: { x: 0, y: 40, width: 250, height: 110 },
    });

    // Zero width or height ellipse returns null
    expect(
      computeEllipseGeometry({ x: 50, y: 10 }, { x: 50, y: 90 }, 250, 150),
    ).toBeNull();

    const line = computeLineGeometry(start, end, 250, 150);
    expect(line?.x1).toBe(250);
    expect(line?.y1).toBe(150);
    expect(line?.x2).toBe(0);
    expect(line?.y2).toBe(40);
    expect(line?.bounds).toEqual({ x: 0, y: 40, width: 250, height: 110 });

    // Zero-length line returns null
    expect(
      computeLineGeometry({ x: 30, y: 30 }, { x: 30, y: 30 }, 250, 150),
    ).toBeNull();

    // Non-finite inputs throw
    expect(() =>
      computeLineGeometry({ x: Number.NaN, y: 0 }, { x: 10, y: 10 }, 100, 100),
    ).toThrow(/finite/i);

    // Caller points remain unmutated
    expect(start).toEqual({ x: 300, y: 180 });
    expect(end).toEqual({ x: -20, y: 40 });
  });

  it("converts ellipse to frozen contract Annotation and refuses fake arrow-as-line mapping", () => {
    const ellipseShape: ShapePrimitiveAnnotation = Object.freeze({
      id: "s-1",
      kind: "ellipse",
      points: Object.freeze([
        Object.freeze({ x: 10, y: 20 }),
        Object.freeze({ x: 90, y: 80 }),
      ] as const),
      style: Object.freeze({ color: "#22c55e", strokeWidth: 4, opacity: 0.9 }),
    });

    const converted = toContractEllipseAnnotation(ellipseShape);
    expect(converted.tool).toBe("ellipse");
    expect(Object.isFrozen(converted)).toBe(true);

    const lineShape: ShapePrimitiveAnnotation = {
      ...ellipseShape,
      id: "s-2",
      kind: "line",
    };
    expect(() => toContractEllipseAnnotation(lineShape)).toThrow(/line/i);
    expect(
      SHAPE_CONTRACT_ADAPTER_PROPOSAL.proposedContractToolAdditions,
    ).toContain("line");
  });

  it("handles pointer drag creation, Escape cancellation, and secondary pointer rejection in ShapesOverlay", () => {
    const onShapeCreate = vi.fn<(shape: ShapePrimitiveAnnotation) => void>();

    const { rerender } = render(
      <ShapesOverlay
        imageWidth={400}
        imageHeight={200}
        shapes={[]}
        activeKind="ellipse"
        onShapeCreate={onShapeCreate}
      />,
    );

    const svg = screen.getByRole("application", {
      name: /ellipse and line shape overlay/i,
    });
    mockSvgBounds(svg);

    // Reverse drag ellipse creation (scaled 2x from 200x100 CSS to 400x200 image)
    fireEvent.pointerDown(svg, {
      button: 0,
      pointerId: 1,
      clientX: 150,
      clientY: 80,
    });
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      clientX: 50,
      clientY: 20,
    });
    expect(screen.getByTestId("draft-shape-ellipse")).toBeInTheDocument();

    // Secondary pointer is ignored
    fireEvent.pointerDown(svg, {
      button: 0,
      pointerId: 2,
      clientX: 0,
      clientY: 0,
    });

    fireEvent.pointerUp(svg, {
      pointerId: 1,
      clientX: 50,
      clientY: 20,
    });

    expect(onShapeCreate).toHaveBeenCalledTimes(1);
    const created = onShapeCreate.mock.calls[0]?.[0];
    expect(created?.kind).toBe("ellipse");
    expect(created?.points).toEqual([
      { x: 300, y: 160 },
      { x: 100, y: 40 },
    ]);

    // Switch to line and verify Escape cancels active draft
    rerender(
      <ShapesOverlay
        imageWidth={400}
        imageHeight={200}
        shapes={created ? [created] : []}
        activeKind="line"
        onShapeCreate={onShapeCreate}
      />,
    );

    fireEvent.pointerDown(svg, {
      button: 0,
      pointerId: 3,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(svg, {
      pointerId: 3,
      clientX: 100,
      clientY: 50,
    });
    expect(screen.getByTestId("draft-shape-line")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("draft-shape-line")).toBeNull();

    fireEvent.pointerUp(svg, {
      pointerId: 3,
      clientX: 100,
      clientY: 50,
    });
    expect(onShapeCreate).toHaveBeenCalledTimes(1);
  });
});
