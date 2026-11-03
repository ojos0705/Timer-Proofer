# Perbaikan Mini Stats dan Onboarding Swipe — V324

## Ruang lingkup

Rilis ini memperbaiki dua perilaku interaksi yang dilaporkan setelah V323. Jalur cetak resep tersimpan yang sudah berfungsi tidak diubah.

## 1. Swap `shrunk-main` dan `shrunk-sub`

Penyebab: listener klik sebelumnya dipasang di dalam callback `DOMContentLoaded` utama. Karena app-core dimuat melalui ES-module graph, modul dapat dievaluasi setelah `DOMContentLoaded`; pada kondisi itu, callback/listener lama tidak pernah dipasang. Sementara itu, `show-time`/`show-text` tetap bekerja karena memakai event delegation.

Perbaikan:
- Menambahkan `initMiniStatsSwapBinding()` dengan document-level delegated click listener.
- Binder dipanggil langsung ketika app-core dievaluasi dan dijaga oleh `window.__TP_MINI_STATS_SWAP_BOUND__` agar tidak terpasang dua kali.
- Listener mengenali `#shrunk-main` dan `#shrunk-sub`, lalu memanggil `jalankanSwapMini()` hanya ketika `#location-section` berstatus `shrunk`.
- Menghapus listener individual lama di dalam `DOMContentLoaded` supaya satu tap hanya menukar data satu kali.
- Menegaskan `pointer-events`, `touch-action: manipulation`, dan stacking order target tap pada header yang menyusut.

## 2. Geser onboarding menggunakan jari

Perbaikan pada `OnboardingManager` untuk `#onboarding-screen`:
- Memilih `.ob-slider-wrapper` sebagai area gesture.
- Menangani `pointerdown`, `pointerup`, `pointercancel`, dan `lostpointercapture`.
- Menggunakan ambang jarak/arah horizontal supaya scroll vertikal tidak keliru dianggap swipe.
- Swipe kiri berpindah ke slide berikutnya; swipe kanan kembali ke slide sebelumnya.
- Menyediakan fallback `touchstart`/`touchend` untuk WebView lama tanpa Pointer Events.
- CSS `touch-action: pan-y` mempertahankan gestur vertikal native sambil membiarkan gesture horizontal dikenali oleh onboarding.
- `goToSlide()` membatasi index dan memakai index hasil normalisasi untuk posisi track serta indikator.

## 3. Perilaku yang dipertahankan

- `location-section` tetap memakai logika shrink V323; tidak diubah pada rilis ini.
- `.scrollable-content` tetap menjadi area scroll utama (`overflow-y: auto`); tidak dijadikan sticky karena header `#location-section` yang berperan sticky.
- AI Telemetry, AI Analysis, AI Tips, reset AI resep, navigasi detail resep, dan jalur Premium Print tidak diubah.
- Versi produk tetap `V125`.

## Cache teknis

- Release token: `20261030-v324`
- Service Worker cache: `Timer-Proofing-v1.1.226`

## Validasi

- `npm test`: 433 lulus, 0 gagal.
- Release verifier: 247 file JavaScript dan 2 HTML diperiksa; 0 import hilang, 0 ID duplikat, 0 inline handler, 0 override scroll lock.
- Service Worker: 74 precache entries diperiksa.
- Audit nama fungsi: 0 deklarasi function duplikat dalam modul yang sama. Ada 14 nama fungsi serupa lintas modul; ini bersifat informatif karena tiap ES module memiliki scope sendiri.
- Belum dilakukan E2E manual pada perangkat fisik/browser HP. Uji swipe, tap mini stats, dan orientasi layar setelah deployment Preview tetap diperlukan.
