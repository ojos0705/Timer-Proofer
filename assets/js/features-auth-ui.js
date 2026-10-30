import { AuthService } from './auth-service.js';
import { syncModalBodyScrollLock } from './modal-bootstrap.js?v=20261030-v324';

/** Fail closed when the required registration consent control is absent or unchecked. */
export function validateRegistrationConsent({ documentRef = globalThis.document, onMissing } = {}) {
    const consent = documentRef?.getElementById?.('agree-tos-checkbox') || null;
    if (consent?.checked === true) return true;
    onMissing?.(consent);
    return false;
}

/** Build the logout action with explicit dependencies for reliable regression tests. */
export function createLogoutHandler({
    authService = AuthService,
    documentRef = globalThis.document,
    confirmUser = globalThis.confirm,
    alertUser = globalThis.alert,
    logger = console,
    syncScrollLock = syncModalBodyScrollLock
} = {}) {
    let logoutInFlight = false;

    return async function handleLogout() {
        if (logoutInFlight) return false;

        const confirmLogout = typeof confirmUser === 'function'
            ? confirmUser('Apakah Anda yakin ingin keluar dari akun Timer Proofing?')
            : false;
        if (!confirmLogout) return false;

        logoutInFlight = true;
        try {
            await authService.signOut();

            documentRef?.body?.classList?.remove('logged-in');
            documentRef?.body?.classList?.add('logged-out');

            const authWrapper = documentRef?.getElementById?.('auth-wrapper');
            if (authWrapper) authWrapper.style.display = 'flex';

            const userModal = documentRef?.getElementById?.('user-modal');
            if (userModal) {
                userModal.classList?.remove('active');
                userModal.setAttribute?.('inert', '');
                syncScrollLock();
            }
            return true;
        } catch (error) {
            logger?.error?.('Gagal logout:', error?.message || error);
            alertUser?.('Terjadi kesalahan saat keluar: ' + (error?.message || error));
            return false;
        } finally {
            logoutInFlight = false;
        }
    };
}


// [AI-GENERATED][REFACTOR][V295] Authentication mode belongs to this feature module,
// so tab controls work independently from the legacy application facade.
let currentAuthMode = 'login';

function switchAuthTab(mode) {
    if (!['login', 'register', 'forgot'].includes(mode)) return false;
    currentAuthMode = mode;
    window.currentAuthMode = mode;


    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const btnSubmit = document.getElementById('btn-submit-main');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const tabSwitch = document.getElementById('auth-tab-switch');

    const groupName = document.getElementById('group-name');
    const groupPassword = document.getElementById('group-password');
    groupName?.classList?.toggle('active-form', mode === 'register');
    const groupRemember = document.getElementById('group-remember');
    const groupTos = document.getElementById('group-tos');
    const forgotWrapper = document.getElementById('forgot-link-wrapper');
    const backToLoginWrapper = document.getElementById('back-to-login-wrapper');
    const divider = document.getElementById('auth-divider');
    const socialGrid = document.getElementById('auth-social-grid');
    const whatsappBtn = document.getElementById('auth-whatsapp-btn');

    const inputName = document.getElementById('input-name');
    const inputPassword = document.getElementById('input-password');
    const errorBox = document.getElementById('auth-error-box');

    if (errorBox) errorBox.style.display = 'none';

    if (mode === 'login') {
        if (title) title.textContent = 'Timer Proofing';
        if (subtitle) subtitle.textContent = 'Masuk ke akun Anda';
        if (btnSubmit) { btnSubmit.textContent = 'MASUK'; btnSubmit.disabled = false; }
        if (tabSwitch) tabSwitch.style.display = 'flex';
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
        if (groupName) groupName.style.display = 'none';
        if (groupPassword) groupPassword.style.display = 'block';
        if (forgotWrapper) forgotWrapper.style.display = 'block';
        if (groupRemember) groupRemember.style.display = 'flex';
        if (groupTos) groupTos.style.display = 'none';
        if (backToLoginWrapper) backToLoginWrapper.style.display = 'none';
        if (divider) divider.style.display = 'flex';
        if (socialGrid) socialGrid.style.display = 'grid';
        if (whatsappBtn) whatsappBtn.style.display = 'flex';
        if (inputName) inputName.removeAttribute('required');
        if (inputPassword) inputPassword.setAttribute('required', 'true');

    } else if (mode === 'register') {
        if (title) title.textContent = 'Buat Akun Baru';
        if (subtitle) subtitle.textContent = 'Daftar untuk mulai menggunakan aplikasi';
        if (btnSubmit) btnSubmit.textContent = 'DAFTAR SEKARANG';
        if (tabSwitch) tabSwitch.style.display = 'flex';
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabRegister) tabRegister.classList.add('active');
        if (groupName) groupName.style.display = 'block';
        if (groupPassword) groupPassword.style.display = 'block';
        if (forgotWrapper) forgotWrapper.style.display = 'none';
        if (groupRemember) groupRemember.style.display = 'none';
        if (groupTos) groupTos.style.display = 'block';
        if (backToLoginWrapper) backToLoginWrapper.style.display = 'none';
        if (divider) divider.style.display = 'flex';
        if (socialGrid) socialGrid.style.display = 'grid';
        if (whatsappBtn) whatsappBtn.style.display = 'flex';
        if (inputName) inputName.setAttribute('required', 'true');
        if (inputPassword) inputPassword.setAttribute('required', 'true');

    } else if (mode === 'forgot') {
        if (title) title.textContent = 'Lupa Kata Sandi';
        if (subtitle) subtitle.textContent = 'Masukkan email untuk menerima instruksi reset';
        if (btnSubmit) { btnSubmit.textContent = 'KIRIM LINK RESET'; btnSubmit.disabled = false; }
        if (tabSwitch) tabSwitch.style.display = 'none';
        if (groupName) groupName.style.display = 'none';
        if (groupPassword) groupPassword.style.display = 'none';
        if (forgotWrapper) forgotWrapper.style.display = 'none';
        if (groupRemember) groupRemember.style.display = 'none';
        if (groupTos) groupTos.style.display = 'none';
        if (backToLoginWrapper) backToLoginWrapper.style.display = 'block';
        if (divider) divider.style.display = 'none';
        if (socialGrid) socialGrid.style.display = 'none';
        if (whatsappBtn) whatsappBtn.style.display = 'none';
        if (inputName) inputName.removeAttribute('required');
        if (inputPassword) inputPassword.removeAttribute('required');
    }
    return true;
}

window.currentAuthMode = currentAuthMode;
window.switchAuthTab = switchAuthTab;

function initAuthTabBindings() {
    const bindOnce = (element, key, handler) => {
        if (!element || element.dataset[key] === 'true') return;
        element.addEventListener('click', handler);
        element.dataset[key] = 'true';
    };
    bindOnce(document.getElementById('tab-login'), 'authTabBound', (event) => {
        event.preventDefault();
        switchAuthTab('login');
    });
    bindOnce(document.getElementById('tab-register'), 'authTabBound', (event) => {
        event.preventDefault();
        switchAuthTab('register');
    });
    const forgotLink = document.getElementById('link-forgot-password');
    const forgotModal = document.getElementById('forgot-password-modal') || document.getElementById('forgot-modal');
    bindOnce(forgotLink, 'authForgotBound', (event) => {
        event.preventDefault();
        if (forgotModal) forgotModal.classList.add('active');
        else switchAuthTab('forgot');
    });
    const backToLogin = document.getElementById('link-back-to-login');
    bindOnce(backToLogin, 'authBackBound', (event) => {
        event.preventDefault();
        switchAuthTab('login');
    });
    switchAuthTab('login');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthTabBindings, { once: true });
} else {
    initAuthTabBindings();
}

export { switchAuthTab };

const handleLogout = createLogoutHandler();
window.handleLogout = handleLogout;

export { handleLogout };
