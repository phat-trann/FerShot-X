# C90 responsiveness source review

This is a source/renderer review, not a measured native FPS or startup benchmark.

| Path | Work observed | Change/evidence |
| --- | --- | --- |
| Workspace pointer color → WorkspaceEditor/Konva | Every changed pixel color updated top-level React state and reconciled document/toolbar children. | External color store now notifies only the color cell. Unit test proves parent render count stays unchanged and identical samples do not render again. |
| Konva samplePixel | Each sample read bounds for every canvas before reading pixels. | Uses known stage dimensions instead; no canvas layout query in the sample loop. Export/image colors and hover exclusion remain tested. |
| Local history forget | Every FTP refresh iterated successful jobs and requested removal again. | Coalesce in-flight IDs and skip successful removals; failed removals can retry. Injected tests count native boundary calls. |
| Library preview effect | Any upload updatedAt change could reload authenticated full pixels. | Depend on identity/success transition/manual retry; synthetic progress test verifies one read across intermediate updates. |
| Settings startup | Hidden Uploading panel read FTP and HTTP settings immediately. | First-visit mount defers those reads, while retained mounting preserves unsaved fields across tab changes. |

Remaining costs to profile on an authorized native candidate: synchronous large Blur patches (up to four megapixels), complete raster encoding for output/initial draft storage, native image checksum/disk operations, and retention of session image URLs/history. These are plausible costs, not established causes of the reported lag. Large-image interaction and repeated-document tests are included in R30/R32; no speed percentage is claimed. No production/native build, real upload, clipboard or OS test ran.
