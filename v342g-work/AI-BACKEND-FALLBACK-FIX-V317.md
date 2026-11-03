# AI Backend Fallback Fix — V317

## Tujuan
- Membatasi setiap panggilan Gemini agar tiga kandidat fallback tidak melampaui timeout frontend 30 detik.
- Mencatat error provider secara terstruktur di log server tanpa meneruskan detail mentah ke browser.
- Memastikan source API kanonis (`api/`) disalin ke `www/public/api/`, sesuai path yang tampak pada log deployment Vercel.
- Mengoreksi label log per endpoint, termasuk `ai-telemetry`, sehingga tidak salah dilaporkan sebagai `ai-analyze`.

## Batasan
Fallback hanya membantu jika model alternatif yang dikonfigurasi tersedia dan diizinkan untuk API key/proyek tersebut. HTTP 503 dari semua model tetap akan menghasilkan respons gangguan sementara; perbaikan kode tidak dapat menghilangkan kapasitas upstream Google yang sedang penuh.

## Pengujian
Jalankan `npm test` pada lingkungan dengan dependency terpasang. Setelah deployment, verifikasi log Function menunjukkan model pertama gagal lalu kandidat alternatif dicoba, atau respons akhir `503 AI_TEMPORARILY_UNAVAILABLE`. Uji provider nyata masih diperlukan.
