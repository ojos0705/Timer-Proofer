# Timer Proofer V328 — Alarm Preview & Native PiP Single-Surface Fix

## Masalah yang ditangani
1. Preview nada dari `select-alarm-tone` tetap berbunyi setelah tombol **Simpan Pengaturan** ditekan.
2. Pada aplikasi Android Capacitor, jalur PiP browser berpotensi membuka jendela video/document PiP selain PiP milik Activity native.

## Perubahan

### Alarm preview
- `ProofingAlarmService` sekarang memiliki lifecycle preview terpisah: `playPreview()` dan `stopPreview()`.
- Audio preview memiliki referensi `HTMLAudioElement`, oscillator, dan playback generation tersendiri.
- `simpanPreferensiLengkap()` menghentikan preview sebelum modal ditutup.
- Menonaktifkan checkbox suara juga segera menghentikan preview.
- Jika promise `audio.play()` baru ditolak setelah preview dihentikan, generation guard mencegah fallback beep hidup kembali.
- Menghentikan preview tidak menghentikan alarm proofing yang sesungguhnya. Alarm sesungguhnya dapat mengambil alih dengan menghentikan preview terlebih dahulu.
- Pilihan nada yang disimpan tidak dihapus; hanya pemutaran preview yang dihentikan.

### PiP Android vs PWA
- Capacitor Android sekarang dipaksa menggunakan satu surface PiP: `MainActivity` / `TimerPipPlugin`.
- `canUseVideoPictureInPicture()` menolak jalur video PiP jika `NativeCapacitorService.isNativePlatform()` bernilai true.
- `aktifkanModePIP()` memeriksa native terlebih dahulu, membersihkan surface browser yang mungkin tersisa, lalu meminta PiP dari plugin native.
- Jalur `documentPictureInPicture`, video PiP Canvas, dan in-app mini tetap hanya untuk browser/PWA.
- Android manifest tetap menggunakan `supportsPictureInPicture=true` dan `launchMode=singleTask`.

## Perilaku yang diharapkan
- **PWA:** memakai PiP browser yang sudah berfungsi sebelumnya. Perilaku PWA tidak diganti.
- **Android Capacitor APK:** satu Activity Timer Proofer menyusut menjadi jendela PiP sistem. Layar di belakangnya adalah Home/launcher atau aplikasi lain yang sebelumnya berada di bawahnya. PiP Android adalah overlay satu Activity, bukan dua instance aplikasi. Jika Timer Proofer versi PWA masih terbuka di Chrome di belakang APK, itu merupakan instance browser terpisah.

## Batas validasi
Tes otomatis dan audit source dijalankan pada paket lokal. PiP Android native tetap perlu diuji melalui APK yang dibangun di Android Studio dan perangkat yang mendukung PiP. Tidak ada klaim bahwa APK atau perangkat fisik telah diuji di lingkungan ini.
