export interface PinOptions {
  scale: number;
  opacity: number;
}

export const DEFAULT_PIN_OPTIONS: Readonly<PinOptions> = Object.freeze({ scale: 1, opacity: 1 });

function normalize(value: unknown, min: number, max: number, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return Math.min(max, Math.max(min, value));
}

export function normalizePinOptions(value: Partial<PinOptions> = {}): PinOptions {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("options must be an object");
  }
  return {
    scale: normalize(value.scale === undefined ? DEFAULT_PIN_OPTIONS.scale : value.scale, 0.1, 4, "scale"),
    opacity: normalize(value.opacity === undefined ? DEFAULT_PIN_OPTIONS.opacity : value.opacity, 0.1, 1, "opacity"),
  };
}
