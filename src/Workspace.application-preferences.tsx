import { AppPreferencesPanel, type FerbyAppPreferences } from "./features/app-preferences";
import { supportsNativeOutput } from "./platform/native";

export function ApplicationPreferenceControls({ value, disabled, loginSupported = false, onChange }: {
  value: FerbyAppPreferences; disabled: boolean; loginSupported?: boolean; onChange: (value: FerbyAppPreferences) => void;
}) {
  return <details className="preference-controls"><summary>Application behavior</summary>
    <div className="preference-popover"><AppPreferencesPanel value={value} disabled={disabled}
      capabilities={{ alwaysOnTopSupported: supportsNativeOutput(), notificationsSupported: supportsNativeOutput(), launchAtLoginSupported: loginSupported, menuBarSupported: supportsNativeOutput() }} onChange={onChange} />
      <p>Use Save preferences to retain these choices after restart. Copy/save capture actions keep a recovery image in the session library. Save follows the configured destination or opens a destination dialog.</p>
      <p>Launch at login changes Ferby's own system entry immediately and requires a packaged app. System settings control notification delivery.</p>
    </div>
  </details>;
}
