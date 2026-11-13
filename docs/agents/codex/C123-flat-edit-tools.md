# C123 Flat Edit tools and crop layout

Edit toolbar, overflow/add-image tools and crop/resize actions are transparent without visible borders at rest. Selected tools/presets use accent ink; hover adds an elevated surface and fine border without moving geometry. Settings/Library retain framed actions.

The image-size popover separates presets, dimension fields and actions with 12px vertical gaps and 8px field/action gaps. Editable color inputs are full-bleed 32×32px squares with zero padding/rounding; pointer-color readout remains circular. Existing callbacks and crop/resize confirmation remain unchanged.

Validation: TypeScript and six focused browser cases passed, with final hover/color/popup rechecks. Real geometry, square-swatch styles, preset overflow, color persistence, Enter/Escape behavior and unchanged canvas layout are covered. Screenshots inspected. No build, real OS/server action, commit or push; user acceptance pending.
