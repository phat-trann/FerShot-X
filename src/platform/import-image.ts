import type { ImageDocument } from "../contracts/media";
import { assertImageDimensions, ImageLimitError, MAX_IMPORTED_BYTES } from "./image-limits";
function imageMime(header: Uint8Array): string | null {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => header[index] === value)) return "image/png";
  if (header[0] === 255 && header[1] === 216 && header[2] === 255) return "image/jpeg";
  const text = String.fromCharCode(...header);
  if (text.startsWith("GIF87a") || text.startsWith("GIF89a")) return "image/gif";
  if (text.startsWith("RIFF") && text.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function importImage(file: File): Promise<ImageDocument> {
  if (!file.size || file.size > MAX_IMPORTED_BYTES) throw new Error("Choose a nonempty image no larger than 20 MB.");
  const mimeType = imageMime(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!mimeType) throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
  const src = URL.createObjectURL(new Blob([file], { type: mimeType }));
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    assertImageDimensions(image.naturalWidth, image.naturalHeight);
    return { id: crypto.randomUUID(), name: file.name, src, width: image.naturalWidth,
      height: image.naturalHeight, mimeType, byteSize: file.size };
  } catch (error) {
    URL.revokeObjectURL(src);
    if (error instanceof ImageLimitError) throw error;
    throw new Error("This image could not be opened. Try another file.");
  }
}
