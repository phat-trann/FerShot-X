import { rgbToHex } from "../features/color/color";
import type { Rgba } from "../features/pixel-sample";
import { copyText } from "./native";

export type ColorCopyFormat = "hex" | "rgb" | "rgba";
export function formatColorForCopy(color: Rgba, format: ColorCopyFormat): string {
  if (!color || ![color.r, color.g, color.b, color.a].every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255)) {
    throw new RangeError("Expected four integer RGBA channels from0 to255.");
  }
  if (format === "hex") return rgbToHex(color.r, color.g, color.b);
  if (format === "rgb") return `rgb(${color.r}, ${color.g}, ${color.b})`;
  if (format === "rgba") return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
  throw new TypeError("Unsupported color copy format.");
}

/** Explicit user intent only; uses the existing restricted native text clipboard boundary. */
export async function copyColor(color: Rgba, format: ColorCopyFormat): Promise<void> {
  await copyText(formatColorForCopy(color, format));
}
