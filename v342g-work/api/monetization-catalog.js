import { getPublicCatalog, jsonResponse, setCors, MonetizationError } from './monetization-utils.js';
export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return jsonResponse(res, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  try { return jsonResponse(res, 200, getPublicCatalog()); }
  catch (error) { return jsonResponse(res, error.status || 503, { error: error.message, code: error.code || 'MONETIZATION_ERROR' }); }
}
