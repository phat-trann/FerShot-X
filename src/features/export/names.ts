export type ExportFormat = "png" | "jpeg";

const extensionPattern = /\.(?:png|jpe?g)$/i;

export function safeExportName(input: string, format: ExportFormat, maxLength = 120): string {
  if (format !== "png" && format !== "jpeg") throw new TypeError("format must be png or jpeg");
  if (!Number.isInteger(maxLength) || maxLength < 1) throw new RangeError("maxLength must be a positive integer");

  const sanitized = input.replace(/[\/\\\u0000-\u001f\u007f]/g, "_").trim();
  if (!sanitized || /^\.+$/.test(sanitized)) throw new TypeError("name must contain a non-dot character");

  const base = sanitized.replace(extensionPattern, "").replace(extensionPattern, "");
  const extension = `.${format === "jpeg" ? "jpg" : "png"}`;
  const available = maxLength - Array.from(extension).length;
  if (available < 1) throw new RangeError("maxLength is too short for the extension");

  const boundedBase = Array.from(base).slice(0, available).join("").replace(/\.+$/, "");
  if (!boundedBase || /^\.+$/.test(boundedBase)) throw new TypeError("name must contain a non-dot character");
  return `${boundedBase}${extension}`;
}
