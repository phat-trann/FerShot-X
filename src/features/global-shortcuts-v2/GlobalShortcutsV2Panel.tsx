import {Button} from "../../components/ui/button";
import React, { useState, useEffect } from "react";
import type { ShortcutBinding } from "../hotkey-panel/HotkeyPanel";
import { formatShortcutBinding } from "../hotkey-panel/HotkeyPanel";
import {
  GLOBAL_ACTIONS_V2,
  ACTION_LABELS_V2,
  type GlobalActionIdV2,
  type GlobalBindingsV2,
} from "./types";
import {
  toNativeGlobalBindingsV2,
} from "./codec";
import "./GlobalShortcutsV2Panel.css";

export interface GlobalShortcutsV2PanelProps {
  readonly value: GlobalBindingsV2;
  readonly disabled: boolean;
  readonly onChange: (next: GlobalBindingsV2) => void;
  readonly onApply: () => void;
  readonly onClear: () => void;
  readonly onSave?: () => void;
  readonly onForget?: () => void;
}

const MODIFIER_ONLY_KEYS = new Set([
  "meta",
  "shift",
  "alt",
  "control",
  "capslock",
]);

export function GlobalShortcutsV2Panel({
  value,
  disabled,
  onChange,
  onApply,
  onClear,
}: GlobalShortcutsV2PanelProps): React.JSX.Element {
  const [recordingAction, setRecordingAction] =
    useState<GlobalActionIdV2 | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keyboard capture for active recording action
  useEffect(() => {
    if (!recordingAction || disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Escape key cancels recording without changing binding
      if (event.key === "Escape") {
        setRecordingAction(null);
        setErrorMessage(null);
        return;
      }

      const lowerKey = event.key.toLowerCase();
      if (MODIFIER_ONLY_KEYS.has(lowerKey)) {
        return; // Don't assign modifier-only keys
      }

      const metaKey = event.metaKey;
      const ctrlKey = event.ctrlKey;
      const altKey = event.altKey;
      const shiftKey = event.shiftKey;

      if (!metaKey && !ctrlKey && !altKey) {
        setErrorMessage(
          "Shortcut must include at least one modifier key (Cmd, Ctrl, or Alt).",
        );
        return;
      }

      const candidateKey = event.key === " " ? " " : event.key.toLowerCase();
      const candidate: ShortcutBinding = {
        key: candidateKey,
        metaKey,
        ctrlKey,
        altKey,
        shiftKey,
      };

      // Test candidate against current bindings
      const nextBindings: Record<GlobalActionIdV2, ShortcutBinding | null> = {
        ...value,
        [recordingAction]: candidate,
      };

      try {
        toNativeGlobalBindingsV2(nextBindings as GlobalBindingsV2);
        setErrorMessage(null);
        setRecordingAction(null);
        onChange(Object.freeze(nextBindings as GlobalBindingsV2));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [recordingAction, disabled, value, onChange]);

  const handleClearAction = (actionId: GlobalActionIdV2) => {
    if (disabled) return;
    const nextBindings = {
      ...value,
      [actionId]: null,
    };
    setErrorMessage(null);
    onChange(Object.freeze(nextBindings as GlobalBindingsV2));
  };

  return (
    <section
      className="fershot-shortcuts-v2-panel"
      aria-label="Global keyboard shortcuts (7 actions)"
      data-testid="global-shortcuts-v2-panel"
    >
      <header className="fershot-shortcuts-v2-panel__header">
        <h3 className="fershot-shortcuts-v2-panel__title">Global Shortcuts</h3>
      </header>

      {errorMessage && (
        <div role="alert" className="fershot-shortcuts-v2-panel__error">
          {errorMessage}
        </div>
      )}

      <div className="fershot-shortcuts-v2-panel__list">
        {GLOBAL_ACTIONS_V2.filter(action => action !== "ocr-capture").map((actionId) => {
          const binding = value[actionId];
          const isRecording = recordingAction === actionId;

          return (
            <div key={actionId} className="fershot-shortcuts-v2-panel__row">
              <span className="fershot-shortcuts-v2-panel__label">
                {ACTION_LABELS_V2[actionId]}
              </span>
              <div className="fershot-shortcuts-v2-panel__binding-controls">
                <Button variant="outline" size="sm"
                  type="button"
                  disabled={disabled}
                  aria-label={
                    isRecording
                      ? `Press keys for ${ACTION_LABELS_V2[actionId]}`
                      : `Record shortcut for ${
                          actionId === "capture-area"
                            ? "Capture area"
                            : ACTION_LABELS_V2[actionId]
                        }`
                  }
                  className={`fershot-shortcuts-v2-panel__btn ${
                    isRecording
                      ? "fershot-shortcuts-v2-panel__btn--recording"
                      : ""
                  }`}
                  onClick={() => {
                    if (isRecording) {
                      setRecordingAction(null);
                    } else {
                      setRecordingAction(actionId);
                      setErrorMessage(null);
                    }
                  }}
                >
                  {isRecording
                    ? "Press Keys (Esc to cancel)..."
                    : formatShortcutBinding(binding)}
                </Button>
                {binding && (
                  <Button variant="outline" size="sm"
                    type="button"
                    disabled={disabled}
                    className="fershot-shortcuts-v2-panel__btn"
                    onClick={() => handleClearAction(actionId)}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="fershot-shortcuts-v2-panel__footer">
        <Button disabled={disabled} onClick={onApply}>Install Shortcuts</Button>
        <Button variant="outline" disabled={disabled} onClick={onClear}>Remove Shortcuts</Button>
      </footer>
    </section>
  );
}
