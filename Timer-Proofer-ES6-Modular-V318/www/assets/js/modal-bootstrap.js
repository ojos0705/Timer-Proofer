/**
 * [AI-GENERATED][RECONSTRUCTION] Critical modal bootstrap.
 * An explicit ES6 Module initializer invoked before awaited startup work.
 * It intentionally uses only native DOM APIs so critical top-navigation modals
 * remain operable even when another application module fails during startup.
 */
// [AI-GENERATED][ES6 MODULE][V263] The module owns the canonical core reference.
let modalCoreInstance = null;

// [AI-GENERATED][ES6 MODULE][V272] Notification UI callbacks are registered by
// notification-service.js as an explicit dependency, without a module cycle.
let notificationModalHooks = Object.freeze({ renderList: null, updateBadge: null });

export function registerNotificationModalHooks(hooks = {}) {
    notificationModalHooks = Object.freeze({
        renderList: typeof hooks?.renderList === 'function' ? hooks.renderList : null,
        updateBadge: typeof hooks?.updateBadge === 'function' ? hooks.updateBadge : null
    });
    return Boolean(notificationModalHooks.renderList || notificationModalHooks.updateBadge);
}

// [AI-GENERATED][ES6 MODULE][V263] Internal consumers use this export instead of
// reading the mutable compatibility global directly.
export function getModalCore() {
    return modalCoreInstance || (typeof window !== 'undefined' ? window.__TPModalCore || null : null);
}

// [AI-GENERATED][ROBUSTNESS][V263] Centralized, safe scroll-lock API for all ES module consumers.
export function syncModalBodyScrollLock() {
    const core = getModalCore();
    if (typeof core?.syncBodyScrollLock !== 'function') return false;
    try {
        return core.syncBodyScrollLock();
    } catch (error) {
        console.error('[modal-bootstrap] Sinkronisasi scroll lock gagal:', error);
        return false;
    }
}

// [AI-GENERATED][ARCHITECTURE FIX][V310] The profile modal owns profile UI only.
// Move any overlay accidentally nested inside it to the document root before
// modal initialization. This keeps unrelated pages visible when the profile closes.
// Existing node identity, IDs, attributes, event delegation and contents are preserved.
function detachOverlaysFromProfileContainer() {
    if (typeof document === 'undefined' || !document.body) return 0;

    const profileModal = document.getElementById('user-modal');
    if (!profileModal) return 0;

    const nestedOverlays = profileModal.querySelectorAll?.(
        '.page-modal, .unified-modal, .recipe-modal, .tips-modal, .article-modal-overlay, #modal-preview-foto'
    ) ?? [];
    let detachedCount = 0;

    for (const overlay of nestedOverlays) {
        if (overlay !== profileModal && profileModal.contains(overlay)) {
            document.body.appendChild(overlay);
            detachedCount += 1;
        }
    }

    if (detachedCount > 0) {
        console.info(`[modal-bootstrap] ${detachedCount} overlay dipisahkan dari #user-modal.`);
    }
    return detachedCount;
}

export function initializeModalBootstrap() {
    detachOverlaysFromProfileContainer();
    const existingCore = getModalCore();
    if (existingCore?.version === '5.1.0') {
        modalCoreInstance = existingCore;
        return existingCore;
    }

    const state = {
        version: '5.1.0',
        bound: false,
        lastAction: null,
        errors: 0,
        returnToSettings: false,
        settingsChildIds: new Set(['modal-koneksi-sensor', 'modal-preferensi', 'whatsapp-language-modal', 'help-modal', 'about-modal', 'tos-modal', 'backup-modal', 'rate-modal', 'feedback-modal'])
    };

    function setClosed(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.setAttribute('inert', '');
        modal.setAttribute('aria-hidden', 'true');
    }

    function prepareModal(modal) {
        if (!modal) return;

        // [AI-GENERATED][RECONSTRUCTION] Keep the existing page-modal CSS contract.
        modal.classList.add('active');
        modal.removeAttribute('inert');
        modal.setAttribute('aria-hidden', 'false');
        modal.style.display = 'flex';
        modal.style.zIndex = '11000';
        modal.setAttribute('tabindex', '-1');
        syncBodyScrollLock();
    }

    // [AI-GENERATED][BUG FIX][V198] Reconcile scroll locking from the overlays
    // that are still visible instead of unconditionally unlocking the document
    // when one modal closes. Recipe/Tips overlays and the recipe photo preview
    // do not share the `.page-modal` class, but they also block background scroll.
    function hasBlockingOverlay() {
        if (document.querySelector(
            '.page-modal.active, .unified-modal.active, .recipe-modal.active, .tips-modal.active, .article-modal-overlay.active'
        )) return true;

        // [AI-GENERATED][ROBUSTNESS][V199] Keep the lock during short close
        // transitions used by notification/language modals, where `.active` is
        // removed before the inline display is switched to `none`.
        const visibleTransitionOverlay = Array.from(document.querySelectorAll(
            '.page-modal, .unified-modal, .recipe-modal, .tips-modal, .article-modal-overlay'
        )).some((overlay) => Boolean(
            overlay?.style &&
            overlay.style.display !== 'none' &&
            overlay.style.display !== ''
        ));
        if (visibleTransitionOverlay) return true;

        const photoPreview = document.getElementById('modal-preview-foto');
        return Boolean(
            photoPreview?.style &&
            photoPreview.style.display !== 'none' &&
            photoPreview.style.display !== ''
        );
    }

    // [AI-GENERATED][REFACTOR][V199] The only owner allowed to mutate body scroll lock.
    // Legacy modules call this bridge after changing their overlay state.
    function syncBodyScrollLock() {
        const locked = hasBlockingOverlay();
        const expectedOverflow = locked ? 'hidden' : '';
        if (document.body.style.overflow !== expectedOverflow) {
            document.body.style.overflow = expectedOverflow;
        }
        return locked;
    }

    // [AI-GENERATED][ROBUSTNESS][V248] Keep modal toggling synchronous while
    // observing rejected Promises returned by optional async initializers.
    function observeInitializer(result, initializerName) {
        if (!result || typeof result.then !== 'function') return;
        void Promise.resolve(result).catch((error) => {
            state.errors += 1;
            console.error(`[modal-bootstrap] Inisialisasi ${initializerName} gagal:`, error);
        });
    }

    function runInitializer(initializerName, callback) {
        if (typeof callback !== 'function') return;
        try {
            observeInitializer(callback(), initializerName);
        } catch (error) {
            state.errors += 1;
            console.error(`[modal-bootstrap] Inisialisasi ${initializerName} gagal:`, error);
        }
    }

    function initializeModal(modal) {
        if (!modal) return;

        if (modal.id === 'user-modal') {
            runInitializer('profil', () => window.loadDynamicProfile?.(false));
        } else if (modal.id === 'backup-modal') {
            runInitializer('backup', () => window.refreshBackupModalInfo?.());
        } else if (modal.id === 'notif-modal') {
            // ESM callbacks are canonical. The window bridge is a short-startup
            // fallback for legacy callers if the notification module hasn't registered yet.
            runInitializer('daftar notifikasi', () => (
                notificationModalHooks.renderList || window.NotifSystem?.renderList
            )?.());
            runInitializer('badge notifikasi', () => (
                notificationModalHooks.updateBadge || window.NotifSystem?.updateBadge
            )?.());
        }
    }

    function toggleModal(modalId) {
        const id = String(modalId || '').trim();
        const modal = id ? document.getElementById(id) : null;

        if (!modal) {
            state.errors += 1;
            console.warn(`[modal-bootstrap] Modal dengan ID "${id}" tidak ditemukan.`);
            return false;
        }

        const isOpening = !modal.classList.contains('active');

        if (!isOpening) {
            setClosed(modal);
            syncBodyScrollLock();
            state.lastAction = { modalId: id, opened: false, at: Date.now() };
            // [AI-GENERATED][NAV FIX][V308] Return to settings after closing its child page.
            if (state.returnToSettings && state.settingsChildIds.has(id)) {
                state.returnToSettings = false;
                window.setTimeout(() => toggleModal('settings-modal'), 0);
            }
            return true;
        }

        // [AI-GENERATED][NAV FIX][V308] Remember settings as parent for submenu navigation.
        if (id !== 'settings-modal' && state.settingsChildIds.has(id) && document.getElementById('settings-modal')?.classList.contains('active')) state.returnToSettings = true;
        else if (id === 'settings-modal') state.returnToSettings = false;

        // [AI-GENERATED][RECONSTRUCTION] Close only other page modals.
        document.querySelectorAll('.page-modal.active').forEach((openModal) => {
            if (openModal !== modal) setClosed(openModal);
        });

        prepareModal(modal);
        initializeModal(modal);
        // [AI-GENERATED][BUGFIX][V312] Refresh About version whenever the modal opens.
        if (id === 'about-modal' && typeof window.updateVersion === 'function') {
            Promise.resolve(window.updateVersion()).catch((error) => {
                console.warn('[modal-bootstrap] Penyegaran versi About gagal:', error);
            });
        }

        try {
            window.history.pushState({ modalOpen: id }, '');
        } catch (error) {
            state.errors += 1;
            console.warn('[modal-bootstrap] History modal gagal:', error);
        }

        state.lastAction = { modalId: id, opened: true, at: Date.now() };

        // [AI-GENERATED][ACCESSIBILITY] Focus after the browser has applied the modal state.
        window.setTimeout(() => {
            try { modal.focus({ preventScroll: true }); } catch (_) { /* no-op */ }
        }, 0);

        return true;
    }

    function closeAllModals() {
        document.querySelectorAll('.page-modal.active, .unified-modal.active').forEach(setClosed);
        syncBodyScrollLock();
    }

    // [AI-GENERATED][ES6 MODULE][V263] Build the canonical core once, then
    // expose the identical object through the legacy window bridge.
    modalCoreInstance = Object.freeze({
        version: state.version,
        toggleModal,
        closeAllModals,
        syncBodyScrollLock,
        hasBlockingOverlay,
        state
    });
    window.__TPModalCore = modalCoreInstance;

    // [AI-GENERATED][COMPATIBILITY] Preserve legacy global calls used by app-core.
    window.toggleModal = toggleModal;
    // [AI-GENERATED][COMPATIBILITY][V199] Stable bridge for legacy module callers.
    window.syncBodyScrollLock = syncBodyScrollLock;

    // [AI-GENERATED][RECONSTRUCTION] Capture-phase listener is registered before boot.js.
    document.addEventListener('click', function (event) {
        const source = event.target;
        const target = source instanceof Element
            ? source.closest('[data-action="toggleModal"][data-arg]')
            : null;

        if (!target) return;

        const modalId = target.dataset.arg?.trim();
        if (!modalId) return;

        // [AI-GENERATED][BUG FIX] Own this critical action before any later click listener.
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        try {
            toggleModal(modalId);
        } catch (error) {
            state.errors += 1;
            console.error('[modal-bootstrap] Toggle modal gagal:', error);
        }
    }, true);

    state.bound = true;
    window.__TP_MODAL_BOOTSTRAP__ = true;

    console.info('[modal-bootstrap] v5.1.0 aktif — modal navigation independent dari boot.js/app-core.js.');
    return modalCoreInstance;
}
