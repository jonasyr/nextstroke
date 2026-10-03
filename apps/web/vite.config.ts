import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { serviceWorker } from "./sw-plugin.ts";

// Static build for ChatGPT Sites (D-038): relative asset paths, hash routing, no required headers.
export default defineConfig({
  base: "./",
  plugins: [react(), serviceWorker()],
  build: { outDir: "dist", emptyOutDir: true },
});
