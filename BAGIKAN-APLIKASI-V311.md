# Perbaikan Bagikan Aplikasi — V311

## Perubahan
- Mempertahankan kontrak menu yang sudah ada: `data-action="bagikanAplikasi"` dan `window.bagikanAplikasi`.
- Menggunakan plugin Share Capacitor pada Android/iOS native jika tersedia.
- Menggunakan Web Share API pada browser modern tanpa pembatasan user-agent.
- Memakai URL web publik `https://timer-proofer.vercel.app/` saat berjalan pada native `capacitor://localhost`, bukan membagikan URL localhost native.
- Menyediakan fallback Clipboard API dan prompt manual untuk desktop/browser dengan izin clipboard terbatas.
- Membatalkan dialog berbagi tidak dianggap sebagai kegagalan dan tidak memunculkan prompt fallback.
- Memperbarui cache-busting ke `20261027-v311` dan cache Service Worker ke `Timer-Proofing-v1.1.216`.
- Menambahkan tes regresi khusus fitur berbagi.

## Verifikasi
- `npm test`: 406 tes lulus, 0 gagal.
- Pemeriksaan release: lulus; 0 import hilang, 0 ID duplikat, 0 inline event handler, 0 deklarasi fungsi duplikat dalam modul yang sama.
- Pemeriksaan ini adalah tes statis/unit; berbagi melalui dialog Android/iOS dan browser nyata tetap perlu diuji pada perangkat.
