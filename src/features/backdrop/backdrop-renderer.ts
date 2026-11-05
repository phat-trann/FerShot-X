export const MAX_BACKDROP_DIMENSION = 16_384;
export const MAX_BACKDROP_PIXELS = 16_777_216;
export const MAX_BACKDROP_INSET = 512;
export const MAX_BACKDROP_CORNER_RADIUS = 256;
export const MAX_BACKDROP_SHADOW_BLUR = 64;
export const MAX_BACKDROP_SHADOW_OFFSET = 64;
export const MAX_BACKDROP_PLACEMENT_OFFSET = 512;

export type BackdropFill =
  | {
      readonly kind: "solid";
      readonly color: string;
    }
  | {
      readonly kind: "linear-gradient";
      readonly startColor: string;
      readonly endColor: string;
      readonly angleDeg: number;
    }
  | {
      readonly kind: "radial-gradient";
      readonly innerColor: string;
      readonly outerColor: string;
    }
  | {
      readonly kind: "image";
      readonly source: CanvasImageSource;
    };

export interface BackdropShadowOptions {
  readonly blur: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly color: string;
}

export interface BackdropRenderOptions {
  readonly source: CanvasImageSource;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly inset: number;
  readonly cornerRadius: number;
  readonly aspectRatio?: number | null;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly recenter?: boolean;
  readonly fill: BackdropFill;
  readonly shadow?: BackdropShadowOptions | null;
}

export interface BackdropLayout {
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly drawX: number;
  readonly drawY: number;
}

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function assertHexColor(color: string, label: string): void {
  if (typeof color !== "string" || !HEX_COLOR_RE.test(color)) {
    throw new Error(`Invalid ${label} hex color: ${String(color)}`);
  }
}

export function validateBackdropOptions(options: BackdropRenderOptions): void {
  const {
    sourceWidth,
    sourceHeight,
    inset,
    cornerRadius,
    aspectRatio,
    offsetX = 0,
    offsetY = 0,
    fill,
    shadow,
  } = options;

  if (
    !Number.isSafeInteger(sourceWidth) ||
    !Number.isSafeInteger(sourceHeight) ||
    sourceWidth < 1 ||
    sourceHeight < 1 ||
    sourceWidth > MAX_BACKDROP_DIMENSION ||
    sourceHeight > MAX_BACKDROP_DIMENSION
  ) {
    throw new Error(
      `Invalid source dimensions (${sourceWidth}x${sourceHeight}).`,
    );
  }

  if (
    !Number.isSafeInteger(inset) ||
    inset < 0 ||
    inset > MAX_BACKDROP_INSET
  ) {
    throw new Error(
      `Backdrop inset must be an integer between 0 and ${MAX_BACKDROP_INSET}.`,
    );
  }

  if (
    !Number.isFinite(cornerRadius) ||
    cornerRadius < 0 ||
    cornerRadius > MAX_BACKDROP_CORNER_RADIUS
  ) {
    throw new Error(
      `Backdrop cornerRadius must be between 0 and ${MAX_BACKDROP_CORNER_RADIUS}.`,
    );
  }

  if (aspectRatio !== undefined && aspectRatio !== null) {
    if (
      !Number.isFinite(aspectRatio) ||
      aspectRatio < 0.1 ||
      aspectRatio > 10
    ) {
      throw new Error("Backdrop aspectRatio must be between 0.1 and 10.");
    }
  }

  if (
    !Number.isFinite(offsetX) ||
    !Number.isFinite(offsetY) ||
    Math.abs(offsetX) > MAX_BACKDROP_PLACEMENT_OFFSET ||
    Math.abs(offsetY) > MAX_BACKDROP_PLACEMENT_OFFSET
  ) {
    throw new Error(
      `Backdrop offsets must be within ±${MAX_BACKDROP_PLACEMENT_OFFSET}.`,
    );
  }

  if (!fill) {
    throw new Error("Backdrop fill is required.");
  }
  if (fill.kind === "solid") {
    assertHexColor(fill.color, "solid fill");
  } else if (fill.kind === "linear-gradient") {
    assertHexColor(fill.startColor, "linear-gradient startColor");
    assertHexColor(fill.endColor, "linear-gradient endColor");
    if (!Number.isFinite(fill.angleDeg)) {
      throw new Error("Linear gradient angleDeg must be finite.");
    }
  } else if (fill.kind === "radial-gradient") {
    assertHexColor(fill.innerColor, "radial-gradient innerColor");
    assertHexColor(fill.outerColor, "radial-gradient outerColor");
  } else if (fill.kind === "image") {
    if (!fill.source) {
      throw new Error("Backdrop image fill requires a caller-owned source.");
    }
  } else {
    throw new Error("Unsupported backdrop fill kind.");
  }

  if (shadow !== undefined && shadow !== null) {
    if (
      !Number.isFinite(shadow.blur) ||
      shadow.blur < 0 ||
      shadow.blur > MAX_BACKDROP_SHADOW_BLUR
    ) {
      throw new Error(
        `Shadow blur must be between 0 and ${MAX_BACKDROP_SHADOW_BLUR}.`,
      );
    }
    if (
      !Number.isFinite(shadow.offsetX) ||
      !Number.isFinite(shadow.offsetY) ||
      Math.abs(shadow.offsetX) > MAX_BACKDROP_SHADOW_OFFSET ||
      Math.abs(shadow.offsetY) > MAX_BACKDROP_SHADOW_OFFSET
    ) {
      throw new Error(
        `Shadow offsets must be within ±${MAX_BACKDROP_SHADOW_OFFSET}.`,
      );
    }
    assertHexColor(shadow.color, "shadow");
  }
}

export function planBackdropLayout(
  options: BackdropRenderOptions,
): BackdropLayout {
  validateBackdropOptions(options);
  const {
    sourceWidth,
    sourceHeight,
    inset,
    aspectRatio,
    offsetX = 0,
    offsetY = 0,
    recenter = false,
  } = options;

  let canvasWidth = sourceWidth + inset * 2;
  let canvasHeight = sourceHeight + inset * 2;

  if (aspectRatio !== undefined && aspectRatio !== null) {
    const currentRatio = canvasWidth / canvasHeight;
    if (currentRatio < aspectRatio) {
      canvasWidth = Math.max(canvasWidth, Math.round(canvasHeight * aspectRatio));
    } else if (currentRatio > aspectRatio) {
      canvasHeight = Math.max(
        canvasHeight,
        Math.round(canvasWidth / aspectRatio),
      );
    }
  }

  if (
    canvasWidth > MAX_BACKDROP_DIMENSION ||
    canvasHeight > MAX_BACKDROP_DIMENSION ||
    canvasWidth * canvasHeight > MAX_BACKDROP_PIXELS
  ) {
    throw new Error(
      `Computed backdrop dimensions (${canvasWidth}x${canvasHeight}) exceed supported limits.`,
    );
  }

  const centerX = Math.round((canvasWidth - sourceWidth) / 2);
  const centerY = Math.round((canvasHeight - sourceHeight) / 2);
  const effectiveOffsetX = recenter ? 0 : Math.round(offsetX);
  const effectiveOffsetY = recenter ? 0 : Math.round(offsetY);

  const drawX = Math.min(
    Math.max(0, centerX + effectiveOffsetX),
    canvasWidth - sourceWidth,
  );
  const drawY = Math.min(
    Math.max(0, centerY + effectiveOffsetY),
    canvasHeight - sourceHeight,
  );

  return Object.freeze({
    canvasWidth,
    canvasHeight,
    drawX,
    drawY,
  });
}

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  if (r === 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export async function renderBackdropToPngBlob(
  options: BackdropRenderOptions,
): Promise<Blob> {
  const layout = planBackdropLayout(options);
  const { canvasWidth, canvasHeight, drawX, drawY } = layout;
  const { source, sourceWidth, sourceHeight, cornerRadius, fill, shadow } =
    options;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable for backdrop composition.");
  }

  // 1. Render backdrop fill
  ctx.save();
  if (fill.kind === "solid") {
    ctx.fillStyle = fill.color;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (fill.kind === "linear-gradient") {
    const rad = (fill.angleDeg * Math.PI) / 180;
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const halfDiag = Math.hypot(canvasWidth, canvasHeight) / 2;
    const x0 = cx - Math.cos(rad) * halfDiag;
    const y0 = cy - Math.sin(rad) * halfDiag;
    const x1 = cx + Math.cos(rad) * halfDiag;
    const y1 = cy + Math.sin(rad) * halfDiag;
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, fill.startColor);
    grad.addColorStop(1, fill.endColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (fill.kind === "radial-gradient") {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const maxR = Math.hypot(cx, cy);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    grad.addColorStop(0, fill.innerColor);
    grad.addColorStop(1, fill.outerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (fill.kind === "image") {
    ctx.drawImage(fill.source, 0, 0, canvasWidth, canvasHeight);
  }
  ctx.restore();

  // 2. Render bounded shadow behind card if requested
  if (shadow && (shadow.blur > 0 || shadow.offsetX !== 0 || shadow.offsetY !== 0)) {
    ctx.save();
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.fillStyle = shadow.color;
    traceRoundedRect(ctx, drawX, drawY, sourceWidth, sourceHeight, cornerRadius);
    ctx.fill();
    ctx.restore();
  }

  // 3. Clip to rounded rectangle and draw foreground source image
  ctx.save();
  traceRoundedRect(ctx, drawX, drawY, sourceWidth, sourceHeight, cornerRadius);
  ctx.clip();
  ctx.drawImage(source, drawX, drawY, sourceWidth, sourceHeight);
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode backdrop canvas to PNG Blob."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

