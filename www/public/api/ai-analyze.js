import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Tangani preflight OPTIONS request secara eksplisit agar lolos dari blokir CORS browser
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { promptContext } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptContext,
      config: {
        systemInstruction: "Anda adalah AI Agent ahli fermentasi adonan dan manajemen HPP bakery.",
      }
    });

    return res.status(200).json({ result: response.text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}