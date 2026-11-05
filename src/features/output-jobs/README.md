# C19 output jobs

One active injected render/action pipeline with immutable source revision/options, ordered explicit actions and bounded intent deduplication (256 IDs, no silent eviction). Each render transfers one temporary artifact; the coordinator releases it after all attempted handlers settle, including cancellation/failure. Cleanup failures are reported. No clipboard, disk, dialog, print or drag API is called here.

```ts
const jobs = new OutputCoordinator({ render: renderReviewedDocumentRevision, handlers: reviewedExplicitOutputAdapters });
jobs.select({ id: image.id, revision });
const receipt = await jobs.run({ id: uniqueUserIntent, source: { ...image, revision },
  options: { format: "png", quality: 90, name: image.name }, actions: ["save"] });
// Render adapter resolves the exact immutable revision. Call jobs.select(null) on close.
```

Adapters return `completed`, `cancelled`, or `not-performed` (the latter guarantees no external effect). Rejected/invalid action outcomes are ambiguous and cannot automatically retry. A later explicit reconciliation after verifying the external result can mark that action performed/not performed. Retrying guaranteed failures skips already completed effects. Cancellation cannot undo a committed side effect; receipts retain completed actions and original source identity. Cooperative adapters may retain the one active slot until settlement. Failed renders may retry; cancelled/stale intents need a fresh explicit intent. Blob URLs/short source locators are expected (4096-character bound); revisions must identify immutable content. C07/C15 must adapt real native handlers and capabilities after Antigravity review. No target export/print semantics or native acceptance is claimed; H01 owns hygiene.
