// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  HotkeyPanel,
  type GlobalActionId,
  type HotkeyItem,
  type ShortcutBinding,
} from "./HotkeyPanel";

afterEach(() => {
  cleanup();
});

const INITIAL_ITEMS: readonly HotkeyItem[] = Object.freeze([
  Object.freeze({
    actionId: "capture-fullscreen",
    label: "Capture Fullscreen",
    binding: Object.freeze({
      key: "1",
      metaKey: true,
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
    }),
  }),
  Object.freeze({
    actionId: "capture-area",
    label: "Capture Area",
    binding: null,
  }),
]);

describe("HotkeyPanel (A25)", () => {
  it("records valid modified shortcuts, ignores IME composition, and handles Clear and Escape cancel", () => {
    const onAssign =
      vi.fn<(id: GlobalActionId, binding: ShortcutBinding) => void>();
    const onClear = vi.fn<(id: GlobalActionId) => void>();

    render(
      <HotkeyPanel
        items={INITIAL_ITEMS}
        permissionState="missing"
        onAssign={onAssign}
        onClear={onClear}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /permission is missing/i,
    );
    expect(
      screen.getByTestId("hotkey-binding-capture-fullscreen"),
    ).toHaveTextContent("Shift+Cmd+1");

    const recordAreaBtn = screen.getByRole("button", {
      name: "Record shortcut for Capture Area",
    });
    fireEvent.click(recordAreaBtn);

    const activeRecordBtn = screen.getByRole("button", {
      name: "Press shortcut for Capture Area",
    });

    // Composing key event is ignored
    fireEvent.keyDown(activeRecordBtn, {
      key: "2",
      metaKey: true,
      shiftKey: true,
      isComposing: true,
    });
    expect(onAssign).not.toHaveBeenCalled();

    // Escape cancels recording
    fireEvent.keyDown(activeRecordBtn, { key: "Escape" });
    expect(
      screen.getByRole("button", {
        name: "Record shortcut for Capture Area",
      }),
    ).toHaveAttribute("aria-pressed", "false");

    // Re-open recording and assign Cmd+Shift+2
    fireEvent.click(
      screen.getByRole("button", {
        name: "Record shortcut for Capture Area",
      }),
    );
    fireEvent.keyDown(
      screen.getByRole("button", {
        name: "Press shortcut for Capture Area",
      }),
      {
        key: "2",
        metaKey: true,
        shiftKey: true,
      },
    );

    expect(onAssign).toHaveBeenCalledExactlyOnceWith("capture-area", {
      key: "2",
      metaKey: true,
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
    });

    // Clear existing binding
    fireEvent.click(
      screen.getByRole("button", {
        name: "Clear shortcut for Capture Fullscreen",
      }),
    );
    expect(onClear).toHaveBeenCalledExactlyOnceWith("capture-fullscreen");
  });

  it("rejects unmodified keys, reserved macOS shortcuts (Cmd+Q), and duplicate conflicts with accessible alerts", () => {
    const onAssign = vi.fn();

    render(
      <HotkeyPanel
        items={INITIAL_ITEMS}
        onAssign={onAssign}
        onClear={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Record shortcut for Capture Area",
      }),
    );
    const activeBtn = screen.getByRole("button", {
      name: "Press shortcut for Capture Area",
    });

    // Plain 'r' without Cmd/Ctrl/Alt -> missing_modifier alert
    fireEvent.keyDown(activeBtn, { key: "r" });
    expect(screen.getByRole("alert")).toHaveTextContent(/must include Cmd/i);

    // Reserved Cmd+Q -> reserved_system alert
    fireEvent.keyDown(activeBtn, { key: "q", metaKey: true });
    expect(screen.getByRole("alert")).toHaveTextContent(/reserved by macOS/i);

    // Conflict with Capture Fullscreen (Cmd+Shift+1)
    fireEvent.keyDown(activeBtn, {
      key: "1",
      metaKey: true,
      shiftKey: true,
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /already assigned to "Capture Fullscreen"/i,
    );

    expect(onAssign).not.toHaveBeenCalled();
  });
});

