import { defineConfig, devices } from "@playwright/test";

// Real-browser checks for the browser bindings excluded from unit coverage (vitest.config.ts).
// PW_CHROMIUM_PATH points at a preinstalled Chromium where downloads are disabled.
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:4319/",
    ...devices["iPhone 13 Mini"],
    browserName: "chromium",
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: "pnpm exec vite preview --port 4319 --strictPort",
    url: "http://localhost:4319/",
    reuseExistingServer: false,
  },
});
