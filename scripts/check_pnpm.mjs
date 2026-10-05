// Fails early when the running pnpm is not the one package.json pins (packageManager). A
// different major reads the store differently; `pnpm licenses` then fails with
// ERR_PNPM_MISSING_PACKAGE_INDEX_FILE instead of a clear message (deploy report 2026-10-05).
import { readFileSync } from "node:fs";

const pinned = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).packageManager.replace(/^pnpm@/, "");
const running = /pnpm\/(\S+)/.exec(process.env.npm_config_user_agent ?? "")?.[1];
if (running !== pinned) {
  console.error(
    `pnpm ${running ?? "(unknown)"} is running, but package.json pins pnpm ${pinned}.\n` +
      `Use the pinned version, e.g.: npx -y pnpm@${pinned} install --frozen-lockfile && npx -y pnpm@${pinned} run check`,
  );
  process.exit(1);
}
console.log(`pnpm ${running} matches packageManager`);
