// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
require('dotenv').config();

app.use(cors()); // Pastikan file html ada di folder tadinya : 'public'

app.use(express.static('www')); // Serve file statis (index.html, assets, dll) dari folder www/

// server.js (Potongan Penting)
app.get('/api/weather', async (req, res) => {
    const { lat, lon } = req.query; // Mengambil lat dan lon dari URL
    const API_KEY = process.env.OPENWEATHER_API_KEY;

    // Debugging: Cek apakah API_KEY terbaca
    console.log("API Key yang digunakan:", API_KEY); 

    if (!API_KEY || API_KEY === "YOUR_API_KEY") {
        return res.status(500).json({ error: "API Key tidak dikonfigurasi dengan benar" });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("Error Detail dari OpenWeather:", errorMessage);
        res.status(500).json({ error: "Gagal memanggil OpenWeather: " + errorMessage });
    }
});

// TAMBAHKAN ENDPOINT BARU INI UNTUK LOKASI DETAIL INDONESIA
app.get('/api/geocode', async (req, res) => {
    const { lat, lon } = req.query;
    // Nominatim OpenStreetMap memerlukan User-Agent agar tidak diblokir
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;

    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'DonutProofingAgent/1.0' }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Error Geocoding OpenStreetMap:", error.message);
        res.status(500).json({ error: "Gagal mengambil nama lokasi detail" });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));