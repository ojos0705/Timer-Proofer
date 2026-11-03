# Timer-Proofer ES6 Modular V306 — Fix lapisan atas recipe-detail-view

## Temuan
CSS `.top-nav-bar` menggunakan `z-index: var(--z-navbar, 1000)`, sedangkan overlay `#recipe.recipe-modal` sebelumnya hanya mewarisi `z-index: 99` dari `.recipe-modal`. Overlay diposisikan `fixed` dengan `top: 0`, sehingga bagian header editor berada di area yang sama dengan top navigation. Karena navbar memiliki lapisan lebih tinggi, header dan tombol tutup kanan atas dapat tertutup navbar.

## Perbaikan
- Menetapkan `z-index: 1200` pada `#recipe.recipe-modal`, sehingga overlay resep berada di atas navbar.
- Mempertahankan `top: 0`, `bottom: 70px`, dan perilaku bottom bar yang sudah ada.
- Tidak mengubah ID, class, atribut, struktur DOM, atau handler tombol.
- Memperbarui cache-busting runtime menjadi `20261027-v306` dan cache Service Worker menjadi `Timer-Proofing-v1.1.211`.
- Menambah tes regresi untuk urutan lapisan overlay terhadap navbar.

## Validasi
Jalankan `npm run test:unit` dan `npm test`. Tes otomatis tidak menggantikan uji visual pada browser/PWA/Capacitor perangkat nyata.
