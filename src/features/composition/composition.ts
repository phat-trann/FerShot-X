export const MAX_COMPOSITION_DIMENSION = 16_384;
export const MAX_COMPOSITION_PIXELS = 16_777_216;
export const MAX_COMPOSITION_LAYERS = 32;
export const DEFAULT_SNAP_THRESHOLD_PX = 8;

/**
 * Deterministic FerShot geometric edge/center snapping rule:
 * Evaluates candidate left/right/centerX against canvas boundaries [0, canvasWidth]
 * and peer layer edges [x, x + width, x + width / 2]. Chooses the smallest absolute
 * delta within `thresholdPx` (ties broken by smaller target coordinate).
 * Note: This is a FerShot design rule, not a claim of a recovered reference application similarity algorithm.
 */
export const FERSHOT_EDGE_SNAPPING_RULE =
  "Nearest edge/center within thresholdPx (ties broken by smaller coordinate); geometric only, no pixel-similarity matching.";

export interface PlacementBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SnapResult {
  readonly x: number;
  readonly y: number;
  readonly snappedX: boolean;
  readonly snappedY: boolean;
}

export interface PlacedImageLayer extends PlacementBox {
  readonly id: string;
  readonly source: CanvasImageSource;
  readonly zIndex: number;
  readonly opacity?: number;
}

export interface CompositionOptions {
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly backgroundColor?: string | null;
  readonly layers: readonly PlacedImageLayer[];
  readonly signal?: AbortSignal;
  readonly onLayerPlaced?: (layerId: string) => void;
}

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function snapAxis(
  pos: number,
  size: number,
  targets: readonly number[],
  threshold: number,
): { value: number; snapped: boolean } {
  const anchors = [
    { offset: 0, coord: pos },
    { offset: size, coord: pos + size },
    { offset: size / 2, coord: pos + size / 2 },
  ];

  let bestDeltaAbs = threshold + 1;
  let bestTarget = Number.POSITIVE_INFINITY;
  let bestNewPos = pos;
  let snapped = false;

  for (const target of targets) {
    for (const anchor of anchors) {
      const dist = Math.abs(target - anchor.coord);
      if (
        dist <= threshold &&
        (dist < bestDeltaAbs || (dist === bestDeltaAbs && target < bestTarget))
      ) {
        bestDeltaAbs = dist;
        bestTarget = target;
        bestNewPos = target - anchor.offset;
        snapped = true;
      }
    }
  }

  return { value: Math.round(bestNewPos), snapped };
}

export function snapPlacementToEdges(
  candidate: PlacementBox,
  peers: readonly PlacementBox[],
  canvasWidth: number,
  canvasHeight: number,
  thresholdPx: number = DEFAULT_SNAP_THRESHOLD_PX,
): SnapResult {
  if (
    !Number.isFinite(canvasWidth) ||
    !Number.isFinite(canvasHeight) ||
    canvasWidth <= 0 ||
    canvasHeight <= 0
  ) {
    throw new Error("Canvas dimensions must be finite positive numbers.");
  }
  if (
    !Number.isFinite(candidate.x) ||
    !Number.isFinite(candidate.y) ||
    !Number.isFinite(candidate.width) ||
    !Number.isFinite(candidate.height) ||
    candidate.width <= 0 ||
    candidate.height <= 0
  ) {
    throw new Error("Candidate placement must have finite coordinates and positive size.");
  }
  if (!Number.isFinite(thresholdPx) || thresholdPx < 0 || thresholdPx > 128) {
    throw new Error("Snap threshold must be between 0 and 128 pixels.");
  }

  const xTargets: number[] = [0, canvasWidth, canvasWidth / 2];
  const yTargets: number[] = [0, canvasHeight, canvasHeight / 2];

  for (const peer of peers) {
    xTargets.push(peer.x, peer.x + peer.width, peer.x + peer.width / 2);
    yTargets.push(peer.y, peer.y + peer.height, peer.y + peer.height / 2);
  }

  const sx = snapAxis(candidate.x, candidate.width, xTargets, thresholdPx);
  const sy = snapAxis(candidate.y, candidate.height, yTargets, thresholdPx);

  const clampedX = Math.min(
    Math.max(0, sx.value),
    Math.max(0, canvasWidth - candidate.width),
  );
  const clampedY = Math.min(
    Math.max(0, sy.value),
    Math.max(0, canvasHeight - candidate.height),
  );

  return Object.freeze({
    x: clampedX,
    y: clampedY,
    snappedX: sx.snapped,
    snappedY: sy.snapped,
  });
}

export function sortLayersByZOrder(
  layers: readonly PlacedImageLayer[],
): readonly PlacedImageLayer[] {
  return Object.freeze(
    layers
      .map((layer, index) => ({ layer, index }))
      .sort((a, b) => {
        if (a.layer.zIndex !== b.layer.zIndex) {
          return a.layer.zIndex - b.layer.zIndex;
        }
        return a.index - b.index;
      })
      .map((entry) => entry.layer),
  );
}

export function validateCompositionOptions(options: CompositionOptions): void {
  const { canvasWidth, canvasHeight, backgroundColor, layers } = options;
  if (
    !Number.isSafeInteger(canvasWidth) ||
    !Number.isSafeInteger(canvasHeight) ||
    canvasWidth < 1 ||
    canvasHeight < 1 ||
    canvasWidth > MAX_COMPOSITION_DIMENSION ||
    canvasHeight > MAX_COMPOSITION_DIMENSION ||
    canvasWidth * canvasHeight > MAX_COMPOSITION_PIXELS
  ) {
    throw new Error(
      `Invalid composition canvas dimensions (${canvasWidth}x${canvasHeight}).`,
    );
  }

  if (
    backgroundColor !== undefined &&
    backgroundColor !== null &&
    !HEX_COLOR_RE.test(backgroundColor)
  ) {
    throw new Error(`Invalid composition backgroundColor: ${backgroundColor}`);
  }

  if (
    !Array.isArray(layers) ||
    layers.length === 0 ||
    layers.length > MAX_COMPOSITION_LAYERS
  ) {
    throw new Error(
      `Composition requires between 1 and ${MAX_COMPOSITION_LAYERS} layers.`,
    );
  }

  for (const layer of layers) {
    if (!layer || typeof layer.id !== "string" || layer.id.trim() === "") {
      throw new Error("Every placed layer requires a non-empty id.");
    }
    if (!layer.source) {
      throw new Error(`Layer "${layer.id}" is missing an image source.`);
    }
    if (
      !Number.isFinite(layer.x) ||
      !Number.isFinite(layer.y) ||
      !Number.isFinite(layer.width) ||
      !Number.isFinite(layer.height) ||
      layer.width <= 0 ||
      layer.height <= 0 ||
      layer.x < 0 ||
      layer.y < 0 ||
      layer.x + layer.width > canvasWidth ||
      layer.y + layer.height > canvasHeight
    ) {
      throw new Error(
        `Layer "${layer.id}" placement is out of canvas bounds.`,
      );
    }
    if (!Number.isFinite(layer.zIndex)) {
      throw new Error(`Layer "${layer.id}" zIndex must be finite.`);
    }
    if (
      layer.opacity !== undefined &&
      (!Number.isFinite(layer.opacity) ||
        layer.opacity < 0.05 ||
        layer.opacity > 1)
    ) {
      throw new Error(
        `Layer "${layer.id}" opacity must be between 0.05 and 1.`,
      );
    }
  }
}

export function renderCompositionToCanvas(
  options: CompositionOptions,
  target?: HTMLCanvasElement,
): HTMLCanvasElement {
  if (options.signal?.aborted) {
    throw new Error("Multi-image composition was cancelled.");
  }
  validateCompositionOptions(options);

  const {
    canvasWidth,
    canvasHeight,
    backgroundColor,
    layers,
    signal,
    onLayerPlaced,
  } = options;

  const canvas = target ?? document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable for multi-image composition.");
  }

  if (backgroundColor) {
    ctx.save();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  }

  const ordered = sortLayersByZOrder(layers);
  for (const layer of ordered) {
    if (signal?.aborted) {
      throw new Error("Multi-image composition was cancelled.");
    }
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.drawImage(layer.source, layer.x, layer.y, layer.width, layer.height);
    ctx.restore();
    onLayerPlaced?.(layer.id);
  }

  return canvas;
}

export async function renderCompositionToPngBlob(options: CompositionOptions): Promise<Blob> {
  const canvas = renderCompositionToCanvas(options);
  const { signal } = options;
  return new Promise<Blob>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Multi-image composition was cancelled."));
      return;
    }
    canvas.toBlob((blob) => {
      if (signal?.aborted) {
        reject(new Error("Multi-image composition was cancelled."));
        return;
      }
      if (!blob) {
        reject(new Error("Failed to encode multi-image composition to PNG Blob."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

