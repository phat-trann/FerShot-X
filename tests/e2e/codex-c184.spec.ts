import { expect, test } from "@playwright/test";
import { mock } from "./helpers/v1-ipc";

test("Library refreshes only the source that changed and reads again after an in-flight update", async ({ page }) => {
  await mock(page);
  await page.addInitScript(() => {
    const host = window as any;
    const invoke = host.__TAURI_INTERNALS__.invoke;
    host.__TAURI_INTERNALS__.invoke = async (command: string, args: unknown) => {
      if (command === "local_cache_list" && host.__HOLD_LOCAL__) {
        host.__HOLD_LOCAL__ = false;
        const snapshot = structuredClone(await invoke(command, args));
        await new Promise<void>(resolve => { host.__RESOLVE_LOCAL__ = resolve; });
        return snapshot;
      }
      return invoke(command, args);
    };
  });
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Shared.png" })).toBeVisible();
  await page.getByRole("tab", { name: /Local/ }).click();
  await expect(page.getByRole("img", { name: "Design.png" })).toBeVisible();
  const reads = () => page.evaluate(() => (window as any).__CALLS__
    .map((row: {command:string}) => row.command)
    .filter((command: string) => ["local_cache_list", "recording_list", "ftp_list"].includes(command)));
  const initial = (await reads()).length;

  await page.evaluate(() => {
    const host = window as any;
    host.__HOLD_LOCAL__ = true;
    host.__EMIT__("fershot-library-updated", "local");
  });
  await expect.poll(() => page.evaluate(() => typeof (window as any).__RESOLVE_LOCAL__)).toBe("function");
  await page.evaluate(() => {
    const host = window as any;
    host.__LOCAL__[0].name = "Updated.png";
    host.__EMIT__("fershot-library-updated", "local");
    host.__EMIT__("fershot-ftp-updated");
  });
  await expect.poll(async () => (await reads()).slice(initial)).toEqual(["local_cache_list", "ftp_list"]);
  await page.evaluate(() => (window as any).__RESOLVE_LOCAL__());
  await expect(page.getByRole("heading", { name: "Updated.png" })).toBeVisible();
  expect((await reads()).slice(initial)).toEqual(["local_cache_list", "ftp_list", "local_cache_list"]);
  await page.evaluate(() => (window as any).__EMIT__("fershot-library-updated", "video"));
  await expect.poll(async () => (await reads()).slice(initial + 3)).toEqual(["recording_list"]);
});

test("changing the Library selection clears old pixels and disables Live Text while the next image loads", async ({ page }) => {
  await mock(page);
  await page.addInitScript(() => {
    const host = window as any;
    const invoke = host.__TAURI_INTERNALS__.invoke;
    host.__TAURI_INTERNALS__.invoke = async (command: string, args: {id?:string}) => {
      if (command === "live_text_supported") return true;
      if (command === "library_image" && args.id === "local-2") {
        await new Promise<void>(resolve => { host.__RESOLVE_PREVIEW__ = resolve; });
      }
      return invoke(command, args);
    };
  });
  await page.goto("/");
  await page.getByRole("tab", { name: /Local/ }).click();
  const liveText = page.getByRole("button", { name: "Live Text", exact: true });
  await expect(page.getByRole("img", { name: "Design.png" })).toBeVisible();
  await expect(liveText).toBeEnabled();
  await page.getByRole("option", { name: /Notes.png/ }).click();
  await expect(page.getByRole("heading", { name: "Notes.png" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Design.png" })).toHaveCount(0);
  await expect(liveText).toBeDisabled();
  await expect.poll(() => page.evaluate(() => typeof (window as any).__RESOLVE_PREVIEW__)).toBe("function");
  await page.evaluate(() => (window as any).__RESOLVE_PREVIEW__());
  await expect(page.getByRole("img", { name: "Notes.png" })).toBeVisible();
  await expect(liveText).toBeEnabled();
});

test("FTP video refresh bypasses cache once and ordinary selection uses the cache again", async ({ page }) => {
  await mock(page);
  await page.addInitScript(() => {
    const host = window as any;
    const invoke = host.__TAURI_INTERNALS__.invoke;
    const base = host.__FTP__[0];
    host.__FTP__ = [
      { ...base, id: "123-1", name: "First.mp4", remotePath: "/images/first.mp4", status: "success" },
      { ...base, id: "123-2", name: "Second.mp4", remotePath: "/images/second.mp4", status: "success", createdAt: base.createdAt - 1 },
    ];
    host.__TAURI_INTERNALS__.invoke = async (command: string, args: unknown) => {
      if (command === "ftp_video_preview") {
        host.__CALLS__.push({ command, args });
        throw { code: "ftp_failed", message: "Synthetic video preview failure" };
      }
      return invoke(command, args);
    };
  });
  await page.goto("/");
  const requests = () => page.evaluate(() => (window as any).__CALLS__.filter((row: {command:string}) => row.command === "ftp_video_preview").map((row: {args:unknown}) => row.args));
  await expect(page.getByRole("button", { name: "Retry preview", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry preview", exact: true }).click();
  await expect.poll(requests).toEqual([{ id: "123-1", force: false }, { id: "123-1", force: true }]);
  await page.getByRole("option", { name: /second.mp4/ }).click();
  await page.getByRole("option", { name: /first.mp4/ }).click();
  await expect.poll(requests).toEqual([
    { id: "123-1", force: false },
    { id: "123-1", force: true },
    { id: "123-2", force: false },
    { id: "123-1", force: false },
  ]);
});

test("malformed recording settings leave the rest of Settings available", async ({ page }) => {
  await mock(page);
  await page.addInitScript(() => {
    const host = window as any;
    const invoke = host.__TAURI_INTERNALS__.invoke;
    host.__TAURI_INTERNALS__.invoke = (command: string, args: unknown) =>
      command === "read_recording_settings" ? Promise.resolve(null) : invoke(command, args);
  });
  await page.goto("/?preferences&tab=general");
  const recording = page.getByRole("group", { name: "Screen recording" });
  await expect(recording.getByRole("alert")).toHaveText("Recording settings are unavailable.");
  await expect(recording.getByRole("checkbox", { name: "Microphone" })).toBeDisabled();
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open Logs Folder", exact: true })).toBeVisible();
});
