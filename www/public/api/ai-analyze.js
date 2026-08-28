const GEMINI_MODEL = "gemini-3.6-flash";

const SYSTEM_INSTRUCTION =
  "Anda adalah AI Agent ahli fermentasi adonan dan manajemen HPP (Harga Pokok Produksi) bakery. " +
  "Jawab singkat, praktis, dan langsung bisa dipakai oleh pemilik home bakery. " +
  "Gunakan Bahasa Indonesia. Maksimal 4-5 kalimat, tanpa basa-basi pembuka.";

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
        maxOutputTokens: 400,
        temperature: 0.6,
      },
    });

    const result = response?.text;
    if (typeof result !== "string" || result.trim() === "") {
      return res.status(502).json({ error: "AI tidak mengembalikan hasil, coba lagi" });
    }

    return res.status(200).json({ result: result.trim() });
  } catch (error) {
    console.error("ai-analyze error:", error);
    return res.status(500).json({ error: toUserFacingError(error) });
  }
};