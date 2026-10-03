import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { renderServiceWorker } from "./src/sw/policy.ts";

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

/**
 * Writes sw.js after the build with every output file (HTML, assets, manifest, icons) in the
 * precache list. The version is a hash of the files' names and contents.
 */
export function serviceWorker(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "nextstroke-service-worker",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    closeBundle() {
      const outDir = join(config.root, config.build.outDir);
      const files = listFiles(outDir)
        .map((path) => relative(outDir, path).split(sep).join("/"))
        .filter((name) => name !== "sw.js" && !name.endsWith(".map"))
        .sort();
      const hash = createHash("sha256");
      for (const name of files) hash.update(name).update(readFileSync(join(outDir, name)));
      const version = hash.digest("hex").slice(0, 12);
      writeFileSync(join(outDir, "sw.js"), renderServiceWorker(version, ["./", ...files]));
    },
  };
}
