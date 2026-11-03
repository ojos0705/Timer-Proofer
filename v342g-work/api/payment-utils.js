/**
 * [AI-GENERATED][SECURITY][V209] Normalize customer fields before sending them
 * to the payment provider. The payment amount and transaction identity remain
 * server-authoritative in create-payment-token.js.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePaymentCustomerDetails(input) {
  const details = input && typeof input === 'object' && !Array.isArray(input)
    ? input
    : {};

  const firstName = typeof details.first_name === 'string' && details.first_name.trim()
    ? details.first_name.trim().slice(0, 100)
    : 'Pelanggan';

  // Validate the same normalized value that will be sent to Midtrans. Never
  // validate an oversized email and then silently truncate it into another value.
  const candidateEmail = typeof details.email === 'string'
    ? details.email.trim()
    : '';
  const email = candidateEmail.length <= 254 && EMAIL_PATTERN.test(candidateEmail)
    ? candidateEmail
    : undefined;

  return {
    first_name: firstName,
    ...(email ? { email } : {}),
  };
}
