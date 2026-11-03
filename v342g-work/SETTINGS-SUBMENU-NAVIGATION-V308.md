# Timer-Proofer ES6 Modular V308 — Settings Submenu Navigation

## Perubahan
- Modal anak dari Pengaturan (Koneksi Sensor, Preferensi, Bahasa, Bantuan, Tentang, Syarat & Ketentuan, Backup, Rate, Feedback) sekarang menyimpan konteks bahwa pengguna datang dari Pengaturan. Ketika modal anak ditutup, Pengaturan dibuka kembali melalui modal controller kanonis.
- Pilihan bahasa memakai `toggleModal()` terpusat agar state `active`, `inert`, `aria-hidden`, fokus, history, dan scroll-lock konsisten dengan modal lain.
- Pusat Bantuan membuka `help-modal` tanpa menutup Settings secara manual; tombol kembali cukup menutup Help, lalu controller mengembalikan Settings hanya bila Help dibuka dari Settings.
- Restart Tour menutup Settings melalui lifecycle modal, bukan hanya menghapus class `active`.
- Langkah tour 4 dan 5 sebelumnya menunjuk ke ID `#bottom-item-recipe` dan `#bottom-item-tips` yang tidak ada di HTML. Target diperbaiki ke ID aktual `#tab-recipe` dan `#tab-tips`.
- Tidak mengubah ID HTML, class, atau kontrak `data-action` yang sudah ada.
- Versi rilis V308; Service Worker cache `Timer-Proofing-v1.1.213`.

## Validasi
- `npm test`: 401 lulus, 0 gagal.
- Audit release: 0 import hilang, 0 ID duplikat, 0 handler inline, 0 aset lokal precache hilang.
- Pengujian browser/perangkat langsung tetap perlu dilakukan untuk memverifikasi pengalaman visual dan navigasi nyata.
