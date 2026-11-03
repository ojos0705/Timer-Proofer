# Settings Typography — Golden Ratio V339

## Tujuan
Menyamakan ukuran tipografi seluruh item pada halaman Pengaturan. Sebelumnya, item umum memakai judul `0.82rem` dan deskripsi `0.7rem`, sedangkan item “Tour Aplikasi” memakai judul `14px`, deskripsi `12px`, ikon `18px`, dan jarak ikon-teks `14px`. Perbedaan lokal tersebut membuat baris Tour tampak lebih besar.

## Perubahan
- Menambahkan satu skala tipografi pada `#settings-modal`:
  - Judul item: `1rem`.
  - Deskripsi pendukung: `1rem / 1.618` (`0.618rem`), mengikuti pasangan Golden Ratio.
- Menyamakan bobot, warna, dan line-height untuk seluruh judul dan deskripsi.
- Menyamakan ukuran ikon, chevron, dan jarak ikon-teks pada semua baris.
- Menghapus ukuran inline khusus pada baris Tour agar tidak memiliki skala mandiri.
- Menjaga padding baris, area sentuh, teks, ID, atribut `data-action`, struktur DOM, dan perilaku navigasi tetap sama.
- CSS menggunakan selector berdasarkan struktur menu yang sudah ada; tidak menambah atau mengganti ID maupun class pada markup.

## Cakupan
Hanya tipografi dan konsistensi visual daftar menu pada halaman Pengaturan. Tidak mengubah Welcome Screen, App Tour overlay, login/register, fitur penerjemahan, share sheet, timer, AI, storage, ataupun alur backend.

## Verifikasi
- Tes regresi khusus memastikan kesebelas baris menu memakai satu aturan tipografi.
- Tes metadata memastikan token V339 dan cache Service Worker seragam.
- `npm test`: 519 lulus, 0 gagal.
- Release verifier: 80 aset precache, 69 modul boot, 278 file JavaScript, 2 HTML, 306 ID HTML, 0 ID duplikat, 0 import lokal hilang, 0 inline event handler, dan 0 override scroll-lock di luar modul pemilik.
- Audit fungsi: 0 deklarasi function duplikat dalam modul yang sama.

## Batas verifikasi
Belum dilakukan screenshot/browser visual QA dan uji APK pada perangkat fisik. Periksa ukuran pada PWA dan Android setelah paket diekstrak dan APK dibangun.

## Versi
- Versi produk: V125.
- Revisi teknis: V339.
- Release token: `20261101-v339`.
- Service Worker cache: `Timer-Proofing-v1.1.241`.
