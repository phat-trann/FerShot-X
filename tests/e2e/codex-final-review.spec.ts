import { expect, test, type Page } from "@playwright/test";

async function openFixture(page: Page) {
  await page.goto("/");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 1000; canvas.height = 600;
    const ctx = canvas.getContext("2d")!;
    const fill = ctx.createLinearGradient(0, 0, 1000, 600); fill.addColorStop(0, "#274fa2"); fill.addColorStop(1, "#16233b");
    ctx.fillStyle = fill; ctx.fillRect(0, 0, 1000, 600); ctx.fillStyle = "#ffffff"; ctx.font = "bold 52px sans-serif"; ctx.fillText("A clearer perspective.", 80, 210);
    ctx.font = "24px sans-serif"; ctx.fillText("Synthetic workspace review · no personal images", 80, 270);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "synthetic-review.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.locator(".canvas-image")).toBeVisible();
}

test("inspector reconciliation has no duplicate keys and settings remain scrollable on a small desktop", async ({ page }) => {
  const errors: string[] = []; page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 800, height: 540 }); await openFixture(page);
  await page.getByRole("button", { name: "Inspect color", exact: true }).click();
  await page.getByRole("button", { name: "Sample color", exact: true }).click();
  await expect(page.getByRole("status", { name: "Pixel color", exact: true })).toContainText("RGBA");
  expect(errors.filter(value => /same key|children with/i.test(value))).toEqual([]);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByText("Application behavior", { exact: true }).click();
  const popover = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(popover).toBeVisible();
  const box = (await popover.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(540);
  expect(await page.locator(".settings-dialog__content").evaluate(node => getComputedStyle(node).overflowY)).toBe("auto");
  await page.screenshot({ path: "artifacts/qa/C42-small-verified.png" });
});

test("multiple tool drawers leave an accessible canvas and keyboard reachable output controls", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 540 }); await openFixture(page);
  for (const name of ["Automatic tonal adjustment", "Pixel effects", "Compose images / backdrop", "Print / local output"]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  const stage = page.getByRole("region", { name: "Image workspace" });
  expect((await stage.boundingBox())!.height).toBeGreaterThanOrEqual(200);
  await stage.scrollIntoViewIfNeeded(); await expect(page.locator(".canvas-image")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Save image…", exact: true }).focus();
  await expect(page.getByRole("button", { name: "Save image…", exact: true })).toBeFocused();
});

test("area selection cancellation releases its private screenshot and never adds it to the library", async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as any;
    target.isTauri = true; target.__revoked = []; target.__created = [];
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = value => { const url = create(value); target.__created.push(url); return url; };
    URL.revokeObjectURL = value => { target.__revoked.push(value); revoke(value); };
    target.__TAURI_INTERNALS__ = { invoke: async (command: string) => {
      if (command === "load_preferences") return { saveFormat: "png", jpegQuality: 90, downscaleRetina: false, showPreview: false };
      if (command === "capture_display") return { id: "synthetic", x: 0, y: 0, width: 100, height: 80, scale: 1 };
      if (command === "capture_image") {
        const canvas = document.createElement("canvas"); canvas.width = 100; canvas.height = 80;
        const pngBase64 = canvas.toDataURL("image/png").split(",")[1];
        return { pngBase64, width: 100, height: 80, byteSize: atob(pngBase64).length, displayScale: 1 };
      }
      throw new Error(`Mock does not implement ${command}`);
    } };
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Capture Area", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Capture Area", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Select capture region" })).toBeVisible();
  await expect(page.getByLabel("X (px)")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Select capture region" })).toHaveCount(0);
  expect(await page.evaluate(() => { const w = window as any; return w.__created.length === 1 && w.__revoked.includes(w.__created[0]); })).toBe(true);
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(0);
});

test("workspace visual review with an image and annotations", async ({ page }) => {
  await openFixture(page);
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await page.screenshot({ path: "artifacts/qa/C42-workspace-reviewed.png" });
  await page.getByRole("button", { name: "Annotate image", exact: true }).click();
  await expect(page.getByRole("application", { name: "Annotation canvas overlay" })).toBeVisible();
  await page.screenshot({ path: "artifacts/qa/C42-editor-reviewed.png" });
});

test("window appearance is reachable from the real workspace and exports actual trimmed source pixels", async ({ page }) => {
  await page.goto("/");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 100; canvas.height = 80;
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "transparent-window.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await page.getByRole("button", { name: "Compose images / backdrop", exact: true }).click();
  await page.getByText("Window background and shadow trim", { exact: true }).click();
  const controls = page.getByRole("region", { name: "Window Appearance Controls" });
  await controls.getByRole("radio", { name: "Solid Color", exact: true }).check();
  await controls.getByRole("checkbox", { name: "Trim Window Shadow Insets" }).check();
  await controls.getByLabel("Top", { exact: true }).fill("4");
  await controls.getByLabel("Right", { exact: true }).fill("3");
  await controls.getByLabel("Bottom", { exact: true }).fill("2");
  await controls.getByLabel("Left", { exact: true }).fill("5");
  await controls.getByRole("button", { name: "Apply Appearance" }).click();
  await expect(page.locator(".document-title")).toContainText("92 × 74 px");
  await expect(page.locator(".ferby-library-panel__item")).toHaveCount(2);
  const pixel = await page.locator(".canvas-image").evaluate((node: HTMLImageElement) => {
    const canvas = document.createElement("canvas"); canvas.width = node.naturalWidth; canvas.height = node.naturalHeight;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(node, 0, 0); return [...ctx.getImageData(0, 0, 1, 1).data];
  });
  expect(pixel).toEqual([255, 255, 255, 255]);
  await page.getByRole("button", { name: "Return to source image", exact: true }).click();
  await expect(page.locator(".document-title")).toContainText("transparent-window.png");
  expect(await page.locator(".canvas-image").evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(100);
});

for (const kind of ["linear-gradient", "radial-gradient", "image"]) {
  test(`workspace composes ${kind} backdrops through the production adapter`, async ({ page }) => {
    await openFixture(page);
    await page.getByRole("button", { name: "Compose images / backdrop", exact: true }).click();
    const controls = page.getByRole("region", { name: "Image composition controls" });
    await controls.getByRole("checkbox", { name: "Add backdrop", exact: true }).check();
    await controls.getByLabel("Backdrop fill", { exact: true }).selectOption(kind);
    await controls.getByRole("button", { name: "Create composed image", exact: true }).click();
    await expect(page.locator(".document-title")).toContainText("1128 × 728 px");
    await expect(page.locator(".ferby-library-panel__item")).toHaveCount(2);
    const pixels = await page.locator(".canvas-image").evaluate((node: HTMLImageElement) => {
      const canvas = document.createElement("canvas"); canvas.width = node.naturalWidth; canvas.height = node.naturalHeight;
      const ctx = canvas.getContext("2d")!; ctx.drawImage(node, 0, 0);
      return [[...ctx.getImageData(0, 0, 1, 1).data], [...ctx.getImageData(canvas.width - 1, canvas.height / 2, 1, 1).data]];
    });
    expect(pixels[0][3]).toBe(255); expect(pixels[1][3]).toBe(255); expect(pixels[0]).not.toEqual(pixels[1]);
    await page.getByRole("button", { name: "Select synthetic-review.png", exact: true }).click();
    await expect(page.locator(".document-title")).toContainText("1000 × 600 px");
  });
}
