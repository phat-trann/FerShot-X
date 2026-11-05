// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { EditorToolbar } from "./EditorToolbar";
import type { AnnotationTool } from "../../../contracts/editor";

afterEach(() => {
  cleanup();
});

describe("EditorToolbar", () => {
  it("renders only supported allowed tools (select, rectangle, arrow, pen), reflects pressed state, and invokes onSelectTool", () => {
    const onSelectTool = vi.fn<(tool: AnnotationTool) => void>();

    render(
      <EditorToolbar
        selectedTool="rectangle"
        allowedTools={[
          "select",
          "rectangle",
          "arrow",
          "pen",
          "blur",
          "ellipse",
          "text",
          "counter",
        ]}
        canUndo={false}
        canRedo={false}
        canDeleteSelected={false}
        onSelectTool={onSelectTool}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onDeleteSelected={vi.fn()}
      />,
    );

    const selectBtn = screen.getByRole("button", { name: "Select tool" });
    const rectBtn = screen.getByRole("button", { name: "Rectangle tool" });
    const arrowBtn = screen.getByRole("button", { name: "Arrow tool" });
    const penBtn = screen.getByRole("button", { name: "Pen tool" });

    expect(rectBtn).toHaveAttribute("aria-pressed", "true");
    expect(selectBtn).toHaveAttribute("aria-pressed", "false");

    // Unsupported tools are omitted even if passed in allowedTools
    expect(screen.queryByRole("button", { name: /blur tool/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /ellipse tool/i })).toBeNull();

    fireEvent.click(arrowBtn);
    fireEvent.click(penBtn);
    expect(onSelectTool.mock.calls.map((c) => c[0])).toEqual(["arrow", "pen"]);
  });

  it("guards undo, redo, and delete-selected callbacks when disabled and invokes them when enabled", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onDeleteSelected = vi.fn();

    const { rerender } = render(
      <EditorToolbar
        selectedTool="select"
        canUndo={false}
        canRedo={false}
        canDeleteSelected={false}
        onSelectTool={vi.fn()}
        onUndo={onUndo}
        onRedo={onRedo}
        onDeleteSelected={onDeleteSelected}
      />,
    );

    const undoBtn = screen.getByRole("button", { name: "Undo" });
    const redoBtn = screen.getByRole("button", { name: "Redo" });
    const deleteBtn = screen.getByRole("button", { name: "Delete Selected" });

    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();
    expect(deleteBtn).toBeDisabled();

    fireEvent.click(undoBtn);
    fireEvent.click(redoBtn);
    fireEvent.click(deleteBtn);
    expect(onUndo).not.toHaveBeenCalled();
    expect(onRedo).not.toHaveBeenCalled();
    expect(onDeleteSelected).not.toHaveBeenCalled();

    rerender(
      <EditorToolbar
        selectedTool="select"
        canUndo={true}
        canRedo={true}
        canDeleteSelected={true}
        onSelectTool={vi.fn()}
        onUndo={onUndo}
        onRedo={onRedo}
        onDeleteSelected={onDeleteSelected}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Selected" }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
  });

  it("supports arrow-key focus roving and scoped tool shortcut keys", () => {
    const onSelectTool = vi.fn<(tool: AnnotationTool) => void>();

    render(
      <EditorToolbar
        selectedTool="select"
        canUndo={false}
        canRedo={false}
        canDeleteSelected={false}
        onSelectTool={onSelectTool}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onDeleteSelected={vi.fn()}
      />,
    );

    const selectBtn = screen.getByRole("button", { name: "Select tool" });
    const rectBtn = screen.getByRole("button", { name: "Rectangle tool" });
    const penBtn = screen.getByRole("button", { name: "Pen tool" });

    selectBtn.focus();
    expect(selectBtn).toHaveFocus();

    fireEvent.keyDown(selectBtn, { key: "ArrowRight" });
    expect(rectBtn).toHaveFocus();

    fireEvent.keyDown(rectBtn, { key: "ArrowLeft" });
    expect(selectBtn).toHaveFocus();

    fireEvent.keyDown(selectBtn, { key: "ArrowLeft" });
    expect(penBtn).toHaveFocus();

    fireEvent.keyDown(penBtn, { key: "r", isComposing: true });
    expect(onSelectTool).not.toHaveBeenCalled();

    fireEvent.keyDown(penBtn, { key: "a" });
    expect(onSelectTool).toHaveBeenCalledExactlyOnceWith("arrow");
  });
});
