/** [AI-GENERATED][QA][V209] Regressions for payment customer input normalization. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePaymentCustomerDetails } from '../api/payment-utils.js';

test('normalizes valid customer name and email before forwarding to the gateway', () => {
  assert.deepEqual(
    normalizePaymentCustomerDetails({ first_name: '  Joko Prasetyo  ', email: '  joko@example.com  ' }),
    { first_name: 'Joko Prasetyo', email: 'joko@example.com' },
  );
});

test('does not validate an oversized email and then truncate it into an invalid address', () => {
  const oversizedEmail = `${'a'.repeat(245)}@example.com`;
  assert.ok(oversizedEmail.length > 254);
  assert.deepEqual(
    normalizePaymentCustomerDetails({ first_name: 'Joko', email: oversizedEmail }),
    { first_name: 'Joko' },
  );
});

test('omits invalid and empty emails but retains a usable customer name', () => {
  assert.deepEqual(
    normalizePaymentCustomerDetails({ first_name: 'Dina', email: 'dina@localhost' }),
    { first_name: 'Dina' },
  );
  assert.deepEqual(
    normalizePaymentCustomerDetails({ first_name: '   ', email: '   ' }),
    { first_name: 'Pelanggan' },
  );
});

test('bounds customer name length and safely defaults malformed customer details', () => {
  assert.equal(
    normalizePaymentCustomerDetails({ first_name: 'N'.repeat(150) }).first_name.length,
    100,
  );
  assert.deepEqual(normalizePaymentCustomerDetails(null), { first_name: 'Pelanggan' });
  assert.deepEqual(normalizePaymentCustomerDetails(['not', 'an', 'object']), { first_name: 'Pelanggan' });
});
