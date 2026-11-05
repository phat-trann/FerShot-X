// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AdvancedWorkbench,
  UnsupportedAnnotationKindError,
  validateAdvancedItem,
  type AdvancedEditorItem,
} from "../features/editor/advanced-workbench/AdvancedWorkbench";

const imageProps = {
  imageId: "qa-image",
  imageSrc: "data:image/png;base64,AA==",
  imageWidth: 120,
  imageHeight: 80,
};

const ellipse: AdvancedEditorItem = {
  id: "ellipse-1",
  itemKind: "shape",
  shape: {
    id: "ellipse-1",
    kind: "ellipse",
    points: [{ x: 10, y: 10 }, { x: 50, y: 40 }],
    style: { color: "#00ff00", strokeWidth: 2, opacity: 1 },
  },
};

describe("AdvancedWorkbench independent regressions", () => {
  it("rejects degenerate and unsupported items through the public validator", () => {
    expect(() =>
      validateAdvancedItem(
        {
          ...ellipse,
          shape: { ...ellipse.shape, points: [{ x: 10, y: 10 }, { x: 10, y: 10 }] },
        },
        120,
        80,
      ),
    ).toThrow("degenerate geometry");

    expect(() =>
      validateAdvancedItem(
        {
          id: "unsupported",
          itemKind: "contract",
          annotation: {
            id: "unsupported",
            tool: "blur",
            points: [{ x: 1, y: 1 }],
            style: { color: "#000000", strokeWidth: 1, opacity: 1 },
          },
        },
        120,
        80,
      ),
    ).toThrow(UnsupportedAnnotationKindError);
  });

  it("clears redo history after a new edit branches from undo", () => {
    render(
      <AdvancedWorkbench
        {...imageProps}
        onSnapshotChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tool: text" }));
    fireEvent.click(screen.getByRole("button", { name: "Place Text" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo Advanced" }));
    expect(screen.getByRole("button", { name: "Redo Advanced" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Tool: highlight" }));
    fireEvent.click(screen.getByRole("button", { name: "Add highlight effect" }));
    expect(screen.getByRole("button", { name: "Redo Advanced" })).toBeDisabled();
    expect(screen.getByLabelText("Advanced item count")).toHaveTextContent("1 items");
  });

  it("keeps the initial selection stable while switching tools", () => {
    const onSnapshotChange = vi.fn();
    render(
      <AdvancedWorkbench
        {...imageProps}
        initialItems={[ellipse]}
        defaultTool="highlight"
        onSnapshotChange={onSnapshotChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Tool: highlight" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tool: select" }));
    fireEvent.click(screen.getByRole("button", { name: "Tool: highlight" }));
    fireEvent.click(screen.getByRole("button", { name: "Add highlight effect" }));

    const latest = onSnapshotChange.mock.lastCall?.[0];
    expect(latest.selectedId).toBe("emphasis-highlight-2");
    expect(latest.items[0].id).toBe("ellipse-1");
  });
});
