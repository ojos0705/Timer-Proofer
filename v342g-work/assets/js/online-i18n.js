/**
 * [AI-GENERATED][I18N][V332]
 * DOM translation engine powered by the authenticated MyMemory free translation proxy.
 * Text is applied through text nodes / safe attributes only; never innerHTML.
 * Original strings are retained so changing language never stacks translations.
 */
import { buildTranslationBatches, translateTexts, normalizeTranslationLanguageCode, isRetryableRequestError } from './cloud-translation-service.js';

const CACHE_PREFIX = 'tp_cloud_i18n_v1_';
const MAX_CACHE_ENTRIES = 1800;
const MAX_CACHE_CHARACTERS = 650_000;
const MAX_TEXT_NODE_CHARACTERS = 5_000;
const ATTRIBUTE_NAMES = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'IFRAME', 'CODE', 'PRE', 'SELECT', 'OPTION', 'SVG', 'CANVAS']);
const SKIP_IDS = new Set([
    'google_translate_element', 'whatsapp-language-modal',
    // Keep personal records and user-authored recipe content on-device.
    'user-modal', 'profile-name', 'profile-bakery', 'profile-phone', 'profile-email',
    'recipe-list-container', 'saved-recipe-list-container', 'recipe-ingredients-body',
    'recipe-photo-grid', 'recipe-save-name', 'recipe-yield',
    'recipe-cards-container', 'container-daftar-langkah'
]);
const SKIP_CLASSES = new Set(['notranslate', 'user-generated-content', 'ai-analysis-box', 'ai-telemetry-output', 'ai-assistant-card']);

const textRecords = new WeakMap();
const attributeRecords = new WeakMap();
const trackedTextNodes = new Set();
const trackedElements = new Set();
let activeLanguage = 'id';
let generation = 0;
let observer = null;
let flushTimer = null;
let pendingTextNodes = new Set();
let pendingAttributes = new Map();
let flushInProgress = false;
let pendingFlushRetryCount = 0;
const MAX_PENDING_FLUSH_RETRIES = 1;
let cacheLanguage = '';
let translationCache = new Map();
let initialPromise = Promise.resolve({ language: 'id', translated: 0, cached: 0, requests: 0 });

function makeError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function normalizeCacheKey(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function containsLetters(value) {
    try { return /\p{L}/u.test(value); }
    catch (_) { return /[A-Za-z\u00C0-\u024F\u0370-\u1FFF]/.test(value); }
}

function hasUnsafeAncestor(element) {
    for (let current = element; current && current.nodeType === 1; current = current.parentElement) {
        if (SKIP_TAGS.has(current.tagName)) return true;
        if (SKIP_IDS.has(current.id)) return true;
        if (current.getAttribute?.('translate') === 'no' || current.hasAttribute?.('data-no-i18n') ||
            (current.classList && [...SKIP_CLASSES].some((name) => current.classList.contains(name))) ||
            current.getAttribute?.('contenteditable') === 'true') return true;
    }
    return false;
}

function isTranslatableText(value) {
    const normalized = normalizeCacheKey(value);
    return normalized.length > 0 && normalized.length <= MAX_TEXT_NODE_CHARACTERS && containsLetters(normalized);
}

function getTextSource(node) {
    if (!node || node.nodeType !== 3 || hasUnsafeAncestor(node.parentElement)) return null;
    const current = String(node.nodeValue ?? '');
    let record = textRecords.get(node);
    if (record && current === record.applied) return record.original;
    if (!isTranslatableText(current)) return null;
    if (!record) {
        record = { original: current, applied: null };
        textRecords.set(node, record);
        trackedTextNodes.add(node);
    } else {
        record.original = current;
        record.applied = null;
    }
    return current;
}

function getAttributeSource(element, attributeName) {
    if (!element || element.nodeType !== 1 || hasUnsafeAncestor(element)) return null;
    const current = element.getAttribute?.(attributeName);
    if (typeof current !== 'string' || !isTranslatableText(current)) return null;
    let records = attributeRecords.get(element);
    if (!records) {
        records = Object.create(null);
        attributeRecords.set(element, records);
        trackedElements.add(element);
    }
    const record = records[attributeName];
    if (record && current === record.applied) return record.original;
    if (!records[attributeName]) records[attributeName] = { original: current, applied: null };
    else {
        records[attributeName].original = current;
        records[attributeName].applied = null;
    }
    return current;
}

function collectNode(node, entries) {
    if (!node) return;
    if (node.nodeType === 3) {
        const original = getTextSource(node);
        if (original) entries.push({ type: 'text', node, original });
        return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return;
    if (node.nodeType === 1 && hasUnsafeAncestor(node)) return;

    if (node.nodeType === 1) {
        for (const name of ATTRIBUTE_NAMES) {
            const original = getAttributeSource(node, name);
            if (original) entries.push({ type: 'attribute', node, name, original });
        }
    }

    const children = node.childNodes ? Array.from(node.childNodes) : [];
    children.forEach((child) => collectNode(child, entries));
}

function decodeTranslationEntities(value) {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0' };
    return String(value ?? '').replace(/&(#(?:x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/gi, (entity, token) => {
        const key = String(token).toLowerCase();
        if (key[0] !== '#') return named[key] ?? entity;
        const codePoint = key[1] === 'x' ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
        if (!Number.isInteger(codePoint) || codePoint <= 0 || codePoint > 0x10ffff ||
            (codePoint >= 0xd800 && codePoint <= 0xdfff)) return entity;
        try { return String.fromCodePoint(codePoint); } catch (_) { return entity; }
    });
}

function preserveWhitespace(original, translated) {
    const source = String(original ?? '');
    const leading = source.match(/^\s*/)?.[0] || '';
    const trailing = source.match(/\s*$/)?.[0] || '';
    return `${leading}${translated}${trailing}`;
}

function loadCache(language) {
    if (cacheLanguage === language) return translationCache;
    cacheLanguage = language;
    translationCache = new Map();
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + language);
        const parsed = JSON.parse(raw || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            Object.entries(parsed).forEach(([key, value]) => {
                if (typeof value === 'string' && key && key.length <= MAX_TEXT_NODE_CHARACTERS) {
                    translationCache.set(key, value);
                }
            });
        }
    } catch (_) {
        // Private browsing / quota failures must not block online translation.
    }
    return translationCache;
}

function saveCache(language) {
    try {
        const kept = [];
        let totalCharacters = 0;
        const entries = [...translationCache.entries()].slice(-MAX_CACHE_ENTRIES).reverse();
        for (const [key, value] of entries) {
            const size = key.length + value.length;
            if (totalCharacters + size > MAX_CACHE_CHARACTERS) continue;
            kept.push([key, value]);
            totalCharacters += size;
        }
        const bounded = Object.fromEntries(kept.reverse());
        localStorage.setItem(CACHE_PREFIX + language, JSON.stringify(bounded));
        if (translationCache.size > MAX_CACHE_ENTRIES) translationCache = new Map(kept.reverse());
    } catch (_) {
        // Translation stays valid in memory even when persistent cache is full.
    }
}

function isEntryStillCurrent(entry) {
    if (!entry.node || entry.node.isConnected === false) return false;
    if (entry.type === 'text') {
        const current = String(entry.node.nodeValue ?? '');
        return current === entry.original || current === textRecords.get(entry.node)?.applied;
    }
    const current = entry.node.getAttribute?.(entry.name);
    const record = attributeRecords.get(entry.node)?.[entry.name];
    return current === entry.original || current === record?.applied;
}

function applyTranslation(entry, translated) {
    if (!isEntryStillCurrent(entry)) return false;
    if (entry.type === 'text') {
        const record = textRecords.get(entry.node);
        if (!record) return false;
        const value = preserveWhitespace(entry.original, decodeTranslationEntities(translated));
        record.original = entry.original;
        record.applied = value;
        if (entry.node.nodeValue !== value) entry.node.nodeValue = value;
        return true;
    }
    const records = attributeRecords.get(entry.node);
    const record = records?.[entry.name];
    if (!record) return false;
    const value = preserveWhitespace(entry.original, decodeTranslationEntities(translated));
    record.original = entry.original;
    record.applied = value;
    if (entry.node.getAttribute(entry.name) !== value) entry.node.setAttribute(entry.name, value);
    return true;
}

async function translateEntries(entries, language, token, onProgress = null) {
    const cache = loadCache(language);
    const uniqueMissing = new Map();
    const entryKeys = new Map();

    for (const entry of entries) {
        const key = normalizeCacheKey(entry.original);
        if (!key) continue;
        entryKeys.set(entry, key);
        if (!cache.has(key) && !uniqueMissing.has(key)) uniqueMissing.set(key, key);
    }

    const batches = buildTranslationBatches([...uniqueMissing.values()], { maxItems: 24, maxCharacters: 5_400 });
    let requests = 0;
    let completed = 0;
    for (const batch of batches) {
        if (token !== generation) throw makeError('Pemilihan bahasa digantikan oleh pilihan yang lebih baru.', 'TRANSLATION_SUPERSEDED');
        const results = await translateTexts(batch, language);
        requests += 1;
        batch.forEach((source, index) => cache.set(source, results[index]));
        saveCache(language);
        completed += batch.length;
        if (typeof onProgress === 'function') {
            try { onProgress({ completed, total: uniqueMissing.size, requests }); } catch (_) {}
        }
    }

    if (token !== generation) throw makeError('Pemilihan bahasa digantikan oleh pilihan yang lebih baru.', 'TRANSLATION_SUPERSEDED');
    let translated = 0;
    let cached = 0;
    let applied = 0;
    const countedNewKeys = new Set();
    const countedCachedKeys = new Set();
    for (const entry of entries) {
        const key = entryKeys.get(entry);
        if (!key) continue;
        const value = cache.get(key);
        if (typeof value !== 'string') continue;
        if (uniqueMissing.has(key)) {
            if (!countedNewKeys.has(key)) { translated += 1; countedNewKeys.add(key); }
        } else if (!countedCachedKeys.has(key)) {
            cached += 1;
            countedCachedKeys.add(key);
        }
        if (applyTranslation(entry, value)) applied += 1;
    }
    return { translated, cached, applied, requests };
}

function restoreTrackedNodes() {
    for (const node of [...trackedTextNodes]) {
        if (!node || node.isConnected === false) {
            trackedTextNodes.delete(node);
            continue;
        }
        const record = textRecords.get(node);
        if (!record) continue;
        if (node.nodeValue === record.applied && record.applied !== null) node.nodeValue = record.original;
        else if (node.nodeValue !== record.applied) record.original = String(node.nodeValue ?? '');
        record.applied = null;
    }

    for (const element of [...trackedElements]) {
        if (!element || element.isConnected === false) {
            trackedElements.delete(element);
            continue;
        }
        const records = attributeRecords.get(element);
        if (!records) continue;
        for (const [name, record] of Object.entries(records)) {
            const current = element.getAttribute?.(name);
            if (current === record.applied && record.applied !== null) element.setAttribute(name, record.original);
            else if (typeof current === 'string' && current !== record.applied) record.original = current;
            record.applied = null;
        }
    }
}

function stopObserver() {
    try { observer?.disconnect?.(); } catch (_) {}
    observer = null;
    if (flushTimer !== null) clearTimeout(flushTimer);
    flushTimer = null;
    pendingTextNodes.clear();
    pendingAttributes.clear();
    pendingFlushRetryCount = 0;
}

function queueAttribute(element, name) {
    if (!ATTRIBUTE_NAMES.includes(name)) return;
    if (!getAttributeSource(element, name)) return;
    let names = pendingAttributes.get(element);
    if (!names) {
        names = new Set();
        pendingAttributes.set(element, names);
    }
    names.add(name);
}

function schedulePendingFlush(delay = 120) {
    if (flushTimer !== null || !pendingTextNodes.size && !pendingAttributes.size) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushPendingEntries();
    }, delay);
}

async function flushPendingEntries() {
    if (flushInProgress || activeLanguage === 'id' || !navigator.onLine) return;
    const nodes = [...pendingTextNodes];
    const attributes = [...pendingAttributes.entries()];
    pendingTextNodes.clear();
    pendingAttributes.clear();
    const entries = [];
    nodes.forEach((node) => {
        const original = getTextSource(node);
        if (original) entries.push({ type: 'text', node, original });
    });
    attributes.forEach(([element, names]) => names.forEach((name) => {
        const original = getAttributeSource(element, name);
        if (original) entries.push({ type: 'attribute', node: element, name, original });
    }));
    if (!entries.length) return;

    const token = generation;
    flushInProgress = true;
    let succeeded = false;
    let retryTransientFailure = false;
    try {
        await translateEntries(entries, activeLanguage, token);
        succeeded = true;
    } catch (error) {
        // Keep changed nodes instead of dropping dynamic UI that arrived during
        // a request. Retry one time only for network/timeout/5xx failures; never
        // loop on authentication, provider configuration, quota, or rate limits.
        nodes.forEach((node) => pendingTextNodes.add(node));
        attributes.forEach(([element, names]) => {
            let target = pendingAttributes.get(element);
            if (!target) { target = new Set(); pendingAttributes.set(element, target); }
            names.forEach((name) => target.add(name));
        });
        retryTransientFailure = isRetryableRequestError(error) &&
            pendingFlushRetryCount < MAX_PENDING_FLUSH_RETRIES;
        if (retryTransientFailure) pendingFlushRetryCount += 1;
        else pendingFlushRetryCount = 0;
        console.warn('[OnlineI18n] Terjemahan konten dinamis tertunda:', error?.code || error?.message || error);
    } finally {
        flushInProgress = false;
        if (succeeded) pendingFlushRetryCount = 0;
        if ((pendingTextNodes.size || pendingAttributes.size) && navigator.onLine && activeLanguage !== 'id') {
            // Includes nodes queued while another batch was in flight. The
            // delayed retry is bounded and permanent errors remain user-driven.
            if (succeeded) schedulePendingFlush(180);
            else if (retryTransientFailure) schedulePendingFlush(1_500);
        }
    }
}

function startObserver(token) {
    if (typeof MutationObserver !== 'function' || !document.body) return;
    stopObserver();
    observer = new MutationObserver((mutations) => {
        if (token !== generation || activeLanguage === 'id') return;
        for (const mutation of mutations) {
            if (mutation.type === 'characterData') {
                const record = mutation.target?.nodeType === 3 ? textRecords.get(mutation.target) : null;
                // Ignore our own last applied translation; otherwise MutationObserver
                // would enqueue a redundant provider request for the same text.
                if (record && mutation.target.nodeValue === record.applied) continue;
                if (mutation.target?.nodeType === 3 && getTextSource(mutation.target)) {
                    pendingTextNodes.add(mutation.target);
                }
            } else if (mutation.type === 'attributes') {
                const attributeRecord = attributeRecords.get(mutation.target)?.[mutation.attributeName];
                if (attributeRecord && mutation.target.getAttribute(mutation.attributeName) === attributeRecord.applied) continue;
                queueAttribute(mutation.target, mutation.attributeName);
            } else if (mutation.type === 'childList') {
                mutation.addedNodes?.forEach((node) => {
                    const entries = [];
                    collectNode(node, entries);
                    for (const entry of entries) {
                        if (entry.type === 'text') pendingTextNodes.add(entry.node);
                        else queueAttribute(entry.node, entry.name);
                    }
                });
            }
        }
        schedulePendingFlush();
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ATTRIBUTE_NAMES
    });
}

async function reset() {
    generation += 1;
    stopObserver();
    activeLanguage = 'id';
    restoreTrackedNodes();
    initialPromise = Promise.resolve({ language: 'id', translated: 0, cached: 0, requests: 0 });
    return initialPromise;
}

async function apply(language, { onProgress = null } = {}) {
    const target = normalizeTranslationLanguageCode(language);
    if (target.toLowerCase().split('-')[0] === 'id') return reset();
    const token = ++generation;
    stopObserver();
    restoreTrackedNodes();
    if (navigator.onLine === false) {
        activeLanguage = 'id';
        throw makeError('Perangkat sedang offline. Sambungkan internet untuk menerjemahkan bahasa ini.', 'OFFLINE');
    }
    if (!document?.body) {
        activeLanguage = 'id';
        throw makeError('Halaman aplikasi belum siap untuk diterjemahkan.', 'TRANSLATION_DOM_NOT_READY');
    }

    activeLanguage = target;
    const entries = [];
    collectNode(document.body, entries);
    try {
        const stats = await translateEntries(entries, target, token, onProgress);
        if (token !== generation) throw makeError('Pemilihan bahasa digantikan oleh pilihan yang lebih baru.', 'TRANSLATION_SUPERSEDED');
        startObserver(token);
        const result = { language: target, ...stats, total: entries.length };
        initialPromise = Promise.resolve(result);
        return result;
    } catch (error) {
        if (token === generation) {
            stopObserver();
            restoreTrackedNodes();
            activeLanguage = 'id';
        }
        throw error;
    }
}

window.addEventListener('online', () => {
    if (activeLanguage !== 'id' && (pendingTextNodes.size || pendingAttributes.size)) schedulePendingFlush(250);
});

export const OnlineI18n = Object.freeze({
    apply,
    reset,
    current: () => activeLanguage,
    whenReady: () => initialPromise,
    isOnlineTranslation: (code) => activeLanguage === String(code ?? '')
});

window.OnlineI18n = OnlineI18n; // Compatibility bridge for diagnostics only.
