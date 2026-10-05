// Generated at build time. Version "c8530f86c453".
const CACHE = "nextstroke-shell-c8530f86c453";
const PRECACHE = ["./","assets/decode.worker-B_E2hECI.js","assets/index-DitLouIj.js","assets/index-frXm4qIz.css","assets/opencv-AjJB4fSW.js","assets/pdf-BCJYkcq2.js","assets/pdf.worker.min--XJMKApY.js","assets/pdf.worker.min-BmVo14Nb.mjs","assets/vision.worker-BFxntYX8.js","icon-180.png","icon.svg","index.html","manifest.webmanifest"];
const isPrecached = function isPrecached(url, scope, precache) {
	if (!url.startsWith(scope)) return false;
	const path = url.slice(scope.length).split(/[?#]/)[0] ?? "";
	return precache.some((entry) => entry === "./" ? path === "" : entry === path);
};

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
      cache.match(navigation ? "./" : request, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || fetch(request)),
    ),
  );
});
