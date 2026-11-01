import { NativeCapacitorService } from './native-capacitor-service.js';
/**
 * [AI-GENERATED][REFACTOR][V36]
 * Canonical HTTP client for backend/serverless requests.
 * Owns endpoint resolution, timeout/abort handling, JSON validation, and
 * consistent error metadata so feature modules do not duplicate networking code.
 */

const API_ORIGIN = 'https://timer-proofer.vercel.app';
const DEFAULT_TIMEOUT_MS = 30000;

function resolveApiUrl(path) {
    const rawPath = String(path || '');
    if (/^https?:\/\//i.test(rawPath)) return rawPath;
    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const protocol = window.location?.protocol || '';
    const hostname = window.location?.hostname || '';
    // [AI-GENERATED][ROBUSTNESS][V44] Native detection has one canonical owner.
    const isCapacitorNative = NativeCapacitorService.isNativePlatform() ||
        protocol === 'capacitor:' ||
        (hostname === 'localhost' && protocol === 'https:');

    if (isCapacitorNative) return `${API_ORIGIN}${normalizedPath}`;
    if (/\.vercel\.app$/i.test(hostname) || hostname === 'timer-proofer.vercel.app') {
        return `${window.location.origin}${normalizedPath}`;
    }
    return `${API_ORIGIN}${normalizedPath}`;
}

function createAbortController(timeoutMs, externalSignal) {
    const controller = new AbortController();
    const safeTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), safeTimeout);

    if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    return { controller, timeoutId, timeoutMs: safeTimeout };
}

function makeHttpError(message, response, details = null, explicitCode = '') {
    const error = new Error(message);
    error.name = 'ApiClientError';
    error.status = response?.status ?? 0;
    error.details = details;
    error.url = response?.url || '';
    error.code = explicitCode || details?.code || (error.status === 404 ? 'API_ROUTE_NOT_FOUND' : 'API_HTTP_ERROR');
    return error;
}

// [AI-GENERATED][NATIVE-NETWORK][V335] Use Capacitor's native HTTP stack for
// selected native API calls. This avoids WebView CORS/preflight limitations
// while preserving fetch for PWA/browser requests.
async function requestWithNativeHttp(url, method, headers, body, timeoutMs) {
    if (!NativeCapacitorService.isNativePlatform()) return null;
    const plugin = NativeCapacitorService.getPlugin('CapacitorHttp');
    if (typeof plugin?.request !== 'function') {
        const error = new Error('CapacitorHttp tidak tersedia pada build native ini. Jalankan sinkronisasi Android dan build ulang aplikasi.');
        error.name = 'ApiNetworkError';
        error.code = 'API_NATIVE_HTTP_UNAVAILABLE';
        error.status = 0;
        error.url = url;
        throw error;
    }

    let response;
    try {
        response = await plugin.request({
            url,
            method,
            headers,
            ...(body !== undefined ? { data: body } : {}),
            connectTimeout: timeoutMs,
            readTimeout: timeoutMs,
            responseType: 'json'
        });
    } catch (cause) {
        const error = new Error('Permintaan native ke server gagal. Periksa koneksi internet HP dan alamat API Production.');
        error.name = 'ApiNetworkError';
        error.code = 'API_NATIVE_NETWORK_ERROR';
        error.status = 0;
        error.url = url;
        error.cause = cause;
        throw error;
    }

    let data = response?.data ?? null;
    if (typeof data === 'string' && data) {
        try { data = JSON.parse(data); }
        catch (_) { throw makeHttpError('Server API native mengembalikan JSON yang tidak valid.', response, { bodyPreview: data.slice(0, 160) }, 'API_INVALID_RESPONSE'); }
    }

    const status = Number(response?.status || 0);
    if (status < 200 || status >= 300) {
        const message = data?.error || data?.details || data?.message || `Server merespons HTTP ${status || 'tidak diketahui'}.`;
        throw makeHttpError(message, response, data, data?.code || (status === 404 ? 'API_ROUTE_NOT_FOUND' : 'API_HTTP_ERROR'));
    }
    if (data == null || typeof data !== 'object') {
        throw makeHttpError('Server API native mengembalikan respons kosong atau tidak valid.', response, data, 'API_INVALID_RESPONSE');
    }
    return data;
}

async function parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!text) return null;

    if (!contentType.includes('application/json')) {
        const code = response?.status === 404 ? 'API_ROUTE_NOT_FOUND' : 'API_INVALID_RESPONSE';
        throw makeHttpError('Server mengembalikan format respons yang tidak valid.', response, {
            contentType,
            bodyPreview: text.slice(0, 160)
        }, code);
    }

    try {
        return JSON.parse(text);
    } catch {
        throw makeHttpError('Server tidak mengembalikan JSON yang valid.', response, {
            contentType,
            bodyPreview: text.slice(0, 160)
        }, 'API_INVALID_RESPONSE');
    }
}

async function requestJson(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const timeout = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
    const { controller, timeoutId, timeoutMs } = createAbortController(timeout, options.signal);
    const headers = {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
    };

    if (navigator.onLine === false && options.allowOffline !== true) {
        const error = new Error('Perangkat sedang offline.');
        error.name = 'OfflineError';
        error.code = 'OFFLINE';
        clearTimeout(timeoutId);
        throw error;
    }

    const requestUrl = resolveApiUrl(path);
    if (options.preferNativeHttp === true && NativeCapacitorService.isNativePlatform()) {
        try {
            const nativeData = await requestWithNativeHttp(requestUrl, method, headers, options.body, timeout);
            if (nativeData !== null) return nativeData;
        } catch (error) {
            throw error;
        } finally {
            // Native requests use plugin-level connect/read timeouts; always release
            // the shared AbortController timer because nativePromise cannot be aborted.
            clearTimeout(timeoutId);
        }
    }

    let response;
    try {
        response = await fetch(requestUrl, {
            method,
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: controller.signal,
            cache: options.cache || 'no-store'
        });

        const data = await parseResponse(response);
        if (!response.ok) {
            const message = data?.error || data?.details || data?.message || `Server merespons HTTP ${response.status}.`;
            throw makeHttpError(message, response, data, data?.code || '');
        }

        return data;
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeoutError = new Error(`Request timeout setelah ${Math.round(timeoutMs / 1000)} detik.`);
            timeoutError.name = 'TimeoutError';
            timeoutError.code = 'TIMEOUT';
            timeoutError.status = 0;
            throw timeoutError;
        }
        // Fetch exposes DNS, TLS, offline, and CORS failures as TypeError in
        // browsers/WebViews. Give feature modules a stable, non-secret code.
        if (error instanceof TypeError || error?.name === 'TypeError') {
            const networkError = new Error('Endpoint server tidak dapat dijangkau (jaringan atau CORS).');
            networkError.name = 'ApiNetworkError';
            networkError.code = 'API_NETWORK_ERROR';
            networkError.status = 0;
            networkError.url = resolveApiUrl(path);
            networkError.cause = error;
            throw networkError;
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export function getApiUrl(path) {
    return resolveApiUrl(path);
}

export function getJson(path, options = {}) {
    return requestJson(path, { ...options, method: 'GET' });
}

export function postJson(path, body, options = {}) {
    return requestJson(path, { ...options, method: 'POST', body });
}

// [AI-GENERATED][COMPATIBILITY] Preserve the existing global endpoint helper contract.
window.getVercelApiUrl = resolveApiUrl;

export const ApiClientService = Object.freeze({
    getApiUrl,
    getJson,
    postJson,
    requestJson
});

window.ApiClientService = ApiClientService;
