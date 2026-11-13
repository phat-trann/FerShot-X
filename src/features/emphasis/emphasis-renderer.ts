import {drawMagnifier} from "./magnifier";
import type { Point, Rect } from "../../contracts/editor";

export const MAX_EMPHASIS_DIMENSION = 16_384;
export const MAX_EMPHASIS_PIXELS = 16_777_216;
export const MAX_EMPHASIS_EFFECTS = 64;

export interface HighlightEffect {
  readonly id: string;
  readonly kind: "highlight";
  readonly rect: Rect;
  readonly color: string;
  readonly opacity: number;
}

export interface SpotlightEffect {
  readonly id: string;
  readonly kind: "spotlight";
  readonly cutoutRect: Rect;
  readonly dimOpacity: number;
}

export interface MagnifierEffect {
  readonly id: string;
  readonly kind: "magnifier";
  readonly center: Point;
  readonly radius: number;
  readonly radiusY?: number;
  readonly sourceCenter?: Point;
  readonly zoom: number;
  readonly borderColor: string;
  readonly borderWidth: number;
}

export type EmphasisEffect =
  | HighlightEffect
  | SpotlightEffect
  | MagnifierEffect;

export interface RenderEmphasisOptions {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  readonly effects: readonly EmphasisEffect[];
}

export const EMPHASIS_CONTRACT_PROPOSAL = Object.freeze({
  proposedTools: Object.freeze([
    "highlight",
    "spotlight",
    "magnifier",
  ] as const),
  rationale:
    "Highlight, spotlight, and magnifier require rect/cutout/lens parameters; Codex C12 can extend AnnotationTool and Annotation in src/contracts/editor.ts to integrate these emphasis layers.",
});

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function assertValidRect(
  rect: Rect,
  imageWidth: number,
  imageHeight: number,
  label: string,
): void {
  if (
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.x < 0 ||
    rect.y < 0 ||
    rect.x + rect.width > imageWidth ||
    rect.y + rect.height > imageHeight
  ) {
    throw new Error(`Invalid or out-of-bounds ${label} rectangle.`);
  }
}

export function validateEmphasisOptions(options: RenderEmphasisOptions): void {
  const { width, height, effects } = options;
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_EMPHASIS_DIMENSION ||
    height > MAX_EMPHASIS_DIMENSION ||
    width * height > MAX_EMPHASIS_PIXELS
  ) {
    throw new Error(
      `Invalid emphasis canvas dimensions (${width}x${height}).`,
    );
  }

  if (!Array.isArray(effects) || effects.length > MAX_EMPHASIS_EFFECTS) {
    throw new Error(
      `Effects count exceeds maximum of ${MAX_EMPHASIS_EFFECTS}.`,
    );
  }

  for (const effect of effects) {
    if (!effect || typeof effect.id !== "string" || effect.id.trim() === "") {
      throw new Error("Every emphasis effect requires a non-empty id.");
    }
    if (effect.kind === "highlight") {
      assertValidRect(effect.rect, width, height, "highlight");
      if (!HEX_COLOR_RE.test(effect.color)) {
        throw new Error(`Invalid highlight hex color: ${effect.color}`);
      }
      if (
        !Number.isFinite(effect.opacity) ||
        effect.opacity < 0.05 ||
        effect.opacity > 0.9
      ) {
        throw new Error("Highlight opacity must be between 0.05 and 0.9.");
      }
    } else if (effect.kind === "spotlight") {
      assertValidRect(effect.cutoutRect, width, height, "spotlight cutout");
      if (
        !Number.isFinite(effect.dimOpacity) ||
        effect.dimOpacity < 0.1 ||
        effect.dimOpacity > 0.95
      ) {
        throw new Error("Spotlight dimOpacity must be between 0.1 and 0.95.");
      }
    } else if (effect.kind === "magnifier") {
      if(effect.radiusY!==undefined&&(!Number.isFinite(effect.radiusY)||effect.radiusY<4||effect.radiusY>512))throw new Error("Invalid magnifier vertical radius.");
      if(effect.sourceCenter&&(!Number.isFinite(effect.sourceCenter.x)||!Number.isFinite(effect.sourceCenter.y)||effect.sourceCenter.x<0||effect.sourceCenter.y<0||effect.sourceCenter.x>width||effect.sourceCenter.y>height))throw new Error("Magnifier source must be within image bounds.");
      if (
        !Number.isFinite(effect.center.x) ||
        !Number.isFinite(effect.center.y) ||
        effect.center.x < 0 ||
        effect.center.y < 0 ||
        effect.center.x > width ||
        effect.center.y > height
      ) {
        throw new Error("Magnifier center must be within image bounds.");
      }
      if (
        !Number.isFinite(effect.radius) ||
        effect.radius < 4 ||
        effect.radius > 512
      ) {
        throw new Error("Magnifier radius must be between 4 and 512.");
      }
      if (
        !Number.isFinite(effect.zoom) ||
        effect.zoom < 1.25 ||
        effect.zoom > 8
      ) {
        throw new Error("Magnifier zoom must be between 1.25 and 8.");
      }
      if (!HEX_COLOR_RE.test(effect.borderColor)) {
        throw new Error(`Invalid magnifier borderColor: ${effect.borderColor}`);
      }
      if (
        !Number.isFinite(effect.borderWidth) ||
        effect.borderWidth < 1 ||
        effect.borderWidth > 16
      ) {
        throw new Error("Magnifier borderWidth must be between 1 and 16.");
      }
    } else {
      throw new Error(
        `Unsupported emphasis effect kind: ${String((effect as { kind?: unknown }).kind)}`,
      );
    }
  }
}

export async function renderEmphasisToPngBlob(
  options: RenderEmphasisOptions,
): Promise<Blob> {
  validateEmphasisOptions(options);
  const { source, width, height, effects } = options;

  // Keep an immutable pristine copy of the source raster for lens/spotlight sampling
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseCtx = baseCanvas.getContext("2d");
  if (!baseCtx) {
    throw new Error("2D canvas context unavailable for emphasis base raster.");
  }
  baseCtx.drawImage(source, 0, 0, width, height);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable for emphasis output.");
  }
  ctx.drawImage(baseCanvas, 0, 0, width, height);

  for (const effect of effects) {
    if (effect.kind === "highlight") {
      ctx.save();
      ctx.globalAlpha = effect.opacity;
      ctx.fillStyle = effect.color;
      ctx.fillRect(
        effect.rect.x,
        effect.rect.y,
        effect.rect.width,
        effect.rect.height,
      );
      ctx.restore();
    } else if (effect.kind === "spotlight") {
      const { x, y, width: cw, height: ch } = effect.cutoutRect;
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${effect.dimOpacity})`;
      // Top band
      if (y > 0) {
        ctx.fillRect(0, 0, width, y);
      }
      // Bottom band
      if (y + ch < height) {
        ctx.fillRect(0, y + ch, width, height - (y + ch));
      }
      // Left band
      if (x > 0) {
        ctx.fillRect(0, y, x, ch);
      }
      // Right band
      if (x + cw < width) {
        ctx.fillRect(x + cw, y, width - (x + cw), ch);
      }
      ctx.restore();
    } else if (effect.kind === "magnifier") {
      drawMagnifier(ctx,baseCanvas,effect);
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode emphasis canvas to PNG Blob."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

