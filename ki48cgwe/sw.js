/* NC Performance — v5
   La pagina si aggiorna sempre quando c'è rete: la copia salvata serve solo offline. */
const CACHE = "ncp-ki48cgwe-11022040";
const BASE = [ "./", "./index.html", "./manifest.webmanifest",
               "./icona-192.png", "./icona-512.png", "./icona-maskable.png" ];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(BASE); })
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  /* la pagina e gli altri file vengono richiesti saltando la cache del browser:
     senza questo, per dieci minuti il telefono riusa la copia vecchia */
  const fresco = new Request(req.url, {
    cache: "reload", mode: req.mode === "navigate" ? "same-origin" : req.mode,
    credentials: req.credentials, redirect: "follow"
  });

  e.respondWith(
    fetch(fresco).then(function (r) {
      if (r && r.status === 200) {
        const copia = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia); });
      }
      return r;
    }).catch(function () {
      return caches.match(req).then(function (r) {
        return r || caches.match("./index.html") || caches.match("./");
      });
    })
  );
});

/* se la pagina chiede di aggiornarsi subito */
self.addEventListener("message", function (e) {
  if (e.data === "aggiorna") self.skipWaiting();
});
