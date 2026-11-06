# Automatic tonal adjustment panel

This controlled panel emits `AutoAdjustOptions` only after an explicit Apply.
It validates image dimensions, finite strength and percentile values before
calling the C12-owned raster seam, and performs no canvas, rendering or I/O
work itself. The adjustment is a deterministic Ferby rule; it is not a
recovered or equivalent Shottr algorithm. The panel is whole-image only and
does not provide region selection.
