import { isTauri } from "@tauri-apps/api/core";
import type { ImageDocument } from "../contracts/media";
import { createVisionBackendAdapter } from "../features/vision-backend-adapter";
import { RecognitionController } from "../features/recognition-workflow";
import { NativeOperationError, rasterizeDocument, readRecognitionLanguages, recognizeRaster } from "./native";

function checkAbort(signal: AbortSignal): void {
  if (signal.aborted) { const error = new Error("Recognition cancelled."); error.name = "AbortError"; throw error; }
}

export async function discoverRecognitionLanguages(signal: AbortSignal): Promise<readonly string[]> {
  return createVisionBackendAdapter({
    resolve: async () => { throw new Error("Language discovery has no image source."); },
    recognize: async () => { throw new Error("Language discovery cannot recognize an image."); },
    languages: async () => readRecognitionLanguages(),
  }).languages(signal);
}

/** Normalize the selected raster before binding byteSize/revision; imported JPEG/WebP/GIF sizes are not PNG sizes. */
export async function createRecognitionSession(document: ImageDocument, revision: number, signal: AbortSignal, languages: readonly string[]): Promise<RecognitionController> {
  if (!isTauri()) throw new NativeOperationError("desktop_required", "Open the desktop app to recognize text or QR codes.");
  checkAbort(signal);
  const encoded = await rasterizeDocument(document);
  checkAbort(signal);
  const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  const source = Object.freeze({ id: document.id, revision, width: document.width, height: document.height, byteSize: bytes.length });
  const backend = createVisionBackendAdapter({
    resolve: async () => ({ source, bytes, release: () => undefined }),
    languages: async () => [...languages],
    recognize: async (request, operation) => {
      checkAbort(operation);
      const response = await recognizeRaster(request);
      checkAbort(operation);
      return response;
    },
  });
  const controller = new RecognitionController(backend);
  controller.select(source);
  await controller.loadLanguages();
  checkAbort(signal);
  return controller;
}
