import { AppPreferencesPanel, type FerShotAppPreferences } from "./features/app-preferences";
import { supportsNativeOutput } from "./platform/native";

export function ApplicationPreferenceControls({ value, disabled, loginSupported = false, onChange }: {
  value: FerShotAppPreferences; disabled: boolean; loginSupported?: boolean; onChange: (value: FerShotAppPreferences) => void;
}) {
  return <details className="preference-controls"><summary>Application behavior</summary>
    <div className="preference-popover"><AppPreferencesPanel editorAfterCapture value={value} disabled={disabled}
      capabilities={{ alwaysOnTopSupported: supportsNativeOutput(), notificationsSupported: supportsNativeOutput(), launchAtLoginSupported: loginSupported, menuBarSupported: supportsNativeOutput() }} onChange={onChange} />
      <p>Use Save preferences to retain these choices after restart. Captures open in the editor; Upload uses FTP and Save image keeps a local file.</p>
      <p>Launch at login changes FerShot X's own system entry immediately and requires a packaged app. System settings control notification delivery.</p>
    </div>
  </details>;
}
