# C141 FTP preview cache

Successful FTP previews now use a window-local eight-entry LRU with five-minute expiry and a 64 MiB encoded-plus-estimated-decoded budget. Each consumer receives its own disposable Blob URL. Reads share in-flight work; errors remain retryable. Queue revision/status/URL changes and removed history invalidate cached data. Cleared or pruned pending reads cannot refill the cache. Explicit Refresh clears cached previews and reloads the selected image. Local draft rendering and thumbnail-only disk retention remain unchanged.

Validation: TypeScript, five unit cases and five injected browser cases pass. Coverage includes A→B→A, Local/FTP tab switching, explicit refresh, history removal, shared pending reads, independent URL disposal, LRU/budget/TTL eviction and invalidation during reads. Existing bulk-delete guards and partial-failure regressions pass. No build, real FTP/HTTP requests or publication. Version remains 1.2.0 pending user acceptance.
