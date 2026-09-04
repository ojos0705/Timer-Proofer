import { GoogleGenAI } from '@google/genai';

const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash-lite",
];

const SYSTEM_INSTRUCTION = 
  "Anda adalah AI Agent ahli sains pangan, ragi, fermentasi, dan troubleshooting pembuatan roti, donat, dan bakpau. " +
  "Berikan penjelasan teknis yang akurat, solutif, dan mudah dipahami oleh home baker dalam Bahasa Indonesia. " +
  "Gunakan emoji seminimal mungkin (hanya sesekali jika sangat diperlukan). " +
  "Setiap judul bagian (section title) WAJIB ditulis dalam HURUF KAPITAL dan TEBAL (BOLD), tanpa menggunakan simbol markdown heading seperti # atau ###. " +
  "Wajib mencakup: (1) analisis penyebab masalah, (2) parameter teknis ideal, (3) langkah solusi teknis konkret. " +
  "Tanpa basa-basi pembuka seperti 'Tentu' atau 'Baik'. JANGAN gunakan tanda bintang ganda (**) di luar judul bagian.";

export default async function handler(req, res) {
  // Selalu set header CORS untuk mengizinkan akses dari localhost maupun production
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, X-Requested-With"
  );

  // Tangani preflight OPTIONS dengan mengembalikan status 200 OK secara instan
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { promptContext } = req.body || {};
    if (typeof promptContext !== "string" || promptContext.trim() === "") {
      return res.status(400).json({ error: "promptContext wajib diisi (string)" });
    }

    if (promptContext.length > 8000) {
      return res.status(400).json({ error: "promptContext terlalu panjang" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY belum diset di environment Vercel" });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let responseText = null;
    let usedModel = GEMINI_MODELS[0];
    let lastError = null;

    // Perulangan fallback otomatis antar model Gemini
    for (const modelName of GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptContext,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          }
        });

        responseText = response.text;
        usedModel = modelName;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} sibuk/gagal, mencoba cadangan berikutnya...`, err.message);
        continue;
      }
    }

    if (!responseText) {
      return res.status(500).json({ 
        error: 'Semua model cadangan sedang sibuk. Silakan coba beberapa saat lagi.',
        details: lastError?.message 
      });
    }

    return res.status(200).json({ result: responseText, model: usedModel });

  } catch (error) {
    console.error("ai-tips server error:", error);
    return res.status(500).json({ error: error.message || "Terjadi kesalahan internal pada server AI." });
  }
}