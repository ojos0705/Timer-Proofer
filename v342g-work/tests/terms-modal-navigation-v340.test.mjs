import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('www/index.html');
const bootstrap = read('assets/js/modal-bootstrap.js');
const delegation = read('assets/js/core/event-delegation.js');

function loadOpenTermsAction(modal) {
  const start = delegation.indexOf('const SPECIAL_ACTIONS = {');
  const end = delegation.indexOf('\n};\n\n// [AI-GENERATED][REFACTOR] Decode', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const source = `${delegation.slice(start, end + 3)}\nglobalThis.testAction = SPECIAL_ACTIONS.openTermsModal;`;
  const calls = [];
  const context = {
    document: { getElementById(id) { return id === 'tos-modal' ? modal : null; } },
    window: { __TPModalCore: { toggleModal(id) { calls.push(id); modal.active = true; return true; } } },
    console: { warn() {}, error() {} },
    String
  };
  vm.runInNewContext(source, context, { filename: 'event-delegation-special-actions-v340.js' });
  return { action: context.testAction, calls };
}

test('Register and Settings terms links route through the same explicit TOS action', () => {
  assert.equal((html.match(/id="tos-modal"/g) ?? []).length, 1);
  assert.equal((html.match(/data-action="openTermsModal" data-arg="tos-modal"/g) ?? []).length, 2,
    'register consent link and settings row use the same action');
  assert.match(html, /data-action="openTermsModal" data-arg="tos-modal" href="#"[^>]*>Syarat &amp; Ketentuan Layanan/);
  assert.match(html, /data-action="openTermsModal" data-arg="tos-modal"[\s\S]*?Syarat &amp; Ketentuan Layanan/);
});

test('Terms modal is moved out of the clipped app scroll region before interaction', () => {
  assert.match(bootstrap, /function detachTermsModalFromAppShell\(\)[\s\S]*?document\.querySelector\('#app-container > \.scrollable-content'\)[\s\S]*?appContent\.contains\(modal\)[\s\S]*?document\.body\.appendChild\(modal\)/);
  assert.match(bootstrap, /detachOverlaysFromProfileContainer\(\);\s*detachTermsModalFromAppShell\(\);/);
});

test('openTermsModal is safe, idempotent, and uses the canonical modal controller', () => {
  const content = { scrollTop: 22 };
  const modal = {
    active: false,
    classList: { contains() { return modal.active; } },
    querySelector(selector) { return selector === '.modal-scroll-content' ? content : null; }
  };
  const { action, calls } = loadOpenTermsAction(modal);
  assert.equal(action('tos-modal'), true);
  assert.deepEqual(calls, ['tos-modal']);

  content.scrollTop = 22;
  assert.equal(action('tos-modal'), true);
  assert.deepEqual(calls, ['tos-modal'], 'repeated tap while open must not close the modal');
  assert.equal(content.scrollTop, 0, 'repeated open returns the reading panel to its top');
});

test('openTermsModal reports a missing dialog instead of silently toggling an unrelated modal', () => {
  const { action, calls } = loadOpenTermsAction(null);
  assert.equal(action('tos-modal'), false);
  assert.deepEqual(calls, []);
  assert.equal(action('about-modal'), false);
  assert.deepEqual(calls, []);
});
