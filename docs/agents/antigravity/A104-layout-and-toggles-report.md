# A104 Layout Reorganization, Icons, and Modern Toggle Controls

## Summary
Reorganized the Ferby Shottr application workspace to arrange all tools, actions, and features logically, integrate matching macOS vector icons, implement proper toggle button states and indicators, and streamline the editing workflow.

## Key Changes
1. **Vector Icon Set (`src/components/icons.tsx`)**:
   - Built a comprehensive set of clean inline SVG icons with `aria-hidden="true"` to preserve accessible names:
     - Folders & Files: `IconFolderOpen`, `IconClipboard`, `IconSave`, `IconClose`, `IconRestore`
     - Capture & Tools: `IconWindow`, `IconScroll`, `IconArchive`, `IconKeyboard`
     - Analysis & Editing: `IconPencil`, `IconColorPicker`, `IconRuler`, `IconScanText`
     - Studio Enhancements: `IconSparkles` (Auto Adjust), `IconMagicWand` (Pixel Effects), `IconLayers` (Backdrop / Layout), `IconPrinter` (Print & Output)
     - Output Actions: `IconPin`, `IconMerge`

2. **Logical Workspace Layout & Tool Placement (`src/Workspace.tsx`)**:
   - **Sidebar**:
     - Modern squircle brand mark with macOS pill badge.
     - Quick Import action buttons: `＋ Open image` and `Open clipboard image`.
     - Capture section: `CaptureActionControls` grid + `Capture last active app window` + `Manual scrolling capture`.
     - Session & Utilities: `Local session archive` + `Global shortcuts` + `LibraryPanel`.
     - Privacy status footer with emerald glow indicator.
   - **Primary Toolbar**:
     - Mode badge indicating active mode.
     - Grouped Segmented Control for core analysis and editing modes: `Annotate image`, `Inspect color`, `Measure image`, and `Recognize text / QR`.
     - Transform tools (Crop & Resize).
     - Segmented zoom controls + Source restore + Close.
   - **Secondary Studio & Export Strip**:
     - Studio creative toggle buttons: `Automatic tonal adjustment`, `Pixel effects`, `Compose images / backdrop`, `Print / local output`.
     - Export actions: format dropdown, `Copy image`, `Pin image`, `Merge annotations`, and `Save image…`.
   - **Collapsible Workspace Drawers**:
     - All expanded tool trays (OCR, Print, Archive, Adjust, Layout, Effects, Scroll) open smoothly in dedicated `.workspace-drawer` containers with frosted glass styling instead of cluttering the canvas.

3. **Toggle Controls & Visual States (`src/Workspace.css`)**:
   - All toggle buttons with `aria-pressed` now render distinct active states:
     - Unpressed: subtle dark glass surface with muted icon and text.
     - Pressed (`aria-pressed="true"`): glowing blue pill surface (`rgba(10, 132, 255, 0.2)`), accent borders, and blue glowing active indicator.
   - Sidebar toggles include a mini hardware-style toggle switch indicator.

## Verification
- Vitest: 120/120 test files passed (469/469 tests, 100%).
- Playwright E2E: 38/38 tests passed (100%).
- Frontend production build: `npm run build` succeeds cleanly.

