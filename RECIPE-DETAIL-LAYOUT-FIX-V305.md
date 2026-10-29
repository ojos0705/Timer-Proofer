# Timer Proofer ES6 Modular V305 — Recipe Detail Layout

## Perubahan
- Menambahkan tombol tutup `#btn-recipe-close-top` (×) di kanan atas editor detail resep. Tombol menggunakan handler yang sudah ada di `app-core.js`; tidak membuat handler penutupan duplikat.
- Header detail resep sekarang membatasi lebar terhadap viewport, menghormati safe area atas/kiri/kanan, dan mengizinkan input nama resep menyusut dengan benar.
- Pada layar sempit (≤520px), header disusun menjadi dua baris agar tombol `+ Resep Baru`, `Simpan`, dan `×` tidak terdorong keluar layar.
- Area konten detail mempertahankan scroll internal dan ruang bawah agar konten tidak tertutup tombol footer.
- Cache Service Worker dinaikkan ke `Timer-Proofing-v1.1.210` agar instalasi mendapat aset yang diperbarui.
- Tidak mengubah ID, class, data-action, atau struktur elemen lama; hanya menambahkan ID tombol tutup yang memang sudah dirujuk oleh kode `app-core.js`.

## Validasi
- `npm run test:unit`: 395 tes lulus, 0 gagal.
- Pemeriksaan statis tombol close, handler, responsive breakpoint, safe area, dan cache: lulus.
- Belum mengklaim uji klik langsung di browser/perangkat pengguna; verifikasi visual akhir tetap perlu dilakukan pada layar desktop dan ponsel.
