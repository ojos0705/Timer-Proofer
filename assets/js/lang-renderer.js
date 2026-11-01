/**
 * [AI-GENERATED][I18N][V332]
 * Renders language candidates locally. MyMemory has no public pair catalog, so
 * the provider validates an Indonesian-to-target pair when the user selects it.
 */
import { daftarBahasa } from './lang-data.js';
import { OFFLINE_LANG_PACKS, OFFLINE_LANG_ALIASES } from './lang-packs.js';
import { pilihBahasaGlobal } from './language-engine.js';
import {
    getSupportedTranslationLanguages,
    resolveSupportedTranslationLanguageCode
} from './cloud-translation-service.js';

const languageButtons = new Map();
let languageStatus = null;
let availabilityCheckPromise = null;

function setBadge(button, text, color = '#64748b', background = '#f1f5f9') {
    let badge = button.querySelector('.lang-item-status');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'lang-item-status';
        badge.style.cssText = 'margin-left:auto; font-size:0.62rem; font-weight:700; padding:2px 6px; border-radius:6px; flex-shrink:0;';
        button.appendChild(badge);
    }
    badge.textContent = text;
    badge.style.color = color;
    badge.style.background = background;
}

function isOfflineLanguage(language) {
    const aliases = OFFLINE_LANG_ALIASES || {};
    return language.code === 'id' || (Array.isArray(OFFLINE_LANG_PACKS) &&
        (OFFLINE_LANG_PACKS.includes(language.code) || OFFLINE_LANG_PACKS.includes(aliases[language.code])));
}

function setLanguageStatus(message, kind = 'info') {
    if (!languageStatus) return;
    languageStatus.textContent = message;
    languageStatus.style.color = kind === 'error' ? '#b45309' : '#64748b';
    languageStatus.hidden = !message;
}

function applySupportedLanguageCatalog(languages) {
    for (const [code, button] of languageButtons) {
        const language = daftarBahasa.find((item) => item.code === code);
        if (!language || isOfflineLanguage(language)) continue;
        const candidate = resolveSupportedTranslationLanguageCode(code, languages);
        // MyMemory exposes no authoritative supported-pair catalog. Keep each
        // listed option usable and be explicit that support is checked on tap.
        button.disabled = false;
        button.removeAttribute('aria-disabled');
        if (candidate) button.dataset.translationTarget = candidate;
        button.title = 'Kandidat online: dukungan pasangan bahasa diperiksa saat dipilih';
        setBadge(button, 'Coba online', '#075985', '#e0f2fe');
    }
}

async function refreshOnlineLanguageAvailability({ forceRefresh = false } = {}) {
    if (availabilityCheckPromise) return availabilityCheckPromise;
    availabilityCheckPromise = (async () => {
        try {
            setLanguageStatus('Memeriksa bahasa online…');
            const catalog = await getSupportedTranslationLanguages({ forceRefresh });
            applySupportedLanguageCatalog(catalog.languages);
            setLanguageStatus('Kandidat online diperiksa saat dipilih; tidak semua pasangan bahasa dijamin tersedia. Bahasa bertanda Offline tersedia tanpa internet.');
            return true;
        } catch (error) {
            const code = error?.details?.code || error?.code;
            if (code === 'TRANSLATION_AUTH_REQUIRED' || code === 'TRANSLATION_AUTH_INVALID') {
                for (const [languageCode, button] of languageButtons) {
                    const language = daftarBahasa.find((item) => item.code === languageCode);
                    if (language && !isOfflineLanguage(language)) {
                        button.disabled = true;
                        button.setAttribute('aria-disabled', 'true');
                        setBadge(button, 'Login ulang', '#9a3412', '#ffedd5');
                    }
                }
                setLanguageStatus('Sesi login perlu diperbarui. Bahasa offline tetap dapat digunakan.', 'error');
            } else {
                // Temporary network failures do not permanently disable options.
                for (const [code, button] of languageButtons) {
                    const language = daftarBahasa.find((item) => item.code === code);
                    if (language && !isOfflineLanguage(language)) {
                        button.disabled = false;
                        button.removeAttribute('aria-disabled');
                        setBadge(button, 'Online*', '#64748b', '#f1f5f9');
                    }
                }
                setLanguageStatus('Daftar kandidat bahasa lokal digunakan. Ketersediaan tiap pasangan diuji saat dipilih.', 'error');
            }
            console.warn('[LanguageList] Katalog bahasa online belum tersedia:', code || error?.message || error);
            return false;
        } finally {
            availabilityCheckPromise = null;
        }
    })();
    return availabilityCheckPromise;
}

function renderLanguageList() {
    const container = document.getElementById('list-pilihan-bahasa');
    if (!container || container.dataset.tpLanguageListRendered === 'v335') return;
    container.dataset.tpLanguageListRendered = 'v335';

    languageStatus = document.createElement('p');
    languageStatus.className = 'language-online-status';
    languageStatus.setAttribute('role', 'status');
    languageStatus.setAttribute('aria-live', 'polite');
    languageStatus.style.cssText = 'font-size:0.72rem; line-height:1.4; margin:0 0 4px;';
    container.prepend(languageStatus);

    daftarBahasa.forEach((language) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'lang-item';
        button.dataset.languageCode = language.code;
        button.style.cssText = 'display: flex; align-items: center; gap: 10px; width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; cursor: pointer; text-align: left;';

        const iconWrap = document.createElement('span');
        iconWrap.style.cssText = 'display: inline-flex; width: 24px; justify-content: center; flex-shrink: 0;';
        const useEmoji = () => {
            iconWrap.textContent = language.icon || '🌐';
            iconWrap.style.fontSize = '1.2rem';
        };
        if (language.icon || !language.flag) {
            useEmoji();
        } else {
            const image = document.createElement('img');
            image.src = 'https://flagcdn.com/w40/' + language.flag + '.png';
            image.alt = language.flag.toUpperCase();
            image.loading = 'lazy';
            image.style.cssText = 'width: 24px; height: 18px; border-radius: 3px; object-fit: cover;';
            image.addEventListener('error', useEmoji, { once: true });
            iconWrap.appendChild(image);
        }

        const label = document.createElement('span');
        label.style.cssText = 'font-size: 0.85rem; font-weight: 600; color: #3e2723;';
        label.textContent = language.name;
        button.appendChild(iconWrap);
        button.appendChild(label);

        if (isOfflineLanguage(language)) {
            setBadge(button, '✓ Offline', '#2e7d32', '#e8f5e9');
        } else {
            setBadge(button, 'Coba online', '#075985', '#e0f2fe');
        }

        button.setAttribute('data-name', (language.name + ' ' + language.code).toLowerCase());
        button.addEventListener('click', () => {
            if (button.disabled) return;
            void pilihBahasaGlobal(language.code, language.name);
        });

        languageButtons.set(language.code, button);
        container.appendChild(button);
    });

    void refreshOnlineLanguageAvailability();
}

window.addEventListener('online', () => {
    void refreshOnlineLanguageAvailability({ forceRefresh: true });
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderLanguageList, { once: true });
} else {
    renderLanguageList();
}

export { renderLanguageList, refreshOnlineLanguageAvailability };
