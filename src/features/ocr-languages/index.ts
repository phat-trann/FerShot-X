const MAX_LANGUAGES = 64;
const MAX_IDENTIFIER_LENGTH = 32;

export function validateOcrLanguages(
  requested: readonly string[],
  supported: readonly string[],
): string[] {
  if (!Array.isArray(requested) || !Array.isArray(supported)) {
    throw new TypeError("language lists must be arrays");
  }
  if (requested.length > MAX_LANGUAGES || supported.length > MAX_LANGUAGES) {
    throw new RangeError("too many language identifiers");
  }

  const normalize = (value: string): string => {
    if (typeof value !== "string" || value.length === 0 || value.length > MAX_IDENTIFIER_LENGTH) {
      throw new TypeError("language identifiers must be non-empty strings of at most 32 characters");
    }
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized.length > MAX_IDENTIFIER_LENGTH) {
      throw new TypeError("language identifiers must be non-empty strings of at most 32 characters");
    }
    return normalized;
  };

  const supportedSet = new Set(supported.map(normalize));
  const result: string[] = [];
  const seen = new Set<string>();
  for (const language of requested) {
    const normalized = normalize(language);
    if (!supportedSet.has(normalized)) throw new RangeError(`unsupported OCR language: ${language}`);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}
