# Timer Proofer — AI Retry Recovery V321

## Latar belakang

Pada deployment V320, `/api/ai-analyze` dan `/api/ai-tips` mengembalikan HTTP 503 dengan pesan umum layanan AI sedang sibuk/gangguan sementara. Kode bersama V320 menggunakan `retryOptions: { attempts: 1 }`, yang berarti SDK hanya melakukan satu panggilan per model tanpa retry HTTP internal. Saat Gemini mengembalikan 503 sementara, backend langsung pindah ke model berikutnya.

Dokumentasi resmi Gemini merekomendasikan exponential backoff untuk error sementara seperti `503 UNAVAILABLE` dan `429 RESOURCE_EXHAUSTED`. Status 503 berarti layanan sementara overload/tidak tersedia; ini bukan bukti bahwa API key atau prompt salah.

## Perubahan V321

- `ai-analyze` dan `ai-tips` menggunakan retry SDK **satu kali tambahan** (`attempts: 2`, termasuk panggilan pertama) untuk status HTTP `408`, `500`, `502`, `503`, dan `504`.
- Jeda retry pendek menggunakan exponential backoff dengan jitter: `initialDelay: 0.6s`, `maxDelay: 1.2s`, `expBase: 2`, `jitter: 0.25`.
- Timeout per panggilan Gemini tetap 11 detik agar sesuai batas minimum SDK yang telah ditemukan pada log V318.
- Batas total proses provider/fallback tetap 26 detik, di bawah timeout frontend 30 detik.
- `/api/ai-telemetry` **tidak berubah kebijakan retry-nya**: tetap `attempts: 1`. Perilaku UI telemetry (hasil tetap tersimpan ketika card disembunyikan/dibuka, kecuali `muatUlangAnalisisAI`) tidak diubah.
- Backend canonical `api/ai-utils.js` disalin melalui `scripts/sync-web-assets.mjs` ke `www/public/api/ai-utils.js`.
- Header dan log backend dinaikkan ke `V321`; versi aplikasi yang terlihat pengguna tetap `V125`.
- Cache PWA dan token modul diperbarui supaya browser tidak memakai asset V320 yang lama.

## Verifikasi

- `npm test`: **419 lulus, 0 gagal**.
- Release static audit: 0 import hilang, 0 ID HTML duplikat, 0 inline handler, 0 fungsi duplikat dalam satu modul.
- `api/ai-utils.js` dan `www/public/api/ai-utils.js` harus identik.
- Tes lokal menguji kebijakan konfigurasi retry dan regresi kode, bukan panggilan live ke project Gemini milik pengguna.

## Deployment

1. Ekstrak ZIP ke root repository lokal tanpa menghapus `.git` atau `.env`.
2. Jalankan `npm test` dan `git diff --check`.
3. Tinjau `git status` untuk memastikan tidak ada secret/API key.
4. Commit dan push branch Preview; verifikasi header `X-AI-Backend-Revision: V321`.
5. Uji `ai-analyze`, `ai-tips`, lalu pastikan telemetry tetap menyimpan hasil lama sampai tombol refresh dipakai.

Jika Gemini mengembalikan 503 secara terus-menerus untuk seluruh percobaan, backend tetap akan memberikan 503 dengan aman. Retry membantu gangguan singkat, tetapi tidak dapat menjamin ketersediaan layanan provider yang sedang down.
