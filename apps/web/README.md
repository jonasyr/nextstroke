# NextStroke web app

React/Vite PWA shell (Phase 1 Task 3). German UI only (D-040), hash routing, static build.

## Develop

```bash
pnpm --filter @nextstroke/web dev      # http://localhost:5173
pnpm run check                          # everything CI runs for the workspace
```

## Build

```bash
pnpm run build                          # writes apps/web/dist/
pnpm --filter @nextstroke/web preview   # serves the build, including the service worker
```

`dist/` is a plain static directory: relative asset paths, hash routes (`#/compare`, `#/projects`, `#/guided`), no required response headers, no server rewrites (D-038). `sw.js` is generated after the build and precaches exactly the files in `dist/` (HTML, assets, manifest, icons). It never caches user artwork, blobs, or provider requests. The cache name carries a hash of the build, so a new deployment installs a new worker; the app then shows "Eine neue Version ist bereit. Neu laden".

Verified on 2026-10-03 in Chromium against `vite preview`: the app reloads offline, navigation and the immersive container work offline, and deep links such as `#/projects` resolve.

## Deploy to ChatGPT Sites (manual)

1. From the repository root, with Node 22.12 or newer and pnpm 12.8.1 (Corepack, or `npx -y pnpm@12.8.1` in place of `pnpm`): `pnpm install --frozen-lockfile`, `pnpm run check`, `pnpm run build`.
2. In ChatGPT Sites, create or update a private site in **static** mode with `apps/web/dist` as the directory. The app needs no D1 or R2 binding; if Sites asks for one, leave it empty and unused (see `docs/research/2026-10-03-sites-probe-iphone.md`).
3. Open the site on the iPhone, add it to the Home Screen, reload once with the network on, then check that it opens in airplane mode.
4. After each redeploy, open the installed app once online and confirm the update notice appears and **Neu laden** loads the new version.

Real-iPhone checks are a release gate (AGENTS rule 9); Chromium results do not replace them.
