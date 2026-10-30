import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const feature = fs.readFileSync(new URL('../assets/js/features-auth-ui.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('authentication defaults to login with password sign-in controls visible', () => {
    assert.match(html, /id="auth-title">Timer Proofing<\/h2>/);
    assert.match(html, /id="auth-subtitle">Masuk ke akun Anda<\/p>/);
    assert.match(html, /id="group-password" style="display: block;"/);
    assert.match(html, /id="back-to-login-wrapper"[^>]*display: none;/);
    assert.match(feature, /let currentAuthMode = 'login';/);
});

test('app-core imports the extracted mode owner through an explicit ESM binding', () => {
    assert.match(source, /import \{ switchAuthTab, validateRegistrationConsent \} from '\.\/features-auth-ui\.js\?v=20261030-v327'/);
    assert.doesNotMatch(source, /function switchAuthTab\(mode\)/);
    assert.match(feature, /window\.switchAuthTab = switchAuthTab/);
    assert.match(feature, /bindOnce\(document\.getElementById\('tab-register'\)/);
});




test('auth submit requires explicit terms consent before calling signup', () => {
    const registerStart = source.indexOf("if (mode === 'register') {");
    const signUpCall = source.indexOf('AuthService.signUp({', registerStart);
    assert.ok(registerStart >= 0 && signUpCall > registerStart);
    const registerFlow = source.slice(registerStart, signUpCall);
    assert.match(registerFlow, /validateRegistrationConsent\(/);
    assert.match(registerFlow, /if \(!consentAccepted\) return/);
    assert.match(source, /import \{ switchAuthTab, validateRegistrationConsent \} from '\.\/features-auth-ui\.js\?v=20261030-v327'/);
});
