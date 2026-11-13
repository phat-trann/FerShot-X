import { Keyboard, X, Eraser } from "lucide-react";
import { Button } from "../../components/ui/button";
import React, { useState } from "react";
import { editorToolShortcuts } from "../shortcuts/editor-shortcuts";
import "./HotkeyPanel.css";

export type GlobalActionId =
  | "capture-fullscreen"
  | "capture-area"
  | "capture-window"
  | "capture-scrolling"
  | "ocr-capture";

export interface ShortcutBinding {
  readonly key: string;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
}

export interface HotkeyItem {
  readonly actionId: GlobalActionId;
  readonly label: string;
  readonly binding: ShortcutBinding | null;
}

export type ShortcutValidationErrorReason =
  | "missing_modifier"
  | "reserved_system"
  | "duplicate_conflict";

export interface ShortcutValidationResult {
  readonly valid: boolean;
  readonly reason?: ShortcutValidationErrorReason;
  readonly conflictingActionId?: GlobalActionId;
  readonly message?: string;
}

export const GLOBAL_HOTKEY_CONTRACT_PROPOSAL = Object.freeze({
  proposedActions: Object.freeze([
    "capture-fullscreen",
    "capture-area",
    "capture-window",
    "capture-scrolling",
    "ocr-capture",
  ] as const),
  editorToolKeysCount: editorToolShortcuts.length,
  rationale:
    "Global capture hotkeys require at least one Command/Ctrl/Alt modifier so single-key editor shortcuts and text entry never collide. Codex C13 owns Tauri global shortcut registration.",
});

const MODIFIER_ONLY_KEYS = new Set([
  "meta",
  "shift",
  "alt",
  "control",
  "capslock",
]);

const RESERVED_MAC_SHORTCUTS: readonly ShortcutBinding[] = Object.freeze([
  Object.freeze({
    key: "q",
    metaKey: true,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
  }),
  Object.freeze({
    key: "w",
    metaKey: true,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
  }),
  Object.freeze({
    key: "tab",
    metaKey: true,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
  }),
  Object.freeze({
    key: " ",
    metaKey: true,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
  }),
]);

export function bindingsEqual(
  a: ShortcutBinding | null,
  b: ShortcutBinding | null,
): boolean {
  if (!a || !b) {
    return a === b;
  }
  return (
    a.key.toLowerCase() === b.key.toLowerCase() &&
    Boolean(a.metaKey) === Boolean(b.metaKey) &&
    Boolean(a.shiftKey) === Boolean(b.shiftKey) &&
    Boolean(a.altKey) === Boolean(b.altKey) &&
    Boolean(a.ctrlKey) === Boolean(b.ctrlKey)
  );
}

export function formatShortcutBinding(binding: ShortcutBinding | null): string {
  if (!binding) {
    return "Unassigned";
  }
  const parts: string[] = [];
  if (binding.ctrlKey) parts.push("Ctrl");
  if (binding.altKey) parts.push("Alt");
  if (binding.shiftKey) parts.push("Shift");
  if (binding.metaKey) parts.push("Cmd");
  parts.push(binding.key === " " ? "Space" : binding.key.toUpperCase());
  return parts.join("+");
}

export function validateShortcutCandidate(
  candidate: ShortcutBinding,
  actionId: GlobalActionId,
  items: readonly HotkeyItem[],
): ShortcutValidationResult {
  if (!candidate.metaKey && !candidate.ctrlKey && !candidate.altKey) {
    return Object.freeze({
      valid: false,
      reason: "missing_modifier",
      message:
        "Shortcut must include Cmd, Ctrl, or Alt so single-key editor tools remain unambiguous.",
    });
  }

  for (const reserved of RESERVED_MAC_SHORTCUTS) {
    if (bindingsEqual(candidate, reserved)) {
      return Object.freeze({
        valid: false,
        reason: "reserved_system",
        message: `${formatShortcutBinding(candidate)} is reserved by macOS.`,
      });
    }
  }

  const conflict = items.find(
    (item) =>
      item.actionId !== actionId && bindingsEqual(item.binding, candidate),
  );
  if (conflict) {
    return Object.freeze({
      valid: false,
      reason: "duplicate_conflict",
      conflictingActionId: conflict.actionId,
      message: `${formatShortcutBinding(candidate)} is already assigned to "${conflict.label}".`,
    });
  }

  return Object.freeze({ valid: true });
}

export interface HotkeyPanelProps {
  readonly items: readonly HotkeyItem[];
  readonly permissionState?: "granted" | "missing" | "unknown";
  readonly onAssign: (
    actionId: GlobalActionId,
    binding: ShortcutBinding,
  ) => void;
  readonly onClear: (actionId: GlobalActionId) => void;
}

export function HotkeyPanel({
  items,
  permissionState = "granted",
  onAssign,
  onClear,
}: HotkeyPanelProps): React.JSX.Element {
  const [recordingActionId, setRecordingActionId] =
    useState<GlobalActionId | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleRecordKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    actionId: GlobalActionId,
  ) => {
    if (recordingActionId !== actionId) {
      return;
    }

    const isComposing = Boolean(
      event.nativeEvent.isComposing ||
        (event as unknown as { isComposing?: boolean }).isComposing,
    );
    if (isComposing || event.repeat) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setRecordingActionId(null);
      setValidationError(null);
      return;
    }

    const normalizedKey = event.key.toLowerCase();
    if (MODIFIER_ONLY_KEYS.has(normalizedKey)) {
      return;
    }

    event.preventDefault();
    const candidate: ShortcutBinding = Object.freeze({
      key: normalizedKey,
      metaKey: Boolean(event.metaKey),
      shiftKey: Boolean(event.shiftKey),
      altKey: Boolean(event.altKey),
      ctrlKey: Boolean(event.ctrlKey),
    });

    const validation = validateShortcutCandidate(candidate, actionId, items);
    if (!validation.valid) {
      setValidationError(validation.message ?? "Invalid shortcut.");
      return;
    }

    setValidationError(null);
    setRecordingActionId(null);
    onAssign(actionId, candidate);
  };

  return (
    <section className="fershot-hotkey-panel" aria-label="Shortcut assignments">
      {permissionState === "missing" && (
        <p className="fershot-hotkey-panel__permission" role="status">
          Global shortcut permission is missing. Shortcuts remain local proposals
          until granted.
        </p>
      )}

      {validationError && (
        <p className="fershot-hotkey-panel__error" role="alert">
          {validationError}
        </p>
      )}

      <ul className="fershot-hotkey-panel__list">
        {items.map((item) => {
          const isRecording = recordingActionId === item.actionId;
          return (
            <li key={item.actionId} className="fershot-hotkey-panel__row">
              <span className="fershot-hotkey-panel__label">{item.label}</span>
              <kbd
                className="fershot-hotkey-panel__kbd"
                data-testid={`hotkey-binding-${item.actionId}`}
              >
                {formatShortcutBinding(item.binding)}
              </kbd>
              <div className="fershot-hotkey-panel__actions">
                <Button icon={Keyboard} variant="secondary"
                  type="button"
                  className="fershot-hotkey-panel__btn"
                  aria-pressed={isRecording}
                  aria-label={
                    isRecording
                      ? `Press shortcut for ${item.label}`
                      : `Record shortcut for ${item.label}`
                  }
                  onClick={() => {
                    setValidationError(null);
                    setRecordingActionId(isRecording ? null : item.actionId);
                  }}
                  onKeyDown={(event) =>
                    handleRecordKeyDown(event, item.actionId)
                  }
                >
                  {isRecording ? "Press keys (Esc to cancel)..." : "Record"}
                </Button>
                {isRecording && (
                  <Button icon={X} variant="secondary"
                    type="button"
                    className="fershot-hotkey-panel__btn"
                    aria-label={`Cancel recording for ${item.label}`}
                    onClick={() => {
                      setRecordingActionId(null);
                      setValidationError(null);
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button icon={Eraser} variant="secondary"
                  type="button"
                  className="fershot-hotkey-panel__btn"
                  aria-label={`Clear shortcut for ${item.label}`}
                  disabled={item.binding === null}
                  onClick={() => {
                    if (item.binding !== null) {
                      setValidationError(null);
                      onClear(item.actionId);
                    }
                  }}
                >
                  Clear
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

