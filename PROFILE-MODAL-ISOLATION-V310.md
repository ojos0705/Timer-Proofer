# Timer-Proofer ES6 Modular V310 — Isolasi Modal Profil

## Perubahan
- `#user-modal` diperlakukan sebagai wadah UI Profil saja.
- Saat modal bootstrap diinisialisasi, seluruh overlay yang masih menjadi turunan profil (`.page-modal`, `.unified-modal`, `.recipe-modal`, `.tips-modal`, `.article-modal-overlay`, dan `#modal-preview-foto`) dipindahkan ke `document.body`.
- Pemindahan menggunakan node DOM yang sama sehingga ID, isi, atribut, dan handler delegasi tetap dipertahankan.
- Pemanggilan `loadDynamicProfile()` tetap hanya dipicu ketika `#user-modal` dibuka.
- Cache Service Worker dinaikkan ke `Timer-Proofing-v1.1.216`; token runtime ke `20261027-v311`.

## Batas pengujian
Tes otomatis memvalidasi kontrak isolasi modal. Tampilan dan interaksi tetap perlu diverifikasi langsung di browser/PWA dan perangkat Capacitor.
