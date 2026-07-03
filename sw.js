const CACHE_NAME = 'donut-pwa-v02';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Menginstall Service Worker dan menyimpan aset
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. BARU: Mengambil alih halaman seketika setelah service worker aktif
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); 
});

// Menjalankan aplikasi secara offline dengan mengambil data dari cache
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

self.addEventListener('message', async (event) => {
    if (event.data.action === 'fetchWeather') {
        console.log("Menerima request koordinat di SW:", event.data);
        
        // 1. Ambil data lat dan lon dari pesan yang dikirim index.html
        const { lat, lon } = event.data;
        
        // 2. Gunakan backtick (`) agar variabel ${lat} dan ${lon} bisa terbaca
        const url = `https://proofing-donat-2.vercel.app/api/weather?lat=${lat}&lon=${lon}`;
        
        try {
            // 3. Lakukan fetch ke server proxy Vercel Anda
            const response = await fetch(url);
            const data = await response.json();
            console.log("Data cuaca berhasil didapat dari Vercel:", data);
            
            // 4. Kirim balik data cuaca tersebut ke index.html (Main Window)
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    action: 'weatherData',
                    data: data
                });
            });
            
        } catch (error) {
            console.error("Gagal mengambil data cuaca via SW:", error);
        }
    }
});