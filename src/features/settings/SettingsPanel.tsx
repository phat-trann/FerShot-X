import React from "react";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type SettingsPanelProps,
} from "../../contracts/settings";
import "./SettingsPanel.css";

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
    <section className="ferby-settings-panel" aria-label="Ferby Settings">
      <div className="ferby-settings-panel__header">
        <h2 className="ferby-settings-panel__title">Ferby Settings</h2>
        <button
          type="button"
          className="ferby-settings-panel__reset-btn"
          onClick={() => onChange({ ...DEFAULT_SETTINGS })}
        >
          Reset to Defaults
        </button>
      </div>

      <div className="ferby-settings-panel__field">
        <div className="ferby-settings-panel__row">
          <label
            className="ferby-settings-panel__label"
            htmlFor="ferby-settings-save-format"
          >
            Save Format
          </label>
          <select
            id="ferby-settings-save-format"
            className="ferby-settings-panel__select"
            value={value.saveFormat}
            onChange={handleFormatChange}
          >
            <option value="png">PNG (Lossless)</option>
            <option value="jpeg">JPEG (Compressed)</option>
          </select>
        </div>
      </div>

      {value.saveFormat === "jpeg" && (
        <div className="ferby-settings-panel__field">
          <div className="ferby-settings-panel__row">
            <label
              className="ferby-settings-panel__label"
              htmlFor="ferby-settings-jpeg-quality"
            >
              JPEG Quality (1–100)
            </label>
            <input
              id="ferby-settings-jpeg-quality"
              type="number"
              className="ferby-settings-panel__number"
              min={MIN_JPEG_QUALITY}
              max={MAX_JPEG_QUALITY}
              step={1}
              value={clampJpegQuality(value.jpegQuality)}
              onChange={handleQualityChange}
            />
          </div>
        </div>
      )}

      <div className="ferby-settings-panel__field">
        <label className="ferby-settings-panel__checkbox-label">
          <input
            type="checkbox"
            checked={value.downscaleRetina}
            onChange={(event) =>
              emitChange({ downscaleRetina: event.target.checked })
            }
          />
          <span>Downscale Retina captures to 1x</span>
        </label>
      </div>

      <div className="ferby-settings-panel__field">
        <label className="ferby-settings-panel__checkbox-label">
          <input
            type="checkbox"
            checked={value.showPreview}
            onChange={(event) =>
              emitChange({ showPreview: event.target.checked })
            }
          />
          <span>Show floating preview after capture</span>
        </label>
      </div>

      <p className="ferby-settings-panel__hint">
        Changes apply to the current session state; disk persistence is not yet
        wired.
      </p>
    </section>
  );
}

