import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('settings child pages preserve parent navigation and restore settings when closed', async () => {
  const bootstrap = await read('www/assets/js/modal-bootstrap.js');
  assert.match(bootstrap, /returnToSettings:\s*false/);
  assert.match(bootstrap, /settingsChildIds:\s*new Set\(\['modal-koneksi-sensor'.*'feedback-modal'/s);
  assert.match(bootstrap, /state\.returnToSettings && state\.settingsChildIds\.has\(id\)/);
  assert.match(bootstrap, /setTimeout\(\(\) => toggleModal\('settings-modal'\), 0\)/);
});

test('language menu uses canonical modal controller and tour uses existing tab IDs', async () => {
  const language = await read('www/assets/js/language-engine.js');
  const onboarding = await read('www/assets/js/features-onboarding.js');
  assert.match(language, /toggleModal\('whatsapp-language-modal'\)/);
  assert.match(onboarding, /element:\s*'#tab-recipe'/);
  assert.match(onboarding, /element:\s*'#tab-tips'/);
});

test('help and tour close through the canonical modal lifecycle', async () => {
  const appCore = await read('www/assets/js/app-core.js');
  assert.match(appCore, /function openHelpSubModal\(\)[\s\S]*?toggleModal\('help-modal'\)/);
  assert.match(appCore, /function closeHelpModal\(\)[\s\S]*?toggleModal\('help-modal'\)/);
  assert.match(appCore, /Close Settings through the canonical lifecycle/);
});
