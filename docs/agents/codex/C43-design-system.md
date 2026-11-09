# C43 workspace design system

The previous view stacked independent feature panels above the image and mixed multiple visual languages. This redesign separates navigation, document actions, canvas and properties.

- **Layout:** 218px library rail, flexible canvas, 300px scrollable properties inspector (184px / 260px at smaller desktop sizes). Opening properties does not consume canvas height. Closing an image removes irrelevant image-only properties. Tool names remain explicit accessible names even where visible labels are shortened.
- **Palette:** matte warm paper, white panels, charcoal text and one evergreen action color. No decorative gradients, glows or glass toolbars. Image pixels and rendering algorithms are untouched.
- **Typography:** system font; document title 14px, controls 12px, helper text 11px, compact metadata 10px. Monospaced numeric/keyboard details where useful.
- **Spacing:** shared 4/8/12/16/24/32px scale; 6/8/12/16px radii; one border and elevation vocabulary.
- **Controls:** consistent default/hover/pressed/disabled/focus-visible states, semantic destructive styling, common field surfaces. Capture modes use a compact grid; duplicate active-window action removed.
- **Settings:** dedicated portal dialog with focus containment, Escape/backdrop close, restoration of prior focus and inert/aria-hidden application shell. Does not depend on HTMLDialogElement.showModal, preserving older macOS WebKit compatibility. Native global actions cannot start behind a modal.
- **Accessibility:** actual buttons/labels, visible focus, reduced-motion support, keyboard reachable inspector actions, independently scrolling library/properties. Shortcuts footer wraps instead of clipping its Apply/Save actions.

Validation uses actual browser screenshots at 800×540, 1180×780 and 1440×900, verifies canvas/inspector separation and settings focus, and reruns production feature workflows. This is a functional UI redesign; formatter/lint work remains delegated to H01.
