export default async function handler(req, res) {
  // 1. Atur Header CORS paling atas agar PWA lokal/produksi bisa mengakses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // 2. Tangani Preflight Request (OPTIONS) dari browser
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Ambil parameter query & API Key
  const { lat, lon } = req.query;
  const API_KEY = process.env.OPENWEATHER_API_KEY; 

  if (!lat || !lon) {
    return res.status(400).json({ error: "Koordinat lat dan lon diperlukan" });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: "API Key OpenWeather belum dikonfigurasi di Environment Variables Vercel" });
  }

  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;

  try {
    // 4. Ambil data cuaca dan geocoding lokasi secara paralel
    const [weatherRes, geocodeRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(geocodeUrl, {
        headers: { 'User-Agent': 'DonutProofingAgent/1.0' }
      })
    ]);

    if (!weatherRes.ok) {
      throw new Error(`OpenWeather API error: ${weatherRes.status}`);
    }
    if (!geocodeRes.ok) {
      throw new Error(`Nominatim Geocode error: ${geocodeRes.status}`);
    }

    const weatherData = await weatherRes.json();
    const geoData = await geocodeRes.json();

    // 5. Kembalikan gabungan data riil ke aplikasi utama
    return res.status(200).json({
      weather: weatherData,
      geocode: geoData
    });

  } catch (error) {
    console.error("Error di Serverless Proxy:", error);
    return res.status(500).json({ error: error.message });
  }
}