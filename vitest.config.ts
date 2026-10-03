import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/*/src/**/*.test.{ts,tsx}", "packages/*/src/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["apps/*/src/**/*.{ts,tsx}", "packages/*/src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "apps/web/src/main.tsx"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
