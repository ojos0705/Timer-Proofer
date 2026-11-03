/**
 * [AI-GENERATED][REFACTOR][V40]
 * Canonical owner for recipe photo upload, slot state, preview rendering,
 * object-URL lifecycle, and legacy compatibility APIs.
 *
 * Existing DOM IDs/classes/data-action contracts are intentionally preserved.
 */

const MAX_RECIPE_PHOTOS = 5;
const PHOTO_INPUT_ID = 'foto-akhir';

const recipePhotoFiles = [];
// [AI-GENERATED][ES6 MODULE][V285] Keep photo mutation and target-slot state inside this canonical module.
let recipePhotoMutationEpoch = 0; // [AI-GENERATED][ES6 MODULE][V285]
let activeRecipePhotoIndex = null; // [AI-GENERATED][ES6 MODULE][V285]

// [AI-GENERATED][ROBUSTNESS][V230] Blob is the stable binary-image contract.
// File is a Blob subclass, but some constrained WebViews omit the global File
// constructor; never evaluate `value instanceof File` without checking it exists.
function isBlobLike(value) {
    return typeof Blob !== 'undefined' && value instanceof Blob;
}

// [AI-GENERATED][ROBUSTNESS][V143] Incremented only by user-driven photo
// mutations so async IndexedDB restore cannot overwrite a newer edit.
function markPhotoMutation() {
    recipePhotoMutationEpoch += 1;
    return recipePhotoMutationEpoch;
}

// [AI-GENERATED][ES6 MODULE][V285] Expose the shared epoch through ESM, not a mutable window property.
function getRecipePhotoMutationEpoch() {
    return recipePhotoMutationEpoch;
}

function getPhotoInput() {
    return document.getElementById(PHOTO_INPUT_ID);
}

function getSlot(index) {
    if (!Number.isInteger(index) || index < 0 || index >= MAX_RECIPE_PHOTOS) return null;
    return document.getElementById(`recipe-photo-slot-${index}`);
}

function revokeSlotObjectUrl(slot) {
    const url = slot?.__recipePhotoObjectUrl;
    if (!url) return;
    try {
        URL.revokeObjectURL(url);
    } catch (error) {
        console.warn('[RecipePhotoService] Gagal melepas object URL:', error);
    }
    slot.__recipePhotoObjectUrl = null;
}

function clearSlotVisual(slot) {
    if (!slot) return;
    revokeSlotObjectUrl(slot);
    slot.replaceChildren();
    slot.classList.remove('has-image');
    delete slot.dataset.photoLoaded;
    delete slot.__recipePhotoFile;
    delete slot.__recipePhotoName;
    delete slot.__recipePhotoType;
    delete slot.__recipePhotoSize;
}

function clearAllSlotVisuals() {
    for (let index = 0; index < MAX_RECIPE_PHOTOS; index += 1) {
        clearSlotVisual(getSlot(index));
    }
}

function createRemoveButton(index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-remove-photo';
    button.setAttribute('aria-label', `Hapus foto ${index + 1}`);
    button.textContent = '✕';
    button.style.cssText = [
        'position:absolute',
        'top:6px',
        'right:6px',
        'z-index:10',
        'background:rgba(0,0,0,.65)',
        'color:#fff',
        'border:none',
        'border-radius:50%',
        'width:24px',
        'height:24px',
        'font-size:12px',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'cursor:pointer'
    ].join(';');
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        removePhoto(index);
    });
    return button;
}

function renderPhoto(file, index) {
    const slot = getSlot(index);
    if (!slot || !isBlobLike(file)) return;

    const objectUrl = URL.createObjectURL(file);
    slot.__recipePhotoObjectUrl = objectUrl;
    slot.__recipePhotoFile = file;
    slot.__recipePhotoName = file.name || `foto-resep-${index + 1}`;
    slot.__recipePhotoType = file.type;
    slot.__recipePhotoSize = file.size;
    slot.dataset.photoLoaded = 'true';
    slot.classList.add('has-image');

    const image = document.createElement('img');
    image.className = 'preview-img';
    image.src = objectUrl;
    image.alt = file.name || `Foto resep ${index + 1}`;
    image.loading = 'eager';
    image.decoding = 'async';
    image.draggable = false;
    image.style.cssText = [
        'position:absolute',
        'inset:0',
        'width:100%',
        'height:100%',
        'min-width:0',
        'min-height:0',
        'max-width:100%',
        'max-height:100%',
        'object-fit:contain',
        'object-position:center',
        'display:block',
        'border-radius:inherit',
        'background:#f1f5f9',
        'z-index:2'
    ].join(';');

    slot.appendChild(image);
    slot.appendChild(createRemoveButton(index));
}

function render() {
    clearAllSlotVisuals();
    recipePhotoFiles.forEach((file, index) => renderPhoto(file, index));
}

function normalizeImageFiles(files) {
    return Array.from(files || []).filter((file) => (
        isBlobLike(file) &&
        typeof file.type === 'string' &&
        file.type.startsWith('image/')
    ));
}

function handleFiles(files, startIndex = 0) {
    const imageFiles = normalizeImageFiles(files);
    if (!imageFiles.length) return false;

    // [AI-GENERATED][BUG FIX][V193] A user upload is a mutation just like remove/clear.
    // This epoch invalidates any IndexedDB restore that began before the upload,
    // preventing stale persisted images from overwriting the user's latest selection.
    markPhotoMutation();

    const safeStart = Number.isInteger(startIndex)
        ? Math.max(0, Math.min(MAX_RECIPE_PHOTOS - 1, startIndex))
        : 0;

    const available = MAX_RECIPE_PHOTOS - safeStart;
    const accepted = imageFiles.slice(0, available);

    // [AI-GENERATED][BUG FIX] Replace only the selected slot range.
    // Re-selecting slot 1 must NOT delete already uploaded photos in slots 2-4.
    // Additional selected files fill consecutive slots from the requested index.
    accepted.forEach((file, offset) => {
        recipePhotoFiles[safeStart + offset] = file;
    });

    // Keep the sparse array normalized so render order always matches slot order.
    recipePhotoFiles.length = Math.min(
        MAX_RECIPE_PHOTOS,
        Math.max(recipePhotoFiles.length, safeStart + accepted.length)
    );
    render();
    return true;
}

function handleInputChange(event) {
    const input = event?.target;
    if (!input || input.id !== PHOTO_INPUT_ID) return;

    const files = Array.from(input.files || []);
    if (files.length > MAX_RECIPE_PHOTOS) {
        console.warn('[RecipePhotoService] Jumlah file melebihi batas 5; file tambahan diabaikan.');
    }

    const startIndex = Number.isInteger(activeRecipePhotoIndex)
        ? activeRecipePhotoIndex
        : Number(input.dataset.targetIndex);

    handleFiles(files, Number.isInteger(startIndex) ? startIndex : 0);
    input.value = '';
}

function triggerUpload(index = null, event = null, element = null) {
    // [AI-GENERATED][BUG FIX] The remove control is dynamically nested inside
    // a data-action photo slot. Capture-phase delegation sees the slot first,
    // so explicitly ignore remove-button clicks before opening/previewing it.
    if (event?.target?.closest?.('.btn-remove-photo')) return false;

    const slot = element?.closest?.('.photo-slot') || element || null;
    const slotIndex = Number(slot?.dataset?.index ?? index);
    const validIndex = Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < MAX_RECIPE_PHOTOS
        ? slotIndex
        : 0;

    const existingImage = slot?.querySelector?.('img.preview-img');
    const existingUrl = slot?.__recipePhotoObjectUrl || existingImage?.currentSrc || existingImage?.src || null;
    const loaded = slot?.dataset?.photoLoaded === 'true' || slot?.classList?.contains('has-image');

    if (loaded && existingUrl) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        window.previewRecipePhoto?.(event, existingUrl);
        return true;
    }

    const input = getPhotoInput();
    if (!input) {
        console.error('[RecipePhotoService] Input #foto-akhir tidak ditemukan.');
        return false;
    }

    activeRecipePhotoIndex = validIndex;
    input.dataset.targetIndex = String(validIndex);

    // [AI-GENERATED][BUG FIX] The click must remain inside the originating
    // user-activation call stack so browsers do not reject the file chooser.
    input.value = '';
    input.click();
    return true;
}

function removePhoto(index) {
    // [AI-GENERATED][BUG FIX][V142] A photo slot is a semantic UI position.
    // Removing slot N must not shift later photos into N; preserve the remaining
    // slot indexes so persisted/reloaded photos keep their original positions.
    if (!Number.isInteger(index) || index < 0 || index >= MAX_RECIPE_PHOTOS) return false;
    markPhotoMutation();
    recipePhotoFiles[index] = null;

    // Trim only trailing empty slots; internal empty slots are intentionally kept.
    while (recipePhotoFiles.length > 0 && recipePhotoFiles[recipePhotoFiles.length - 1] == null) {
        recipePhotoFiles.pop();
    }

    const input = getPhotoInput();
    if (input) input.value = '';
    render();
    return true;
}

function clear() {
    markPhotoMutation();
    recipePhotoFiles.length = 0;
    clearAllSlotVisuals();
    const input = getPhotoInput();
    if (input) input.value = '';
    activeRecipePhotoIndex = null;
}

// [AI-GENERATED][BUG FIX][V128] Keep sparse slot positions internal while exposing
// only real File objects to consumers. Selecting slot 4 before slots 0-3 must not
// report five uploaded files or leak array holes into persistence/validation code.
function getFiles() {
    return recipePhotoFiles.filter(isBlobLike);
}

// [AI-GENERATED][ROBUSTNESS][V138] Preserve physical slot positions when
// restoring persisted photos. A null slot remains empty instead of shifting
// later photos into a different semantic slot.
function getSlotFiles() {
    return Array.from({ length: MAX_RECIPE_PHOTOS }, (_, index) => {
        const file = recipePhotoFiles[index];
        return isBlobLike(file) ? file : null;
    });
}

// [AI-GENERATED][ROBUSTNESS][V138] Restore device-persisted photo blobs into
// the same canonical preview renderer used by fresh uploads.
function restoreFiles(slotFiles = []) {
    recipePhotoFiles.length = 0;
    for (let index = 0; index < MAX_RECIPE_PHOTOS; index += 1) {
        const file = slotFiles[index];
        recipePhotoFiles[index] = isBlobLike(file) ? file : null;
    }
    render();
    return true;
}

function getState() {
    const files = getFiles();
    return Object.freeze({
        count: files.length,
        files,
        slotFiles: getSlotFiles()
    });
}

const RecipePhotoService = Object.freeze({
    triggerUpload,
    handleInputChange,
    handleFiles,
    removePhoto,
    clear,
    render,
    getFiles,
    getSlotFiles,
    restoreFiles,
    getState,
    getRecipePhotoMutationEpoch
});

// [AI-GENERATED][ES6 MODULE][V285] Consumers use the named export above; keep only
// the specific legacy photo helper globals that are still referenced by old integrations.
window.uploadedRecipeFiles = recipePhotoFiles;
window.triggerPhotoInput = (index = null) => triggerUpload(index);
window.removeRecipePhoto = removePhoto;

if (!window.__recipePhotoChangeBound) {
    document.addEventListener('change', handleInputChange);
    window.__recipePhotoChangeBound = true;
}

export {
    RecipePhotoService,
    triggerUpload,
    handleInputChange,
    handleFiles,
    removePhoto,
    clear,
    render,
    getFiles,
    getSlotFiles,
    restoreFiles,
    getState,
    getRecipePhotoMutationEpoch
};
