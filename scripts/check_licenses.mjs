// Fails when a production dependency uses a license outside the allowlist (D-036).
import { execFileSync } from "node:child_process";

const allowed = new Set([
  "MIT",
  "Apache-2.0",
  "ISC",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "CC0-1.0",
  "BlueOak-1.0.0",
  "LGPL-3.0", // heic-to only, unmodified and lazy-loaded (spec §13.2)
]);

const raw = execFileSync("pnpm", ["licenses", "list", "--prod", "--json", "--recursive"], {
  encoding: "utf8",
});
const byLicense = JSON.parse(raw);
const bad = Object.entries(byLicense).filter(([license]) => {
  const parts = license.replace(/[()]/g, "").split(/\s+OR\s+/);
  return !parts.some((part) => allowed.has(part.trim()));
});
for (const [license, packages] of bad) {
  console.error(`License not allowed: ${license}: ${packages.map((p) => p.name).join(", ")}`);
}
const count = Object.values(byLicense).reduce((sum, list) => sum + list.length, 0);
console.log(`licenses: ${count} production packages checked`);
process.exit(bad.length ? 1 : 0);
