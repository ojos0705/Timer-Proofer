import { daftarBahasa } from './lang-data.js';
import { OFFLINE_LANG_PACKS, OFFLINE_LANG_ALIASES } from './lang-packs.js';
import { pilihBahasaGlobal } from './language-engine.js'; // [AI-GENERATED][ES6 MODULE][V262]

function renderLanguageList() {
    const container = document.getElementById('list-pilihan-bahasa');
    if (!container) return;

    daftarBahasa.forEach(lang => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lang-item';
        btn.style.cssText = 'display: flex; align-items: center; gap: 10px; width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; cursor: pointer; text-align: left;';

        const iconWrap = document.createElement('span');
        iconWrap.style.cssText = 'display: inline-flex; width: 24px; justify-content: center; flex-shrink: 0;';
        const pakaiEmoji = () => {
            iconWrap.textContent = lang.icon || '🌐';
            iconWrap.style.fontSize = '1.2rem';
        };
        if (lang.icon || !lang.flag) {
            pakaiEmoji();
        } else {
            const img = document.createElement('img');
            img.src = 'https://flagcdn.com/w40/' + lang.flag + '.png';
            img.alt = lang.flag.toUpperCase();
            img.loading = 'lazy';
            img.style.cssText = 'width: 24px; height: 18px; border-radius: 3px; object-fit: cover;';
            img.addEventListener('error', pakaiEmoji, { once: true });
            iconWrap.appendChild(img);
        }

        const label = document.createElement('span');
        label.style.cssText = 'font-size: 0.85rem; font-weight: 600; color: #3e2723;';
        label.textContent = lang.name;
        btn.appendChild(iconWrap);
        btn.appendChild(label);

        const packs = OFFLINE_LANG_PACKS;
        const aliases = OFFLINE_LANG_ALIASES || {};
        const tersediaOffline = lang.code === 'id' || (Array.isArray(packs) &&
            (packs.indexOf(lang.code) > -1 || packs.indexOf(aliases[lang.code]) > -1));
        if (tersediaOffline) {
            const badge = document.createElement('span');
            badge.textContent = '✓ Offline';
            badge.style.cssText = 'margin-left:auto; font-size:0.65rem; font-weight:700; color:#2e7d32; background:#e8f5e9; padding:2px 6px; border-radius:6px; flex-shrink:0;';
            btn.appendChild(badge);
        }

        btn.setAttribute('data-name', (lang.name + ' ' + lang.code).toLowerCase());

        btn.addEventListener('click', () => {
            void pilihBahasaGlobal(lang.code, lang.name);
        });

        container.appendChild(btn);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderLanguageList);
} else {
    renderLanguageList();
}
