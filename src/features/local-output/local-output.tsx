import { Printer } from "lucide-react";
import { Button } from "../../components/ui/button";
import React from "react";
import type { ImageDocument } from "../../contracts/media";
import "./LocalOutputPanel.css";
import { NativeSelect } from "../../components/ui/select";
import { Input } from "../../components/ui/input";

/**
 * Note on OS integration boundary (`A30`):
 * Native macOS `NSPrintOperation` / Tauri print dialog behavior and native file-promise
 * drag-out (`NSPasteboardItem` / `NSFilePromiseProvider`) are not invoked by this frontend
 * presentation module and remain unverified at the OS level until wired by Codex.
 * This module never calls `window.print()`, file dialogs, clipboard APIs, or filesystem I/O.
 */

export type PrintPaperPreset = "a4" | "letter";
export type PrintOrientation = "portrait" | "landscape";
export type PrintScaleMode = "fit" | "actual";
export type AllowedDragImageMime = "image/png" | "image/jpeg";

export const ALLOWED_DRAG_IMAGE_MIMES: readonly AllowedDragImageMime[] =
  Object.freeze(["image/png", "image/jpeg"] as const);

export const MIN_PRINT_MARGIN_PT = 0;
export const MAX_PRINT_MARGIN_PT = 144;
export const MAX_PRINT_IMAGE_DIMENSION = 16_384;
export const MAX_DRAG_PAYLOAD_BYTES = 32 * 1024 * 1024;

export const PAPER_DIMENSIONS_PT: Readonly<
  Record<PrintPaperPreset, { readonly widthPt: number; readonly heightPt: number }>
> = Object.freeze({
  a4: Object.freeze({ widthPt: 595, heightPt: 842 }),
  letter: Object.freeze({ widthPt: 612, heightPt: 792 }),
});

export interface PrintSheetOptions {
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly paper: PrintPaperPreset;
  readonly orientation: PrintOrientation;
  readonly marginPt: number;
  readonly scaleMode?: PrintScaleMode;
}

export interface PrintSheetLayout {
  readonly pageWidthPt: number;
  readonly pageHeightPt: number;
  readonly marginPt: number;
  readonly printableWidthPt: number;
  readonly printableHeightPt: number;
  readonly drawXPt: number;
  readonly drawYPt: number;
  readonly drawWidthPt: number;
  readonly drawHeightPt: number;
  readonly aspectRatio: number;
}

export interface PrintSheetCanvasRequest extends PrintSheetOptions {
  readonly source: CanvasImageSource;
}

export interface LocalDragImagePayload {
  readonly documentId: string;
  readonly fileName: string;
  readonly mimeType: AllowedDragImageMime;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly byteSize: number;
}

export interface LocalOutputPanelProps {
  readonly document: Readonly<ImageDocument>;
  readonly paper: PrintPaperPreset;
  readonly orientation: PrintOrientation;
  readonly marginPt: number;
  readonly scaleMode?: PrintScaleMode;
  readonly busy?: boolean;
  readonly onOptionsChange?: (next: {
    readonly paper: PrintPaperPreset;
    readonly orientation: PrintOrientation;
    readonly marginPt: number;
    readonly scaleMode: PrintScaleMode;
  }) => void;
  readonly onRequestNativePrint?: (layout: PrintSheetLayout) => void;
  readonly onInitiateImageDrag?: (payload: LocalDragImagePayload) => void;
  readonly nativeDragControls?: React.ReactNode;
}

export function computePrintSheetLayout(
  options: PrintSheetOptions,
): PrintSheetLayout {
  if (
    !Number.isSafeInteger(options.imageWidth) ||
    !Number.isSafeInteger(options.imageHeight) ||
    options.imageWidth < 1 ||
    options.imageHeight < 1 ||
    options.imageWidth > MAX_PRINT_IMAGE_DIMENSION ||
    options.imageHeight > MAX_PRINT_IMAGE_DIMENSION
  ) {
    throw new RangeError(
      `imageWidth and imageHeight must be integers between 1 and ${MAX_PRINT_IMAGE_DIMENSION}.`,
    );
  }

  const preset = PAPER_DIMENSIONS_PT[options.paper];
  if (!preset) {
    throw new RangeError(`Unsupported paper preset: "${String(options.paper)}".`);
  }
  if (
    options.orientation !== "portrait" &&
    options.orientation !== "landscape"
  ) {
    throw new RangeError(
      `Unsupported orientation: "${String(options.orientation)}".`,
    );
  }
  if (
    !Number.isFinite(options.marginPt) ||
    options.marginPt < MIN_PRINT_MARGIN_PT ||
    options.marginPt > MAX_PRINT_MARGIN_PT
  ) {
    throw new RangeError(
      `marginPt must be between ${MIN_PRINT_MARGIN_PT} and ${MAX_PRINT_MARGIN_PT}.`,
    );
  }

  const pageWidthPt =
    options.orientation === "portrait" ? preset.widthPt : preset.heightPt;
  const pageHeightPt =
    options.orientation === "portrait" ? preset.heightPt : preset.widthPt;

  const printableWidthPt = pageWidthPt - options.marginPt * 2;
  const printableHeightPt = pageHeightPt - options.marginPt * 2;
  if (printableWidthPt <= 0 || printableHeightPt <= 0) {
    throw new RangeError("Printable area is non-positive for the given margins.");
  }

  const scaleMode = options.scaleMode ?? "fit";
  const fitScale = Math.min(
    printableWidthPt / options.imageWidth,
    printableHeightPt / options.imageHeight,
  );
  const scale = scaleMode === "actual" ? Math.min(1, fitScale) : fitScale;

  const drawWidthPt = Math.round(options.imageWidth * scale * 100) / 100;
  const drawHeightPt = Math.round(options.imageHeight * scale * 100) / 100;
  const drawXPt =
    Math.round(
      (options.marginPt + (printableWidthPt - drawWidthPt) / 2) * 100,
    ) / 100;
  const drawYPt =
    Math.round(
      (options.marginPt + (printableHeightPt - drawHeightPt) / 2) * 100,
    ) / 100;

  return Object.freeze({
    pageWidthPt,
    pageHeightPt,
    marginPt: options.marginPt,
    printableWidthPt,
    printableHeightPt,
    drawXPt,
    drawYPt,
    drawWidthPt,
    drawHeightPt,
    aspectRatio: options.imageWidth / options.imageHeight,
  });
}

export function renderPrintSheetPreviewToCanvas(
  request: PrintSheetCanvasRequest,
  createCanvas: (width: number, height: number) => HTMLCanvasElement = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  },
): HTMLCanvasElement {
  if (!request.source) {
    throw new TypeError("source image is required.");
  }
  const layout = computePrintSheetLayout(request);
  const canvas = createCanvas(layout.pageWidthPt, layout.pageHeightPt);
  canvas.width = layout.pageWidthPt;
  canvas.height = layout.pageHeightPt;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable.");
  }

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, layout.pageWidthPt, layout.pageHeightPt);
  ctx.drawImage(
    request.source,
    0,
    0,
    request.imageWidth,
    request.imageHeight,
    layout.drawXPt,
    layout.drawYPt,
    layout.drawWidthPt,
    layout.drawHeightPt,
  );
  ctx.restore();

  return canvas;
}

function sanitizeExportFileName(name: string, mimeType: AllowedDragImageMime): string {
  const base = name
    .trim()
    .replace(/\.{2,}/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);
  const ext = mimeType === "image/png" ? ".png" : ".jpg";
  const stem = base.length > 0 ? base.replace(/\.(png|jpe?g)$/i, "") : "fershot-image";
  return `${stem}${ext}`;
}

export function createDragImagePayload(
  doc: Readonly<ImageDocument>,
): LocalDragImagePayload {
  if (doc.mimeType !== "image/png" && doc.mimeType !== "image/jpeg") {
    throw new RangeError(
      `Unsupported drag image MIME type "${doc.mimeType}". Only image/png and image/jpeg are allowed.`,
    );
  }
  if (
    !Number.isSafeInteger(doc.width) ||
    !Number.isSafeInteger(doc.height) ||
    doc.width < 1 ||
    doc.height < 1 ||
    doc.width > MAX_PRINT_IMAGE_DIMENSION ||
    doc.height > MAX_PRINT_IMAGE_DIMENSION
  ) {
    throw new RangeError("Document dimensions are out of bounds.");
  }
  if (
    !Number.isSafeInteger(doc.byteSize) ||
    doc.byteSize < 1 ||
    doc.byteSize > MAX_DRAG_PAYLOAD_BYTES
  ) {
    throw new RangeError("Document byteSize is out of bounds.");
  }
  const allowedSrc =
    doc.src.startsWith("data:image/png;") ||
    doc.src.startsWith("data:image/jpeg;") ||
    doc.src.startsWith("blob:");
  if (!allowedSrc) {
    throw new RangeError(
      "Drag image source must be an in-memory data:image/(png|jpeg) or blob: URL.",
    );
  }

  return Object.freeze({
    documentId: doc.id,
    fileName: sanitizeExportFileName(doc.name, doc.mimeType),
    mimeType: doc.mimeType,
    src: doc.src,
    width: doc.width,
    height: doc.height,
    byteSize: doc.byteSize,
  });
}

export const LocalOutputPanel: React.FC<LocalOutputPanelProps> = ({
  document: doc,
  paper,
  orientation,
  marginPt,
  scaleMode = "fit",
  busy = false,
  onOptionsChange,
  onRequestNativePrint,
  onInitiateImageDrag,
  nativeDragControls,
}) => {
  let layout: PrintSheetLayout | null = null;
  let dragPayload: LocalDragImagePayload | null = null;
  let errorText: string | null = null;

  try {
    layout = computePrintSheetLayout({
      imageWidth: doc.width,
      imageHeight: doc.height,
      paper,
      orientation,
      marginPt,
      scaleMode,
    });
    dragPayload = onInitiateImageDrag ? createDragImagePayload(doc) : null;
  } catch (err) {
    errorText = err instanceof Error ? err.message : "Invalid local output state.";
  }

  const emitOptionPatch = (
    patch: Partial<{
      readonly paper: PrintPaperPreset;
      readonly orientation: PrintOrientation;
      readonly marginPt: number;
      readonly scaleMode: PrintScaleMode;
    }>,
  ) => {
    if (busy) return;
    onOptionsChange?.(
      Object.freeze({
        paper: patch.paper ?? paper,
        orientation: patch.orientation ?? orientation,
        marginPt: patch.marginPt ?? marginPt,
        scaleMode: patch.scaleMode ?? scaleMode,
      }),
    );
  };

  return (
    <section
      className="fershot-local-output-panel"
      aria-label="Local output and print presentation"
    >
      <header className="fershot-local-output-panel__header">
        <h3 className="fershot-local-output-panel__title">Print & Drag Output</h3>
        {layout && (
          <span
            className="fershot-local-output-panel__page-size"
            aria-label="Sheet dimensions"
          >
            {layout.pageWidthPt} × {layout.pageHeightPt} pt
          </span>
        )}
      </header>

      {errorText && (
        <div role="alert" className="fershot-local-output-panel__error">
          {errorText}
        </div>
      )}

      <div className="fershot-local-output-panel__controls">
        <label>
          Paper
          <NativeSelect
            aria-label="Paper size"
            disabled={busy}
            value={paper}
            onChange={(e) =>
              emitOptionPatch({ paper: e.target.value as PrintPaperPreset })
            }
          >
            <option value="a4">A4 (595 × 842 pt)</option>
            <option value="letter">US Letter (612 × 792 pt)</option>
          </NativeSelect>
        </label>

        <label>
          Orientation
          <NativeSelect
            aria-label="Page orientation"
            disabled={busy}
            value={orientation}
            onChange={(e) =>
              emitOptionPatch({
                orientation: e.target.value as PrintOrientation,
              })
            }
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </NativeSelect>
        </label>

        <label>
          Margin (pt)
          <Input
            aria-label="Margin (pt)"
            type="number"
            min={MIN_PRINT_MARGIN_PT}
            max={MAX_PRINT_MARGIN_PT}
            disabled={busy}
            value={marginPt}
            onChange={(e) =>
              emitOptionPatch({ marginPt: Number(e.target.value) })
            }
          />
        </label>
      </div>

      {layout && (
        <div
          className="fershot-local-output-panel__preview"
          aria-label="Fitted image placement"
        >
          Fitted image: {layout.drawWidthPt} × {layout.drawHeightPt} pt at (
          {layout.drawXPt}, {layout.drawYPt})
        </div>
      )}

      <div className="fershot-local-output-panel__actions">
        <Button icon={Printer} variant="secondary"
          type="button"
          disabled={busy || !layout || !onRequestNativePrint}
          onClick={() => {
            if (!layout || busy || !onRequestNativePrint) return;
            onRequestNativePrint?.(Object.freeze({ ...layout }));
          }}
        >
          Print Image…
        </Button>

        <div
          role="button"
          tabIndex={busy || !dragPayload || !onInitiateImageDrag ? -1 : 0}
          draggable={!busy && dragPayload !== null && Boolean(onInitiateImageDrag)}
          aria-disabled={busy || !dragPayload || !onInitiateImageDrag}
          aria-label="Drag image payload"
          className="fershot-local-output-panel__drag-chip"
          onDragStart={(e) => {
            if (!dragPayload || busy || !onInitiateImageDrag) {
              e.preventDefault();
              return;
            }
            e.dataTransfer?.setData(dragPayload.mimeType, dragPayload.src);
            onInitiateImageDrag?.(Object.freeze({ ...dragPayload }));
          }}
          onClick={() => {
            if (!dragPayload || busy || !onInitiateImageDrag) return;
            onInitiateImageDrag?.(Object.freeze({ ...dragPayload }));
          }}
        >
          Drag {dragPayload ? dragPayload.fileName : "Image"}
        </div>
        {nativeDragControls}
      </div>
    </section>
  );
};
