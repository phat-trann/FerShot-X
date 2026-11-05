import type { ImageDocument } from "../../contracts/media";

export type ImageSortMode = "name-asc" | "name-desc" | "original";

export function sortSessionImages(images: readonly ImageDocument[], mode: ImageSortMode): ImageDocument[] {
  if (mode === "original") return [...images];
  if (mode !== "name-asc" && mode !== "name-desc") throw new TypeError("invalid sort mode");
  return images.map((image, index) => ({ image, index }))
    .sort((a, b) => {
      const comparison = a.image.name.toLowerCase() < b.image.name.toLowerCase() ? -1 :
        a.image.name.toLowerCase() > b.image.name.toLowerCase() ? 1 : 0;
      return (mode === "name-desc" ? -comparison : comparison) || a.index - b.index;
    }).map(({ image }) => image);
}
