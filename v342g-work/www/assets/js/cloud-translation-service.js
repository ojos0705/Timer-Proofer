/**
 * [AI-GENERATED][I18N][V334]
 * Authenticated client adapter for the free MyMemory translation proxy.
 * The language picker uses the app's local candidates; MyMemory has no public
 * supported-language catalog. A pair is validated by the provider on selection.
 * No provider key, Google Cloud Billing, or extra catalog network request is used.
 */
import { postJson } from './api-client-service.js';
import { AuthService } from './auth-service.js';
import { daftarBahasa } from './lang-data.js';
import { buildTranslationBatches, normalizeTranslationLanguageCode, resolveSupportedTranslationLanguageCode } from './translation-utils.js';
export { buildTranslationBatches, normalizeTranslationLanguageCode, resolveSupportedTranslationLanguageCode } from './translation-utils.js';

const TRANSLATION_ENDPOINT = '/api/translate';
const MAX_BATCH_ITEMS = 24;
const MAX_BATCH_CHARACTERS = 5_400;
const candidateLanguages = Object.freeze([...new Set(daftarBahasa
    .map((item) => String(item?.code || '').trim().replace(/_/g, '-'))
    .filter((code) => /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code) && code.toLowerCase().split('-')[0] !== 'id'))]);

export function isRetryableRequestError(error) {
    const code = error?.details?.code || error?.code || '';
    const status = Number(error?.status || 0);
    if ([
        'TRANSLATION_NOT_CONFIGURED', 'TRANSLATION_PROVIDER_NOT_READY', 'API_NATIVE_HTTP_UNAVAILABLE',
        'TRANSLATION_AUTH_REQUIRED', 'TRANSLATION_AUTH_INVALID',
        'TRANSLATION_QUOTA_EXCEEDED', 'TRANSLATION_RATE_LIMITED',
        'TRANSLATION_UNSUPPORTED_LANGUAGE', 'TRANSLATION_INVALID_LANGUAGE'
    ].includes(code)) return false;
    return status === 0 || status === 502 || status === 503 || status === 504 ||
        code === 'TIMEOUT' || code === 'TRANSLATION_TIMEOUT' ||
        code === 'TRANSLATION_NETWORK_ERROR' || code === 'TRANSLATION_CATALOG_UNAVAILABLE';
}

async function requestWithRetry(operation, { retries = 2 } = {}) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try { return await operation(); }
        catch (error) {
            lastError = error;
            if (attempt >= retries || !isRetryableRequestError(error) || navigator.onLine === false) throw error;
            await new Promise((resolve) => setTimeout(resolve, 450 * (attempt + 1)));
        }
    }
    throw lastError;
}

async function getAuthenticatedHeaders() {
    const session = await AuthService.getSession();
    if (!session?.access_token) {
        const error = new Error('Silakan login kembali untuk menggunakan terjemahan online.');
        error.code = 'TRANSLATION_AUTH_REQUIRED';
        throw error;
    }
    return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Return local candidate codes only. Provider support is not inferred here;
 * the MyMemory API validates the Indonesia -> target pair on actual translation.
 */
export async function getSupportedTranslationLanguages() {
    return {
        languages: candidateLanguages,
        cached: true,
        stale: false,
        provider: 'MyMemory',
        catalogType: 'candidate'
    };
}

export async function translateTexts(texts, targetLanguage, options = {}) {
    const target = normalizeTranslationLanguageCode(targetLanguage);
    const values = Array.isArray(texts) ? texts.map((value) => String(value ?? '')) : [];
    if (!values.length || values.length > MAX_BATCH_ITEMS || values.some((value) => !value.trim()) ||
        values.reduce((sum, value) => sum + [...value].length, 0) > MAX_BATCH_CHARACTERS) {
        const error = new Error('Jumlah teks untuk satu permintaan tidak valid.');
        error.code = 'TRANSLATION_INVALID_BATCH';
        throw error;
    }

    const headers = options.headers || await getAuthenticatedHeaders();
    const response = await requestWithRetry(() => (options.request || postJson)(
        TRANSLATION_ENDPOINT,
        { texts: values, targetLanguage: target },
        { timeoutMs: options.timeoutMs || 25_000, headers, preferNativeHttp: true }
    ), { retries: options.retries ?? 2 });

    if (!Array.isArray(response?.translations) || response.translations.length !== values.length ||
        response.translations.some((text) => typeof text !== 'string')) {
        const error = new Error('Server terjemahan mengembalikan hasil yang tidak lengkap.');
        error.code = 'TRANSLATION_INVALID_RESPONSE';
        throw error;
    }
    return response.translations;
}

export const CloudTranslationService = Object.freeze({
    translateTexts,
    buildTranslationBatches,
    normalizeTranslationLanguageCode,
    getSupportedTranslationLanguages,
    getAuthenticatedHeaders,
    candidateLanguages,
    isRetryableRequestError,
    requestWithRetry,
    resolveSupportedTranslationLanguageCode
});
