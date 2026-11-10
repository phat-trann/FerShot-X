import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: "artifacts/test-results",
  use: {
    baseURL: "http://127.0.0.1:1422",
    viewport: { width: 1180, height: 780 },
    launchOptions: {
      executablePath: process.env.FERSHOT_CHROME_PATH ?? (existsSync(macChrome) ? macChrome : undefined),
    },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 1422",
    url: "http://127.0.0.1:1422",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
