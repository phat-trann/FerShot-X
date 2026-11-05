export type QrPayloadCategory = "http" | "https" | "mailto" | "plain" | "unsupported";

export interface ClassifiedQrPayload {
  readonly text: string;
  readonly category: QrPayloadCategory;
}

const MAX_PAYLOAD_LENGTH = 1_000_000;
const SCHEME_PATTERN = /^([a-z][a-z\d+.-]*):/i;

export function classifyQrPayload(text: string): ClassifiedQrPayload {
  if (typeof text !== "string") throw new TypeError("QR payload must be a string");
  if (text.length > MAX_PAYLOAD_LENGTH) throw new RangeError("QR payload is too large");
  if (/[\u0000-\u001f\u007f]/.test(text)) throw new TypeError("QR payload contains control characters");

  const candidate = text.trim();
  const scheme = candidate.match(SCHEME_PATTERN)?.[1].toLowerCase();
  const category: QrPayloadCategory = scheme === undefined ? "plain" :
    scheme === "http" ? "http" :
    scheme === "https" ? "https" :
    scheme === "mailto" ? "mailto" : "unsupported";
  return { text, category };
}
