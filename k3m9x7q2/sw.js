/* NC Performance — funziona anche senza rete */
const CACHE = "ncp-v1";
const BASE = [ "./", "./index.html", "./manifest.webmanifest",
               "./icona-192.png", "./icona-512.png", "./icona-maskable.png" ];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASE); })
    .then(function () { return self.skipWaiting(); })
    .catch(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* prima la rete (così gli aggiornamenti arrivano), la copia salvata se la rete non c'è */
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      const copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return r;
    }).catch(function () {
      return caches.match(e.request).then(function (r) {
        return r || caches.match("./index.html");
      });
    })
  );
});
