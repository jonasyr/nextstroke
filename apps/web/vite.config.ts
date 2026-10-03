import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Static build for ChatGPT Sites (D-038): relative asset paths, no required response headers.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
});
