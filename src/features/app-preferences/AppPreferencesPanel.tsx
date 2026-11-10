import React from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "../../contracts/settings";
import "./AppPreferencesPanel.css";
import { NativeSelect } from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";

export const MIN_DEFAULT_ZOOM_PERCENT = 25;
export const MAX_DEFAULT_ZOOM_PERCENT = 400;

export type PostCaptureBehavior =
  | "open-editor"
  | "show-preview"
  | "copy-only"
  | "save-only";

export interface FerShotAppPreferences {
  readonly postCaptureBehavior: PostCaptureBehavior;
  readonly defaultZoomPercent: number;
  readonly keepEditorAlwaysOnTop: boolean;
  readonly showSystemNotifications: boolean;
  readonly launchAtLogin: boolean;
  readonly showInMenuBar: boolean;
  readonly baseSettings: Readonly<AppSettings>;
}

export interface FerShotPreferenceCapabilities {
  readonly alwaysOnTopSupported: boolean;
  readonly notificationsSupported: boolean;
  readonly launchAtLoginSupported: boolean;
  readonly menuBarSupported: boolean;
}

export const DEFAULT_APP_PREFERENCES: Readonly<FerShotAppPreferences> =
  Object.freeze({
    postCaptureBehavior: "open-editor",
    defaultZoomPercent: 100,
    keepEditorAlwaysOnTop: false,
    showSystemNotifications: true,
    launchAtLogin: false,
    showInMenuBar: true,
    baseSettings: Object.freeze({ ...DEFAULT_SETTINGS }),
  });

export const DEFAULT_PREFERENCE_CAPABILITIES: Readonly<FerShotPreferenceCapabilities> =
  Object.freeze({
    alwaysOnTopSupported: true,
    notificationsSupported: true,
    launchAtLoginSupported: false,
    menuBarSupported: false,
  });

export interface AppPreferencesPanelProps {
  readonly value: Readonly<FerShotAppPreferences>;
  readonly capabilities?: Readonly<FerShotPreferenceCapabilities>;
  readonly disabled?: boolean;
  readonly editorAfterCapture?: boolean;
  readonly onChange: (next: FerShotAppPreferences) => void;
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
  base: Readonly<FerShotAppPreferences>,
  patch: Partial<FerShotAppPreferences>,
): FerShotAppPreferences {
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
  editorAfterCapture = false,
  onChange,
}) => {
  const emitPatch = (patch: Partial<FerShotAppPreferences>) => {
    if (disabled) return;
    onChange(cloneFrozenPreferences(value, patch));
  };

  return (
    <section
      className="fershot-app-preferences"
      aria-label="Application preferences"
    >
      <h3 className="fershot-app-preferences__title">Application Preferences</h3>

      {!editorAfterCapture && <div className="fershot-app-preferences__field">
        <label htmlFor="fershot-pref-post-capture">After capture</label>
        <NativeSelect
          id="fershot-pref-post-capture"
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
        </NativeSelect>
      </div>}
      {editorAfterCapture && <p>Captures open in the editor. Press ⌘S when ready to upload.</p>}

      <div className="fershot-app-preferences__field">
        <label htmlFor="fershot-pref-default-zoom">Default zoom (%)</label>
        <Input
          id="fershot-pref-default-zoom"
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

      <div className="fershot-app-preferences__toggles">
        <label className="fershot-app-preferences__checkbox">
          <Switch
            
            checked={value.keepEditorAlwaysOnTop}
            disabled={disabled || !capabilities.alwaysOnTopSupported}
            onCheckedChange={checked => {
              if (!capabilities.alwaysOnTopSupported) return;
              emitPatch({ keepEditorAlwaysOnTop: checked });
            }}
          />
          <span>Keep editor window on top</span>
          {!capabilities.alwaysOnTopSupported && (
            <small className="fershot-app-preferences__unsupported">
              (Unsupported by current backend)
            </small>
          )}
        </label>

        <label className="fershot-app-preferences__checkbox">
          <Switch
            
            checked={value.showSystemNotifications}
            disabled={disabled || !capabilities.notificationsSupported}
            onCheckedChange={checked => {
              if (!capabilities.notificationsSupported) return;
              emitPatch({ showSystemNotifications: checked });
            }}
          />
          <span>Show capture notifications</span>
          {!capabilities.notificationsSupported && (
            <small className="fershot-app-preferences__unsupported">
              (Unsupported by current backend)
            </small>
          )}
        </label>

        <label className="fershot-app-preferences__checkbox">
          <Switch
            
            checked={value.launchAtLogin}
            disabled={disabled || !capabilities.launchAtLoginSupported}
            onCheckedChange={checked => {
              if (!capabilities.launchAtLoginSupported) return;
              emitPatch({ launchAtLogin: checked });
            }}
          />
          <span>Launch FerShot X at login</span>
          {!capabilities.launchAtLoginSupported && (
            <small className="fershot-app-preferences__unsupported">
              (Unsupported by current backend)
            </small>
          )}
        </label>

        <label className="fershot-app-preferences__checkbox">
          <Switch
            
            checked={value.showInMenuBar}
            disabled={disabled || !capabilities.menuBarSupported}
            onCheckedChange={checked => {
              if (!capabilities.menuBarSupported) return;
              emitPatch({ showInMenuBar: checked });
            }}
          />
          <span>Show FerShot X icon in menu bar</span>
          {!capabilities.menuBarSupported && (
            <small className="fershot-app-preferences__unsupported">
              (Unsupported by current backend)
            </small>
          )}
        </label>
      </div>
    </section>
  );
};

