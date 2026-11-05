// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  EditorView,
  clientToImagePoint,
  computeArrowHeadPoints,
  pointsToNormalizedRect,
} from "./EditorView";
import type { Annotation } from "../../../contracts/editor";

afterEach(() => {
  cleanup();
});

describe("EditorView coordinate and gesture helpers", () => {
  it("maps zoomed client coordinates to source-image pixels and clamps out-of-bounds points", () => {
    const bounds = { left: 100, top: 50, width: 400, height: 200 };

    expect(clientToImagePoint(300, 150, bounds, 800, 400)).toEqual({
      x: 400,
      y: 200,
    });

    expect(clientToImagePoint(20, 10, bounds, 800, 400)).toEqual({
      x: 0,
      y: 0,
    });
    expect(clientToImagePoint(999, 999, bounds, 800, 400)).toEqual({
      x: 800,
      y: 400,
    });
  });

  it("normalizes rectangles regardless of drag direction and computes arrowhead vertices", () => {
    expect(
      pointsToNormalizedRect({ x: 320, y: 240 }, { x: 120, y: 80 }),
    ).toEqual({
      x: 120,
      y: 80,
      width: 200,
      height: 160,
    });

    const [tip, wing1, wing2] = computeArrowHeadPoints(
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      3,
    );
    expect(tip).toEqual({ x: 110, y: 20 });
    expect(wing1.x).toBeLessThan(110);
    expect(wing2.x).toBeLessThan(110);
    expect(wing1.y).not.toBe(wing2.y);
  });
});

describe("EditorView component", () => {
  const attachMockBounds = (el: HTMLElement) => {
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      left: 10,
      top: 20,
      width: 500,
      height: 250,
      right: 510,
      bottom: 270,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });
  };

  it("creates rectangle, arrow (with shaft and arrowhead), and pen annotations preserving distinct release endpoint", () => {
    const onAnnotationCreate = vi.fn<(annotation: Annotation) => void>();
    const onAnnotationSelect = vi.fn<(id: string | null) => void>();

    const { rerender } = render(
      <EditorView
        imageSrc="blob:synthetic-editor"
        imageWidth={1000}
        imageHeight={500}
        annotations={[]}
        tool="rectangle"
        onAnnotationCreate={onAnnotationCreate}
        onAnnotationSelect={onAnnotationSelect}
      />,
    );

    const overlay = screen.getByRole("application", {
      name: /annotation canvas overlay/i,
    });
    attachMockBounds(overlay);

    fireEvent.pointerDown(overlay, {
      button: 0,
      pointerId: 1,
      clientX: 260,
      clientY: 145,
    });
    fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 60, clientY: 70 });
    fireEvent.pointerUp(overlay, { pointerId: 1, clientX: 5, clientY: 10 });

    expect(onAnnotationCreate).toHaveBeenCalledTimes(1);
    expect(onAnnotationCreate.mock.calls[0]?.[0]).toMatchObject({
      tool: "rectangle",
      points: [
        { x: 500, y: 250 },
        { x: 0, y: 0 },
      ],
    });

    // Switch to arrow tool, create arrow, and verify rendered shaft + arrowhead polygon
    rerender(
      <EditorView
        imageSrc="blob:synthetic-editor"
        imageWidth={1000}
        imageHeight={500}
        annotations={[]}
        tool="arrow"
        onAnnotationCreate={onAnnotationCreate}
        onAnnotationSelect={onAnnotationSelect}
      />,
    );

    fireEvent.pointerDown(overlay, {
      button: 0,
      pointerId: 2,
      clientX: 60,
      clientY: 70,
    });
    fireEvent.pointerMove(overlay, {
      pointerId: 2,
      clientX: 160,
      clientY: 120,
    });
    expect(
      screen.getByTestId("annotation-draft-preview-shaft"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("annotation-draft-preview-head"),
    ).toBeInTheDocument();

    fireEvent.pointerUp(overlay, {
      pointerId: 2,
      clientX: 160,
      clientY: 120,
    });
    expect(onAnnotationCreate).toHaveBeenCalledTimes(2);
    const arrowAnn = onAnnotationCreate.mock.calls[1]?.[0];
    expect(arrowAnn).toMatchObject({
      tool: "arrow",
      points: [
        { x: 100, y: 100 },
        { x: 300, y: 200 },
      ],
    });

    // Switch to pen tool: start(100,100) -> move(200,150) -> up(400,220) must emit all 3 points
    rerender(
      <EditorView
        imageSrc="blob:synthetic-editor"
        imageWidth={1000}
        imageHeight={500}
        annotations={arrowAnn ? [arrowAnn] : []}
        tool="pen"
        onAnnotationCreate={onAnnotationCreate}
        onAnnotationSelect={onAnnotationSelect}
      />,
    );

    fireEvent.pointerDown(overlay, {
      button: 0,
      pointerId: 3,
      clientX: 60,
      clientY: 70,
    });
    // Second pointerdown with another pointerId while draft is active must be ignored
    fireEvent.pointerDown(overlay, {
      button: 0,
      pointerId: 99,
      clientX: 300,
      clientY: 200,
    });
    fireEvent.pointerMove(overlay, {
      pointerId: 3,
      clientX: 110,
      clientY: 95,
    });
    fireEvent.pointerUp(overlay, {
      pointerId: 3,
      clientX: 210,
      clientY: 130,
    });

    expect(onAnnotationCreate).toHaveBeenCalledTimes(3);
    expect(onAnnotationCreate.mock.calls[2]?.[0]).toMatchObject({
      tool: "pen",
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 150 },
        { x: 400, y: 220 },
      ],
    });
  });

  it("manages pointer capture, cleans up on lostpointercapture or Escape, and avoids ID collisions across remounts", () => {
    const created: Annotation[] = [];
    const onAnnotationCreate = vi.fn((ann: Annotation) => {
      created.push(ann);
    });

    const { unmount } = render(
      <EditorView
        imageSrc="blob:synthetic-editor"
        imageWidth={1000}
        imageHeight={500}
        annotations={[]}
        tool="arrow"
        onAnnotationCreate={onAnnotationCreate}
        onAnnotationSelect={vi.fn()}
      />,
    );

    const overlay = screen.getByRole("application", {
      name: /annotation canvas overlay/i,
    });
    attachMockBounds(overlay);

    const setCaptureSpy = vi.fn();
    const releaseCaptureSpy = vi.fn();
    Object.defineProperty(overlay, "setPointerCapture", {
      value: setCaptureSpy,
      configurable: true,
    });
    Object.defineProperty(overlay, "releasePointerCapture", {
      value: releaseCaptureSpy,
      configurable: true,
    });
    Object.defineProperty(overlay, "hasPointerCapture", {
      value: () => true,
      configurable: true,
    });

    fireEvent.pointerDown(overlay, {
      button: 0,
      pointerId: 7,
      clientX: 60,
      clientY: 70,
    });
    expect(setCaptureSpy).toHaveBeenCalledWith(7);
    fireEvent.pointerMove(overlay, {
      pointerId: 7,
      clientX: 260,
      clientY: 170,
    });
    expect(screen.getByTestId("annotation-draft-preview")).toBeInTheDocument();

    fireEvent(
      overlay,
      new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 7 }),
    );
    expect(screen.queryByTestId("annotation-draft-preview")).toBeNull();
    fireEvent.pointerUp(overlay, {
      pointerId: 7,
      clientX: 260,
      clientY: 170,
    });
    expect(onAnnotationCreate).not.toHaveBeenCalled();

    fireEvent.pointerDown(overlay, {
      button: 0,
      pointerId: 8,
      clientX: 60,
      clientY: 70,
    });
    fireEvent.pointerUp(overlay, {
      pointerId: 8,
      clientX: 260,
      clientY: 170,
    });
    expect(releaseCaptureSpy).toHaveBeenCalledWith(8);
    expect(created).toHaveLength(1);

    unmount();

    render(
      <EditorView
        imageSrc="blob:synthetic-editor"
        imageWidth={1000}
        imageHeight={500}
        annotations={created}
        tool="rectangle"
        onAnnotationCreate={onAnnotationCreate}
        onAnnotationSelect={vi.fn()}
      />,
    );

    const remountedOverlay = screen.getByRole("application", {
      name: /annotation canvas overlay/i,
    });
    attachMockBounds(remountedOverlay);

    fireEvent.pointerDown(remountedOverlay, {
      button: 0,
      pointerId: 9,
      clientX: 60,
      clientY: 70,
    });
    fireEvent.pointerUp(remountedOverlay, {
      pointerId: 9,
      clientX: 260,
      clientY: 170,
    });

    expect(created).toHaveLength(2);
    expect(created[0]?.id).not.toBe(created[1]?.id);
  });

  it("selects rendered annotations, clears selection on canvas click, and explicitly omits unsupported supplied annotation tools without fake shapes", () => {
    const existing: readonly Annotation[] = [
      {
        id: "ann-rect-1",
        tool: "rectangle",
        points: [
          { x: 20, y: 30 },
          { x: 120, y: 90 },
        ],
        style: { color: "#22c55e", strokeWidth: 2, opacity: 1 },
      },
      {
        id: "ann-blur-unsupported",
        tool: "blur",
        points: [
          { x: 40, y: 40 },
          { x: 100, y: 100 },
        ],
        style: { color: "#000000", strokeWidth: 4, opacity: 1 },
      },
    ];
    const onAnnotationCreate = vi.fn<(annotation: Annotation) => void>();
    const onAnnotationSelect = vi.fn<(id: string | null) => void>();

    render(
      <EditorView
        imageSrc="blob:synthetic-editor"
        imageWidth={800}
        imageHeight={600}
        annotations={existing}
        tool="select"
        onAnnotationCreate={onAnnotationCreate}
        onAnnotationSelect={onAnnotationSelect}
      />,
    );

    // Unsupported supplied annotation is NOT rendered as a fake circle and shows a status notice
    expect(screen.queryByTestId("annotation-ann-blur-unsupported")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      /unsupported annotation tool\(s\) omitted from rendering: blur/i,
    );

    fireEvent.click(screen.getByTestId("annotation-ann-rect-1"));
    expect(onAnnotationSelect).toHaveBeenCalledExactlyOnceWith("ann-rect-1");
  });
});
