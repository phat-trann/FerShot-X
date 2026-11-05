const UNITS = ["B", "KiB", "MiB", "GiB"] as const;

export function formatByteSize(bytes: number): string {
  if (!Number.isSafeInteger(bytes) || bytes < 0) throw new RangeError("bytes must be a nonnegative safe integer");
  let value = bytes; let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) { value /= 1024; unit += 1; }
  const rounded = unit === 0 ? String(value) : value.toFixed(1).replace(/\.0$/, "");
  return `${rounded} ${UNITS[unit]}`;
}
