const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];

const SYSTEM_INSTRUCTION =
  "Anda adalah AI Agent ahli sains fermentasi adonan, ragi, dan telemetri suhu/kelembapan ruang bakery. " +
  "Berikan analisis dan wawasan telemetri yang akurat, terstruktur, serta langsung bisa dipakai oleh pembuat roti. " +
  "Gunakan Bahasa Indonesia. Format jawaban pakai emoji + baris baru saja. " +
  "JANGAN gunakan markdown (tanpa #, *, **, _, atau ###). " +
  "Wajib mencakup: (1) penilaian status suhu & kelembapan ruang saat ini, (2) analisis kondisi aktivitas ragi, " +
  "(3) potensi risiko fermentasi (overproof/underproof), (4) 2-3 rekomendasi tindakan teknis konkret yang harus diambil, " +
  "(5) estimasi penyesuaian waktu proofing jika diperlukan. " +
  "Tanpa basa-basi pembuka seperti 'Tentu' atau 'Baik'.";

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

export default async function handler(req, res) {
  // Selalu set header CORS di awal
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, X-Requested-With"
  );

  // Tangani preflight OPTIONS dengan status 200 OK yang ramah bagi browser
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
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let response = null;
    let usedModel = GEMINI_MODELS[0];
    let lastQuotaError = null;

    for (const model of GEMINI_MODELS) {
      try {
        response = await generateWithModel(ai, model, promptContext);
        usedModel = model;
        break;
      } catch (error) {
        if (isQuotaError(error)) {
          lastQuotaError = error;
          console.warn(`ai-analyze quota hit for ${model}, trying fallback...`);
          continue;
        }
        throw error;
      }
    }

    if (!response) {
      const retrySec = parseRetrySeconds(lastQuotaError);
      const retryHint = retrySec ? ` Coba lagi dalam ${retrySec} detik.` : "";
      return res.status(429).json({
        error: `Kuota AI gratis habis untuk semua model.${retryHint} Gunakan analisis instan atau coba lagi nanti.`,
        code: "QUOTA_EXCEEDED",
        retryAfter: retrySec,
      });
    }

    const result = extractAnswerText(response);
    const finishReason = getFinishReason(response);

    if (!result) {
      return res.status(502).json({ error: "AI tidak mengembalikan hasil, coba lagi" });
    }

    const truncated = finishReason === "MAX_TOKENS";
    const finalResult = truncated
      ? `${result}\n\n_(Analisis terpotong karena batas token. Coba lagi atau sederhanakan resep.)_`
      : result;

    return res.status(200).json({ result: finalResult, truncated, model: usedModel });
  } catch (error) {
    console.error("ai-analyze error:", error);
    if (isQuotaError(error)) {
      const retrySec = parseRetrySeconds(error);
      const retryHint = retrySec ? ` Coba lagi dalam ${retrySec} detik.` : "";
      return res.status(429).json({
        error: `Kuota AI gratis habis.${retryHint} Gunakan analisis instan atau coba lagi nanti.`,
        code: "QUOTA_EXCEEDED",
        retryAfter: retrySec,
      });
    }
    return res.status(500).json({ error: toUserFacingError(error) });
  }
};