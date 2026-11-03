/** [AI-GENERATED][QA][V335] Registration consent must be explicit and fail closed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (relative) => fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
const html = read('www/index.html');
const feature = read('assets/js/features-auth-ui.js');
const core = read('assets/js/app-core.js');

test('Terms link targets the existing TOS modal through the canonical modal action', () => {
  assert.match(html, /<a[^>]*data-action="openTermsModal"[^>]*data-arg="tos-modal"[^>]*>Syarat &amp; Ketentuan Layanan<\/a>/);
  assert.match(html, /id="tos-modal"/);
  assert.match(html, /data-action="openTermsModal" data-arg="tos-modal"/);
});

test('registration submit begins disabled and requires checked consent', () => {
  assert.match(html, /<button[^>]*id="btn-submit-main"[^>]*disabled[^>]*aria-disabled="true"[^>]*>/);
  assert.match(feature, /export function validateRegistrationConsent/);
  assert.match(feature, /consent\?\.checked === true/);
  assert.match(feature, /mode !== 'register' \|\| validateRegistrationConsent/);
  assert.match(feature, /bindOnce\(document\.getElementById\('agree-tos-checkbox'\), 'authConsentBound'/);
  assert.match(feature, /button\.disabled = !enabled/);
  assert.match(core, /validateRegistrationConsent\(/);
  assert.match(core, /if \(!consentAccepted\) return/);
});

test('register button follows checkbox state while login remains available', async () => {
  const previous = new Map(['window', 'document'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const consent = { checked: false };
  const attributes = {};
  const button = {
    disabled: false,
    setAttribute(name, value) { attributes[name] = value; }
  };
  const elements = new Map([
    ['agree-tos-checkbox', consent],
    ['btn-submit-main', button]
  ]);
  globalThis.window = { currentAuthMode: 'register' };
  globalThis.document = {
    readyState: 'loading',
    getElementById(id) { return elements.get(id) || null; },
    addEventListener() {}
  };
  try {
    const moduleUrl = new URL('../assets/js/features-auth-ui.js', import.meta.url);
    moduleUrl.searchParams.set('test-consent-v335', '1');
    const { syncRegistrationSubmitState } = await import(moduleUrl.href);

    assert.equal(syncRegistrationSubmitState({ documentRef: document, mode: 'register' }), false);
    assert.equal(button.disabled, true);
    assert.equal(attributes['aria-disabled'], 'true');

    consent.checked = true;
    assert.equal(syncRegistrationSubmitState({ documentRef: document, mode: 'register' }), true);
    assert.equal(button.disabled, false);
    assert.equal(attributes['aria-disabled'], 'false');

    consent.checked = false;
    assert.equal(syncRegistrationSubmitState({ documentRef: document, mode: 'register' }), false);
    assert.equal(button.disabled, true);

    assert.equal(syncRegistrationSubmitState({ documentRef: document, mode: 'login' }), true);
    assert.equal(button.disabled, false);
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
