const CACHE_NAME = 'Timer Proofing-v0.1.2'; // Versi dinaikkan untuk memicu pembaruan
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo-donat.png', // Pastikan nama file fisiknya sudah tanpa spasi
  './assets/js/html2pdf.bundle.min.js',
  
  // PERHATIAN: 4 file di bawah ini sebelumnya 404 (Not Found).
  // Jika file ini memang disatukan di dalam index.html (tidak dibuat terpisah), 
  // Anda harus MENGHAPUSNYA dari daftar ini.
  './assets/css/style.css',
  './assets/js/app.js',
  './main.js', 
  './database-manager.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[Service Worker] Memulai caching file satu per satu...");
      
      for (let asset of ASSETS) {
        try {
          const request = new Request(asset, { cache: 'reload' }); 
          const response = await fetch(request);
          
          if (response.ok) {
            await cache.put(request, response);
          } else {
            console.warn(`⚠️ [Lewati] Gagal cache file: ${asset} (Status HTTP: ${response.status})`);
          }
        } catch (error) {
          console.error(`❌ [Error] File tidak ditemukan di direktori: ${asset}`);
        }
      }
      console.log("[Service Worker] Proses caching selesai.");
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Menghapus cache lama:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});

self.addEventListener('message', async (event) => {
    if (event.data.action === 'fetchWeather') {
        const { lat, lon } = event.data;
        const url = `https://proofing-donat-2.vercel.app/api/weather?lat=${lat}&lon=${lon}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({ action: 'weatherData', data: data });
            });
        } catch (error) {
            console.error("Gagal mengambil data cuaca via SW:", error);
        }
    }
});