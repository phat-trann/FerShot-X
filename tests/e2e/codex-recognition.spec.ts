import { expect, test } from "@playwright/test";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";

async function openRecognition(page: import("@playwright/test").Page, delayed = false) {
  await page.addInitScript(({ delayed }) => {
    const target = window as unknown as {
      isTauri: boolean; __TEXT_COPIES__: string[]; __RECOGNITIONS__: unknown[];
      __RELEASE__: (() => void) | undefined;
      __TAURI_INTERNALS__: { invoke: (command: string, args: { request?: Record<string, unknown> }) => Promise<unknown> };
    };
    target.isTauri = true; target.__TEXT_COPIES__ = []; target.__RECOGNITIONS__ = [];
    target.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "app_info") return { name: "Synthetic", version: "0.1.0", platform: "test" };
      if (command === "load_preferences") return { saveFormat: "png", jpegQuality: 90, downscaleRetina: false, showPreview: true };
      if (command === "recognition_languages") return ["en-US"];
      if (command === "copy_recognized_text") { target.__TEXT_COPIES__.push(String(args.request!.text)); return; }
      if (command === "recognize_image") {
        const request = args.request!; target.__RECOGNITIONS__.push(request);
        if (delayed) await new Promise<void>(resolve => { target.__RELEASE__ = resolve; });
        const text = request.mode === "ocr";
        return { schemaVersion: 1, width: 2, height: 2, recognizedText: text ? "Hello\nFerby" : "",
          resolvedLanguages: text ? ["en-US"] : [],
          textBlocks: text ? [{ text: "Hello", confidence: 1 }, { text: "Ferby", confidence: 0.9 }] : [],
          qrCodes: text ? [] : [{ payload: "https://example.invalid/qr", symbology: "QR" }] };
      }
      throw new Error(`Unexpected mocked command: ${command}`);
    } };
  }, { delayed });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: Buffer.from(PNG, "base64") });
  await page.getByRole("button", { name: "Recognize text / QR", exact: true }).click();
  await expect(page.getByRole("button", { name: "Recognize Text", exact: true })).toBeEnabled();
}

test("selected image flows through OCR and QR controls to explicit text-copy IPC", async ({ page }) => {
  await openRecognition(page);
  expect(await page.evaluate(() => (window as unknown as { __RECOGNITIONS__: unknown[] }).__RECOGNITIONS__.length)).toBe(0);
  await page.getByRole("button", { name: "Recognize Text", exact: true }).click();
  await expect(page.getByLabel("Recognized text output", { exact: true })).toContainText("Hello");
  await page.getByRole("button", { name: "Copy Text", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __TEXT_COPIES__: string[] }).__TEXT_COPIES__)).toEqual(["Hello\nFerby"]);
  await page.getByRole("button", { name: "Scan QR Codes", exact: true }).click();
  await expect(page.getByLabel("Detected QR payloads")).toContainText("https://example.invalid/qr");
  await page.getByRole("button", { name: "Copy QR code 1", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __TEXT_COPIES__: string[] }).__TEXT_COPIES__)).toEqual(["Hello\nFerby", "https://example.invalid/qr"]);
  const requests = await page.evaluate(() => (window as unknown as { __RECOGNITIONS__: Record<string, unknown>[] }).__RECOGNITIONS__);
  expect(requests.map(request => request.mode)).toEqual(["ocr", "qr"]);
  expect(requests[0]).toMatchObject({ languages: ["en-US"], maxResults: 50 });
  expect(String(requests[0].pngBase64)).toMatch(/^iVBOR/);
});

test("cancelled recognition ignores a late native response and exposes no copyable text", async ({ page }) => {
  await openRecognition(page, true);
  await page.getByRole("button", { name: "Recognize Text", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __RELEASE__?: () => void }).__RELEASE__))).toBe(true);
  await page.getByRole("button", { name: "Cancel Recognition", exact: true }).click();
  await page.evaluate(() => (window as unknown as { __RELEASE__: () => void }).__RELEASE__());
  await expect(page.getByRole("button", { name: "Copy Text", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Recognized text output", { exact: true })).not.toContainText("Hello");
});
