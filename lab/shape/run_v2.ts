// Form v2 runner: one tap per object → area or refusal, bands, timing.
// Usage: node lab/shape/run_v2.ts <set dir with *.gray/*.json> <taps.json> <out dir> [v1|v2]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findForm, suggestKind } from "../../packages/imaging/src/forms.ts";
import { inkMask, regionFrom, shadeBands } from "../../packages/imaging/src/shading.ts";

const [dir, tapsFile, out, version = "v2"] = process.argv.slice(2) as [string, string, string, string?];
mkdirSync(out, { recursive: true });
const { objects } = JSON.parse(readFileSync(tapsFile, "utf8")) as {
  objects: { image: string; name: string; expect: string; tap: [number, number]; kind?: "round" | "flat" }[];
};
const results = [];
for (const [index, o] of objects.entries()) {
  const size = JSON.parse(readFileSync(join(dir, `${o.image}.json`), "utf8"));
  const gray = { ...size, data: new Uint8Array(readFileSync(join(dir, `${o.image}.gray`))) };
  const { width: w, height: h } = gray;
  const tap: [number, number] = [o.tap[0] * (w - 1), o.tap[1] * (h - 1)];
  const start = performance.now();
  const region =
    version === "v1" ? regionFrom(inkMask(gray), w, h, [tap]) : findForm(gray, [tap]);
  const ms = Math.round(performance.now() - start);
  const row: Record<string, unknown> = { index, ...o, ms };
  if ("mask" in region) {
    const kind = o.kind ?? "round";
    const bands = shadeBands(region.mask, w, h, "left", kind);
    writeFileSync(join(out, `${index}.bands`), bands);
    row.file = `${index}.bands`;
    if (version !== "v1") row.suggested = suggestKind(region.mask, w, h);
  } else row.refused = region.refused;
  results.push(row);
}
writeFileSync(join(out, "results.json"), JSON.stringify(results, null, 1));
const ms = results.map((r) => r.ms as number).sort((a, b) => a - b);
console.log("objects", results.length, "p95 ms", ms[Math.floor(ms.length * 0.95)], "max", ms.at(-1));
for (const r of results) console.log(r.index, r.image, r.name, r.expect, r.refused ?? "AREA", r.ms, r.suggested ?? "");
