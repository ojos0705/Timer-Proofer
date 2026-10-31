// [AI-GENERATED][REFACTOR] ES6 feature module: onboarding and guided tour.
// Keeps the existing DOM contract and exposes only the legacy compatibility bridge needed by the app.
// [AI-GENERATED][ONBOARDING PREVIEW][V326] A query flag lets an existing
// authenticated user preview both onboarding screens without deleting the
// Supabase session or permanently changing the seen flags.
const ONBOARDING_PREVIEW_OPTIONS = (() => {
    let enabled = false;
    let reset = false;
    try {
        const params = new URLSearchParams(window.location.search);
        enabled = params.get('tp-onboarding-preview') === '1';
        reset = enabled && params.get('reset') === '1';
    } catch (_) {
        return { enabled: false };
    }
    if (reset) {
        // Reset only QA preview markers. Never clear the Supabase session or
        // the real first-visit flags stored in localStorage. Storage may be
        // unavailable in a restricted browser; the preview must still run.
        try { sessionStorage.removeItem('tp_onboarding_preview_done'); } catch (_) {}
        try { sessionStorage.removeItem('tp_welcome_preview_done'); } catch (_) {}
    }
    return { enabled };
})();
function onboardingPreviewRequested() {
    return ONBOARDING_PREVIEW_OPTIONS.enabled;
}
function isPreviewScreenActive(sessionKey) {
    if (!onboardingPreviewRequested()) return false;
    try { return sessionStorage.getItem(sessionKey) !== '1'; }
    catch (_) { return true; }
}

class OnboardingManager {
    constructor() {
        this.currentSlide = 0;
        this.totalSlides = 3;
        this.previewSessionKey = 'tp_onboarding_preview_done';

        this.screen = document.getElementById('onboarding-screen');
        this.track = document.getElementById('ob-slider-track');
        this.sliderWrapper = this.screen?.querySelector('.ob-slider-wrapper') || document.querySelector('.ob-slider-wrapper');
        this.dots = document.querySelectorAll('.ob-dot');
        this.swipePointerState = null;
        this.btnNext = document.getElementById('ob-btn-next');
        this.btnSkip = document.getElementById('ob-btn-skip');

        this.init();
    }

    init() {
        // Cek apakah pengguna sudah pernah melihat onboarding
        const hasSeenOnboarding = localStorage.getItem('tp_onboarding_seen');
        if (this.isPreviewActive() || !hasSeenOnboarding) {
            this.show();
        } else {
            this.hide();
        }

        this.bindEvents();
    }

    isPreviewActive() {
        return isPreviewScreenActive(this.previewSessionKey);
    }

    bindEvents() {
        if (this.btnNext) {
            this.btnNext.addEventListener('click', () => this.nextSlide());
        }

        if (this.btnSkip) {
            this.btnSkip.addEventListener('click', () => this.finish());
        }

        this.dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                const idx = Number.parseInt(e.target.dataset.index, 10);
                if (Number.isInteger(idx)) this.goToSlide(idx);
            });
        });

        this.bindSwipeEvents();
    }

    /**
     * [AI-GENERATED][MOBILE-UX][V324]
     * Enable horizontal swipe navigation on the pre-login onboarding slider.
     * touch-action: pan-y keeps native vertical gesture handling while allowing
     * Pointer Events to recognize horizontal movement without blocking taps.
     */
    bindSwipeEvents() {
        const wrapper = this.sliderWrapper;
        if (!wrapper || wrapper.dataset.tpSwipeBound === 'v324') return;
        wrapper.dataset.tpSwipeBound = 'v324';

        const begin = (event) => {
            if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
            if (event.target?.closest?.('button, a, input, select, textarea, [data-no-swipe]')) return;
            this.swipePointerState = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startedAt: Date.now()
            };
            try {
                if (event.pointerId !== undefined && wrapper.setPointerCapture) {
                    wrapper.setPointerCapture(event.pointerId);
                }
            } catch (_) {
                // Pointer capture is an enhancement; swipe still works without it.
            }
        };

        const finish = (event) => {
            const state = this.swipePointerState;
            if (!state) return;
            if (state.pointerId !== undefined && event.pointerId !== undefined
                && state.pointerId !== event.pointerId) return;

            this.swipePointerState = null;
            const deltaX = event.clientX - state.startX;
            const deltaY = event.clientY - state.startY;
            const elapsed = Math.max(1, Date.now() - state.startedAt);
            const horizontalDistance = Math.abs(deltaX);
            const horizontalDominant = horizontalDistance > Math.abs(deltaY) * 1.15;
            const fastEnough = horizontalDistance / elapsed >= 0.25;

            if (!horizontalDominant || (horizontalDistance < 44 && !fastEnough)) return;
            if (deltaX < 0) this.nextSlide();
            else this.previousSlide();
        };

        const cancel = () => { this.swipePointerState = null; };

        if ('PointerEvent' in window) {
            wrapper.addEventListener('pointerdown', begin, { passive: true });
            wrapper.addEventListener('pointerup', finish, { passive: true });
            wrapper.addEventListener('pointercancel', cancel, { passive: true });
            wrapper.addEventListener('lostpointercapture', cancel, { passive: true });
        } else {
            // Legacy WebView fallback. Only bind when Pointer Events are absent,
            // so a single physical gesture can never advance two slides.
            let touchStart = null;
            wrapper.addEventListener('touchstart', (event) => {
                const touch = event.changedTouches?.[0];
                if (!touch) return;
                touchStart = { x: touch.clientX, y: touch.clientY, at: Date.now() };
            }, { passive: true });
            wrapper.addEventListener('touchend', (event) => {
                if (!touchStart) return;
                const touch = event.changedTouches?.[0];
                const start = touchStart;
                touchStart = null;
                if (!touch) return;
                const deltaX = touch.clientX - start.x;
                const deltaY = touch.clientY - start.y;
                if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;
                if (deltaX < 0) this.nextSlide();
                else this.previousSlide();
            }, { passive: true });
            wrapper.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
        }
    }

    show() {
        if (this.screen) this.screen.classList.add('active');
    }

    hide() {
        if (this.screen) this.screen.classList.remove('active');
    }

    goToSlide(index) {
        const nextIndex = Number.isInteger(index)
            ? Math.min(this.totalSlides - 1, Math.max(0, index))
            : this.currentSlide;
        this.currentSlide = nextIndex;
        if (this.track) {
            this.track.style.transform = `translateX(-${this.currentSlide * 33.333}%)`;
        }

        // Update indikator titik
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentSlide);
        });

        // Ubah teks tombol di slide terakhir
        if (this.currentSlide === this.totalSlides - 1) {
            if (this.btnNext) this.btnNext.innerText = 'Masuk / Daftar';
            if (this.btnSkip) this.btnSkip.style.visibility = 'hidden';
        } else {
            if (this.btnNext) this.btnNext.innerText = 'Lanjutkan';
            if (this.btnSkip) this.btnSkip.style.visibility = 'visible';
        }
    }

    nextSlide() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.goToSlide(this.currentSlide + 1);
        } else {
            this.finish();
        }
    }

    previousSlide() {
        if (this.currentSlide > 0) this.goToSlide(this.currentSlide - 1);
    }

    finish() {
        if (this.isPreviewActive()) {
            try { sessionStorage.setItem(this.previewSessionKey, '1'); } catch (_) {}
        } else {
            localStorage.setItem('tp_onboarding_seen', 'true');
        }
        this.hide();
        // Catatan: form login (#auth-wrapper) tidak perlu dimunculkan manual di sini —
        // CSS "body.logged-out .auth-container" sudah otomatis menampilkannya
        // begitu overlay onboarding ini disembunyikan.
    }

    reset() {
        this.goToSlide(0);
        this.show();
    }
}

// Catatan: inisialisasi OnboardingManager & AppOnboardingManager dilakukan HANYA SEKALI,
// lewat startPreLoginFlow() di bagian bawah file — lihat guard __tpFlowStarted di sana.
// (Blok DOMContentLoaded terpisah yang dulu ada di sini dihapus karena menyebabkan
// setiap manager dibuat dua kali → listener klik & auto-slide welcome terpasang dobel.)

class AppOnboardingManager {
    constructor() {
        // Daftar Langkah Tour Interaktif
        this.tourSteps = [
            {
                element: '#location-section',
                title: '🌤️ Cuaca & Kalibrasi Adonan',
                description: 'Aplikasi memantau suhu dan kelembaban udara lokasi Anda untuk mengalkulasi durasi proofing ideal.',
                tab: 'home'
            },
            {
                element: '.timer-circle',
                title: '⏱️ Timer Proofing Presisi',
                description: 'Lingkaran waktu utama. Klik waktu di tengah untuk menyesuaikan durasi manual jika diperlukan.',
                tab: 'home'
            },
            {
                element: '.product-pills-container',
                title: '🍩 Mode Produk Dough',
                description: 'Pilih jenis adonan seperti Donat Bomboloni, Ring, Roti Manis, atau Pizza untuk profil timer khusus.',
                tab: 'home'
            },
            {
                element: '#tab-recipe',
                title: '📊 Kalkulator Resep & Baker\'s %',
                description: 'Buka menu ini untuk menghitung rasio tepung, jumlah porsi, dan HPP adonan secara otomatis.',
                tab: 'recipe'
            },
            {
                element: '#tab-tips',
                title: '💡 Solusi & Tips Adonan',
                description: 'Akses panduan lengkap penanganan masalah adonan bantat, overproof, atau penggorengan.',
                tab: 'tips'
            }
        ];

        this.currentSlide = 0;
        this.currentTourStep = 0;
        this.previewSessionKey = 'tp_welcome_preview_done';
        // [AI-GENERATED][ROBUSTNESS][V111] Own the delayed tour render so a stale
        // callback cannot mutate the UI after the tour advances or closes.
        this.tourRenderTimer = null;
        // [AI-GENERATED][ROBUSTNESS][V112] Own login-state observer/timers so
        // delayed login callbacks cannot fire after logout or repeated login.
        this.loginStateObserver = null;
        this.loginStateCheckTimer = null;
        this.lastLoginState = false;

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        // Welcome Screen Elements
        this.welcomeModal = document.getElementById('welcome-modal');
        this.sliderTrack = document.getElementById('welcome-slider-track');
        this.dots = document.querySelectorAll('.w-dot');
        this.btnStartTour = document.getElementById('btn-start-tour');
        this.btnSkipWelcome = document.getElementById('btn-skip-welcome');

        // App Tour Elements
        this.tourOverlay = document.getElementById('app-tour-overlay');
        this.tooltipCard = document.getElementById('tour-tooltip-card');
        this.stepBadge = document.getElementById('tour-step-badge');
        this.tourTitle = document.getElementById('tour-title');
        this.tourDesc = document.getElementById('tour-description');
        this.btnTourNext = document.getElementById('tour-btn-next');
        this.btnTourPrev = document.getElementById('tour-btn-prev');
        this.btnTourSkip = document.getElementById('tour-btn-skip');
    }

    bindEvents() {
        // Welcome Slider Dots Click
        this.dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                this.goToSlide(idx);
            });
        });
        this.bindWelcomeSwipeEvents();

        // Welcome Buttons
        if (this.btnStartTour) {
            this.btnStartTour.addEventListener('click', () => {
                this.closeWelcome();
                this.startTour();
            });
        }

        if (this.btnSkipWelcome) {
            this.btnSkipWelcome.addEventListener('click', () => {
                this.closeWelcome();
                this.setSeenStatus();
            });
        }

        // Tour Buttons
        if (this.btnTourNext) {
            this.btnTourNext.addEventListener('click', () => this.nextTourStep());
        }

        if (this.btnTourPrev) {
            this.btnTourPrev.addEventListener('click', () => this.prevTourStep());
        }

        if (this.btnTourSkip) {
            this.btnTourSkip.addEventListener('click', () => this.endTour());
        }

        // [AI-GENERATED][REFACTOR][V110] Auto-slide hanya aktif selama welcome
        // screen benar-benar tampil. Jangan membuat interval untuk pengguna yang
        // sudah pernah menyelesaikan welcome flow.
        // Pantau status login agar Welcome Screen muncul tepat setelah login
        this.watchLoginState();
    }

    bindWelcomeSwipeEvents() {
        const surface = this.welcomeModal?.querySelector('.welcome-slider-container');
        if (!surface || surface.dataset.tpSwipeBound === 'v326') return;
        surface.dataset.tpSwipeBound = 'v326';
        let start = null;
        const onStart = (event) => {
            if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
            start = { x: event.clientX, y: event.clientY, at: Date.now(), id: event.pointerId };
        };
        const onEnd = (event) => {
            if (!start || (start.id !== undefined && event.pointerId !== undefined && start.id !== event.pointerId)) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            const elapsed = Math.max(1, Date.now() - start.at);
            start = null;
            if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
            if (Math.abs(dx) / elapsed < 0.18 && Math.abs(dx) < 60) return;
            if (dx < 0) this.goToSlide(Math.min(2, this.currentSlide + 1));
            else this.goToSlide(Math.max(0, this.currentSlide - 1));
        };
        const onCancel = () => { start = null; };
        if ('PointerEvent' in window) {
            surface.addEventListener('pointerdown', onStart, { passive: true });
            surface.addEventListener('pointerup', onEnd, { passive: true });
            surface.addEventListener('pointercancel', onCancel, { passive: true });
        } else {
            surface.addEventListener('touchstart', (event) => {
                const touch = event.changedTouches?.[0];
                if (touch) start = { x: touch.clientX, y: touch.clientY, at: Date.now() };
            }, { passive: true });
            surface.addEventListener('touchend', (event) => {
                const touch = event.changedTouches?.[0];
                if (!touch || !start) return;
                onEnd({ clientX: touch.clientX, clientY: touch.clientY });
            }, { passive: true });
            surface.addEventListener('touchcancel', onCancel, { passive: true });
        }
    }

    isPreviewActive() {
        return isPreviewScreenActive(this.previewSessionKey);
    }

    /** --- LOGIKA WELCOME SCREEN --- */
    checkFirstVisit() {
        // [AI-GENERATED][ROBUSTNESS][V112] Re-check auth state at execution time,
        // not only when the delayed callback was scheduled. This prevents a stale
        // callback from opening Welcome after a fast logout.
        if (!document.body.classList.contains('logged-in')) return;

        const hasSeenWelcome = localStorage.getItem('tp_welcome_seen');
        if (this.isPreviewActive() || !hasSeenWelcome) {
            this.showWelcome();
        }
    }

    /**
     * Welcome Screen & Tour hanya relevan setelah pengguna login, karena target
     * tour (#location-section, .timer-circle, dsb) hanya tampil saat body.logged-in.
     * Fungsi ini menunggu transisi logged-out -> logged-in secara otomatis,
     * tanpa perlu diubah-ubah di setiap alur login (password, OTP, WhatsApp, dsb).
     */
    watchLoginState() {
        // [AI-GENERATED][ROBUSTNESS][V112] Rebinding must be idempotent.
        this.stopLoginStateWatch();

        const scheduleCheck = (delay) => {
            if (this.loginStateCheckTimer !== null) {
                clearTimeout(this.loginStateCheckTimer);
                this.loginStateCheckTimer = null;
            }

            this.loginStateCheckTimer = setTimeout(() => {
                this.loginStateCheckTimer = null;
                this.checkFirstVisit();
            }, delay);
        };

        this.lastLoginState = document.body.classList.contains('logged-in');

        if (this.lastLoginState) {
            // Sudah login sejak awal (mis. sesi tersimpan/refresh halaman)
            scheduleCheck(400);
            return;
        }

        if (!('MutationObserver' in window)) {
            // Fallback untuk WebView lama yang tidak mendukung MutationObserver
            scheduleCheck(1200);
            return;
        }

        const observer = new MutationObserver(() => {
            const isLoggedIn = document.body.classList.contains('logged-in');
            if (isLoggedIn === this.lastLoginState) return;
            this.lastLoginState = isLoggedIn;

            if (isLoggedIn) {
                scheduleCheck(400);
                return;
            }

            // [AI-GENERATED][ROBUSTNESS][V112] If logout happens while a delayed
            // Welcome/Tour flow is visible, tear down transient UI without marking
            // the onboarding as permanently completed. The next login may resume it.
            if (this.welcomeModal?.classList.contains('active') || this.tourOverlay?.classList.contains('active')) {
                this.closeWelcome();
                this.stopTourRenderTimer();
                document.querySelectorAll('.tour-highlighted-element').forEach(el => {
                    el.classList.remove('tour-highlighted-element');
                });
                this.tourOverlay?.classList.remove('active');
                this.tooltipCard?.classList.remove('active');
            }
        });

        this.loginStateObserver = observer;
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    stopLoginStateWatch() {
        // [AI-GENERATED][ROBUSTNESS][V112] Deterministic teardown for the auth
        // observer and its delayed check.
        if (this.loginStateObserver) {
            this.loginStateObserver.disconnect();
            this.loginStateObserver = null;
        }
        if (this.loginStateCheckTimer !== null) {
            clearTimeout(this.loginStateCheckTimer);
            this.loginStateCheckTimer = null;
        }
    }

    showWelcome() {
        if (this.welcomeModal) {
            this.welcomeModal.classList.add('active');
            // [AI-GENERATED][ROBUSTNESS][V110] Timer dimiliki oleh lifecycle
            // welcome overlay dan hanya berjalan ketika overlay terlihat.
            this.startWelcomeAutoSlide();
        }
    }

    closeWelcome() {
        if (this.welcomeModal) {
            this.welcomeModal.classList.remove('active');
        }
        // [AI-GENERATED][ROBUSTNESS][V110] Selalu teardown interval saat overlay
        // ditutup agar tidak ada background timer yang tertinggal.
        this.stopWelcomeAutoSlide();
    }

    setSeenStatus() {
        if (this.isPreviewActive()) {
            try { sessionStorage.setItem(this.previewSessionKey, '1'); } catch (_) {}
            return;
        }
        localStorage.setItem('tp_welcome_seen', 'true');
    }

    goToSlide(index) {
        this.currentSlide = index;
        if (this.sliderTrack) {
            this.sliderTrack.style.transform = `translateX(-${index * 33.333}%)`;
        }
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentSlide);
        });
    }

    startWelcomeAutoSlide() {
        // [AI-GENERATED][ROBUSTNESS][V107] Make timer registration idempotent.
        // Re-entering the welcome flow must never create multiple intervals.
        this.stopWelcomeAutoSlide();
        this.slideInterval = setInterval(() => {
            const next = (this.currentSlide + 1) % 3;
            this.goToSlide(next);
        }, 3500);
    }

    stopWelcomeAutoSlide() {
        // [AI-GENERATED][ROBUSTNESS][V107] Clear and invalidate the handle so
        // repeated start/stop cycles cannot retain a stale interval reference.
        if (this.slideInterval != null) {
            clearInterval(this.slideInterval);
            this.slideInterval = null;
        }
    }

    /** --- LOGIKA INTERACTIVE APP TOUR --- */
    startTour() {
        // Guard: jangan jalankan tour jika elemen inti belum siap (mis. DOM belum lengkap)
        if (!this.tourOverlay || !this.tooltipCard || this.tourSteps.length === 0) return;
        this.stopTourRenderTimer();
        this.currentTourStep = 0;
        this.tourOverlay.classList.add('active');
        this.tooltipCard.classList.add('active');
        this.renderTourStep();
    }

    renderTourStep() {
        const step = this.tourSteps[this.currentTourStep];
        if (!step || !this.tooltipCard) return;

        // Auto Switch Tab Aplikasi jika target berada di halaman berbeda
        this.switchAppTabIfNeeded(step.tab);

        // Hapus sorotan sebelumnya
        document.querySelectorAll('.tour-highlighted-element').forEach(el => {
            el.classList.remove('tour-highlighted-element');
        });

        // [AI-GENERATED][ROBUSTNESS][V111] Cancel any previous delayed render
        // before scheduling the next one. This prevents stale tour callbacks from
        // updating highlights/tooltips after a rapid next/skip/close action.
        this.stopTourRenderTimer();
        const scheduledStep = this.currentTourStep;
        this.tourRenderTimer = setTimeout(() => {
            this.tourRenderTimer = null;
            if (!this.tourOverlay?.classList.contains('active')) return;
            if (scheduledStep !== this.currentTourStep) return;

            const targetEl = document.querySelector(step.element);

            if (targetEl) {
                targetEl.classList.add('tour-highlighted-element');
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                this.positionTooltip(targetEl);
            }

            // Update Konten Tooltip (dengan guard null-safety)
            if (this.stepBadge) this.stepBadge.innerText = `Langkah ${this.currentTourStep + 1} dari ${this.tourSteps.length}`;
            if (this.tourTitle) this.tourTitle.innerText = step.title;
            if (this.tourDesc) this.tourDesc.innerText = step.description;

            // Kontrol Tombol Navigasi
            if (this.btnTourPrev) this.btnTourPrev.style.display = this.currentTourStep === 0 ? 'none' : 'inline-block';
            if (this.btnTourNext) this.btnTourNext.innerText = this.currentTourStep === this.tourSteps.length - 1 ? 'Selesai 🎉' : 'Lanjut ➔';
        }, 150);
    }

    stopTourRenderTimer() {
        // [AI-GENERATED][ROBUSTNESS][V111] Deterministic teardown for delayed
        // render work owned by the active tour instance.
        if (this.tourRenderTimer !== null) {
            clearTimeout(this.tourRenderTimer);
            this.tourRenderTimer = null;
        }
    }

    positionTooltip(targetEl) {
        if (!this.tooltipCard) return;
        const rect = targetEl.getBoundingClientRect();
        const tooltipHeight = this.tooltipCard.offsetHeight || 180;
        const viewportHeight = window.innerHeight;

        let topPos;
        let leftPos = Math.max(20, (window.innerWidth - 360) / 2); // Terpusat di layar HP max 480px

        // Posisikan di bawah atau di atas elemen target tergantung ruang yang tersedia
        if (rect.bottom + tooltipHeight + 20 < viewportHeight) {
            topPos = rect.bottom + 14; // Di bawah elemen
        } else {
            topPos = Math.max(20, rect.top - tooltipHeight - 14); // Di atas elemen
        }

        this.tooltipCard.style.top = `${topPos}px`;
        this.tooltipCard.style.left = `${leftPos}px`;
    }

    switchAppTabIfNeeded(tabName) {
        if (!tabName) return;
        
        // Memanggil handler tab navigasi bawaan index.html
        if (tabName === 'recipe') {
            const recipeBtn = document.getElementById('bottom-item-recipe');
            if (recipeBtn) recipeBtn.click();
        } else if (tabName === 'tips') {
            const tipsBtn = document.getElementById('bottom-item-tips');
            if (tipsBtn) tipsBtn.click();
        } else if (tabName === 'home') {
            const homeBtn = document.querySelector('.bottom-item:first-child');
            if (homeBtn) homeBtn.click();
        }
    }

    nextTourStep() {
        if (this.currentTourStep < this.tourSteps.length - 1) {
            this.currentTourStep++;
            this.renderTourStep();
        } else {
            this.endTour();
        }
    }

    prevTourStep() {
        if (this.currentTourStep > 0) {
            this.currentTourStep--;
            this.renderTourStep();
        }
    }

    endTour() {
        // [AI-GENERATED][ROBUSTNESS][V111] Cancel pending render before hiding
        // the tour so no delayed callback can mutate a closed overlay.
        this.stopTourRenderTimer();

        // Hapus highlight
        document.querySelectorAll('.tour-highlighted-element').forEach(el => {
            el.classList.remove('tour-highlighted-element');
        });

        // Sembunyikan Overlay & Card
        if (this.tourOverlay) this.tourOverlay.classList.remove('active');
        if (this.tooltipCard) this.tooltipCard.classList.remove('active');

        // Kembalikan ke Tab Utama
        this.switchAppTabIfNeeded('home');

        // Simpan status agar tidak otomatis muncul lagi
        this.setSeenStatus();
    }
}

// [AI-GENERATED][REFACTOR] Compatibility bridge for existing settings/help actions.
function restartAppTour() {
    if (window.appOnboarding) {
        window.appOnboarding.startTour();
    }
}
window.restartAppTour = restartAppTour;

// INISIALISASI UTAMA SAAT APLIKASI DIBUKA
function startPreLoginFlow() {
    // Guard: pastikan alur ini hanya dijalankan SATU KALI walau terpanggil dari
    // lebih dari satu jalur (mis. race antara readyState check & event listener),
    // agar tidak ada listener/timer/observer yang terpasang dobel.
    if (window.__tpFlowStarted) return;
    window.__tpFlowStarted = true;

    // 1. Inisialisasi Onboarding Walkthrough (Tampil sebelum login)
    window.appOnboardingWalkthrough = new OnboardingManager();

    // 2. Inisialisasi Interactive Tour + Welcome Screen (otomatis menunggu status login)
    window.appOnboarding = new AppOnboardingManager();
}

// Jalankan otomatis saat DOM siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPreLoginFlow);
} else {
    startPreLoginFlow();
}

// [AI-GENERATED][REFACTOR] Named exports keep the feature testable without relying on window globals.
export { OnboardingManager, AppOnboardingManager, restartAppTour, startPreLoginFlow };
