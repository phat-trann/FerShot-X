export interface Margins { top: number; right: number; bottom: number; left: number }
export interface PrintGeometry {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly printableWidth: number;
  readonly printableHeight: number;
}

function positive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be finite and positive`);
}

export function fitPrintGeometry(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
  margins: Margins,
  pixelToPointScale: number,
): PrintGeometry {
  [imageWidth, imageHeight, pageWidth, pageHeight, pixelToPointScale].forEach((value, index) => positive(value, `dimension${index}`));
  for (const value of [margins.top, margins.right, margins.bottom, margins.left]) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError("margins must be finite and nonnegative");
  }
  const printableWidth = pageWidth - margins.left - margins.right;
  const printableHeight = pageHeight - margins.top - margins.bottom;
  if (printableWidth <= 0 || printableHeight <= 0) throw new RangeError("printable area must be positive");
  const sourceWidth = imageWidth / pixelToPointScale;
  const sourceHeight = imageHeight / pixelToPointScale;
  const scale = Math.min(printableWidth / sourceWidth, printableHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  if (![sourceWidth, sourceHeight, scale, width, height].every(Number.isFinite) ||
      scale <= 0 || width <= 0 || height <= 0) throw new RangeError("print geometry must be finite and positive");
  return {
    scale,
    x: margins.left + (printableWidth - width) / 2,
    y: margins.top + (printableHeight - height) / 2,
    width,
    height,
    printableWidth,
    printableHeight,
  };
}
