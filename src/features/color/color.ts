export interface Rgb {
  r: number;
  g: number;
  b: number;
}

function assertChannel(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(`${name} must be an integer from 0 to 255`);
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  assertChannel(r, "r");
  assertChannel(g, "g");
  assertChannel(b, "b");
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string): Rgb {
  if (typeof hex !== "string" || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) {
    throw new TypeError("hex must be #RGB or #RRGGBB");
  }

  const value = hex.slice(1);
  const expanded = value.length === 3 ? value.replace(/./g, (digit) => `${digit}${digit}`) : value;
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}
