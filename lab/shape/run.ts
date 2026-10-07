// Shape-shading spike runner: taps.json + grayscale inputs → bands, area and timing per object.
// Usage: node lab/shape/run.ts <work dir with *.gray, *.json, taps.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { shadeObject } from "../../packages/imaging/src/shading.ts";

const dir = process.argv[2] as string;
const { objects } = JSON.parse(readFileSync(join(dir, "taps.json"), "utf8")) as {
  objects: { case: string; name: string; kind: string; taps: [number, number][] }[];
};
const results = [];
for (const [index, object] of objects.entries()) {
  const size = JSON.parse(readFileSync(join(dir, `${object.case}.json`), "utf8"));
  const gray = { ...size, data: new Uint8Array(readFileSync(join(dir, `${object.case}.gray`))) };
  for (const light of ["left", "right"] as const) {
    const start = performance.now();
    const result = shadeObject(gray, object.taps, light);
    const ms = performance.now() - start;
    const file = `out-${index}-${light}.bands`;
    if ("bands" in result) writeFileSync(join(dir, file), result.bands);
    results.push({ index, ...object, light, ms: Math.round(ms), ...("bands" in result ? { file } : result) });
  }
}
writeFileSync(join(dir, "results.json"), JSON.stringify(results, null, 2));
for (const r of results) console.log(r.case, r.name, r.kind, r.light, r.ms, "refused" in r ? r.refused : "area");
