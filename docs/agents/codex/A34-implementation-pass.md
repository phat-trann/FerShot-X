# A34: Production completion pass for app integration

Under the latest implementation-first user instruction, Codex completed missing advanced-editor production seams: source-backed raster preview, typed shape/effect/text/counter display, explicit selection/deletion, per-image bounded undo/redo state, safe empty initial items, noncolliding counter continuation and canvas/bitmap/object-URL cleanup. The preview uses the existing advanced renderer rather than another drawing algorithm. The root/basic editor remains a separate source layer; final raster order is basic annotations followed by advanced items. Basic-mode editing does not overlay advanced items until switching to the advanced view/export.

Source is provisionally integrated and UNREVIEWED. Existing original-vs-Ferby geometry/compositing differences remain unknown; the changes do not certify Shottr parity. History cap 100 and item cap 1000 are explicit Ferby bounds. No dependencies, versions or proprietary resources changed.

Necessary scoped strict TypeScript compilation passed with the root editor/renderer. New/expanded functional tests and cosmetic work are deferred per user instruction. No native actions executed; actual browser/render regression follows in the later validation phase. Formatting/lint deferred to Copilot H01.
