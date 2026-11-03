const WEATHER_UPSTREAM_TIMEOUT_MS = 10_000;
// Reverse geocoding is optional enrichment, so it must time out before the
// primary weather request and never share its abort signal.
const GEOCODE_UPSTREAM_TIMEOUT_MS = 3_500;
const WEATHER_RATE_LIMIT_WINDOW_MS = 60_000;
const WEATHER_RATE_LIMIT_MAX_REQUESTS = 30;
const WEATHER_RATE_LIMIT_MAX_CLIENTS = 1_024;
const weatherRateLimitBuckets = new Map();

// [AI-GENERATED][SECURITY][V159] Best-effort per-instance protection for the
// provider-backed weather proxy. This is intentionally bounded and does not
// claim to replace a distributed rate limiter.
function getClientKey(req) {
  const forwarded = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0];
  return raw.trim() || 'unknown-client';
}

function enforceWeatherRateLimit(req, res) {
  const now = Date.now();
  for (const [key, bucket] of weatherRateLimitBuckets) {
    if (!bucket || now - bucket.windowStart >= WEATHER_RATE_LIMIT_WINDOW_MS) {
      weatherRateLimitBuckets.delete(key);
    }
  }
  while (weatherRateLimitBuckets.size > WEATHER_RATE_LIMIT_MAX_CLIENTS) {
    const oldestKey = weatherRateLimitBuckets.keys().next().value;
    if (oldestKey === undefined) break;
    weatherRateLimitBuckets.delete(oldestKey);
  }

  const key = getClientKey(req);
  let bucket = weatherRateLimitBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= WEATHER_RATE_LIMIT_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    weatherRateLimitBuckets.set(key, bucket);
  }

  if (bucket.count >= WEATHER_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((bucket.windowStart + WEATHER_RATE_LIMIT_WINDOW_MS - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Terlalu banyak permintaan cuaca. Coba lagi nanti.',
      code: 'WEATHER_RATE_LIMITED',
      retryAfter
    });
  }

  bucket.count += 1;
  return null;
}

export default async function handler(req, res) {
  // 1. Atur Header CORS paling atas agar PWA lokal/produksi bisa mengakses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Allow', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  // 2. Tangani preflight sebelum validasi metode aktual.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // [AI-GENERATED][SECURITY][V203] CORS headers alone do not enforce allowed HTTP methods.
  // Reject unsupported methods before reading configuration or spending upstream quota.
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  // 3. Ambil parameter query & API Key
  const { lat, lon } = req.query;
  const API_KEY = process.env.OPENWEATHER_API_KEY; 

  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "Koordinat lat/lon tidak valid" });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: "API Key OpenWeather belum dikonfigurasi di Environment Variables Vercel" });
  }

  // [AI-GENERATED][SECURITY][V159] Do not spend upstream quota on abusive
  // repeated proxy calls after cheap method/input/configuration validation.
  const rateLimitResponse = enforceWeatherRateLimit(req, res);
  if (rateLimitResponse) return rateLimitResponse;

  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;
  const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;

  try {
    // 4. Ambil data cuaca dan geocoding lokasi secara paralel
    // [AI-GENERATED][ROBUSTNESS][V214] Bound providers independently. Reverse
    // geocoding is optional and must not abort the primary weather request when
    // its shorter timeout expires.
    const weatherSignal = AbortSignal.timeout(WEATHER_UPSTREAM_TIMEOUT_MS);
    const geocodeSignal = AbortSignal.timeout(GEOCODE_UPSTREAM_TIMEOUT_MS);
    // [AI-GENERATED][ROBUSTNESS][V213] Weather is the primary response; reverse
    // geocoding only enriches the UI with a readable place name. A Nominatim
    // 429, outage, timeout, or invalid JSON must not discard valid weather data.
    const [weatherRes, geoData] = await Promise.all([
      fetch(weatherUrl, { signal: weatherSignal }),
      (async () => {
        try {
          const geocodeRes = await fetch(geocodeUrl, {
            headers: { 'User-Agent': 'DonutProofingAgent/1.0' },
            signal: geocodeSignal
          });
          if (!geocodeRes.ok) {
            console.warn(`[Weather API] Reverse geocoding unavailable (${geocodeRes.status}).`);
            return null;
          }
          try {
            return await geocodeRes.json();
          } catch {
            console.warn('[Weather API] Reverse geocoding returned invalid JSON.');
            return null;
          }
        } catch {
          console.warn('[Weather API] Reverse geocoding temporarily unavailable.');
          return null;
        }
      })()
    ]);

    if (!weatherRes.ok) {
      throw new Error(`OpenWeather API error: ${weatherRes.status}`);
    }

    const weatherData = await weatherRes.json();

    // 5. Kembalikan gabungan data riil ke aplikasi utama
    return res.status(200).json({
      weather: weatherData,
      geocode: geoData
    });

  } catch (error) {
    console.error("Error di Serverless Proxy:", error);
    // [AI-GENERATED][SECURITY][V154] Jangan bocorkan detail upstream/provider ke client.
    return res.status(502).json({ error: "Layanan cuaca sementara tidak tersedia" });
  }
}