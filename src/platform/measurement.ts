import type { Rect } from "../contracts/editor";
import type { ImageDocument } from "../contracts/media";
import { computeMeasurementReadout, type MeasurementUnitMode } from "../features/measurement-panel";
import { safeExportName } from "../features/export/names";
import { assertImageDimensions, MAX_NATIVE_BYTES } from "./image-limits";

/** Ferby measurement label on a new raster. Scale is explicitly supplied, not inferred from image size. */
export async function imprintMeasurement(source: ImageDocument, rect: Readonly<Rect>, displayScale: number, unit: MeasurementUnitMode): Promise<ImageDocument> {
  assertImageDimensions(source.width, source.height);
  if (!["px", "pt", "both"].includes(unit)) throw new RangeError("Choose a supported measurement unit.");
  if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) throw new RangeError("Choose a nonempty measurement region.");
  const readout = computeMeasurementReadout({ x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y + rect.height }, source.width, source.height, displayScale);
  if (!readout.widthPx || !readout.heightPx) throw new RangeError("Choose a region inside the image.");
  const label = unit === "px" ? readout.formattedPx : unit === "pt" ? readout.formattedPt : `${readout.formattedPx} · ${readout.formattedPt}`;
  const image = new Image(); image.src = source.src;
  await image.decode();
  if (image.naturalWidth !== source.width || image.naturalHeight !== source.height) throw new Error("Image dimensions changed unexpectedly.");
  const canvas = window.document.createElement("canvas");
  canvas.width = source.width; canvas.height = source.height;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Measurement rendering is unavailable.");
    context.drawImage(image, 0, 0);
    const fontSize = Math.max(10, Math.min(24, Math.round(Math.min(source.width, source.height) / 12)));
    const padding = Math.max(2, Math.round(fontSize / 3));
    context.font = `${fontSize}px sans-serif`;
    context.textBaseline = "top";
    const badgeWidth = Math.min(source.width, Math.ceil(context.measureText(label).width) + padding * 2);
    const badgeHeight = Math.min(source.height, fontSize + padding * 2);
    const x = Math.max(0, Math.min(readout.rectPx.x, source.width - badgeWidth));
    const y = Math.max(0, Math.min(readout.rectPx.y, source.height - badgeHeight));
    context.strokeStyle = "#38bdf8"; context.lineWidth = 1;
    context.strokeRect(readout.rectPx.x, readout.rectPx.y, readout.widthPx, readout.heightPx);
    context.fillStyle = "#0f172a"; context.fillRect(x, y, badgeWidth, badgeHeight);
    context.fillStyle = "#ffffff";
    context.fillText(label, x + padding, y + padding, Math.max(1, badgeWidth - padding * 2));
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Unable to encode measured image.")), "image/png"));
    if (!blob.size || blob.size > MAX_NATIVE_BYTES) throw new RangeError("The measured image is too large to process.");
    const name = safeExportName(`${source.name.replace(/\.[^.]+$/, "")}-measured`, "png", 60);
    const id = crypto.randomUUID();
    return { id, name, width: source.width, height: source.height, src: URL.createObjectURL(blob), mimeType: "image/png", byteSize: blob.size };
  } finally { canvas.width = 0; canvas.height = 0; }
}
