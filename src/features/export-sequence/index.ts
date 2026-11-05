import { safeExportName, type ExportFormat } from "../export/names";

const MAX_ATTEMPTS = 1000;

export function generateExportNameSequence(
  baseName: string,
  format: ExportFormat,
  startSuffix = 0,
  maxAttempts = 10,
): string[] {
  if (!Number.isSafeInteger(startSuffix) || startSuffix < 0 ||
      !Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS) {
    throw new RangeError("invalid suffix or attempt limit");
  }
  const withoutExtension = baseName.replace(/\.(?:png|jpe?g)$/i, "");
  const result: string[] = [];
  for (let index = 0; index < maxAttempts; index += 1) {
    const suffix = startSuffix + index;
    if (!Number.isSafeInteger(suffix)) throw new RangeError("suffix exceeds safe integer range");
    const candidate = suffix === 0 ? withoutExtension : `${withoutExtension}-${suffix}`;
    result.push(safeExportName(candidate, format));
  }
  return result;
}
