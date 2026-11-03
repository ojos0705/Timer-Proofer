/**
 * [AI-GENERATED][I18N][V332]
 * Pure helpers shared by the MyMemory online translation client and regression tests.
 */
export function normalizeTranslationLanguageCode(value) {
    const code = String(value ?? '').trim().replace(/_/g, '-');
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code)) {
        const error = new Error('Kode bahasa tidak valid.');
        error.code = 'TRANSLATION_INVALID_LANGUAGE';
        throw error;
    }
    return code;
}

export function buildTranslationBatches(values, {
    maxItems = 24,
    maxCharacters = 5_400
} = {}) {
    const safeMaxItems = Math.max(1, Math.min(24, Math.floor(Number(maxItems) || 24)));
    const safeMaxCharacters = Math.max(1, Math.min(5_400, Math.floor(Number(maxCharacters) || 5_400)));
    const items = Array.isArray(values) ? values.map((value) => String(value ?? '')) : [];
    const batches = [];
    let current = [];
    let characters = 0;

    for (const item of items) {
        const length = [...item].length;
        if (!item.trim()) continue;
        if (length > safeMaxCharacters || length > 5_000) {
            const error = new Error('Satu bagian teks melebihi batas aman penerjemahan.');
            error.code = 'TRANSLATION_TEXT_TOO_LONG';
            throw error;
        }
        if (current.length && (current.length >= safeMaxItems || characters + length > safeMaxCharacters)) {
            batches.push(current);
            current = [];
            characters = 0;
        }
        current.push(item);
        characters += length;
    }

    if (current.length) batches.push(current);
    return batches;
}

const LANGUAGE_ALIASES = Object.freeze({ iw: 'he', tl: 'fil', in: 'id', ji: 'yi' });

export function resolveSupportedTranslationLanguageCode(language, supportedLanguages) {
    const requested = normalizeTranslationLanguageCode(language);
    const supported = new Map((Array.isArray(supportedLanguages) ? supportedLanguages : [])
        .map((value) => normalizeTranslationLanguageCode(value))
        .map((value) => [value.toLowerCase(), value]));
    const alias = LANGUAGE_ALIASES[requested.toLowerCase()];
    if (alias && supported.has(alias.toLowerCase())) return supported.get(alias.toLowerCase());
    if (supported.has(requested.toLowerCase())) return supported.get(requested.toLowerCase());
    const base = requested.split('-')[0].toLowerCase();
    if (supported.has(base)) return supported.get(base);
    return null;
}
