import type { ImageDocument } from "../contracts/media";
import { assertImageDimensions, ImageLimitError, MAX_IMPORTED_BYTES } from "./image-limits";
const SUPPORTED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function importImage(file: File): Promise<ImageDocument> {
  if (!SUPPORTED.has(file.type)) throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
  if (file.size > MAX_IMPORTED_BYTES) throw new Error("Choose an image no larger than 20 MB.");
  const src = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    assertImageDimensions(image.naturalWidth, image.naturalHeight);
    return { id: crypto.randomUUID(), name: file.name, src, width: image.naturalWidth,
      height: image.naturalHeight, mimeType: file.type, byteSize: file.size };
  } catch (error) {
    URL.revokeObjectURL(src);
    if (error instanceof ImageLimitError) throw error;
    throw new Error("This image could not be opened. Try another file.");
  }
}
