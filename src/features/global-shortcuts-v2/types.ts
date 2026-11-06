import type { ShortcutBinding } from "../hotkey-panel/HotkeyPanel";

export type GlobalActionIdV2 =
  | "capture-fullscreen"
  | "capture-area"
  | "capture-window"
  | "capture-active-window"
  | "capture-repeat-region"
  | "capture-scrolling"
  | "ocr-capture"
  | "show-workspace";

export const GLOBAL_ACTIONS_V2: readonly GlobalActionIdV2[] = Object.freeze([
  "capture-fullscreen",
  "capture-area",
  "capture-window",
  "capture-active-window",
  "capture-repeat-region",
  "capture-scrolling",
  "ocr-capture",
  "show-workspace",
]);

export const ACTION_LABELS_V2: Readonly<Record<GlobalActionIdV2, string>> =
  Object.freeze({
    "capture-fullscreen": "Capture Fullscreen",
    "capture-area": "Capture Area",
    "capture-window": "Capture Window",
    "capture-active-window": "Capture Active Window",
    "capture-repeat-region": "Repeat Last Area Capture",
    "capture-scrolling": "Capture Scrolling Area",
    "ocr-capture": "OCR / Text Recognition",
    "show-workspace": "Show Workspace / Main Window",
  });

export type GlobalBindingsV2 = Readonly<
  Record<GlobalActionIdV2, ShortcutBinding | null>
>;

export function emptyGlobalBindingsV2(): GlobalBindingsV2 {
  return Object.freeze({
    "capture-fullscreen": null,
    "capture-area": null,
    "capture-window": null,
    "capture-active-window": null,
    "capture-repeat-region": null,
    "capture-scrolling": null,
    "ocr-capture": null,
    "show-workspace": null,
  });
}

