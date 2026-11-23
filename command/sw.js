// Service worker: works offline, shows notifications, and (phase 2) receives push.
const CACHE = 'command-v6';
const SHELL = [
  './', 'index.html', 'config.js', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/live.js', 'js/merge.js', 'js/login.js', 'js/live-boot.js', 'js/ask-bridge.js', 'js/util.js', 'js/store.js', 'js/sample.js', 'js/planner.js', 'js/sergeant.js', 'js/advice.js',
  'js/integrations.js', 'js/icons.js', 'js/charts.js', 'js/notify.js', 'js/ui.js', 'js/timer.js', 'js/habits.js',
  'js/today.js', 'js/ads.js', 'js/money.js', 'js/settings.js', 'js/jarvis.js', 'js/sound.js', 'js/mind.js', 'js/tour.js', 'js/ask.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

// Only clear this app's old caches: other apps on the same website keep theirs.
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('command-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first so updates show straight away, cache when offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin || new URL(req.url).pathname.includes('/api/')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});

// Phase 2: the backend sends { title, body, tag } as Web Push.
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Command', {
    body: data.body || '', tag: data.tag || 'cmd', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', renotify: true,
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => 'focus' in c);
    if (open) return open.focus();
    return self.clients.openWindow('./index.html#today');
  }));
});
