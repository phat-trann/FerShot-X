import type { AppSettings } from "./contracts/settings";
import { NativeSelect } from "./components/ui/select";
import { Input } from "./components/ui/input";
import { Switch } from "./components/ui/switch";
export function PreferenceControls({ settings, ready, busy, notice, onChange, onSave }: {
  settings: AppSettings; ready: boolean; busy: boolean; notice: string;
  onChange: (value: AppSettings) => void; onSave: () => void;
}) {
  return <details className="preference-controls"><summary>Preferences</summary><div className="preference-popover">
    <label>Preferred export format<NativeSelect aria-label="Preferred export format" disabled={!ready || busy}
      value={settings.saveFormat} onChange={(e) => onChange({ ...settings, saveFormat: e.target.value as AppSettings["saveFormat"] })}>
      <option value="png">PNG</option><option value="jpeg">JPEG</option></NativeSelect></label>
    <label>JPEG quality<Input aria-label="Preferred JPEG quality" type="number" min="1" max="100" step="1" value={settings.jpegQuality}
      disabled={!ready || busy} onChange={(e) => { const quality = Number(e.target.value); if (Number.isInteger(quality) && quality >= 1 && quality <= 100) onChange({ ...settings, jpegQuality: quality }); }} /></label>
    <label><Switch  aria-label="Show capture preview" checked={settings.showPreview} disabled={!ready || busy}
      onCheckedChange={checked => onChange({ ...settings, showPreview: checked })} />Show capture preview</label>
    <label><Switch  aria-label="Downscale captures with known Retina scale" checked={settings.downscaleRetina} disabled={!ready || busy}
      onCheckedChange={checked => onChange({ ...settings, downscaleRetina: checked })} />Downscale Retina copy/save output</label>
    <p>Downscaling uses known capture display scale. Images without scale metadata keep their pixel size.</p>
    <button disabled={!ready || busy} onClick={onSave}>Save preferences</button>
    {notice && <p role="status">{notice}</p>}
  </div></details>;
}
