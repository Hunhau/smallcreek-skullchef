/* Smallcreek Skullchef — offline shell cache (PWA / Add to Home Screen).
   Bump CACHE_VERSION when deploying so stale shells refresh. */
const CACHE_VERSION = 'build-279';
const CACHE_NAME = 'skullchef-shell-' + CACHE_VERSION;

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './version.json',
  './privacy.html',
  './events.js',
  './assets/skins/catalog.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png',
  './assets/img/bg.jpg',
  './assets/img/angel.png',
  './assets/img/chef.png',
  './assets/img/chef-hand.png',
  './assets/img/cauldron-legs.png',
  './assets/img/soup.png',
  './assets/img/spoon.png'
];

const NETWORK_FIRST = [
  './version.json',
  './live.json',
  './assets/skins/catalog.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('skullchef-shell-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .catch(() => {})
  );
});

function isNetworkFirst(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '') || '/';
    const rel = path.startsWith('/') ? '.' + path : path;
    if (rel.includes('/audio/') && rel.endsWith('.mp3')) return true;
    return NETWORK_FIRST.some((p) => rel.endsWith(p.replace('./', '')));
  } catch (e) {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;
  if (url.includes('supabase') || url.includes('cdn.jsdelivr.net') || url.includes('raw.githubusercontent.com')) {
    return;
  }

  if (req.mode === 'navigate') {
    // Network-first AND cache-bypassing: always pull a fresh index.html when online so a
    // resumed/relaunched PWA never boots a stale shell from the HTTP cache. Falls back to
    // the cached shell only when offline.
    event.respondWith(
      fetch(req.url, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (isNetworkFirst(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
