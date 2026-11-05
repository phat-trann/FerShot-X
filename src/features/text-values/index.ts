export type TextAlignment = "left" | "center" | "right";
export interface TextOptions {
  text: string;
  fontSize: number;
  alignment: TextAlignment;
}

const MAX_TEXT_CHARACTERS = 10_000;
const MAX_TEXT_BYTES = 40_000;
const MAX_FONT_SIZE = 512;

export function normalizeTextOptions(options: TextOptions): TextOptions {
  if (typeof options !== "object" || options === null || typeof options.text !== "string" ||
      typeof options.fontSize !== "number" || !Number.isFinite(options.fontSize) ||
      options.fontSize <= 0 || options.fontSize > MAX_FONT_SIZE ||
      !["left", "center", "right"].includes(options.alignment)) {
    throw new TypeError("invalid text options");
  }
  if (Array.from(options.text).length > MAX_TEXT_CHARACTERS ||
      new TextEncoder().encode(options.text).length > MAX_TEXT_BYTES) {
    throw new RangeError("text is too long");
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(options.text)) {
    throw new TypeError("text contains unsupported control characters");
  }
  return {
    text: options.text,
    fontSize: options.fontSize,
    alignment: options.alignment,
  };
}
