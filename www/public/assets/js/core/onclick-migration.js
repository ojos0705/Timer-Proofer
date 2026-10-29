/**
 * [AI-GENERATED][REFACTOR] Centralized click delegation for legacy inline onclick handlers.
 * Keeps existing UI behavior while removing executable JavaScript from HTML attributes.
 */

const SPECIAL_ACTIONS = {
    // [AI-GENERATED][BUG FIX] Menangani aksi trigger upload foto secara dinamis sesuai struktur DOM eksisting tanpa atribut baru
    triggerUploadFoto(_arg, _event, element) {
        const container = element?.closest('form') || element?.parentElement || document;
        const fileInput = container.querySelector('input[type="file"]') || document.querySelector('input[type="file"]');
        
        if (fileInput) {
            // Wajib dipanggil secara langsung tanpa jeda async agar dialog file muncul
            fileInput.click();
        } else {
            console.warn('[onclick-migration] Input file untuk upload foto tidak ditemukan.');
        }
    },

    // Preview menggunakan modal existing.
    previewFoto(_arg, _event, element) {
        const imageUrl = element?.dataset?.url;
        if (!imageUrl) return;

        if (typeof window.showImagePreview === 'function') {
            window.showImagePreview(imageUrl);
            return;
        }

        const modal = document.getElementById('modal-preview-foto');
        const image = document.getElementById('img-modal-preview');
        if (!modal || !image) return;

        image.src = imageUrl;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
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
                console.warn('[onclick-migration] URL scheme ditolak:', parsed.protocol);
                return;
            }
            window.open(parsed.href, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.warn('[onclick-migration] URL tidak valid:', error);
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
    if (SPECIAL_ACTIONS[name]) return SPECIAL_ACTIONS[name];
    const fn = window[name];
    return typeof fn === 'function' ? fn : null;
}

// [AI-GENERATED][REFACTOR] One delegated listener handles all migrated data-action controls.
document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
        ? event.target.closest('[data-action]')
        : null;

    if (!target) return;

    const actionName = target.dataset.action?.trim();
    if (!actionName) return;

    const action = resolveAction(actionName);
    if (typeof action !== 'function') {
        console.warn(`[onclick-migration] Action tidak ditemukan: ${actionName}`);
        return;
    }

    event.preventDefault();

    const argument = decodeArgument(target.dataset.arg);

    try {
        // `call(target, ...)` mempertahankan konteks elemen untuk handler existing.
        const result = action.call(target, argument, event, target);

        if (result && typeof result.catch === 'function') {
            result.catch((error) => {
                console.error(`[onclick-migration] Action gagal: ${actionName}`, error);
            });
        }
    } catch (error) {
        console.error(`[onclick-migration] Action gagal: ${actionName}`, error);
    }
}, true);

// [AI-GENERATED][ROBUSTNESS] Expose a small diagnostic API without creating a second click system.
window.__onclickMigration = Object.freeze({
    version: '1.2.1',
    migrated: true,
    delegatedActions: true
});