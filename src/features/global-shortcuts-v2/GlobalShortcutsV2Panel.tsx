import { CircleX, LoaderCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useEffect, useState } from "react";
import type { ShortcutBinding } from "../hotkey-panel/HotkeyPanel";
import { type GlobalActionIdV2, type GlobalBindingsV2 } from "./types";
import { toNativeGlobalBindingsV2 } from "./codec";
import "./GlobalShortcutsV2Panel.css";

export const SHORTCUT_ROWS = [
  ["capture-fullscreen", "Fullscreen screenshot"],
  ["capture-area", "Area screenshot"],
  ["capture-repeat-region", "Repeat area screenshot"],
  ["capture-window", "Any window screenshot"],
  ["capture-active-window", "Active window screenshot"],
  ["capture-scrolling", "Scrolling screenshot"],
  ["show-workspace", "Show FerShot X"],
] as const;

export interface GlobalShortcutsV2PanelProps {
  readonly value: GlobalBindingsV2;
  readonly disabled: boolean;
  readonly savingAction?: GlobalActionIdV2 | null;
  readonly onChange: (next: GlobalBindingsV2, action: GlobalActionIdV2) => void;
}

const MODIFIER_KEYS = new Set(["meta", "shift", "alt", "control", "capslock"]);
const KEY_GLYPHS: Readonly<Record<string, string>> = {" ": "Space", space: "Space", arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→", enter: "↩", tab: "⇥", backspace: "⌫", delete: "⌦", home: "↖", end: "↘", pageup: "⇞", pagedown: "⇟"};
export function formatGlobalShortcut(binding: ShortcutBinding | null): string {
  if (!binding) return "Record Shortcut";
  const key = KEY_GLYPHS[binding.key.toLowerCase()] ?? binding.key.toUpperCase();
  return `${binding.ctrlKey ? "⌃" : ""}${binding.altKey ? "⌥" : ""}${binding.shiftKey ? "⇧" : ""}${binding.metaKey ? "⌘" : ""}${key}`;
}
function physicalKey(event: KeyboardEvent): string {
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(event.code)) return event.code.slice(5);
  return event.code === "Space" ? " " : event.key.toLowerCase();
}

export function GlobalShortcutsV2Panel({value, disabled, savingAction, onChange}: GlobalShortcutsV2PanelProps) {
  const [recording, setRecording] = useState<GlobalActionIdV2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (disabled) setRecording(null); }, [disabled]);
  useEffect(() => {
    if (!recording || disabled) return;
    const cancel = () => { setRecording(null); setError(null); };
    const visibility = () => { if (document.hidden) cancel(); };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Tab" && !event.metaKey && !event.ctrlKey && !event.altKey) { cancel(); return; }
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.isComposing || event.repeat) return;
      if (event.key === "Escape") { cancel(); return; }
      if (MODIFIER_KEYS.has(event.key.toLowerCase())) return;
      if (!event.metaKey && !event.ctrlKey && !event.altKey) { setError("Include Command, Control or Option."); return; }
      const candidate: ShortcutBinding = {key: physicalKey(event), metaKey: event.metaKey, ctrlKey: event.ctrlKey, altKey: event.altKey, shiftKey: event.shiftKey};
      const next = Object.freeze({...value, [recording]: candidate});
      try { toNativeGlobalBindingsV2(next); }
      catch (reason) {
        const message = reason instanceof Error ? reason.message.toLowerCase() : "";
        setError(/duplicate|conflict/.test(message) ? "Shortcut already assigned. Choose another." : /reserved|collides/.test(message) ? "This shortcut is reserved by macOS." : "Use a letter, number, function key or navigation key.");
        return;
      }
      setRecording(null); setError(null); onChange(next, recording);
    };
    window.addEventListener("keydown", keydown, {capture: true});
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("keydown", keydown, {capture: true}); window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", visibility); };
  }, [recording, disabled, value, onChange]);
  return <section className="fershot-shortcuts-v2-panel" aria-label="Global keyboard shortcuts (7 actions)" data-testid="global-shortcuts-v2-panel">
    <div className="fershot-shortcuts-v2-panel__list">
      {SHORTCUT_ROWS.map(([action, label]) => {
        const binding = value[action], active = recording === action, saving = savingAction === action;
        return <div key={action} className="fershot-shortcuts-v2-panel__row" data-action={action}>
          <span className="fershot-shortcuts-v2-panel__label" id={`shortcut-label-${action}`}>{label}</span>
          <div className="shortcut-recorder" data-recording={active || undefined} data-bound={!!binding} aria-busy={saving}>
            <Button variant="plain" type="button" className="shortcut-recorder__record" disabled={disabled} aria-label={`${active ? "Press keys" : "Record shortcut"} for ${label}`} aria-pressed={active} onClick={() => {setRecording(active ? null : action); setError(null);}}>
              {saving ? <LoaderCircle className="shortcut-recorder__spinner" size={14} aria-hidden="true"/> : null}
              <span>{saving ? "Saving…" : active ? "Press Shortcut…" : formatGlobalShortcut(binding)}</span>
            </Button>
            {binding && !active && !saving && <Button icon={CircleX} variant="plain" size="icon" type="button" className="shortcut-recorder__clear" aria-label={`Clear shortcut for ${label}`} disabled={disabled} onClick={() => {setRecording(null); setError(null); onChange(Object.freeze({...value, [action]: null}), action);}}/>}
          </div>
        </div>;
      })}
    </div>
    {error && <p role="alert" className="fershot-shortcuts-v2-panel__error">{error}</p>}
  </section>;
}
