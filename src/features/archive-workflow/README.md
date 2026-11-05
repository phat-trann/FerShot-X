# C20 archive workflow

Coordinates injected user-approved read/decode/materialize and encode/write callbacks; no ZIP parser, filesystem or browser URL API is implemented. Validate all entries and bounded JSON annotations before materialization. IDs colliding with the existing library receive deterministic `~import-N` suffixes, avoiding all incoming IDs. Existing selection/annotations are preserved; archive selection is used only if the original has no selection.

```ts
const workflow = new ArchiveWorkflow({ ...reviewedA29Adapters,
  commit: (candidate, expectedRevision) => compareAndSwapRootLibrary(expectedRevision, candidate),
});
const imported = await workflow.importInto(currentImmutableLibrary);
// If committed, root owns imported images. On individual close: imported.releaseImage(id).
// At workspace teardown: imported.releaseAll(). Old URLs are never owned by this lease.
await workflow.exportFrom(currentImmutableLibrary); // explicit user archive action
```

C14 must implement synchronous atomic compare-and-swap (false means no mutation; successful commit must not throw), keep root revision current and adapt A29's archive/version/decoded image contracts. Decoder/materializer must verify actual bytes match declared dimensions/type; this workflow validates metadata and budgets, not encoded-image semantics. Resource callbacks should be nonthrowing. Cancellation is cooperative and the operation slot stays occupied until settlement. Aggregate image bytes: 64 MiB; per-image 32 MiB/16384 axes/16777216 pixels; archive 256 entries/67108864 aggregate pixels, merged library 512 images; annotations bounded by node/depth/UTF-8 budgets. Adapters may allocate before returning; these are post-read bounds, not total process memory guarantees. Export contains real owned bytes, not source URLs. Native acceptance, original archive compatibility, Antigravity review and H01 hygiene remain separate.
