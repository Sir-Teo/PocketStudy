const CACHE_VERSION = 'pocketstudy-v2';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const COURSE_CACHE = `${CACHE_VERSION}-courses`;

const APP_ROUTES = ['/', '/learn', '/courses', '/editor', '/graph', '/stats', '/settings'];
const APP_SHELL = ['/index.html', '/courses/index.json', '/courses/demo/course.json', ...APP_ROUTES];

const cacheShell = async () => {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(APP_SHELL);
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    cacheShell().catch((error) => {
      console.warn('SW install failed', error);
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, COURSE_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const staleWhileRevalidate = async (cacheName, request) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
};

const cacheFirst = async (cacheName, request) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return cache.match('/index.html');
      }),
    );
    return;
  }

  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  if (request.url.includes('/courses/')) {
    event.respondWith(staleWhileRevalidate(COURSE_CACHE, request));
    return;
  }

  event.respondWith(cacheFirst(SHELL_CACHE, request));
});
