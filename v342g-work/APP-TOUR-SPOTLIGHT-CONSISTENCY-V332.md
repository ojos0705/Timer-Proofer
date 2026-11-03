# App Tour Spotlight Consistency — V332

## Masalah

Pada perangkat Android, card App Tour sudah dapat menyesuaikan tinggi layar setelah V330, tetapi sorotan langkah 4 (Resep) dan langkah 5 (Tips) tampak berbeda dari langkah 1–3.

## Perubahan

- Menyamakan penggunaan kelas `.tour-highlighted-element` untuk semua target langkah tour.
- Mengangkat stacking context `.bottom-bar` hanya ketika salah satu tab di dalamnya sedang disorot melalui `.tour-highlight-layer`.
- Menghapus perlakuan visual khusus pada tab yang disorot agar tidak mengubah bentuk/warna spotlight dibandingkan langkah 1–3.
- Meredupkan sibling navbar tanpa mengganti styling spotlight target.
- Memastikan ID tab yang dipakai tour sesuai markup aktif: `tab-timer`, `tab-recipe`, dan `tab-tips`.
- Menghapus kelas highlight dan stacking layer saat berpindah langkah, mengakhiri tour, atau teardown.
- Mempertahankan penanganan Android Back dari V330: Back pada langkah berikutnya mundur satu langkah; Back pada langkah pertama menutup App Tour.

## Batasan

Pengujian source memastikan selector, kelas, urutan, dan z-index. Tampilan aktual perlu dikonfirmasi kembali pada perangkat Android setelah APK V332 dipasang.
