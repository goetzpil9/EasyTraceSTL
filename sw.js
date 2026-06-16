/*
  EasyTraceSTL – Service Worker
  --------------------------------
  Speichert die App-Dateien lokal, damit alles offline läuft.
  Google Fonts werden BEWUSST nicht gecacht -> online schöne Schrift,
  offline automatischer System-Fallback (im CSS bereits hinterlegt).

  WICHTIG: Wenn du das Tool aktualisierst, erhöhe die Versionsnummer
  in CACHE_NAME (z.B. v1 -> v2). Dadurch lädt der Browser bei den
  Nutzern beim nächsten Online-Start automatisch die neuen Dateien.
*/

const CACHE_NAME = "easytracestl-v1";

// Alle Dateien, die für den Offline-Betrieb nötig sind.
// Pfade sind relativ -> funktioniert auch im GitHub-Pages-Unterordner.
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./vendor/three.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

// Beim Installieren: alle Dateien in den Cache laden.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Beim Aktivieren: alte Cache-Versionen aufräumen.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Bei jeder Anfrage:
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Nur GET-Anfragen behandeln.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Cross-Origin (z.B. Google Fonts, buymeacoffee) NICHT cachen:
  // einfach durchreichen. Offline schlägt das fehl -> CSS-Fallback greift.
  if (url.origin !== self.location.origin) {
    return; // Browser regelt das normal über das Netzwerk
  }

  // Navigationsanfragen (Seitenaufruf) -> immer index.html aus dem Cache.
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((cached) => cached || fetch(req))
    );
    return;
  }

  // Sonst: Cache-first. Erst Cache, dann Netzwerk als Reserve.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Frisch geladene gleiche-Herkunft-Dateien nachträglich cachen.
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => cached); // offline & nicht im Cache -> nichts zu tun
    })
  );
});
