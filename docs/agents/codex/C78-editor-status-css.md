# C78 editor status styling

Color, Image size and Zoom share a 32px status-cell layout, consistent padding, numeric typography, primary/secondary line heights and alignment. Separators are drawn on the status wrappers so generic borderless toolbar rules cannot erase them. Size/Zoom share hover, expanded, focus and disabled states; Color remains read-only. Component-scoped CSS replaces the previous scattered status rules without affecting the resize/crop popover.

Checks: no-emit TypeScript, version 1.0.0 consistency and four injected browser cases passed (toolbar, crop/resize, live color/Tab/Fit, narrow-window overflow). Inspected the rendered editor screenshot. No application/native build, formatting or lint run. Phase-2 acceptance stays 85% before and after.
