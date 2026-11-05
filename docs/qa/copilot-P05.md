# P05 baseline accessibility review

Static review only; no browser or narrow-window runtime test was performed.

1. **Medium — thumbnail names are unavailable to assistive technology.** [`src/Workspace.tsx:65`](../../src/Workspace.tsx:65) renders each image thumbnail with `alt=""` inside a named image-selection button. The button text exposes the filename, but the image itself has no useful alternative; use `alt={item.name}` or explicitly document it as decorative while keeping the button name complete.
2. **Medium — error state has no focus management.** [`src/Workspace.tsx:75`](../../src/Workspace.tsx:75) adds a `role="alert"` after import failure, but focus remains on the file input or drop target. Move focus to the alert/dismiss control, or provide a live-region strategy that does not rely on timing.
3. **Low — disabled controls are visually but not programmatically explained.** Zoom and open controls use `disabled` at [`src/Workspace.tsx:60`](../../src/Workspace.tsx:60) and [`src/Workspace.tsx:73`](../../src/Workspace.tsx:73), but there is no nearby status explanation for why they are unavailable. Add concise descriptions (for example, via `aria-describedby`) where the reason is not obvious.
4. **Low — narrow-window behavior is unverified and likely cramped.** The only responsive rule is an 850px breakpoint in [`src/Workspace.css:25`](../../src/Workspace.css:25); the fixed sidebar and minimum workspace height may force horizontal or vertical pressure at smaller windows. Add a narrow viewport test and a compact layout/overflow rule if needed.

Focus order is statically reasonable: sidebar controls precede toolbar controls, content, and the hidden picker in DOM order. The selected image has an `aria-pressed` state, and the visible image has meaningful alt text at [`src/Workspace.tsx:79`](../../src/Workspace.tsx:79). Runtime focus behavior, contrast, and actual responsive rendering remain UNKNOWN.
