import type { ImageDocument } from "../contracts/media";
const MAX_BYTES = 20 * 1024 * 1024;
const SUPPORTED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function importImage(file: File): Promise<ImageDocument> {
  if (!SUPPORTED.has(file.type)) throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
  if (file.size > MAX_BYTES) throw new Error("Choose an image smaller than 20 MB.");
  const src = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Invalid dimensions");
    return { id: crypto.randomUUID(), name: file.name, src, width: image.naturalWidth,
      height: image.naturalHeight, mimeType: file.type, byteSize: file.size };
  } catch {
    URL.revokeObjectURL(src);
    throw new Error("This image could not be opened. Try another file.");
  }
}
