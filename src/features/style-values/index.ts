import type { AnnotationStyle } from "../../contracts/editor";

const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
const MAX_STROKE_WIDTH = 1000;

export function validateAnnotationStyle(style: AnnotationStyle): AnnotationStyle {
  if (typeof style !== "object" || style === null ||
      typeof style.color !== "string" || !HEX_COLOR.test(style.color) ||
      typeof style.strokeWidth !== "number" || !Number.isFinite(style.strokeWidth) ||
      style.strokeWidth <= 0 || style.strokeWidth > MAX_STROKE_WIDTH ||
      typeof style.opacity !== "number" || !Number.isFinite(style.opacity) ||
      style.opacity < 0 || style.opacity > 1) {
    throw new RangeError("invalid annotation style");
  }
  return {
    color: style.color,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
  };
}
