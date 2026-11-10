/* NC Performance — v5
   La pagina si aggiorna sempre quando c'è rete: la copia salvata serve solo offline. */
const CACHE = "ncp-b6t3w9k1-11102040";
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

  /* se la rete non risponde: la copia salvata (anche con un ?indirizzo diverso), poi la pagina salvata,
     poi un secondo tentativo in rete; mai una risposta vuota (5/11: «Returned response is null» con poca rete) */
  e.respondWith(
    fetch(fresco).then(function (r) {
      if (r && r.status === 200) {
        const copia = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia); });
      }
      return r;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true })
        .then(function (r) { return r || caches.match("./index.html"); })
        .then(function (r) { return r || caches.match("./"); })
        .then(function (r) { return r || fetch(req); })
        .catch(function () {
          return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<body style="font:16px -apple-system,sans-serif;padding:40px 24px;text-align:center;color:#23232A">' +
            '<p><b>Niente rete in questo momento.</b></p><p>Quando torna il segnale, tocca qui sotto.</p>' +
            '<p><button onclick="location.reload()" style="font:600 16px -apple-system,sans-serif;padding:12px 20px;border-radius:10px;border:1px solid #A9863B;background:#fff">Riprova</button></p></body>',
            { headers: { "Content-Type": "text/html; charset=utf-8" } });
        });
    })
  );
});

/* se la pagina chiede di aggiornarsi subito */
self.addEventListener("message", function (e) {
  if (e.data === "aggiorna") self.skipWaiting();
});
