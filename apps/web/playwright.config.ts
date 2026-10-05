import { existsSync } from "node:fs";
import { defineConfig, devices, webkit } from "@playwright/test";

// Real-browser checks for the browser bindings excluded from unit coverage (vitest.config.ts).
// PW_CHROMIUM_PATH points at a preinstalled Chromium where downloads are disabled.
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  use: { baseURL: "http://localhost:4319/" },
  // WebKit is Safari's engine, not iPhone Safari (AGENTS rule 9). It runs wherever it is
  // installed (scripts/setup.sh) and always in CI (PW_WEBKIT=1), so only what needs a real
  // iPhone is left for one (D-063).
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["iPhone 13 Mini"],
        browserName: "chromium",
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
    ...(process.env.PW_WEBKIT || existsSync(webkit.executablePath())
      ? [{ name: "webkit", use: { ...devices["iPhone 13 Mini"] } }]
      : []),
  ],
  webServer: {
    command: "pnpm exec vite preview --port 4319 --strictPort",
    url: "http://localhost:4319/",
    reuseExistingServer: false,
  },
});
