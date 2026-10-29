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

function makeHttpError(message, response, details = null) {
    const error = new Error(message);
    error.name = 'ApiClientError';
    error.status = response?.status ?? 0;
    error.details = details;
    error.url = response?.url || '';
    return error;
}

async function parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!text) return null;

    if (!contentType.includes('application/json')) {
        throw makeHttpError('Server mengembalikan format respons yang tidak valid.', response, text.slice(0, 500));
    }

    try {
        return JSON.parse(text);
    } catch {
        throw makeHttpError('Server tidak mengembalikan JSON yang valid.', response, text.slice(0, 500));
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

    let response;
    try {
        response = await fetch(resolveApiUrl(path), {
            method,
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: controller.signal,
            cache: options.cache || 'no-store'
        });

        const data = await parseResponse(response);
        if (!response.ok) {
            const message = data?.error || data?.details || data?.message || `Server merespons HTTP ${response.status}.`;
            throw makeHttpError(message, response, data);
        }

        return data;
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeoutError = new Error(`Request timeout setelah ${Math.round(timeoutMs / 1000)} detik.`);
            timeoutError.name = 'TimeoutError';
            timeoutError.code = 'TIMEOUT';
            throw timeoutError;
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
