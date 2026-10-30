/** [AI-GENERATED][QA][V327] Android system PiP Back and fixed viewport shell. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
const mainActivity = fs.readFileSync(path.join(root, 'android/app/src/main/java/com/timerproofer/app/MainActivity.java'), 'utf8');
const pipPlugin = fs.readFileSync(path.join(root, 'android/app/src/main/java/com/timerproofer/app/TimerPipPlugin.java'), 'utf8');
const version = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));

function cssBlock(source, selector, nextSelector) {
    const start = source.indexOf(selector);
    assert.ok(start >= 0, `Missing CSS selector ${selector}`);
    const end = nextSelector ? source.indexOf(nextSelector, start + selector.length) : source.indexOf('}', start) + 1;
    assert.ok(end > start, `Missing end for CSS selector ${selector}`);
    return source.slice(start, end);
}

test('document and body are viewport-locked; app-container cannot become the page scroller', () => {
    const htmlBlock = cssBlock(html, 'html {', '/*  STYLE SELURUH PAGE */');
    const bodyLock = cssBlock(html, '/* [AI-GENERATED][APP-SHELL][V327]', '/* Style elegan ala bar menu WhatsApp */');
    const appShell = cssBlock(html, '#app-container {', '/* [AI-GENERATED][APP-SHELL][V327] The fixed body');
    const innerScroll = cssBlock(html, '#app-container > .scrollable-content {', '.container,');
    assert.match(htmlBlock, /overflow:\s*hidden/);
    assert.match(bodyLock, /position:\s*fixed\s*!important/);
    assert.match(bodyLock, /overflow:\s*hidden\s*!important/);
    assert.match(appShell, /position:\s*absolute\s*!important/);
    assert.match(appShell, /overflow:\s*hidden\s*!important/);
    assert.match(innerScroll, /overflow-y:\s*auto/);
    assert.match(innerScroll, /-webkit-overflow-scrolling:\s*touch/);
    assert.match(innerScroll, /touch-action:\s*pan-y/);
});

test('Android native Back enters system PiP before WebView exit when timer is active', () => {
    assert.match(mainActivity, /getOnBackPressedDispatcher\(\)\.addCallback\(this/);
    assert.match(mainActivity, /public void onBackPressed\(\)/);
    assert.match(mainActivity, /TimerPipPlugin\.isProofingTimerActive\(\)/);
    assert.match(mainActivity, /enterTimerPictureInPicture\(\)/);
    assert.match(mainActivity, /enterPictureInPictureMode\(builder\.build\(\)\)/);
    assert.match(mainActivity, /moveTaskToBack\(true\)/);
    assert.match(mainActivity, /getOnBackPressedDispatcher\(\)\.onBackPressed\(\)/);
});

test('native PiP state remains synced with JS timer state and PiP exit restores the WebView', () => {
    assert.match(pipPlugin, /static boolean isProofingTimerActive\(\)/);
    assert.match(pipPlugin, /proofingTimerActive = active/);
    assert.match(mainActivity, /onPictureInPictureModeChanged\(boolean isInPictureInPictureMode, Configuration newConfig\)/);
    assert.match(mainActivity, /timerproofer:pipchange/);
    assert.match(html, /runtime-entry\.js\?v=20261030-v327/);
});

test('technical cache token is advanced while visible application version remains V125', () => {
    assert.equal(version.version, 'V125');
    assert.equal(version.releaseToken, '20261030-v327');
    assert.equal(version.serviceWorker, 'Timer-Proofing-v1.1.229');
});
