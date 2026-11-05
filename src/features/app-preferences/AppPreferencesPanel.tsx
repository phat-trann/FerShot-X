import React from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "../../contracts/settings";
import "./AppPreferencesPanel.css";

export const MIN_DEFAULT_ZOOM_PERCENT = 25;
export const MAX_DEFAULT_ZOOM_PERCENT = 400;

export type PostCaptureBehavior =
  | "open-editor"
  | "show-preview"
  | "copy-only"
  | "save-only";

export interface FerbyAppPreferences {
  readonly postCaptureBehavior: PostCaptureBehavior;
  readonly defaultZoomPercent: number;
  readonly keepEditorAlwaysOnTop: boolean;
  readonly showSystemNotifications: boolean;
  readonly launchAtLogin: boolean;
  readonly showInMenuBar: boolean;
  readonly baseSettings: Readonly<AppSettings>;
}

export interface FerbyPreferenceCapabilities {
  readonly alwaysOnTopSupported: boolean;
  readonly notificationsSupported: boolean;
  readonly launchAtLoginSupported: boolean;
  readonly menuBarSupported: boolean;
}

export const DEFAULT_APP_PREFERENCES: Readonly<FerbyAppPreferences> =
  Object.freeze({
    postCaptureBehavior: "open-editor",
    defaultZoomPercent: 100,
    keepEditorAlwaysOnTop: false,
    showSystemNotifications: true,
    launchAtLogin: false,
    showInMenuBar: true,
    baseSettings: Object.freeze({ ...DEFAULT_SETTINGS }),
  });

export const DEFAULT_PREFERENCE_CAPABILITIES: Readonly<FerbyPreferenceCapabilities> =
  Object.freeze({
    alwaysOnTopSupported: true,
    notificationsSupported: true,
    launchAtLoginSupported: false,
    menuBarSupported: false,
  });

export interface AppPreferencesPanelProps {
  readonly value: Readonly<FerbyAppPreferences>;
  readonly capabilities?: Readonly<FerbyPreferenceCapabilities>;
  readonly disabled?: boolean;
  readonly onChange: (next: FerbyAppPreferences) => void;
}

export function clampDefaultZoomPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_APP_PREFERENCES.defaultZoomPercent;
  }
  const rounded = Math.round(value);
  return Math.min(
    MAX_DEFAULT_ZOOM_PERCENT,
    Math.max(MIN_DEFAULT_ZOOM_PERCENT, rounded),
  );
}

function cloneFrozenPreferences(
  base: Readonly<FerbyAppPreferences>,
  patch: Partial<FerbyAppPreferences>,
): FerbyAppPreferences {
  const mergedBaseSettings = patch.baseSettings ?? base.baseSettings;
  return Object.freeze({
    ...base,
    ...patch,
    baseSettings: Object.freeze({ ...mergedBaseSettings }),
  });
}

export const AppPreferencesPanel: React.FC<AppPreferencesPanelProps> = ({
  value,
  capabilities = DEFAULT_PREFERENCE_CAPABILITIES,
  disabled = false,
  onChange,
}) => {
  const emitPatch = (patch: Partial<FerbyAppPreferences>) => {
    if (disabled) return;
    onChange(cloneFrozenPreferences(value, patch));
  };

  return (
    <section
      className="ferby-app-preferences"
      aria-label="Application preferences"
    >
      <h3 className="ferby-app-preferences__title">Application Preferences</h3>

      <div className="ferby-app-preferences__field">
        <label htmlFor="ferby-pref-post-capture">After capture</label>
        <select
          id="ferby-pref-post-capture"
          disabled={disabled}
          value={value.postCaptureBehavior}
          onChange={(e) =>
            emitPatch({
              postCaptureBehavior: e.target.value as PostCaptureBehavior,
            })
          }
        >
          <option value="open-editor">Open in editor</option>
          <option value="show-preview">Show floating preview</option>
          <option value="copy-only">Copy to clipboard only</option>
          <option value="save-only">Save to disk only</option>
        </select>
      </div>

      <div className="ferby-app-preferences__field">
        <label htmlFor="ferby-pref-default-zoom">Default zoom (%)</label>
        <input
          id="ferby-pref-default-zoom"
          type="number"
          min={MIN_DEFAULT_ZOOM_PERCENT}
          max={MAX_DEFAULT_ZOOM_PERCENT}
          step={25}
          disabled={disabled}
          value={value.defaultZoomPercent}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            emitPatch({
              defaultZoomPercent: clampDefaultZoomPercent(parsed),
            });
          }}
        />
      </div>

      <div className="ferby-app-preferences__toggles">
        <label className="ferby-app-preferences__checkbox">
          <input
            type="checkbox"
            checked={value.keepEditorAlwaysOnTop}
            disabled={disabled || !capabilities.alwaysOnTopSupported}
            onChange={(e) => {
              if (!capabilities.alwaysOnTopSupported) return;
              emitPatch({ keepEditorAlwaysOnTop: e.target.checked });
            }}
          />
          <span>Keep editor window on top</span>
          {!capabilities.alwaysOnTopSupported && (
            <small className="ferby-app-preferences__unsupported">
              (Unsupported by current backend)
            </small>
          )}
        </label>

        <label className="ferby-app-preferences__checkbox">
          <input
            type="checkbox"
            checked={value.showSystemNotifications}
            disabled={disabled || !capabilities.notificationsSupported}
            onChange={(e) => {
              if (!capabilities.notificationsSupported) return;
              emitPatch({ showSystemNotifications: e.target.checked });
            }}
          />
          <span>Show capture notifications</span>
          {!capabilities.notificationsSupported && (
            <small className="ferby-app-preferences__unsupported">
              (Unsupported by current backend)
            </small>
          )}
        </label>

        <label className="ferby-app-preferences__checkbox">
          <input
            type="checkbox"
            checked={value.launchAtLogin}
            disabled={disabled || !capabilities.launchAtLoginSupported}
            onChange={(e) => {
              if (!capabilities.launchAtLoginSupported) return;
              emitPatch({ launchAtLogin: e.target.checked });
            }}
          />
          <span>Launch Ferby at login</span>
          {!capabilities.launchAtLoginSupported && (
            <small className="ferby-app-preferences__unsupported">
              (Unsupported by current backend)
            </small>
          )}
        </label>

        <label className="ferby-app-preferences__checkbox">
          <input
            type="checkbox"
            checked={value.showInMenuBar}
            disabled={disabled || !capabilities.menuBarSupported}
            onChange={(e) => {
              if (!capabilities.menuBarSupported) return;
              emitPatch({ showInMenuBar: e.target.checked });
            }}
          />
          <span>Show Ferby icon in menu bar</span>
          {!capabilities.menuBarSupported && (
            <small className="ferby-app-preferences__unsupported">
              (Unsupported by current backend)
            </small>
          )}
        </label>
      </div>
    </section>
  );
};

