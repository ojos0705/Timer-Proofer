const CACHE_NAME = 'Timer Proofing-v0.1.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/js/app.js',
  './logo donat.png',
  './assets/js/html2pdf.bundle.min.js'
];

// 3. Menginstall Service Worker & Langsung Skip Waiting agar update cepat diterapkan
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); 
});

// 4. Mengambil alih halaman seketika setelah service worker aktif (Bagus untuk kestabilan luring)
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); 
});

// 5. Strategi Cache: Coba ambil dari Cache dulu, jika gagal baru ambil dari Jaringan
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});

// 6. PERTAHANKAN: Fitur Proxy Cuaca Vercel Anda agar kalkulator proofing tidak eror
self.addEventListener('message', async (event) => {
    if (event.data.action === 'fetchWeather') {
        console.log("Menerima request koordinat di SW:", event.data);
        
        const { lat, lon } = event.data;
        const url = `https://proofing-donat-2.vercel.app/api/weather?lat=${lat}&lon=${lon}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            console.log("Data cuaca berhasil didapat dari Vercel:", data);
            
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