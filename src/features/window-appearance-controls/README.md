# Window Appearance Controls

Controlled UI component providing background and shadow-trim preferences for captured window screenshots:
- **Background Choice**: Supports transparent and custom solid hex color backgrounds without proprietary wallpaper dependencies or inferred defaults.
- **Shadow Trim Insets**: Explicit integer pixel crop insets (`top`, `right`, `bottom`, `left`) validated against image boundaries.
- **Apply Action**: Constructs a strongly typed `WindowAppearanceRenderRequest` conforming to `src/features/window-appearance` contracts and invokes `onApply`.
- **Busy Guard**: Disables all interactions when busy or when validation errors are present.

Codex C32 integrates this component with the main workspace renderer.

