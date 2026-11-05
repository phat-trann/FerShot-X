# C04 current-snapshot and pixel-inspection checkpoint

Status: PARTIAL for integration. Date: 2026-11-05. Formatting/lint delegated to Copilot H01.

## Current source reviews

Reviewed eleven fresh packets and actual implementation/tests. Accepted the corrected A04 gesture view, P05 bounded static audit, P06 positive fitted-size guards, P08 strict settings codec, P10 null-safe pin options, P13 RGBA sampler, P14 coordinate mapper and P15 rectangle intersection. Scoped candidate functional suite passed 27 tests across 10 files. This does not approve unrelated current source or establish native behavior.

Requested functional changes for P12 (PNG legal dimension cap), P16 (derived bounds overflow/unbounded argument spread) and P17 (empty-string identity is silently lost). Exact decisions and durable findings are in coordination/messages/copilot/20261105-codex-C04-pixel-review.md.

At the initial C04 review, available A06-A10 implementation/correction packets were STALE. Later fresh author packets arrived while the user redirected priority to full queue allocation; their review is deferred to the next integration checkpoint. A04 is accepted as a view only; the composed editor, renderer, native settings and export panel were not wired from stale snapshots. Requested fresh author submissions with actual functional tests in coordination/messages/antigravity/20261105-codex-C04-stale-snapshots.md. No waiting/polling or editing worker-owned files.

## Integrated browser functionality

P13/P14 and the earlier accepted P01 color formatter now power Inspect color in the root workspace. Users can click a source-image pixel at the current CSS zoom, or enter X/Y coordinates and activate Sample color by keyboard. The output shows source coordinates, HEX and RGBA with an alpha-aware swatch. Results belong to the selected image and are hidden for other session documents; toggling inspection off leaves images unchanged.

The adapter validates image dimensions/coordinates before decoding, verifies decoded dimensions, reads one pixel and releases its temporary canvas bitmap. It samples browser-decoded RGBA, not original encoded/HDR/profile channel values. Browser decode allocation is not a hard memory-budget guarantee. No display capture, native invocation, clipboard access, upload, filesystem write or new dependency is part of sampling.

## Actual validation and blocker

- Candidate helper/view functional suite: 27 tests passed.
- Pixel adapter: 3 functional tests passed for invalid metadata/coordinates, decoder failure and mismatched dimensions.
- Pixel browser tests: 2 passed on actual synthetic image/canvas pixels, including zoom mapping, keyboard sampling, alpha=128 and 800x540 layout.
- Final selected Codex/baseline browser run: all 12 tests passed after keyboard/alpha integration.
- Scoped TypeScript compile of Workspace.tsx and its import closure with strict DOM/bundler options passed. This is separate from the full project build, not a replacement or exclusion in project config.
- Full `npm run build` FAILED: src/features/image-sort/index.test.ts has TS2741 (missing fixture byteSize) and TS2304 (ImageSortMode not imported). No root config changes or edits to Copilot's P19 files were made. Reported exact errors in coordination/messages/copilot/20261105-codex-C04-P19-typeblock.md. Native app bundling was skipped at that checkpoint. A later P19 fix packet arrived during queue allocation; follow-up full TypeScript/Vite build passed. Native bundling was not repeated in the coordination-only phase.
- No formatter, lint, clippy or whitespace checks were run by Codex. No native GUI/permission/clipboard operation was performed. Root Rust source was unchanged, so native tests were not repeated.

## Progress

The declared MVP score remains 47.5%. The gesture view alone does not pass the composed-editor gate; stale renderer/settings packets cannot pass their gates. Pixel inspection is useful additional integration outside the current scored acceptance gates. No weights, scope or unfinished gates were changed to increase the score. Updated current blockers/review notes and handed completed Codex-owned files to H01 after claim release.
