// Block Puzzle — service worker (offline app shell).
// Bump CACHE whenever shell files change so clients pick up the new version.
const CACHE = 'bp-v2';
const SHELL = [
  './', 'index.html', 'css/styles.css',
  'js/graphics.js', 'js/game.js', 'config.js',
  'gsap.min.js', 'splash.jpg', 'manifest.json',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;              // POST etc. (Supabase writes) → untouched
  const url = new URL(req.url);
  if (url.hostname.includes('supabase')) return; // never cache the leaderboard API

  // Google Fonts + Material Icons: cache-first (immutable, opaque OK) so they work offline.
  if (/fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(c => c || fetch(req).then(res => {
        const cp = res.clone(); caches.open(CACHE).then(ch => ch.put(req, cp)); return res;
      }))
    );
    return;
  }

  // Same-origin: network-first (fresh when online), fall back to cache offline.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res;
      }).catch(() => caches.match(req).then(c => c || caches.match('index.html')))
    );
  }
});
