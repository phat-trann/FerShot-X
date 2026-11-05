import { invoke, isTauri } from "@tauri-apps/api/core";
import { DEFAULT_SETTINGS, type AppSettings } from "../contracts/settings";
import { parseSettingsJson } from "../features/settings-codec";
import type { CaptureMode, ImageDocument } from "../contracts/media";
import { validateCrop } from "../features/crop/validate";
import { safeExportName, type ExportFormat } from "../features/export/names";
import { assertImageDimensions, MAX_NATIVE_BYTES } from "./image-limits";
export { MAX_NATIVE_BYTES } from "./image-limits";
export interface AppInfo { name: string; version: string; platform: string }
export async function readAppInfo(): Promise<AppInfo | null> {
  return isTauri() ? invoke<AppInfo>("app_info") : null;
}

export interface ImagePayload { pngBase64: string; width: number; height: number; byteSize: number }
export interface ProcessOptions {
  crop?: { x: number; y: number; width: number; height: number };
  resize?: { width: number; height: number };
}
const MAX_BASE64_LENGTH = Math.ceil(MAX_NATIVE_BYTES / 3) * 4;

export class NativeOperationError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "NativeOperationError"; }
}
function requireDesktop() {
  if (!isTauri()) throw new NativeOperationError("desktop_required", "Open the desktop app to capture, transform, copy or save images.");
}
async function nativeCall<T>(command: string, args: Record<string, unknown>): Promise<T> {
  requireDesktop();
  try { return await invoke<T>(command, args); }
  catch (error) {
    if (typeof error === "object" && error !== null && "message" in error) {
      const value = error as { message: unknown; code?: unknown };
      throw new NativeOperationError(typeof value.code === "string" ? value.code : "native_failed", String(value.message));
    }
    throw new NativeOperationError("native_failed", typeof error === "string" ? error : "The image operation failed.");
  }
}
export function documentFromPayload(payload: ImagePayload, name: string): ImageDocument {
  if (typeof payload !== "object" || payload === null) throw new NativeOperationError("invalid_payload", "The desktop app returned no image metadata.");
  assertImageDimensions(payload.width, payload.height);
  if (typeof payload.pngBase64 !== "string" || payload.pngBase64.length > MAX_BASE64_LENGTH ||
      !Number.isSafeInteger(payload.byteSize) || payload.byteSize < 24 || payload.byteSize > MAX_NATIVE_BYTES) {
    throw new NativeOperationError("invalid_payload", "The desktop app returned an invalid image payload.");
  }
  let decoded: string;
  try { decoded = atob(payload.pngBase64); }
  catch { throw new NativeOperationError("invalid_payload", "The desktop image could not be decoded."); }
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  if (bytes.length !== payload.byteSize || bytes.length < 24 ||
      bytes.slice(0, 8).some((byte, i) => byte !== [137, 80, 78, 71, 13, 10, 26, 10][i]) ||
      view.getUint32(16) !== payload.width || view.getUint32(20) !== payload.height) {
    throw new NativeOperationError("invalid_payload", "The desktop image metadata does not match its contents.");
  }
  return { id: crypto.randomUUID(), name, width: payload.width, height: payload.height,
    mimeType: "image/png", byteSize: bytes.length, src: URL.createObjectURL(new Blob([bytes], { type: "image/png" })) };
}

export async function rasterizeDocument(document: ImageDocument): Promise<string> {
  assertImageDimensions(document.width, document.height);
  const image = new Image();
  image.src = document.src;
  await image.decode();
  if (image.naturalWidth !== document.width || image.naturalHeight !== document.height) {
    throw new NativeOperationError("invalid_image", "Image dimensions changed unexpectedly.");
  }
  const canvas = window.document.createElement("canvas");
  canvas.width = document.width; canvas.height = document.height;
  const context = canvas.getContext("2d");
  if (!context) throw new NativeOperationError("canvas_unavailable", "Image rendering is unavailable.");
  context.drawImage(image, 0, 0);
  const result = canvas.toDataURL("image/png");
  const prefix = "data:image/png;base64,";
  if (!result.startsWith(prefix) || result.length - prefix.length > MAX_BASE64_LENGTH) {
    throw new NativeOperationError("image_limit", "The rendered image is too large to process.");
  }
  return result.slice(prefix.length);
}

export async function captureImage(mode: CaptureMode): Promise<ImageDocument> {
  const payload = await nativeCall<ImagePayload>("capture_image", { mode });
  return documentFromPayload(payload, `Capture-${Date.now()}.png`);
}

export async function transformImage(document: ImageDocument, options: ProcessOptions): Promise<ImageDocument> {
  requireDesktop();
  const validated = options.crop ? { ...options, crop: validateCrop(options.crop, document.width, document.height) } : options;
  const pngBase64 = await rasterizeDocument(document);
  const payload = await nativeCall<ImagePayload>("process_image", { request: { pngBase64, ...validated } });
  const suffix = options.crop ? "cropped" : "resized";
  return documentFromPayload(payload, safeExportName(`${document.name.replace(/\.[^.]+$/, "")}-${suffix}`, "png", 60));
}

export async function saveImage(document: ImageDocument, format: ExportFormat, quality = 90): Promise<string | null> {
  requireDesktop();
  const pngBase64 = await rasterizeDocument(document);
  return nativeCall<string | null>("save_image", { request: { pngBase64,
    suggestedName: safeExportName(document.name, format, 60), format, quality } });
}

/** Copies the current raster only; pending annotation overlays are not included. */
export async function copyImage(document: ImageDocument): Promise<void> {
  requireDesktop();
  const pngBase64 = await rasterizeDocument(document);
  await nativeCall<void>("copy_image", { request: { pngBase64 } });
}

function preferencesFromWire(value: unknown): AppSettings {
  return parseSettingsJson(JSON.stringify({ version: 1, settings: value }));
}
export async function readPreferences(): Promise<AppSettings> {
  if (!isTauri()) return { ...DEFAULT_SETTINGS };
  return preferencesFromWire(await nativeCall<unknown>("load_preferences", {}));
}
export async function savePreferences(settings: AppSettings): Promise<AppSettings> {
  const validated = preferencesFromWire(settings);
  return preferencesFromWire(await nativeCall<unknown>("save_preferences", { settings: validated }));
}

export interface PinWire { sourceId: string; name: string; image: ImagePayload }
export async function pinImage(document: ImageDocument): Promise<string> {
  requireDesktop();
  const pngBase64 = await rasterizeDocument(document);
  return nativeCall<string>("open_pin", { request: { sourceId: document.id,
    name: safeExportName(document.name, "png", 60), pngBase64 } });
}
export function documentFromPin(wire: PinWire): ImageDocument {
  if (!wire || typeof wire.sourceId !== "string" || !wire.sourceId || wire.sourceId.length > 128 ||
      typeof wire.name !== "string" || !wire.name || wire.name.length > 240) {
    throw new NativeOperationError("invalid_pin", "Invalid pinned image metadata.");
  }
  return documentFromPayload(wire.image, wire.name);
}
export async function readPinnedImage(): Promise<ImageDocument> {
  return documentFromPin(await nativeCall<PinWire>("get_pin", {}));
}
export async function copyPinnedImage(): Promise<void> { await nativeCall<void>("copy_pin", {}); }
export async function closePinnedImage(): Promise<void> { await nativeCall<void>("close_pin", {}); }
export async function editPinnedImage(): Promise<void> { await nativeCall<void>("edit_pin", {}); }

export async function importClipboardImage(): Promise<ImageDocument> {
  return documentFromPayload(await nativeCall<ImagePayload>("import_clipboard", {}), `Clipboard-${Date.now()}.png`);
}
