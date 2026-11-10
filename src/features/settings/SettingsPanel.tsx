import React from "react";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type SettingsPanelProps,
} from "../../contracts/settings";
import "./SettingsPanel.css";
import { NativeSelect } from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";

export const MIN_JPEG_QUALITY = 1;
export const MAX_JPEG_QUALITY = 100;

export function clampJpegQuality(raw: number): number {
  if (!Number.isFinite(raw)) {
    return DEFAULT_SETTINGS.jpegQuality;
  }
  const rounded = Math.round(raw);
  return Math.min(MAX_JPEG_QUALITY, Math.max(MIN_JPEG_QUALITY, rounded));
}

export function SettingsPanel({
  value,
  onChange,
}: SettingsPanelProps): React.JSX.Element {
  const emitChange = (patch: Partial<AppSettings>) => {
    const next: AppSettings = {
      saveFormat: patch.saveFormat ?? value.saveFormat,
      jpegQuality: clampJpegQuality(patch.jpegQuality ?? value.jpegQuality),
      downscaleRetina: patch.downscaleRetina ?? value.downscaleRetina,
      showPreview: patch.showPreview ?? value.showPreview,
    };
    onChange(next);
  };

  const handleFormatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextFormat = event.target.value === "jpeg" ? "jpeg" : "png";
    emitChange({ saveFormat: nextFormat });
  };

  const handleQualityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(event.target.value);
    if (event.target.value.trim() === "" || Number.isNaN(parsed)) {
      return;
    }
    emitChange({ jpegQuality: clampJpegQuality(parsed) });
  };

  return (
    <section className="fershot-settings-panel" aria-label="FerShot Settings">
      <div className="fershot-settings-panel__header">
        <h2 className="fershot-settings-panel__title">FerShot Settings</h2>
        <button
          type="button"
          className="fershot-settings-panel__reset-btn"
          onClick={() => onChange({ ...DEFAULT_SETTINGS })}
        >
          Reset to Defaults
        </button>
      </div>

      <div className="fershot-settings-panel__field">
        <div className="fershot-settings-panel__row">
          <label
            className="fershot-settings-panel__label"
            htmlFor="fershot-settings-save-format"
          >
            Save Format
          </label>
          <NativeSelect
            id="fershot-settings-save-format"
            className="fershot-settings-panel__select"
            value={value.saveFormat}
            onChange={handleFormatChange}
          >
            <option value="png">PNG (Lossless)</option>
            <option value="jpeg">JPEG (Compressed)</option>
          </NativeSelect>
        </div>
      </div>

      {value.saveFormat === "jpeg" && (
        <div className="fershot-settings-panel__field">
          <div className="fershot-settings-panel__row">
            <label
              className="fershot-settings-panel__label"
              htmlFor="fershot-settings-jpeg-quality"
            >
              JPEG Quality (1–100)
            </label>
            <Input
              id="fershot-settings-jpeg-quality"
              type="number"
              className="fershot-settings-panel__number"
              min={MIN_JPEG_QUALITY}
              max={MAX_JPEG_QUALITY}
              step={1}
              value={clampJpegQuality(value.jpegQuality)}
              onChange={handleQualityChange}
            />
          </div>
        </div>
      )}

      <div className="fershot-settings-panel__field">
        <label className="fershot-settings-panel__checkbox-label">
          <Switch
            
            checked={value.downscaleRetina}
            onCheckedChange={checked => emitChange({ downscaleRetina: checked })}
          />
          <span>Downscale Retina captures to 1x</span>
        </label>
      </div>

      <div className="fershot-settings-panel__field">
        <label className="fershot-settings-panel__checkbox-label">
          <Switch
            
            checked={value.showPreview}
            onCheckedChange={checked => emitChange({ showPreview: checked })}
          />
          <span>Show floating preview after capture</span>
        </label>
      </div>

      <p className="fershot-settings-panel__hint">
        Changes apply to the current session state; disk persistence is not yet
        wired.
      </p>
    </section>
  );
}

