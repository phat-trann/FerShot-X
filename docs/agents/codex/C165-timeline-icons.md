# C165 — Timeline icons

Record Screen/Area icons now preserve the existing monitor frame and add only Lucide Play/Stop interior artwork using the matching inset scale/stroke. Both remain 18×18 white PNGs; alpha comparison outside the interior found zero differing pixels.

Removed duplicate left layer names and its ruler label. Accessible groups/actions remain; selection uses the named clip buttons. Left hide/show and lock controls use 22px targets/11px glyphs. Timeline and transport actions share flat Edit rest/hover/pressed/disabled/focus styling and 1.75 stroke; row actions also use shared hints. Narrowed the gutter to 60px.

Validation: TypeScript, 17 injected browser cases and asset pixel checks passed; inspected C165 screenshot. No native compile/build, OS/server operations, version bump or commit/push. Installed visual acceptance remains pending. USER_WAIVED_REVIEW, not independent approval.
