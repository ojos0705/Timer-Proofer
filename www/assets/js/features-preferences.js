// [AI-GENERATED][REFACTOR] Depend on the canonical modal controller explicitly.
import { toggleModal } from './modal.js';
import { NotifSystem } from './notification-service.js'; // [AI-GENERATED][ES6 MODULE][V272]

// [AI-GENERATED][REFACTOR] ES6 feature module: application sound/offline preferences.
// Existing storage keys and DOM contracts remain unchanged.

// [AI-GENERATED][REFACTOR] Existing preference modal entry point moved from app-core without changing its public name.
function PreferensiModal() {
    muatDataPreferensi();
    toggleModal('modal-preferensi');
}
window.PreferensiModal = PreferensiModal;

// [AI-GENERATED][ROBUSTNESS][V164] Preference storage is best-effort: restricted
// browser/WebView contexts can throw on localStorage access. A read failure must
// not prevent the settings modal from opening, and a write failure must not abort
// the remaining preference updates or leave the UI action silently incomplete.
function readPreference(key, fallback) {
    try {
        const value = window.localStorage?.getItem(key);
        return value === null || value === undefined || value === '' ? fallback : value;
    } catch (error) {
        console.warn(`[Preferences] Gagal membaca preferensi "${key}"; memakai nilai default.`, error);
        return fallback;
    }
}

function writePreference(key, value) {
    try {
        window.localStorage?.setItem(key, String(value));
        return true;
    } catch (error) {
        console.warn(`[Preferences] Gagal menyimpan preferensi "${key}".`, error);
        return false;
    }
}

// [AI-GENERATED][REFACTOR] Existing preference hydration/saving behavior retained in its feature module.
function muatDataPreferensi() {
    const isSound = readPreference('app_sound', 'true') !== 'false';
    const isVib = readPreference('app_vib', 'true') !== 'false';
    const isOffline = readPreference('app_force_offline', 'false') === 'true';
    const tone = readPreference('app_alarm_tone', 'default');
    const vol = readPreference('app_alarm_volume', '80');

    const elSound = document.getElementById('set-sound');
    const elVib = document.getElementById('set-vib');
    const elOffline = document.getElementById('set-offline');
    const elTone = document.getElementById('select-alarm-tone');
    const elVol = document.getElementById('range-alarm-volume');

    if (elSound) elSound.checked = isSound;
    if (elVib) elVib.checked = isVib;
    if (elOffline) elOffline.checked = isOffline;
    if (elTone) elTone.value = tone;
    if (elVol) {
        elVol.value = vol;
        perbaruiIndikatorVolume();
    }
    kunciGrupSuara();
}

function simpanPreferensiLengkap() {
    const elSound = document.getElementById('set-sound');
    const elVib = document.getElementById('set-vib');
    const elOffline = document.getElementById('set-offline');
    const elTone = document.getElementById('select-alarm-tone');
    const elVol = document.getElementById('range-alarm-volume');

    const writes = [];
    if (elSound) writes.push(writePreference('app_sound', elSound.checked));
    if (elVib) writes.push(writePreference('app_vib', elVib.checked));
    if (elTone) writes.push(writePreference('app_alarm_tone', elTone.value));
    if (elVol) writes.push(writePreference('app_alarm_volume', elVol.value));

    if (elOffline) {
        writes.push(writePreference('app_force_offline', elOffline.checked));
        // Reconcile the offline UI after either transition. When the user turns
        // forced-offline mode off while online, skipping this call leaves the
        // offline panel and indicator visible until another network event.
        try {
            window.handleOfflinePremium?.();
        } catch (error) {
            console.warn('[Preferences] Pembaruan mode offline gagal.', error);
        }
    }

    toggleModal('modal-preferensi');
    const allSaved = writes.every(Boolean);
    window.showToast?.(allSaved ? '✅ Pengaturan alarm tersimpan' : '⚠️ Pengaturan dibuka, tetapi sebagian perubahan tidak dapat disimpan di perangkat ini.');
    NotifSystem?.tambah?.('sistem', 'Pengaturan Tersimpan', 'Preferensi aplikasi berhasil diperbarui.', '✅');
}
window.simpanPreferensiLengkap = simpanPreferensiLengkap;

// ----------------------------------------------------
// UI INTERACTION HELPERS  FUNGSI PREFERENSI APLIKASI 
// ----------------------------------------------------

function perbaruiIndikatorVolume() {
    const elVol = document.getElementById('range-alarm-volume');
    const ind = document.getElementById('vol-indicator');
    if (elVol && ind) ind.innerText = elVol.value + '%';
}

function kunciGrupSuara() {
    const soundCheck = document.getElementById('set-sound');
    const group = document.getElementById('alarm-settings-group');
    if (soundCheck && group) {
        // Redupkan dan blokir interaksi menu volume/tone jika suara dimatikan
        group.style.opacity = soundCheck.checked ? '1' : '0.4';
        group.style.pointerEvents = soundCheck.checked ? 'auto' : 'none';
    }
}

function handlerPratinjauSuara() {
    kunciGrupSuara();
    const elSound = document.getElementById('set-sound');
    
    // Test bunyi hanya jika dalam keadaan diceklis (ON)
    if (elSound && elSound.checked && typeof window.playAlarmSound === 'function') {
        // PERBAIKAN: kirim nilai form saat ini langsung sebagai parameter (mode pratinjau),
        // tanpa menyentuh localStorage sama sekali — jadi tidak ada risiko nilai tersimpan
        // "keselip"/tertimpa keliru jika pengguna gonta-ganti nada dengan cepat sebelum
        // menekan tombol Simpan.
        const toneSementara = document.getElementById('select-alarm-tone').value;
        const volSementara = document.getElementById('range-alarm-volume').value;
        
        window.playAlarmSound(toneSementara, volSementara); // Membunyikan suara tes sesuai form, belum disimpan
    }
}

function handlerPratinjauGetaran() {
    const elVib = document.getElementById('set-vib');
    if (elVib && elVib.checked) {
        // Test getaran jika diizinkan browser/perangkat
        if (typeof window.triggerVibration === 'function') {
            window.triggerVibration();
        } else if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    }
}


// [AI-GENERATED][REFACTOR] Named exports make preference behavior independently testable.
// [AI-GENERATED][REFACTOR] Legacy bridge for existing data-action/onchange integrations.
window.perbaruiIndikatorVolume = perbaruiIndikatorVolume;
window.handlerPratinjauSuara = handlerPratinjauSuara;
window.handlerPratinjauGetaran = handlerPratinjauGetaran;

export { PreferensiModal, muatDataPreferensi, simpanPreferensiLengkap, perbaruiIndikatorVolume, kunciGrupSuara, handlerPratinjauSuara, handlerPratinjauGetaran };
