const MAX_LABEL_LENGTH = 256;
const MAX_AFFIX_LENGTH = 96;

export function formatCounterLabel(counter: number, prefix = "", suffix = ""): string {
  if (!Number.isSafeInteger(counter) || counter < 1) {
    throw new RangeError("counter must be a positive safe integer");
  }
  if (typeof prefix !== "string" || typeof suffix !== "string") {
    throw new TypeError("prefix and suffix must be strings");
  }
  if (prefix.length > MAX_AFFIX_LENGTH || suffix.length > MAX_AFFIX_LENGTH) {
    throw new RangeError("prefix and suffix are too long");
  }
  const label = `${prefix}${counter}${suffix}`;
  if (label.length > MAX_LABEL_LENGTH) throw new RangeError("counter label is too long");
  return label;
}
