# Android Share Sheet Rich Link Preview — V338

## Latar belakang

Screenshot PWA di desktop menampilkan Windows Share Sheet yang dipanggil oleh Web Share API. Itu adalah UI milik Windows, bukan komponen PWA. Android menampilkan Android Sharesheet dengan gaya, daftar aplikasi, kontak, dan fitur sistem sesuai versi Android/OEM.

Target V338 adalah menyamakan informasi yang dibagikan dan menghadirkan pratinjau tautan Android yang lebih kaya; bukan menyalin piksel UI Windows ke Android.

## Temuan teknis

`@capacitor/share` v8 menerima `title`, `text`, `url`, dan `dialogTitle`. Pada implementasi Android plugin, `title` dipetakan ke `Intent.EXTRA_SUBJECT` untuk subjek email; `EXTRA_TITLE` yang dipakai Android Sharesheet untuk judul rich text preview tidak ditetapkan.

## Implementasi

- Menambahkan `SharePreviewPlugin` native Android, terdaftar manual melalui `MainActivity.registerPlugin(...)`.
- Plugin membentuk `Intent.ACTION_SEND` bertipe `text/plain`.
- `Intent.EXTRA_TEXT` berisi teks ajakan dan URL, atau URL saja untuk aksi tautan saja.
- `Intent.EXTRA_TITLE` diisi `Timer Proofer & Kalkulator HPP` sebagai judul preview Android.
- `Intent.EXTRA_SUBJECT` tetap diisi untuk kompatibilitas aplikasi email.
- Android chooser tetap dikelola OS agar daftar aplikasi dan rekomendasi kontak berasal dari sistem.
- JavaScript memakai plugin kaya ini hanya pada Android. PWA tetap menggunakan `navigator.share`; iOS dan build lama tetap mempunyai fallback ke `@capacitor/share`.

## Batas platform

Tampilan Windows Share Sheet tidak dapat dipaksakan pada Android. Android Sharesheet dapat menampilkan preview teks, title, target aplikasi, dan direct-share suggestion sesuai versi sistem. Tombol QR tidak dijamin tersedia di Android; fitur seperti itu harus dibuat sebagai aksi terpisah di UI aplikasi bila dibutuhkan.

## Validasi

- Test statis memeriksa metadata `EXTRA_TITLE`, `EXTRA_TEXT`, registrasi plugin, dan cabang pemanggilan Android.
- Build Gradle/kompilasi Java dan tampilan Sharesheet pada perangkat fisik tetap harus diuji setelah ekstraksi pada laptop Android SDK.
