import { GoogleGenAI } from "@google/genai";

// Deploy file ini sebagai /api/ai-analyze.js di project Vercel (pola sama
// seperti /api/weather.js). Perlu env var GEMINI_API_KEY di Vercel
// (Project Settings -> Environment Variables), dan dependency
// "@google/genai" di package.json.

const SYSTEM_INSTRUCTION =
  "Anda adalah AI Agent ahli fermentasi adonan dan manajemen HPP (Harga Pokok Produksi) bakery. " +
  "Jawab singkat, praktis, dan langsung bisa dipakai oleh pemilik home bakery. " +
  "Gunakan Bahasa Indonesia. Maksimal 4-5 kalimat, tanpa basa-basi pembuka.";

// Batas waktu tunggu ke Gemini, supaya request dari app native tidak
// menggantung tanpa batas kalau koneksi lambat/putus di tengah jalan.
const REQUEST_TIMEOUT_MS = 20000;

function setCorsHeaders(res) {
  // Native app (Capacitor) request dari origin "https://localhost" / "capacitor://localhost",
  // jadi perlu CORS terbuka untuk endpoint ini. Kalau mau dibatasi, ganti '*'
  // dengan daftar origin spesifik.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  // Preflight request dari browser/WebView untuk POST lintas origin
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validasi input: promptContext wajib ada dan berupa string yang tidak kosong
  const { promptContext } = req.body || {};
  if (typeof promptContext !== "string" || promptContext.trim() === "") {
    return res.status(400).json({ error: "promptContext wajib diisi (string)" });
  }
  if (promptContext.length > 8000) {
    return res.status(400).json({ error: "promptContext terlalu panjang" });
  }

  // Cek konfigurasi server sebelum memanggil Gemini, supaya errornya jelas
  // ("server belum dikonfigurasi") alih-alih crash generik
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY belum diset di environment Vercel");
    return res.status(500).json({ error: "Layanan AI belum dikonfigurasi di server" });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptContext,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 400,
        temperature: 0.6,
      },
      // Diteruskan agar timeout di atas benar-benar membatalkan request ke Gemini
      httpOptions: { signal: controller.signal },
    });

    clearTimeout(timeoutId);

    const text = response?.text;
    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(502).json({ error: "AI tidak mengembalikan hasil, coba lagi" });
    }

    return res.status(200).json({ result: text.trim() });
  } catch (error) {
    clearTimeout(timeoutId);

    // Log detail lengkap di server untuk debugging, tapi jangan bocorkan
    // detail internal (stack trace, dsb) ke client
    console.error("ai-analyze error:", error);

    if (error?.name === "AbortError") {
      return res.status(504).json({ error: "AI terlalu lama merespons, coba lagi" });
    }

    return res.status(500).json({ error: "Gagal memproses analisis AI, coba lagi nanti" });
  }
}