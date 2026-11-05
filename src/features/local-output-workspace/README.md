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
