import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  "Tanpa basa-basi pembuka seperti 'Tentu' atau 'Baik'.";
  "JANGAN gunakan tanda bintang atau format markdown apa pun di dalam teks hasil keluaran."

function toUserFacingError(error) {
  const raw = error?.message || String(error || "Gagal memproses analisis AI");
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.error?.message === "string") return parsed.error.message;
  } catch (_) {
    // bukan JSON, pakai pesan asli
  }
  return raw;
}

function isQuotaError(error) {
  const text = toUserFacingError(error).toLowerCase();
  const code = error?.status || error?.code || error?.error?.code;
  return (
    code === 429 ||
    code === "RESOURCE_EXHAUSTED" ||
    text.includes("quota") ||
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    text.includes("resource_exhausted")
  );
}

function parseRetrySeconds(error) {
  const text = toUserFacingError(error);
  const match = text.match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1])) : null;
}

async function generateWithModel(ai, model, promptContext) {
  const useThinking = model.startsWith("gemini-3.6");
  const config = {
    systemInstruction: SYSTEM_INSTRUCTION,
    maxOutputTokens: 4096,
    temperature: 0.7,
  };
  if (useThinking) {
    config.thinkingConfig = { thinkingLevel: "minimal" };
  }

  return ai.models.generateContent({
    model,
    contents: promptContext.trim(),
    config,
  });
}

function extractAnswerText(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  const fromParts = parts
    .filter((part) => !part?.thought && typeof part?.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
  if (fromParts) return fromParts;
  return typeof response?.text === "string" ? response.text.trim() : "";
}

function getFinishReason(response) {
  return response?.candidates?.[0]?.finishReason || response?.finishReason || "";
}

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
  // Selalu set header CORS di awal agar aman diakses dari localhost maupun production
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, X-Requested-With"
  );

  // Tangani preflight OPTIONS dengan status 200 OK
  if (req.method === "OPTIONS") {
    return res.status(200).send("OK");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { promptContext } = req.body || {};
  if (typeof promptContext !== "string" || promptContext.trim() === "") {
    return res.status(400).json({ error: "promptContext wajib diisi (string)" });
  }

  if (promptContext.length > 8000) {
    return res.status(400).json({ error: "promptContext terlalu panjang" });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY belum diset di environment Vercel");
    return res.status(500).json({ error: "Layanan AI belum dikonfigurasi di server" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let responseText = null;
    let usedModel = GEMINI_MODELS[0];
    let lastError = null;

    // Sistem otomatis mencoba model dari urutan teratas (3.8 -> 3.7 -> 3.5), 
    // jika terkena high demand/error, otomatis lanjut ke model di bawahnya
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
        break; // Berhasil, keluar dari loop
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} gagal/sibuk, mencoba model cadangan berikutnya...`, err.message);
        continue; // Lanjut ke model berikutnya
      }
    }

    if (!responseText) {
      return res.status(500).json({ 
        error: 'Semua model cadangan sedang sibuk atau mengalami lonjakan permintaan. Silakan coba beberapa saat lagi.',
        details: lastError?.message 
      });
    }

    return res.status(200).json({ result: responseText, model: usedModel });

  } catch (error) {
    console.error("ai-tips error:", error);
    return res.status(500).json({ error: error.message || "Terjadi kesalahan pada server AI." });
  }
}