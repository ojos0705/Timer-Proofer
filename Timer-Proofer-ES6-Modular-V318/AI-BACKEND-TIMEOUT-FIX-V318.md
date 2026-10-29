# AI Backend Timeout & Deployment Diagnostic — V318

Tanggal: 28 Oktober 2026
Versi produk yang tampil: **V125** (dipertahankan)

## Perubahan

- Menetapkan batas keras **6 detik per pemanggilan model**. Implementasi memakai `AbortController`/`config.abortSignal` dan `Promise.race`, sehingga handler tidak harus menunggu promise provider yang macet.
- Menonaktifkan automatic continuation agar satu percobaan model tidak diam-diam berkembang menjadi beberapa request yang melampaui deadline.
- Fallback tetap mencoba maksimal tiga model unik: `gemini-3.8-flash`, `gemini-3.6-flash`, lalu `gemini-3.5-flash-lite`. Tiga timeout berurutan dibatasi sekitar 18 detik, sebelum overhead kecil serialisasi/import; tetap di bawah batas request frontend 30 detik dalam kondisi normal.
- Timeout diklasifikasikan sebagai gangguan sementara, bukan kuota habis. Kegagalan overload/timeout tetap menghasilkan status 503 setelah fallback habis; pesan provider internal tidak dikirim ke browser.
- Log fallback dan error memuat nama endpoint serta penanda `[V318]`, misalnya `[ai-telemetry][V318]`. Semua respons AI juga mengirim header `X-AI-Backend-Revision: V318` dan mengeksposnya melalui CORS agar versi kode aktif dapat diverifikasi meskipun request berhasil.
- API kanonis di `api/` disalin ke `www/public/api/` melalui `scripts/sync-web-assets.mjs`, menjaga dua jalur tersebut identik.
- ID, kelas, selector, struktur UI, dan label versi produk tidak diubah. `version.json` tetap memakai release token frontend `20261027-v317` karena aset frontend tidak berubah pada hotfix backend ini; tanggal rilis metadata diperbarui.

## Pemeriksaan lokal

- `tests/ai-utils.test.mjs`: **13/13 lulus**, termasuk simulasi request provider yang tidak pernah selesai.
- Seluruh unit/regression test (`node --test tests/*.test.mjs`): **411/411 lulus**.
- `scripts/verify-release.mjs`: lulus; graph entrypoint 67 modul, 243 berkas JavaScript dan 2 HTML, tidak ada import hilang, ID HTML duplikat, atau inline handler.
- `scripts/audit-function-names.mjs`: lulus untuk deklarasi function duplikat dalam modul yang sama (0). Ada 14 nama function berulang lintas modul yang dicatat sebagai informatif dan tidak otomatis dianggap bug.
- Hash `api/ai-utils.js` sama dengan `www/public/api/ai-utils.js`; seluruh handler AI juga disinkronkan.

## Langkah verifikasi deployment

1. Deploy source V318 ke **project dan Root Directory Vercel yang benar**. Pastikan `api/` yang menjadi route aktif memang berasal dari paket/commit ini; jangan hanya menyalin file frontend.
2. Pastikan respons membawa header `X-AI-Backend-Revision: V318`; jika bukan V318, route masih memakai bundle/commit lama.
3. Atur ulang/cek environment variable `GEMINI_API_KEY` di environment Production tanpa memasukkan nilainya ke log atau source control.
4. Setelah deployment selesai, uji ketiga endpoint: `/api/ai-analyze`, `/api/ai-telemetry`, dan `/api/ai-tips` dengan POST JSON `{ "promptContext": "uji analisis adonan pada suhu 28 C dan kelembapan 75 persen" }`.
5. Periksa log. Penanda `[V318]` harus muncul saat ada fallback/error, dan nama endpoint harus sesuai endpoint yang dipanggil. Jika log masih menampilkan jalur model lama seperti `gemini-3.7-flash` atau label endpoint yang keliru, deployment masih memakai source lama/berbeda.
6. Bila ketiga model memang sedang mengalami gangguan di sisi provider, API dapat tetap mengembalikan 503; hotfix membatasi waktu tunggu dan memberi error yang benar, tetapi tidak dapat memaksa layanan Google pulih.

## Batas verifikasi

Tes di atas adalah tes statis/unit lokal dengan provider dimock. Tidak dilakukan deployment ke akun Vercel pengguna dan tidak dilakukan panggilan langsung ke Gemini menggunakan secret produksi, sehingga pemulihan layanan produksi baru dapat dipastikan setelah paket ini dideploy dan diuji pada deployment aktif.
