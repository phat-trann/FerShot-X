import React, { useEffect, useState } from "react";
import type { ImageDocument } from "../../contracts/media";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
} from "../../contracts/settings";
import "./ExportPanel.css";
import { Input } from "../../components/ui/input";
import { NativeSelect } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";

export const MIN_EXPORT_JPEG_QUALITY = 1;
export const MAX_EXPORT_JPEG_QUALITY = 100;

export function clampExportJpegQuality(raw: number): number {
  if (!Number.isFinite(raw)) {
    return DEFAULT_SETTINGS.jpegQuality;
  }
  const rounded = Math.round(raw);
  return Math.min(
    MAX_EXPORT_JPEG_QUALITY,
    Math.max(MIN_EXPORT_JPEG_QUALITY, rounded),
  );
}

export function deriveSuggestedBasename(
  document: ImageDocument | null,
  explicitBasename?: string,
): string {
  const candidate = explicitBasename?.trim();
  if (candidate) {
    return candidate;
  }
  const rawName = document?.name.trim() ?? "";
  if (!rawName) {
    return "fershot-capture";
  }
  const stripped = rawName.replace(/\.(png|jpe?g|webp|gif)$/i, "").trim();
  return stripped || "fershot-capture";
}

export type ExportFeedbackState = "idle" | "cancelled" | "success";

export interface ExportRequestPayload {
  readonly documentId: string;
  readonly suggestedBasename: string;
  readonly format: AppSettings["saveFormat"];
  readonly jpegQuality: number;
  readonly downscaleRetina: boolean;
}

export interface ExportPanelProps {
  readonly document: ImageDocument | null;
  readonly settings: Readonly<AppSettings>;
  readonly suggestedBasename?: string;
  readonly busy: boolean;
  readonly status?: ExportFeedbackState;
  readonly statusMessage?: string;
  readonly error?: string;
  readonly onSettingsChange: (next: AppSettings) => void;
  readonly onExport: (payload: ExportRequestPayload) => void;
}

export function ExportPanel({
  document,
  settings,
  suggestedBasename,
  busy,
  status = "idle",
  statusMessage,
  error,
  onSettingsChange,
  onExport,
}: ExportPanelProps): React.JSX.Element {
  const defaultBasename = deriveSuggestedBasename(document, suggestedBasename);
  const [basenameInput, setBasenameInput] = useState<string>(defaultBasename);

  useEffect(() => {
    setBasenameInput(deriveSuggestedBasename(document, suggestedBasename));
  }, [document?.id, document?.name, suggestedBasename]);

  const emitSettings = (patch: Partial<AppSettings>) => {
    const next: AppSettings = {
      saveFormat: patch.saveFormat ?? settings.saveFormat,
      jpegQuality: clampExportJpegQuality(
        patch.jpegQuality ?? settings.jpegQuality,
      ),
      downscaleRetina: patch.downscaleRetina ?? settings.downscaleRetina,
      showPreview: patch.showPreview ?? settings.showPreview,
    };
    onSettingsChange(next);
  };

  const handleQualityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(event.target.value);
    if (event.target.value.trim() === "" || Number.isNaN(parsed)) {
      return;
    }
    emitSettings({ jpegQuality: clampExportJpegQuality(parsed) });
  };

  const handleExportClick = () => {
    if (busy || !document) {
      return;
    }
    const cleanBasename = basenameInput.trim() || defaultBasename;
    onExport({
      documentId: document.id,
      suggestedBasename: cleanBasename,
      format: settings.saveFormat,
      jpegQuality: clampExportJpegQuality(settings.jpegQuality),
      downscaleRetina: settings.downscaleRetina,
    });
  };

  const trimmedError = error?.trim();

  return (
    <section
      className="fershot-export-panel"
      aria-label="Export Image Options"
      aria-busy={busy}
    >
      <div className="fershot-export-panel__header">
        <h2 className="fershot-export-panel__title">Local Export</h2>
      </div>

      <div className="fershot-export-panel__field">
        <label
          className="fershot-export-panel__label"
          htmlFor="fershot-export-basename"
        >
          Suggested Filename
        </label>
        <Input
          id="fershot-export-basename"
          type="text"
          className="fershot-export-panel__input"
          aria-label="Suggested filename"
          disabled={busy || !document}
          value={basenameInput}
          onChange={(event) => setBasenameInput(event.target.value)}
        />
      </div>

      <div className="fershot-export-panel__field">
        <div className="fershot-export-panel__row">
          <label
            className="fershot-export-panel__label"
            htmlFor="fershot-export-format"
          >
            Export Format
          </label>
          <NativeSelect
            id="fershot-export-format"
            className="fershot-export-panel__select"
            aria-label="Export format"
            disabled={busy}
            value={settings.saveFormat}
            onChange={(event) =>
              emitSettings({
                saveFormat: event.target.value === "jpeg" ? "jpeg" : "png",
              })
            }
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </NativeSelect>
        </div>
      </div>

      {settings.saveFormat === "jpeg" && (
        <div className="fershot-export-panel__field">
          <div className="fershot-export-panel__row">
            <label
              className="fershot-export-panel__label"
              htmlFor="fershot-export-jpeg-quality"
            >
              JPEG Quality (1–100)
            </label>
            <Input
              id="fershot-export-jpeg-quality"
              type="number"
              className="fershot-export-panel__input"
              aria-label="Export JPEG quality"
              disabled={busy}
              min={MIN_EXPORT_JPEG_QUALITY}
              max={MAX_EXPORT_JPEG_QUALITY}
              step={1}
              value={clampExportJpegQuality(settings.jpegQuality)}
              onChange={handleQualityChange}
            />
          </div>
        </div>
      )}

      <div className="fershot-export-panel__field">
        <label className="fershot-export-panel__checkbox">
          <Switch
            
            disabled={busy}
            checked={settings.downscaleRetina}
            onCheckedChange={checked => emitSettings({ downscaleRetina: checked })}
          />
          <span>Downscale Retina to 1x when saving</span>
        </label>
      </div>

      <button
        type="button"
        className="fershot-export-panel__submit-btn"
        disabled={busy || !document}
        onClick={handleExportClick}
      >
        {busy
          ? "Exporting…"
          : `Export ${settings.saveFormat.toUpperCase()}`}
      </button>

      {busy && (
        <p
          className="fershot-export-panel__feedback fershot-export-panel__feedback--status"
          role="status"
          aria-live="polite"
        >
          {statusMessage?.trim() || "Exporting image…"}
        </p>
      )}

      {!busy && status === "cancelled" && (
        <p
          className="fershot-export-panel__feedback fershot-export-panel__feedback--status"
          role="status"
          aria-live="polite"
        >
          {statusMessage?.trim() || "Export cancelled."}
        </p>
      )}

      {!busy && status === "success" && (
        <p
          className="fershot-export-panel__feedback fershot-export-panel__feedback--success"
          role="status"
          aria-live="polite"
        >
          {statusMessage?.trim() || "Image exported successfully."}
        </p>
      )}

      {trimmedError ? (
        <p
          className="fershot-export-panel__feedback fershot-export-panel__feedback--error"
          role="alert"
        >
          {trimmedError}
        </p>
      ) : null}
    </section>
  );
}

