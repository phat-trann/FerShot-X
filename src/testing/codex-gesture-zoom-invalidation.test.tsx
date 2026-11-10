// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EditorView } from "../features/editor/view/EditorView";
import { SelectionHandlesOverlay } from "../features/selection-handles";
import type { Annotation } from "../contracts/editor";
afterEach(cleanup);
it("does not commit a creation gesture using cached bounds after zoom changes", () => {
  const create = vi.fn();
  const props = { imageSrc: "blob:synthetic-zoom", imageWidth: 400, imageHeight: 200, annotations: [], tool: "rectangle" as const,
    onAnnotationCreate: create, onAnnotationSelect: vi.fn() };
  const { rerender } = render(<EditorView {...props} zoom={1} />);
  const canvas = screen.getByRole("application", { name: "Annotation canvas overlay" });
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 400, height: 200 } as DOMRect);
  fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 40, clientY: 30 });
  rerender(<EditorView {...props} zoom={2} />);
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 200, clientY: 100 });
  expect(create).not.toHaveBeenCalled();
});

it("aborts SelectionHandlesOverlay gestures when zoom or source dimensions change and refreshes cached bounds on scroll/resize events", () => {
  const sampleAnnotation: Annotation = Object.freeze({
    id: "ann-zoom-1",
    tool: "rectangle",
    points: Object.freeze([
      Object.freeze({ x: 20, y: 20 }),
      Object.freeze({ x: 100, y: 80 }),
    ]),
    style: Object.freeze({ color: "#ef4444", strokeWidth: 3, opacity: 1 }),
  });

  const onMove = vi.fn();
  const onResize = vi.fn();
  const onCancel = vi.fn();

  const { container, rerender } = render(
    <div>
      <SelectionHandlesOverlay
        annotation={sampleAnnotation}
        imageWidth={400}
        imageHeight={200}
        zoom={1}
        onMove={onMove}
        onResize={onResize}
        onCancel={onCancel}
      />
    </div>,
  );

  const parent = container.firstElementChild as HTMLElement;
  let mockRect = {
    left: 0,
    top: 0,
    width: 400,
    height: 200,
    right: 400,
    bottom: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
  const rectSpy = vi
    .spyOn(parent, "getBoundingClientRect")
    .mockImplementation(() => mockRect);

  const group = screen.getByRole("group", {
    name: "Selection handles for ann-zoom-1",
  });
  const body = screen.getByRole("button", {
    name: "Move selected annotation",
  });

  // 1. Zoom change mid-drag aborts selection gesture without committing stale coordinates
  fireEvent.pointerDown(body, {
    pointerId: 11,
    button: 0,
    clientX: 40,
    clientY: 40,
  });
  rerender(
    <div>
      <SelectionHandlesOverlay
        annotation={sampleAnnotation}
        imageWidth={400}
        imageHeight={200}
        zoom={2}
        onMove={onMove}
        onResize={onResize}
        onCancel={onCancel}
      />
    </div>,
  );
  expect(onCancel).toHaveBeenCalledTimes(1);
  fireEvent.pointerUp(group, {
    pointerId: 11,
    clientX: 140,
    clientY: 100,
  });
  expect(onMove).not.toHaveBeenCalled();

  // 2. Scroll/resize event invalidates cached geometry once on the next pointer event without repeated layout reads during normal moves
  rectSpy.mockClear();
  fireEvent.pointerDown(body, {
    pointerId: 12,
    button: 0,
    clientX: 40,
    clientY: 40,
  });
  expect(rectSpy).toHaveBeenCalledTimes(1);

  fireEvent.pointerMove(group, {
    pointerId: 12,
    clientX: 60,
    clientY: 50,
  });
  expect(rectSpy).toHaveBeenCalledTimes(1);

  // Simulate viewport scroll shifting stage origin left by -30px, top by -20px
  mockRect = {
    ...mockRect,
    left: -30,
    top: -20,
  };
  fireEvent.scroll(window);

  // Next pointerUp re-reads getBoundingClientRect() once and accounts for the (-30, -20) scroll shift
  fireEvent.pointerUp(group, {
    pointerId: 12,
    clientX: 60,
    clientY: 50,
  });
  expect(rectSpy).toHaveBeenCalledTimes(2);
  expect(onMove).toHaveBeenCalledTimes(1);
  // Start image point: (40 - 0)/1 = 40, (40 - 0)/1 = 40
  // End image point after scroll (-30, -20): (60 - (-30))/1 = 90, (50 - (-20))/1 = 70 => delta (+50, +30)
  expect(onMove.mock.calls[0]?.[1]).toEqual({ x: 50, y: 30 });
});

it("invalidates cached EditorView overlay bounds on window resize/scroll while keeping normal pointerMoves free of layout reads", () => {
  const create = vi.fn();
  render(
    <EditorView
      imageSrc="blob:synthetic-scroll"
      imageWidth={400}
      imageHeight={200}
      annotations={[]}
      tool="rectangle"
      zoom={1}
      onAnnotationCreate={create}
      onAnnotationSelect={vi.fn()}
    />,
  );

  const canvas = screen.getByRole("application", {
    name: "Annotation canvas overlay",
  });
  let currentRect = {
    left: 10,
    top: 20,
    width: 400,
    height: 200,
  } as DOMRect;
  const rectSpy = vi
    .spyOn(canvas, "getBoundingClientRect")
    .mockImplementation(() => currentRect);

  fireEvent.pointerDown(canvas, {
    pointerId: 21,
    button: 0,
    clientX: 50,
    clientY: 50,
  });
  expect(rectSpy).toHaveBeenCalledTimes(1);

  // Normal pointerMove uses cached bounds
  fireEvent.pointerMove(canvas, {
    pointerId: 21,
    clientX: 110,
    clientY: 90,
  });
  expect(rectSpy).toHaveBeenCalledTimes(1);

  // Window scroll shifts stage left/top to (-40, -10)
  currentRect = {
    left: -40,
    top: -10,
    width: 400,
    height: 200,
  } as DOMRect;
  fireEvent.scroll(window);

  fireEvent.pointerUp(canvas, {
    pointerId: 21,
    clientX: 160,
    clientY: 110,
  });
  expect(rectSpy).toHaveBeenCalledTimes(2);
  expect(create).toHaveBeenCalledTimes(1);
  expect(create.mock.calls[0]?.[0]).toMatchObject({
    tool: "rectangle",
    points: [
      { x: 40, y: 30 },
      { x: 200, y: 120 },
    ],
  });
});

