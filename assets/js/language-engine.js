/**
 * [AI-GENERATED][I18N][V332]
 * Language selection is owned by the MyMemory / OfflineI18n adapters.
 * Google Website Translator is deliberately no longer part of the runtime.
 */
import { NativeCapacitorService } from './native-capacitor-service.js';
import { toggleModal } from './modal.js';
import { syncModalBodyScrollLock } from './modal-bootstrap.js?v=20261101-v337'; // [AI-GENERATED][ES6 MODULE IDENTITY][V332]
import { postJson } from './api-client-service.js';
import { isMidtransConfigured, loadMidtransSnap } from './midtrans-runtime.js';
import { OfflineI18n } from './offline-i18n.js';
import { OnlineI18n } from './online-i18n.js';
import {
    getSupportedTranslationLanguages,
    resolveSupportedTranslationLanguageCode
} from './cloud-translation-service.js';
import { filterDaftarBahasa } from './language-list-service.js';

// [AI-GENERATED][ROBUSTNESS][V120] Own the delayed language-modal hide so
// a rapid reopen cannot be undone by an older close callback.
let bahasaModalCloseTimer = null;
let bahasaSibuk = false;

window.bukaModalBahasa = function() {
    const modal = document.getElementById('whatsapp-language-modal');
    if (modal) {
        clearTimeout(bahasaModalCloseTimer);
        bahasaModalCloseTimer = null;
        toggleModal('whatsapp-language-modal');
    }
};

window.tutupModalBahasa = function() {
    clearTimeout(bahasaModalCloseTimer);
    bahasaModalCloseTimer = null;
    const modal = document.getElementById('whatsapp-language-modal');
    if (modal?.classList.contains('active')) {
        toggleModal('whatsapp-language-modal');
        // Keep the canonical scroll-lock owner synchronized after the modal begins closing.
        syncModalBodyScrollLock();
    }
};

function bahasaSimpan(kode, nama, resolved, mode) {
    localStorage.removeItem('user_lang_pending');
    localStorage.setItem('app_lang', kode);
    localStorage.setItem('user_lang_preference', kode);
    localStorage.setItem('user_lang_resolved', resolved || kode);
    localStorage.setItem('user_lang_name', nama);
    localStorage.setItem('user_lang_mode', mode); // 'source' | 'offline' | 'cloud'
    try {
        const preferences = NativeCapacitorService.getPlugin('Preferences');
        if (NativeCapacitorService.isNativePlatform() && preferences?.set) {
            void preferences.set({ key: 'app_lang', value: kode });
        }
    } catch (_) {}
}

function bahasaLabel(teks) {
    const element = document.getElementById('label-bahasa-aktif');
    if (element) element.innerText = teks;
}

function bahasaTunda(kode, nama) {
    localStorage.setItem('user_lang_pending', JSON.stringify({ code: kode, name: nama }));
}

function getTranslationErrorCode(error) {
    return error?.details?.code || error?.code || error?.cause?.code || '';
}

function getTranslationErrorMessage(error, languageName) {
    const code = getTranslationErrorCode(error);
    if (code === 'TRANSLATION_NOT_CONFIGURED' || code === 'TRANSLATION_PROVIDER_NOT_READY') {
        return 'Layanan terjemahan gratis belum tersedia pada deployment server. Pastikan endpoint /api/translate dari rilis terbaru sudah ter-deploy di Vercel.';
    }
    if (code === 'TRANSLATION_AUTH_REQUIRED' || code === 'TRANSLATION_AUTH_INVALID') {
        return 'Sesi login perlu diperbarui. Silakan login ulang, lalu pilih bahasa kembali.';
    }
    if (code === 'TRANSLATION_UNSUPPORTED_LANGUAGE') {
        return `Penyedia gratis MyMemory belum mendukung pasangan Bahasa Indonesia ke "${languageName}". Bahasa sebelumnya tetap aktif; coba bahasa lain.`;
    }
    if (code === 'TRANSLATION_QUOTA_EXCEEDED' || code === 'TRANSLATION_RATE_LIMITED') {
        return 'Kuota gratis MyMemory tercapai (5.000 karakter/hari tanpa email kontak). Cache terjemahan yang sudah tersimpan tetap dapat dipakai. Anda dapat menambahkan MYMEMORY_CONTACT_EMAIL di Vercel dengan email kontak valid untuk batas hingga 50.000 karakter/hari, atau coba lagi setelah kuota harian pulih.';
    }
    if (code === 'API_ROUTE_NOT_FOUND') {
        return 'Endpoint penerjemah tidak ditemukan pada deployment Vercel. Pastikan folder api/ sudah ikut ter-deploy dan gunakan deployment terbaru.';
    }
    if (code === 'API_INVALID_RESPONSE') {
        return 'Server penerjemah mengembalikan respons yang tidak dikenali. Periksa deployment API dan outputDirectory Vercel.';
    }
    if (code === 'API_NETWORK_ERROR') {
        return 'WebView tidak dapat menghubungi endpoint Vercel. Periksa internet HP, domain Production, dan CORS; server penerjemah belum menerima permintaan.';
    }
    if (code === 'TRANSLATION_NETWORK_ERROR' || code === 'TRANSLATION_UPSTREAM_ERROR') {
        return 'Vercel berhasil menerima permintaan, tetapi tidak dapat memperoleh jawaban dari MyMemory. Periksa koneksi keluar server atau coba lagi nanti.';
    }
    if (code === 'TRANSLATION_CATALOG_UNAVAILABLE') {
        return 'Daftar kandidat bahasa tidak tersedia. Bahasa sebelumnya tetap dipertahankan.';
    }
    if (code === 'TRANSLATION_TIMEOUT' || code === 'TIMEOUT') {
        return 'Layanan terjemahan membutuhkan waktu terlalu lama. Periksa koneksi lalu coba lagi.';
    }
    if (code === 'OFFLINE' || navigator.onLine === false) {
        return 'Perangkat sedang offline. Bahasa online akan diterapkan setelah koneksi tersedia.';
    }
    if (Number(error?.status) === 404) {
        return 'Endpoint terjemahan tidak ditemukan (HTTP 404). Deploy ulang backend API Vercel dari source terbaru.';
    }
    if (!code && Number(error?.status || 0) === 0) {
        return 'Koneksi ke server penerjemah gagal sebelum menerima respons. Periksa internet, CORS, dan alamat API.';
    }
    return 'Terjemahan online gagal. Periksa status API terjemahan dan deployment Vercel; bahasa sebelumnya tetap dipertahankan.';
}

async function pulihkanBahasaSebelumnya(previousLanguage, previousName, previousMode, previousLabel) {
    try {
        await OnlineI18n.reset();
        OfflineI18n.reset();
        if (typeof window.setLanguage === 'function') window.setLanguage('id');

        if (!previousLanguage || previousLanguage === 'id') {
            document.documentElement.lang = 'id';
            bahasaLabel(previousLabel || 'Bahasa Indonesia (Aktif)');
            return;
        }

        const mode = previousMode === 'google' ? 'cloud' : previousMode;
        if (OfflineI18n.hasPack(previousLanguage)) {
            const restored = await OfflineI18n.apply(previousLanguage);
            if (restored) {
                document.documentElement.lang = previousLanguage;
                bahasaLabel((previousName || previousLanguage) + ' (Aktif)');
                return;
            }
        }

        if ((mode === 'online' || mode === 'cloud' || !mode) && navigator.onLine !== false) {
            await OnlineI18n.apply(previousLanguage);
            document.documentElement.lang = previousLanguage;
            bahasaLabel((previousName || previousLanguage) + ' (Aktif)');
            return;
        }

        bahasaTunda(previousLanguage, previousName || previousLanguage);
        bahasaLabel((previousName || previousLanguage) + ' (Menunggu koneksi)');
    } catch (restoreError) {
        console.warn('[LanguageEngine] Pemulihan bahasa sebelumnya tertunda:', restoreError?.code || restoreError?.message || restoreError);
        bahasaLabel(previousLabel || 'Bahasa Indonesia');
    }
}

/**
 * Priority: Indonesian source -> installed offline pack -> cloud translation.
 * A language preference is persisted only after its translation was applied.
 */
async function pilihBahasaGlobal(kodeBahasa, namaBahasa) {
    if (bahasaSibuk) return false;
    bahasaSibuk = true;

    const code = String(kodeBahasa || '').trim().replace(/_/g, '-');
    const name = String(namaBahasa || code || 'Bahasa');
    const labelElement = document.getElementById('label-bahasa-aktif');
    const previousLabel = labelElement?.innerText || '';
    const previousLanguage = localStorage.getItem('user_lang_preference') || 'id';
    const previousName = localStorage.getItem('user_lang_name') || 'Bahasa Indonesia';
    const previousMode = localStorage.getItem('user_lang_mode') || 'source';

    try {
        if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code)) {
            const error = new Error('Kode bahasa tidak valid.');
            error.code = 'TRANSLATION_INVALID_LANGUAGE';
            throw error;
        }

        // A. Restore Indonesian source without leaving an old provider cookie behind.
        if (code.toLowerCase().split('-')[0] === 'id') {
            await OnlineI18n.reset();
            OfflineI18n.reset();
            if (typeof window.setLanguage === 'function') window.setLanguage('id');
            document.documentElement.lang = 'id';
            bahasaSimpan('id', name, 'id', 'source');
            bahasaLabel(name + ' (Aktif)');
            window.tutupModalBahasa();
            return true;
        }

        // B. A bundled/cached offline pack remains the first choice when present.
        if (OfflineI18n.hasPack(code)) {
            bahasaLabel('Memuat bahasa offline…');
            await OnlineI18n.reset();
            OfflineI18n.reset();
            if (typeof window.setLanguage === 'function') window.setLanguage('id');
            const offlineApplied = await OfflineI18n.apply(code);
            if (offlineApplied) {
                document.documentElement.lang = code;
                bahasaSimpan(code, name, OfflineI18n.current(), 'offline');
                bahasaLabel(name + ' (Aktif · Offline)');
                window.tutupModalBahasa();
                return true;
            }
            if (navigator.onLine === false || OfflineI18n.lastError() === 'network') {
                bahasaTunda(code, name);
                bahasaLabel(previousLabel || 'Bahasa sebelumnya tetap aktif');
                alert('Paket bahasa belum tersedia di perangkat. Sambungkan internet untuk mengunduhnya, lalu pilihan akan dicoba kembali.');
                return false;
            }
            // A broken/invalid offline pack may fall through to the online provider.
        }

        // C. Do not close the picker or overwrite the current language while offline.
        if (navigator.onLine === false) {
            bahasaTunda(code, name);
            alert('Bahasa ini memerlukan koneksi internet. Pilihan disimpan sementara dan akan dicoba saat perangkat online.');
            return false;
        }

        // D. Resolve against local language candidates. MyMemory validates the
        // actual Indonesian-to-target pair when each segment is sent.
        bahasaLabel('Memeriksa dukungan bahasa online…');
        const catalog = await getSupportedTranslationLanguages();
        const resolvedCode = resolveSupportedTranslationLanguageCode(code, catalog.languages);
        if (!resolvedCode) {
            await pulihkanBahasaSebelumnya(previousLanguage, previousName, previousMode, previousLabel);
            alert(`Bahasa "${name}" belum tersedia pada layanan terjemahan online yang aktif. Pilih bahasa lain.`);
            return false;
        }

        bahasaLabel('Menyiapkan terjemahan…');
        await OnlineI18n.reset();
        OfflineI18n.reset();
        if (typeof window.setLanguage === 'function') window.setLanguage('id');
        document.documentElement.lang = 'id';

        const result = await OnlineI18n.apply(resolvedCode, {
            onProgress: ({ completed, total, requests }) => {
                const suffix = total ? ` ${completed}/${total}` : '';
                bahasaLabel(`Menerjemahkan…${suffix}${requests ? ` · ${requests} permintaan` : ''}`);
            }
        });
        if (result.applied === 0 && result.total > 0) {
            const error = new Error('Tidak ada teks aplikasi yang berhasil diterjemahkan.');
            error.code = 'TRANSLATION_EMPTY_RESULT';
            throw error;
        }

        document.documentElement.lang = code;
        bahasaSimpan(code, name, resolvedCode, 'online');
        bahasaLabel(name + ' (Aktif · Online)');
        window.tutupModalBahasa();
        return true;
    } catch (error) {
        console.error('[LanguageEngine] Gagal mengubah bahasa:', {
            code: getTranslationErrorCode(error) || 'UNCLASSIFIED_TRANSLATION_ERROR',
            status: Number(error?.status || 0),
            url: String(error?.url || '').slice(0, 240)
        });
        await pulihkanBahasaSebelumnya(previousLanguage, previousName, previousMode, previousLabel);
        alert(getTranslationErrorMessage(error, name));
        return false;
    } finally {
        bahasaSibuk = false;
    }
}

// Restore a saved preference after DOM and the local pack loader are ready.
window.addEventListener('load', async () => {
    const savedLanguage = localStorage.getItem('user_lang_preference');
    if (!savedLanguage || savedLanguage === 'id') return;
    const savedName = localStorage.getItem('user_lang_name') || savedLanguage;
    const savedMode = localStorage.getItem('user_lang_mode') || 'online';
    bahasaLabel(savedName + ' (Memuat…)');

    try {
        if (OfflineI18n.hasPack(savedLanguage)) {
            const offlineReady = await OfflineI18n.whenReady();
            if (offlineReady || await OfflineI18n.apply(savedLanguage)) {
                document.documentElement.lang = savedLanguage;
                bahasaLabel(savedName + ' (Aktif · Offline)');
                return;
            }
        }

        if (navigator.onLine === false) {
            bahasaTunda(savedLanguage, savedName);
            bahasaLabel(savedName + ' (Menunggu koneksi)');
            return;
        }

        // Migrate existing online-language preferences to the MyMemory free route.
        const resolvedCode = localStorage.getItem('user_lang_resolved') || savedLanguage;
        await OnlineI18n.apply(resolvedCode);
        document.documentElement.lang = savedLanguage;
        localStorage.setItem('user_lang_mode', 'online');
        bahasaLabel(savedName + ' (Aktif · Online)');
    } catch (error) {
        console.warn('[LanguageEngine] Pemulihan bahasa tersimpan gagal:', getTranslationErrorCode(error) || error?.message || error);
        bahasaTunda(savedLanguage, savedName);
        bahasaLabel(savedName + ' (Menunggu koneksi)');
    }
});

// Retry only the pending user choice after the browser reports a real online transition.
window.addEventListener('online', () => {
    const raw = localStorage.getItem('user_lang_pending');
    if (!raw || bahasaSibuk) return;
    try {
        const pending = JSON.parse(raw);
        if (pending?.code) void pilihBahasaGlobal(pending.code, pending.name || pending.code);
    } catch (_) {
        localStorage.removeItem('user_lang_pending');
    }
});

// [AI-GENERATED][ES6 MODULE][V332] Search behavior remains owned by language-list-service.js.

// ==========================================================
// FUNGSI PAYMENT GATEWAY
// ==========================================================
async function mulaiTransaksiMidtrans() {
    try {
        // [AI-GENERATED][ES6 MODULE][V259] Fail fast instead of issuing a token request with a placeholder Client Key.
        if (!isMidtransConfigured()) {
            const error = new Error('Client Key Midtrans belum dikonfigurasi pada meta midtrans-snap-config.');
            error.code = 'MIDTRANS_CONFIG_MISSING';
            throw error;
        }

        // 1. Tampilkan indikator loading / ubah teks tombol
        const btnBayar = document.querySelector('.payment-checkout-container button');
        if (btnBayar) {
            btnBayar.disabled = true;
            btnBayar.innerText = "MENYIAPKAN TRANSAKSI...";
        }

        // [AI-GENERATED][REFACTOR][V36] Payment API now follows the shared network policy.
        const data = await postJson('/api/create-payment-token', {
            // [AI-GENERATED][SECURITY][V158] order_id is generated server-side.
            // Keep the checkout payload minimal; the API retains backward compatibility
            // with legacy clients that may still send order_id.
            gross_amount: 50000,
            customer_details: {
                first_name: localStorage.getItem('profile_name') || 'Pelanggan',
                email: localStorage.getItem('profile_email') || 'user@domain.com'
            }
        }, { timeoutMs: 20000 });
        if (!data.token) throw new Error("Gagal menghasilkan token pembayaran dari server.");

        // [AI-GENERATED][ES6 MODULE][V259] Load the legacy Snap SDK lazily behind a retryable module facade.
        const midtransSnap = await loadMidtransSnap();

        // 4. Tutup modal checkout lokal aplikasi terlebih dahulu
        // [AI-GENERATED][BUG FIX][V21] Use the canonical ES-module modal controller.
        // The previous bare global lookup could silently skip the close action because
        // module scope does not inherit window properties as lexical bindings.
        if (typeof toggleModal === 'function') {
            toggleModal('payment-modal');
        }

        // 5. Panggil Midtrans Snap Popup menggunakan token yang diterima
        midtransSnap.pay(data.token, {
            onSuccess: function(result) {
                alert("Pembayaran Berhasil! Terima kasih.");
                console.log(result);
            },
            onPending: function(result) {
                alert("Menunggu pembayaran Anda diselesaikan.");
                console.log(result);
            },
            onError: function(result) {
                alert("Pembayaran gagal atau dibatalkan.");
                console.log(result);
            },
            onClose: function() {
                alert('Anda menutup popup pembayaran sebelum menyelesaikan transaksi.');
            }
        });

    } catch (error) {
        console.error("Kesalahan Transaksi:", error.message);
        alert("Terjadi kesalahan sistem pembayaran: " + error.message);
    } finally {
        // Kembalikan tombol seperti semula
        const btnBayar = document.querySelector('.payment-checkout-container button');
        if (btnBayar) {
            btnBayar.disabled = false;
            btnBayar.innerText = "💳 BAYAR SEKARANG";
        }
    }
}

window.filterDaftarBahasa = filterDaftarBahasa; // [AI-GENERATED][COMPATIBILITY][V262]
window.pilihBahasaGlobal = pilihBahasaGlobal; // [AI-GENERATED][COMPATIBILITY][V262]
window.mulaiTransaksiMidtrans = mulaiTransaksiMidtrans;

export { filterDaftarBahasa, mulaiTransaksiMidtrans, pilihBahasaGlobal }; // [AI-GENERATED][ES6 MODULE][V332]
