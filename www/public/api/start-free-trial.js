/** [AI-GENERATED][MONETIZATION][V342-D] One-time, no-payment, non-renewing 7-day Pro trial. */
import { jsonResponse, requireSupabaseUser, setCors, supabaseServiceRequest } from './monetization-utils.js';

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return jsonResponse(res, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  try {
    const { user } = await requireSupabaseUser(req);
    const result = await supabaseServiceRequest('rpc/start_free_trial', {
      method: 'POST', body: { p_user_id: user.id, p_duration_days: 7 }
    });
    const item = Array.isArray(result) ? result[0] : result;
    if (!item?.started) {
      return jsonResponse(res, 409, {
        error: item?.reason === 'already_claimed'
          ? 'Masa uji coba 7 hari sudah pernah digunakan pada akun ini.'
          : item?.reason === 'paid_membership_active'
            ? 'Masa uji coba tidak dapat dimulai selama paket berbayar masih aktif.'
            : 'Akun ini belum memenuhi syarat untuk masa uji coba.',
        code: item?.reason === 'already_claimed' ? 'TRIAL_ALREADY_CLAIMED' : 'TRIAL_NOT_ELIGIBLE',
        trial: item || null
      });
    }
    return jsonResponse(res, 200, { success: true, trial: item, message: 'Free Trial Pro aktif selama 7 hari. Tidak ada metode pembayaran atau penagihan otomatis.' });
  } catch (error) {
    return jsonResponse(res, error.status || 500, { error: error.message || 'Free Trial belum dapat dimulai.', code: error.code || 'TRIAL_START_ERROR' });
  }
}
