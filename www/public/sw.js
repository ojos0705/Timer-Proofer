const CACHE_NAME = 'Timer-Proofing-v0.1.4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo-donat.svg',
  './assets/js/tipsData.js',
  './assets/js/html2pdf.bundle.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS) {
        try {
          const request = new Request(asset, { cache: 'reload' });
          const response = await fetch(request);
          if (response.ok) await cache.put(request, response);
        } catch (error) {
          console.warn('[Service Worker] Lewati cache:', asset, error && error.message);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = event.request.mode === 'navigate'
    || (isSameOrigin && (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')));

  if (isNavigation) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (isSameOrigin && response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING' || data.action === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.action === 'fetchWeather') {
    const { lat, lon } = data;
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      console.warn('[Service Worker] Invalid coordinates for weather fetch:', { lat, lon });
      return;
    }
    const url = `https://timer-proofer.vercel.app/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Weather API returned ${response.status}`);
      const payload = await response.json();
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        try {
          client.postMessage({ action: 'weatherData', data: payload });
        } catch (postErr) {
          console.warn('[Service Worker] Failed to post message to client:', postErr);
        }
      });
    } catch (error) {
      console.error('Gagal mengambil data cuaca via SW:', error);
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        try {
          client.postMessage({ action: 'weatherError', error: error.message });
        } catch (postErr) {
          console.warn('[Service Worker] Failed to post error to client:', postErr);
        }
      });
    }
  }
});
