import type { CaptureMode } from "../../contracts/media";

export type FerbyIntent =
  | { readonly kind: "capture"; readonly mode: CaptureMode; readonly requiresConfirmation: true }
  | { readonly kind: "editor"; readonly imageId: string; readonly requiresConfirmation: true };

const MAX_LENGTH = 2048;
const MODES = new Set<CaptureMode>(["fullscreen", "area", "window"]);

function oneParameter(params: URLSearchParams, name: string): string {
  const values = params.getAll(name);
  if (values.length !== 1 || !values[0]) throw new TypeError(`exactly one ${name} is required`);
  return values[0];
}

export function parseFerbyIntent(input: string): FerbyIntent {
  if (typeof input !== "string") throw new TypeError("deep link must be a string");
  if (input.length === 0 || input.length > MAX_LENGTH) throw new RangeError("deep link is invalid or too large");
  let url: URL;
  try { url = new URL(input); } catch { throw new TypeError("malformed deep link"); }
  if (url.protocol !== "ferby:" || url.username || url.password || url.port || url.hash ||
      !["", "/"].includes(url.pathname) || !["capture", "editor"].includes(url.hostname)) {
    throw new TypeError("unsupported Ferby deep link");
  }
  const params = url.searchParams;
  const names = [...params.keys()];
  if (new Set(names).size !== names.length) throw new TypeError("duplicate parameters are not allowed");
  if (url.hostname === "capture") {
    if (names.length !== 1 || names[0] !== "mode") throw new TypeError("unknown capture parameters");
    const mode = oneParameter(params, "mode") as CaptureMode;
    if (!MODES.has(mode)) throw new TypeError("unsupported capture mode");
    return { kind: "capture", mode, requiresConfirmation: true };
  }
  if (names.length !== 1 || names[0] !== "imageId") throw new TypeError("unknown editor parameters");
  const imageId = oneParameter(params, "imageId");
  if (imageId.includes("/") || imageId === "." || imageId === ".." || /[\u0000-\u001f\u007f]/.test(imageId)) {
    throw new TypeError("unsafe image ID");
  }
  return { kind: "editor", imageId, requiresConfirmation: true };
}
