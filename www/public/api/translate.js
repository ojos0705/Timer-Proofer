/**
 * [AI-GENERATED][I18N][V334]
 * Authenticated server-side proxy for the free MyMemory translation API.
 * No Google Cloud Billing, API key, or provider credential is required.
 * Each UI text segment is sent separately (MyMemory's documented API shape).
 * User-authored recipe/profile content is excluded by OnlineI18n before it
 * reaches this route. Text and contact email are never written to server logs.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 24;
const MAX_RATE_LIMIT_CLIENTS = 2_048;
const MAX_ITEMS = 24;
const MAX_TOTAL_CHARACTERS = 5_400;
const MAX_SINGLE_TEXT_CHARACTERS = 5_000;
const MAX_PROVIDER_SEGMENT_BYTES = 480; // MyMemory documents a 500-byte q limit.
const MAX_PROVIDER_SEGMENTS = 48;
const UPSTREAM_TIMEOUT_MS = 8_000;
const PROVIDER_CONCURRENCY = 6;
const TRANSLATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TRANSLATION_CACHE_ENTRIES = 4_000;
const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';
const rateLimitBuckets = new Map();
const translationCache = new Map();
const SUPABASE_URL = 'https://rshnirlkjicnklrybjpf.supabase.co';
// Supabase anon key is a public client identifier, not a service-role secret.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzaG5pcmxramljbmtscnlianBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjM0NjAsImV4cCI6MjA5OTY5OTQ2MH0.v5FXEfIQ1hLDLQmWgS9tv0f6OD2VqMdgius_cRjV9FI';

function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
}

function getClientKey(req) {
  const forwarded = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0];
  return raw.trim() || 'unknown-client';
}

async function requireSupabaseUser(req) {
  const authorization = String(req?.headers?.authorization || req?.headers?.Authorization || '');
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return { error: 'Login diperlukan untuk menggunakan terjemahan online.', code: 'TRANSLATION_AUTH_REQUIRED', status: 401 };
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000)
    });
    if (!response.ok) return { error: 'Sesi login tidak valid atau telah berakhir. Silakan login kembali.', code: 'TRANSLATION_AUTH_INVALID', status: 401 };
    const user = await response.json();
    if (!user?.id) return { error: 'Sesi login tidak dapat diverifikasi.', code: 'TRANSLATION_AUTH_INVALID', status: 401 };
    return { user };
  } catch (_) {
    return { error: 'Validasi sesi login sementara tidak tersedia.', code: 'TRANSLATION_AUTH_UNAVAILABLE', status: 503 };
  }
}

function enforceRateLimit(req, res, userId = '') {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets) {
    if (!bucket || now - bucket.windowStart >= WINDOW_MS) rateLimitBuckets.delete(key);
  }
  while (rateLimitBuckets.size > MAX_RATE_LIMIT_CLIENTS) {
    const oldest = rateLimitBuckets.keys().next().value;
    if (oldest === undefined) break;
    rateLimitBuckets.delete(oldest);
  }

  const key = userId ? `user:${userId}` : getClientKey(req);
  let bucket = rateLimitBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    rateLimitBuckets.set(key, bucket);
  }
  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.max(1, Math.ceil((bucket.windowStart + WINDOW_MS - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return { retryAfter };
  }
  bucket.count += 1;
  return null;
}

function parseBody(body) {
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  if (typeof body === 'string') {
    try {
      const value = JSON.parse(body);
      return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch (_) { return null; }
  }
  return null;
}

function utf8Bytes(value) {
  return new TextEncoder().encode(String(value ?? '')).length;
}

/** Split only oversized text nodes, preserving every whitespace separator. */
function splitProviderSegments(value, maxBytes = MAX_PROVIDER_SEGMENT_BYTES) {
  const source = String(value ?? '');
  if (!source) return [];
  if (utf8Bytes(source) <= maxBytes) return [source];

  const tokens = source.match(/\s+|[^\s]+/gu) || [source];
  const chunks = [];
  let current = '';

  for (const token of tokens) {
    if (utf8Bytes(token) > maxBytes) {
      if (current) chunks.push(current);
      current = '';
      let fragment = '';
      for (const point of token) {
        if (fragment && utf8Bytes(fragment + point) > maxBytes) {
          chunks.push(fragment);
          fragment = '';
        }
        fragment += point;
      }
      current = fragment;
      continue;
    }

    if (current && utf8Bytes(current + token) > maxBytes) {
      chunks.push(current);
      current = '';
    }
    current += token;
  }
  if (current) chunks.push(current);
  return chunks;
}

function validateRequest(body) {
  const texts = body?.texts;
  const targetLanguage = String(body?.targetLanguage || '').trim().replace(/_/g, '-');
  if (!Array.isArray(texts) || texts.length < 1 || texts.length > MAX_ITEMS) {
    return { error: `Jumlah teks harus antara 1 dan ${MAX_ITEMS}.`, code: 'TRANSLATION_INVALID_BATCH', status: 400 };
  }
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(targetLanguage) || targetLanguage.toLowerCase().split('-')[0] === 'id') {
    return { error: 'Kode bahasa tujuan tidak valid.', code: 'TRANSLATION_INVALID_LANGUAGE', status: 400 };
  }

  const normalizedTexts = [];
  let totalCharacters = 0;
  for (const item of texts) {
    if (typeof item !== 'string' || !item.trim()) {
      return { error: 'Teks kosong atau format teks tidak valid.', code: 'TRANSLATION_INVALID_TEXT', status: 400 };
    }
    const length = [...item].length;
    if (length > MAX_SINGLE_TEXT_CHARACTERS) {
      return { error: 'Satu teks melebihi batas aman 5.000 karakter.', code: 'TRANSLATION_TEXT_TOO_LONG', status: 413 };
    }
    totalCharacters += length;
    normalizedTexts.push(item);
  }
  if (totalCharacters > MAX_TOTAL_CHARACTERS) {
    return { error: 'Ukuran total teks melebihi batas aman permintaan.', code: 'TRANSLATION_BATCH_TOO_LARGE', status: 413 };
  }
  const providerSegments = normalizedTexts.reduce((sum, text) => sum + splitProviderSegments(text).length, 0);
  if (providerSegments > MAX_PROVIDER_SEGMENTS) {
    return { error: 'Terlalu banyak potongan teks untuk satu permintaan. Coba lagi dalam beberapa bagian.', code: 'TRANSLATION_BATCH_TOO_LARGE', status: 413 };
  }
  return { texts: normalizedTexts, targetLanguage };
}

function classifyMyMemoryFailure(httpStatus, payload) {
  const details = String(payload?.responseDetails || payload?.message || payload?.error || '').toLowerCase();
  if (Number(httpStatus) === 429 || payload?.quotaFinished === true || /quota|limit exceeded|too many requests/.test(details)) {
    return {
      status: 429,
      code: 'TRANSLATION_QUOTA_EXCEEDED',
      error: 'Batas harian MyMemory tercapai. Terjemahan tersimpan di cache tetap bisa digunakan; coba lagi setelah kuota harian pulih.'
    };
  }
  if (Number(httpStatus) >= 500 || Number(httpStatus) === 0) {
    return { status: 502, code: 'TRANSLATION_UPSTREAM_ERROR', error: 'MyMemory sedang tidak tersedia. Coba lagi beberapa saat.' };
  }
  if (/language pair|language code|unsupported|not supported|no translation|please select|invalid source|invalid target/.test(details)) {
    return { status: 422, code: 'TRANSLATION_UNSUPPORTED_LANGUAGE', error: 'Pasangan bahasa ini belum tersedia pada MyMemory.' };
  }
  return { status: 502, code: 'TRANSLATION_UPSTREAM_ERROR', error: 'MyMemory tidak memberikan hasil terjemahan yang valid.' };
}

function preserveProviderWhitespace(source, translated) {
  const original = String(source ?? '');
  const leading = original.match(/^\s*/u)?.[0] || '';
  const trailing = original.match(/\s*$/u)?.[0] || '';
  return `${leading}${String(translated ?? '').trim()}${trailing}`;
}

function readCachedTranslation(language, source) {
  const key = `${language}\u0000${source}`;
  const cached = translationCache.get(key);
  if (!cached) return null;
  if (Date.now() >= cached.expiresAt) {
    translationCache.delete(key);
    return null;
  }
  // Refresh LRU order.
  translationCache.delete(key);
  translationCache.set(key, cached);
  return cached.value;
}

function writeCachedTranslation(language, source, value) {
  const key = `${language}\u0000${source}`;
  translationCache.delete(key);
  translationCache.set(key, { value, expiresAt: Date.now() + TRANSLATION_CACHE_TTL_MS });
  while (translationCache.size > MAX_TRANSLATION_CACHE_ENTRIES) {
    const oldest = translationCache.keys().next().value;
    if (oldest === undefined) break;
    translationCache.delete(oldest);
  }
}

async function fetchMyMemorySegment(source, targetLanguage) {
  const cached = readCachedTranslation(targetLanguage, source);
  if (cached !== null) return cached;

  const endpoint = new URL(MYMEMORY_ENDPOINT);
  endpoint.searchParams.set('q', source);
  endpoint.searchParams.set('langpair', `id|${targetLanguage}`);
  endpoint.searchParams.set('mt', '1');

  // Supplying an optional valid contact email raises the documented daily
  // allowance from 5,000 to 50,000 characters. It is not an API key/secret.
  const contactEmail = String(process.env.MYMEMORY_CONTACT_EMAIL || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    endpoint.searchParams.set('de', contactEmail);
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    const failure = {
      status: timedOut ? 504 : 502,
      code: timedOut ? 'TRANSLATION_TIMEOUT' : 'TRANSLATION_NETWORK_ERROR',
      error: timedOut ? 'Permintaan ke MyMemory terlalu lama.' : 'Server tidak dapat menjangkau MyMemory.'
    };
    const wrapped = new Error(failure.error);
    Object.assign(wrapped, failure);
    throw wrapped;
  }

  let payload;
  try { payload = await response.json(); } catch (_) { payload = null; }
  const providerStatus = Number(payload?.responseStatus || 0);
  if (!response.ok || providerStatus !== 200 || payload?.quotaFinished === true) {
    const failure = classifyMyMemoryFailure(response.status || providerStatus, payload);
    const wrapped = new Error(failure.error);
    Object.assign(wrapped, failure);
    throw wrapped;
  }

  const translated = payload?.responseData?.translatedText;
  if (typeof translated !== 'string' || !translated.trim()) {
    const failure = classifyMyMemoryFailure(response.status, payload);
    const wrapped = new Error(failure.error);
    Object.assign(wrapped, failure);
    throw wrapped;
  }

  const clean = preserveProviderWhitespace(source, translated);
  if (/^(\s*)(PLEASE SELECT|QUERY LENGTH LIMIT|INVALID SOURCE|INVALID TARGET)/i.test(clean)) {
    const failure = classifyMyMemoryFailure(422, { responseDetails: clean });
    const wrapped = new Error(failure.error);
    Object.assign(wrapped, failure);
    throw wrapped;
  }
  writeCachedTranslation(targetLanguage, source, clean);
  return clean;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function translateOneText(text, targetLanguage) {
  const segments = splitProviderSegments(text);
  const translatedSegments = [];
  // Keep sequential segment order for text nodes that exceed the provider limit.
  for (const segment of segments) {
    // Preserve whitespace-only chunks locally; never spend provider quota on them.
    translatedSegments.push(segment.trim() ? await fetchMyMemorySegment(segment, targetLanguage) : segment);
  }
  return translatedSegments.join('');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Allow', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Metode tidak diizinkan.', code: 'METHOD_NOT_ALLOWED' });
  }

  const auth = await requireSupabaseUser(req);
  if (auth.error) return json(res, auth.status, { error: auth.error, code: auth.code });

  const body = parseBody(req.body);
  const validated = validateRequest(body);
  if (validated.error) return json(res, validated.status, { error: validated.error, code: validated.code });

  const limited = enforceRateLimit(req, res, auth.user.id);
  if (limited) {
    return json(res, 429, {
      error: 'Batas permintaan terjemahan sementara tercapai. Coba lagi sebentar.',
      code: 'TRANSLATION_RATE_LIMITED',
      retryAfter: limited.retryAfter
    });
  }

  try {
    const translations = await mapWithConcurrency(
      validated.texts,
      PROVIDER_CONCURRENCY,
      (text) => translateOneText(text, validated.targetLanguage)
    );
    if (translations.length !== validated.texts.length || translations.some((value) => typeof value !== 'string' || !value.trim())) {
      return json(res, 502, { error: 'MyMemory mengembalikan hasil yang tidak lengkap.', code: 'TRANSLATION_INVALID_UPSTREAM_RESPONSE' });
    }

    return json(res, 200, {
      provider: 'MyMemory',
      targetLanguage: validated.targetLanguage,
      translations
    });
  } catch (error) {
    const status = Number(error?.status || 502);
    const code = error?.code || 'TRANSLATION_UPSTREAM_ERROR';
    // Never log user text, translation content, contact email or access tokens.
    console.warn('[Translate API] MyMemory request failed:', code, status);
    if (status === 429) res.setHeader('Retry-After', '60');
    return json(res, status, {
      error: String(error?.error || error?.message || 'MyMemory translation failed.'),
      code
    });
  }
}

export const __test = Object.freeze({
  parseBody,
  validateRequest,
  enforceRateLimit,
  splitProviderSegments,
  preserveProviderWhitespace,
  classifyMyMemoryFailure,
  fetchMyMemorySegment,
  mapWithConcurrency,
  translateOneText,
  get cacheSize() { return translationCache.size; }
});
