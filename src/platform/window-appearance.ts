import type { ImageDocument } from "../contracts/media";
import { renderWindowAppearanceToCanvas, type ShadowTrimInsets } from "../features/window-appearance";
import { safeExportName } from "../features/export/names";
import { assertImageDimensions, MAX_IMPORTED_BYTES } from "./image-limits";

export interface WindowAppearanceOptions {
  readonly background: { readonly kind: "transparent" } | { readonly kind: "solid"; readonly color: string };
  readonly shadowTrim?: ShadowTrimInsets;
}

/** Caller supplies actual pixels; no inferred capture provenance or automatic shadow heuristic. */
export async function applyWindowAppearance(source: ImageDocument, options: WindowAppearanceOptions): Promise<ImageDocument> {
  assertImageDimensions(source.width, source.height);
  const image = new Image(); image.src = source.src; await image.decode();
  if (image.naturalWidth !== source.width || image.naturalHeight !== source.height) throw new Error("Source dimensions changed.");
  const canvas = renderWindowAppearanceToCanvas({ windowSource: image, windowWidth: source.width, windowHeight: source.height,
    background: options.background, shadowTrim: options.shadowTrim });
  try {
    assertImageDimensions(canvas.width, canvas.height);
    const width = canvas.width, height = canvas.height;
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Window appearance encoding failed.")), "image/png"));
    if (!blob.size || blob.size > MAX_IMPORTED_BYTES) throw new RangeError("Window appearance output exceeds import limits.");
    return { id: crypto.randomUUID(), name: safeExportName(`${source.name.replace(/\.[^.]+$/, "")}-window`, "png"), src: URL.createObjectURL(blob),
      width, height, mimeType: "image/png", byteSize: blob.size };
  } finally { canvas.width = 0; canvas.height = 0; }
}
