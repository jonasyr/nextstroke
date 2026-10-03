/**
 * Service-worker policy: cache only the versioned app shell. User artwork, blobs and
 * provider traffic never enter a general response cache (Phase 1 Task 3, spec §11).
 */
export function cacheName(version: string): string {
  return `nextstroke-shell-${version}`;
}

export function isPrecached(url: string, scope: string, precache: readonly string[]): boolean {
  if (!url.startsWith(scope)) return false;
  const path = url.slice(scope.length).split(/[?#]/)[0] ?? "";
  return precache.some((entry) => (entry === "./" ? path === "" : entry === path));
}

/** The worker script, self-contained so it runs without a bundler. */
export function renderServiceWorker(version: string, precache: readonly string[]): string {
  return `// Generated at build time. Version ${JSON.stringify(version)}.
const CACHE = ${JSON.stringify(cacheName(version))};
const PRECACHE = ${JSON.stringify(precache)};
const isPrecached = ${isPrecached.toString()};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("nextstroke-shell-") && key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const scope = self.registration.scope;
  const navigation = request.mode === "navigate" && request.url.startsWith(scope);
  if (!navigation && !isPrecached(request.url, scope, PRECACHE)) return;
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(navigation ? "index.html" : request, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || fetch(request)),
    ),
  );
});
`;
}
