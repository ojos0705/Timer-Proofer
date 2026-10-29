        // =========================================================================
// LETAKKAN ENGINE GOOGLE TRANSLATE DI SINI, TEPAT SEBELUM
// =========================================================================
    // 1. Inisialisasi Google Translate
    function patchGoogleTranslateSelect() {
        var selects = document.querySelectorAll('select.goog-te-combo');
        if (!selects.length) return false;
        selects.forEach(function(googleSelect) {
            if (!googleSelect.id) googleSelect.id = 'google-translate-language';
            if (!googleSelect.name) googleSelect.name = 'googtrans';
        });
        return true;
    }

    function googleTranslateElementInit() {
        new google.translate.TranslateElement({
            pageLanguage: 'id',
            autoDisplay: false
        }, 'google_translate_element');

        if (!patchGoogleTranslateSelect()) {
            var observer = new MutationObserver(function() {
                if (patchGoogleTranslateSelect()) observer.disconnect();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // 2. Kontrol Modal WhatsApp
    window.bukaModalBahasa = function() {
        const modal = document.getElementById('whatsapp-language-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            modal.removeAttribute('inert');
            document.body.style.overflow = 'hidden';
        }
    };

    window.tutupModalBahasa = function() {
        const modal = document.getElementById('whatsapp-language-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('inert', '');
            document.body.style.overflow = '';
            setTimeout(() => { modal.style.display = 'none'; }, 50);
        }
    };

    // 3. Helper Google Translate — cadangan ONLINE untuk bahasa yang belum punya paket offline ----------
    function gtLoadScript() {
        if (document.getElementById('gt-element-script')) return;
        var s = document.createElement('script');
        s.id = 'gt-element-script';
        s.async = true;
        s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        s.onerror = function() { console.warn('Library Google Translate gagal dimuat'); };
        document.head.appendChild(s);
    }

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
            var P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences;
            if (P) P.set({ key: 'app_lang', value: kode });
        } catch (e) {}
    }
    function bahasaLabel(teks) { var el = document.getElementById('label-bahasa-aktif'); if (el) el.innerText = teks; }
    function bahasaTunda(kode, nama) { localStorage.setItem('user_lang_pending', JSON.stringify({ code: kode, name: nama })); }

    // 5. Pemilihan bahasa ---------------------------------------------------------------------------------
    // Urutan: (A) Indonesia -> (B) paket OFFLINE (instan, tanpa internet) -> (C) tanpa internet: ingat pilihan,
    // terapkan otomatis saat online -> (D) online: Google Translate.
    var bahasaSibuk = false;

    window.pilihBahasaGlobal = async function(kodeBahasa, namaBahasa) {
        if (bahasaSibuk) return;                              // cegah klik ganda saat proses berjalan
        bahasaSibuk = true;
        var O = window.OfflineI18n;
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
            gtLoadScript();
            var combo = await gtWaitCombo(10000);
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
    };

    // 6. Auto-restore bahasa saat aplikasi dibuka ulang -------------------------------------------------
    window.addEventListener('load', function() {
        var savedLang = localStorage.getItem('user_lang_preference');
        if (!savedLang || savedLang === 'id') return;
        var savedName = localStorage.getItem('user_lang_name');
        var resolved  = localStorage.getItem('user_lang_resolved') || savedLang;
        var O = window.OfflineI18n;

        var labelAktif = document.getElementById('label-bahasa-aktif');
        if (labelAktif && savedName) labelAktif.innerText = savedName + " (Aktif)";

        // Mesin offline menerapkan bahasa tersimpan sendiri saat startup; di sini hanya menentukan cadangannya
        var siapOffline = (O && O.hasPack(savedLang)) ? O.whenReady() : Promise.resolve(false);
        siapOffline.then(function(ok) {
            if (ok) { gtClearCookie(); return; }
            if (navigator.onLine) {
                // element.js membaca cookie googtrans saat init lalu menerjemahkan otomatis
                if (!adaCookieGoogle()) gtSetCookie(resolved);
                gtLoadScript();
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
            if (p && p.code) window.pilihBahasaGlobal(p.code, p.name || p.code);
        } catch (e) { localStorage.removeItem('user_lang_pending'); }
    });

    function filterDaftarBahasa() {
    const input = document.getElementById('input-cari-bahasa');
    const filter = input.value.toLowerCase().trim();
    const container = document.getElementById('list-pilihan-bahasa');
    const items = container.getElementsByClassName('lang-item');

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const textValue = item.textContent || item.innerText;
        const dataName = item.getAttribute('data-name') || '';

        // Cocokkan teks pada elemen atau atribut data-name
        if (textValue.toLowerCase().indexOf(filter) > -1 || dataName.indexOf(filter) > -1) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    }
}

// ==========================================================
// FUNGSI PAYMENT GATEWAY
// ==========================================================
async function mulaiTransaksiMidtrans() {
    try {
        // 1. Tampilkan indikator loading / ubah teks tombol
        const btnBayar = document.querySelector('.payment-checkout-container button');
        if (btnBayar) {
            btnBayar.disabled = true;
            btnBayar.innerText = "MENYIAPKAN TRANSAKSI...";
        }

        // 2. Kirim permintaan ke backend dengan payload lengkap
        let response = await fetch('/api/create-payment-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                order_id: 'ORDER-' + Date.now(),
                gross_amount: 50000,
                customer_details: {
                    first_name: localStorage.getItem('profile_name') || 'Pelanggan',
                    email: localStorage.getItem('profile_email') || 'user@domain.com'
                }
            })
        });

        // 3. Cek jika server mengembalikan error HTTP (misal: 404 Not Found atau 500)
        if (!response.ok) {
            let errorText = await response.text();
            throw new Error(`Server error ${response.status}: ${errorText.substring(0, 100)}`);
        }

        let data = await response.json();
        if (!data.token) throw new Error("Gagal menghasilkan token pembayaran dari server.");

        // 4. Tutup modal checkout lokal aplikasi terlebih dahulu
        if (typeof toggleModal === 'function') {
            toggleModal('payment-modal'); // Sesuaikan dengan ID modal Anda
        }

        // 5. Panggil Midtrans Snap Popup menggunakan token yang diterima
        window.snap.pay(data.token, {
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
window.filterDaftarBahasa = filterDaftarBahasa;
window.mulaiTransaksiMidtrans = mulaiTransaksiMidtrans;

export { googleTranslateElementInit, filterDaftarBahasa, mulaiTransaksiMidtrans };
