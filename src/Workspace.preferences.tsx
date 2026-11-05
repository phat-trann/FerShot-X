import type { AppSettings } from "./contracts/settings";
export function PreferenceControls({ settings, ready, busy, notice, onChange, onSave }: {
  settings: AppSettings; ready: boolean; busy: boolean; notice: string;
  onChange: (value: AppSettings) => void; onSave: () => void;
}) {
  return <details className="preference-controls"><summary>Preferences</summary><div className="preference-popover">
    <label>Preferred export format<select aria-label="Preferred export format" disabled={!ready || busy}
      value={settings.saveFormat} onChange={(e) => onChange({ ...settings, saveFormat: e.target.value as AppSettings["saveFormat"] })}>
      <option value="png">PNG</option><option value="jpeg">JPEG</option></select></label>
    <label>JPEG quality<input aria-label="Preferred JPEG quality" type="number" min="1" max="100" step="1" value={settings.jpegQuality}
      disabled={!ready || busy} onChange={(e) => { const quality = Number(e.target.value); if (Number.isInteger(quality) && quality >= 1 && quality <= 100) onChange({ ...settings, jpegQuality: quality }); }} /></label>
    <button disabled={!ready || busy} onClick={onSave}>Save preferences</button>
    {notice && <p role="status">{notice}</p>}
  </div></details>;
}
