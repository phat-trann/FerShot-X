import React, { useEffect, useRef, useState } from "react";
import type { ImageDocument } from "../../contracts/media";
import type { AppSettings } from "../../contracts/settings";
import {
  AppPreferencesPanel,
  DEFAULT_APP_PREFERENCES,
  DEFAULT_PREFERENCE_CAPABILITIES,
  type FerbyAppPreferences,
  type FerbyPreferenceCapabilities,
} from "../app-preferences";
import {
  ExportPanel,
  type ExportFeedbackState,
  type ExportRequestPayload,
} from "../export-panel";
import {
  HotkeyPanel,
  bindingsEqual,
  type GlobalActionId,
  type HotkeyItem,
  type ShortcutBinding,
} from "../hotkey-panel";
import { SettingsPanel } from "../settings/SettingsPanel";
import "./PreferencesWorkspace.css";

/**
 * Documented incompatible / unresolved preference boundaries (`A37`):
 * - Frozen `src/contracts/settings.ts` (`AppSettings`) only defines `saveFormat`, `jpegQuality`,
 *   `downscaleRetina`, and `showPreview`. Extended preferences (`FerbyAppPreferences`), global
 *   shortcut bindings (`HotkeyItem[]`), and forward-compatible `unknownFields` are carried in the
 *   composed `PreferencesWorkspaceSnapshot` view-model without altering `AppSettings` or inferring
 *   new defaults from Shottr.
 * - Any unrecognized or incompatible raw record fields passed into `fromRawPreferenceRecord` are
 *   preserved verbatim in `unknownFields` and emitted untouched on save rather than coerced.
 */
export const PREFERENCES_WORKSPACE_INCOMPATIBLE_FIELD_NOTES = Object.freeze({
  frozenRootSettingsContract: "src/contracts/settings.ts#AppSettings",
  preservedAdapterEnvelope: "PreferencesWorkspaceSnapshot",
  coercionPolicy: "never_coerce_incompatible_or_unknown_fields" as const,
  shottrDefaultInferenceForbidden: true,
});

export const PREFERENCES_WORKSPACE_INTEGRATION_EXAMPLE = `
// Proposed Codex C11/C13/C15 integration:
// <PreferencesWorkspace
//   initialSnapshot={loadedWorkspaceSnapshot}
//   capabilities={runtimeCapabilities}
//   hotkeyPermissionState={shortcutPermissionState}
//   onSave={async (next) => await saveWorkspaceSnapshot(next)}
// />
`.trim();

export const DEFAULT_HOTKEY_ITEMS: readonly HotkeyItem[] = Object.freeze([
  Object.freeze({
    actionId: "capture-fullscreen",
    label: "Capture Fullscreen",
    binding: null,
  }),
  Object.freeze({
    actionId: "capture-area",
    label: "Capture Area",
    binding: null,
  }),
  Object.freeze({
    actionId: "capture-window",
    label: "Capture Window",
    binding: null,
  }),
  Object.freeze({
    actionId: "capture-scrolling",
    label: "Scrolling Capture",
    binding: null,
  }),
  Object.freeze({
    actionId: "ocr-capture",
    label: "OCR Text Capture",
    binding: null,
  }),
]);

export interface PreferencesWorkspaceSnapshot {
  readonly appPreferences: Readonly<FerbyAppPreferences>;
  readonly hotkeys: readonly HotkeyItem[];
  readonly suggestedExportBasename?: string;
  readonly unknownFields: Readonly<Record<string, unknown>>;
}

export const DEFAULT_PREFERENCES_WORKSPACE_SNAPSHOT: Readonly<PreferencesWorkspaceSnapshot> =
  Object.freeze({
    appPreferences: DEFAULT_APP_PREFERENCES,
    hotkeys: DEFAULT_HOTKEY_ITEMS,
    suggestedExportBasename: "ferby-capture",
    unknownFields: Object.freeze({}),
  });

const KNOWN_TOP_LEVEL_KEYS = new Set([
  "appPreferences",
  "hotkeys",
  "suggestedExportBasename",
  "unknownFields",
]);

function cloneSnapshot(
  snapshot: Readonly<PreferencesWorkspaceSnapshot>,
): Readonly<PreferencesWorkspaceSnapshot> {
  return Object.freeze({
    appPreferences: Object.freeze({
      ...snapshot.appPreferences,
      baseSettings: Object.freeze({
        ...snapshot.appPreferences.baseSettings,
      }),
    }),
    hotkeys: Object.freeze(
      snapshot.hotkeys.map((item) =>
        Object.freeze({
          actionId: item.actionId,
          label: item.label,
          binding: item.binding ? Object.freeze({ ...item.binding }) : null,
        }),
      ),
    ),
    suggestedExportBasename: snapshot.suggestedExportBasename,
    unknownFields: Object.freeze({ ...snapshot.unknownFields }),
  });
}

export function fromRawPreferenceRecord(
  raw: Readonly<Record<string, unknown>>,
  fallback: Readonly<PreferencesWorkspaceSnapshot> = DEFAULT_PREFERENCES_WORKSPACE_SNAPSHOT,
): Readonly<PreferencesWorkspaceSnapshot> {
  const extraUnknown: Record<string, unknown> = {
    ...(fallback.unknownFields ?? {}),
  };

  if (
    raw.unknownFields &&
    typeof raw.unknownFields === "object" &&
    !Array.isArray(raw.unknownFields)
  ) {
    Object.assign(extraUnknown, raw.unknownFields as Record<string, unknown>);
  }

  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
      extraUnknown[key] = value;
    }
  }

  const appPreferences =
    raw.appPreferences &&
    typeof raw.appPreferences === "object" &&
    !Array.isArray(raw.appPreferences)
      ? (raw.appPreferences as FerbyAppPreferences)
      : fallback.appPreferences;

  const hotkeys = Array.isArray(raw.hotkeys)
    ? (raw.hotkeys as readonly HotkeyItem[])
    : fallback.hotkeys;

  const suggestedExportBasename =
    typeof raw.suggestedExportBasename === "string"
      ? raw.suggestedExportBasename
      : fallback.suggestedExportBasename;

  return cloneSnapshot({
    appPreferences,
    hotkeys,
    suggestedExportBasename,
    unknownFields: Object.freeze(extraUnknown),
  });
}

export function toRawPreferenceRecord(
  snapshot: Readonly<PreferencesWorkspaceSnapshot>,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    ...snapshot.unknownFields,
    appPreferences: snapshot.appPreferences,
    hotkeys: snapshot.hotkeys,
    suggestedExportBasename: snapshot.suggestedExportBasename,
    unknownFields: Object.freeze({ ...snapshot.unknownFields }),
  });
}

export function applyGuardedPreferencePatch(
  current: Readonly<PreferencesWorkspaceSnapshot>,
  nextPreferences: Readonly<FerbyAppPreferences>,
  capabilities: Readonly<FerbyPreferenceCapabilities>,
): Readonly<PreferencesWorkspaceSnapshot> {
  const prevPrefs = current.appPreferences;
  const guardedPrefs: FerbyAppPreferences = Object.freeze({
    postCaptureBehavior: nextPreferences.postCaptureBehavior,
    defaultZoomPercent: nextPreferences.defaultZoomPercent,
    // Preserve existing capability-disabled fields untouched
    keepEditorAlwaysOnTop: capabilities.alwaysOnTopSupported
      ? nextPreferences.keepEditorAlwaysOnTop
      : prevPrefs.keepEditorAlwaysOnTop,
    showSystemNotifications: capabilities.notificationsSupported
      ? nextPreferences.showSystemNotifications
      : prevPrefs.showSystemNotifications,
    launchAtLogin: capabilities.launchAtLoginSupported
      ? nextPreferences.launchAtLogin
      : prevPrefs.launchAtLogin,
    showInMenuBar: capabilities.menuBarSupported
      ? nextPreferences.showInMenuBar
      : prevPrefs.showInMenuBar,
    baseSettings: Object.freeze({ ...nextPreferences.baseSettings }),
  });

  return cloneSnapshot({
    ...current,
    appPreferences: guardedPrefs,
  });
}

export function snapshotsEqual(
  a: Readonly<PreferencesWorkspaceSnapshot>,
  b: Readonly<PreferencesWorkspaceSnapshot>,
): boolean {
  const prefA = a.appPreferences;
  const prefB = b.appPreferences;
  if (
    prefA.postCaptureBehavior !== prefB.postCaptureBehavior ||
    prefA.defaultZoomPercent !== prefB.defaultZoomPercent ||
    prefA.keepEditorAlwaysOnTop !== prefB.keepEditorAlwaysOnTop ||
    prefA.showSystemNotifications !== prefB.showSystemNotifications ||
    prefA.launchAtLogin !== prefB.launchAtLogin ||
    prefA.showInMenuBar !== prefB.showInMenuBar ||
    prefA.baseSettings.saveFormat !== prefB.baseSettings.saveFormat ||
    prefA.baseSettings.jpegQuality !== prefB.baseSettings.jpegQuality ||
    prefA.baseSettings.downscaleRetina !== prefB.baseSettings.downscaleRetina ||
    prefA.baseSettings.showPreview !== prefB.baseSettings.showPreview ||
    a.suggestedExportBasename !== b.suggestedExportBasename
  ) {
    return false;
  }

  if (a.hotkeys.length !== b.hotkeys.length) {
    return false;
  }
  for (let i = 0; i < a.hotkeys.length; i += 1) {
    const itemA = a.hotkeys[i];
    const itemB = b.hotkeys[i];
    if (
      itemA.actionId !== itemB.actionId ||
      itemA.label !== itemB.label ||
      !bindingsEqual(itemA.binding, itemB.binding)
    ) {
      return false;
    }
  }

  const keysA = Object.keys(a.unknownFields);
  const keysB = Object.keys(b.unknownFields);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (const key of keysA) {
    if (!Object.is(a.unknownFields[key], b.unknownFields[key])) {
      return false;
    }
  }
  return true;
}

export function listUnsupportedPreferenceReasons(
  capabilities: Readonly<FerbyPreferenceCapabilities>,
  hotkeyPermissionState: "granted" | "missing" | "unknown",
): readonly string[] {
  const reasons: string[] = [];
  if (!capabilities.alwaysOnTopSupported) {
    reasons.push("Always-on-top window level is unsupported by current backend.");
  }
  if (!capabilities.notificationsSupported) {
    reasons.push("System notifications are unsupported by current backend.");
  }
  if (!capabilities.launchAtLoginSupported) {
    reasons.push("Launch at login is unsupported by current backend.");
  }
  if (!capabilities.menuBarSupported) {
    reasons.push("Menu bar icon integration is unsupported by current backend.");
  }
  if (hotkeyPermissionState === "missing") {
    reasons.push(
      "Global shortcut OS permission is missing; bindings are saved locally until granted.",
    );
  }
  return Object.freeze(reasons);
}

export interface PreferencesWorkspaceProps {
  readonly initialSnapshot?: Readonly<PreferencesWorkspaceSnapshot>;
  readonly externalSnapshot?: Readonly<PreferencesWorkspaceSnapshot>;
  readonly capabilities?: Readonly<FerbyPreferenceCapabilities>;
  readonly hotkeyPermissionState?: "granted" | "missing" | "unknown";
  readonly previewDocument?: ImageDocument | null;
  readonly exportBusy?: boolean;
  readonly exportStatus?: ExportFeedbackState;
  readonly onSave?: (
    snapshot: Readonly<PreferencesWorkspaceSnapshot>,
  ) => Promise<void>;
  readonly onExport?: (payload: ExportRequestPayload) => void;
}

export const PreferencesWorkspace: React.FC<PreferencesWorkspaceProps> = ({
  initialSnapshot = DEFAULT_PREFERENCES_WORKSPACE_SNAPSHOT,
  externalSnapshot,
  capabilities = DEFAULT_PREFERENCE_CAPABILITIES,
  hotkeyPermissionState = "granted",
  previewDocument = null,
  exportBusy = false,
  exportStatus = "idle",
  onSave,
  onExport,
}) => {
  const [baseline, setBaseline] = useState<
    Readonly<PreferencesWorkspaceSnapshot>
  >(() => cloneSnapshot(initialSnapshot));
  const [draft, setDraft] = useState<Readonly<PreferencesWorkspaceSnapshot>>(
    () => cloneSnapshot(initialSnapshot),
  );
  const [conflictSnapshot, setConflictSnapshot] =
    useState<Readonly<PreferencesWorkspaceSnapshot> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingLockRef = useRef(false);

  const isDirty = !snapshotsEqual(draft, baseline);

  useEffect(() => {
    if (!externalSnapshot) {
      return;
    }
    if (snapshotsEqual(externalSnapshot, baseline)) {
      return;
    }
    if (!snapshotsEqual(draft, baseline)) {
      setConflictSnapshot(cloneSnapshot(externalSnapshot));
    } else {
      const next = cloneSnapshot(externalSnapshot);
      setBaseline(next);
      setDraft(next);
      setConflictSnapshot(null);
    }
  }, [externalSnapshot, baseline, draft]);

  const handleBaseSettingsChange = (nextBase: AppSettings) => {
    setDraft((prev) =>
      cloneSnapshot({
        ...prev,
        appPreferences: Object.freeze({
          ...prev.appPreferences,
          baseSettings: Object.freeze({ ...nextBase }),
        }),
      }),
    );
  };

  const handleAppPreferencesChange = (nextPrefs: FerbyAppPreferences) => {
    setDraft((prev) =>
      applyGuardedPreferencePatch(prev, nextPrefs, capabilities),
    );
  };

  const handleAssignHotkey = (
    actionId: GlobalActionId,
    binding: ShortcutBinding,
  ) => {
    setDraft((prev) =>
      cloneSnapshot({
        ...prev,
        hotkeys: prev.hotkeys.map((item) =>
          item.actionId === actionId ? { ...item, binding } : item,
        ),
      }),
    );
  };

  const handleClearHotkey = (actionId: GlobalActionId) => {
    setDraft((prev) =>
      cloneSnapshot({
        ...prev,
        hotkeys: prev.hotkeys.map((item) =>
          item.actionId === actionId ? { ...item, binding: null } : item,
        ),
      }),
    );
  };

  const handleSave = async () => {
    if (savingLockRef.current || !onSave) {
      return;
    }
    savingLockRef.current = true;
    setSaving(true);
    setSaveError(null);
    const candidate = cloneSnapshot(draft);

    try {
      await onSave(candidate);
      setBaseline(candidate);
      setConflictSnapshot(null);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save preferences.",
      );
    } finally {
      savingLockRef.current = false;
      setSaving(false);
    }
  };

  const unsupportedReasons = listUnsupportedPreferenceReasons(
    capabilities,
    hotkeyPermissionState,
  );

  return (
    <div
      className="ferby-preferences-workspace"
      aria-label="Capabilities-aware preferences workspace"
    >
      <header className="ferby-preferences-workspace__header">
        <h2 className="ferby-preferences-workspace__title">
          Preferences Workspace
        </h2>
        <span
          className="ferby-preferences-workspace__badge"
          aria-label="Workspace dirty state"
        >
          {isDirty ? "Unsaved changes" : "Saved"}
        </span>
      </header>

      {unsupportedReasons.length > 0 && (
        <section
          className="ferby-preferences-workspace__banner ferby-preferences-workspace__banner--info"
          aria-label="Capability explanations"
        >
          <strong>Capability notes:</strong>
          <ul>
            {unsupportedReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>
      )}

      {conflictSnapshot && (
        <div
          role="alert"
          className="ferby-preferences-workspace__banner ferby-preferences-workspace__banner--conflict"
        >
          <span>
            External preferences changed on disk while you have unsaved edits.
          </span>
          <div className="ferby-preferences-workspace__actions">
            <button
              type="button"
              onClick={() => {
                setBaseline(conflictSnapshot);
                setConflictSnapshot(null);
              }}
            >
              Keep Local Edits
            </button>
            <button
              type="button"
              onClick={() => {
                setBaseline(conflictSnapshot);
                setDraft(conflictSnapshot);
                setConflictSnapshot(null);
                setSaveError(null);
              }}
            >
              Accept External Reload
            </button>
          </div>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="ferby-preferences-workspace__banner ferby-preferences-workspace__banner--error"
        >
          <span>Save failed: {saveError}</span>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              void handleSave();
            }}
          >
            Retry Save
          </button>
        </div>
      )}

      <SettingsPanel
        value={draft.appPreferences.baseSettings}
        onChange={handleBaseSettingsChange}
      />

      <AppPreferencesPanel
        value={draft.appPreferences}
        capabilities={capabilities}
        disabled={saving}
        onChange={handleAppPreferencesChange}
      />

      <HotkeyPanel
        items={draft.hotkeys}
        permissionState={hotkeyPermissionState}
        onAssign={handleAssignHotkey}
        onClear={handleClearHotkey}
      />

      <ExportPanel
        document={previewDocument}
        settings={draft.appPreferences.baseSettings}
        suggestedBasename={draft.suggestedExportBasename}
        busy={exportBusy}
        status={exportStatus}
        onSettingsChange={handleBaseSettingsChange}
        onExport={(payload) => onExport?.(payload)}
      />

      <footer className="ferby-preferences-workspace__actions">
        <button
          type="button"
          disabled={!isDirty || saving}
          onClick={() => {
            void handleSave();
          }}
        >
          {saving ? "Saving Preferences..." : "Save Preferences"}
        </button>
        <button
          type="button"
          disabled={!isDirty || saving}
          onClick={() => {
            setDraft(baseline);
            setSaveError(null);
          }}
        >
          Discard Unsaved Changes
        </button>
      </footer>
    </div>
  );
};

