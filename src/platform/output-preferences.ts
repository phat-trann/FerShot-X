import type { ImageDocument } from "../contracts/media";
import type { AppSettings } from "../contracts/settings";
import { planOutputSize } from "../features/output-size";
import { transformImage } from "./native";

/** Apply explicit capture metadata only; imported/area/window scale is never guessed from dimensions. */
export async function withOutputPreferences<T>(document: ImageDocument, settings: Readonly<AppSettings>, displayScale: number | null | undefined, use: (output: ImageDocument) => Promise<T>): Promise<T> {
  if (!settings.downscaleRetina || displayScale == null || displayScale <= 1) return use(document);
  const size = planOutputSize(document.width, document.height, displayScale, true);
  if (size.width === document.width && size.height === document.height) return use(document);
  const resized = await transformImage(document, { resize: size });
  try { return await use({ ...resized, id: document.id, name: document.name }); }
  finally { URL.revokeObjectURL(resized.src); }
}
