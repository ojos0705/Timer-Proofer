import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('V326 uses video Picture-in-Picture fallback for mobile PWA browsers', () => {
    const source = read('assets/js/app-core.js');
    assert.match(source, /HTMLVideoElement\.prototype\.requestPictureInPicture/);
    assert.match(source, /canvas\.captureStream\(2\)/);
    assert.match(source, /enterWebVideoPictureInPicture/);
    assert.match(source, /documentPictureInPicture/);
    assert.match(source, /updatePipTriggerButton/);
    assert.match(source, /exitPictureInPicture/);
    assert.match(source, /appContainer\?\.classList\.contains\('mini-mode'\)/);
});

test('V326 removes beforeunload confirmation and keeps pagehide persistence', () => {
    const source = read('assets/js/app-core.js');
    assert.doesNotMatch(source, /addEventListener\(['"]beforeunload['"]/);
    assert.match(source, /addEventListener\(['"]pagehide['"]/);
});

test('V326 traps PWA Back only while the countdown is active', () => {
    const lifecycle = read('assets/js/app-lifecycle-service.js');
    const core = read('assets/js/app-core.js');
    assert.match(lifecycle, /function setTimerBackGuard\(active\)/);
    assert.match(lifecycle, /__tpProofingTimerBackGuard/);
    assert.match(core, /setTimerBackGuard\(true\)/);
    assert.match(core, /onBackButton: async \(source = 'native-back'\)/);
});

test('V326 portals article detail overlay to the viewport root', () => {
    const core = read('assets/js/app-core.js');
    const html = read('www/index.html');
    assert.match(core, /document\.documentElement\.appendChild\(overlay\)/);
    assert.match(core, /__tpPortalPlaceholder/);
    assert.match(html, /#article-modal \{display: none; position: fixed !important; inset: 0 !important/);
    assert.match(html, /touch-action: pan-y/);
});

test('V326 supports onboarding preview without erasing auth session flags', () => {
    const onboarding = read('assets/js/features-onboarding.js');
    const auth = read('assets/js/auth-service.js');
    assert.match(onboarding, /tp-onboarding-preview/);
    assert.match(onboarding, /tp_onboarding_preview_done/);
    assert.match(onboarding, /params\.get\('reset'\) === '1'/);
    assert.match(onboarding, /tp_welcome_preview_done/);
    assert.match(onboarding, /tp_welcome_preview_done/);
    assert.match(onboarding, /bindWelcomeSwipeEvents/);
    assert.match(auth, /isPreviewActive\?\.\(\)/);
});

test('V326 native PiP tracks timer activity and prepares Android auto-enter', () => {
    const plugin = read('android/app/src/main/java/com/timerproofer/app/TimerPipPlugin.java');
    const activity = read('android/app/src/main/java/com/timerproofer/app/MainActivity.java');
    assert.match(plugin, /setTimerActive/);
    assert.match(plugin, /setAutoEnterEnabled\(active\)/);
    assert.match(activity, /onUserLeaveHint/);
    assert.match(activity, /enterFromUserLeaveHint/);
});
