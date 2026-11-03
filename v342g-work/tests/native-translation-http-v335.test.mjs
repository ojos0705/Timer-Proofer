/** [AI-GENERATED][QA][V335] Native translation requests use CapacitorHttp, not WebView fetch/CORS. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (relative) => fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');

test('CapacitorHttp is exported from the bundled core and registered by NativeCapacitorService', () => {
  assert.match(read('vendor/capacitor-plugins.js'), /Fe as CapacitorHttp/);
  const native = read('assets/js/native-capacitor-service.js');
  assert.match(native, /CapacitorHttp/);
  assert.match(native, /http: canUse\('CapacitorHttp'\)/);
});

test('translation client opts into native HTTP while browser requests retain fetch and API CORS stays enabled', () => {
  const apiClient = read('assets/js/api-client-service.js');
  const cloud = read('assets/js/cloud-translation-service.js');
  const endpoint = read('api/translate.js');
  assert.match(apiClient, /options\.preferNativeHttp === true && NativeCapacitorService\.isNativePlatform\(\)/);
  assert.match(apiClient, /plugin\.request\(/);
  assert.match(apiClient, /API_NATIVE_NETWORK_ERROR/);
  assert.match(apiClient, /responseType: 'json'/);
  assert.match(cloud, /preferNativeHttp: true/);
  assert.match(endpoint, /Access-Control-Allow-Headers[^\n]*Authorization/);
  assert.match(endpoint, /req\.method === 'OPTIONS'/);
});

test('CapacitorHttp native JSON request reaches the native bridge and returns parsed API data', async () => {
  const previous = new Map(['window', 'Capacitor', 'androidBridge', 'navigator', 'fetch'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const calls = [];
  const capacitor = {
    androidBridge: {},
    isNativePlatform() { return true; },
    Plugins: {},
    PluginHeaders: [{ name: 'CapacitorHttp', methods: [{ name: 'request', rtype: 'promise' }] }],
    nativePromise(pluginName, methodName, options) {
      calls.push({ pluginName, methodName, options });
      return Promise.resolve({
        status: 200,
        url: options.url,
        data: { translations: ['Halo dunia'] }
      });
    }
  };
  Object.defineProperty(globalThis, 'Capacitor', { configurable: true, writable: true, value: capacitor });
  Object.defineProperty(globalThis, 'androidBridge', { configurable: true, writable: true, value: {} });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: { Capacitor: capacitor, location: { protocol: 'capacitor:', hostname: 'localhost', origin: 'capacitor://localhost' } }
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: async () => { throw new Error('fetch must not run for native HTTP'); } });
  try {
    const clientUrl = new URL('../assets/js/api-client-service.js', import.meta.url);
    clientUrl.searchParams.set('test-native-http-v335', '1');
    const { postJson } = await import(clientUrl.href);
    const result = await postJson('/api/translate', {
      texts: ['Hello world'],
      targetLanguage: 'es'
    }, {
      preferNativeHttp: true,
      headers: { Authorization: 'Bearer test-session-token' },
      timeoutMs: 5000
    });

    assert.deepEqual(result, { translations: ['Halo dunia'] });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].pluginName, 'CapacitorHttp');
    assert.equal(calls[0].methodName, 'request');
    assert.equal(calls[0].options.url, 'https://timer-proofer.vercel.app/api/translate');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-session-token');
    assert.deepEqual(calls[0].options.data, { texts: ['Hello world'], targetLanguage: 'es' });
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
