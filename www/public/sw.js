// Ganti nama versi ini setiap kali Anda mengubah file JS/CSS/HTML
const CACHE_NAME = 'Timer-Proofing-v0.1.8'; 

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo-donat.svg',
  './assets/js/boot.js',
  './assets/js/tipsData.js',
  './assets/js/html2pdf.bundle.min.js',
  './assets/js/lang-data.js',
  './assets/js/lang-renderer.js',
  './assets/js/lang-packs.js',
  './assets/js/offline-i18n.js',
  './assets/js/language-engine.js',
  './assets/js/pwa.js',
  './assets/js/app-core.js',
  './assets/js/core/onclick-migration.js',
  './assets/lang/_manifest.json',
  './assets/lang/en.json'
];

const LANG_MANIFEST = './assets/lang/_manifest.json';

// Unduh SEMUA paket bahasa (daftar diambil dari _manifest.json) ke cache, 6 file paralel.
// Dipicu oleh halaman (offline-i18n.js) lewat postMessage saat online, jadi tidak menghambat instalasi SW.
async function warmLangPacks() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await fetch(LANG_MANIFEST, { cache: 'reload' });
    if (!res.ok) return;
    const copy = res.clone();
    const manifest = await res.json();
    await cache.put(LANG_MANIFEST, copy);
    const langs = (manifest.langs || []).filter((code) => code !== 'id');
    for (let i = 0; i < langs.length; i += 6) {
      await Promise.all(langs.slice(i, i + 6).map(async (code) => {
        const url = './assets/lang/' + code + '.json';
        try {
          if (await cache.match(url)) return;
          const r = await fetch(url, { cache: 'reload' });
          if (r.ok) await cache.put(url, r);
        } catch (err) {
          console.warn('[Service Worker] Lewati paket bahasa:', code, err && err.message);
        }
      }));
    }
  } catch (err) {
    console.warn('[Service Worker] warmLangPacks gagal:', err && err.message);
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS) {
        try {
          // Mencegah browser HTTP mengambil dari cache lama saat install
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
    ).then(() => self.clients.claim()) // Memastikan SW langsung mengontrol semua tab terbuka
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = event.request.mode === 'navigate'
    || (isSameOrigin && (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')));

  // Strategi 1: Network-First untuk Navigasi Halaman
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

  // Strategi 2: Cache-First dengan Dynamic Caching untuk Aset lain (CSS/JS/Gambar)
  // Aset statis di /assets/ dicocokkan tanpa query (?v=...) agar hasil precache tetap terpakai offline.
  const isStaticAsset = isSameOrigin && url.pathname.indexOf('/assets/') > -1;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: isStaticAsset }).then((cached) => {
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

  // Unduh semua paket bahasa untuk mode offline (harus dipanggil sebelum await pertama)
  if (data.action === 'warmLangPacks') {
    event.waitUntil(warmLangPacks());
    return;
  }
  
  // PENYESUAIAN: Menangani multi-format trigger untuk "Update Aplikasi" dari Frontend
  if (
      data === 'skipWaiting' || 
      data.action === 'skipWaiting' || 
      data.type === 'SKIP_WAITING' || 
      data.action === 'SKIP_WAITING'
  ) {
    self.skipWaiting();
    return;
  }

  // Fitur Existing: Mengambil Data Cuaca
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