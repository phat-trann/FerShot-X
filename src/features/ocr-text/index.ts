const MAX_OCR_TEXT_LENGTH = 1_000_000;

export function normalizeOcrText(text: string): string {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (text.length > MAX_OCR_TEXT_LENGTH) throw new RangeError("OCR text is too large");
  return text.replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/^(?:\n)+|(?:\n)+$/g, "");
}
