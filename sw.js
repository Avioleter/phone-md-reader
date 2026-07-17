/* MD 阅读器 — Service Worker：缓存应用外壳，支持离线打开 */
/* 升级缓存版本号会强制客户端重新拉取最新资源（含 styles.css / app.js），
   避免手机端长期停留在旧缓存、导致排版/逻辑不生效。 */
const CACHE = "mdreader-v2";
const ASSETS = [
  ".",
  "index.html",
  "styles.css",
  "app.js",
  "vendor/marked.min.js",
  "manifest.json",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
          return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // 只处理同源请求，外部打开的 HTML 文档等不做拦截
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    // 网络优先：始终尝试拿最新资源，保证手机端排版/逻辑即时更新
    fetch(e.request)
      .then(function (resp) {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      })
      .catch(function () {
        // 离线时回退到缓存，保证仍可打开文档
        return caches.match(e.request);
      })
  );
});
