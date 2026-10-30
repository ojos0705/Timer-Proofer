# Android System PiP Back & Fixed App Shell — V327

## Perubahan

### 1. Android Back saat countdown aktif
- `MainActivity` memasang `OnBackPressedCallback` pada `OnBackPressedDispatcher` setelah Capacitor Bridge dibuat.
- Jika `TimerPipPlugin.isProofingTimerActive()` bernilai `true`, callback meminta Android memasukkan seluruh Activity ke system Picture-in-Picture dengan aspect ratio 16:9.
- Jika PiP tidak tersedia/ditolak, Activity dipindahkan ke background melalui `moveTaskToBack(true)`; WebView tidak diarahkan ke halaman keluar.
- Android 13+ ditangani melalui `OnBackPressedDispatcher`; Android 8–12L juga memiliki override `onBackPressed()` sebagai jalur legacy.
- Jika timer tidak aktif, Back diteruskan ke dispatcher/super agar perilaku normal Capacitor/WebView tetap berlaku.
- `onUserLeaveHint()` tetap dipertahankan untuk tombol Home/app switcher. `onPictureInPictureModeChanged()` tetap mengirim event ke WebView agar class `native-pip` masuk/keluar tepat waktu.

### 2. Shell aplikasi tidak ikut scroll
- `html` dikunci pada tinggi viewport dan `overflow:hidden`.
- `body` tidak lagi menggunakan `position: static !important`; sekarang `position: fixed` dengan ukuran viewport dan lebar maksimum 480px.
- `#app-container` menempati frame body secara absolut dan `overflow:hidden`.
- `#app-container > .scrollable-content` tetap menjadi satu-satunya pemilik scroll vertikal utama (`overflow-y:auto`, `-webkit-overflow-scrolling:touch`, `touch-action:pan-y`).
- Form login/daftar tetap dapat discroll secara internal pada layar pendek melalui `#auth-wrapper`.

### 3. Tidak berubah
- PWA video PiP dan browser history guard tidak diubah.
- AI Telemetry, AI Analysis, AI Tips, recipe UI, Premium Print, dan product-facing version V125 tidak diubah.

## Build Android

```powershell
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
```

Pastikan Picture-in-Picture diizinkan pada App Info Android untuk Timer Proofer. Perangkat harus Android 8.0/API 26 atau lebih baru.

## Pengujian perangkat yang perlu dilakukan
1. Mulai countdown pada APK Capacitor.
2. Tekan tombol Back Android saat timer aktif. Seluruh Activity harus masuk PiP sistem; pengguna dapat kembali ke launcher dan membuka aplikasi lain.
3. Sentuh PiP untuk memperbesar kembali. Tampilan normal harus pulih dan countdown tetap berjalan.
4. Ketika timer tidak aktif, tombol Back tetap menjalankan navigasi/penutupan overlay normal.
5. Pada browser/PWA, pastikan video PiP tetap berjalan seperti sebelumnya.
6. Pada layar desktop dan HP, scroll konten utama ke bawah lalu ke atas. Body dan `#app-container` harus diam; hanya area konten bagian dalam yang bergerak.
7. Pada halaman auth di layar pendek, form login/daftar tetap dapat digulir di dalam `#auth-wrapper`.

## Batas validasi
Automated Node tests dan audit statis dijalankan. Build Gradle, uji Android fisik, serta uji PWA/browser nyata tidak dilakukan di lingkungan ini. PiP native harus dikonfirmasi dengan APK hasil build pada perangkat Android.
