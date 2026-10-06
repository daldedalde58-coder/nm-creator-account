const CACHE = "nm-creator-v1";
const SHELL = ["./", "index.html", "styles.css", "app.js", "firebase-config.js", "manifest.json", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Cache the Firebase SDK scripts so the app shell opens offline; never touch Firebase API traffic.
  const sdk = url.hostname === "www.gstatic.com";
  const own = url.origin === location.origin;
  if (!sdk && !own) return;
  e.respondWith(
    fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html")))
  );
});
