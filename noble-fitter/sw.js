/* Noble Fitter service worker. Keeps the app on the phone so it opens with no signal.
   Bump VERSION on every change so phones pick up the new files. */
var VERSION = 'noble-fitter-v1';
var FILES = [
  './',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', function (e) {
  /* fetch each file and store a clean copy: a hosting redirect (index.html to the folder) must never be
     replayed for a page load, browsers refuse redirected responses from a service worker */
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      return fetch(f, { cache: 'reload' }).then(function (res) { if (!res.ok) throw new Error(f + ' ' + res.status); return clean(res); }).then(function (res) { return c.put(f, res); });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

function clean(res) {
  if (!res.redirected) return Promise.resolve(res);
  return res.blob().then(function (b) { return new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers }); });
}

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('noble-fitter-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Network first with a short wait, so a fresh push shows up straight away when there is signal,
   and the saved copy is used when there isn't. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  var scope = self.registration.scope;
  if (req.url.indexOf(scope) !== 0) return;

  var isPage = req.mode === 'navigate';
  e.respondWith(new Promise(function (resolve) {
    var done = false;
    function fromCache() {
      var key = isPage ? './' : req;
      return caches.open(VERSION).then(function (c) {
        return c.match(key, { ignoreSearch: true });
      });
    }
    var timer = setTimeout(function () {
      fromCache().then(function (hit) { if (hit && !done) { done = true; resolve(hit); } });
    }, 3000);
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        clean(copy).then(function (r) { return caches.open(VERSION).then(function (c) { return c.put(isPage ? './' : req, r); }); }).catch(function () {});
      }
      clearTimeout(timer);
      if (!done) { done = true; resolve(res); }
    }).catch(function () {
      clearTimeout(timer);
      fromCache().then(function (hit) {
        if (done) return;
        done = true;
        resolve(hit || new Response('Noble Fitter is offline and this page is not saved yet. Open it once with signal.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
      });
    });
  }));
});
