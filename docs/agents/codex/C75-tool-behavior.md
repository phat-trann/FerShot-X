# C75 tool-specific manipulation

| Tools | Canvas interaction | Properties |
| --- | --- | --- |
| Rectangle, ellipse | Eight perimeter handles + center move | Color, stroke |
| Line, arrow, straight two-point pen | Two endpoints + whole-line move | Color, stroke |
| Counter | Move only | Color, diameter |
| Text | Move only | Color, font size, content |
| Freehand | Four corners, proportional resize + move | Color, stroke |
| Magnifier | Four corners, circular resize + move | Border color/width, magnification |
| Highlight | Eight handles + move | Color, opacity |
| Spotlight | Eight handles + move | Dimming |
| Blur | Eight handles + move | Strength |

Select defaults; endpoint edits support Shift, cancellation and history. Defaults are remembered by family.

Checks: C75-source-candidate.json. No build; acceptance 85%.
