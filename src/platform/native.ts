import { invoke, isTauri } from "@tauri-apps/api/core";
import { DEFAULT_SETTINGS, type AppSettings } from "../contracts/settings";
import { DEFAULT_APP_PREFERENCES, type FerbyAppPreferences } from "../features/app-preferences";
import { parseAppPreferencesJson, serializeAppPreferencesJson } from "../features/app-preferences-codec";
import { parseSettingsJson } from "../features/settings-codec";
import type { CaptureMode, ImageDocument } from "../contracts/media";
import { validateCrop } from "../features/crop/validate";
import { safeExportName, type ExportFormat } from "../features/export/names";
import { assertImageDimensions, MAX_NATIVE_BYTES } from "./image-limits";
import type { VisionPortRequest } from "../features/vision-backend-adapter";
import type { CaptureArea, DisplayGeometry } from "../features/capture-session";
import type { PixelEffectRequest } from "../features/effects-panel";
import type { PrintSheetOptions } from "../features/local-output";
import { parsePrintPreferencesJson, serializePrintPreferencesJson } from "../features/print-preferences-codec";
import { importImage } from "./import-image";
import { DEFAULT_RECOGNITION_PREFERENCES, parseRecognitionPreferencesJson, serializeRecognitionPreferencesJson,
  type RecognitionPreferences } from "../features/recognition-preferences-codec";
export { MAX_NATIVE_BYTES } from "./image-limits";
export interface AppInfo { name: string; version: string; platform: string }
export async function readAppInfo(): Promise<AppInfo | null> {
  return isTauri() ? invoke<AppInfo>("app_info") : null;
}

export async function listenForWorkspaceClose(handler: () => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  return listen("ferby-workspace-close-requested", handler);
}
export interface OpenedDocument { id: string; name: string }
export async function readOpenedDocuments(): Promise<readonly OpenedDocument[]> {
  if (!isTauri()) return [];
  const entries = await nativeCall<unknown>("pending_documents", {});
  if (!Array.isArray(entries) || entries.length > 16 || entries.some(value => !value || typeof value.id !== "string" ||
      !/^opened-document-[0-9]{1,20}$/.test(value.id) || typeof value.name !== "string" || value.name.length > 480)) throw new TypeError("Invalid native document queue.");
  return entries as OpenedDocument[];
}
export async function openRequestedDocument(id: string): Promise<ImageDocument> {
  const value = await nativeCall<{ name: string; mimeType: string; base64: string }>("read_open_document", { id });
  if (!value || typeof value.name !== "string" || value.name.length > 480 || !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(value.mimeType) ||
      typeof value.base64 !== "string" || value.base64.length > Math.ceil(20 * 1024 * 1024 / 3) * 4) throw new TypeError("Invalid native image response.");
  const binary = atob(value.base64); if (binary.length > 20 * 1024 * 1024) throw new RangeError("Image exceeds import limits.");
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return importImage(new File([bytes], value.name, { type: value.mimeType }));
}
export async function acknowledgeOpenedDocument(id: string): Promise<void> { await nativeCall<void>("acknowledge_document", { id }); }
export async function listenOpenedDocuments(handler: () => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event"); return listen("ferby-documents-pending", handler);
}

export async function closeWorkspace(): Promise<void> { await nativeCall<void>("close_workspace", {}); }
export async function readLocalArchive(): Promise<string | null> { return nativeCall<string | null>("read_local_archive", {}); }
export async function writeLocalArchive(raw: string): Promise<boolean> { return nativeCall<boolean>("write_local_archive", { raw }); }
export function supportsNativeOutput(): boolean { return isTauri(); }
export interface ExportDestination { folderLabel: string | null; basename: string }
function destinationView(value: unknown): ExportDestination {
  if (!value || typeof value !== "object") throw new TypeError("Invalid export destination.");
  const view = value as ExportDestination;
  if ((view.folderLabel !== null && (typeof view.folderLabel !== "string" || view.folderLabel.length > 1024)) ||
      typeof view.basename !== "string" || !view.basename.trim() || view.basename.length > 160 || /[\\/\u0000-\u001f\u007f]/.test(view.basename)) throw new TypeError("Invalid export destination.");
  return { folderLabel: view.folderLabel, basename: view.basename };
}
export async function readExportDestination(): Promise<ExportDestination> {
  if (!isTauri()) return { folderLabel: null, basename: "Capture" };
  return destinationView(await nativeCall<unknown>("read_export_destination", {}));
}
export async function chooseExportDirectory(): Promise<ExportDestination> { return destinationView(await nativeCall<unknown>("choose_export_directory", {})); }
export async function updateExportDestination(basename: string | null, clearFolder: boolean): Promise<ExportDestination> {
  return destinationView(await nativeCall<unknown>("update_export_destination", { basename, clearFolder }));
}
export async function prepareImageDrag(document: ImageDocument): Promise<string> {
  const pngBase64 = await rasterizeDocument(document);
  return nativeCall<string>("prepare_drag_image", { request: { pngBase64, name: safeExportName(document.name, "png", 60) } });
}
export async function startPreparedDrag(token: string): Promise<boolean> { return nativeCall<boolean>("start_prepared_drag", { token }); }
export async function discardPreparedDrag(token: string): Promise<void> { await nativeCall<void>("discard_prepared_drag", { token }); }
export async function openPrintPreview(document: ImageDocument, options: PrintSheetOptions): Promise<string> {
  const validated = parsePrintPreferencesJson(serializePrintPreferencesJson(options));
  if (validated.imageWidth !== document.width || validated.imageHeight !== document.height) throw new RangeError("Print source dimensions changed.");
  const pngBase64 = await rasterizeDocument(document);
  return nativeCall<string>("open_print_preview", { request: { pngBase64, options: validated } });
}
export async function readPrintPreview(): Promise<{ image: ImageDocument; options: PrintSheetOptions }> {
  const wire = await nativeCall<{ image: ImagePayload; options: PrintSheetOptions }>("get_print_preview", {});
  const options = parsePrintPreferencesJson(JSON.stringify({ version: 1, print: { ...wire.options, scaleMode: wire.options.scaleMode ?? "fit" } }));
  if (options.imageWidth !== wire.image.width || options.imageHeight !== wire.image.height) throw new RangeError("Print preview dimensions do not match.");
  return { image: documentFromPayload(wire.image, "Print preview.png"), options };
}
export async function requestPrintDialog(): Promise<void> { await nativeCall<void>("print_preview", {}); }
export async function closePrintPreview(): Promise<void> { await nativeCall<void>("close_print_preview", {}); }
export async function readNativeShortcuts(): Promise<unknown> { return nativeCall<unknown>("get_shortcuts", {}); }
export async function readSavedNativeShortcuts(): Promise<unknown> { return nativeCall<unknown>("load_saved_shortcuts", {}); }
export async function saveNativeShortcuts(bindings: Readonly<Record<string, string | null>>): Promise<unknown> { return nativeCall<unknown>("save_shortcut_preferences", { bindings }); }
export async function applyNativeShortcuts(bindings: Readonly<Record<string, string | null>>): Promise<unknown> { return nativeCall<unknown>("apply_shortcuts", { bindings }); }
export async function listenGlobalActions(handler: (action: unknown) => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  return listen<unknown>("ferby-global-action", event => handler(event.payload));
}
export async function listenWorkspaceMenu(handler: (action: unknown) => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  return listen<unknown>("ferby-menu-action", event => handler(event.payload));
}
export interface PendingDeepLink { id: string; url: string }
export async function readLinkPolicy(): Promise<boolean> {
  if (!isTauri()) return false;
  const value = await nativeCall<unknown>("read_link_policy", {});
  if (typeof value !== "boolean") throw new TypeError("Invalid native link policy."); return value;
}
export async function saveLinkPolicy(enabled: boolean): Promise<boolean> {
  if (typeof enabled !== "boolean") throw new TypeError("Expected a link-policy boolean.");
  const value = await nativeCall<unknown>("save_link_policy", { enabled });
  if (value !== enabled) throw new TypeError("Native link policy did not apply."); return enabled;
}
export async function readPendingDeepLinks(): Promise<readonly PendingDeepLink[]> {
  if (!isTauri()) return [];
  const value = await nativeCall<unknown>("read_pending_deep_links", {});
  if (!Array.isArray(value) || value.length > 16 || !value.every(item => item &&
    typeof item.id === "string" && /^native-link-[0-9]{1,20}$/.test(item.id) &&
    typeof item.url === "string" && item.url.length <= 2048)) throw new TypeError("Invalid pending link response.");
  return value as PendingDeepLink[];
}
export async function acknowledgeDeepLink(id: string): Promise<void> {
  await nativeCall<void>("acknowledge_deep_links", { ids: [id] });
}
export async function listenForDeepLinks(handler: () => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  return listen("ferby-deep-links-pending", handler);
}
export async function setWorkspaceOnTop(enabled: boolean): Promise<void> {
  if (typeof enabled !== "boolean") throw new TypeError("Expected window on-top flag.");
  await nativeCall<void>("set_workspace_on_top", { enabled });
}
export async function setMenuBarIcon(enabled: boolean): Promise<void> {
  if (typeof enabled !== "boolean") throw new TypeError("Expected menu bar visibility flag.");
  await nativeCall<void>("set_menu_bar_icon", { enabled });
}
export async function readLoginState(): Promise<{ enabled: boolean; supported: boolean }> {
  if (!isTauri()) return { enabled: false, supported: false };
  const value = await nativeCall<{ enabled: boolean; supported: boolean }>("read_login_state", {});
  if (!value || typeof value.enabled !== "boolean" || typeof value.supported !== "boolean") throw new TypeError("Invalid native login state.");
  return value;
}
export async function setLaunchAtLogin(enabled: boolean): Promise<boolean> {
  if (typeof enabled !== "boolean") throw new TypeError("Expected a launch-at-login boolean.");
  const actual = await nativeCall<unknown>("set_launch_at_login", { enabled });
  if (actual !== enabled) throw new Error("The login setting was not applied.");
  return enabled;
}
export async function notifyCaptureCompleted(action: "opened" | "copied" | "saved"): Promise<void> {
  await nativeCall<void>("notify_capture_completed", { action });
}

export interface ImagePayload { pngBase64: string; width: number; height: number; byteSize: number; displayScale?: number | null }
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
  return (await captureImageWithScale(mode)).image;
}

export async function readCaptureDisplay(): Promise<DisplayGeometry> {
  const value = await nativeCall<DisplayGeometry>("capture_display", {});
  if (!value || typeof value.id !== "string" || !value.id || value.id.length > 256
      || ![value.x, value.y].every(Number.isSafeInteger)
      || ![value.width, value.height].every(n => Number.isSafeInteger(n) && n > 0)
      || !Number.isFinite(value.scale) || value.scale <= 0 || value.scale > 8) {
    throw new NativeOperationError("display_unavailable", "Invalid display metadata.");
  }
  return { ...value };
}
export async function beginAutoScroll(display: DisplayGeometry, region: CaptureArea): Promise<string> {
  return nativeCall<string>("begin_auto_scroll", { request: { display, ...region } });
}
export async function advanceAutoScroll(token: string, pixels: number): Promise<void> { await nativeCall<void>("advance_auto_scroll", { token, pixels }); }
export async function endAutoScroll(token: string): Promise<void> { await nativeCall<void>("end_auto_scroll", { token }); }

export async function stitchCapturedFrames(frames: readonly ImageDocument[], options: { reverseDirection: boolean; maxHeight: number }, signal: AbortSignal): Promise<ImageDocument> {
  const check = () => { if (signal.aborted) throw new NativeOperationError("cancelled", "Frame collection cancelled."); };
  check();
  if (!frames.length || frames.length > 64 || !Number.isInteger(options.maxHeight)
      || options.maxHeight < 400 || options.maxHeight > 32768) throw new RangeError("Invalid stitch request.");
  const framesPngBase64: string[] = [];
  let encodedSize = 0;
  for (const frame of frames) {
    check();
    const encoded = await rasterizeDocument(frame);
    check();
    encodedSize += encoded.length;
    if (encodedSize > MAX_BASE64_LENGTH) throw new RangeError("Combined frames exceed the 32 MiB image budget.");
    framesPngBase64.push(encoded);
  }
  check();
  const payload = await nativeCall<ImagePayload>("stitch_images", { request: { framesPngBase64, ...options } });
  check();
  return documentFromPayload(payload, `Scroll-${Date.now()}.png`);
}

export async function applyImageEffect(document: ImageDocument, effect: PixelEffectRequest): Promise<ImageDocument> {
  const { rect } = effect;
  if (![rect.x, rect.y, rect.width, rect.height].every(Number.isSafeInteger)
      || rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1
      || rect.x + rect.width > document.width || rect.y + rect.height > document.height
      || rect.width * rect.height > 4_194_304) throw new RangeError("Invalid effect region.");
  if (effect.kind === "blur" && (!Number.isInteger(effect.radius) || effect.radius < 1 || effect.radius > 64)) throw new RangeError("Invalid blur radius.");
  if (effect.kind === "mosaic" && (!Number.isInteger(effect.blockSize) || effect.blockSize < 2 || effect.blockSize > 128)) throw new RangeError("Invalid mosaic block size.");
  if (effect.kind === "solidCover" && ![effect.color.r, effect.color.g, effect.color.b, effect.color.a].every(n => Number.isInteger(n) && n >= 0 && n <= 255)) throw new RangeError("Invalid effect color.");
  const pngBase64 = await rasterizeDocument(document);
  return documentFromPayload(await nativeCall<ImagePayload>("apply_image_effect", { request: { pngBase64, effect } }),
    safeExportName(`${document.name.replace(/\.[^.]+$/, "")}-${effect.kind}`, "png", 60));
}

export async function captureImageWithScale(mode: CaptureMode): Promise<{ image: ImageDocument; displayScale: number | null }> {
  const payload = await nativeCall<ImagePayload>("capture_image", { mode });
  const scale = payload?.displayScale ?? null;
  if (scale !== null && (typeof scale !== "number" || !Number.isFinite(scale) || scale <= 0 || scale > 8)) throw new NativeOperationError("invalid_payload", "The capture display scale is invalid.");
  return { image: documentFromPayload(payload, `Capture-${Date.now()}.png`), displayScale: scale };
}
export async function captureActiveWindow(): Promise<{ image: ImageDocument; displayScale: null }> {
  const payload = await nativeCall<ImagePayload>("capture_active_window", {});
  return { image: documentFromPayload(payload, `Active-window-${Date.now()}.png`), displayScale: null };
}
export async function captureRegion(display: DisplayGeometry, region: CaptureArea): Promise<{ image: ImageDocument; displayScale: number }> {
  const payload = await nativeCall<ImagePayload>("capture_region", { request: { display, region } });
  if (payload.width !== region.width || payload.height !== region.height || payload.displayScale !== display.scale) {
    throw new NativeOperationError("display_changed", "Captured region does not match the requested display geometry.");
  }
  return { image: documentFromPayload(payload, `Region-${Date.now()}.png`), displayScale: display.scale };
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

export async function readApplicationPreferences(): Promise<Readonly<FerbyAppPreferences>> {
  if (!isTauri()) return { ...DEFAULT_APP_PREFERENCES, baseSettings: { ...DEFAULT_SETTINGS } };
  try {
    const preferences = await nativeCall<unknown>("load_application_preferences", {});
    return parseAppPreferencesJson(JSON.stringify({ version: 1, preferences }));
  } catch (err) {
    try {
      const base = await readPreferences();
      return { ...DEFAULT_APP_PREFERENCES, baseSettings: base };
    } catch {
      throw err;
    }
  }
}

export async function saveApplicationPreferences(preferences: FerbyAppPreferences): Promise<Readonly<FerbyAppPreferences>> {
  requireDesktop();
  const validated = parseAppPreferencesJson(serializeAppPreferencesJson(preferences));
  try {
    const saved = await nativeCall<unknown>("save_application_preferences", { preferences: validated });
    return parseAppPreferencesJson(JSON.stringify({ version: 1, preferences: saved }));
  } catch (err) {
    try {
      const base = await savePreferences(validated.baseSettings);
      return { ...validated, baseSettings: base };
    } catch {
      throw err;
    }
  }
}
export async function readRecognitionPreferences(): Promise<Readonly<RecognitionPreferences>> {
  if (!isTauri()) return DEFAULT_RECOGNITION_PREFERENCES;
  const recognition = await nativeCall<unknown>("load_recognition_preferences", {});
  return parseRecognitionPreferencesJson(JSON.stringify({ version: 1, recognition }));
}
export async function saveRecognitionPreferences(preferences: RecognitionPreferences): Promise<Readonly<RecognitionPreferences>> {
  const validated = parseRecognitionPreferencesJson(serializeRecognitionPreferencesJson(preferences));
  const recognition = await nativeCall<unknown>("save_recognition_preferences", { preferences: validated });
  return parseRecognitionPreferencesJson(JSON.stringify({ version: 1, recognition }));
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

export async function readRecognitionLanguages(): Promise<unknown> {
  return nativeCall<unknown>("recognition_languages", {});
}

export async function recognizeRaster(request: Readonly<VisionPortRequest>): Promise<unknown> {
  requireDesktop();
  if (!(request.imageBytes instanceof Uint8Array) || !request.imageBytes.length || request.imageBytes.length > MAX_NATIVE_BYTES) throw new NativeOperationError("recognition_limit", "Recognition image exceeds bounds.");
  const chunks: string[] = [];
  for (let offset = 0; offset < request.imageBytes.length; offset += 8192) {
    chunks.push(String.fromCharCode(...request.imageBytes.subarray(offset, offset + 8192)));
  }
  const pngBase64 = btoa(chunks.join(""));
  return nativeCall<unknown>("recognize_image", { request: { pngBase64, mode: request.mode, languages: [...request.languages], preserveLineBreaks: request.preserveLineBreaks, maxResults: request.maxResults } });
}

export async function copyRecognizedText(text: string): Promise<void> {
  if (typeof text !== "string" || !text || text.length > 256 * 1024 || new TextEncoder().encode(text).length > 256 * 1024) throw new NativeOperationError("recognition_limit", "Choose bounded recognized text to copy.");
  await nativeCall<void>("copy_recognized_text", { request: { text } });
}
