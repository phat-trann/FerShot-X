import type { ImageDocument } from "../contracts/media";
import { planLayoutWorkspaceSummary, type LayoutWorkspaceConfig } from "../features/layout-workspace";
import { renderCompositionToPngBlob } from "../features/composition";
import { renderBackdropToPngBlob } from "../features/backdrop";
import { assertImageDimensions, MAX_NATIVE_BYTES } from "./image-limits";

export interface LayoutLayerPlan {
  readonly id: string; readonly x: number; readonly y: number;
  readonly width: number; readonly height: number; readonly zIndex: number; readonly opacity: number;
}
export interface WorkspaceLayoutPlan {
  readonly canvasWidth: number; readonly canvasHeight: number; readonly displayScale: number;
  readonly layers: readonly LayoutLayerPlan[]; readonly backdrop: LayoutWorkspaceConfig["backdrop"];
  readonly backdropImageId?: string;
}

export async function composeWorkspaceLayout(plan: WorkspaceLayoutPlan, images: readonly ImageDocument[], prepare: (image: ImageDocument) => Promise<ImageBitmap>): Promise<ImageDocument> {
  const config: LayoutWorkspaceConfig = { ...plan, layers: plan.layers.map(layer => ({ ...layer, source: {} as CanvasImageSource })) };
  const summary = planLayoutWorkspaceSummary(config);
  assertImageDimensions(summary.outputWidthPx, summary.outputHeightPx);
  const ids = new Set<string>();
  let pixels = 0;
  const inputs = plan.layers.map(layer => {
    const image = images.find(image => image.id === layer.id);
    if (!image || ids.has(layer.id)) throw new RangeError("A layout source is missing or duplicated.");
    ids.add(layer.id); pixels += image.width * image.height;
    if (pixels > 16_777_216) throw new RangeError("Combined layout source pixels exceed 16 megapixels.");
    return image;
  });
  let backdropIndex: number | null = null;
  if (plan.backdropImageId !== undefined) {
    if (!plan.backdrop) throw new RangeError("A background image requires an enabled backdrop.");
    backdropIndex = inputs.findIndex(image => image.id === plan.backdropImageId);
    if (backdropIndex < 0) {
      const background = images.find(image => image.id === plan.backdropImageId);
      if (!background) throw new RangeError("Backdrop source is unavailable.");
      pixels += background.width * background.height;
      if (pixels > 16_777_216) throw new RangeError("Combined layout source pixels exceed 16 megapixels.");
      backdropIndex = inputs.length; inputs.push(background);
    }
  }
  const owned: ImageBitmap[] = [];
  try {
    for (const input of inputs) {
      const bitmap = await prepare(input); owned.push(bitmap);
      if (bitmap.width !== input.width || bitmap.height !== input.height) throw new RangeError("Layout source dimensions changed.");
    }
    const composed = await renderCompositionToPngBlob({ canvasWidth: plan.canvasWidth, canvasHeight: plan.canvasHeight,
      layers: plan.layers.map((layer, i) => ({ ...layer, source: owned[i] })) });
    let output = composed;
    if (plan.backdrop) {
      const bitmap = await createImageBitmap(composed); owned.push(bitmap);
      output = await renderBackdropToPngBlob({ source: bitmap, sourceWidth: plan.canvasWidth,
        sourceHeight: plan.canvasHeight, ...plan.backdrop,
        ...(backdropIndex === null ? {} : { fill: { kind: "image" as const, source: owned[backdropIndex] } }) });
    }
    if (!output.size || output.size > MAX_NATIVE_BYTES) throw new RangeError("Layout PNG exceeds the output budget.");
    return { id: crypto.randomUUID(), name: `Layout-${Date.now()}.png`, width: summary.outputWidthPx,
      height: summary.outputHeightPx, mimeType: "image/png", byteSize: output.size, src: URL.createObjectURL(output) };
  } finally { for (const bitmap of owned) bitmap.close(); }
}
