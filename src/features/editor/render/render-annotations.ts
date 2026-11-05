import type {
  Annotation,
  AnnotationTool,
  Point,
} from "../../../contracts/editor";
import { assertImageDimensions } from "../../../platform/image-limits";

export const MAX_RENDER_ANNOTATIONS = 500;
export const MAX_POINTS_PER_ANNOTATION = 4096;
export const MAX_TOTAL_RENDER_POINTS = 32768;
export const MAX_STROKE_WIDTH = 256;

export type SupportedRenderTool = "rectangle" | "arrow" | "pen";

export const SUPPORTED_RENDER_TOOLS: readonly SupportedRenderTool[] = [
  "rectangle",
  "arrow",
  "pen",
];

const SUPPORTED_SET = new Set<AnnotationTool>(SUPPORTED_RENDER_TOOLS);

export type RenderImageSource =
  | Blob
  | ImageData
  | ImageBitmap
  | HTMLImageElement
  | HTMLCanvasElement
  | string;

export interface RenderAnnotatedImageOptions {
  readonly source: RenderImageSource;
  readonly width: number;
  readonly height: number;
  readonly annotations: readonly Annotation[];
}

export function isSupportedRenderTool(
  tool: AnnotationTool,
): tool is SupportedRenderTool {
  return SUPPORTED_SET.has(tool);
}

export function computeArrowHeadVertices(
  start: Point,
  end: Point,
  strokeWidth: number,
): readonly [Point, Point, Point] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const headLength = Math.max(10, strokeWidth * 4);
  const spread = Math.PI / 6;

  const wing1: Point = {
    x: end.x - headLength * Math.cos(angle - spread),
    y: end.y - headLength * Math.sin(angle - spread),
  };
  const wing2: Point = {
    x: end.x - headLength * Math.cos(angle + spread),
    y: end.y - headLength * Math.sin(angle + spread),
  };

  return [end, wing1, wing2];
}

export function validateRenderOptions(
  options: RenderAnnotatedImageOptions,
): void {
  assertImageDimensions(options.width, options.height);

  if (!Array.isArray(options.annotations)) {
    throw new TypeError("Annotations must be an array.");
  }
  if (options.annotations.length > MAX_RENDER_ANNOTATIONS) {
    throw new RangeError(
      `Too many annotations (${options.annotations.length}); maximum is ${MAX_RENDER_ANNOTATIONS}.`,
    );
  }

  let totalPoints = 0;

  for (const annotation of options.annotations) {
    if (!annotation.id || !annotation.id.trim()) {
      throw new RangeError("Every annotation requires a non-empty id.");
    }
    if (!isSupportedRenderTool(annotation.tool)) {
      throw new RangeError(
        `Unsupported annotation tool "${annotation.tool}"; only rectangle, arrow, and pen are supported by the bitmap renderer.`,
      );
    }

    const minPoints = annotation.tool === "pen" ? 1 : 2;
    if (
      !Array.isArray(annotation.points) ||
      annotation.points.length < minPoints
    ) {
      throw new RangeError(
        `Annotation "${annotation.id}" (${annotation.tool}) requires at least ${minPoints} point(s).`,
      );
    }
    if (annotation.points.length > MAX_POINTS_PER_ANNOTATION) {
      throw new RangeError(
        `Annotation "${annotation.id}" exceeds maximum point count (${MAX_POINTS_PER_ANNOTATION}).`,
      );
    }

    totalPoints += annotation.points.length;
    if (totalPoints > MAX_TOTAL_RENDER_POINTS) {
      throw new RangeError(
        `Total annotation points exceed maximum budget (${MAX_TOTAL_RENDER_POINTS}).`,
      );
    }

    for (const pt of annotation.points) {
      if (
        !Number.isFinite(pt.x) ||
        !Number.isFinite(pt.y) ||
        pt.x < 0 ||
        pt.y < 0 ||
        pt.x > options.width ||
        pt.y > options.height
      ) {
        throw new RangeError(
          `Annotation "${annotation.id}" has out-of-bounds or non-finite point (${pt.x}, ${pt.y}) for ${options.width}x${options.height} image.`,
        );
      }
    }

    const { style } = annotation;
    if (!style || typeof style.color !== "string" || !style.color.trim()) {
      throw new RangeError(
        `Annotation "${annotation.id}" requires a non-empty color string.`,
      );
    }
    if (
      !Number.isFinite(style.strokeWidth) ||
      style.strokeWidth <= 0 ||
      style.strokeWidth > MAX_STROKE_WIDTH
    ) {
      throw new RangeError(
        `Annotation "${annotation.id}" has invalid strokeWidth (${style.strokeWidth}).`,
      );
    }
    if (
      !Number.isFinite(style.opacity) ||
      style.opacity <= 0 ||
      style.opacity > 1
    ) {
      throw new RangeError(
        `Annotation "${annotation.id}" has invalid opacity (${style.opacity}); expected (0, 1].`,
      );
    }
  }
}

async function drawBaseImage(
  ctx: CanvasRenderingContext2D,
  source: RenderImageSource,
  width: number,
  height: number,
): Promise<void> {
  if (typeof ImageData !== "undefined" && source instanceof ImageData) {
    if (source.width !== width || source.height !== height) {
      throw new RangeError(
        `ImageData dimensions (${source.width}x${source.height}) do not match target (${width}x${height}).`,
      );
    }
    ctx.putImageData(source, 0, 0);
    return;
  }

  if (typeof Blob !== "undefined" && source instanceof Blob) {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(source);
      try {
        if (bitmap.width !== width || bitmap.height !== height) {
          throw new RangeError(
            `Source Blob dimensions (${bitmap.width}x${bitmap.height}) do not match target (${width}x${height}).`,
          );
        }
        ctx.drawImage(bitmap, 0, 0, width, height);
      } finally {
        bitmap.close();
      }
      return;
    }
  }

  if (typeof source === "string") {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error("Failed to decode source image URL."));
      element.src = source;
    });
    if (img.naturalWidth !== width || img.naturalHeight !== height) {
      throw new RangeError(
        `Decoded image dimensions (${img.naturalWidth}x${img.naturalHeight}) do not match target (${width}x${height}).`,
      );
    }
    ctx.drawImage(img, 0, 0, width, height);
    return;
  }

  if (
    (typeof HTMLCanvasElement !== "undefined" &&
      source instanceof HTMLCanvasElement) ||
    (typeof HTMLImageElement !== "undefined" &&
      source instanceof HTMLImageElement) ||
    (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap)
  ) {
    const srcW =
      "naturalWidth" in source ? source.naturalWidth : source.width;
    const srcH =
      "naturalHeight" in source ? source.naturalHeight : source.height;
    if (srcW !== width || srcH !== height) {
      throw new RangeError(
        `Source element dimensions (${srcW}x${srcH}) do not match target (${width}x${height}).`,
      );
    }
    ctx.drawImage(source, 0, 0, width, height);
    return;
  }

  throw new TypeError("Unsupported image source for bitmap rendering.");
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
): void {
  const { tool, points, style } = annotation;
  ctx.save();
  try {
    ctx.globalAlpha = style.opacity;
    ctx.strokeStyle = style.color;
    ctx.fillStyle = style.color;
    ctx.lineWidth = style.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "rectangle") {
      const first = points[0];
      const last = points[points.length - 1] ?? first;
      const x = Math.min(first.x, last.x);
      const y = Math.min(first.y, last.y);
      const w = Math.abs(last.x - first.x);
      const h = Math.abs(last.y - first.y);
      ctx.strokeRect(x, y, w, h);
      return;
    }

    if (tool === "arrow") {
      const first = points[0];
      const last = points[points.length - 1] ?? first;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();

      const [tip, wing1, wing2] = computeArrowHeadVertices(
        first,
        last,
        style.strokeWidth,
      );
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(wing1.x, wing1.y);
      ctx.lineTo(wing2.x, wing2.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if (tool === "pen") {
      const first = points[0];
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(
          first.x,
          first.y,
          Math.max(1, style.strokeWidth / 2),
          0,
          Math.PI * 2,
        );
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i += 1) {
        const pt = points[i];
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  } finally {
    ctx.restore();
  }
}

export async function renderAnnotationsToPngBlob(
  options: RenderAnnotatedImageOptions,
): Promise<Blob> {
  validateRenderOptions(options);

  if (typeof document === "undefined") {
    throw new Error(
      "renderAnnotationsToPngBlob requires a browser DOM canvas environment.",
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to acquire 2D rendering context.");
  }

  await drawBaseImage(ctx, options.source, options.width, options.height);

  for (const annotation of options.annotations) {
    drawAnnotation(ctx, annotation);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas PNG encoding failed."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

