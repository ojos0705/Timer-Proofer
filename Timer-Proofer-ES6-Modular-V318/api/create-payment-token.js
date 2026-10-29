// public/api/create-payment-token.js — Vercel Serverless Function
// Dipindahkan dari public/assets/js/create-payment-token.js (sebelumnya hanya contoh/draft di lokasi yang
// salah, TIDAK pernah ter-deploy sebagai endpoint nyata -> setiap klik "BAYAR SEKARANG" selalu gagal
// dengan 404 karena /api/create-payment-token memang belum pernah ada). Mengikuti pola CORS + validasi
// yang sama seperti public/api/weather.js.
//
// Wajib sebelum dipakai:
//   1. npm i midtrans-client        (sudah ditambahkan ke public/package.json)
//   2. Daftar akun Midtrans (sandbox dulu tidak apa), ambil Client Key & Server Key
//   3. Set di Environment Variables Vercel:
//        MIDTRANS_SERVER_KEY   (rahasia, JANGAN PERNAH dikirim ke browser)
//        MIDTRANS_CLIENT_KEY   (publik — nilai yang sama juga dipasang di index.html,
//                               ganti data-client-key="YOUR_CLIENT_KEY" pada tag <script snap.js>)
//   4. Saat rilis produksi: set ENV MIDTRANS_IS_PRODUCTION=true DAN ganti src snap.js di index.html
//      dari app.sandbox.midtrans.com ke app.midtrans.com
//
// Sebelum langkah 1-3 di atas dijalankan, endpoint ini akan konsisten menjawab 500 dengan pesan yang
// jelas (bukan diam-diam gagal atau crash) -- lihat validasi ENV di bawah.
// import, bukan require(): public/package.json mendeklarasikan "type": "module", jadi require() akan
// gagal saat dijalankan di Vercel dengan "ReferenceError: require is not defined in ES module scope"
// (persis seperti masalah lama tools/extract-i18n.js). midtrans-client adalah paket CommonJS, tapi
// Node.js tetap bisa mengimpornya lewat interop default export ini.
import crypto from 'node:crypto';
import midtransClient from 'midtrans-client';
import { normalizePaymentCustomerDetails } from './payment-utils.js';

const HARGA_PREMIUM_SERVER = 50_000; // [AI-GENERATED][SECURITY][V152] Harga resmi; tidak boleh ditentukan oleh klien.
const PAYMENT_RATE_LIMIT_WINDOW_MS = 60_000;
const PAYMENT_RATE_LIMIT_MAX_REQUESTS = 10;
const PAYMENT_RATE_LIMIT_MAX_CLIENTS = 1_024;
const paymentRateLimitBuckets = new Map();

function getClientKey(req) {
  const forwarded = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0];
  return raw.trim() || 'unknown-client';
}

function enforcePaymentRateLimit(req, res) {
  const now = Date.now();
  for (const [key, bucket] of paymentRateLimitBuckets) {
    if (!bucket || now - bucket.windowStart >= PAYMENT_RATE_LIMIT_WINDOW_MS) paymentRateLimitBuckets.delete(key);
  }
  while (paymentRateLimitBuckets.size > PAYMENT_RATE_LIMIT_MAX_CLIENTS) {
    const oldest = paymentRateLimitBuckets.keys().next().value;
    if (oldest === undefined) break;
    paymentRateLimitBuckets.delete(oldest);
  }

  const key = getClientKey(req);
  let bucket = paymentRateLimitBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= PAYMENT_RATE_LIMIT_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    paymentRateLimitBuckets.set(key, bucket);
  }
  if (bucket.count >= PAYMENT_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((bucket.windowStart + PAYMENT_RATE_LIMIT_WINDOW_MS - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Terlalu banyak percobaan pembayaran. Coba lagi nanti.', code: 'PAYMENT_RATE_LIMITED', retryAfter });
  }
  bucket.count += 1;
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
    const CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY;
    const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    if (!SERVER_KEY || !CLIENT_KEY) {
      // Pesan ini sengaja spesifik: begitu Anda mendaftar Midtrans & mengisi kedua ENV var ini,
      // error 500 ini otomatis hilang tanpa perlu mengubah kode apa pun lagi.
      return res.status(500).json({ error: 'Payment gateway belum dikonfigurasi: MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY belum diisi di Environment Variables Vercel' });
    }

    const rateLimitResponse = enforcePaymentRateLimit(req, res);
    if (rateLimitResponse) return rateLimitResponse;

    const body = req.body || {};
    // [AI-GENERATED][SECURITY][V158] Transaction identity is server-authoritative.
    // The browser may send a legacy order_id for compatibility, but it is never
    // trusted. Server-side randomness prevents Date.now() collisions and client
    // supplied identifiers from being used as Midtrans transaction identities.
    const order_id = `ORDER-${crypto.randomUUID()}`;
    const amount = Number(body.gross_amount);
    const cd = (body.customer_details && typeof body.customer_details === 'object') ? body.customer_details : {};

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'gross_amount wajib berupa angka > 0' });
    }
    // [AI-GENERATED][SECURITY][V152] Nilai pembayaran harus server-authoritative.
    // Klien hanya boleh mengirim nominal yang sama dengan harga produk aktif.
    // Jangan pernah meneruskan nominal arbitrer dari browser ke Midtrans.
    if (amount !== HARGA_PREMIUM_SERVER) {
      return res.status(400).json({ error: 'gross_amount tidak sesuai harga premium yang berlaku' });
    }

    const customerDetails = normalizePaymentCustomerDetails(cd);

    const snap = new midtransClient.Snap({
      isProduction: IS_PRODUCTION,
      serverKey: SERVER_KEY,
      clientKey: CLIENT_KEY
    });

    const transaction = await snap.createTransaction({
      transaction_details: { order_id, gross_amount: HARGA_PREMIUM_SERVER },
      customer_details: customerDetails
    });

    if (!transaction || !transaction.token) {
      throw new Error('Respons Midtrans tidak berisi token');
    }
    return res.status(200).json({ token: transaction.token, redirect_url: transaction.redirect_url, order_id });
  } catch (error) {
    // Selalu balas JSON (bukan HTML error page Vercel) supaya response.json() di index.html tidak ikut gagal parse.
    console.error('create-payment-token gagal:', error && error.message, error && error.ApiResponse);
    return res.status(502).json({ error: 'Gagal membuat token pembayaran dari Midtrans' });
  }
}
