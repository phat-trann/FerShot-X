import { afterEach, beforeEach, expect, it, vi } from "vitest";
const runtime = vi.hoisted(() => ({ desktop: false, invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => runtime.desktop, invoke: runtime.invoke }));
import { readPreferences, savePreferences } from "./native";
import { DEFAULT_SETTINGS } from "../contracts/settings";
beforeEach(() => { runtime.desktop = false; runtime.invoke.mockReset(); });
afterEach(() => vi.restoreAllMocks());
it("returns independent browser defaults without native IO", async () => {
  const first = await readPreferences(); first.jpegQuality = 1;
  expect((await readPreferences()).jpegQuality).toBe(90);
  expect(runtime.invoke).not.toHaveBeenCalled();
  await expect(savePreferences({ ...DEFAULT_SETTINGS })).rejects.toMatchObject({ code: "desktop_required" });
});
it("validates stored native settings and sends owned values without arbitrary paths", async () => {
  runtime.desktop = true; runtime.invoke.mockResolvedValue({ ...DEFAULT_SETTINGS, jpegQuality: 73 });
  expect((await readPreferences()).jpegQuality).toBe(73);
  const saved = await savePreferences({ ...DEFAULT_SETTINGS, jpegQuality: 73 });
  expect(saved.jpegQuality).toBe(73);
  expect(runtime.invoke).toHaveBeenLastCalledWith("save_preferences", { settings: { ...DEFAULT_SETTINGS, jpegQuality: 73 } });
});
it("rejects corrupt native settings and invalid values before save", async () => {
  runtime.desktop = true; runtime.invoke.mockResolvedValue({ ...DEFAULT_SETTINGS, jpegQuality: 0 });
  await expect(readPreferences()).rejects.toThrow("invalid settings");
  runtime.invoke.mockClear();
  await expect(savePreferences({ ...DEFAULT_SETTINGS, jpegQuality: 0 })).rejects.toThrow();
  expect(runtime.invoke).not.toHaveBeenCalled();
});
