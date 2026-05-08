// TeachAny PWA Service Worker
const CACHE_NAME = 'teachany-v1';
const ASSETS_TO_CACHE = [
  '/teachany-pwa/',
  '/teachany-pwa/index.html',
  '/teachany-pwa/tree.html',
  '/teachany-pwa/path.html',
  '/teachany-pwa/license.html',
  '/teachany-pwa/commercial-license.html',
  '/teachany-pwa/scripts/export-courseware.js',
  '/teachany-pwa/scripts/unified-loader.js',
  '/teachany-pwa/scripts/stats-calculator.js',
  '/teachany-pwa/scripts/learning-path.js',
  '/teachany-pwa/icons/icon-192.png',
  '/teachany-pwa/icons/icon-512.png'
];

// 安装阶段 - 缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 缓存核心资源');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活阶段 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截 - 缓存优先策略
self.addEventListener('fetch', (event) => {
  // 跳过非GET请求和跨域请求
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // 返回缓存，同时后台更新
          event.waitUntil(
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                  });
                }
              }).catch(() => {})
          );
          return cachedResponse;
        }

        // 没有缓存，从网络获取
        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            // 缓存新资源
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          });
      })
      .catch(() => {
        // 离线且无缓存时返回离线页面
        if (event.request.mode === 'navigate') {
          return caches.match('/teachany-pwa/index.html');
        }
      })
  );
});
