import type { ImageDocument } from "../contracts/media";
import { renderAutoAdjustedCanvas, type AutoAdjustOptions } from "../features/auto-adjust";
import { assertImageDimensions, MAX_NATIVE_BYTES } from "./image-limits";

export async function autoAdjustDocument(image: ImageDocument, options: AutoAdjustOptions): Promise<ImageDocument> {
  assertImageDimensions(image.width, image.height);
  const source = new Image(); source.src = image.src; await source.decode();
  if (source.naturalWidth !== image.width || source.naturalHeight !== image.height) throw new RangeError("Image dimensions changed.");
  const { canvas } = renderAutoAdjustedCanvas({ source, width: image.width, height: image.height, options });
  try {
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => {
      if (result) resolve(result); else reject(new Error("Adjusted PNG could not be encoded."));
    }, "image/png"));
    if (!blob.size || blob.size > MAX_NATIVE_BYTES) throw new RangeError("Adjusted PNG exceeds the output budget.");
    return { id: crypto.randomUUID(), name: `Adjusted-${Date.now()}.png`, src: URL.createObjectURL(blob),
      width: image.width, height: image.height, mimeType: "image/png", byteSize: blob.size };
  } finally { canvas.width = 0; canvas.height = 0; }
}
