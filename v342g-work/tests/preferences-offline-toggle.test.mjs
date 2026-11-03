/** Regression guard for forced-offline preference transitions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../assets/js/features-preferences.js', import.meta.url), 'utf8');
const savePreferences = source.match(/function simpanPreferensiLengkap\(\)\s*\{([\s\S]*?)\n\}/)?.[1] || '';

test('saving the offline preference reconciles UI for both enable and disable transitions', () => {
    assert.ok(savePreferences, 'preference save handler exists');
    assert.match(savePreferences, /if\s*\(elOffline\)\s*\{[\s\S]*?writePreference\('app_force_offline',\s*elOffline\.checked\)/);
    assert.match(savePreferences, /window\.handleOfflinePremium\?\.\(\)/);
    assert.doesNotMatch(savePreferences, /if\s*\(elOffline\.checked\)/);
});
