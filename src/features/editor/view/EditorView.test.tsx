// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  EditorView,
  clientToImagePoint,
  pointsToNormalizedRect,
} from "./EditorView";
import type { Annotation } from "../../../contracts/editor";

afterEach(() => {
  cleanup();
});

describe("EditorView coordinate and gesture helpers", () => {
  it("maps zoomed client coordinates to source-image pixels and clamps out-of-bounds points", () => {
    const bounds = { left: 100, top: 50, width: 400, height: 200 };

    // 2x source image vs rendered CSS box (800x400 image in 400x200 box)
    expect(clientToImagePoint(300, 150, bounds, 800, 400)).toEqual({
      x: 400,
      y: 200,
    });

    // Out-of-bounds negative and overflow coordinates are clamped to [0, width/height]
    expect(clientToImagePoint(20, 10, bounds, 800, 400)).toEqual({
      x: 0,
      y: 0,
    });
    expect(clientToImagePoint(999, 999, bounds, 800, 400)).toEqual({
      x: 800,
      y: 400,
    });
  });

  it("normalizes rectangles regardless of drag direction", () => {
    expect(
      pointsToNormalizedRect({ x: 320, y: 240 }, { x: 120, y: 80 }),
    ).toEqual({
      x: 120,
      y: 80,
      width: 200,
      height: 160,
    });
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

  it("creates rectangle, arrow, and pen annotations via pointer gestures in source-image coordinates", () => {
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

    // Drag from bottom-right to top-left with out-of-image end coordinate
    fireEvent.pointerDown(overlay, { button: 0, clientX: 260, clientY: 145 });
    fireEvent.pointerMove(overlay, { clientX: 60, clientY: 70 });
    fireEvent.pointerUp(overlay, { clientX: 5, clientY: 10 });

    expect(onAnnotationCreate).toHaveBeenCalledTimes(1);
    expect(onAnnotationCreate.mock.calls[0]?.[0]).toMatchObject({
      tool: "rectangle",
      points: [
        { x: 500, y: 250 },
        { x: 0, y: 0 },
      ],
    });

    // Switch to pen tool and trace 3 points
    rerender(
      <EditorView
        imageSrc="blob:synthetic-editor"
        imageWidth={1000}
        imageHeight={500}
        annotations={[]}
        tool="pen"
        onAnnotationCreate={onAnnotationCreate}
        onAnnotationSelect={onAnnotationSelect}
      />,
    );

    fireEvent.pointerDown(overlay, { button: 0, clientX: 60, clientY: 70 });
    fireEvent.pointerMove(overlay, { clientX: 110, clientY: 95 });
    fireEvent.pointerMove(overlay, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(overlay, { clientX: 160, clientY: 120 });

    expect(onAnnotationCreate).toHaveBeenCalledTimes(2);
    expect(onAnnotationCreate.mock.calls[1]?.[0]).toMatchObject({
      tool: "pen",
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 150 },
        { x: 300, y: 200 },
      ],
    });
  });

  it("cancels an active gesture on Escape or pointerCancel without creating an annotation", () => {
    const onAnnotationCreate = vi.fn<(annotation: Annotation) => void>();

    render(
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

    fireEvent.pointerDown(overlay, { button: 0, clientX: 60, clientY: 70 });
    fireEvent.pointerMove(overlay, { clientX: 260, clientY: 170 });
    expect(screen.getByTestId("annotation-draft-preview")).toBeInTheDocument();

    fireEvent.keyDown(overlay, { key: "Escape" });
    expect(screen.queryByTestId("annotation-draft-preview")).toBeNull();

    fireEvent.pointerUp(overlay, { clientX: 260, clientY: 170 });
    expect(onAnnotationCreate).not.toHaveBeenCalled();
  });

  it("selects rendered annotations, clears selection on canvas click, and reports unsupported tools", () => {
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
    ];
    const onAnnotationCreate = vi.fn<(annotation: Annotation) => void>();
    const onAnnotationSelect = vi.fn<(id: string | null) => void>();

    const { rerender } = render(
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

    fireEvent.click(screen.getByTestId("annotation-ann-rect-1"));
    expect(onAnnotationSelect).toHaveBeenCalledExactlyOnceWith("ann-rect-1");

    const overlay = screen.getByRole("application", {
      name: /annotation canvas overlay/i,
    });
    fireEvent.pointerDown(overlay, { button: 0 });
    expect(onAnnotationSelect).toHaveBeenLastCalledWith(null);

    rerender(
      <EditorView
        imageSrc="blob:synthetic-editor"
        imageWidth={800}
        imageHeight={600}
        annotations={existing}
        tool="blur"
        onAnnotationCreate={onAnnotationCreate}
        onAnnotationSelect={onAnnotationSelect}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /tool “blur” is not supported for interactive creation/i,
    );
    fireEvent.pointerDown(overlay, { button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(overlay, { clientX: 150, clientY: 150 });
    expect(onAnnotationCreate).not.toHaveBeenCalled();
  });
});

