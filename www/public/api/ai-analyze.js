const GEMINI_MODEL = "gemini-3.6-flash";

const SYSTEM_INSTRUCTION =
  "Anda adalah AI Agent ahli fermentasi adonan dan manajemen HPP (Harga Pokok Produksi) bakery. " +
  "Berikan analisis bisnis yang mendalam, terstruktur, dan langsung bisa dipakai oleh pemilik home bakery. " +
  "Gunakan Bahasa Indonesia. Format jawaban pakai emoji + baris baru saja. " +
  "JANGAN gunakan markdown (tanpa #, *, **, _, atau ###). " +
  "Wajib mencakup: (1) penilaian kesehatan bisnis, (2) analisis food cost & margin, " +
  "(3) masalah utama, (4) 3-5 rekomendasi konkret berupa angka atau langkah, " +
  "(5) target harga jual/food cost ideal jika perlu disesuaikan. " +
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

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: promptContext.trim(),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // Budget dipakai bersama thinking + jawaban; minimal thinking agar ruang cukup untuk output
        maxOutputTokens: 4096,
        temperature: 0.7,
        thinkingConfig: {
          thinkingLevel: "minimal",
        },
      },
    });

    const result = extractAnswerText(response);
    const finishReason = getFinishReason(response);

    if (!result) {
      return res.status(502).json({ error: "AI tidak mengembalikan hasil, coba lagi" });
    }

    const truncated = finishReason === "MAX_TOKENS";
    const finalResult = truncated
      ? `${result}\n\n_(Analisis terpotong karena batas token. Coba lagi atau sederhanakan resep.)_`
      : result;

    return res.status(200).json({ result: finalResult, truncated });
  } catch (error) {
    console.error("ai-analyze error:", error);
    return res.status(500).json({ error: toUserFacingError(error) });
  }
};