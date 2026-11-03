/**
 * [AI-GENERATED][I18N][V332]
 * Language selection is owned by the MyMemory / OfflineI18n adapters.
 * Google Website Translator is deliberately no longer part of the runtime.
 */
import { NativeCapacitorService } from './native-capacitor-service.js';
import { toggleModal } from './modal.js';
import { syncModalBodyScrollLock } from './modal-bootstrap.js?v=20261102-v342'; // [AI-GENERATED][ES6 MODULE IDENTITY][V332]
import { getJson, postJson } from './api-client-service.js';
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
// [AI-GENERATED][MONETIZATION][V342-C] KATALOG DAN STATUS KEANGGOTAAN
// Harga dan ketersediaan paket hanya berasal dari API katalog server.
// ==========================================================
let membershipPlans = [];
let selectedMembershipPlanId = '';

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

function membershipNode(tag, text, className = '') {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
}

function renderMembershipPlans() {
    const host = document.getElementById('membership-plan-list');
    if (!host) return;
    host.replaceChildren();
    const freeCard = membershipNode('article', undefined, 'membership-plan-card membership-plan-free');
    Object.assign(freeCard.style, { border: '1px solid #e2e8f0', borderRadius: '14px', padding: '15px', background: '#f8fafc', textAlign: 'left', minWidth: '0' });
    const freeTitle = membershipNode('h4', 'Free');
    Object.assign(freeTitle.style, { margin: '0 0 6px', color: '#4E342E', fontSize: '1rem' });
    const freePrice = membershipNode('strong', 'Gratis');
    Object.assign(freePrice.style, { display: 'block', color: '#4E342E', fontSize: '1.15rem', marginBottom: '5px' });
    const freeDescription = membershipNode('p', 'Paket dasar tanpa biaya, tetap tersedia sebagai pilihan awal akun.');
    Object.assign(freeDescription.style, { margin: '0', color: '#718096', fontSize: '.76rem', lineHeight: '1.45' });
    freeCard.append(freeTitle, freePrice, freeDescription);
    host.append(freeCard);
    if (!membershipPlans.length) {
        host.append(membershipNode('p', 'Belum ada paket berbayar yang tersedia. Silakan periksa kembali nanti.', 'log-empty'));
        return;
    }
    membershipPlans.forEach((plan) => {
        const card = membershipNode('article', undefined, 'membership-plan-card');
        const selected = plan.id === selectedMembershipPlanId;
        Object.assign(card.style, {
            border: selected ? '2px solid var(--accent, #E67E22)' : '1px solid #e2e8f0',
            borderRadius: '14px', padding: '15px', background: selected ? '#fffaf2' : '#fff',
            textAlign: 'left', minWidth: '0', boxShadow: selected ? '0 5px 16px rgba(230,126,34,.12)' : 'none'
        });
        const title = membershipNode('h4', plan.tier_name || plan.name);
        Object.assign(title.style, { margin: '0 0 6px', color: '#4E342E', fontSize: '1rem' });
        const name = membershipNode('p', plan.name);
        Object.assign(name.style, { margin: '0 0 8px', color: '#718096', fontSize: '.76rem' });
        const price = membershipNode('strong', formatRupiah(plan.amount));
        Object.assign(price.style, { display: 'block', color: 'var(--accent, #E67E22)', fontSize: '1.15rem', marginBottom: '5px' });
        const period = membershipNode('p', `${plan.period_label || `${plan.duration_days} hari`} · ${plan.billing_period === 'annual' ? 'Tahunan' : plan.billing_period === 'monthly' ? 'Bulanan' : 'Paket'}`);
        Object.assign(period.style, { margin: '0 0 12px', color: '#718096', fontSize: '.75rem' });
        const choose = membershipNode('button', selected ? '✓ Paket dipilih' : 'Pilih paket');
        choose.type = 'button';
        choose.dataset.action = 'pilihPaketKeanggotaan';
        choose.dataset.arg = plan.id;
        Object.assign(choose.style, {
            width: '100%', border: '0', borderRadius: '10px', padding: '10px',
            background: selected ? '#4E342E' : 'var(--accent, #E67E22)', color: '#fff', fontWeight: '800', cursor: 'pointer'
        });
        card.append(title, name, price, period, choose);
        host.append(card);
    });
}

function updateMembershipCheckout() {
    const plan = membershipPlans.find((item) => item.id === selectedMembershipPlanId);
    const name = document.getElementById('pay-plan-name');
    const period = document.getElementById('pay-plan-period');
    const subtotal = document.getElementById('pay-subtotal-amount');
    const discount = document.getElementById('pay-discount-amount');
    const amount = document.getElementById('pay-total-amount');
    const description = document.getElementById('membership-checkout-description');
    const button = document.querySelector('.payment-checkout-container button[data-action="mulaiTransaksiMidtrans"]');
    if (name) name.textContent = plan?.name || 'Belum dipilih';
    if (period) period.textContent = plan?.period_label || '—';
    if (subtotal) subtotal.textContent = plan ? formatRupiah(plan.amount) : '—';
    if (discount) discount.textContent = formatRupiah(0);
    if (amount) amount.textContent = plan ? formatRupiah(plan.amount) : 'Pilih paket';
    if (description) description.textContent = plan ? `Anda memilih ${plan.name}. Periksa ringkasan sebelum melanjutkan.` : 'Pilih paket untuk melihat rincian tagihan.';
    if (button) {
        button.disabled = !plan;
        button.style.opacity = plan ? '1' : '.55';
    }
}

function pilihPaketKeanggotaan(planId) {
    const id = String(planId || '').trim();
    if (!membershipPlans.some((plan) => plan.id === id)) {
        console.warn('[Monetization] Paket pilihan tidak ditemukan pada katalog aktif.');
        return false;
    }
    selectedMembershipPlanId = id;
    renderMembershipPlans();
    updateMembershipCheckout();
    return true;
}

async function getMembershipAccessToken() {
    const supabase = window.supabase;
    const { data: sessionData } = supabase?.auth?.getSession
        ? await supabase.auth.getSession()
        : { data: null };
    return sessionData?.session?.access_token || '';
}

async function startFreeTrial() {
    const button = document.getElementById('membership-trial-button');
    if (button?.disabled) return false;
    const original = button?.textContent || '🎁 Mulai Free Trial 7 Hari';
    try {
        const token = await getMembershipAccessToken();
        if (!token) throw new Error('Silakan login terlebih dahulu untuk memulai Free Trial.');
        if (button) { button.disabled = true; button.textContent = 'Memproses Free Trial…'; }
        const result = await postJson('/api/start-free-trial', {}, {
            timeoutMs: 15000, headers: { Authorization: `Bearer ${token}` }
        });
        if (!result?.success) throw new Error(result?.error || 'Free Trial belum dapat dimulai.');
        alert('Free Trial Pro aktif selama 7 hari. Tidak ada metode pembayaran dan tidak ada penagihan otomatis. Setelah masa trial berakhir, akun kembali ke Free.');
        await loadMembershipPackages();
        return true;
    } catch (error) {
        alert(error?.message || 'Free Trial belum dapat dimulai. Silakan coba lagi.');
        if (button) { button.disabled = true; button.textContent = original; }
        await loadMembershipPackages();
        return false;
    }
}

async function loadMembershipPackages() {
    const host = document.getElementById('membership-plan-list');
    if (host) host.setAttribute('aria-busy', 'true');
    const status = document.getElementById('membership-current-plan');
    const expiry = document.getElementById('membership-expiry');
    try {
        const catalog = await getJson('/api/monetization-catalog', { timeoutMs: 10000 });
        membershipPlans = Array.isArray(catalog?.plans)
            ? catalog.plans.filter((plan) => plan?.active === true && plan?.billing_period !== 'annual' && typeof plan.id === 'string' && Number.isSafeInteger(Number(plan.amount)) && Number(plan.amount) > 0)
            : [];
        if (!membershipPlans.some((plan) => plan.id === selectedMembershipPlanId)) selectedMembershipPlanId = membershipPlans[0]?.id || '';
        renderMembershipPlans();
        updateMembershipCheckout();

        const supabase = window.supabase;
        const { data: sessionData } = supabase?.auth?.getSession
            ? await supabase.auth.getSession()
            : { data: null };
        const token = sessionData?.session?.access_token;
        if (token) {
            try {
                const entitlements = await getJson('/api/my-entitlements', {
                    timeoutMs: 10000, headers: { Authorization: `Bearer ${token}` }
                });
                const current = entitlements?.membership;
                if (status) status.textContent = current?.plan_name || (entitlements?.is_premium ? 'Premium aktif' : 'Free');
                if (expiry) {
                    expiry.textContent = current?.status === 'active' && current?.expires_at
                        ? `Aktif sampai ${new Date(current.expires_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} · ${Number(current.days_remaining) || 0} hari tersisa`
                        : 'Anda menggunakan paket Free. Pilih Lite atau Pro untuk membuka akses berbayar.';
                }
            } catch (entitlementError) {
                if (status) status.textContent = 'Status keanggotaan belum dapat diverifikasi.';
                if (expiry) expiry.textContent = 'Katalog paket tersedia, tetapi status akun belum berhasil dimuat.';
                console.warn('[Monetization] Status entitlement tidak tersedia:', entitlementError?.message || entitlementError);
            }
            try {
                const access = await getJson('/api/feature-access', {
                    timeoutMs: 10000, headers: { Authorization: `Bearer ${token}` }
                });
                const trialButton = document.getElementById('membership-trial-button');
                const trialNote = document.getElementById('membership-trial-note');
                if (trialButton) {
                    trialButton.disabled = access?.trial?.eligible !== true;
                    trialButton.textContent = access?.trial?.claimed ? 'Free Trial sudah digunakan' : access?.trial?.eligible ? '🎁 Mulai Free Trial 7 Hari' : 'Free Trial tidak tersedia';
                    trialButton.style.opacity = trialButton.disabled ? '.55' : '1';
                }
                if (trialNote) {
                    trialNote.textContent = access?.trial?.claimed
                        ? `Trial telah digunakan${access.trial.expires_at ? ` · berakhir ${new Date(access.trial.expires_at).toLocaleDateString('id-ID')}` : ''}. Tidak ada perpanjangan otomatis.`
                        : 'Uji Pro selama 7 hari satu kali per akun. Tanpa metode pembayaran dan tanpa penagihan otomatis.';
                }
                const quotaHost = document.getElementById('membership-feature-quotas');
                if (quotaHost) {
                    const labels = { ai_analysis: 'Analisis AI resep', ai_tips: 'AI Tips', cloud_translation: 'Terjemahan online' };
                    quotaHost.replaceChildren();
                    if (access?.quota_configured !== true) {
                        quotaHost.textContent = 'Kuota fitur belum dikonfigurasi pada server.';
                    } else {
                        Object.entries(access?.features || {}).forEach(([key, value]) => {
                            const line = membershipNode('p', `${labels[key] || key}: ${value.unlimited ? 'Tanpa batas' : `${value.remaining} dari ${value.limit} tersisa · reset 07.00 WIB`}`);
                            Object.assign(line.style, { margin: '4px 0', fontSize: '.76rem', color: '#718096' });
                            quotaHost.append(line);
                        });
                    }
                }
            } catch (accessError) {
                console.warn('[Feature Access] Status kuota belum dapat dimuat:', accessError?.message || accessError);
                const quotaHost = document.getElementById('membership-feature-quotas');
                if (quotaHost) quotaHost.textContent = 'Kuota fitur belum dapat dimuat. Periksa konfigurasi server atau koneksi.';
                const trialButton = document.getElementById('membership-trial-button');
                if (trialButton) { trialButton.disabled = true; trialButton.textContent = 'Status Free Trial belum dapat diverifikasi'; }
            }
        } else {
            if (status) status.textContent = 'Free · Login untuk melihat status keanggotaan akun';
            if (expiry) expiry.textContent = 'Paket berbayar dapat dipilih setelah Anda masuk ke akun.';
            const trialButton = document.getElementById('membership-trial-button');
            if (trialButton) { trialButton.disabled = true; trialButton.textContent = 'Login untuk Free Trial'; }
            const trialNote = document.getElementById('membership-trial-note');
            if (trialNote) trialNote.textContent = 'Masuk ke akun untuk memeriksa kelayakan Free Trial.';
        }
        return true;
    } catch (error) {
        console.warn('[Monetization] Katalog/status keanggotaan belum dapat dimuat:', error?.message || error);
        if (host) host.replaceChildren(membershipNode('p', 'Paket belum dapat dimuat. Periksa koneksi lalu muat ulang profil.', 'log-empty'));
        if (status) status.textContent = 'Status keanggotaan belum dapat diverifikasi.';
        if (expiry) expiry.textContent = 'Tidak ada status Premium yang diasumsikan saat server tidak tersedia.';
        membershipPlans = [];
        selectedMembershipPlanId = '';
        updateMembershipCheckout();
        return false;
    } finally {
        if (host) host.setAttribute('aria-busy', 'false');
    }
}

window.pilihPaketKeanggotaan = pilihPaketKeanggotaan;
window.loadMembershipPackages = loadMembershipPackages;
window.startFreeTrial = startFreeTrial;
// [AI-GENERATED][MONETIZATION][V342-D] Refresh server-owned tier/quota/trial
// state when the existing Profile modal is opened after a sign-in transition.
document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element
        ? event.target.closest('[data-action="toggleModal"][data-arg="user-modal"]')
        : null;
    if (!trigger) return;
    window.setTimeout(() => {
        if (document.getElementById('user-modal')?.classList.contains('active')) {
            void loadMembershipPackages();
        }
    }, 0);
});
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { void loadMembershipPackages(); }, { once: true });
} else {
    void loadMembershipPackages();
}

// ==========================================================
// FUNGSI PAYMENT GATEWAY
// ==========================================================
async function mulaiTransaksiMidtrans() {
    const btnBayar = document.querySelector('.payment-checkout-container button[data-action="mulaiTransaksiMidtrans"]');
    const amountLabel = document.getElementById('pay-total-amount');
    const originalButtonText = btnBayar?.innerText || '💳 BAYAR SEKARANG';

    try {
        if (!isMidtransConfigured()) {
            const error = new Error('Client Key Midtrans belum dikonfigurasi pada meta midtrans-snap-config.');
            error.code = 'MIDTRANS_CONFIG_MISSING';
            throw error;
        }

        // [AI-GENERATED][SECURITY][V341] Require a verified Supabase session;
        // the browser never supplies a price or transaction identity.
        const supabase = window.supabase;
        if (!supabase?.auth?.getSession) {
            throw new Error('Layanan akun belum siap. Silakan login ulang lalu coba kembali.');
        }
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData?.session?.access_token) {
            throw new Error('Sesi login tidak ditemukan atau telah berakhir. Silakan login kembali.');
        }
        const accessToken = sessionData.session.access_token;
        const headers = { Authorization: `Bearer ${accessToken}` };

        if (btnBayar) {
            btnBayar.disabled = true;
            btnBayar.innerText = 'MEMUAT PAKET PREMIUM...';
        }

        const catalog = await getJson('/api/monetization-catalog', { timeoutMs: 10000 });
        const plan = Array.isArray(catalog?.plans) ? catalog.plans.find((item) => item?.active === true && item?.id === selectedMembershipPlanId) : null;
        if (!plan?.id || !Number.isSafeInteger(Number(plan.amount))) {
            throw new Error('Paket pilihan tidak lagi tersedia. Muat ulang daftar paket lalu pilih kembali.');
        }
        if (amountLabel) amountLabel.innerText = formatRupiah(plan.amount);

        if (btnBayar) btnBayar.innerText = 'MENYIAPKAN TRANSAKSI...';
        const data = await postJson('/api/create-payment-token', {
            plan_id: plan.id,
            customer_details: {
                first_name: localStorage.getItem('profile_name') || sessionData.session.user?.user_metadata?.full_name || 'Pelanggan',
                email: sessionData.session.user?.email || undefined
            }
        }, { timeoutMs: 20000, headers });
        if (!data?.token || !data?.order_id) throw new Error('Server tidak mengembalikan sesi pembayaran yang valid.');

        const midtransSnap = await loadMidtransSnap();
        if (document.getElementById('payment-modal')?.classList.contains('active')) {
            toggleModal('payment-modal');
        }

        midtransSnap.pay(data.token, {
            onSuccess: async () => {
                try {
                    const result = await getJson(`/api/payment-status?order_id=${encodeURIComponent(data.order_id)}`, { headers, timeoutMs: 10000 });
                    if (result?.order?.status === 'paid') {
                        alert('Pembayaran terverifikasi. Status Premium Anda sudah aktif.');
                    } else {
                        alert('Pembayaran berhasil di Midtrans dan sedang diverifikasi server. Status Premium akan aktif setelah notifikasi pembayaran terkonfirmasi.');
                    }
                } catch (_) {
                    alert('Pembayaran berhasil di Midtrans. Verifikasi status Premium sedang diproses server; silakan periksa kembali beberapa saat lagi.');
                }
            },
            onPending: () => alert('Pembayaran menunggu penyelesaian. Status akan diperbarui setelah Midtrans mengonfirmasi transaksi.'),
            onError: () => alert('Midtrans melaporkan pembayaran gagal. Silakan coba kembali.'),
            onClose: () => console.info('[Monetization] Popup pembayaran ditutup sebelum konfirmasi.')
        });
    } catch (error) {
        console.error('Kesalahan Transaksi Premium:', error?.code || error?.message || error);
        alert('Pembayaran Premium belum dapat disiapkan: ' + (error?.message || 'Terjadi kesalahan sistem.'));
    } finally {
        if (btnBayar) {
            btnBayar.disabled = false;
            btnBayar.innerText = originalButtonText;
        }
    }
}

window.filterDaftarBahasa = filterDaftarBahasa; // [AI-GENERATED][COMPATIBILITY][V262]
window.pilihBahasaGlobal = pilihBahasaGlobal; // [AI-GENERATED][COMPATIBILITY][V262]
window.mulaiTransaksiMidtrans = mulaiTransaksiMidtrans;

export { filterDaftarBahasa, loadMembershipPackages, mulaiTransaksiMidtrans, pilihBahasaGlobal, pilihPaketKeanggotaan }; // [AI-GENERATED][ES6 MODULE][V332]
