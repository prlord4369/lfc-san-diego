// Service worker for the installable app. Network first, always: visitors get the current page and data.json
// whenever they're online; the saved copy is only used with no connection (shows the last fixtures, results, news).
// Only this site's own files are touched: the live score, ESPN, fonts and analytics go straight to the network.
// To switch it off for everyone: replace this file with one that calls self.registration.unregister().
var CACHE = "lfcsd-v1";
var START = ["./", "data.json", "history.json", "assets/crest-osc-san-diego.webp", "assets/icons/icon-192.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(START); }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  // Drop caches from older versions of this file
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.indexOf("/cdn-cgi/") === 0) return;          // Cloudflare sign-in on staging
  var page = req.mode === "navigate";
  e.respondWith(fetch(req).then(function (res) {
    // Keep a copy of good answers; skip the big 1600 px gallery photos (only opened when a photo is tapped)
    if (res.ok && res.type === "basic" && !/-1600\.jpg$/.test(url.pathname)) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(page ? "./" : req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(page ? "./" : req, { ignoreSearch: true }).then(function (hit) {
      return hit || (page ? caches.match("./") : Response.error());
    });
  }));
});
