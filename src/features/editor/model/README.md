# Annotation model

Pure immutable model using `src/contracts/editor.ts`. Positions are source-image pixels; no zoom, native window or UI state is stored here.

```ts
import { createEditorState, editorReducer, undo, redo } from './index';
let state = createEditorState({ historyLimit: 100 });
state = editorReducer(state, { type: 'add', annotation });
state = editorReducer(state, { type: 'select', id: annotation.id });
state = editorReducer(state, { type: 'update', id: annotation.id, changes: { text: 'Updated' } });
state = undo(state);
state = redo(state);
```

Add selects the new annotation. Delete clears selection when necessary. Selection changes are not undo entries. A new edit after undo discards redo history. The document snapshot owns the next counter; undo restores it, so a new branch may reuse a removed counter number. Explicit counter values advance allocation without renumbering existing annotations.

Input annotations are copied and nested data frozen; snapshots/history arrays are frozen. Duplicate IDs, non-finite points, invalid styles/counters and invalid history limits throw RangeError. Missing update/delete targets are no-ops. History limits range from zero (disabled) to 1000. No persisted document format or export behavior is implied.
