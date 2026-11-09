import { expect, it } from "vitest";
import { emptyHotkeys, shortcutStatus } from "./shortcuts-v2";
import { parseGlobalShortcutsV2Json, toNativeGlobalBindingsV2 } from "../features/global-shortcuts-v2";

it("reads all eight actual native actions without silently dropping active/repeat/show bindings", () => {
  const binding = { key: "F7", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
  for (const action of ["capture-active-window", "capture-repeat-region", "show-workspace"] as const) {
    const draft = { ...emptyHotkeys(), [action]: binding };
    expect(shortcutStatus({ bindings: toNativeGlobalBindingsV2(draft), faulted: false }).draft).toEqual(draft);
  }
});
it("upgrades an exact legacy native map to eight actions", () => {
  const old = { "capture-fullscreen": null, "capture-area": "Control+Shift+KeyA", "capture-window": null, "capture-scrolling": null, "ocr-capture": null };
  const next = shortcutStatus({ bindings: old, faulted: false });
  expect(Object.keys(next.draft)).toHaveLength(8);
  expect(next.draft["capture-area"]?.key).toBe("a");
  expect(next.draft["show-workspace"]).toBeNull();
});
it("rejects incomplete, noncanonical, duplicate and reserved native maps", () => {
  const empty = toNativeGlobalBindingsV2(emptyHotkeys());
  for (const bindings of [{}, { ...empty, unknown: null }, { ...empty, "capture-area": "Control+Control+KeyA" },
    { ...empty, "capture-area": "Super+Space" }, { ...empty, "capture-area": "Control+KeyA", "show-workspace": "Control+KeyA" }]) {
    expect(() => shortcutStatus({ bindings, faulted: false })).toThrow();
  }
});

it("rejects aliases that collide after canonical key encoding", () => {
  const binding = { key: " ", metaKey: false, ctrlKey: true, altKey: false, shiftKey: false };
  expect(() => toNativeGlobalBindingsV2({ ...emptyHotkeys(), "capture-area": binding, "show-workspace": { ...binding, key: "Space" } })).toThrow("Duplicate");
  expect(() => toNativeGlobalBindingsV2({ ...emptyHotkeys(), "show-workspace": { ...binding, key: "Space", ctrlKey: false, metaKey: true } })).toThrow("Reserved");
});

it("requires every original action before migrating a v1 preference document", () => {
  expect(() => parseGlobalShortcutsV2Json(JSON.stringify({ version: 1, bindings: {} }))).toThrow("five");
  const legacy = { "capture-fullscreen": null, "capture-area": null, "capture-window": null, "capture-scrolling": null, "ocr-capture": null };
  expect(parseGlobalShortcutsV2Json(JSON.stringify({ version: 1, bindings: legacy }))).toEqual(emptyHotkeys());
});
