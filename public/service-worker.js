// This is the service worker with basic offline caching

const CACHE_NAME = "coke-calculator-cache-v1";
const urlsToCache = ["/", "/index.html", "/manifest.json"];

// Install event - cache files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event - serve from cache if offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
