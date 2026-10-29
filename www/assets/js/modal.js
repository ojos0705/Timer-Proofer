/**
 * [AI-GENERATED][RECONSTRUCTION][V263] ES-module API for the independent modal bootstrap.
 * The critical click listener lives in modal-bootstrap.js so app-core/module failures cannot disable it.
 */
import { getModalCore, syncModalBodyScrollLock } from './modal-bootstrap.js?v=20261027-v317'; // [AI-GENERATED][ES6 MODULE IDENTITY][V270]

// [AI-GENERATED][RECONSTRUCTION][V20] Canonical recipe-photo preview.
// Reuses the existing #modal-preview-foto contract and preserves the fit-to-screen
// behavior from app-core while eliminating the second dynamic overlay implementation.
// [AI-GENERATED][BUG FIX][V304] The global photo preview must not remain
// nested inside #user-modal. Otherwise its display:flex state is retained while
// the parent is hidden, then the preview unexpectedly appears when Profile opens.
function ensureRecipePhotoPreviewAtBody() {
    const previewModal = document.getElementById('modal-preview-foto');
    if (previewModal && previewModal.parentElement !== document.body) {
        document.body.appendChild(previewModal);
    }
    return previewModal;
}

function closeRecipePhotoPreview() {
    const previewModal = document.getElementById('modal-preview-foto');
    const previewImage = document.getElementById('img-modal-preview');
    if (!previewModal) return false;

    previewModal.style.display = 'none';
    if (previewImage) {
        previewImage.onload = null;
        previewImage.removeAttribute('src');
    }

    if (previewModal._fitPreview) {
        window.removeEventListener('resize', previewModal._fitPreview);
        window.visualViewport?.removeEventListener('resize', previewModal._fitPreview);
        previewModal._fitPreview = null;
    }
    // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
    syncModalBodyScrollLock();
    return true;
}

export function previewRecipePhoto(eventOrUrl, maybeUrl) {
    const event = eventOrUrl && typeof eventOrUrl === 'object' ? eventOrUrl : null;
    const url = typeof maybeUrl === 'string' ? maybeUrl : eventOrUrl;
    if (!url) return false;

    event?.preventDefault?.();
    event?.stopPropagation?.();

    const previewModal = ensureRecipePhotoPreviewAtBody();
    const previewImage = document.getElementById('img-modal-preview');
    if (!previewModal || !previewImage) return false;

    previewModal.style.display = 'flex';
    // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
    syncModalBodyScrollLock();

    if (previewModal._fitPreview) {
        window.removeEventListener('resize', previewModal._fitPreview);
        window.visualViewport?.removeEventListener('resize', previewModal._fitPreview);
    }

    previewModal._fitPreview = () => {
        if (previewModal.style.display !== 'flex') return;

        const modalStyle = window.getComputedStyle(previewModal);
        const paddingX = parseFloat(modalStyle.paddingLeft) + parseFloat(modalStyle.paddingRight);
        const paddingY = parseFloat(modalStyle.paddingTop) + parseFloat(modalStyle.paddingBottom);
        const availableWidth = Math.max(0, previewModal.clientWidth - paddingX);
        const availableHeight = Math.max(0, previewModal.clientHeight - paddingY);

        previewImage.style.width = 'auto';
        previewImage.style.height = 'auto';
        previewImage.style.maxWidth = `${availableWidth}px`;
        previewImage.style.maxHeight = `${availableHeight}px`;
        previewImage.style.objectFit = 'contain';
        previewImage.style.objectPosition = 'center';
    };

    previewModal._fitPreview();
    previewImage.onload = previewModal._fitPreview;
    previewImage.src = String(url);

    window.visualViewport?.addEventListener('resize', previewModal._fitPreview, { passive: true });
    window.addEventListener('resize', previewModal._fitPreview, { passive: true });
    return true;
}

// [AI-GENERATED][COMPATIBILITY] Existing HTML data-action remains unchanged.
window.tutupPreviewFoto = closeRecipePhotoPreview;
window.previewRecipePhoto = previewRecipePhoto;

// [AI-GENERATED][RECONSTRUCTION] Bind the existing modal backdrop once.
let previewBackdropBound = false;
function bindPreviewBackdrop() {
    if (previewBackdropBound) return;
    const previewModal = ensureRecipePhotoPreviewAtBody();
    if (!previewModal) return;
    previewBackdropBound = true;
    previewModal.addEventListener('click', (event) => {
        if (event.target === previewModal) closeRecipePhotoPreview();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ensureRecipePhotoPreviewAtBody();
        bindPreviewBackdrop();
    }, { once: true });
} else {
    ensureRecipePhotoPreviewAtBody();
    bindPreviewBackdrop();
}

export function toggleModal(modalId) {
    const core = getModalCore();
    return core && typeof core.toggleModal === 'function'
        ? core.toggleModal(modalId)
        : false;
}

export function closeAllModals() {
    const core = getModalCore();
    return core && typeof core.closeAllModals === 'function'
        ? core.closeAllModals()
        : false;
}

// [AI-GENERATED][COMPATIBILITY] Keep the global API available to legacy modules.
window.closeAllModals = closeAllModals;

window.__modalController = {
    version: '5.1.0',
    toggleModal,
    closeAllModals,
    bound: Boolean(window.__TP_MODAL_BOOTSTRAP__),
    get lastAction() {
        return getModalCore()?.state?.lastAction ?? null;
    }
};
