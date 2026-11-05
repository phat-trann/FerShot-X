import type { Annotation } from "../contracts/editor";
import type { ImageDocument } from "../contracts/media";
import { renderAnnotationsToPngBlob } from "../features/editor/render";
import { safeExportName } from "../features/export/names";
import { MAX_NATIVE_BYTES } from "./image-limits";

export async function renderAnnotatedDocument(document: ImageDocument, annotations: readonly Annotation[]): Promise<ImageDocument> {
  for (const annotation of annotations) {
    if (!/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(annotation.style.color)) {
      throw new RangeError("Choose a valid hexadecimal annotation color.");
    }
  }
  const blob = await renderAnnotationsToPngBlob({ source: document.src, width: document.width,
    height: document.height, annotations: annotations.filter((annotation) => annotation.style.opacity !== 0) });
  if (blob.size > MAX_NATIVE_BYTES) throw new RangeError("The annotated image is too large to process.");
  return { ...document, id: crypto.randomUUID(), name: safeExportName(`${document.name.replace(/\.[^.]+$/, "")}-merged`, "png", 60),
    src: URL.createObjectURL(blob), mimeType: "image/png", byteSize: blob.size };
}

export async function withAnnotations<T>(document: ImageDocument, annotations: readonly Annotation[], use: (image: ImageDocument) => Promise<T>): Promise<T> {
  if (!annotations.length) return use(document);
  const rendered = await renderAnnotatedDocument(document, annotations);
  try { return await use({ ...rendered, id: document.id, name: document.name }); }
  finally { URL.revokeObjectURL(rendered.src); }
}
