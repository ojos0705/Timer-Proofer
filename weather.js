// api/weather.js

export default async function handler(req, res) {
    // Mengambil parameter query langsung dari objek request bawaan Vercel
    const { lat, lon } = req.query;
    
    // Mengambil API Key dari Environment Variable Vercel
    const API_KEY = process.env.OPENWEATHER_API_KEY; 

    // Header untuk menghindari masalah CORS pada PWA Anda
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    if (!lat || !lon) {
        return res.status(400).json({ error: "Koordinat lat dan lon diperlukan" });
    }

    if (!API_KEY) {
        return res.status(500).json({ error: "API Key OpenWeather belum dikonfigurasi di Vercel" });
    }

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;

    try {
        // Ambil data dari OpenWeather dan OpenStreetMap secara paralel
        const [weatherRes, geocodeRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(geocodeUrl, {
                headers: { 'User-Agent': 'DonutProofingAgent/1.0' }
            })
        ]);

        if (!weatherRes.ok || !geocodeRes.ok) {
            return res.status(502).json({ error: "Gagal mengambil data dari penyedia API pihak ketiga" });
        }

        const weatherData = await weatherRes.json();
        const geoData = await geocodeRes.json();

        // Gabungkan dan kirim kembali ke PWA index.html
        return res.status(200).json({
            weather: weatherData,
            geocode: geoData
        });

    } catch (error) {
        console.error("Error di Serverless Proxy:", error);
        return res.status(500).json({ error: error.message });
    }
}