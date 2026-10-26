/* Noor-e-Tasbeeh service worker — offline shell + cached Quran/Hadith pages */
const VERSION = "1.2.1-acd99a6b";
const SHELL = "nt-shell-" + VERSION;
const DATA = "nt-data-v1";
const SHELL_FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("nt-shell-") && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // App shell: network first (so updates arrive), cache as fallback offline
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match("./index.html"))));
    return;
  }
  // Quran / Hadith data and fonts: cache first, then network (texts don't change)
  const cacheable = /api\.alquran\.cloud|cdn\.jsdelivr\.net\/gh\/fawazahmed0|fonts\.(googleapis|gstatic)\.com/.test(url.href);
  // Search results change with the query; whole-book hadith files are large — cache them too so search works offline later
  if (cacheable) {
    e.respondWith(caches.open(DATA).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") c.put(req, res.clone());
      return res;
    }));
  }
});
