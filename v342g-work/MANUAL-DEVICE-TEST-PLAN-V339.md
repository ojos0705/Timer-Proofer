# Manual Device Test Plan — V339 Settings Typography

## PWA desktop
1. Buka halaman Pengaturan.
2. Bandingkan semua 11 judul item: Koneksi Sensor, Preferensi Aplikasi, Bahasa Aplikasi, Pusat Bantuan, Tour Aplikasi, Syarat & Ketentuan, Pencadangan, Tentang Aplikasi, Bagikan ke Teman, Beri Nilai Kami, dan Berikan Saran.
3. Pastikan seluruh judul tampak pada ukuran/bobot yang sama dan seluruh deskripsi menggunakan ukuran pendukung yang sama.
4. Klik setiap baris dan pastikan navigasi aslinya tidak berubah.

## Android APK
1. Build dan install APK dari V339.
2. Ulangi pemeriksaan semua 11 baris pada layar HP.
3. Uji satu bahasa dengan label panjang, misalnya Bahasa Aplikasi / App Language.
4. Uji ukuran font sistem standar dan satu tingkat pembesaran.
5. Pastikan baris dapat disentuh dan daftar dapat di-scroll seperti sebelumnya.

## Acceptance criteria
- “Tour Aplikasi” tidak lagi lebih besar atau lebih tebal daripada judul menu lain.
- Judul/deskripsi menggunakan hirarki Golden Ratio yang seragam.
- Tidak ada clipping atau overflow pada label yang panjang.
- Semua menu dan action tetap berfungsi.
