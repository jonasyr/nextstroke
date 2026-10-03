import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/*/src/**/*.test.{ts,tsx}", "packages/*/src/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["apps/*/src/**/*.{ts,tsx}", "packages/*/src/**/*.{ts,tsx}"],
      // Browser bindings and entry points are exercised in a real browser (apps/web/e2e).
      exclude: [
        "**/*.test.{ts,tsx}",
        "apps/web/src/main.tsx",
        "apps/web/src/compare/browser.ts",
        "apps/web/src/compare/decode.worker.ts",
        "apps/web/src/compare/vision.worker.ts",
      ],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
