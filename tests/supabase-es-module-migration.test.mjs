/** [AI-GENERATED][QA][V257] Prevent accidental return to a classic Supabase SDK tag. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const entry = fs.readFileSync(new URL('../assets/js/runtime-entry.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../assets/js/supabase-runtime.js', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../assets/js/auth-service.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../www/sw.js', import.meta.url), 'utf8');
const manifest = fs.readFileSync(new URL('../assets/js/module-manifest.js', import.meta.url), 'utf8');

test('Supabase SDK is mapped as an ESM dependency and no longer loaded through a classic script tag', () => {
    assert.match(html, /"@supabase\/supabase-js"\s*:\s*"https:\/\/esm\.sh\/@supabase\/supabase-js@2"/);
    assert.doesNotMatch(html, /<script\s+src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/i);
    assert.match(runtime, /import\('@supabase\/supabase-js'\)/);
});

test('runtime attempts the SDK bridge before importing boot and isolates an SDK load failure', () => {
    assert.match(entry, /void initializeSupabaseSdkBridge\(\)[\s\S]*\.catch\(\(error\) => \{[\s\S]*__TP_SUPABASE_SDK_STATUS__ = 'unavailable'[\s\S]*await initializeRuntimeBootstrap\(\)[\s\S]*await import\('\.\/boot\.js\?v=20261030-v324'\)/);
    assert.doesNotMatch(entry, /await initializeSupabaseSdkBridge\(\)/, 'SDK network latency must not block the main app boot');
});

test('authentication APIs use retryable SDK initialization while retaining a synchronous compatibility getter', () => {
    assert.match(auth, /import \{ initializeSupabaseSdkBridge \} from '\.\/supabase-runtime\.js'/);
    assert.match(auth, /async function getSupabaseClientReady\(\)/);
    assert.match(auth, /verifyOtp: async \(params\) => \{\n\s*const client = await getSupabaseClientReady\(\)/);
    assert.match(auth, /signInWithPassword: async \(params\) => \{\n\s*const client = await getSupabaseClientReady\(\)/);
    assert.match(auth, /getClient: getSupabaseClient/);
});

test('Supabase ESM bridge is included in the Service Worker precache and module manifest', () => {
    assert.match(sw, /'\.\/assets\/js\/supabase-runtime\.js'/);
    assert.match(manifest, /'supabase-runtime\.js'/);
});
