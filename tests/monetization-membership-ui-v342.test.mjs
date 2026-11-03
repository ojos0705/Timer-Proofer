import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'assets/js/language-engine.js'), 'utf8');

test('membership package UI preserves the existing checkout action and amount ID', () => {
  assert.match(html, /class="payment-checkout-container"/);
  assert.match(html, /id="pay-total-amount"/);
  assert.match(html, /data-action="mulaiTransaksiMidtrans"/);
  assert.match(html, /id="membership-plan-list"/);
  assert.match(html, /id="membership-current-plan"/);
  assert.match(html, /id="pay-subtotal-amount"/);
  assert.match(html, /id="pay-discount-amount"/);
  assert.match(html, /Tahunan · Segera/);
});

test('membership UI loads active server catalog and renders user-controlled text safely', () => {
  assert.match(source, /getJson\('\/api\/monetization-catalog'/);
  assert.match(source, /plan\?\.active === true/);
  assert.match(source, /plan\?\.billing_period !== 'annual'/);
  assert.match(source, /membership-plan-free/);
  assert.match(source, /node\.textContent = String\(text\)/);
  assert.doesNotMatch(source, /membership-plan-list[\s\S]{0,1200}\.innerHTML\s*=/);
});

test('checkout requires the explicitly selected active server plan, never the first active plan', () => {
  assert.match(source, /item\?\.id === selectedMembershipPlanId/);
  assert.match(source, /plan_id:\s*plan\.id/);
  assert.doesNotMatch(source, /find\(\(item\) => item\?\.active === true\)/);
});

test('membership status is read from the authenticated server entitlement endpoint', () => {
  assert.match(source, /getJson\('\/api\/my-entitlements'/);
  assert.match(source, /Authorization: `Bearer \$\{token\}`/);
  assert.match(source, /Tidak ada status Premium yang diasumsikan saat server tidak tersedia/);
});

test('annual pricing is not fabricated in the package UI', () => {
  assert.match(html, /Tahunan · Segera/);
  assert.doesNotMatch(html, /Rp\s?549\.000/i);
});

test('V342-D membership UI exposes explicit one-time trial action and per-feature quota status', () => {
  assert.match(html, /id="membership-trial-button"/);
  assert.match(html, /data-action="startFreeTrial"/);
  assert.match(html, /id="membership-feature-quotas"/);
  assert.match(source, /postJson\('\/api\/start-free-trial'/);
  assert.match(source, /getJson\('\/api\/feature-access'/);
  assert.match(source, /trial\?\.eligible !== true/);
});

test('membership access state refreshes when the existing Profile modal is opened', () => {
  assert.match(source, /data-action=\"toggleModal\"\]\[data-arg=\"user-modal\"\]/);
  assert.match(source, /window\.setTimeout\(\(\) =>/);
  assert.match(source, /void loadMembershipPackages\(\)/);
});
