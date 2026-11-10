// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { EditorWorkbench } from "./EditorWorkbench";
import type { Annotation } from "../../../contracts/editor";

afterEach(() => {
  cleanup();
});

function mockOverlayBounds(overlay: HTMLElement) {
  vi.spyOn(overlay, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 400,
    height: 300,
    right: 400,
    bottom: 300,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

describe("EditorWorkbench", () => {
  it("isolates undo/redo and annotation state per imageId while preserving original imageSrc", () => {
    const onAnnotationsChange =
      vi.fn<(imageId: string, annotations: readonly Annotation[]) => void>();
    const onExportAnnotations =
      vi.fn<(imageId: string, annotations: readonly Annotation[]) => void>();

    const { rerender } = render(
      <EditorWorkbench
        imageId="img-alpha"
        imageSrc="blob:alpha-original"
        imageWidth={400}
        imageHeight={300}
        defaultTool="rectangle"
        onAnnotationsChange={onAnnotationsChange}
        onExportAnnotations={onExportAnnotations}
      />,
    );

    const alphaOverlay = screen.getByRole("application", {
      name: /annotation canvas overlay/i,
    });
    mockOverlayBounds(alphaOverlay);

    // Draw 1 rectangle on img-alpha
    fireEvent.pointerDown(alphaOverlay, {
      button: 0,
      pointerId: 1,
      clientX: 20,
      clientY: 30,
    });
    fireEvent.pointerUp(alphaOverlay, {
      pointerId: 1,
      clientX: 120,
      clientY: 130,
    });

    expect(screen.getByText("1 annotation")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Editor canvas" })).toHaveAttribute(
      "src",
      "blob:alpha-original",
    );

    // Switch to img-beta: history and annotations must be empty and independent
    rerender(
      <EditorWorkbench
        imageId="img-beta"
        imageSrc="blob:beta-original"
        imageWidth={800}
        imageHeight={600}
        defaultTool="rectangle"
        onAnnotationsChange={onAnnotationsChange}
        onExportAnnotations={onExportAnnotations}
      />,
    );

    expect(screen.getByText("0 annotations")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("img", { name: "Editor canvas" })).toHaveAttribute(
      "src",
      "blob:beta-original",
    );

    // Switch back to img-alpha: its annotation and undo state are preserved
    rerender(
      <EditorWorkbench
        imageId="img-alpha"
        imageSrc="blob:alpha-original"
        imageWidth={400}
        imageHeight={300}
        defaultTool="rectangle"
        onAnnotationsChange={onAnnotationsChange}
        onExportAnnotations={onExportAnnotations}
      />,
    );

    expect(screen.getByText("1 annotation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).not.toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: /export annotations/i }),
    );
    expect(onExportAnnotations).toHaveBeenCalledTimes(1);
    expect(onExportAnnotations.mock.calls[0]?.[0]).toBe("img-alpha");
    expect(onExportAnnotations.mock.calls[0]?.[1]).toHaveLength(1);
  });

  it("handles undo branching after a new edit, selection/deletion consistency, and immutable inputs/callbacks", () => {
    const initial: readonly Annotation[] = Object.freeze([
      Object.freeze({
        id: "seed-1",
        tool: "rectangle",
        points: Object.freeze([
          Object.freeze({ x: 10, y: 10 }),
          Object.freeze({ x: 60, y: 60 }),
        ]),
        style: Object.freeze({ color: "#ef4444", strokeWidth: 3, opacity: 1 }),
      }),
    ]);

    const onExportAnnotations =
      vi.fn<(imageId: string, annotations: readonly Annotation[]) => void>();

    render(
      <EditorWorkbench
        imageId="img-branch"
        imageSrc="blob:branch-original"
        imageWidth={400}
        imageHeight={300}
        initialAnnotations={initial}
        defaultTool="arrow"
        onExportAnnotations={onExportAnnotations}
      />,
    );

    const overlay = screen.getByRole("application", {
      name: /annotation canvas overlay/i,
    });
    mockOverlayBounds(overlay);

    // Add second annotation (arrow)
    fireEvent.pointerDown(overlay, {
      button: 0,
      pointerId: 1,
      clientX: 50,
      clientY: 50,
    });
    fireEvent.pointerUp(overlay, {
      pointerId: 1,
      clientX: 150,
      clientY: 150,
    });
    expect(screen.getByText("2 annotations")).toBeInTheDocument();

    // Undo removes the arrow and enables Redo
    const undoBtn = screen.getByRole("button", { name: "Undo" });
    const redoBtn = screen.getByRole("button", { name: "Redo" });
    fireEvent.click(undoBtn);
    expect(screen.getByText("1 annotation")).toBeInTheDocument();
    expect(redoBtn).not.toBeDisabled();

    // Branch history with a new pen stroke -> Redo must become disabled
    fireEvent.click(screen.getByRole("button", { name: "Pen tool" }));
    fireEvent.pointerDown(overlay, {
      button: 0,
      pointerId: 2,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerMove(overlay, {
      pointerId: 2,
      clientX: 80,
      clientY: 80,
    });
    fireEvent.pointerUp(overlay, {
      pointerId: 2,
      clientX: 120,
      clientY: 120,
    });
    expect(screen.getByText("2 annotations")).toBeInTheDocument();
    expect(redoBtn).toBeDisabled();

    // Switch to Select tool, select seed-1, and delete it
    fireEvent.click(screen.getByRole("button", { name: "Select tool" }));
    fireEvent.click(screen.getByTestId("annotation-seed-1"));
    const deleteBtn = screen.getByRole("button", { name: "Delete Selected" });
    expect(deleteBtn).not.toBeDisabled();

    fireEvent.click(deleteBtn);
    expect(screen.getByText("1 annotation")).toBeInTheDocument();
    expect(deleteBtn).toBeDisabled();

    // Verify initial frozen array was not mutated and exported array is frozen
    expect(initial).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", { name: /export annotations/i }),
    );
    const exported = onExportAnnotations.mock.calls[0]?.[1];
    expect(exported).toHaveLength(1);
    expect(Object.isFrozen(exported)).toBe(true);
  });

  it("handles Object.prototype property names like toString and __proto__ as imageId safely", () => {
    const { rerender } = render(
      <EditorWorkbench
        imageId="toString"
        imageSrc="blob:to-string"
        imageWidth={400}
        imageHeight={300}
        defaultTool="rectangle"
      />,
    );

    expect(screen.getByText("0 annotations")).toBeInTheDocument();

    const overlay = screen.getByRole("application", {
      name: /annotation canvas overlay/i,
    });
    mockOverlayBounds(overlay);

    fireEvent.pointerDown(overlay, {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerUp(overlay, {
      pointerId: 1,
      clientX: 90,
      clientY: 90,
    });
    expect(screen.getByText("1 annotation")).toBeInTheDocument();

    rerender(
      <EditorWorkbench
        imageId="__proto__"
        imageSrc="blob:proto"
        imageWidth={400}
        imageHeight={300}
        defaultTool="rectangle"
      />,
    );
    expect(screen.getByText("0 annotations")).toBeInTheDocument();
  });

  it("supports direct move and resize of selected annotation as a single committed undo/redo gesture", () => {
    const onAnnotationsChange = vi.fn();
    render(
      <EditorWorkbench
        imageId="img-direct-move"
        imageSrc="blob:direct"
        imageWidth={400}
        imageHeight={300}
        zoom={1}
        defaultTool="rectangle"
        onAnnotationsChange={onAnnotationsChange}
      />,
    );

    const overlay = screen.getByRole("application", {
      name: /annotation canvas overlay/i,
    });
    mockOverlayBounds(overlay);

    // 1. Create rectangle at (20,30) -> (120,130)
    fireEvent.pointerDown(overlay, {
      button: 0,
      pointerId: 1,
      clientX: 20,
      clientY: 30,
    });
    fireEvent.pointerUp(overlay, {
      pointerId: 1,
      clientX: 120,
      clientY: 130,
    });
    expect(onAnnotationsChange).toHaveBeenCalledTimes(1);

    // 2. Drag move handle across multiple pointerMove steps -> commits only ONCE on pointerUp
    const moveBody = screen.getByRole("button", {
      name: "Move selected annotation",
    });
    const handleGroup = moveBody.parentElement!;
    fireEvent.pointerDown(moveBody, {
      button: 0,
      pointerId: 2,
      clientX: 50,
      clientY: 50,
    });
    fireEvent.pointerMove(handleGroup, {
      pointerId: 2,
      clientX: 60,
      clientY: 60,
    });
    fireEvent.pointerMove(handleGroup, {
      pointerId: 2,
      clientX: 80,
      clientY: 70,
    });
    // Still only 1 history commit (creation) before pointerUp
    expect(onAnnotationsChange).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(handleGroup, {
      pointerId: 2,
      clientX: 80,
      clientY: 70,
    });
    expect(onAnnotationsChange).toHaveBeenCalledTimes(2);
    expect(onAnnotationsChange.mock.calls[1]?.[1]?.[0]?.points).toEqual([
      { x: 50, y: 50 },
      { x: 150, y: 150 },
    ]);

    // 3. Single Undo restores original (20,30)->(120,130); Single Redo reapplies (50,50)->(150,150)
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onAnnotationsChange).toHaveBeenCalledTimes(3);
    expect(onAnnotationsChange.mock.calls[2]?.[1]?.[0]?.points).toEqual([
      { x: 20, y: 30 },
      { x: 120, y: 130 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(onAnnotationsChange).toHaveBeenCalledTimes(4);
    expect(onAnnotationsChange.mock.calls[3]?.[1]?.[0]?.points).toEqual([
      { x: 50, y: 50 },
      { x: 150, y: 150 },
    ]);
    expect(
      screen.getByRole("region", {
        name: /editor workbench for img-direct-move/i,
      }),
    ).toHaveClass("fershot-editor-workbench");
  });
});
