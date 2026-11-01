/**
 * [AI-GENERATED][I18N][V334]
 * Public local candidate catalog. MyMemory does not publish a public language
 * pair catalog; actual Indonesia -> target support is validated by /api/translate.
 */
import { TRANSLATION_LANGUAGE_CANDIDATES } from './translation-language-codes.js';

function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400');
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Allow', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Metode tidak diizinkan.', code: 'METHOD_NOT_ALLOWED' });
  }
  return json(res, 200, {
    languages: TRANSLATION_LANGUAGE_CANDIDATES,
    provider: 'MyMemory',
    catalogType: 'candidate',
    note: 'Daftar ini berisi kandidat bahasa aplikasi, bukan jaminan bahwa setiap pasangan Indonesia ke bahasa tujuan tersedia.'
  });
}

export const __test = Object.freeze({ candidateLanguages: TRANSLATION_LANGUAGE_CANDIDATES });
