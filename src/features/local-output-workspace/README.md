# Local output workspace

`LocalOutputWorkspace` composes `LocalOutputPanel` with local print options
and controlled copy/save/print/drag capabilities. The root owns clipboard,
file-save, native print, drag-out and annotation-raster work.

Props:

- `image`, `busy`, `canPrint`, `canDrag`
- `onCopy()`, `onSave()`
- `onPrint(options: PrintSheetOptions)`
- `onDrag(payload: LocalDragImagePayload)`

Print options are local to the workspace and start at A4 portrait with a
36-point margin and fit scaling. Capability callbacks are omitted when their
runtime capability is unavailable; this presentation layer does not claim
browser printing or drag behavior is native acceptance. Source image data and
URLs remain caller-owned.

The controlled Print scale selector exposes the existing fit/actual modes. It is
disabled while busy or native printing is unavailable. Selecting a mode changes
local options only; printing still requires the explicit Print action. The
existing actual-mode helper keeps small images at actual size and fits oversized
images within the printable sheet.
