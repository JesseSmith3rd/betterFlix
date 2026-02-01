const CACHE_NAME = "betterflix-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Don’t cache video streams; always fetch them live
  if (url.pathname.startsWith("/api/stream/")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
