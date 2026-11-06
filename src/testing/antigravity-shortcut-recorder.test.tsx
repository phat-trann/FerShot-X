// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  HotkeyPanel,
  type HotkeyItem,
  type ShortcutBinding,
} from "../features/hotkey-panel/HotkeyPanel";
import {
  serializeHotkeyPreferencesJson,
  parseHotkeyPreferencesJson,
} from "../features/hotkey-preferences-codec";

const testItems: readonly HotkeyItem[] = Object.freeze([
  Object.freeze({
    actionId: "capture-area",
    label: "Capture Area",
    binding: null,
  }),
  Object.freeze({
    actionId: "capture-fullscreen",
    label: "Capture Fullscreen",
    binding: null,
  }),
]);

describe("HotkeyPanel shortcut recorder invariants (A41)", () => {
  it("cancels recording on Escape key without assigning a shortcut", () => {
    const onAssign = vi.fn();
    const onClear = vi.fn();

    render(
      <HotkeyPanel
        items={testItems}
        onAssign={onAssign}
        onClear={onClear}
      />,
    );

    const recordBtn = screen.getByRole("button", {
      name: "Record shortcut for Capture Area",
    });

    // Enter recording mode
    fireEvent.click(recordBtn);
    expect(recordBtn).toHaveAttribute("aria-pressed", "true");
    expect(recordBtn).toHaveTextContent("Press keys (Esc to cancel)...");

    // Press Escape to cancel recording
    fireEvent.keyDown(recordBtn, { key: "Escape" });

    // Recording ends, onAssign is not invoked
    expect(recordBtn).toHaveAttribute("aria-pressed", "false");
    expect(recordBtn).toHaveTextContent("Record");
    expect(onAssign).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });

  it("records valid modified key combination exactly once and emits serializable binding", () => {
    let assignedBinding: ShortcutBinding | null = null;
    const onAssign = vi.fn((_actionId, binding: ShortcutBinding) => {
      assignedBinding = binding;
    });
    const onClear = vi.fn();

    render(
      <HotkeyPanel
        items={testItems}
        onAssign={onAssign}
        onClear={onClear}
      />,
    );

    const recordBtn = screen.getByRole("button", {
      name: "Record shortcut for Capture Area",
    });

    fireEvent.click(recordBtn);

    // Press Cmd+Shift+4 (valid modified key)
    fireEvent.keyDown(recordBtn, {
      key: "4",
      metaKey: true,
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
    });

    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(onAssign).toHaveBeenCalledWith("capture-area", {
      key: "4",
      metaKey: true,
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
    });
    expect(recordBtn).toHaveAttribute("aria-pressed", "false");

    // Verify assigned binding conforms to sidecar JSON codec
    expect(assignedBinding).not.toBeNull();
    const bindingsRecord = {
      "capture-area": assignedBinding,
      "capture-fullscreen": null,
      "capture-window": null,
      "capture-scrolling": null,
      "ocr-capture": null,
    };
    const json = serializeHotkeyPreferencesJson(bindingsRecord);
    expect(json).toContain('"key":"4"');
    const parsed = parseHotkeyPreferencesJson(json);
    expect(parsed["capture-area"]).toEqual(assignedBinding);
  });
});
