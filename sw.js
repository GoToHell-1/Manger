self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("pharmacy-cache").then(cache => {
      return cache.addAll([
        "./index.html",
        "./manifest.json",
        "./copilot_image_1770376590397.jpeg"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});