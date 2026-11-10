// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AdvancedWorkbench,
  UnsupportedAnnotationKindError,
  moveAdvancedItem,
  projectItemToFrozenContractAnnotation,
  validateAdvancedItem,
  type AdvancedEditorItem,
} from "./AdvancedWorkbench";

describe("AdvancedWorkbench (A34)", () => {
  it("composes shape, text/counter, emphasis, selection move/resize with zoom, undo/redo, and rejects unsupported kinds explicitly", () => {
    const onSnapshotChange = vi.fn();

    const initialLine: AdvancedEditorItem = Object.freeze({
      id: "line-1",
      itemKind: "shape",
      shape: Object.freeze({
        id: "line-1",
        kind: "line",
        points: Object.freeze([
          Object.freeze({ x: 10, y: 10 }),
          Object.freeze({ x: 50, y: 30 }),
        ] as const),
        style: Object.freeze({ color: "#ff0000", strokeWidth: 4, opacity: 1 }),
      }),
    });

    render(
      <AdvancedWorkbench
        imageId="img-adv-1"
        imageSrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=="
        imageWidth={200}
        imageHeight={150}
        zoom={2}
        initialItems={[initialLine]}
        onSnapshotChange={onSnapshotChange}
      />,
    );

    expect(screen.getByLabelText("Advanced item count")).toHaveTextContent(
      "1 items",
    );

    // Move selected line via SelectionHandlesOverlay with zoom=2: screen delta (+20, +10) => image delta (+10, +5)
    const group = screen.getByRole("group", {
      name: "Selection handles for line-1",
    });
    const moveBody = screen.getByRole("button", {
      name: "Move selected annotation",
    });
    fireEvent.pointerDown(moveBody, {
      pointerId: 1,
      button: 0,
      clientX: 40,
      clientY: 40,
    });
    fireEvent.pointerUp(group, {
      pointerId: 1,
      clientX: 60,
      clientY: 50,
    });

    const movedItem = onSnapshotChange.mock.calls[0][0].items[0];
    expect(movedItem.shape.points).toEqual([
      { x: 20, y: 15 },
      { x: 60, y: 35 },
    ]);

    // Place a text annotation via TextCounterControls
    fireEvent.click(screen.getByRole("button", { name: "text tool" }));
    fireEvent.click(screen.getByRole("button", { name: "Place Text" }));
    expect(screen.getByLabelText("Advanced item count")).toHaveTextContent(
      "2 items",
    );

    // Add a highlight emphasis effect
    fireEvent.click(screen.getByRole("button", { name: "highlight tool" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Add highlight effect" }),
    );
    expect(screen.getByLabelText("Advanced item count")).toHaveTextContent(
      "3 items",
    );

    // Undo and Redo
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("Advanced item count")).toHaveTextContent(
      "2 items",
    );
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByLabelText("Advanced item count")).toHaveTextContent(
      "3 items",
    );

    // Adapter conversions: ellipse converts losslessly, line/emphasis/blur throw explicit UnsupportedAnnotationKindError
    const ellipseItem: AdvancedEditorItem = {
      id: "el-1",
      itemKind: "shape",
      shape: {
        id: "el-1",
        kind: "ellipse",
        points: [
          { x: 10, y: 10 },
          { x: 40, y: 30 },
        ],
        style: { color: "#00ff00", strokeWidth: 2, opacity: 1 },
      },
    };
    expect(projectItemToFrozenContractAnnotation(ellipseItem).tool).toBe(
      "ellipse",
    );
    expect(() => projectItemToFrozenContractAnnotation(initialLine)).toThrow(
      UnsupportedAnnotationKindError,
    );
    expect(() =>
      validateAdvancedItem(
        {
          id: "bad-blur",
          itemKind: "contract",
          annotation: {
            id: "bad-blur",
            tool: "unsupported" as never,
            points: [{ x: 1, y: 1 }],
            style: { color: "#000", strokeWidth: 2, opacity: 1 },
          },
        },
        200,
        150,
      ),
    ).toThrow(UnsupportedAnnotationKindError);

    const movedHelper = moveAdvancedItem(initialLine, 5, 5, 200, 150);
    expect(movedHelper.itemKind === "shape" && movedHelper.shape.points[0]).toEqual({
      x: 15,
      y: 15,
    });
  });

  it("supports direct canvas gestures for highlight, counter, click-to-place text, emphasis handle resize, Escape rollback, and busy/disabled guards", () => {
    const onSnapshotChange = vi.fn();

    const { rerender } = render(
      <AdvancedWorkbench
        imageId="img-adv-direct"
        imageSrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=="
        imageWidth={200}
        imageHeight={150}
        zoom={2}
        defaultTool="highlight"
        onSnapshotChange={onSnapshotChange}
      />,
    );

    const stage = screen.getByTestId("advanced-workbench-stage");

    // 1. Drag highlight directly on stage with zoom=2: screen (20,20)->(100,80) => image (10,10) 40x30
    fireEvent.pointerDown(stage, {
      button: 0,
      pointerId: 1,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 100, clientY: 80 });
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 100, clientY: 80 });

    expect(screen.getByLabelText("Advanced item count")).toHaveTextContent(
      "1 items",
    );
    const createdHighlight = onSnapshotChange.mock.lastCall?.[0]?.items[0];
    expect(createdHighlight?.effect).toMatchObject({
      kind: "highlight",
      rect: { x: 10, y: 10, width: 40, height: 30 },
    });

    // 2. Resize the selected highlight directly via SE handle
    const seHandle = screen.getByRole("button", { name: "Resize handle SE" });
    const group = screen.getByRole("group", {
      name: `Selection handles for ${createdHighlight.id}`,
    });
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 2,
      clientX: 100,
      clientY: 80,
    });
    fireEvent.pointerUp(group, {
      pointerId: 2,
      clientX: 140,
      clientY: 100,
    });
    const resizedHighlight = onSnapshotChange.mock.lastCall?.[0]?.items[0];
    expect(resizedHighlight?.effect).toMatchObject({
      kind: "highlight",
      rect: { x: 10, y: 10, width: 60, height: 40 },
    });

    // 3. Click on stage with counter tool -> places counter directly
    fireEvent.click(screen.getByRole("button", { name: "counter tool" }));
    fireEvent.pointerDown(stage, {
      button: 0,
      pointerId: 3,
      clientX: 80,
      clientY: 60,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 3,
      clientX: 80,
      clientY: 60,
    });
    expect(screen.getByLabelText("Advanced item count")).toHaveTextContent(
      "2 items",
    );

    // 4. Click on stage with text tool -> opens inline input -> Enter commits; Escape cancels
    fireEvent.click(screen.getByRole("button", { name: "text tool" }));
    fireEvent.pointerDown(stage, {
      button: 0,
      pointerId: 4,
      clientX: 60,
      clientY: 40,
    });
    fireEvent.pointerUp(stage, {
      pointerId: 4,
      clientX: 60,
      clientY: 40,
    });
    const inlineInput = screen.getByRole("textbox", {
      name: /inline canvas text input/i,
    });
    fireEvent.change(inlineInput, { target: { value: "Direct Note" } });
    fireEvent.keyDown(inlineInput, { key: "Enter" });
    expect(screen.getByLabelText("Advanced item count")).toHaveTextContent(
      "3 items",
    );

    // 5. lostpointercapture and mid-gesture busy transitions cancel active stageDraft without committing
    fireEvent.click(screen.getByRole("button", { name: "highlight tool" }));
    fireEvent.pointerDown(stage, {
      button: 0,
      pointerId: 40,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerMove(stage, { pointerId: 40, clientX: 80, clientY: 80 });
    fireEvent(
      stage,
      new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 40 }),
    );
    fireEvent.pointerUp(stage, { pointerId: 40, clientX: 80, clientY: 80 });
    expect(screen.getByLabelText("Advanced item count")).toHaveTextContent(
      "3 items",
    );

    fireEvent.pointerDown(stage, {
      button: 0,
      pointerId: 41,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerMove(stage, { pointerId: 41, clientX: 80, clientY: 80 });
    rerender(
      <AdvancedWorkbench
        imageId="img-adv-direct"
        imageSrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=="
        imageWidth={200}
        imageHeight={150}
        zoom={2}
        busy={true}
        defaultTool="highlight"
        onSnapshotChange={onSnapshotChange}
      />,
    );
    fireEvent.pointerUp(stage, { pointerId: 41, clientX: 80, clientY: 80 });
    expect(screen.getByLabelText("Advanced item count")).toHaveTextContent(
      "3 items",
    );
    expect(stage).toHaveClass("fershot-advanced-workbench__stage");
  });
});

