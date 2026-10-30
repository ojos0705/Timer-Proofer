import { syncModalBodyScrollLock } from './modal-bootstrap.js?v=20261030-v326'; // [AI-GENERATED][ES6 MODULE IDENTITY][V270]
import { NativeCapacitorService } from './native-capacitor-service.js';
import { toggleModal } from './modal.js';
import { postJson } from './api-client-service.js';
import { isMidtransConfigured, loadMidtransSnap } from './midtrans-runtime.js';
import { googleTranslateElementInit, loadGoogleTranslateWidget } from './google-translate-runtime.js';
import { OfflineI18n } from './offline-i18n.js'; // [AI-GENERATED][ES6 MODULE][V261]
import { filterDaftarBahasa } from './language-list-service.js'; // [AI-GENERATED][ES6 MODULE][V262]
    // 2. Kontrol Modal WhatsApp
    // [AI-GENERATED][ROBUSTNESS][V120] Own the delayed language-modal hide so
    // a rapid reopen cannot be undone by an older close callback.
    let bahasaModalCloseTimer = null;

    window.bukaModalBahasa = function() {
        const modal = document.getElementById('whatsapp-language-modal');
        if (modal) {
            clearTimeout(bahasaModalCloseTimer);
            bahasaModalCloseTimer = null;
            // [AI-GENERATED][NAV FIX][V308] Use canonical modal navigation.
            toggleModal('whatsapp-language-modal');
        }
    };

    window.tutupModalBahasa = function() {
        clearTimeout(bahasaModalCloseTimer);
        bahasaModalCloseTimer = null;
        const modal = document.getElementById('whatsapp-language-modal');
        if (modal?.classList.contains('active')) toggleModal('whatsapp-language-modal');
    };

    // [AI-GENERATED][ES6 MODULE][V260] The vendor-script callback and retry logic live in google-translate-runtime.js.
    function gtGetCombo() { return document.querySelector('select.goog-te-combo'); }

    function gtWaitCombo(timeoutMs) {
        return new Promise(function(resolve) {
            var t0 = Date.now();
            (function poll() {
                var c = gtGetCombo();
                if (c && c.options.length > 1) return resolve(c);
                if (Date.now() - t0 > timeoutMs) return resolve(null);
                setTimeout(poll, 200);
            })();
        });
    }

    // Cocokkan kode bahasa dengan daftar yang benar-benar didukung widget Google (mis. 'fr-CA' -> 'fr')
    function gtResolveCode(combo, code) {
        var vals = Array.prototype.map.call(combo.options, function(o) { return o.value; });
        if (vals.indexOf(code) > -1) return code;
        var base = String(code).split('-')[0];
        if (vals.indexOf(base) > -1) return base;
        return null;
    }

    function gtSetCookie(code) {
        var v = 'googtrans=/id/' + code + '; path=/';
        document.cookie = v;
        // atribut domain tidak valid untuk 'localhost' (XAMPP) / IP, jadi hanya untuk host bertitik
        if (location.hostname.indexOf('.') > -1 && !/^\d+\.\d+\.\d+\.\d+$/.test(location.hostname)) {
            document.cookie = v + '; domain=' + location.hostname;
        }
    }

    function gtClearCookie() {
        var exp = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        document.cookie = exp;
        document.cookie = exp + '; domain=' + location.hostname;
        document.cookie = exp + '; domain=.' + location.hostname;
    }

    function adaCookieGoogle() { return /(^|;\s*)googtrans=/.test(document.cookie); }

    // 4. Penyimpanan pilihan bahasa -------------------------------------------------------------------
    function bahasaSimpan(kode, nama, resolved, mode) {
        localStorage.removeItem('user_lang_pending');
        localStorage.setItem('app_lang', kode);
        localStorage.setItem('user_lang_preference', kode);
        localStorage.setItem('user_lang_resolved', resolved || kode);
        localStorage.setItem('user_lang_name', nama);
        localStorage.setItem('user_lang_mode', mode);          // 'source' | 'offline' | 'google'
        try {
            var P = NativeCapacitorService.getPlugin('Preferences');
            if (NativeCapacitorService.isNativePlatform() && P?.set) P.set({ key: 'app_lang', value: kode });
        } catch (e) {}
    }
    function bahasaLabel(teks) { var el = document.getElementById('label-bahasa-aktif'); if (el) el.innerText = teks; }
    function bahasaTunda(kode, nama) { localStorage.setItem('user_lang_pending', JSON.stringify({ code: kode, name: nama })); }

    // 5. Pemilihan bahasa ---------------------------------------------------------------------------------
    // Urutan: (A) Indonesia -> (B) paket OFFLINE (instan, tanpa internet) -> (C) tanpa internet: ingat pilihan,
    // terapkan otomatis saat online -> (D) online: Google Translate.
    var bahasaSibuk = false;

    async function pilihBahasaGlobal(kodeBahasa, namaBahasa) {
        if (bahasaSibuk) return;                              // cegah klik ganda saat proses berjalan
        bahasaSibuk = true;
        var O = OfflineI18n;
        var labelEl = document.getElementById('label-bahasa-aktif');
        var labelLama = labelEl ? labelEl.innerText : '';
        var bahasaSebelumnya = localStorage.getItem('user_lang_preference');

        // Bila jalur gagal setelah tampilan dikembalikan ke Indonesia, pulihkan bahasa offline sebelumnya
        async function pulihkan() {
            bahasaLabel(labelLama);
            if (O && bahasaSebelumnya && bahasaSebelumnya !== 'id' && O.hasPack(bahasaSebelumnya)) { await O.apply(bahasaSebelumnya); }
        }

        try {
            // A. Bahasa sumber (Indonesia)
            if (kodeBahasa === 'id') {
                var adaGoogleId = adaCookieGoogle();
                gtClearCookie();
                bahasaSimpan('id', namaBahasa, 'id', 'source');
                if (O) O.reset();
                if (typeof window.setLanguage === 'function') window.setLanguage('id');
                bahasaLabel(namaBahasa + " (Aktif)");
                tutupModalBahasa();
                if (adaGoogleId) setTimeout(function() { window.location.reload(); }, 200);
                return;
            }

            var punyaPaket = !!(O && O.hasPack(kodeBahasa));

            // B. Paket bahasa lokal: instan & berfungsi OFFLINE
            if (punyaPaket) {
                bahasaLabel("Memuat bahasa…");
                tutupModalBahasa();
                var berhasil = await O.apply(kodeBahasa);
                if (berhasil) {
                    var adaGoogle = adaCookieGoogle();
                    gtClearCookie();                          // cegah terjemahan ganda oleh Google
                    bahasaSimpan(kodeBahasa, namaBahasa, O.current(), 'offline');
                    if (typeof window.setLanguage === 'function') window.setLanguage(kodeBahasa);
                    bahasaLabel(namaBahasa + " (Aktif)");
                    // sisa terjemahan Google di DOM hanya bisa dibersihkan lewat reload
                    if (adaGoogle) setTimeout(function() { window.location.reload(); }, 200);
                    return;
                }
                bahasaLabel(labelLama);                       // paket gagal dimuat -> coba jalur berikutnya
            }

            // C. Tidak ada paket yang bisa dipakai DAN tidak ada internet
            if (!navigator.onLine || (punyaPaket && O && O.lastError() === 'network')) {
                bahasaTunda(kodeBahasa, namaBahasa);          // diterapkan otomatis saat online lagi
                tutupModalBahasa();
                alert(punyaPaket
                    ? "Paket bahasa ini belum diunduh ke perangkat. Sambungkan internet sekali; pilihan Anda akan diterapkan otomatis."
                    : "Bahasa ini belum tersedia offline. Pilihan Anda akan diterapkan otomatis saat perangkat online.");
                return;
            }

            // D. Online: Google Translate
            bahasaLabel("Memuat terjemahan…");
            tutupModalBahasa();
            if (O) O.reset();                                 // Google harus menerjemahkan dari teks asli (Indonesia)
            var gtLoadStartedAt = Date.now();
            try { await loadGoogleTranslateWidget({ timeoutMs: 10000 }); }
            catch (loadError) { console.warn('[LanguageEngine] Google Translate belum siap:', loadError); }
            var combo = await gtWaitCombo(Math.max(0, 10000 - (Date.now() - gtLoadStartedAt)));
            if (!combo) {
                bahasaTunda(kodeBahasa, namaBahasa);
                await pulihkan();
                alert("Mesin penerjemah gagal dimuat. Periksa koneksi internet lalu coba lagi.");
                return;
            }
            var kodeGoogle = gtResolveCode(combo, kodeBahasa);
            if (!kodeGoogle) {
                await pulihkan();
                alert('Bahasa "' + namaBahasa + '" belum didukung oleh mesin penerjemah otomatis. Silakan pilih bahasa lain.');
                return;
            }

            // Simpan pilihan HANYA setelah bahasa terbukti didukung
            bahasaSimpan(kodeBahasa, namaBahasa, kodeGoogle, 'google');
            if (typeof window.setLanguage === 'function') window.setLanguage(kodeBahasa);
            bahasaLabel(namaBahasa + " (Aktif)");
            gtSetCookie(kodeGoogle);                          // cookie agar bertahan saat reload
            combo.value = kodeGoogle;                         // terapkan langsung tanpa reload
            combo.dispatchEvent(new Event('change'));

        } catch (error) {
            console.error("Gagal mengubah bahasa:", error);
            try { await pulihkan(); } catch (e) {}
            alert("Gagal memuat mesin penerjemah. Pastikan perangkat terhubung ke internet.");
        } finally {
            bahasaSibuk = false;
        }
    }

    // [AI-GENERATED][ES6 MODULE][V262] Internal listeners call the lexical module binding.
    // The global assignment below remains a compatibility bridge for legacy callers.

    // 6. Auto-restore bahasa saat aplikasi dibuka ulang -------------------------------------------------
    window.addEventListener('load', function() {
        var savedLang = localStorage.getItem('user_lang_preference');
        if (!savedLang || savedLang === 'id') return;
        var savedName = localStorage.getItem('user_lang_name');
        var resolved  = localStorage.getItem('user_lang_resolved') || savedLang;
        var O = OfflineI18n;

        var labelAktif = document.getElementById('label-bahasa-aktif');
        if (labelAktif && savedName) labelAktif.innerText = savedName + " (Aktif)";

        // Mesin offline menerapkan bahasa tersimpan sendiri saat startup; di sini hanya menentukan cadangannya
        var siapOffline = (O && O.hasPack(savedLang)) ? O.whenReady() : Promise.resolve(false);
        siapOffline.then(function(ok) {
            if (ok) { gtClearCookie(); return; }
            if (navigator.onLine) {
                // element.js membaca cookie googtrans saat init lalu menerjemahkan otomatis
                if (!adaCookieGoogle()) gtSetCookie(resolved);
                void loadGoogleTranslateWidget().catch(function(error) {
                    console.warn('[LanguageEngine] Pemulihan Google Translate tertunda:', error);
                });
            } else {
                bahasaTunda(savedLang, savedName || savedLang);   // offline & belum ada paket -> tunda sampai online
            }
        });
    });

    // 7. Pilihan yang tertunda karena offline -> terapkan saat internet kembali -----------------------------
    window.addEventListener('online', function() {
        var raw = localStorage.getItem('user_lang_pending');
        if (!raw) return;
        try {
            var p = JSON.parse(raw);
            if (p && p.code) pilihBahasaGlobal(p.code, p.name || p.code);
        } catch (e) { localStorage.removeItem('user_lang_pending'); }
    });

    // [AI-GENERATED][ES6 MODULE][V262] Search behavior is owned by language-list-service.js.

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

window.googleTranslateElementInit = googleTranslateElementInit;
window.filterDaftarBahasa = filterDaftarBahasa; // [AI-GENERATED][COMPATIBILITY][V262]
window.pilihBahasaGlobal = pilihBahasaGlobal; // [AI-GENERATED][COMPATIBILITY][V262]
window.mulaiTransaksiMidtrans = mulaiTransaksiMidtrans;

export { googleTranslateElementInit, filterDaftarBahasa, mulaiTransaksiMidtrans, pilihBahasaGlobal }; // [AI-GENERATED][ES6 MODULE][V262]
