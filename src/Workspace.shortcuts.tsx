import { useEffect, useRef, useState } from "react";
import { GlobalShortcutsV2Panel } from "./features/global-shortcuts-v2";
import {
  applyShortcuts,
  emptyHotkeys,
  HOTKEY_ACTIONS,
  readShortcuts,
  readSavedShortcuts,
  saveShortcuts,
  type HotkeyDraft,
} from "./platform/shortcuts";
import { supportsNativeOutput } from "./platform/native";

export function WorkspaceShortcuts({ blocked }: { blocked: boolean }) {
  const [draft, setDraft] = useState<HotkeyDraft>(emptyHotkeys);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    if (!supportsNativeOutput()) {
      setError("Open the desktop app to configure global shortcuts.");
      return () => {
        mounted.current = false;
      };
    }
    void readShortcuts()
      .then(async (value) => {
        let saved: HotkeyDraft | null = null;
        try {
          saved = (await readSavedShortcuts()).draft;
        } catch {
          if (active)
            setError(
              "Saved shortcuts could not be read. Active shortcuts remain available; Save assignments can replace an invalid preference file.",
            );
        }
        if (active) {
          const hasActive = HOTKEY_ACTIONS.some(
            (action) => value.draft[action] !== null,
          );
          setDraft(
            hasActive || value.faulted ? value.draft : saved ?? value.draft,
          );
          setLoaded(true);
          if (value.faulted)
            setError(
              "Shortcut cleanup is required. Use Clear all shortcuts before retrying.",
            );
          else if (
            !hasActive &&
            saved &&
            HOTKEY_ACTIONS.some((action) => saved[action] !== null)
          )
            setStatus(
              "Saved assignments loaded. Use Apply to register them for this session.",
            );
        }
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Shortcut state unavailable.",
          );
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);

  async function apply(next: HotkeyDraft) {
    if (pending.current || blocked || !loaded) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const value = await applyShortcuts(next);
      if (mounted.current) {
        setDraft(value.draft);
        setStatus("Global shortcuts applied for this session.");
      }
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Shortcut registration failed.",
        );
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function saveAssignments(forget = false) {
    if (pending.current || blocked || !loaded) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await saveShortcuts(forget ? emptyHotkeys() : draft);
      if (mounted.current)
        setStatus(
          forget
            ? "Saved assignments removed. Active session shortcuts are unchanged."
            : "Assignments saved for next launch. Use Apply to activate this draft.",
        );
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to save shortcuts.",
        );
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <section aria-label="Global capture shortcuts">
      <h2>Global capture shortcuts</h2>
      <fieldset disabled={blocked || busy || !loaded}>
        <legend>Shortcut assignments</legend>
        <GlobalShortcutsV2Panel
          value={draft}
          disabled={blocked || busy || !loaded}
          onChange={setDraft}
          onApply={() => {
            void apply(draft);
          }}
          onClear={() => {
            void apply(emptyHotkeys());
          }}
          onSave={() => {
            void saveAssignments();
          }}
          onForget={() => {
            void saveAssignments(true);
          }}
        />
      </fieldset>
      <p>
        No default shortcuts are registered. Save retains assignments after
        restart; Apply registers them for this session. Clear removes active
        registrations; Forget removes saved assignments. Active registrations
        are cleared when the main workspace closes. Letters, digits, F1–F24 and
        common navigation keys are supported. Conflicting or reserved shortcuts
        are rejected.
      </p>
      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
