import { RecipePhotoService } from '../recipe-photo-service.js';
import { NotifSystem } from '../notification-service.js'; // [AI-GENERATED][ES6 MODULE][V272]
import { getOwnCallable } from './action-registry.js';
// [AI-GENERATED][REFACTOR] Import the canonical modal controller so modal actions are independent of app-core.
/**
 * [AI-GENERATED][REFACTOR] Centralized click delegation for module actions.
 * Keeps existing UI behavior through one delegated action listener.
 */

const SPECIAL_ACTIONS = {
    // [AI-GENERATED][REFACTOR] Handles actions that previously contained inline statements.
    removeElementById(arg) {
        if (!arg) return;
        document.getElementById(String(arg))?.remove();
    },

    // [AI-GENERATED][REFACTOR] Preserves the old direction argument without inline JavaScript.
    pindahLangkah(index, _event, element) {
        const direction = Number(element?.dataset?.direction);
        if (!Number.isFinite(Number(index)) || !Number.isFinite(direction)) return;
        window.pindahLangkah?.(Number(index), direction);
    },

    // [AI-GENERATED][REFACTOR] Opens the dynamically generated step file input.
    openStepFileInput(index) {
        document.getElementById(`step-file-input-${Number(index)}`)?.click();
    },

    // [AI-GENERATED][REFACTOR] Preview the image represented by the clicked element.
    previewRecipePhoto(arg, event, element) {
        const imageUrl = typeof arg === 'string' && arg
            ? arg
            : element?.querySelector?.('img')?.currentSrc || element?.querySelector?.('img')?.src;
        if (!imageUrl) return;
        window.previewRecipePhoto?.(event, imageUrl);
    },

    // [AI-GENERATED][REFACTOR] Preview handler for an actual image element.
    previewRecipePhotoSrc(_arg, event, element) {
        const imageUrl = element?.currentSrc || element?.src;
        if (!imageUrl) return;
        window.previewRecipePhoto?.(event, imageUrl);
    },

    toggleAiResult(_arg, _event, element) {
        const body = document.getElementById('ai-body-content');
        const icon = document.getElementById('ai-toggle-icon');
        if (!body || !icon) return;
        const collapsed = body.style.display === 'none';
        body.style.display = collapsed ? 'block' : 'none';
        icon.textContent = collapsed ? '▲' : '▼';
    },

    hideAiTipsResult() {
        document.getElementById('ai-tips-result')?.style.setProperty('display', 'none');
    },

    notifBaca(arg) {
        const id = decodeURIComponent(String(arg ?? ''));
        NotifSystem?.baca?.(id);
    },

    notifHapus(arg) {
        const id = decodeURIComponent(String(arg ?? ''));
        NotifSystem?.hapus?.(id);
    },

    // [AI-GENERATED][REFACTOR] Backward-compatible alias for the existing recipe empty state action.
    bukaFormBahanUtama() {
        SPECIAL_ACTIONS.openAddIngredientForm();
    },
    
    // [AI-GENERATED][REFACTOR][V40] Recipe photo upload/preview is owned by the canonical service.
    triggerUploadFoto(_arg, event, element) {
        return RecipePhotoService.triggerUpload(null, event, element);
    },

    hapusFotoSlot(_arg, _event, element) {
        const slot = element?.closest?.('.photo-slot') || element;
        const index = Number(slot?.dataset?.index);
        if (!Number.isInteger(index)) return;
        RecipePhotoService.removePhoto(index);
    },

    previewFoto(_arg, event, elementOrUrl) {
        const imageUrl = typeof elementOrUrl === 'string'
            ? elementOrUrl
            : elementOrUrl?.dataset?.url || elementOrUrl?.currentSrc || elementOrUrl?.src;
        if (!imageUrl) return;
        window.previewRecipePhoto?.(event, imageUrl);
    },

    // [AI-GENERATED][REFACTOR] Preserve the existing photo-input fallback behavior.
    triggerRecipePhoto() {
        if (typeof window.triggerPhotoInput === 'function') {
            window.triggerPhotoInput();
            return;
        }
        document.getElementById('recipe-photo-input')?.click();
    },

    // [AI-GENERATED][REFACTOR] Preserve the existing ingredient-form behavior.
    openAddIngredientForm() {
        const form = document.getElementById('form-tambah-bahan');
        const input = document.getElementById('new-ing-name');
        if (form) form.open = true;
        input?.focus();
    },

    // [AI-GENERATED][REFACTOR] Replace inline window.open() with a controlled action.
    openExternalApp(_arg, _event, element) {
        const url = element.dataset.url;
        if (!url) return;
        try {
            const parsed = new URL(url, window.location.href);
            const allowed = ['https:', 'samsungapps:', 'appmarket:'];
            if (!allowed.includes(parsed.protocol)) {
                console.warn('[event-delegation] URL scheme ditolak:', parsed.protocol);
                return;
            }
            window.open(parsed.href, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.warn('[event-delegation] URL tidak valid:', error);
        }
    }
};

// [AI-GENERATED][REFACTOR] Decode the compact data-arg representation used by migrated HTML.
function decodeArgument(value) {
    if (value == null) return undefined;
    try { return JSON.parse(value); } catch { return value; }
}

// [AI-GENERATED][REFACTOR] Resolve only explicitly exported application actions.
function resolveAction(name) {
    // [AI-GENERATED][SECURITY][V220] Ignore inherited names on the registry and window.
    return getOwnCallable(SPECIAL_ACTIONS, name) || getOwnCallable(window, name);
}

// [AI-GENERATED][REFACTOR][V40] File-change ownership moved to RecipePhotoService.
// The service binds #foto-akhir exactly once and preserves the existing DOM contract.

// [AI-GENERATED][REFACTOR] One delegated listener handles all migrated data-action controls.
document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
        ? event.target.closest('[data-action]')
        : null;

    if (!target) return;

    const actionName = target.dataset.action?.trim();
    if (!actionName) return;

    // [AI-GENERATED][BUG FIX][V301] modal-bootstrap.js is the canonical owner
    // of toggleModal and registers its capture listener after this module is
    // evaluated. Do not invoke the same toggle here as well: two capture-phase
    // handlers would open and immediately close the same modal on one click.
    // Keep the delegated fallback only when the independent bootstrap is absent.
    if (actionName === 'toggleModal' && window.__TP_MODAL_BOOTSTRAP__ === true) return;

    const action = resolveAction(actionName);
    if (typeof action !== 'function') {
        console.warn(`[event-delegation] Action tidak ditemukan: ${actionName}`);
        return;
    }

    event.preventDefault();
    if (target.dataset.stopPropagation === 'true') event.stopPropagation();

    const argument = decodeArgument(target.dataset.arg);

    try {
        // `call(target, ...)` mempertahankan konteks elemen untuk handler existing.
        const result = target.dataset.passElement === 'true'
            ? action.call(target, argument, target)
            : action.call(target, argument, event, target);

        if (result && typeof result.catch === 'function') {
            result.catch((error) => {
                console.error(`[event-delegation] Action gagal: ${actionName}`, error);
            });
        }
    } catch (error) {
        console.error(`[event-delegation] Action gagal: ${actionName}`, error);
    }
}, true);


// [AI-GENERATED][REFACTOR][V23] Centralize migrated data-on* event handling here.
// This keeps all delegated DOM event parsing in one owner and removes the
// compatibility parser from app-core.js without changing existing HTML.
    // [AI-GENERATED][SECURITY] Legacy non-click data-* handlers are resolved
    // through explicit patterns only; executable JavaScript strings are never evaluated.
    function parseLiteral(value) {
        const text = String(value || '').trim();
        if (/^['"`][\s\S]*['"`]$/.test(text)) {
            return text.slice(1, -1).replace(/\\(['"`\\])/g, '$1');
        }
        if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
        if (text === 'true' || text === 'false') return text === 'true';
        if (text === 'null') return null;
        return undefined;
    }

    function parseSimpleCall(code, el, event) {
        const match = String(code || '').trim().match(/^\s*(?:window\.)?([A-Za-z_$][\w$]*)\s*\((.*)\)\s*;?\s*$/);
        if (!match) return null;

        // [AI-GENERATED][SECURITY][V220] Only explicitly registered window functions are callable.
        const fn = getOwnCallable(window, match[1]);
        if (!fn) return null;

        const args = [];
        const argsText = match[2].trim();
        if (argsText) {
            const parts = argsText.match(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^,]+)/g) || [];
            for (const part of parts) {
                const value = part.trim();
                if (value === 'this') { args.push(el); continue; }
                if (value === 'this.value') { args.push(el?.value); continue; }
                if (value === 'event') { args.push(event); continue; }
                const literal = parseLiteral(value);
                if (literal !== undefined || value === 'null') { args.push(literal); continue; }
                return null;
            }
        }
        return () => fn.apply(el, args);
    }

    function executeSafeHandler(code, event, el) {
        const source = String(code || '').trim();
        if (!source) return undefined;

        // [AI-GENERATED][SECURITY] Explicitly support dynamic recipe inputs.
        const ingredientInput = source.match(/^perbaruiKomponenBahan\((['"`])(.+?)\1,\s*(['"`])(.+?)\3,\s*this\.value\)\s*;?$/);
        if (ingredientInput) {
            return window.perbaruiKomponenBahan?.(ingredientInput[2], ingredientInput[4], el?.value);
        }

        // [AI-GENERATED][SECURITY] Support optional-guard legacy handlers without executing arbitrary code.
        const guardedCall = source.match(/^if\s*\(\s*typeof\s+(?:window\.)?([A-Za-z_$][\w$]*)\s*===\s*['"]function['"]\s*\)\s*(?:window\.)?([A-Za-z_$][\w$]*)\((.*)\)\s*;?$/);
        if (guardedCall && guardedCall[1] === guardedCall[2]) {
            const fn = getOwnCallable(window, guardedCall[1]);
            if (!fn) return;
            return parseSimpleCall(`${guardedCall[2]}(${guardedCall[3]})`, el, event)?.();
        }

        if (source === 'event.preventDefault(); saveProfile();' || source === 'event.preventDefault();saveProfile();') {
            event?.preventDefault?.();
            return window.saveProfile?.();
        }

        if (source === 'window.prosesImporResep(event)') {
            return window.prosesImporResep?.(event);
        }

        // [AI-GENERATED][SECURITY] Safe inline-style compatibility for migrated UI hover/focus/press handlers.
        const styleAssignments = [...source.matchAll(/this\.style\.([A-Za-z_$][\w$]*)\s*=\s*(['"])((?:\\.|(?!\2)[\s\S])*)\2/g)];
        if (styleAssignments.length) {
            for (const [, property, , rawValue] of styleAssignments) {
                if (!['background', 'color', 'transform', 'borderColor', 'boxShadow'].includes(property)) continue;
                if (el?.style) el.style[property] = rawValue.replace(/\\(['"\\])/g, '$1');
            }
            if (styleAssignments.length === [...source.matchAll(/this\.style\.([A-Za-z_$][\w$]*)\s*=\s*(['"])((?:\\.|(?!\2)[\s\S])*)\2/g)].length) return;
        }

        // [AI-GENERATED][SECURITY] Image fallback only permits assigning the source property.
        const srcFallback = source.match(/^this\.src\s*=\s*(['"])([\s\S]*)\1\s*;?$/);
        if (srcFallback && el) {
            el.src = srcFallback[2].replace(/\\(['"\\])/g, '$1');
            return;
        }

        const simple = parseSimpleCall(source, el, event);
        return simple ? simple() : undefined;
    }

    document.addEventListener('input', event => {
        const el = event.target?.closest?.('[data-oninput]');
        if (el) executeSafeHandler(el.getAttribute('data-oninput'), event, el);
    });

    document.addEventListener('change', event => {
        const el = event.target?.closest?.('[data-onchange]');
        if (el) executeSafeHandler(el.getAttribute('data-onchange'), event, el);
    });

    document.addEventListener('mouseover', event => {
        const el = event.target?.closest?.('[data-onmouseover]');
        if (el) executeSafeHandler(el.getAttribute('data-onmouseover'), event, el);
    }, true);

    document.addEventListener('mouseout', event => {
        const el = event.target?.closest?.('[data-onmouseout]');
        if (el) executeSafeHandler(el.getAttribute('data-onmouseout'), event, el);
    }, true);

    document.addEventListener('keyup', event => {
        const el = event.target?.closest?.('[data-onkeyup]');
        if (el) executeSafeHandler(el.getAttribute('data-onkeyup'), event, el);
    });

    document.addEventListener('mousedown', event => {
        const el = event.target?.closest?.('[data-onmousedown]');
        if (el) executeSafeHandler(el.getAttribute('data-onmousedown'), event, el);
    });

    document.addEventListener('mouseup', event => {
        const el = event.target?.closest?.('[data-onmouseup]');
        if (el) executeSafeHandler(el.getAttribute('data-onmouseup'), event, el);
    });

    document.addEventListener('focus', event => {
        const el = event.target?.closest?.('[data-onfocus]');
        if (el) executeSafeHandler(el.getAttribute('data-onfocus'), event, el);
    }, true);

    document.addEventListener('blur', event => {
        const el = event.target?.closest?.('[data-onblur]');
        if (el) executeSafeHandler(el.getAttribute('data-onblur'), event, el);
    }, true);

    document.addEventListener('error', event => {
        const el = event.target?.closest?.('[data-onerror]');
        if (el) executeSafeHandler(el.getAttribute('data-onerror'), event, el);
    }, true);

    document.addEventListener('submit', event => {
        const form = event.target;
        const code = form?.getAttribute?.('data-onsubmit');
        if (!code) return;
        executeSafeHandler(code, event, form);
    }, true);

// [AI-GENERATED][ROBUSTNESS] Expose a small diagnostic API without creating a second click system.
window.__eventDelegation = Object.freeze({
    version: '5.0.0',
    delegatedActions: true,
    modalActions: false,
    modalOwner: 'modal-bootstrap.js'
});