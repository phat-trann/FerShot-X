import {
  computePrintSheetLayout,
  type PrintOrientation,
  type PrintPaperPreset,
  type PrintScaleMode,
  type PrintSheetOptions,
} from "../local-output/local-output";

const MAX_UTF8_BYTES = 16_384;
const utf8 = new TextEncoder();
const keys = [
  "imageWidth",
  "imageHeight",
  "paper",
  "orientation",
  "marginPt",
  "scaleMode",
] as const;

export interface PrintPreferencesSidecarV1 {
  readonly version: 1;
  readonly print: PrintSheetOptions;
}

function reject(message: string): never {
  throw new TypeError(message);
}

function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    reject(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function parseOptions(value: unknown): Readonly<PrintSheetOptions> {
  const options = object(value, "print");
  for (const key of Object.keys(options)) {
    if (!keys.includes(key as (typeof keys)[number])) {
      reject(`print contains unknown field "${key}"`);
    }
  }
  for (const key of keys.slice(0, 5)) {
    if (!(key in options)) reject(`print.${key} is required`);
  }
  if (
    typeof options.imageWidth !== "number" ||
    !Number.isSafeInteger(options.imageWidth) ||
    typeof options.imageHeight !== "number" ||
    !Number.isSafeInteger(options.imageHeight)
  ) {
    reject("print image dimensions must be safe integers");
  }
  if (options.paper !== "a4" && options.paper !== "letter") {
    reject("print.paper is invalid");
  }
  if (
    options.orientation !== "portrait" &&
    options.orientation !== "landscape"
  ) {
    reject("print.orientation is invalid");
  }
  if (
    typeof options.marginPt !== "number" ||
    !Number.isFinite(options.marginPt)
  ) {
    reject("print.marginPt must be finite");
  }
  if (
    "scaleMode" in options &&
    options.scaleMode !== undefined &&
    options.scaleMode !== "fit" &&
    options.scaleMode !== "actual"
  ) {
    reject("print.scaleMode is invalid");
  }
  const parsed = {
    imageWidth: options.imageWidth,
    imageHeight: options.imageHeight,
    paper: options.paper as PrintPaperPreset,
    orientation: options.orientation as PrintOrientation,
    marginPt: options.marginPt,
    ...("scaleMode" in options && options.scaleMode !== undefined
      ? { scaleMode: options.scaleMode as PrintScaleMode }
      : {}),
  } satisfies PrintSheetOptions;
  computePrintSheetLayout(parsed);
  return Object.freeze(parsed);
}

export function parsePrintPreferencesJson(
  raw: string,
): Readonly<PrintSheetOptions> {
  if (typeof raw !== "string" || utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(`Print preferences exceed ${MAX_UTF8_BYTES} UTF-8 bytes`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new TypeError(
      `Invalid print preferences JSON: ${error instanceof Error ? error.message : "parse failure"}`,
    );
  }
  const envelope = object(parsed, "print preferences envelope");
  if (
    Object.keys(envelope).some(
      (key) => key !== "version" && key !== "print",
    )
  ) {
    reject("print preferences envelope contains unknown fields");
  }
  if (envelope.version !== 1) {
    throw new RangeError("Unsupported print preferences schema version");
  }
  return parseOptions(envelope.print);
}

export function serializePrintPreferencesJson(
  options: PrintSheetOptions,
): string {
  const print = parseOptions(options);
  const raw = JSON.stringify({ version: 1, print });
  if (utf8.encode(raw).byteLength > MAX_UTF8_BYTES) {
    throw new RangeError(`Print preferences exceed ${MAX_UTF8_BYTES} UTF-8 bytes`);
  }
  return raw;
}

export const PRINT_PREFERENCES_CODEC_LIMITS = Object.freeze({
  maxUtf8Bytes: MAX_UTF8_BYTES,
});
