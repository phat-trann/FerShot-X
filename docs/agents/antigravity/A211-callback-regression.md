# A211 — Repair A207 Callback Assertions & Restore Typed Regression Suite

## Summary
- Updated `src/testing/antigravity-direct-gesture-boundaries.test.tsx` to pass the typed `onApply` prop required by `DirectEffectsSurfaceProps` instead of the nonexistent `onApplyEffect` prop.
- Added explicit assertions on `DirectEffectsSurface` verifying:
  - Exactly one `onApply` invocation (`{ kind: "blur", rect: { x: 30, y: 20, width: 100, height: 80 }, radius: 8 }`) on region drag completion.
  - Absence of unexpected error alerts (`expect(screen.queryByRole("alert")).toBeNull()`).
  - No `onApply` commit when an active gesture is cancelled via `pointerCancel` or interrupted mid-drag by `busy={true}`.
- Preserved historical `A207` report/packet unchanged.

## Verification
- `npx vitest run src/testing/antigravity-direct-gesture-boundaries.test.tsx` — 4/4 tests passed.
