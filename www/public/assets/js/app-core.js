/**
 * TIMER PROOFER - WELCOME SCREEN & INTERACTIVE TOUR CONTROLLER
 * Cross-Platform Architecture (Android, iOS, Samsung, Huawei, PWA)
 */
class OnboardingManager {
    constructor() {
        this.currentSlide = 0;
        this.totalSlides = 3;

        this.screen = document.getElementById('onboarding-screen');
        this.track = document.getElementById('ob-slider-track');
        this.dots = document.querySelectorAll('.ob-dot');
        this.btnNext = document.getElementById('ob-btn-next');
        this.btnSkip = document.getElementById('ob-btn-skip');

        this.init();
    }

    init() {
        // Cek apakah pengguna sudah pernah melihat onboarding
        const hasSeenOnboarding = localStorage.getItem('tp_onboarding_seen');
        if (!hasSeenOnboarding) {
            this.show();
        } else {
            this.hide();
        }

        this.bindEvents();
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
                const idx = parseInt(e.target.dataset.index);
                this.goToSlide(idx);
            });
        });
    }

    show() {
        if (this.screen) this.screen.classList.add('active');
    }

    hide() {
        if (this.screen) this.screen.classList.remove('active');
    }

    goToSlide(index) {
        this.currentSlide = index;
        if (this.track) {
            this.track.style.transform = `translateX(-${index * 33.333}%)`;
        }

        // Update indikator titik
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        // Ubah teks tombol di slide terakhir
        if (this.currentSlide === this.totalSlides - 1) {
            this.btnNext.innerText = 'Masuk / Daftar';
            if (this.btnSkip) this.btnSkip.style.visibility = 'hidden';
        } else {
            this.btnNext.innerText = 'Lanjutkan';
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

    finish() {
        localStorage.setItem('tp_onboarding_seen', 'true');
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
                element: '#bottom-item-recipe',
                title: '📊 Kalkulator Resep & Baker\'s %',
                description: 'Buka menu ini untuk menghitung rasio tepung, jumlah porsi, dan HPP adonan secara otomatis.',
                tab: 'recipe'
            },
            {
                element: '#bottom-item-tips',
                title: '💡 Solusi & Tips Adonan',
                description: 'Akses panduan lengkap penanganan masalah adonan bantat, overproof, atau penggorengan.',
                tab: 'tips'
            }
        ];

        this.currentSlide = 0;
        this.currentTourStep = 0;

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

        // Handle Auto-slide pada Welcome
        this.startWelcomeAutoSlide();

        // Pantau status login agar Welcome Screen muncul tepat setelah login
        this.watchLoginState();
    }

    /** --- LOGIKA WELCOME SCREEN --- */
    checkFirstVisit() {
        const hasSeenWelcome = localStorage.getItem('tp_welcome_seen');
        if (!hasSeenWelcome) {
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
        if (document.body.classList.contains('logged-in')) {
            // Sudah login sejak awal (mis. sesi tersimpan/refresh halaman)
            setTimeout(() => this.checkFirstVisit(), 400);
            return;
        }

        if (!('MutationObserver' in window)) {
            // Fallback untuk WebView lama yang tidak mendukung MutationObserver
            setTimeout(() => this.checkFirstVisit(), 1200);
            return;
        }

        const observer = new MutationObserver(() => {
            if (document.body.classList.contains('logged-in')) {
                observer.disconnect();
                setTimeout(() => this.checkFirstVisit(), 400);
            }
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    showWelcome() {
        if (this.welcomeModal) {
            this.welcomeModal.classList.add('active');
        }
    }

    closeWelcome() {
        if (this.welcomeModal) {
            this.welcomeModal.classList.remove('active');
        }
        this.stopWelcomeAutoSlide();
    }

    setSeenStatus() {
        localStorage.setItem('tp_welcome_seen', 'true');
    }

    goToSlide(index) {
        this.currentSlide = index;
        if (this.sliderTrack) {
            this.sliderTrack.style.transform = `translateX(-${index * 33.333}%)`;
        }
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    startWelcomeAutoSlide() {
        this.slideInterval = setInterval(() => {
            let next = (this.currentSlide + 1) % 3;
            this.goToSlide(next);
        }, 3500);
    }

    stopWelcomeAutoSlide() {
        if (this.slideInterval) {
            clearInterval(this.slideInterval);
        }
    }

    /** --- LOGIKA INTERACTIVE APP TOUR --- */
    startTour() {
        // Guard: jangan jalankan tour jika elemen inti belum siap (mis. DOM belum lengkap)
        if (!this.tourOverlay || !this.tooltipCard || this.tourSteps.length === 0) return;
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

        // Beri waktu sejenak agar UI render / tab switch selesai
        setTimeout(() => {
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

// Fungsi Global untuk Memanggil Ulang Tour dari Menu Help / Settings
// HELPER TOUR DASHBOARD
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

// ============================================================
// KUMPULAN FUNGSI — DIKELOMPOKKAN BERDASARKAN FITUR/MODUL
// (Deklarasi function di-hoist JS, jadi urutannya di sini aman
// diubah tanpa memengaruhi perilaku aplikasi.)
// ============================================================
// ============================================================
// MODUL GAMIFIKASI — terhubung Supabase + cache offline
// Satu-satunya sumber kebenaran untuk XP, Level, Koin, Streak, Lencana & Misi Harian.
// Tabel Supabase: user_gamification, user_badges, user_quests (lihat supabase_gamification.sql)
//
// Prinsip desain:
//  - Offline-first : semua perubahan langsung tampil & disimpan di localStorage (per user).
//  - Delta-based   : XP/Koin yang belum tersinkron dicatat sebagai "pending", lalu DITAMBAHKAN
//                    ke nilai terbaru di server (bukan menimpa) -> aman dipakai multi-perangkat.
//  - Idempoten     : init() aman dipanggil berkali-kali (satu proses per user).
//  - Tidak crash   : kegagalan jaringan/tabel tidak pernah mematikan aplikasi.
// ============================================================
const GamificationModule = {
  supabase: null,
  userId: null,
  ready: false,
  state: null,
  pending: null,
  _fresh: false,
  _initKey: null,
  _initPromise: null,
  _flushPromise: null,
  _flushAgain: false,
  _flushTimer: null,
  _bound: false,

  XP_PER_LEVEL: 100,

  REWARDS: {
    recipe:   { xp: 25, coins: 10 },
    proofing: { xp: 10, coins: 5 },
    checkin:  { xp: 15, coins: 20 }
  },

  QUESTS: [
    { id: 'daily_recipe',   icon: '🍩', text: 'Buat/simpan minimal 1 resep baru',                event: 'recipe',   xp: 20, coins: 10 },
    { id: 'daily_proofing', icon: '⏳', text: '<strong>Time-Attack:</strong> Jalankan timer proofing', event: 'proofing', xp: 10, coins: 10 }
  ],

  BADGES: [
    { id: 'kneading_master', icon: '🥖', name: 'Kneading Master', desc: 'Simpan 3 Resep',                 test: c => c.recipes >= 3 },
    { id: 'golden_crust',    icon: '🥐', name: 'Golden Crust',    desc: 'Selesaikan 5 Proofing',          test: c => c.proofings >= 5 },
    { id: 'rise_of_yeast',   icon: '🦠', name: 'Rise of Yeast',   desc: 'Selesaikan 15 Proofing',         test: c => c.proofings >= 15 },
    { id: 'head_baker',      icon: '👨\u200d🍳', name: 'Head Baker',      desc: 'Capai Level 26',                 test: c => c.level >= 26 },
    { id: 'streak_7',        icon: '🔥', name: 'Streak 7 Hari',   desc: 'Buka aplikasi 7 hari beruntun',  test: c => c.streak >= 7 }
  ],

  // ---------- Util ----------
  _defaultState() {
    return { xp: 0, level: 1, coins: 0, streak_days: 0, last_active_date: null, badges: [], quests: [] };
  },
  _defaultPending() {
    return { xp: 0, coins: 0, quests: [], badges: [] };
  },
  // Tanggal LOKAL (bukan UTC) agar pergantian hari mengikuti jam perangkat (mis. WIB, UTC+7)
  _dateKey(d = new Date()) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  _daysBetween(a, b) {
    const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
  },
  _canSync() {
    return !!(this.supabase && this.userId && navigator.onLine !== false);
  },
  _counts() {
    let recipes = 0, proofings = 0;
    try { if (typeof readRecipesFromStorage === 'function') recipes = (readRecipesFromStorage() || []).length; } catch (_) {}
    try { if (typeof readProofingLogsFromStorage === 'function') proofings = (readProofingLogsFromStorage() || []).length; } catch (_) {}
    return { recipes, proofings };
  },
  _notify(msg) {
    try { if (typeof showToast === 'function') showToast(msg, 3200); } catch (_) {}
  },

  calculateLevel(xp) {
    return Math.floor(Math.max(0, xp) / this.XP_PER_LEVEL) + 1;
  },
  // XP kumulatif yang dibutuhkan untuk MENCAPAI level berikutnya
  calculateTargetXP(level) {
    return level * this.XP_PER_LEVEL;
  },
  getRankInfo(level) {
    if (level <= 10) return { title: 'Apprentice Baker' };
    if (level <= 25) return { title: 'Assistant Baker' };
    if (level <= 45) return { title: 'Head Baker' };
    return { title: 'Executive Pastry Chef' };
  },

  // ---------- Cache lokal ----------
  _cacheKey() { return 'tp_gami_v1_' + (this.userId || 'local'); },
  _saveCache() {
    try { localStorage.setItem(this._cacheKey(), JSON.stringify({ state: this.state, pending: this.pending })); } catch (_) {}
  },
  _loadCache() {
    let found = false;
    this.state = this._defaultState();
    this.pending = this._defaultPending();
    try {
      const raw = localStorage.getItem(this._cacheKey());
      if (raw) {
        const c = JSON.parse(raw);
        this.state = Object.assign(this._defaultState(), c.state || {});
        this.pending = Object.assign(this._defaultPending(), c.pending || {});
        found = true;
      }
    } catch (_) {}
    const today = this._dateKey();
    this.state.quests = (this.state.quests || []).filter(q => q.quest_date === today);
    this.state.level = this.calculateLevel(this.state.xp);
    return found;
  },

  // ---------- Siklus hidup ----------
  init(supabaseClient, userId) {
    if (!supabaseClient || !userId) return Promise.resolve();
    if (this._initKey === userId && this._initPromise) return this._initPromise;
    this._initKey = userId;
    this.supabase = supabaseClient;
    this.userId = userId;
    this._bindLifecycle();
    this._initPromise = this._doInit().catch(err => console.error('Gagal inisialisasi gamifikasi:', err));
    return this._initPromise;
  },

  async _doInit() {
    this._fresh = !this._loadCache();
    this.ready = true;
    this.renderUI();                      // tampil seketika dari cache (offline-first)
    if (this._canSync()) {
      await this.flush();                 // tarik dari server + check-in harian + kirim perubahan
    } else {
      this._dailyCheckin();               // offline: tetap hitung streak dari jam perangkat
      this.checkBadges();
    }
    this.renderUI();
  },

  reset() {
    clearTimeout(this._flushTimer);
    this.supabase = null;
    this.userId = null;
    this.ready = false;
    this._initKey = null;
    this._initPromise = null;
    this.state = this._defaultState();
    this.pending = this._defaultPending();
    this.renderUI();
  },

  _bindLifecycle() {
    if (this._bound) return;
    this._bound = true;
    // Aplikasi mobile/PWA sering di-background tiba-tiba: kirim data sebelum itu terjadi
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
  },

  // ---------- Sinkronisasi ----------
  _scheduleFlush(ms = 1200) {
    clearTimeout(this._flushTimer);
    this._flushTimer = setTimeout(() => this.flush(), ms);
  },

  // Tarik nilai terbaru dari server lalu gabungkan dengan perubahan lokal yang belum terkirim.
  async _pull() {
    const uid = this.userId;
    const s = this.state, p = this.pending;

    const { data: row, error } = await this.supabase
      .from('user_gamification').select('*').eq('user_id', uid).maybeSingle();
    if (error) throw error;
    if (uid !== this.userId) return;      // user berganti selagi menunggu

    if (!row && this._fresh) {
      // Pengguna lama yang baru pertama kali memakai gamifikasi cloud:
      // seed dari riwayat resep & proofing agar level tidak turun ke 1.
      const c = this._counts();
      p.xp += c.recipes * this.REWARDS.recipe.xp + c.proofings * this.REWARDS.proofing.xp;
      p.coins += c.recipes * this.REWARDS.recipe.coins + c.proofings * this.REWARDS.proofing.coins;
    }
    this._fresh = false;

    s.xp = (row ? Number(row.xp || 0) : 0) + p.xp;
    s.coins = (row ? Number(row.coins || 0) : 0) + p.coins;
    s.level = this.calculateLevel(s.xp);

    if (row) {
      const srvLast = row.last_active_date ? String(row.last_active_date).slice(0, 10) : null;
      // Pakai data streak yang paling baru (server vs lokal)
      if (!s.last_active_date || (srvLast && srvLast >= s.last_active_date)) {
        s.streak_days = Number(row.streak_days || 0);
        s.last_active_date = srvLast;
      }
    }

    // Lencana & misi: kegagalan di sini (mis. tabel belum dibuat) tidak boleh menggagalkan profil
    try {
      const { data, error: e } = await this.supabase.from('user_badges').select('badge_id').eq('user_id', uid);
      if (e) throw e;
      s.badges = Array.from(new Set([...(data || []).map(r => r.badge_id), ...p.badges]));
    } catch (e) { console.warn('Lencana belum bisa dimuat:', e.message || e); }

    try {
      const today = this._dateKey();
      const { data, error: e } = await this.supabase.from('user_quests').select('*').eq('user_id', uid).eq('quest_date', today);
      if (e) throw e;
      const map = {};
      [...(data || []), ...s.quests, ...p.quests.filter(q => q.quest_date === today)].forEach(q => {
        if (q.completed !== false) map[q.quest_id] = { quest_id: q.quest_id, quest_date: today, completed: true };
      });
      s.quests = Object.values(map);
    } catch (e) { console.warn('Misi harian belum bisa dimuat:', e.message || e); }
  },

  async flush() {
    if (!this._canSync()) return false;
    if (this._flushPromise) { this._flushAgain = true; return this._flushPromise; }

    this._flushPromise = (async () => {
      let ok = true;
      try {
        do {
          this._flushAgain = false;
          await this._pull();
          this._dailyCheckin();           // sekali per hari, aman dipanggil berulang
          this.checkBadges(true);

          const snap = JSON.parse(JSON.stringify(this.pending));
          const s = this.state;
          const { error } = await this.supabase.from('user_gamification').upsert({
            user_id: this.userId,
            xp: s.xp,
            level: s.level,
            coins: s.coins,
            streak_days: s.streak_days,
            last_active_date: s.last_active_date,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
          if (error) throw error;
          this.pending.xp -= snap.xp;
          this.pending.coins -= snap.coins;

          if (snap.quests.length) {
            const rows = snap.quests.map(q => ({
              user_id: this.userId, quest_id: q.quest_id, quest_date: q.quest_date,
              completed: true, completed_at: q.completed_at || new Date().toISOString()
            }));
            const { error: qe } = await this.supabase.from('user_quests').upsert(rows, { onConflict: 'user_id,quest_id,quest_date' });
            if (qe) console.warn('Misi belum tersinkron:', qe.message);
            else this.pending.quests = this.pending.quests.filter(q => !snap.quests.some(x => x.quest_id === q.quest_id && x.quest_date === q.quest_date));
          }
          if (snap.badges.length) {
            const rows = snap.badges.map(id => ({ user_id: this.userId, badge_id: id }));
            const { error: be } = await this.supabase.from('user_badges').upsert(rows, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
            if (be) console.warn('Lencana belum tersinkron:', be.message);
            else this.pending.badges = this.pending.badges.filter(id => !snap.badges.includes(id));
          }
          this._saveCache();
        } while (this._flushAgain);
      } catch (err) {
        ok = false;
        console.warn('Sinkronisasi gamifikasi tertunda (akan dicoba lagi):', (err && err.message) || err);
        this._saveCache();
      } finally {
        this._flushPromise = null;
      }
      this.renderUI();
      return ok;
    })();
    return this._flushPromise;
  },

  // ---------- Aturan permainan ----------
  _dailyCheckin() {
    const s = this.state, today = this._dateKey(), last = s.last_active_date;
    if (last === today) return false;
    let streak = 1;
    if (last && /^\d{4}-\d{2}-\d{2}$/.test(last)) {
      const diff = this._daysBetween(last, today);
      if (diff <= 0) return false;        // jam perangkat mundur / beda zona waktu: jangan hitung ulang
      streak = diff === 1 ? (s.streak_days || 0) + 1 : 1;
    }
    s.streak_days = streak;
    s.last_active_date = today;
    const r = this.REWARDS.checkin;
    this.addReward(r.xp, r.coins, { skipFlush: true, message: '🔥 Streak ' + streak + ' hari! Bonus login harian' });
    return true;
  },

  // Titik masuk utama dari fitur aplikasi: 'recipe' | 'proofing'
  award(eventName, message) {
    const r = this.REWARDS[eventName];
    if (!r) return;
    this.addReward(r.xp, r.coins, { message });
    this.QUESTS.filter(q => q.event === eventName).forEach(q => this.completeQuest(q.id));
    // Data resep/log baru ditulis ke penyimpanan sesaat setelah pemanggilan ini
    setTimeout(() => this.checkBadges(), 800);
  },

  addReward(xp, coins, opts = {}) {
    if (!this.state) this._loadCache();
    const s = this.state, p = this.pending;
    const before = s.level;
    s.xp += xp; p.xp += xp;
    s.coins += coins; p.coins += coins;
    s.level = this.calculateLevel(s.xp);
    this._saveCache();
    if (opts.message) this._notify('+' + xp + ' XP · +' + coins + ' 🪙 ' + opts.message);
    if (s.level > before) this._onLevelUp(before, s.level);
    this.renderUI();
    if (!opts.skipFlush) this._scheduleFlush();
  },
  addXP(amount) { this.addReward(amount, 0); },
  addCoins(amount) { this.addReward(0, amount); },

  completeQuest(questId) {
    const q = this.QUESTS.find(x => x.id === questId);
    if (!q) return;
    const today = this._dateKey();
    if (this.state.quests.some(x => x.quest_id === questId && x.quest_date === today)) return;
    const row = { quest_id: questId, quest_date: today, completed: true, completed_at: new Date().toISOString() };
    this.state.quests.push(row);
    this.pending.quests.push(row);
    this.addReward(q.xp, q.coins, { message: '✅ Misi selesai!' });
  },

  checkBadges(noFlush) {
    if (!this.state) return;
    const c = this._counts();
    const ctx = { recipes: c.recipes, proofings: c.proofings, level: this.state.level, streak: this.state.streak_days };
    const fresh = this.BADGES.filter(b => !this.state.badges.includes(b.id) && b.test(ctx));
    if (!fresh.length) return;
    fresh.forEach(b => { this.state.badges.push(b.id); this.pending.badges.push(b.id); });
    this._saveCache();
    this._notify(fresh.length === 1 ? '🎖️ Lencana baru: ' + fresh[0].icon + ' ' + fresh[0].name : '🎖️ ' + fresh.length + ' lencana baru terbuka!');
    this.renderUI();
    if (!noFlush) this._scheduleFlush();
  },

  unlockBadge(badgeId) {
    if (this.state.badges.includes(badgeId)) return;
    this.state.badges.push(badgeId);
    this.pending.badges.push(badgeId);
    this._saveCache();
    this.renderUI();
    this._scheduleFlush();
  },

  _onLevelUp(from, to) {
    let last = null;
    for (let lv = from + 1; lv <= to; lv++) {
      const m = (typeof GamificationData !== 'undefined') ? GamificationData.find(g => g.level === lv) : null;
      if (m) {
        last = m;
        if (typeof ProgressionSystem !== 'undefined') ProgressionSystem.saveAchievementLog(m.badgeTitle, m.message, m.icon);
      }
    }
    if (last && typeof ProgressionSystem !== 'undefined') ProgressionSystem.showAchievement(last.badgeTitle, last.message, last.icon);
    else this._notify('🎉 Selamat! Anda naik ke Level ' + to);
  },

  // ---------- Tampilan ----------
  renderUI() {
    try {
      if (!this.state) this._loadCache();
      if (window.GamificationUI && typeof window.GamificationUI.mount === 'function') window.GamificationUI.mount();

      const s = this.state, per = this.XP_PER_LEVEL;
      const level = s.level, into = s.xp - (level - 1) * per;
      const pct = Math.min(100, Math.max(0, (into / per) * 100));
      const rank = this.getRankInfo(level).title;
      const counts = this._counts();
      const today = this._dateKey();

      const txt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      const htm = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };

      txt('game-level', 'Level ' + level);
      txt('game-rank', rank);
      htm('game-xp', '<strong>' + s.xp + ' XP</strong>');
      txt('game-next', (per - into) + ' XP menuju Level ' + (level + 1));
      const fill = document.getElementById('game-xp-fill');
      if (fill) fill.style.width = pct + '%';
      txt('game-streak', s.streak_days + ' hari');
      txt('game-recipes', counts.recipes);
      txt('game-proofing', counts.proofings);
      txt('game-coins', s.coins);

      const badge = document.getElementById('profile-status-badge');
      if (badge) badge.textContent = '🔔 ' + rank + ' (Lv. ' + level + ')';

      htm('game-quests', this.QUESTS.map(q => {
        const done = s.quests.some(x => x.quest_id === q.id && x.quest_date === today);
        return '<div class="quest-item ' + (done ? 'completed' : '') + '">' +
                 '<div class="quest-text">' + (done ? '✔️' : q.icon) + ' ' + q.text + '</div>' +
                 '<div class="quest-reward">+' + q.xp + ' XP · +' + q.coins + ' 🪙</div>' +
               '</div>';
      }).join(''));

      htm('game-badges', this.BADGES.map(b => {
        const ok = s.badges.includes(b.id);
        return '<span class="gamification-badge ' + (ok ? 'unlocked' : 'locked') + '" title="' + b.desc + '">' + b.icon + ' ' + b.name + '</span>';
      }).join(''));

      if (typeof window.renderAchievementLogs === 'function') window.renderAchievementLogs(level);
    } catch (e) {
      console.error('renderUI gamifikasi gagal:', e);
    }
  }
};
GamificationModule.state = GamificationModule._defaultState();
GamificationModule.pending = GamificationModule._defaultPending();

// CATATAN: listener supabase.auth.onAuthStateChange untuk gamifikasi sengaja TIDAK dipasang di sini.
// Di titik ini client Supabase belum dibuat (window.supabase masih namespace CDN, jadi
// supabase.auth === undefined -> TypeError yang mematikan seluruh <script type="module">).
// Listener-nya ada di blok "FUNGSI HALAMAN LOGIN", tepat setelah createClient().


// ================================================================= 
// SKRIP JAVASCRIPT: LOGIKA NAVIGASI & MANAJEMEN STATE (OPSI 1 HALAMAN RESEP)       
// ================================================================= 
let bakeryIngredients = [];
let isSaving = false;
let currentEditingRecipeId = null;
let activeRecipeSteps = [
    "Campurkan Tepung Utama dan bahan kering lainnya. Lakukan proses autolisis selama 20-30 menit bersama air dingin untuk membentuk gluten alami.",
    "Masukkan ragi aktif, aduk rata, lalu tambahkan mentega dan garam. Mixer kembali hingga adonan mencapai status kalis elastis (windowpane test)."
];

// ------------------------------------------------------------
// INISIALISASI APLIKASI
// ------------------------------------------------------------
    async function initIndexedDB() {
    return openDB('KedaiMakerDB', 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('recipes')) {
                db.createObjectStore('recipes', { keyPath: 'id' });
            }
        },
    });
}

// Auto-deteksi saat aplikasi pertama kali dimuat
function initLanguage() {
    try {
        const savedLang = localStorage.getItem('app_lang');
        const deviceLang = String(navigator.language || 'id').split('-')[0];
        const lang = savedLang || deviceLang || 'id';
        
        window.setLanguage(lang);
        
        const customSwitcher = document.getElementById('custom-lang-switcher');
        if (customSwitcher) customSwitcher.value = lang;
    } catch (e) {
        console.warn('initLanguage gagal:', e);
    }
}

async function initApp() {
    // 1. Cek pengunci: Jika sedang memuat data, batalkan request refresh baru
    if (isFetchingLocation) {
        console.warn("initApp diabaikan karena proses memuat sebelumnya belum selesai.");
        return;
    }

    // 2. Pengaman Luring: Mencegah error / reset data saat tidak ada internet
    if (!navigator.onLine) {
        window.DEBUG && console.log("initApp dihentikan karena aplikasi sedang offline.");
        if (typeof handleOfflinePremium === 'function') {
            handleOfflinePremium();
        }
        return;
    }

    // 3. AKTIFKAN KUNCI UTAMA
    isFetchingLocation = true;
    
    const refreshIndicator = document.getElementById('refresh-indicator');
    if (refreshIndicator) refreshIndicator.style.display = "block";

    const line1 = document.getElementById('loc-line1');
    const line2 = document.getElementById('loc-line2');
    const retryBtn = document.getElementById('retry-btn');
    const premiumBox = document.getElementById('premium-box');

    if (premiumBox) premiumBox.style.display = "none";
    if (line1) line1.innerText = "Mendeteksi lokasi...";
    if (line2) line2.innerText = "";
    if (retryBtn) retryBtn.style.display = "none";

    try {
        // --- JIKA BERJALAN DI APLIKASI HP (CAPACITOR) ---
        if (window.Capacitor && window.Capacitor.isPluginAvailable('Geolocation')) {
            try {
                const coordinates = await Capacitor.Plugins.Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 5000
                });
                const lat = coordinates.coords.latitude;
                const lon = coordinates.coords.longitude;

                await fetchLocationAndWeather(lat, lon, "GPS Perangkat");
                kirimPesanKeSW(lat, lon);
                
                // JAMINAN ONLINE: Sembunyikan kotak luring jika sukses
                if (premiumBox) premiumBox.style.display = "none";
            } catch (error) {
                console.warn("Gagal mengambil GPS HP, mencoba mencarinya lewat IP internet...", error);
                if (typeof fetchLocationByIPFallback === "function") {
                    await fetchLocationByIPFallback();
                    if (premiumBox) premiumBox.style.display = "none";
                } else {
                    handleOfflinePremium();
                }
            }
        } 
        // --- JIKA BERJALAN DI BROWSER WEB BIASA / PWA ---
        else {
            if (navigator.geolocation) {
                await new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            const lat = position.coords.latitude;
                            const lon = position.coords.longitude;
                            await fetchLocationAndWeather(lat, lon, "GPS");
                            kirimPesanKeSW(lat, lon);

                            // PENGAMAN ONLINE: Pastikan box premium luring sembunyi!
                            if (premiumBox) premiumBox.style.display = "none"; 

                            resolve();
                        },
                        async (error) => {
                            console.warn("GPS Browser gagal/ditolak, mencoba jalur cadangan IP...");
                            if (typeof fetchLocationByIPFallback === "function") {
                                try {
                                    await fetchLocationByIPFallback();
                                    if (premiumBox) premiumBox.style.display = "none";
                                } catch (e) {
                                    handleOfflinePremium();
                                }
                            } else {
                                handleOfflinePremium();
                            }
                            resolve();
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                    );
                });
            } else {
                if (typeof fetchLocationByIPFallback === "function") {
                    await fetchLocationByIPFallback();
                    if (premiumBox) premiumBox.style.display = "none";
                } else {
                    handleOfflinePremium();
                }
            }
        }
    } catch (globalError) {
        console.error("Terjadi kesalahan pada inisialisasi aplikasi:", globalError);
        handleOfflinePremium();
    } finally {
        isFetchingLocation = false;
        if (typeof hideRefreshIndicator === 'function') {
            hideRefreshIndicator();
        } else if (refreshIndicator) {
            refreshIndicator.style.display = "none";
        }
    }
}

// ============================================================
// 1. FUNGSI AUTENTIKASI & AKUN PENGGUNA / FUNGSI REGISTER / FUNGSI LOGIN / FUNGSI LOGOUT
// ============================================================
// 1. Handle Form Submit (Memicu pengiriman OTP)
// 1. Daftarkan handleAuthSubmit ke Scope Global Window
window.handleAuthSubmit = async function(event) {
    // Mencegah form melakukan reload/refresh halaman
    if (event) event.preventDefault();

    const emailInput = document.getElementById('input-email');
    const passwordInput = document.getElementById('input-password');
    const nameInput = document.getElementById('input-name');
    const errorBox = document.getElementById('auth-error-box');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const name = nameInput ? nameInput.value.trim() : '';

    if (errorBox) errorBox.style.display = 'none';

    try {
        // Cek mode auth aktif
        const isRegister = (typeof isRegisterMode !== 'undefined' && isRegisterMode) || window.currentAuthMode === 'register';

        if (isRegister) {
            // --- LOGIKA REGISTRASI ---
            if (!name) {
                if (typeof showError === 'function') showError("Nama Lengkap wajib diisi.");
                if (nameInput) nameInput.focus();
                return;
            }

            // Mendaftar akun baru ke Supabase
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: { data: { full_name: name } }
            });
            if (error) throw error;

            if (typeof pendingVerificationEmail !== 'undefined') {
                pendingVerificationEmail = email;
            }

            // Sembunyikan form pendaftaran, tampilkan form OTP
            const authForm = document.getElementById('auth-form');
            if (authForm) authForm.style.display = 'none';

            const tabSwitch = document.querySelector('.tab-switch');
            if (tabSwitch) tabSwitch.style.display = 'none';

            const divider = document.querySelector('.divider');
            if (divider) divider.style.display = 'none';

            const socialGrid = document.querySelector('.social-grid');
            if (socialGrid) socialGrid.style.display = 'none';

            const whatsappBtn = document.querySelector('.whatsapp-btn');
            if (whatsappBtn) whatsappBtn.style.display = 'none';

            const verifyDisplay = document.getElementById('verify-email-display');
            if (verifyDisplay) verifyDisplay.innerText = email;

            const otpBox = document.getElementById('otp-verification-box');
            if (otpBox) otpBox.style.display = 'block';

            const authSubtitle = document.getElementById('auth-subtitle');
            if (authSubtitle) authSubtitle.innerText = "Cek kotak masuk/spam email Anda";

        } else {
            // --- LOGIKA LOGIN NORMAL ---

            // 1. INGAT SAYA (Remember Me)
            const rememberEl = document.getElementById('remember-me-checkbox');
            const remember = rememberEl ? rememberEl.checked : false;
            if (remember) {
                localStorage.setItem('saved_email', email);
                localStorage.setItem('saved_pass', password);
            } else {
                localStorage.removeItem('saved_email');
                localStorage.removeItem('saved_pass');
            }

            // 2. PROSES LOGIN SUPABASE
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            if (error) throw error;

            // Tandai onboarding selesai
            localStorage.setItem('tp_onboarding_seen', 'true');
            if (window.appOnboardingWalkthrough && typeof window.appOnboardingWalkthrough.hide === 'function') {
                window.appOnboardingWalkthrough.hide();
            }

            // 3. ATUR TAMPILAN
            document.body.classList.remove('logged-out');
            document.body.classList.add('logged-in');

            const authWrapper = document.getElementById('auth-wrapper');
            if (authWrapper) authWrapper.style.display = 'none';

            const appContainer = document.getElementById('app-container');
            if (appContainer) appContainer.style.display = 'flex';

            // 4. SINKRONISASI & JALANKAN MESIN UTAMA
            if (typeof sinkronisasiAwalDariSupabase === 'function') await sinkronisasiAwalDariSupabase();
            if (typeof restoreProgressionFromSupabase === 'function') await restoreProgressionFromSupabase();
            if (typeof syncLocalDataToSupabase === 'function') await syncLocalDataToSupabase();
            if (typeof initSupabaseRealtime === 'function') initSupabaseRealtime();
            if (typeof initApp === 'function') initApp();
        }
    } catch (err) {
        if (typeof showError === 'function') {
            showError(err.message);
        } else {
            alert(err.message || 'Terjadi kesalahan saat otentikasi.');
        }
    }
};

// 2. Event Listener Aman dari Error Null saat DOM Siap
document.addEventListener('DOMContentLoaded', function() {
    const forgotLink = document.getElementById('link-forgot-password');
    const forgotModal = document.getElementById('forgot-password-modal');
    const backToLoginLink = document.getElementById('link-back-to-login');

    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (forgotModal) {
                forgotModal.classList.add('active');
            } else if (typeof window.switchAuthTab === 'function') {
                window.switchAuthTab('forgot');
            }
        });
    }

    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof window.switchAuthTab === 'function') {
                window.switchAuthTab('login');
            }
        });
    }
});

// 2. Fungsi Eksekusi Verifikasi OTP
async function verifyEmailOtp() {
    const otpCode = document.getElementById('input-otp').value.trim();
    const errorBox = document.getElementById('auth-error-box');
    const btn = document.getElementById('btn-verify-otp');
    
    if (errorBox) errorBox.style.display = 'none';

    if (otpCode.length !== 6) {
        showError("Masukkan 6 digit angka OTP yang valid.");
        return;
    }

    const originalText = btn.innerText;
    btn.innerText = "MEMVERIFIKASI...";
    btn.disabled = true;

    try {
        // Eksekusi API Supabase untuk validasi OTP
        const { data, error } = await supabase.auth.verifyOtp({
            email: pendingVerificationEmail,
            token: otpCode,
            type: 'signup' // Tipe spesifik untuk verifikasi pendaftaran
        });

        if (error) throw error;

        // Berhasil! Listener onAuthStateChange (dari langkah sebelumnya) 
        // akan otomatis mendeteksi sesi baru dan mengalihkan UI ke halaman utama.
        
        // Kembalikan form ke kondisi normal untuk jaga-jaga jika user logout
        setTimeout(cancelVerification, 1000); 

    } catch (err) {
        showError("Kode OTP salah atau sudah kedaluwarsa. " + err.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// 3. Fungsi Batal (Mengembalikan Form ke Awal)
window.cancelVerification = function() {
    if (typeof pendingVerificationEmail !== 'undefined') {
        pendingVerificationEmail = "";
    }
    
    const inputOtp = document.getElementById('input-otp');
    if (inputOtp) inputOtp.value = "";
    
    document.getElementById('otp-verification-box').style.display = 'none';
    document.getElementById('auth-form').style.display = 'block';
    
    const tabSwitch = document.querySelector('.tab-switch');
    if (tabSwitch) tabSwitch.style.display = 'flex';
    
    const divider = document.querySelector('.divider');
    if (divider) divider.style.display = 'flex';
    
    const socialGrid = document.querySelector('.social-grid');
    if (socialGrid) socialGrid.style.display = 'grid';
    
    const whatsappBtn = document.querySelector('.whatsapp-btn');
    if (whatsappBtn) whatsappBtn.style.display = 'flex';
    
    // GANTI switchMode('login') DENGAN INI:
    if (typeof window.switchAuthTab === 'function') {
        window.switchAuthTab('login');
    }
};

// 3. Handle Social Auth (Google, Facebook, Apple)
async function signInWithProvider(providerName) {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: providerName,
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        if (error) throw error;
    } catch (err) {
        showError(err.message);
    }
}

// 4. Handle WhatsApp / Phone Auth (OTP)
async function signInWithWhatsApp() {
    const phone = prompt('Masukkan Nomor WhatsApp Anda (Format: +628xxxxxxxxxx):');
    if (!phone) return;

    try {
        const { data, error } = await supabase.auth.signInWithOtp({
            phone: phone,
            options: {
                channel: 'whatsapp' // <--- Tambahkan baris ini
            }
        });
        if (error) throw error;

        const token = prompt('Kode OTP telah dikirim via WhatsApp. Masukkan 6 digit kode OTP:');
        if (!token) return;

        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            phone: phone,
            token: token,
            type: 'sms'
        });
        if (verifyError) throw verifyError;

        // PENTING: Ganti kelas body, JANGAN reload halaman
        document.body.classList.remove('logged-out');
        document.body.classList.add('logged-in');

    } catch (err) {
        showError('Gagal autentikasi WhatsApp: ' + err.message);
    }
}

function handleLogin() {
    const email = document.getElementById('input-email').value;
    const password = document.getElementById('input-password').value;
    const remember = document.getElementById('remember-me-checkbox').checked;

    if (remember) {
        localStorage.setItem('saved_email', email);
        localStorage.setItem('saved_pass', password);
    } else {
        localStorage.removeItem('saved_email');
        localStorage.removeItem('saved_pass');
    }
}

// ==========================================
// FUNGSI LOGOUT (KELUAR AKUN)
// ==========================================
async function handleLogout() {
    // 1. Tampilkan dialog konfirmasi (Mencegah klik tidak sengaja)
    const confirmLogout = confirm("Apakah Anda yakin ingin keluar dari akun Timer Proofing?");
    if (!confirmLogout) return;

    try {
        // 2. Eksekusi Sign Out dari Supabase
        const client = window.supabase;
        if (!client?.auth) {
            throw new Error('Koneksi autentikasi Supabase belum siap.');
        }

        const { error } = await client.auth.signOut();
        if (error) throw error;

        // 3. Kembalikan UI ke halaman Login
        document.body.classList.remove('logged-in');
        document.body.classList.add('logged-out');
        document.getElementById('auth-wrapper').style.display = 'flex';

        // 4. Tutup modal profil jika sedang terbuka
        const userModal = document.getElementById('user-modal');
        if (userModal) {
            userModal.classList.remove('active');
            document.body.style.overflow = ''; // Kembalikan scroll
        }

        // 5. (Opsional) Hapus cache data user yang sensitif di LocalStorage
        // Jangan hapus data resep (RESEP_LIST_KEY), cukup data sesi jika ada
        
    } catch (err) {
        console.error("Gagal logout:", err.message);
        alert("Terjadi kesalahan saat keluar: " + err.message);
    }
}

// Ekspos segera setelah deklarasi agar dispatcher data-action tidak bergantung
// pada blok inisialisasi Supabase atau kode lain di bawahnya.
window.handleLogout = handleLogout;

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('input-password');
    if (!passwordInput) return;

    // Ubah tipe input antara 'password' dan 'text'
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
    } else {
        passwordInput.type = 'password';
    }
}

// Fungsi bantuan untuk menampilkan error di kotak pesan
function showError(message) {
    const errorBox = document.getElementById('auth-error-box');
    if (errorBox) {
        errorBox.innerText = message;
        errorBox.style.display = 'block';
    } else {
        alert(message); // Fallback jika div error tidak ditemukan
    }
}

// ==========================================
// EKSEKUSI HAPUS DATA PROFIL (LOKAL)
// ==========================================
async function hapusDataProfilLokal() {
    const konfirmasi = confirm("Apakah Anda yakin ingin menghapus nama, kedai, dan riwayat di perangkat ini? Akun login Anda akan tetap aktif.");
    if (!konfirmasi) return;

    try {
        // Membersihkan data preferensi yang tersimpan di memori perangkat
        const keysToRemove = [
            'profile_name', 'profile_bakery', 'profile_phone', 'profile_email', 'user_profile',
            'proofing_state', 'proofing_logs', 'activeMode', 'timerDuration', 'tp_notifs',
            'terakhir_sukses_cuaca', 'donut_weather_cache'
        ];

        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Memanfaatkan Capacitor Preferences jika tersedia
        if (window.Capacitor && window.Capacitor.Plugins.Preferences) {
            for (const key of keysToRemove) {
                await Capacitor.Plugins.Preferences.remove({ key });
            }
        }

        alert("Data profil lokal berhasil dibersihkan.");
        
        // Memaksa UI untuk render ulang dengan state kosong
        loadDynamicProfile(); 
        closeEditProfile();
    } catch (err) {
        console.error("Gagal menghapus profil lokal:", err);
        alert("Terjadi kesalahan saat membersihkan profil.");
    }
}

// ==========================================
// EKSEKUSI HAPUS AKUN PERMANEN (SUPABASE)
// ==========================================
async function hapusAkunPermanen() {
    const konfirmasiUtama = confirm("PERINGATAN KERAS: Aksi ini akan menghapus akun login dan semua resep yang dicadangkan di server secara permanen. Apakah Anda yakin?");
    if (!konfirmasiUtama) return;
    
    // Verifikasi ganda untuk keamanan UI
    const verifikasiKedua = prompt("Ketik 'HAPUS' untuk mengonfirmasi penghapusan akun secara permanen:");
    if (verifikasiKedua !== 'HAPUS') {
        alert("Penghapusan akun dibatalkan.");
        return;
    }

    try {
        // 1. Cek User yang sedang login
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Gagal mengautentikasi pengguna saat ini.");

        // 2. Eksekusi penghapusan akun di sisi Server (Via RPC)
        // Syarat: Anda harus membuat function 'delete_user' di Database Postgres Supabase Anda
        const { error: rpcError } = await supabase.rpc('delete_user');
        
        if (rpcError) {
            console.error("RPC Error:", rpcError);
            throw new Error("Gagal menghapus akun di server. Pastikan RPC 'delete_user' telah dikonfigurasi.");
        }

        // 3. Bersihkan memori aplikasi dari semua residu cache
        localStorage.clear();
        if (window.Capacitor && window.Capacitor.Plugins.Preferences) {
            await Capacitor.Plugins.Preferences.clear();
        }

        // 4. Keluarkan (Sign Out) paksa
        await supabase.auth.signOut();

        alert("Akun Timer Proofing Anda telah berhasil dihapus.");

        // 5. Kembalikan State UI ke Halaman Login awal
        document.body.classList.remove('logged-in');
        document.body.classList.add('logged-out');
        
        // Tutup semua modal aktif
        const activeModals = document.querySelectorAll('.page-modal.active');
        activeModals.forEach(modal => modal.classList.remove('active'));

    } catch (err) {
        console.error("Gagal eksekusi hapus akun:", err);
        alert("Pesan Sistem: " + err.message);
    }
}

let currentAuthMode = 'login';

// 1. Didaftarkan ke scope window agar bisa dipanggil langsung oleh onclick di HTML
// Fungsi Switch Tab Auth
function switchAuthTab(mode) {
    window.currentAuthMode = mode;

    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const btnSubmit = document.getElementById('btn-submit-main');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const tabSwitch = document.getElementById('auth-tab-switch');

    const groupName = document.getElementById('group-name');
    const groupPassword = document.getElementById('group-password');
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
}
window.switchAuthTab = switchAuthTab;

document.addEventListener('DOMContentLoaded', () => {
    const linkForgotPassword = document.getElementById('link-forgot-password');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const linkBackToLogin = document.getElementById('link-back-to-login');
    const forgotModal = document.getElementById('forgot-modal');

    // Listener Link Lupa Password
    if (linkForgotPassword) {
        linkForgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            if (forgotModal) {
                forgotModal.classList.add('active');
            } else {
                switchAuthTab('forgot'); // Pemanggilan langsung fungsi modul lokal
            }
        });
    }

    // Listener Tab Login & Register
    if (tabLogin) {
        tabLogin.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthTab('login');
        });
    }

    if (tabRegister) {
        tabRegister.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthTab('register');
        });
    }

    // Listener Kembali ke Login
    if (linkBackToLogin) {
        linkBackToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthTab('login');
        });
    }
});

window.validateSubmitButton = function() {
    const checkbox = document.getElementById('agree-tos-checkbox');
    const submitBtn = document.getElementById('btn-submit-main');
    if (submitBtn) {
        if (window.currentAuthMode === 'register') {
            submitBtn.disabled = checkbox ? !checkbox.checked : true;
        } else {
            submitBtn.disabled = false;
        }
    }
};

window.handleAuthSubmit = async function(event) {
    if (event) event.preventDefault();

    const emailInput = document.getElementById('input-email');
    const passwordInput = document.getElementById('input-password');
    const nameInput = document.getElementById('input-name');
    const errorBox = document.getElementById('auth-error-box');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const name = nameInput ? nameInput.value.trim() : '';

    if (errorBox) errorBox.style.display = 'none';

    try {
        const mode = window.currentAuthMode || 'login';

        // ==========================================
        // 1. LOGIKA LUPA KATA SANDI
        // ==========================================
        if (mode === 'forgot') {
            if (!email) {
                if (typeof showError === 'function') showError("Masukkan email Anda terlebih dahulu.");
                return;
            }

            // Kirim link reset password via Supabase Auth
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            });

            if (error) throw error;

            alert("Link reset kata sandi telah berhasil dikirim ke email " + email);
            return;
        }

        // ==========================================
        // 2. LOGIKA REGISTRASI
        // ==========================================
        if (mode === 'register') {
            if (!name) {
                if (typeof showError === 'function') showError("Nama Lengkap wajib diisi.");
                if (nameInput) nameInput.focus();
                return;
            }

            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: { data: { full_name: name } }
            });
            if (error) throw error;

            if (typeof pendingVerificationEmail !== 'undefined') {
                pendingVerificationEmail = email;
            }

            const authForm = document.getElementById('auth-form');
            if (authForm) authForm.style.display = 'none';

            const otpBox = document.getElementById('otp-verification-box');
            if (otpBox) otpBox.style.display = 'block';

            const verifyDisplay = document.getElementById('verify-email-display');
            if (verifyDisplay) verifyDisplay.innerText = email;
            return;
        }

        // ==========================================
        // 3. LOGIKA LOGIN NORMAL
        // ==========================================
        const rememberEl = document.getElementById('remember-me-checkbox');
        const remember = rememberEl ? rememberEl.checked : false;
        if (remember) {
            localStorage.setItem('saved_email', email);
            localStorage.setItem('saved_pass', password);
        } else {
            localStorage.removeItem('saved_email');
            localStorage.removeItem('saved_pass');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        if (error) throw error;

        // Pengaturan tampilan setelah login sukses
        localStorage.setItem('tp_onboarding_seen', 'true');
        document.body.classList.remove('logged-out');
        document.body.classList.add('logged-in');

        const authWrapper = document.getElementById('auth-wrapper');
        if (authWrapper) authWrapper.style.display = 'none';

        const appContainer = document.getElementById('app-container');
        if (appContainer) appContainer.style.display = 'flex';

        if (typeof sinkronisasiAwalDariSupabase === 'function') await sinkronisasiAwalDariSupabase();
        if (typeof restoreProgressionFromSupabase === 'function') await restoreProgressionFromSupabase();
        if (typeof syncLocalDataToSupabase === 'function') await syncLocalDataToSupabase();
        if (typeof initSupabaseRealtime === 'function') initSupabaseRealtime();
        if (typeof initApp === 'function') initApp();

    } catch (err) {
        if (typeof showError === 'function') {
            showError(err.message);
        } else {
            alert(err.message || 'Terjadi kesalahan saat otentikasi.');
        }
    }
};

// =========================================================================
// 2. EVENT LISTENER SAAT HALAMAN SELESAI DIMUAT
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // A. Listener Form Submit (TUGAS UTAMA MENCEGAH REFRESH)
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Mengunci agar URL tidak berubah jadi ?name=&email=
            await window.handleAuthSubmit(e);
        });
    }

    // B. Listener Pindah Tab
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    
    if (tabLogin) tabLogin.addEventListener('click', (e) => { e.preventDefault(); window.switchAuthTab('login'); });
    if (tabRegister) tabRegister.addEventListener('click', (e) => { e.preventDefault(); window.switchAuthTab('register'); });

    // C. Pastikan mode awal adalah login
    window.switchAuthTab('login');
});

// =========================================================================
// 3. SUPABASE LISTENER DENGAN PENGAMAN ANTI-CRASH
// =========================================================================
if (typeof supabase !== 'undefined' && supabase.auth) {
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            const newPassword = prompt('Masukkan password baru Anda:');
            if (newPassword) {
                const { data, error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) alert('Gagal memperbarui password: ' + error.message);
                else {
                    alert('Password berhasil diperbarui! Silakan login kembali.');
                    window.location.hash = '';
                    window.location.reload();
                }
            }
        }
    });
} else {
    console.warn("Peringatan: Objek 'supabase' belum dimuat. Pastikan inisialisasi Supabase diletakkan sebelum script ini.");
}

// ------------------------------------------------------------
// PROFIL PENGGUNA & BISNIS
// ------------------------------------------------------------
// FUNGSI HALAMAN USER PROFILE SUMMARY
function updateProfileSummary(data = {}) {
    data = data || {};

    // Lokasi
    const coordsEl = document.getElementById("prof-coords");
    const addressEl = document.getElementById("prof-address");
    let coordsValue = "Mendeteksi GPS...";
    let addressValue = "Memuat Alamat...";

    if (data.coords) {
        if (typeof data.coords === 'object') {
            const lat = data.coords.latitude ?? data.coords.lat;
            const lon = data.coords.longitude ?? data.coords.lon ?? data.coords.lng;
            coordsValue = lat !== undefined && lon !== undefined
                ? `${lat.toFixed ? lat.toFixed(5) : lat}, ${lon.toFixed ? lon.toFixed(5) : lon}`
                : JSON.stringify(data.coords);
        } else {
            coordsValue = data.coords;
        }
    }

    if (data.address) {
        if (typeof data.address === 'object') {
            addressValue = data.address.formatted || data.address.full || JSON.stringify(data.address);
        } else {
            addressValue = data.address;
        }
    }

    if (coordsEl) {
        coordsEl.textContent = coordsValue;
    }
    if (addressEl) {
        addressEl.textContent = addressValue;
    }

    // Cuaca
    const weatherEl = document.getElementById("summary-weather");
    const humidityEl = document.getElementById("summary-humidity");
    const weatherData = data.weather && typeof data.weather === 'object' ? data.weather : null;

    if (weatherData) {
        const tempValue = Number(weatherData.temp ?? weatherData.temperature ?? data.temp ?? data.temperature);
        const humidityValue = Number(weatherData.humidity ?? weatherData.hum ?? data.humidity ?? data.hum);

        if (weatherEl) {
            weatherEl.textContent = Number.isFinite(tempValue) ? `${Math.round(tempValue)}°C` : "--";
        }
        if (humidityEl) {
            humidityEl.textContent = Number.isFinite(humidityValue) ? `${humidityValue}%` : "--";
        }
    } else {
        if (weatherEl) weatherEl.textContent = "--";
        if (humidityEl) humidityEl.textContent = "--";
    }

    // Tanggal
    const date = document.getElementById("summary-date");
    if (date) {
        date.textContent = new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }
}

function updateProfileStatusBadge(statusText) {
    const badge = document.getElementById('profile-status-badge');
    if (!badge) return;
    badge.textContent = statusText || 'Premium Member';
}

function updateProfileLastUpdated(date = new Date()) {
    const el = document.getElementById('profile-last-updated');
    if (!el) return;
    el.textContent = `Terakhir diperbarui: ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
}

function setProfileLoadingState(isLoading) {
    const textPlaceholders = [
        { id: 'profile-name', text: 'Memuat nama...' },
        { id: 'profile-bakery', text: 'Memuat data ...' },
        { id: 'profile-phone', text: '-' },
        { id: 'profile-email', text: '-' },
        { id: 'prof-coords', text: 'Mendeteksi GPS...' },
        { id: 'prof-address', text: 'Memuat Alamat...' },
        { id: 'summary-weather', text: '--' },
        { id: 'summary-humidity', text: '--' },
        { id: 'summary-date', text: '--:--' },
        { id: 'profile-last-updated', text: 'Memuat informasi...' }
    ];

    textPlaceholders.forEach(({ id, text }) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (isLoading) {
            el.dataset.profileLoading = 'true';
            el.textContent = text;
            el.classList.add('loading-skeleton');
        } else if (el.dataset.profileLoading) {
            el.removeAttribute('data-profile-loading');
            el.classList.remove('loading-skeleton');
        }
    });

    const cards = document.querySelectorAll('#user-modal .profile-card');
    cards.forEach(card => card.classList.toggle('loading-card', isLoading));

    const logContainer = document.getElementById('dynamic-proofing-logs');
    if (logContainer && isLoading) {
        logContainer.innerHTML = '<li class="log-empty">Memuat riwayat proofing...</li>';
    }

    const inventoryBody = document.getElementById('dynamic-inventory-rows');
    if (inventoryBody && isLoading) {
        inventoryBody.innerHTML = '<tr><td colspan="3" style="padding: 12px; text-align: center; color: rgba(78,52,46,0.7);">Memuat inventaris...</td></tr>';
    }
}

async function renderUserProfile(summaryData = null) {

    // 1. Muat data profil
    await loadProfile();

    // 2. Perbarui sapaan
    updateGreeting();

    // 3. Perbarui statistik bakery
    await waitForStatistics();

    // 4. Perbarui ringkasan lokasi/cuaca lalu metadata dinamis
    updateProfileSummary(summaryData || {});

    // 5. Perbarui metadata dan widget dinamis
    updateProfileLastUpdated(new Date());
    updateProfileStatusBadge((summaryData && summaryData.status) || 'Premium Member');
    renderProofingLogs();
    renderInventoryCards();
    if (typeof renderAchievementLogs === 'function') renderAchievementLogs();
    if (window.GamificationUI) await window.GamificationUI.refresh();

    // 6. Versi aplikasi
    updateVersion();
    ProgressionSystem.refreshUI();
}

// =========================================================================
// 1. DATA MILESTONE, REWARD & MISION (Konfigurasi Kurva Level) - GAMIFIKASI
// =========================================================================
const GamificationData = [
    { 
        level: 1, 
        expRequired: 0, 
        badgeTitle: "Novice Baker", 
        icon: "🥚", 
        message: "Langkah awal dimulai! Selamat datang di dunia artisan baker." 
    },
    { 
        level: 2, 
        expRequired: 50, 
        badgeTitle: "Apprentice Baker", 
        icon: "🔔", 
        message: "Meraih gelar Apprentice Baker! Pengelolaan jadwal proofing dan alarm mulai terstruktur." 
    },
    { 
        level: 3, 
        expRequired: 150, 
        badgeTitle: "Journeyman Baker", 
        icon: "📵", 
        message: "Meraih gelar Journeyman Baker! Produktivitas dapur mandiri semakin konsisten." 
    },
    { 
        level: 4, 
        expRequired: 350, 
        badgeTitle: "Artisan Baker", 
        icon: "🌡️", 
        message: "Meraih gelar Artisan Baker! Penguasaan suhu dan kelembapan presisi tinggi tercapai." 
    },
    { 
        level: 5, 
        expRequired: 700, 
        badgeTitle: "Master Baker", 
        icon: "🏆", 
        message: "Puncak pencapaian Master Baker! Analisis resep dan manajemen dapur berada di level tertinggi." 
    }
];

// =========================================================================
// 2. MESIN LOGIKA GAMIFIKASI (Menyimpan & Memeriksa State)
// =========================================================================
class ProgressionSystem {
    // Semua state (XP/level/koin/streak/lencana/misi) kini dikelola GamificationModule
    // (Supabase + cache offline). Class ini dipertahankan agar pemanggil lama tetap jalan.
    static getExp()   { return GamificationModule.state ? GamificationModule.state.xp : 0; }
    static getLevel() { return GamificationModule.state ? GamificationModule.state.level : 1; }

    static getUnlockedFeatures() {
        try {
            return JSON.parse(localStorage.getItem('unlocked_features')) || [];
        } catch(e) {
            return [];
        }
    }

    // Panggil saat user berhasil menyelesaikan 1 siklus Timer Proofing
    static addProofing() {
        GamificationModule.award('proofing', 'Menyelesaikan Sesi Proofing Adonan! 🍩');
    }

    // Panggil saat user berhasil menyimpan resep baru
    static addRecipe() {
        GamificationModule.award('recipe', 'Menyimpan Resep & Kalkulasi HPP Baru! 🧾');
    }

    static addExp(amount, sourceMessage = "") {
        GamificationModule.addReward(amount, 0, { message: sourceMessage });
    }

    static unlockFeature(featureKey) {
        let unlocked = this.getUnlockedFeatures();
        if (!unlocked.includes(featureKey)) {
            unlocked.push(featureKey);
            localStorage.setItem('unlocked_features', JSON.stringify(unlocked));
        }
        this.applyUnlockedFeaturesUI();
    }

    static showAchievement(title, desc, icon) {
        const popup = document.getElementById('achievement-popup');
        const titleEl = document.getElementById('achievement-title');
        const descEl = document.getElementById('ach-desc');
        const iconEl = document.getElementById('ach-icon');

        if (popup && titleEl && descEl && iconEl) {
            titleEl.innerText = title;
            descEl.innerText = desc;
            iconEl.innerText = icon;
            popup.classList.add('show');
            
            // Suara / Haptics pendukung jika tersedia
            if (typeof triggerVibration === 'function') triggerVibration();

            setTimeout(() => popup.classList.remove('show'), 6000);
        }
    }

    static applyUnlockedFeaturesUI() {
        const unlocked = this.getUnlockedFeatures();
        
        // Penguncian/Membuka Fitur AI Analytics di Halaman Resep
        const aiBox = document.getElementById('premium-ai-analysis-box');
        if (aiBox) {
            // Ringkasan Profit Margin, Food Cost, dan badge adalah bagian inti
            // kalkulator, sehingga tidak boleh ikut hilang saat AI premium terkunci.
            aiBox.style.display = 'block';
            const liveAnalysisButton = document.getElementById('btn-ai-live-analysis');
            if (liveAnalysisButton) {
                liveAnalysisButton.disabled = false;
                liveAnalysisButton.title = 'Jalankan analisis AI mendalam';
                liveAnalysisButton.style.opacity = '1';
            }
        }

        // Penguncian Tombol Bluetooth Sensor
        const btnBle = document.getElementById('btn-ble');
        if (btnBle) {
            btnBle.disabled = !unlocked.includes('ble_thermometer');
        }
    }

    // Sinkronisasi Tampilan Gamifikasi ke Profil Pengguna
    static refreshUI() {
        GamificationModule.renderUI();
        this.applyUnlockedFeaturesUI();
    }

    static saveAchievementLog(title, desc, icon) {
        let logs = JSON.parse(localStorage.getItem('achievement_logs') || '[]');
        const isExist = logs.find(log => log.title === title);
        if (!isExist) {
            logs.unshift({ title, desc, icon, timestamp: Date.now() });
            localStorage.setItem('achievement_logs', JSON.stringify(logs));
            if (typeof renderAchievementLogs === 'function') renderAchievementLogs();
        }
    }
}

// Daftarkan ke scope global agar modul lain bisa mengaksesnya
window.GamificationUI = ProgressionSystem;

// Fungsi memuat data profil secara dinamis saat aplikasi dibuka / modal diakses
/**
 * Memperbarui data pada halaman profil (user-modal) secara dinamis
 * Menggabungkan pemuatan data akun (Nama, Bakery, dll) dengan sinkronisasi sensor (Lokasi, Cuaca).
 * @param {boolean} showNotifications - Jika true, akan memicu toast notifikasi
 */
async function loadDynamicProfile(showNotifications = false) {
    try {
        if (typeof setProfileLoadingState === 'function') setProfileLoadingState(true);

        // ==========================================
        // BAGIAN 1: MEMUAT DATA AKUN USER (KODE LAMA)
        // ==========================================
        const savedProfileRaw = await getProfileValue('user_profile', null);
        let savedProfile = null;

        if (savedProfileRaw) {
            try {
                const parsedProfile = JSON.parse(savedProfileRaw);
                if (parsedProfile && typeof parsedProfile === 'object') {
                    savedProfile = parsedProfile;
                }
            } catch (parseError) {
                console.warn('Data user_profile rusak, fallback ke profile_*:', parseError);
            }
        }

        if (!savedProfile) {
            savedProfile = {
                name: await getProfileValue('profile_name', 'Pengguna'),
                bakery: await getProfileValue('profile_bakery', 'Nama Bakery'),
                phone: await getProfileValue('profile_phone', '-'),
                email: await getProfileValue('profile_email', '-')
            };
            await setProfileValue('user_profile', JSON.stringify(savedProfile));
        }

        // Sinkronkan email dari akun Supabase jika profil belum punya email
        if (typeof supabase !== 'undefined' && (!savedProfile.email || savedProfile.email === '-')) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.email) {
                    savedProfile.email = session.user.email;
                    await setProfileValue('profile_email', savedProfile.email);
                    await setProfileValue('user_profile', JSON.stringify(savedProfile));
                }
            } catch (authErr) {
                console.warn('Gagal sinkron email dari Supabase:', authErr);
            }
        }

        // Injeksi ke HTML profil
        if (document.getElementById('profile-name')) document.getElementById('profile-name').innerText = savedProfile.name;
        if (document.getElementById('profile-bakery')) document.getElementById('profile-bakery').innerText = savedProfile.bakery;
        if (document.getElementById('profile-phone')) document.getElementById('profile-phone').innerText = savedProfile.phone || "-";
        if (document.getElementById('profile-email')) document.getElementById('profile-email').innerText = savedProfile.email || "-";

        // Sinkronisasi ke Form Edit jika ada
        if (document.getElementById('edit-name')) {
            document.getElementById('edit-name').value = savedProfile.name;
            document.getElementById('edit-bakery').value = savedProfile.bakery;
            document.getElementById('edit-phone').value = savedProfile.phone;
            document.getElementById('edit-email').value = savedProfile.email;
        }

        // Jalankan fungsi perbarui tampilan profil: statistik, log, dan inventaris
        if (typeof renderUserProfile === 'function') await renderUserProfile();

        // ==========================================
        // BAGIAN 2: SINKRONISASI CUACA & LOKASI (KODE BARU)
        // ==========================================
        const mainLocLine1 = document.getElementById('loc-line1');
        const mainLocLine2 = document.getElementById('loc-line2');
        const profAddress = document.getElementById('prof-address');
        const profCoords = document.getElementById('prof-coords');

        if (profAddress && mainLocLine1) {
            profAddress.textContent = mainLocLine1.textContent.replace('📍', '').trim();
        }
        if (profCoords && mainLocLine2) {
            profCoords.textContent = mainLocLine2.textContent;
        }

        const mainTempVal = document.getElementById('temp-val');
        const mainHumVal = document.getElementById('hum-val');
        const profWeather = document.getElementById('summary-weather');
        const profHumidity = document.getElementById('summary-humidity');

        if (profWeather && mainTempVal) {
            let cleanTemp = mainTempVal.textContent.replace(/[^0-9.-]/g, '');
            profWeather.textContent = cleanTemp !== '' && cleanTemp !== '--' ? `${Math.round(cleanTemp)}°C` : '--';
        }
        if (profHumidity && mainHumVal) {
            let cleanHum = mainHumVal.textContent.replace(/[^0-9.-]/g, '');
            profHumidity.textContent = cleanHum !== '' && cleanHum !== '--' ? `${Math.round(cleanHum)}%` : '--';
        }

        // Perbarui Waktu Pembaruan Terakhir
        const lastUpdatedElement = document.getElementById('profile-last-updated');
        if (lastUpdatedElement) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            lastUpdatedElement.textContent = `Terakhir diperbarui: ${hours}.${minutes}`;
        }

        // Jalankan feedback visual animasi putar jika parameter bernilai true
        if (showNotifications) {
            const refreshBtn = document.querySelector('.profile-refresh-btn');
            if (refreshBtn) {
                refreshBtn.style.transform = 'rotate(360deg)';
                refreshBtn.style.transition = 'transform 0.6s ease';
                setTimeout(() => {
                    refreshBtn.style.transform = 'none';
                    refreshBtn.style.transition = 'none';
                }, 600);
            }
            if (typeof showToast === 'function') showToast('Profil diperbarui.');
        }

    } catch (error) {
        console.error("Gagal memuat profil dinamis:", error);
        if (showNotifications && typeof showToast === 'function') {
            showToast('Gagal memuat profil. Coba lagi.');
        }
    } finally {
        if (typeof setProfileLoadingState === 'function') setProfileLoadingState(false);
    }
}

/** Buka bantuan dari tombol profil (nama yang dipanggil di HTML) */
function openHelpFromProfile() {
    const userModal = document.getElementById('user-modal');
    if (userModal && userModal.classList.contains('active') && typeof toggleModal === 'function') {
        toggleModal('user-modal');
    }
    const helpModal = document.getElementById('help-modal');
    if (helpModal && !helpModal.classList.contains('active') && typeof toggleModal === 'function') {
        toggleModal('help-modal');
        return;
    }
    if (typeof openHelpSubModal === 'function') openHelpSubModal();
}
window.openHelpFromProfile = openHelpFromProfile;

/** Buka bantuan dari pengaturan — tutup pengaturan dulu agar tidak tumpang tindih */
function openHelpSubModal() {
    // Tutup modal pengaturan terlebih dahulu secara aman
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && settingsModal.classList.contains('active')) {
        toggleModal('settings-modal');
    }
    // Buka modal bantuan (help-modal)
    toggleModal('help-modal');
}

/** Tutup bantuan dan kembali ke halaman pengaturan */
function closeHelpModal() {
    const helpModal = document.getElementById('help-modal');
    if (helpModal && helpModal.classList.contains('active')) {
        toggleModal('help-modal');
    }
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && !settingsModal.classList.contains('active')) {
        toggleModal('settings-modal');
    }
}
window.closeHelpModal = closeHelpModal;

window.handleRestartTourFromSettings = function() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.classList.remove('active');
    }

    setTimeout(() => {
        if (typeof restartAppTour === 'function') {
            restartAppTour();
        } else if (window.appOnboarding) {
            window.appOnboarding.startTour();
        }
    }, 200);
};

/** Buka daftar resep dari profil */
function openRecipesFromProfile() {
    const userModal = document.getElementById('user-modal');
    if (userModal?.classList.contains('active')) {
        toggleModal('user-modal');
    }
    if (typeof window.tampilkanDaftarResepTersimpan === 'function') {
        window.tampilkanDaftarResepTersimpan();
    }
}

// FUNGSI BUKA USER PROFILE
async function openEditProfile() {
    // Ambil data dari blob user_profile atau key individual
    const savedProfileRaw = await getProfileValue('user_profile', null);
    let profileData = null;
    if (savedProfileRaw) {
        try {
            profileData = JSON.parse(savedProfileRaw);
        } catch (e) {
            console.warn('user_profile rusak, fallback ke key individual');
        }
    }
    const nameVal = profileData?.name ?? await getProfileValue("profile_name", "");
    const bakeryVal = profileData?.bakery ?? await getProfileValue("profile_bakery", "");
    const phoneVal = profileData?.phone ?? await getProfileValue("profile_phone", "");
    const emailVal = profileData?.email ?? await getProfileValue("profile_email", "");

    // Ambil elemen input (gunakan optional chaining untuk mencegah error null)
    const editName = document.getElementById("edit-name");
    const editBakery = document.getElementById("edit-bakery");
    const editPhone = document.getElementById("edit-phone");
    const editEmail = document.getElementById("edit-email");

    if (editName) editName.value = nameVal;
    if (editBakery) editBakery.value = bakeryVal;
    if (editPhone) editPhone.value = phoneVal;
    if (editEmail) editEmail.value = emailVal;

    // Manajemen tampilan modal
    const userModal = document.getElementById("user-modal");
    const editModal = document.getElementById("edit-profile-modal");

    userModal?.classList.remove("active");
    userModal?.setAttribute("inert", "");
    
    if (editModal) {
        editModal.classList.add("active");
        editModal.removeAttribute("inert");
        document.body.style.overflow = "hidden";
    } else {
        console.error("Error: Elemen #edit-profile-modal tidak ditemukan di HTML!");
    }
}

function closeEditProfile() {
    const userModal = document.getElementById("user-modal");
    const editModal = document.getElementById("edit-profile-modal");

    editModal?.classList.remove("active");
    editModal?.setAttribute("inert", "");
    userModal?.classList.add("active");
    userModal?.removeAttribute("inert");
    document.body.style.overflow = "hidden";
    if (typeof loadDynamicProfile === 'function') loadDynamicProfile(false);
}

async function getProfileValue(key, defaultValue = "") {
    try {
        if (window.Capacitor?.Plugins?.Preferences) {
            const { value } =
                await Capacitor.Plugins.Preferences.get({ key });
            if (value !== null && value !== undefined && value !== "") {
                return value;
            }
        }

    } catch (e) {
        console.warn("Preferences GET gagal :", e);
    }
    return localStorage.getItem(key) || defaultValue;
}

async function setProfileValue(key, value) {
    try {
        if (window.Capacitor?.Plugins?.Preferences) {
            await Capacitor.Plugins.Preferences.set({
                key,
                value
            });
        }
    } catch (e) {
        console.warn("Preferences SET gagal :", e);
    }
    localStorage.setItem(key, value);
}

// FUNGSI LOAD PROFILE
async function loadProfile() {
    const profile = {
        name: await getProfileValue(
            "profile_name",
            "Pengguna"
        ),

        bakery: await getProfileValue(
            "profile_bakery",
            "Nama Bakery"
        ),

        phone: await getProfileValue(
            "profile_phone",
            "-"
        ),

        email: await getProfileValue(
            "profile_email",
            "-"
        )
    };

    document.getElementById("profile-name").textContent =
        profile.name;

    document.getElementById("profile-bakery").textContent =
        profile.bakery;

    const phone =
        document.getElementById("profile-phone");

    if (phone)
        phone.textContent = profile.phone;

    const email =
        document.getElementById("profile-email");

    if (email)
        email.textContent = profile.email;

}

// FUNGSI SIMPAN USER PROFILE
async function saveProfile() {
    const profile = {
        name: document.getElementById("edit-name").value.trim() || "Pengguna",
        bakery: document.getElementById("edit-bakery").value.trim() || "Nama Bakery",
        phone: document.getElementById("edit-phone").value.trim() || "-",
        email: document.getElementById("edit-email").value.trim() || "-"
    };

    await setProfileValue(
        "profile_name",
        profile.name
    );

    await setProfileValue(
        "profile_bakery",
        profile.bakery
    );

    await setProfileValue(
        "profile_phone",
        profile.phone
    );

    await setProfileValue(
        "profile_email",
        profile.email
    );

    await setProfileValue('user_profile', JSON.stringify(profile));
    await renderUserProfile();
    closeEditProfile();
    showToast("Profil berhasil diperbarui.");
}

// FUNGSI SAPAAN
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = "Selamat Datang";
    
    if (hour >= 4 && hour < 11) {
        greeting = "Selamat Pagi";
    } else if (hour >= 11 && hour < 15) {
        greeting = "Selamat Siang";
    } else if (hour >= 15 && hour < 18) {
        greeting = "Selamat Sore";
    } else {
        greeting = "Selamat Malam";
    }
    
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
        greetingEl.innerText = greeting + ",";
    }
}

// Panggil fungsi ini tepat setelah user terdeteksi berhasil login
function aturTampilanSetelahLogin() {
    // 1. Sembunyikan kotak form login/auth
    const authWrapper = document.getElementById('auth-wrapper');
    if (authWrapper) {
        authWrapper.style.display = 'none';
    }

    // 2. Tampilkan elemen utama aplikasi.
    // Prioritaskan #app-container (elemen utama yang ada di markup), kemudian fallback ke id/class lain jika dibutuhkan.
    const appContainer = document.getElementById('app-container') || document.getElementById('main-app') || document.querySelector('.main-content');
    if (appContainer) {
        // Biarkan CSS mengatur layout; hanya hapus style display:none yang dipasang inline jika ada
        try {
            if (appContainer.style) {
                appContainer.style.display = '';
            }
        } catch (e) {
            // defensif: jika terjadi error, set ke block sebagai fallback
            appContainer.style.display = 'block';
        }
    }

    // 3. Ubah kelas body agar aturan CSS seperti body.logged-in .container berlaku
    document.body.classList.remove('logged-out');
    document.body.classList.add('logged-in');
}

function perbaruiTampilanUnitUsaha() {
    const elemenProfil = document.getElementById('profile-bakery');
    const elemenTampil = document.getElementById('display-unit-usaha');

    if (elemenProfil && elemenTampil) {
        // Deteksi apakah profile-bakery itu input form (.value) atau teks biasa (.textContent)
        const namaUsaha = (elemenProfil.value || elemenProfil.textContent || "").trim();
        
        // Suntikkan ke HTML, berikan fallback jika pengguna belum mengisi nama
        elemenTampil.textContent = namaUsaha !== "" ? namaUsaha : "-";
    }
}

// ============================================================
// FUNGSI GAMIFIKASI
// ============================================================
(() => {
  const mount = () => {
    try {
      let card = document.getElementById('gamification-card');
      if (card) return card;
      
      // Judul "Log Pencapaian" dicari lewat STRUKTUR (h3 tepat sebelum .log-container milik #dynamic-achievement-logs),
      // bukan lewat teksnya: saat bahasa diganti teksnya berubah, pencarian gagal, lalu kartu jatuh ke container.prepend()
      // dan pindah ke paling atas. Pencarian berbasis teks dipertahankan hanya sebagai cadangan.
      const logBox = (document.getElementById('dynamic-achievement-logs') || {}).parentNode;
      const prev = logBox && logBox.previousElementSibling;
      const titleByStructure = prev && prev.classList.contains('profile-section-title') ? prev : null;
      const titles = Array.from(document.querySelectorAll('.profile-section-title'));
      const logTitle = titleByStructure || titles.find(el => el.textContent.includes('Log Pencapaian'));
      const container = document.querySelector('#user-modal .profile-container');
      if (!container && !logTitle) return null;
      
      card = document.createElement('section');
      card.id = 'gamification-card'; 
      card.className = 'profile-card gamification-card';
      card.setAttribute('aria-label', 'Kemajuan gamifikasi');
      
      card.innerHTML = `
        <div class="gamification-head">
            <div class="gamification-title">🏆 Kemajuan Baker</div>
            <div class="gamification-level-group">
                <span id="game-level" class="gamification-level">Level 1</span>
                <span id="game-rank" class="gamification-rank">Apprentice</span>
            </div>
        </div>
        <div class="gamification-xp">
            <span id="game-xp"><strong>0 XP</strong></span>
            <span id="game-next">100 XP menuju level berikutnya</span>
        </div>
        <div class="gamification-track" aria-hidden="true">
            <div id="game-xp-fill" class="gamification-fill" style="width: 0%;"></div>
        </div>
        <div class="gamification-meta">
            <div class="gamification-pill">🔥 Streak<strong id="game-streak">0 hari</strong></div>
            <div class="gamification-pill">🍩 Resep<strong id="game-recipes">0</strong></div>
            <div class="gamification-pill">⏱️ Proofing<strong id="game-proofing">0</strong></div>
            <div class="gamification-pill coin-pill">🪙 Koin<strong id="game-coins">0</strong></div>
        </div>
        <div class="gamification-section-title">📝 Misi Harian (Daily Bakers)</div>
        <div class="daily-quests-container" id="game-quests">
            <div class="quest-item"><div class="quest-text">Menunggu misi...</div></div>
        </div>
        <div class="gamification-section-title">🎖️ Pencapaian Keahlian</div>
        <div id="game-badges" class="gamification-badges" aria-label="Badge dan hadiah"></div>
      `;
      
      if (logTitle && logTitle.parentNode) {
          logTitle.parentNode.insertBefore(card, logTitle);
      } else if (container) {
          container.prepend(card);
      }
      return card;
    } catch (e) {
      console.error("Mount error:", e);
      return null;
    }
  };

  const renderAchievementLogs = (currentLevel) => {
    try {
      const container = document.getElementById('dynamic-achievement-logs');
      if (!container) return;

      if (typeof currentLevel === 'undefined' || isNaN(currentLevel)) {
        currentLevel = GamificationModule.state ? GamificationModule.state.level : 1;
      }

      const unlockedMilestones = GamificationData.filter(item => currentLevel >= item.level).reverse();

      if (!unlockedMilestones.length) {
        container.innerHTML = `<li class="log-empty" style="text-align: center; color: #94a3b8; padding: 12px;">Belum ada pencapaian yang diraih.</li>`;
        return;
      }

      container.innerHTML = unlockedMilestones.map(item => `
        <li class="log-item" style="padding: 12px 14px; margin-bottom: 10px; border-radius: 14px; background: rgba(242, 210, 169, 0.22); display: flex; gap: 12px; align-items: center; border: 1px solid rgba(78, 52, 46, 0.06);">
          <div style="font-size: 1.6rem; background: #fff; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.05); flex-shrink: 0;">${item.icon}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 800; font-size: 0.85rem; color: var(--chocolate); margin-bottom: 2px;">${item.badgeTitle} (Lv. ${item.level})</div>
            <div style="font-size: 0.75rem; color: rgba(78, 52, 46, 0.8); line-height: 1.3;">${item.message}</div>
            <div style="font-size: 0.65rem; color: #94a3b8; margin-top: 4px; font-weight: 600;">Status: Terbuka & Aktif</div>
          </div>
        </li>
      `).join('');
    } catch (e) {
      console.error("Render logs error:", e);
    }
  };

  // Daftarkan ke window agar bisa diakses oleh fungsi luar (seperti renderUserProfile)
  window.renderAchievementLogs = renderAchievementLogs;

  // Renderer tipis: seluruh angka berasal dari GamificationModule (Supabase + cache offline)
  const refresh = async () => {
    try {
      if (!mount()) return;
      GamificationModule.checkBadges();
      GamificationModule.renderUI();
    } catch (e) {
      console.error("Refresh error:", e);
    }
  };

  window.GamificationUI = {
    mount,
    refresh,
    renderAchievementLogs,
    // Dipertahankan untuk kompatibilitas; inisialisasi sesi ditangani listener auth tunggal
    async afterLogin() { await refresh(); }
  };

  // Listener auth TIDAK dipasang di sini lagi (satu listener tunggal ada di blok login,
  // setelah client Supabase dibuat) supaya tidak ada init ganda / race condition.
  document.addEventListener('DOMContentLoaded', () => { refresh(); });
})();

// ============================================================
// FUNGSI ARTIKEL & TIPS SLIDER
// ============================================================
function initArticleSlider() {
    const wrapper = document.getElementById('article-wrapper');
    const dotsContainer = document.getElementById('article-dots');
    if (!wrapper || !dotsContainer) return;

    const slides = wrapper.querySelectorAll('.article-slide');
    const totalSlides = slides.length;
    let currentIndex = 0;
    let autoPlayInterval;

    // 1. Buat titik indikator (dots) secara dinamis sesuai jumlah slide
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.classList.add('article-dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
            goToSlide(i);
            resetAutoPlay();
        });
        dotsContainer.appendChild(dot);
    }

    const dots = dotsContainer.querySelectorAll('.article-dot');

    // 2. Fungsi pindah slide
    function goToSlide(index) {
        currentIndex = index;
        const slideWidth = wrapper.offsetWidth;
        wrapper.scrollTo({
            left: slideWidth * currentIndex,
            behavior: 'smooth'
        });
        updateDots();
    }

    // 3. Fungsi perbarui status keaktifan titik indikator
    function updateDots() {
        dots.forEach((dot, idx) => {
            if (idx === currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // 4. Siklus Berjalan Otomatis (Auto-play setiap 5 detik)
    function startAutoPlay() {
        autoPlayInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % totalSlides;
            goToSlide(currentIndex);
        }, 5000); // 5000ms = 5 detik
    }

    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        startAutoPlay();
    }

    // 5. Sinkronisasi Titik Indikator jika User Menggeser Sendiri Menggunakan Jari (Swipe)
    wrapper.addEventListener('scroll', () => {
        const slideWidth = wrapper.offsetWidth;
        if (slideWidth > 0) {
            const newIndex = Math.round(wrapper.scrollLeft / slideWidth);
            if (newIndex !== currentIndex && newIndex < totalSlides) {
                currentIndex = newIndex;
                updateDots();
            }
        }
    });

    // Deteksi interaksi sentuhan untuk menjeda autoplay sejenak saat digeser user
    wrapper.addEventListener('touchstart', () => clearInterval(autoPlayInterval));
    wrapper.addEventListener('touchend', () => resetAutoPlay());

    // Jalankan pertama kali
    startAutoPlay();
}

// 2. Fungsi Realtime yang aman dari duplikasi channel
async function initSupabaseRealtime() {
    if (globalResepChannel) {
        await supabase.removeChannel(globalResepChannel);
        globalResepChannel = null;
    }

    // Buat channel baru
    globalResepChannel = supabase.channel('resep-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resep' }, payload => {
            console.log('Perubahan realtime:', payload);
        })
        .subscribe();

    try {
        // Hapus channel lama jika sudah ada sebelum membuat yang baru
        if (globalResepChannel) {
            await window.supabase.removeChannel(globalResepChannel);
            globalResepChannel = null;
        }

        // Buat channel baru
        globalResepChannel = window.supabase.channel('sinkronisasi-resep');

        globalResepChannel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, payload => {
                console.log('Pembaruan dari server tertangkap!', payload);
                if (typeof tanganiPerubahanResepRealtime === 'function') {
                    tanganiPerubahanResepRealtime(payload);
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime Listener Aktif!');
                }
            });
    } catch (err) {
        console.error('Gagal mengaktifkan Realtime Supabase:', err);
    }
}

// ------------------------------------------------------------
// TIMER & PROOFING
// ------------------------------------------------------------
// FUNGSI MENAMPILKAN LOG DI PROFIL (Mendukung Mobile Native & PWA)
async function renderProofingLogs() {
    const container = document.getElementById('dynamic-proofing-logs');
    if (!container) return;

    let rawLogs = [];
    try {
        let stored = null;
        
        // 1. Ambil data dari Native Mobile (Capacitor) jika tersedia
        if (window.Capacitor && window.Capacitor.Plugins.Preferences) {
            const { value } = await Capacitor.Plugins.Preferences.get({ key: 'proofing_logs' });
            stored = value;
        }
        
        // 2. Fallback PWA Browser
        if (!stored) {
            stored = localStorage.getItem('proofing_logs');
        }

        if (stored) {
            rawLogs = JSON.parse(stored);
        } else if (Array.isArray(window.proofingHistory)) {
            rawLogs = window.proofingHistory;
        }
    } catch (e) {
        console.error("Gagal membaca storage proofing logs:", e);
        if (Array.isArray(window.proofingHistory)) rawLogs = window.proofingHistory;
    }

    // Ambil maksimal 5 log terbaru dan balik urutannya (terbaru di atas)
    const logs = Array.isArray(rawLogs) ? rawLogs.slice(-5).reverse() : [];
    container.innerHTML = '';

    if (!logs.length) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'log-empty';
        emptyItem.textContent = 'Belum ada aktivitas proofing terbaru.';
        container.appendChild(emptyItem);
        return;
    }

    // Bagian ini tetap menggunakan gaya UI lama Anda yang sudah bagus
    logs.forEach((entry) => {
        // Pemetaan properti yang aman dan fleksibel
        const title = entry.title || entry.recipe || entry.name || 'Proofing';
        
        // Gabungkan durasi & suhu jika format message kosong
        let details = entry.message || entry.details || entry.note;
        if (!details && (entry.duration || entry.temp)) {
            const dur = entry.duration || '0';
            const temp = entry.temp || '--';
            const hum = entry.humidity || '--';
            details = `Durasi: ${dur}m | Suhu: ${temp}°C | Kelembapan: ${hum}%`;
        }
        if (!details) details = 'Aktivitas proofing dicatat.';

        // Parsing waktu
        const timeVal = entry.timestamp || entry.time || entry.createdAt || Date.now();
        const timestamp = new Date(timeVal);

        const item = document.createElement('li');
        item.className = 'log-item';
        item.style.padding = '8px 0';
        item.style.borderBottom = '1px dashed rgba(78,52,46,0.15)';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.gap = '10px';
        row.style.alignItems = 'baseline';

        const titleEl = document.createElement('strong');
        titleEl.style.fontSize = '0.95rem';
        titleEl.textContent = `🍞 ${title}`;

        const timeEl = document.createElement('small');
        timeEl.style.color = 'rgba(78,52,46,0.6)';
        timeEl.style.fontSize = '0.75rem';
        timeEl.textContent = isNaN(timestamp.getTime()) ? '--:--' : timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        row.appendChild(titleEl);
        row.appendChild(timeEl);

        const detailRow = document.createElement('div');
        detailRow.style.marginTop = '4px';
        detailRow.style.fontSize = '0.82rem';
        detailRow.style.color = 'rgba(78,52,46,0.8)';
        detailRow.textContent = details;

        item.appendChild(row);
        item.appendChild(detailRow);
        container.appendChild(item);
    });
}

// FUNGSI MENAMBAH LOG (Mendukung Mobile Native & PWA)
async function appendProofingLog(entry) {
    let logs = [];
    try {
        let stored = null;
        
        // 1. Coba baca dari penyimpanan Native Mobile (Capacitor)
        if (window.Capacitor && window.Capacitor.Plugins.Preferences) {
            const { value } = await Capacitor.Plugins.Preferences.get({ key: 'proofing_logs' });
            stored = value;
        }
        
        // 2. Fallback baca dari PWA Browser (localStorage)
        if (!stored) {
            stored = localStorage.getItem('proofing_logs');
        }

        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) logs = parsed;
        }
    } catch (e) {
        console.warn('Gagal membaca proofing_logs:', e);
    }
    
    // Tambahkan log baru dengan timestamp
    logs.push({ ...entry, timestamp: entry.timestamp || Date.now() });
    
    // Batasi maksimal 50 riwayat agar memori tidak penuh
    if (logs.length > 50) logs = logs.slice(-50); 
    
    const jsonString = JSON.stringify(logs);
    
    // 3. Simpan ke PWA Browser
    localStorage.setItem('proofing_logs', jsonString);
    
    // 4. Simpan ke Native Mobile
    if (window.Capacitor && window.Capacitor.Plugins.Preferences) {
        try {
            await Capacitor.Plugins.Preferences.set({ key: 'proofing_logs', value: jsonString });
        } catch (err) {
            console.warn('Gagal menyimpan log ke penyimpanan Native:', err);
        }
    }
    
    // Simpan di variabel memori sementara
    window.proofingHistory = logs;

    // Jika halaman profil sedang terbuka, langsung perbarui tampilannya secara real-time
    if (typeof renderProofingLogs === 'function') {
        renderProofingLogs();
    }
}

function readProofingLogsFromStorage() {
    try {
        const stored = localStorage.getItem('proofing_logs');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.warn('Gagal parse proofing_logs:', e);
    }
    return Array.isArray(window.proofingHistory) ? window.proofingHistory : [];
}

async function jadwalkanAlarmProofing(menitDurasi) {
    if (!window.Capacitor) {
        window.DEBUG && console.log("Berjalan di browser biasa, mengabaikan alarm native.");
        return;
    }

    try {
        // 1. Cek status izin terlebih dahulu tanpa memicu pop-up prompt
        let permStatus = await LocalNotifications.checkPermissions();
        
        // 2. Jika statusnya belum pernah diminta (prompt), atau ditolak, minta izin secara formal
        if (permStatus.display !== 'granted') {
            permStatus = await LocalNotifications.requestPermissions();
        }

        // 3. Jika pengguna tetap menolak, berikan edukasi lewat UI/Alert kustom
        if (permStatus.display === 'denied') {
            alert("⏱️ Notifikasi Terblokir\n\nUntuk mendapatkan alarm saat proses proofing selesai di latar belakang, mohon aktifkan izin notifikasi aplikasi ini melalui Pengaturan HP Anda.");
            console.warn('Notifications are blocked by the user or OS.');
            return; 
        }

        // 4. Jika diizinkan, jadwalkan alarm ke sistem operasi Android
        await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
        await LocalNotifications.schedule({
            notifications: [
                {
                    title: "⏱️ Proofing Selesai!",
                    body: "Adonan donat Anda telah mengembang sempurna. Segera lakukan tindakan!",
                    id: 1,
                    schedule: { at: new Date(Date.now() + menitDurasi * 60 * 1000) },
                    sound: 'alarm.wav', 
                    actionTypeId: "",
                    extra: null
                }
            ]
        });
        window.DEBUG && console.log("✅ Alarm Capacitor berhasil dijadwalkan untuk " + menitDurasi + " menit.");
    } catch (error) {
        console.error("Gagal mengatur notifikasi lewat Capacitor:", error);
    }
}

//==================================================================================
// FUNGSI TOMBOL PROOFING
//==================================================================================
function parseCountdownToSeconds(text) {
    if (!text || typeof text !== 'string') return 0;
    const parts = text.trim().replace(/^\+/, '').split(':').map(p => parseInt(p, 10));
    if (parts.some(n => isNaN(n))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
}

//1. UPDATE TIMER DISPLAY
// PERTAHANKAN fungsi updateTimerDisplay Anda tetap utuh seperti semula.
function updateTimerDisplay(totalSeconds) {
    let display = document.getElementById('countdown');
    if (!display) return;
    let absSec = Math.abs(totalSeconds);
    let m = Math.floor(absSec / 60);
    let s = absSec % 60;
    let tandaOvertime = totalSeconds < 0 ? '+' : '';
    if (m >= 60) {
        let h = Math.floor(m / 60);
        let sisaMinit = m % 60;
        display.innerText = `${tandaOvertime}${String(h).padStart(2, '0')}:${String(sisaMinit).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } else {
        display.innerText = `${tandaOvertime}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
}

// CIRCLE PROGRESS
function updateCircleProgress() {
    let circle = document.getElementById('progress-circle');
    if (!circle) return;
    
    const isMini = document.getElementById('app-container').classList.contains('mini-mode');
    const circumference = isMini ? 282.7 : 904.78;
    
    if (!Number.isFinite(globalTotalSeconds) || !Number.isFinite(globalInitialSeconds) || globalInitialSeconds <= 0) {
        circle.style.strokeDashoffset = "0";
        circle.style.stroke = "var(--accent)"; // Kembalikan ke warna default jika kosong
        return;
    }
    let offset = 0;
    if (globalTotalSeconds >= 0) {
        offset = circumference - ((globalTotalSeconds / globalInitialSeconds) * circumference);
    } else {
        offset = circumference; 
    }
    circle.style.strokeDashoffset = offset;

// --- LOGIKA PERUBAHAN 3 WARNA BERDASARKAN SISA WAKTU PROOFING ---
// 2. DEFINISIKAN VARIABEL DI SINI (Setelah dipastikan globalInitialSeconds & globalTotalSeconds valid)
let waktuBerjalanPersen = ((globalInitialSeconds - globalTotalSeconds) / globalInitialSeconds) * 100;

if (globalTotalSeconds < 0) {
    // Jika sudah masuk waktu tambahan / Over-proofing (+)
    circle.style.stroke = "#d32f2f"; // Tetap merah menyala #80ef80 d32f2f
} else if (waktuBerjalanPersen <= 33.33) {
    // TAHAP 1: Masih di 1/3 awal waktu proofing (0% - 33.33%)
    // Menggunakan warna default accent aplikasi Anda
    circle.style.stroke = "#80ef80"; // var(--accent)
} else if (waktuBerjalanPersen > 33.33 && waktuBerjalanPersen <= 66.66) {
    // TAHAP 2: Sudah melalui 2/3 jalannya waktu proofing (33.34% - 66.66%)
    // Berubah warna menjadi Orange Pekat/Amber
    circle.style.stroke = "#FF9800"; // #FF9800
} else {
    // TAHAP 3: Mendekati 3/3 akhir waktu proofing (di atas 66.66% hingga selesai)
    // Berubah menjadi warna Merah tanda waspada siap goreng / overproofing
    circle.style.stroke = "#ff0000"; //d32f2f
}
}

// FUNGSI LABEL ETA (ESTIMATED TIME OF ARRIVAL) - MENUNJUKKAN PERKIRAAN WAKTU SELESAI PROOFING BERDASARKAN DURASI YANG DIPILIH
function updateETALabel(minutes) {
    const el = document.getElementById('time-eta');
    if (!el) return;

    const now = new Date();
    const eta = new Date(now.getTime() + minutes * 60000);
    
    const hours = eta.getHours().toString().padStart(2, '0');
    const mins = eta.getMinutes().toString().padStart(2, '0');
    
    el.innerText = `Selesai ± ${hours}:${mins}`;
}

function handleTimerClick() {
    if (isTimerRunning) return; 
    
    const startEl = document.getElementById('time-start'); // TAMBAHAN
    if (startEl) startEl.innerText = "";                   // TAMBAHAN

    const display = document.getElementById('countdown');
    display.innerText = "00:00";
    totalDurationMinutes = 0;
    currentSelectedBaseDuration = 0;
    globalTotalSeconds = 0;
    globalInitialSeconds = 0;
    localStorage.removeItem('activeMode');
    display.style.color = "var(--chocolate)";
    updateCircleProgress();
    updateTimeLabels(0, 0);
    clearProofingState();
    document.getElementById('ai-tips').innerText = "Waktu dikosongkan. Silakan pilih mode atau atur manual.";
    handleTimerClick()
}

function setControlsDisabled(disabled) {
    document.getElementById('btn-mode-initial').disabled = disabled;
    document.getElementById('btn-mode-rounding').disabled = disabled;
    document.getElementById('btn-mode-final').disabled = disabled;
    document.getElementById('custom-time').disabled = disabled;
    document.getElementById('set-btn').disabled = disabled;
    document.getElementById('off-temp').disabled = disabled;
    document.getElementById('off-hum').disabled = disabled;
}

function persistProofingState() {
    const safeTotalSeconds = Number.isFinite(globalTotalSeconds) ? Math.round(globalTotalSeconds) : 0;
    const safeInitialSeconds = Number.isFinite(globalInitialSeconds) && globalInitialSeconds > 0
        ? Math.round(globalInitialSeconds)
        : Math.max(1, Math.abs(safeTotalSeconds));
    localStorage.setItem('proofing_state', JSON.stringify({
        totalSeconds: safeTotalSeconds,
        initialSeconds: safeInitialSeconds,
        isRunning: isTimerRunning,
        savedAt: Date.now()
    }));
}

function clearProofingState() {
    localStorage.removeItem('proofing_state');
    localStorage.removeItem('user_profile_weather_cache'); // jika diperlukan
    
    // Hentikan interval timer yang sedang berjalan di background agar tidak menumpuk
    if (window.proofingInterval) {
        clearInterval(window.proofingInterval);
        window.proofingInterval = null;
    }

    // PERBAIKAN: taruh di sini (bukan hanya di tombol Reset) supaya SEMUA jalur yang
    // membersihkan state proofing — reset manual, restore state basi saat app dibuka
    // kembali, dsb — ikut menghentikan suara alarm yang mungkin masih berbunyi (sebelumnya
    // menekan RESET PROOFING tidak menghentikan nada sama sekali, nada terus main sendiri
    // sampai durasi filenya habis).
    if (typeof hentikanSemuaSuaraAlarm === 'function') {
        hentikanSemuaSuaraAlarm();
    }
    
    isTimerRunning = false;
    alarmTriggered = false;
}

function handleResetProofing() {
    clearProofingState();
    
    // Kembalikan tombol ke kondisi awal
    const mainBtn = document.getElementById('main-start-btn');
    if (mainBtn) {
        mainBtn.innerText = "START PROOFING";
        mainBtn.style.background = "var(--chocolate)"; // atau warna default Anda
    }
    
    // Cari tahap proofing yang sedang aktif (tombol mode dinamis atau tab lama)
    const activeTab = document.querySelector('#mode-grid-container .mode-btn.active')
        || document.querySelector('#mode-grid-container .mode-btn[style*="background: var(--accent)"]')
        || document.querySelector('.proofing-tab.active');
    if (activeTab) {
        setTimerByTab(activeTab);
    } else {
        resetToManualInput();
    }
}

function resetToManualInput() {
    const customInput = document.getElementById('custom-time');
    const minutes = parseInt(customInput && customInput.value, 10);
    if (Number.isFinite(minutes) && minutes > 0) {
        if (typeof setCustomTime === 'function') {
            setCustomTime();
            return;
        }
        globalTotalSeconds = minutes * 60;
        globalInitialSeconds = globalTotalSeconds;
        totalDurationMinutes = minutes;
        if (typeof updateTimerDisplay === 'function') updateTimerDisplay(globalTotalSeconds);
        if (typeof updateCircleProgress === 'function') updateCircleProgress();
        if (typeof updateTimeLabels === 'function') updateTimeLabels(minutes, 0, false);
        return;
    }
    globalTotalSeconds = 0;
    globalInitialSeconds = 0;
    totalDurationMinutes = 0;
    const display = document.getElementById('countdown');
    if (display) {
        display.innerText = '00:00';
        display.style.color = 'var(--chocolate)';
    }
    if (typeof updateCircleProgress === 'function') updateCircleProgress();
}

function setTimerByTab(tabEl) {
    if (!tabEl) {
        resetToManualInput();
        return;
    }
    const modeKey = String(tabEl.id || '').replace('btn-mode-', '');
    const activeMode = localStorage.getItem('activeMode') || '';
    if (activeMode.includes('_') && typeof setProductStage === 'function' && typeof proofingStages !== 'undefined') {
        const [productKey, stageKey] = activeMode.split('_');
        const stages = proofingStages[productKey] || [];
        const stage = stages.find(s => s.key === stageKey) || stages[0];
        if (stage) {
            setProductStage(productKey, stage.key, stage.minutes, stage.desc);
            return;
        }
    }
    if (['initial', 'rounding', 'final'].includes(modeKey) && typeof setMode === 'function') {
        setMode(modeKey);
        return;
    }
    resetToManualInput();
}

/** Alias tombol mode lama (Initial/Rounding/Final) ke setMode */
function setProofingMode(label, _minutes) {
    const map = { Initial: 'initial', Rounding: 'rounding', Final: 'final' };
    const mode = map[label] || String(label || '').toLowerCase();
    if (typeof setMode === 'function' && ['initial', 'rounding', 'final'].includes(mode)) {
        setMode(mode);
    }
}

// FUNGSI UTAMA UNTUK TOMBOL START/RESET PROOFING
function triggerMainProofing() {
    const mainBtn = document.getElementById('main-start-btn');
    if (mainBtn && mainBtn.innerText === "START PROOFING") {
        // FIX BUG: Validasi menggunakan globalTotalSeconds sebagai sumber kebenaran utama.
        // Jika globalTotalSeconds belum diset, fallback ke baca DOM sebagai cadangan.
        let checkSeconds = globalTotalSeconds;
        if (checkSeconds <= 0) {
            const display = document.getElementById('countdown');
            if (display) checkSeconds = parseCountdownToSeconds(display.innerText);
        }
        if (checkSeconds <= 0) {
            alert("Silakan tentukan waktu sebelum memulai.");
            return;
        }
        if (totalDurationMinutes <= 0) {
            totalDurationMinutes = Math.max(1, Math.round(checkSeconds / 60));
        }
        isTimerRunning = true;
        mainBtn.innerText = "RESET PROOFING"; 
        mainBtn.style.background = "#d32f2f";
        alarmTriggered = false; 
        setControlsDisabled(true);

        const now = new Date();
        const startEl = document.getElementById('time-start');
        if (startEl) {
            const startHours = String(now.getHours()).padStart(2, '0');
            const startMins = String(now.getMinutes()).padStart(2, '0');
            startEl.innerText = `Mulai: ${startHours}:${startMins}`;
        }
        const modeLabel = localStorage.getItem('activeMode') || 'custom';
        const tempText = document.getElementById('temp-val')?.innerText?.replace(/[^\d.-]/g, '') || '--';
        const humText = document.getElementById('hum-val')?.innerText?.replace(/[^\d.-]/g, '') || '--';
        appendProofingLog({
            title: modeLabel === 'custom' ? 'Proofing Manual' : `Proofing ${modeLabel}`,
            duration: Math.max(1, Math.ceil(checkSeconds / 60)),
            temp: tempText,
            humidity: humText,
            message: `Proofing dimulai — ${Math.max(1, Math.ceil(checkSeconds / 60))} menit`
        });

        startProofing();
        if (typeof window.jadwalkanAlarmProofing === 'function') {
            const sisaMenit = Math.max(1, Math.ceil(globalTotalSeconds / 60));
            if (sisaMenit > 0) {
                window.jadwalkanAlarmProofing(sisaMenit);
            }
        }
    } else {
        const startEl = document.getElementById('time-start'); // TAMBAHAN
        if (startEl) startEl.innerText = "";                   // TAMBAHAN

        // PERBAIKAN: menekan "RESET PROOFING" tidak pernah menghentikan suara alarm yang
        // masih berbunyi (file MP3 nada kustom/preset maupun beep bawaan), sehingga nada
        // terus bermain sendiri sampai durasinya habis walau timer sudah direset.
        if (typeof hentikanSemuaSuaraAlarm === 'function') {
            hentikanSemuaSuaraAlarm();
        }

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null; // <-- Kunci agar startProofing() selanjutnya bisa berjalan!
        }
        isTimerRunning = false;
        setControlsDisabled(false); 
        if (mainBtn) {
            mainBtn.innerText = "START PROOFING";
            mainBtn.style.background = "var(--chocolate)";
            if (window.Capacitor) {
            LocalNotifications.cancel({ notifications: [{ id: 1 }] }).catch(err => window.DEBUG && console.log(err));
        }
        }
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
            countdownEl.style.color = "var(--chocolate)";
            countdownEl.innerText = "00:00";
        }
        totalDurationMinutes = 0;
        currentSelectedBaseDuration = 0;
        // FIX BUG: Reset globalTotalSeconds & globalInitialSeconds agar setMode() / processWeatherData()
        // bisa mengisinya kembali dari awal tanpa konflik state lama.
        globalTotalSeconds = 0;
        globalInitialSeconds = 0;
        localStorage.removeItem('activeMode');
        clearProofingState();
        
        updateCircleProgress(); 
        updateTimeLabels(0, 0, false);
        document.getElementById('ai-tips').innerText = "Proses proofing direset total. Silakan atur kembali waktu adonan.";
        
        // Muat ulang estimasi waktu otomatis berdasarkan cuaca terkini
        const tempVal = document.getElementById('temp-val')?.innerText;
        const humVal = document.getElementById('hum-val')?.innerText;
        const temp = parseFloat(tempVal) || 28;
        const hum = parseFloat(humVal) || 70;
        if (typeof processWeatherData === 'function') {
            processWeatherData(temp, hum);
        }
    }
}

// FUNGSI UNTUK TOMBOL CUSTOM TIME (SET) - MEMUNGKINKAN USER MENGATUR WAKTU PROOFING SECARA MANUAL
function setCustomTime() {
    const customInput = document.getElementById('custom-time');
    const customVal = parseInt(customInput.value);

    if (isNaN(customVal) || customVal <= 0) {
        alert("Mohon masukkan durasi yang valid.");
        return;
    }

    totalDurationMinutes = customVal;

    // Tandai mode custom agar refresh cuaca tidak menimpa durasi user
    currentSelectedBaseDuration = -1;

    // 1. Set variabel logika
    globalTotalSeconds = customVal * 60;
    globalInitialSeconds = customVal * 60;

    // 2. Simpan data
    localStorage.setItem('activeMode', 'custom');
    localStorage.setItem('timerDuration', customVal);
    persistProofingState();
   
    // 3. Update semua tampilan UI
    if (typeof updateTimerDisplay === 'function') updateTimerDisplay(globalTotalSeconds);

    if (typeof updateDurationLabel === 'function') {
        updateDurationLabel(customVal);
    } else {
        const label = document.getElementById('lama-label');
        if(label) label.innerText = `Lama: ${customVal} Menit`;
    }
    if (typeof updateETALabel === 'function') updateETALabel(customVal);
    if (typeof updateCircleProgress === 'function') updateCircleProgress();

    if (typeof NotifSystem !== 'undefined') {
        NotifSystem.tambah('timer', 'Mode Timer Custom', `Durasi kustom diatur ke ${customVal} menit.`, '⏱️');
    }

    const tempText = document.getElementById('temp-val')?.innerText?.replace(/[^\d.-]/g, '') || '--';
    const humText = document.getElementById('hum-val')?.innerText?.replace(/[^\d.-]/g, '') || '--';
    if (typeof appendProofingLog === 'function') {
        appendProofingLog({
            title: 'Proofing Manual (Custom)',
            duration: customVal,
            temp: tempText,
            humidity: humText,
            message: `Durasi kustom diatur — ${customVal} menit`
        });
    }

    // 4. Feedback
    const aiTipsEl = document.getElementById('ai-tips');
    if (aiTipsEl) {
        aiTipsEl.innerText = `Waktu diatur manual ke ${customVal} menit.`;
    }
}

/** Alias & fungsi pendukung yang sebelumnya dipanggil via typeof guard */
function calculateIngredients() {
    if (typeof renderRecipeTableBakuTotal === 'function') renderRecipeTableBakuTotal();
    if (typeof hitungHPPBakeryTotal === 'function') hitungHPPBakeryTotal();
}

function hitungKebutuhan() { calculateIngredients(); }

function hitungEstimasiOtomatis(suhu) {
    if (typeof processWeatherData !== 'function' || suhu == null) return;
    let hum = 70;
    const humEl = document.getElementById('hum-val');
    if (humEl) {
        const m = String(humEl.innerText || humEl.textContent).match(/(\d+)/);
        if (m) hum = parseInt(m[1], 10);
    }
    processWeatherData(suhu, hum);
}

function hitungEstimasiProofing(temp, humidity) {
    if (typeof processWeatherData === 'function') processWeatherData(temp, humidity);
}

// =========================================================
// PEMETAAN GLOBAL WINDOW & FUNGSI PENDUKUNG (JANGAN DIHAPUS)
// =========================================================
function perbaruiKalkulasiWaktu() { setCustomTime(); }

function startCountdownEngine() { startProofing(false); }

// ===========================
// FUNGSI SUHU CUACA & LOKASI
// ===========================
// 2. CADANGAN JIKA GPS PERANGKAT MATI ATAU DITOLAK USER (ESTIMASI INTERNET)
async function fetchLocationByIPFallback() {
    try {
        // Tetap beri tahu pengguna di UI bahwa aplikasi sedang mencari lokasi via jaringan
        if (document.getElementById('loc-line1')) {
            document.getElementById('loc-line1').innerText = "Mendeteksi Lokasi via Jaringan...";
        }
        // Gunakan HTTPS (ipapi.co) agar aman dan tidak diblokir browser/sistem
        window.DEBUG && console.log("Mencari lokasi berdasarkan IP Internet (HTTPS)...");
        const res = await fetch('https://ipapi.co/json/');
        const ipData = await res.json();
        
        if (ipData && ipData.latitude && ipData.longitude) {
            // Jalankan fungsi fetch cuaca online (tambahkan await agar sinkron)
            await fetchLocationAndWeather(ipData.latitude, ipData.longitude, "Estimasi Jaringan Provider");
            if (typeof kirimPesanKeSW === "function") {
                kirimPesanKeSW(ipData.latitude, ipData.longitude);
            }
        } else {
            throw new Error("Data IP Geolocation tidak valid");
        }
    } catch (err) {
        console.error("Metode Fallback IP Gagal:", err);
        if (document.getElementById('loc-line1')) {
            document.getElementById('loc-line1').innerText = "Gagal Mendeteksi Lokasi";
        }
        if (document.getElementById('loc-line2')) {
            document.getElementById('loc-line2').innerText = "Silakan aktifkan GPS Anda atau jalankan Mode Luring.";
        }
        
        // Lempar eror agar fungsi utama (initApp) tahu bahwa ini gagal dan memicu handleOfflinePremium()
        throw err;
    }
}

function processGeocode(geoData, lat, lon) {

    let baris1 = "Lokasi Tidak Diketahui";
    let baris2 = `Koordinat: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`;
    let fullLocationName = "Lokasi Tidak Diketahui";
    let profileLocation = "Tidak diketahui";

    if (geoData && geoData.address) {
        const addr = geoData.address;
        window.DEBUG && console.log("DEBUG GEOCODE LENGKAP:", JSON.stringify(addr, null, 2));

        profileLocation =
            addr.county ||
            addr.city ||
            addr.municipality ||
            addr.village ||
            addr.state ||
            "Tidak diketahui";

        const jalan = addr.road || addr.neighbourhood || "";
        const desa = addr.village || addr.hamlet || "";
        let kecamatan = addr.subdistrict || addr.municipality || addr.city_district || addr.quarter || 
                        ((!jalan && addr.suburb && addr.suburb.toLowerCase() !== (desa || "").toLowerCase()) ? addr.suburb : "") || addr.town || "";

        if (kecamatan) kecamatan = kecamatan.replace(/(kecamatan|subdistrict)/gi, '').trim();

        let kabupaten = addr.city || addr.regency || addr.county || "";
        if (kabupaten) kabupaten = kabupaten.replace(/(kabupaten|regency|county|city|kota)/gi, '').trim();

        const provinsi = addr.state || "";
        const negara = addr.country || "";

        const komponenBaris1 = [];
        if (jalan) komponenBaris1.push(jalan);
        if (desa && desa.toLowerCase() !== (kecamatan || "").toLowerCase()) komponenBaris1.push(desa);
        if (kecamatan) komponenBaris1.push(kecamatan);
        baris1 = komponenBaris1.length > 0 ? komponenBaris1.join(', ') : "Lokasi Terdeteksi";

        const komponenBaris2 = [];
        if (kabupaten) komponenBaris2.push(kabupaten);
        if (provinsi) komponenBaris2.push(provinsi);
        if (negara) komponenBaris2.push(negara);
        
        // PERBAIKAN DI SINI (menggunakan operator ternary yang benar):
        baris2 = komponenBaris2.length > 0 ? komponenBaris2.join(', ') : "Indonesia";

        fullLocationName = kecamatan && kabupaten ? `${kecamatan}, ${kabupaten}` : (kabupaten || "Lokasi Terdeteksi");
    }

    return {
        baris1,
        baris2,
        fullLocationName,
        profileLocation
    };
}

// URL serverless Vercel: same-origin di web/PWA (hindari CORS), produksi untuk app native
const VERCEL_API_ORIGIN = 'https://timer-proofer.vercel.app';
function getVercelApiUrl(apiPath) {
    const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
    const isCapacitorNative = Boolean(
        window.Capacitor?.isNativePlatform?.() ||
        location.protocol === 'capacitor:' ||
        (location.hostname === 'localhost' && location.protocol === 'https:')
    );
    if (isCapacitorNative) return `${VERCEL_API_ORIGIN}${path}`;
    if (/\.vercel\.app$/i.test(location.hostname) || location.hostname === 'timer-proofer.vercel.app') {
        return `${location.origin}${path}`;
    }
    return `${VERCEL_API_ORIGIN}${path}`;
}

// 1. Fungsi Utama Mengambil Data Backend Vercel & Distribusi Ke Grid UI Masing-Masing
async function fetchLocationAndWeather(lat, lon, source) {
    window.DEBUG && console.log(`Mengambil cuaca dari sumber: ${source} (${lat}, ${lon})`);
    
    // ==========================================
    // PENCEGAH INTERNET FETCH SAAT MODE LURING
    // ==========================================
    const offTempEl = document.getElementById('off-temp');
    if (offTempEl && offTempEl.value !== "" && !navigator.onLine) {
        window.DEBUG && console.log("Fetch dibatalkan karena pengguna menggunakan Mode Luring Premium Manual.");
        if (typeof handleOfflinePremium === "function") handleOfflinePremium();
        return; 
    }

    try {
        // 1. Ambil data dari serverless proxy Vercel
        const url = `${getVercelApiUrl('/api/weather')}?lat=${lat}&lon=${lon}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} - Gagal mengambil data via serverless proxy Vercel`);
        
        // ===== Validasi Content-Type & Parsing JSON =====
        const contentType = response.headers.get("content-type") || "";
        let data;

        if (!contentType.includes("application/json")) {
            const textAlt = await response.text();
            console.error("Response bukan JSON:", textAlt);
            throw new Error("Server mengembalikan format yang tidak valid.");
        }

        const rawText = await response.text();
        try {
            data = JSON.parse(rawText);
        } catch (err) {
            console.error("Response server gagal di-parse sebagai JSON:", rawText);
            throw new Error("Server tidak mengembalikan JSON yang valid.");
        }

        // Ekstraksi data OpenWeather (API proxy: { weather, geocode })
        const weatherData = data.weather || data;
        if (!weatherData || !weatherData.main) {
            throw new Error("Struktur data cuaca tidak valid");
        }
        const temp = weatherData.main.temp;
        const humidity = weatherData.main.humidity;
        const pressure = weatherData.main.pressure;
        const weatherId = weatherData.weather[0].id;
        const mainWeather = weatherData.weather[0].main;
        const description = weatherData.weather[0].description || mainWeather;

        // Memanggil fungsi keterangan waktu
        const waktuLokal = typeof dapatkanKeteranganWaktuLokal === 'function' ? dapatkanKeteranganWaktuLokal() : ''; 
        
        // PROTEKSI: Bersihkan emoji
        let deskripsiBersih = description ? description.replace(/[🌑🌒🌓🌔🌕🌖🌗🌘🌙🌚🌛🌜]/g, '').trim() : '';
        if (deskripsiBersih.startsWith('•')) {
            deskripsiBersih = deskripsiBersih.replace('•', '').trim();
        }
        
        // Cetak hasil ke HTML
        if(document.getElementById('loc-line-weather')) {
            document.getElementById('loc-line-weather').innerHTML = `
                <div class="weather-time-line"></div>
                <div class="weather-status-line" style="font-size: 0.8rem; color: var(--text-weather); opacity: 0.9; line-height: 1.2;">
                    ${Math.round(temp)}°C • ${deskripsiBersih}
                </div>
            `;
            if (typeof perbaruiKeteranganWaktuShrunk === 'function') {
                perbaruiKeteranganWaktuShrunk();
            }
        }

        // --- BAGIAN ALAMAT 2 BARIS ---
        let baris1 = "Lokasi Tidak Diketahui";
        let baris2 = `Koordinat: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`;
        let fullLocationName = "Lokasi Tidak Diketahui";
        let profileLocation = "Lokasi Tidak Diketahui";

        const geoData = data.geocode;
        if (geoData && geoData.address) {
            const addr = geoData.address;
            profileLocation = addr.county || addr.city || addr.municipality || addr.village || addr.state || "Tidak diketahui";

            const jalan = addr.road || addr.neighbourhood || "";
            const desa = addr.village || addr.hamlet || "";
            let kecamatan = addr.subdistrict || addr.municipality || addr.city_district || addr.quarter || 
                            ((!jalan && addr.suburb && addr.suburb.toLowerCase() !== (desa || "").toLowerCase()) ? addr.suburb : "") || addr.town || "";

            if (kecamatan) kecamatan = kecamatan.replace(/(kecamatan|subdistrict)/gi, '').trim();

            let kabupaten = addr.city || addr.regency || addr.county || "";
            if (kabupaten) kabupaten = kabupaten.replace(/(kabupaten|regency|county|city|kota)/gi, '').trim();

            const provinsi = addr.state || "";
            const negara = addr.country || "";

            const komponenBaris1 = [];
            if (jalan) komponenBaris1.push(jalan);
            if (desa && desa.toLowerCase() !== (kecamatan || "").toLowerCase()) komponenBaris1.push(desa);
            if (kecamatan) komponenBaris1.push(`${kecamatan}`);
            baris1 = komponenBaris1.length > 0 ? komponenBaris1.join(', ') : "Lokasi Terdeteksi";

            const komponenBaris2 = [];
            if (kabupaten) komponenBaris2.push(kabupaten);
            if (provinsi) komponenBaris2.push(provinsi);
            if (negara) komponenBaris2.push(negara);
            baris2 = komponenBaris2.length > 0 ? komponenBaris2.join(', ') : "Indonesia";

            fullLocationName = kecamatan && kabupaten ? `${kecamatan}, ${kabupaten}` : (kabupaten || "Lokasi Terdeteksi");
        }

        if (typeof updateProfileSummary === 'function') {
            updateProfileSummary({
                location: profileLocation,
                weather: { temp: temp, humidity: humidity, description: description }
            });
        }
                
        let altitude = null;
        if (typeof dapatkanKetinggianAkurat === 'function') {
            altitude = await dapatkanKetinggianAkurat(lat, lon);
        }
        if (altitude === null || altitude === undefined) {
            altitude = Math.round(44330 * (1 - Math.pow((pressure / 1013.25), 0.190284)));
        }

        if (typeof NotifSystem !== 'undefined' && NotifSystem.tambah) {
            NotifSystem.tambah('cuaca', 'Data cuaca diperbarui', `${fullLocationName} — ${Math.round(temp)}°C`, '🌡️');
        }

        const elLine1 = document.getElementById('loc-line1');
        const elLine2 = document.getElementById('loc-line2');
        if (elLine1) elLine1.innerText = baris1; 
        if (elLine2) elLine2.innerText = baris2;

        if(document.getElementById('temp-val')) document.getElementById('temp-val').innerText = `${Math.round(temp)} °C`;
        if(document.getElementById('hum-val')) document.getElementById('hum-val').innerText = `${humidity} %`;
        if(document.getElementById('pres-val')) document.getElementById('pres-val').innerText = `${pressure} hPa`;
        if(document.getElementById('alt-val')) document.getElementById('alt-val').innerText = altitude + " m";

        if (typeof currentLat !== 'undefined') currentLat = lat;
        if (typeof currentLon !== 'undefined') currentLon = lon;

        if (typeof updateDynamicTheme === 'function') updateDynamicTheme(weatherId, mainWeather);
        if (typeof processWeatherData === 'function') processWeatherData(temp, humidity);

        // --- SIMPAN CACHE LOKAL ---
        localStorage.setItem('donut_weather_cache', JSON.stringify({
            temp: Math.round(temp), hum: humidity, pres: pressure, weatherId: weatherId,
            mainWeather: mainWeather, locationName: `${baris1} | ${baris2}`, lat: lat, lon: lon, timestamp: Date.now()
        }));
        
        localStorage.setItem('cache_suhu', temp);
        localStorage.setItem('cache_kelembaban', humidity);
        localStorage.setItem('saved_altitude', altitude);
        localStorage.setItem('saved_lat', lat);
        localStorage.setItem('saved_lon', lon);

    } catch (error) {
        console.error("Gagal sinkronisasi data:", error);
        
        // =============================================================
        // PERBAIKAN: UI FALLBACK DIPINDAHKAN KE SINI (SAAT BENAR-BENAR EROR)
        // =============================================================
        const premiumBox = document.getElementById('premium-box');
        if (premiumBox) {
            // Gunakan setProperty 'important' untuk menembus inline-style CSS bawaan HTML
            premiumBox.style.setProperty('display', 'block', 'important'); 
            if(document.getElementById('ai-tips')) {
                document.getElementById('ai-tips').innerText = "Gagal memuat cuaca otomatis. Mengalihkan ke Mode Luring (Manual).";
            }
        }

        if (!navigator.onLine || error.message === "Failed to fetch") {
            if (typeof handleOfflinePremium === "function") {
                handleOfflinePremium();
                return; 
            }
        }

        const userMessage = error.message === "Failed to fetch" 
            ? "Koneksi internet terganggu atau server tidak terjangkau." 
            : error.message;

        if(document.getElementById('loc-line1')) document.getElementById('loc-line1').innerText = "Gagal Sinkronisasi Cuaca";
        if(document.getElementById('loc-line2')) document.getElementById('loc-line2').innerText = userMessage;
        
        if(document.getElementById('loc-line-weather')) {
            document.getElementById('loc-line-weather').innerHTML = `
                <div class="weather-time-line"></div>
                <div class="weather-status-line" style="font-size: 0.75rem; opacity: 0.7; color: #e74c3c;">${userMessage}</div>
            `;
            if (typeof perbaruiKeteranganWaktuShrunk === 'function') {
                perbaruiKeteranganWaktuShrunk();
            }
        }
    }
} // Tanda kurung penutup fungsi dipindahkan ke baris paling akhir

function processWeatherData(temp, hum) {
    performAIAnalysis(temp, hum);
    
    // --- TAMBAHKAN LOGIKA BATAS DINAMIS BERDASARKAN MODE ---
    let minLimit = 25; // Default untuk Initial (base 60)
    let maxLimit = 90;
    
    if (currentSelectedBaseDuration === 15) { 
        // Jika sedang dalam mode Rounding
        minLimit = 5;
        maxLimit = 30;
    } else if (currentSelectedBaseDuration === 45) { 
        // Jika sedang dalam mode Final
        minLimit = 15;
        maxLimit = 75;
    }

    if (!isTimerRunning) {
        if (localStorage.getItem('activeMode') === 'custom') {
            return;
        }
        if (currentSelectedBaseDuration === 0) currentSelectedBaseDuration = 30;
        let calculatedTime = Math.max(minLimit, Math.min(maxLimit, Math.round(currentSelectedBaseDuration * Math.pow(0.95, temp - 28))));
        totalDurationMinutes = calculatedTime;
        globalTotalSeconds = calculatedTime * 60;
        globalInitialSeconds = calculatedTime * 60;

        updateTimerDisplay(globalTotalSeconds);
        updateTimeLabels(calculatedTime, 0);
        persistProofingState();
        
        const tipsEl = document.getElementById('ai-tips');
        if (tipsEl) {
            tipsEl.innerHTML = `Suhu terdeteksi ${temp}°C. Dengan kelembaban ${hum}%. <br>Waktu proofing diatur otomatis ke ${calculatedTime} menit.`;
        }
    } else {
        // Jangan ubah timer yang sedang berjalan jika user memilih waktu custom
        if (localStorage.getItem('activeMode') === 'custom') {
            const tipsCustom = document.getElementById('ai-tips');
            if (tipsCustom) tipsCustom.innerHTML = `🔄 Cuaca Diperbarui! Suhu ${temp}°C.<br>Waktu custom (${totalDurationMinutes} menit) tetap berjalan.`;
            return;
        }
        if (globalTotalSeconds > 0) {
            let oldCalculatedTime = totalDurationMinutes;
            let newCalculatedTime = Math.max(minLimit, Math.min(maxLimit, Math.round(currentSelectedBaseDuration * Math.pow(0.95, temp - 28))));

            if (oldCalculatedTime !== newCalculatedTime) {
                if (oldCalculatedTime > 0) {
                    let ratio = globalTotalSeconds / (oldCalculatedTime * 60);
                    globalTotalSeconds = Math.round(newCalculatedTime * 60 * ratio);
                } else {
                    globalTotalSeconds = newCalculatedTime * 60;
                }
                globalInitialSeconds = newCalculatedTime * 60;
                totalDurationMinutes = newCalculatedTime;
                
                let m = Math.floor(globalTotalSeconds / 60);
                let s = globalTotalSeconds % 60;
                updateTimerDisplay(globalTotalSeconds);
                updateCircleProgress();
                updateTimeLabels(m, s, false);
                
                const tipsShift = document.getElementById('ai-tips');
                if (tipsShift) tipsShift.innerHTML = `🔄 Cuaca Diperbarui! Suhu bergeser ke ${temp}°C.<br>Durasi total disesuaikan dari ${oldCalculatedTime} mnt menjadi ${newCalculatedTime} mnt.`;
            } else {
                const tipsStable = document.getElementById('ai-tips');
                if (tipsStable) tipsStable.innerHTML = `🔄 Cuaca Diperbarui! Suhu stabil pada ${temp}°C.<br>Waktu proofing tetap berjalan aman.`;
            }
        } else {
            const tipsOver = document.getElementById('ai-tips');
            if (tipsOver) tipsOver.innerHTML = `🔄 Cuaca Diperbarui!<br>Adonan saat ini sedang dalam status Over-proofing (+).`;
            if (typeof NotifSystem !== 'undefined') {
                NotifSystem.tambah('cuaca', 'Cuaca diperbarui', `Suhu ${temp}°C terdeteksi. Adonan sedang dalam status over-proofing (+).`, '🔄');
            }

        }
    }
}

// =======================================
// FUNGSI AI ANALISIS SUHU DAN CUACA
// =======================================
window.toggleAIAnalysisBox = function() {
    const body = document.getElementById('ai-analysis-body');
    const arrow = document.getElementById('ai-arrow-icon');
    if (!body) return;
    
    if (body.style.display === 'none' || body.style.display === '') {
        body.style.display = 'block';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        
        // Picu pengambilan data dinamis dari AI secara otomatis saat pertama kali dibuka
        if (!window._aiTelemetryLoaded) {
            window._aiTelemetryLoaded = true;
            if (typeof window.muatUlangAnalisisAI === 'function') {
                window.muatUlangAnalisisAI();
            }
        }
    } else {
        body.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(-90deg)';
    }
};

// Pastikan deklarasi ini berada di luar fungsi lain dan dimuat lebih awal
window.muatUlangAnalisisAI = async function() {
    // 1. Deklarasikan variabel nilai awal di baris paling atas agar aman dari scope/reference error
    let nilaiSuhu = 25;
    let nilaiKelembapan = 83;

    const insightEl = document.getElementById('ai-insight');
    const recommendationEl = document.getElementById('ai-recommendation');
    const btn = document.getElementById('ai-refresh-btn') || document.getElementById('btn-ai-trigger');
    const badge = document.getElementById('ai-status-badge');

    const activeProductBtn = document.querySelector('.product-btn.active, [data-product].active, .pill-btn.active, .btn-product.active');
    const jenisProduk = activeProductBtn ? activeProductBtn.innerText.trim() : "Adonan Bakery Umum";

    const elSuhu = document.getElementById('suhu-sekarang');
    const elKelembapan = document.getElementById('kelembapan-sekarang');
    
    if (elSuhu && elSuhu.innerText) {
        let m = elSuhu.innerText.match(/[\d.]+/);
        if (m) nilaiSuhu = parseFloat(m[0]);
    }
    if (elKelembapan && elKelembapan.innerText) {
        let m = elKelembapan.innerText.match(/[\d.]+/);
        if (m) nilaiKelembapan = parseFloat(m[0]);
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `⏳ Menganalisis Telemetri...`;
        btn.style.opacity = "0.7";
    }
    if (badge) {
        badge.style.background = "#FCF3CF";
        badge.style.color = "#B7950B";
        badge.innerText = "🟡 Syncing...";
    }
    if (insightEl) insightEl.innerHTML = "<strong>Insight:</strong> Mengirim data telemetri ke Live Agent...";

    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
        const backendHost = isLocal ? 'https://timer-proofer.vercel.app' : '';

        const payloadData = {
            promptContext: `Kondisi Sensor Saat Ini: Suhu ${nilaiSuhu}°C, Kelembapan ${nilaiKelembapan}%. Produk: ${jenisProduk}. Berikan analisis telemetri, evaluasi ragi, dan rekomendasi penanganan yang spesifik.`,
            suhuRuang: nilaiSuhu,
            temperature: nilaiSuhu,
            waktuProofing: "Otomatis"
        };

        const response = await fetch(`${backendHost}/api/ai-telemetry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payloadData)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Server Error (${response.status}): ${err}`);
        }

        const data = await response.json();
        const hasilAI = data.result || data.analisis || data.insight || "";

        if (insightEl) insightEl.innerHTML = `<strong>Analisis (${jenisProduk} - Suhu ${nilaiSuhu}°C / ${nilaiKelembapan}%):</strong><br><br>${hasilAI.replace(/\n/g, '<br>')}`;
        if (recommendationEl) recommendationEl.innerHTML = `<strong>Status Model:</strong> Berhasil dianalisis berdasarkan sensor real-time.`;
        if (badge) {
            badge.style.background = "#D4EFDF";
            badge.style.color = "#196F3D";
            badge.innerText = "🟢 Live Agent";
        }

    } catch (error) {
        console.warn("API Gagal:", error.message);
        
        if (insightEl) {
            insightEl.innerHTML = `<strong>Insight Offline (${jenisProduk}):</strong> Suhu saat ini ${nilaiSuhu}°C dengan kelembapan ${nilaiKelembapan}%.<br><br>⚠️ <em>Tidak dapat terhubung ke server AI Vercel.</em>`;
        }
        if (badge) {
            badge.style.background = "#FADBD8";
            badge.style.color = "#922B21";
            badge.innerText = "🔴 Disconnected";
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = "🔄 Perbarui Analisis Telemetry";
            btn.style.opacity = "1";
        }
    }
};

//=======================================================
// PASTIKAN FUNGSI INI ADA DAN SUDAH DITULIS DENGAN BENAR
//=======================================================
function dapatkanKeteranganWaktuLokal() {
    const sekarang = new Date();
    const jam = sekarang.getHours();
    
    // Pembagian waktu berdasarkan kebiasaan bahasa Indonesia
    if (jam >= 12 && jam < 13) {
        return "Tengah Siang";
    } else if (jam >= 10 && jam < 15) {
        return "Siang";
    } else if (jam >= 3 && jam < 4) {
        return "Dini Hari";
    } else if (jam >= 4 && jam < 6) {
        return "Fajar";
    } else if (jam >= 6 && jam < 10) {
        return "Pagi";
    } else if (jam >= 15 && jam < 18) {
        return "Sore";
    } else if (jam >= 18 && jam < 19) {
        return "Senja";
    } else if (jam >= 19 && jam < 20) { // Sekitar pukul 17.00 s/d 18.30
        return "Petang";
    } else if (jam >= 20 && jam < 24) { // Sekitar pukul 18.30 s/d 19.30
        return "Malam";
    } else {
        return "Tengah Malam";
    }
}

//=============================================================
// Fungsi otomatis untuk memperbarui elemen teks di shrunk-view
// ============================================================
// Fungsi otomatis untuk memperbarui elemen teks di shrunk-view
function perbaruiKeteranganWaktuShrunk() {
    const elTimeText = document.getElementById('shrunk-time-text');
    const elTimeEmoji = document.getElementById('shrunk-time-emoji');
    
    // Bagian Shrunk View (Saat di-scroll)
    if (elTimeText) {
        const keterangan = dapatkanKeteranganWaktuLokal();
        elTimeText.innerText = keterangan;
        if (elTimeEmoji) {
            if (keterangan === "Pagi" || keterangan === "Fajar") {
                elTimeEmoji.innerText = "🌅";
            } else if (keterangan === "Siang" || keterangan === "Tengah Siang") {
                elTimeEmoji.innerText = "☀️";
            } else if (keterangan === "Sore" || keterangan === "Senja" || keterangan === "Petang") {
                elTimeEmoji.innerText = "🌇";
            } else {
                // MENGGUNAKAN FASE BULAN DINAMIS UNTUK MALAM HARI
                const moon = typeof getMoonPhase === 'function' ? getMoonPhase() : { icon: "🌙" };
                elTimeEmoji.innerText = moon.icon;
            }
        }
    }

    const weatherTimeLineElement = document.querySelector('#loc-line-weather .weather-time-line');
    if (weatherTimeLineElement) {
        const namaWaktuTampil = dapatkanKeteranganWaktuLokal();
        
        let iconWaktu = "☀️"; 
        if (["Sore", "Senja", "Petang"].includes(namaWaktuTampil)) {
            iconWaktu = "🌇";
        } else if (["Malam", "Tengah Malam", "Dini Hari"].includes(namaWaktuTampil)) {
            iconWaktu = "🌙";
        }

        // Ambil teks fase bulan yang sedang aktif dari global variabel jika ada
        const moon = typeof getMoonPhase === 'function' ? getMoonPhase() : { icon: "" };
        const teksFaseBulan = moon.icon || ""; 
        const isMalam = ["Malam", "Tengah Malam", "Dini Hari"].includes(namaWaktuTampil); 

        weatherTimeLineElement.innerHTML = `
                <div style="background-color: ${typeof cardBg !== 'undefined' ? cardBg : 'rgba(0, 0, 0, 0.04)'}; display: inline-flex; flex-direction: column; gap: 4px; padding: 8px 14px; border-radius: 12px; margin-top: 6px; font-size: 0.82rem; font-weight: 500; align-items: center; justify-content: center; width: max-content; max-width: 100%; color: var(--text-weather); transition: all 0.4s ease; box-sizing: border-box;">
                    
                    <div style="font-weight: 700; opacity: 0.95; color: var(--text-weather); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        ${isMalam ? 
                            `<span>${namaWaktuTampil}</span> <span>${teksFaseBulan}</span>` 
                            : 
                            `<span>${namaWaktuTampil}</span> <span>${iconWaktu}</span>`
                        }
                    </div>
                    
                    <div style="width: 100%; height: 1px; background: rgba(148, 163, 184, 0.2); margin: 2px 0;"></div>
                    
                    <div style="font-size: 0.78rem; opacity: 0.9; color: var(--text-weather); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                         <span>${typeof capitalizedCond !== 'undefined' ? capitalizedCond : 'Memuat...'}</span> <span>${typeof iconCuaca !== 'undefined' ? iconCuaca : '☁️'}</span>
                    </div>
                </div>`;
    }
}

// =============================================
// 1. FUNGSI PEMBANTU: HITUNG FASE BULAN DINAMIS
// =============================================
function getMoonPhase() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    let m = month;
    let y = year;

    if (m <= 2) {
        y -= 1;
        m += 12;
    }
    y = y + 4716;
    let v = Math.floor(365.25 * y);
    let r = Math.floor(30.6001 * (m + 1));
    let jd = v + r + day - 1524.5;

    const newMoonRef = 2451549.5;
    let diff = jd - newMoonRef;
    let phase = diff / 29.530588853;
    phase = phase - Math.floor(phase);

    if (phase < 0.03 || phase >= 0.97) {
        return { name: "Bulan Baru", icon: "🌑" };
    } else if (phase < 0.22) {
        return { name: "Sabit Awal", icon: "🌒" };
    } else if (phase < 0.28) {
        return { name: "Kuartal Awal", icon: "🌓" };
    } else if (phase < 0.47) {
        return { name: "Cembung Awal", icon: "🌔" };
    } else if (phase < 0.53) {
        return { name: "Bulan Purnama", icon: "🌕" };
    } else if (phase < 0.72) {
        return { name: "Cembung Akhir", icon: "🌖" };
    } else if (phase < 0.78) {
        return { name: "Kuartal Akhir", icon: "🌗" };
    } else {
        return { name: "Sabit Akhir", icon: "🌘" };
    }
}

// ========================================================
// KETINGGIAN ONLINE - OFFLINE
//=========================================================
async function dapatkanKetinggianAkurat(lat, lon) {
    try {
        // Menggunakan endpoint khusus Elevasi dari Open-Meteo
        const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
        const elevationRes = await fetch(url, { method: 'GET' });

        if (!elevationRes.ok) throw new Error("Server elevasi menolak permintaan");
        
        const elevationData = await elevationRes.json();
        if (elevationData && elevationData.elevation && elevationData.elevation[0] !== undefined) {
            const ketinggianMeter = Math.round(elevationData.elevation[0]);
            return ketinggianMeter;
        } else {
            throw new Error("Struktur data elevasi kosong atau tidak valid");
        }
    } catch (error) {
        console.warn("Gagal mengambil API Ketinggian:", error.message);
        return null; // Kembalikan null jika gagal, agar kita bisa pakai rumus cadangan
    }
}

//=================================================================================
// FUNGSI KHUSUS UNTUK MODE PREMIUM LURING (OFFLINE) - MENGGUNAKAN CACHE TERAKHIR ATAU INPUT MANUAL
//=================================================================================
function handleOfflinePremium() {
    const premiumBox = document.getElementById('premium-box');
    const line1 = document.getElementById('loc-line1');
    const line2 = document.getElementById('loc-line2');
    const retryBtn = document.getElementById('retry-btn');
    // TAMBAHAN
    const offlineIndicator = document.getElementById('offline-mode-indicator');

    // "Paksa Mode Luring" di Pengaturan membuat aplikasi berperilaku seolah offline walau perangkat
    // sebenarnya online -- sebelumnya nilai ini ditulis ke localStorage tapi TIDAK PERNAH dibaca di
    // sini, sehingga mencentang toggle itu sama sekali tidak berpengaruh selama internet menyala.
    const dipaksaLuring = localStorage.getItem('app_force_offline') === 'true';

    // =========================================================================
    // VALIDASI UTAMA: Jika benar-benar online DAN tidak dipaksa luring, sembunyikan kotak & hentikan
    // =========================================================================
    if (navigator.onLine && !dipaksaLuring) {
        if (premiumBox) premiumBox.style.display = "none";
        if (offlineIndicator) offlineIndicator.style.display = "none";
        console.warn("GPS gagal/ditolak, tetapi perangkat tetap online. Kotak premium disembunyikan.");
        
        // Tampilkan pesan error GPS ke user agar mereka tahu internet tidak bermasalah
        // Dibaca lewat data-state (bukan innerText): teks "Mendeteksi lokasi..." ikut diterjemahkan
        // saat bahasa aplikasi bukan Indonesia, sehingga perbandingan innerText gagal cocok.
        if (line1 && line1.dataset.state === "detecting") {
            line1.dataset.state = "error";
            line1.innerText = "Gagal mendapatkan lokasi.";
            if (line2) line2.innerText = "Silakan aktifkan GPS atau muat ulang halaman.";
            if (retryBtn) retryBtn.style.display = "block";
        }
        return; // Menghentikan fungsi agar tidak menimpa data cuaca online
    }

    // =========================================================================
    // OFFLINE SUNGGUHAN ATAU DIPAKSA LEWAT PENGATURAN -- LOGIKA ASLI ANDA DI BAWAH INI AKAN BERJALAN
    // =========================================================================
    if (premiumBox) premiumBox.style.display = "block";
    if (offlineIndicator) offlineIndicator.style.display = dipaksaLuring ? "block" : "none";
    
    // 1. Ambil elemen input HTML
    const offTempEl = document.getElementById('off-temp');
    const offHumEl = document.getElementById('off-hum');
    const offConditionInput = document.getElementById('off-condition');

    // 2. Baca cache data cuaca terakhir dari localStorage
    let cache = {};
    const savedCache = localStorage.getItem('donut_weather_cache');
    if (savedCache) {
        try {
            cache = JSON.parse(savedCache);
        } catch(e) {
            console.error("Gagal membaca struktur JSON cache cuaca:", e);
        }
    }

    // 3. LOGIKA UTAMA: Ambil ketikan user. Jika benar-benar kosong, biarkan kosong agar bisa diketik/dihapus
    // Kita gunakan nilai fallback (cache/default) HANYA untuk perhitungan kalkulasi, bukan untuk memaksa isi kolom.
    let tempInputVal = offTempEl ? offTempEl.value : "";
    let humInputVal = offHumEl ? offHumEl.value : "";

    let temp = tempInputVal !== "" ? parseFloat(tempInputVal) : (cache.temp || 28);
    let humidity = humInputVal !== "" ? parseFloat(humInputVal) : (cache.hum || cache.humidity || 70);

    // Deteksi cuaca dari cache untuk menentukan opsi default jika input kosong
    let teksCuaca = 'clear';
    if (cache.weather && cache.weather[0] && cache.weather[0].main) {
        teksCuaca = cache.weather[0].main.toLowerCase();
    } else if (cache.mainWeather) {
        teksCuaca = cache.mainWeather.toLowerCase();
    } else if (cache.condition) {
        teksCuaca = cache.condition.toLowerCase();
    }

    let defaultCondition = 'clear';
    if (teksCuaca.includes('rain') || teksCuaca.includes('drizzle') || teksCuaca.includes('thunderstorm')) {
        defaultCondition = 'rain';
    } else if (teksCuaca.includes('cloud') || teksCuaca.includes('mist') || teksCuaca.includes('haze') || teksCuaca.includes('overcast')) {
        defaultCondition = 'clouds';
    }
    
    let condition = offConditionInput && offConditionInput.value !== "" ? offConditionInput.value : defaultCondition;

    // 4. OTOMATIS MENGISI KOLOM INPUT HANYA JIKA localStorage BELUM PERNAH PUNYA DATA INPUT OFFLINE
    // Ini memastikan pengisian hanya terjadi sekali di awal, tidak mengunci saat dihapus user
    if (offTempEl && !offTempEl.hasAttribute('data-initialized')) {
        if (offTempEl.value === "") offTempEl.value = Math.round(temp);
        if (offHumEl && offHumEl.value === "") offHumEl.value = Math.round(humidity);
        if (offConditionInput && offConditionInput.value === "") offConditionInput.value = condition;
        
        // Tandai bahwa kolom sudah diisi otomatis pertama kali
        offTempEl.setAttribute('data-initialized', 'true');
    }

    // ==========================================
    // SINKRONISASI KE SHRUNK VIEW (RESPONSIF REAL-TIME)
    // ==========================================
    if (document.getElementById('shrunk-main')) {
        document.getElementById('shrunk-main').innerText = `🌡️ ${Math.round(temp)}°C`;
    }
    if (document.getElementById('shrunk-sub')) {
        document.getElementById('shrunk-sub').innerText = `💧 ${Math.round(humidity)}%`;
    }

    const emojiMap = { 'clear': '☀️', 'panas': '🔥', 'clouds': '☁️', 'mendung': '☁️', 'hujan': '🌧️', 'rain': '🌧️' };
    const textMap = { 'clear': 'Cerah', 'panas': 'Panas', 'clouds': 'Berawan', 'mendung': 'Mendung', 'hujan': 'Hujan', 'rain': 'Hujan' };

    const emoji = emojiMap[condition] || '☀️';
    const text = textMap[condition] || 'Cerah';
    
    if (document.getElementById('shrunk-weather-emoji')) document.getElementById('shrunk-weather-emoji').innerText = emoji;
    if (document.getElementById('shrunk-weather-text')) document.getElementById('shrunk-weather-text').innerText = text;
    // ==========================================

    // 6. PERBARUI INFORMASI LOKASI PADA HEADER CARD
    if (savedCache && cache.locationName) {
        if (line1) line1.innerText = cache.locationName.split('|')[0].trim();
        if (line2) line2.innerText = cache.locationName.split('|')[1].trim() || "";
    } else {
        if (line1) line1.innerText = "📍 Mode Luring Premium";
        if (line2) line2.innerText = "Menggunakan Parameter Manual Mandiri";
    }

    // Ambil data ketinggian/koordinat sekunder
    const altValue = cache.alt || localStorage.getItem('saved_altitude') || "10";
    if (document.getElementById('alt-val')) {
        document.getElementById('alt-val').innerText = altValue + " m";
    }
    
    currentLat = cache.lat || localStorage.getItem('saved_lat');
    currentLon = cache.lon || localStorage.getItem('saved_lon');

    // 7. PERBARUI TEMA VISUAL SECARA DINAMIS BERDASARKAN PILIHAN INPUT CUACA USER
    if (typeof updateDynamicTheme === "function") {
        let weatherId = 800; 
        let weatherMain = "Clear";
        if (condition === 'rain' || condition === 'hujan') { weatherId = 500; weatherMain = "Rain"; }
        else if (condition === 'clouds' || condition === 'mendung') { weatherId = 803; weatherMain = "Clouds"; }
        
        updateDynamicTheme(weatherId, weatherMain);
    }

    // 8. SIMPAN DATA SIMULASI TERBARU KE STORAGE
    localStorage.setItem('donut_weather_cache', JSON.stringify({
        ...cache,
        temp: temp,
        hum: humidity,
        humidity: humidity,
        mainWeather: condition,
        condition: condition
    }));

    // 9. JALANKAN LOGIKA AI AGENT & KALKULASI ULANG ESTIMASI PROOFER
    if (typeof processWeatherData === "function") {
        processWeatherData(temp, humidity);
    }

    if (typeof perbaruiKeteranganWaktuShrunk === 'function') {
        perbaruiKeteranganWaktuShrunk(); 
    }

    if (typeof hitungKebutuhan === "function") {
        setTimeout(() => {
            hitungKebutuhan(); 
        }, 100);
    }
}

// =========================================================
// FUNGSI AI SMART FERMENTATION TELEMETRY
// =========================================================
function toUserFacingError(error) {
  const raw = error?.message || String(error || "Terjadi kesalahan");
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.error?.message === "string") return parsed.error.message;
  } catch (_) { /* bukan JSON */ }
  return raw;
}

function isQuotaError(error) {
  const text = toUserFacingError(error).toLowerCase();
  const code = error?.status || error?.code || error?.error?.code;
  
  // Deteksi semua kemungkinan respons saat server Google sedang sibuk/kehabisan kuota
  return (
    code === 429 ||
    code === 503 ||
    code === 500 || // Google kadang melempar 500 murni saat server mereka gagal merespons
    code === "RESOURCE_EXHAUSTED" ||
    text.includes("quota") ||
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    text.includes("resource_exhausted") ||
    text.includes("high demand") || 
    text.includes("overloaded") ||
    text.includes("service unavailable") ||
    text.includes("internal error")
  );
}

// =========================================================
// FUNGSI UTAMA START PROOFING (GABUNGAN AMAN & PRESISI)
// =========================================================
function startProofing(isRestoring = false) {
    let display = document.getElementById('countdown');

    // 1. Sinkronisasi pengaman global agar tidak bernilai 0 atau NaN
    if (globalTotalSeconds <= 0 && display) {
        globalTotalSeconds = parseCountdownToSeconds(display.innerText);
    }
    if (globalInitialSeconds <= 0) {
        globalInitialSeconds = globalTotalSeconds;
    }

    // 2. Proteksi Autoplay Audio Browser (Mencegah blokir suara alarm)
    try {
        if (typeof dapatkanAudioContext === 'function') {
            dapatkanAudioContext(!isRestoring);
        }
    } catch (e) {
        console.warn("AudioContext belum diizinkan oleh sistem browser:", e);
    }

    // Cegah timer berjalan ganda
    if (isTimerRunning && timerInterval) {
        console.warn("Timer sudah berjalan.");
        return;
    }
    
    if (timerInterval) clearInterval(timerInterval);
    isTimerRunning = true;
    persistProofingState();

    // 3. Waktu target absolut untuk mencegah drift (keterlambatan detik di background)
    targetEndTime = Date.now() + (globalTotalSeconds * 1000);

    timerInterval = setInterval(() => {
        const now = Date.now();
        // Hitung sisa waktu secara absolut berdasarkan jam sistem perangkat
        const remainingMs = targetEndTime - now;
        globalTotalSeconds = Math.round(remainingMs / 1000);
        
        persistProofingState();

        // --- SKENARIO 1: TIMER MASIH BERJALAN NORMAL ---
        if (globalTotalSeconds >= 0) {
            updateTimerDisplay(globalTotalSeconds);
            updateCircleProgress();
            
            const minutesLeft = Math.floor(globalTotalSeconds / 60);
            const secondsLeft = globalTotalSeconds % 60;
            
            if (typeof updateTimeLabels === 'function') {
                updateTimeLabels(minutesLeft, secondsLeft, false);
            }

            // Peringatan visual warna merah jika sisa 1 menit terakhir
            if (globalTotalSeconds <= 60 && display) {
                display.style.color = "red";
            }
        } 
        // --- SKENARIO 2: MASUK KE FASE OVER-PROOFING (+) ---
        else {
            updateTimerDisplay(globalTotalSeconds); // Menampilkan nilai minus yang diproses timer display jadi plus (+)
            updateCircleProgress();
            
            const overtimeSecs = Math.abs(globalTotalSeconds);
            const overMins = Math.floor(overtimeSecs / 60);
            const overSecs = overtimeSecs % 60;
            
            if (typeof updateTimeLabels === 'function') {
                updateTimeLabels(overMins, overSecs, true);
            }

            // Picu alarm, getaran, dan gamifikasi HANYA SEKALI saat pertama kali menyentuh 00:00
            if (!alarmTriggered) {
                alarmTriggered = true;
                
                const soundOn = localStorage.getItem('app_sound') !== 'false';
                if (soundOn) {
                    if (typeof playAlarmSound === 'function') playAlarmSound();
                    else if (typeof playAlarmTone === 'function') playAlarmTone();
                }
                const vibOn = localStorage.getItem('app_vib') !== 'false';
                if (vibOn && typeof triggerVibration === 'function') triggerVibration();

                if (typeof ProgressionSystem !== 'undefined') {
                    ProgressionSystem.addProofing();
                }

                // Notifikasi Sistem & Peringatan Popup Aman
                if (typeof NotifSystem !== 'undefined') {
                    NotifSystem.tambah('timer', '⚠️ Peringatan Over-Proofing!', 'Waktu proofing telah habis! Segera proses adonan sebelum rusak.', '🚨');
                }

                // PERBAIKAN: alert() bawaan browser bersifat BLOCKING — begitu muncul, ia menahan
                // thread JS (dan di banyak WebView Android/iOS ikut menahan pemutaran audio) sampai
                // tombol "OK" ditekan. Karena itu nada alarm terasa "nunggu" diklik OK dulu baru
                // bunyi, walau playAlarmSound() sebenarnya sudah dipanggil lebih dulu di atas.
                // Sekarang pakai tampilkanToastOvertime() (bukan showToast biasa): non-blocking,
                // TIDAK hilang otomatis (supaya sempat dibaca/direspons), dan saat pengguna
                // menutupnya, suara alarm ikut berhenti serta hitungan "waktu kelebihan" dibekukan.
                if (typeof tampilkanToastOvertime === 'function') {
                    tampilkanToastOvertime(`⏰ Waktu proofing selesai! Kelebihan ${overMins} menit ${overSecs} detik — segera proses adonan!`);
                } else if (typeof showToast === 'function') {
                    showToast(`⏰ Waktu proofing selesai! Kelebihan ${overMins} menit ${overSecs} detik — segera proses adonan!`, 5000);
                } else {
                    setTimeout(() => {
                        alert("Waktu proofing telah selesai! Adonan terancam OVER-PROOFING jika dibiarkan!");
                    }, 50);
                }
            }
            
            // Perbarui teks panduan tips AI di antarmuka
            const aiTipsEl = document.getElementById('ai-tips');
            if (aiTipsEl) {
                aiTipsEl.innerText = `⚠️ PERINGATAN: Adonan melewati batas waktu standar selama ${overMins} menit ${overSecs} detik!`;
            }
        }
    }, 1000);
}

function setMode(mode) {
    if (isTimerRunning) return;
    if (!['initial', 'rounding', 'final'].includes(mode)) return;
    const namaMode = {initial:'Initial Proofing', rounding:'Rounding', final:'Final Proofing'};

    let display = document.getElementById('countdown');
    let duration = 0;

    if (mode === 'initial') duration = 60;
    else if (mode === 'rounding') duration = 15;
    else if (mode === 'final') duration = 45;

    currentSelectedBaseDuration = duration;

    let tempVal = document.getElementById('temp-val').innerText;
    let temp = parseFloat(tempVal) || 28; 
    let calculated = Math.round(duration * Math.pow(0.95, temp - 28));

    totalDurationMinutes = calculated;
    localStorage.setItem('activeMode', mode);
    NotifSystem.tambah('timer', `Mode ${namaMode[mode]}`, `Durasi diatur ke ${calculated} menit berdasarkan suhu ${temp}°C.`, '🍩');

    globalTotalSeconds = calculated * 60;
    globalInitialSeconds = calculated * 60;
    updateTimerDisplay(globalTotalSeconds);
    updateTimeLabels(calculated, 0, false);
    document.getElementById('ai-tips').innerText = `Anda memilih Mode ${mode.toUpperCase()}. \nWaktu disesuaikan ke ${calculated} menit berdasarkan suhu dapur.`;
    
    updateCircleProgress();
    persistProofingState();
    
    display.style.color = "var(--chocolate)";
}

// FUNGSI CHECK AND RESTORE TIMER
function checkAndRestoreTimer() {
    const rawState = localStorage.getItem('proofing_state');
    if (!rawState) return;

    try {
        const savedState = JSON.parse(rawState);
        if (!savedState || typeof savedState.totalSeconds !== 'number' || !Number.isFinite(savedState.totalSeconds)) {
            clearProofingState();
            return;
        }

        let restoredSeconds = savedState.totalSeconds;
        if (savedState.isRunning && typeof savedState.savedAt === 'number' && Number.isFinite(savedState.savedAt)) {
            const elapsedSeconds = Math.floor((Date.now() - savedState.savedAt) / 1000);
            restoredSeconds -= elapsedSeconds;
        }
        if (!Number.isFinite(restoredSeconds)) restoredSeconds = 0;

        globalTotalSeconds = restoredSeconds;
        globalInitialSeconds = (typeof savedState.initialSeconds === 'number' && savedState.initialSeconds > 0)
            ? savedState.initialSeconds
            : Math.max(1, Math.abs(restoredSeconds));
        if (!Number.isFinite(globalInitialSeconds) || globalInitialSeconds <= 0) {
            globalInitialSeconds = Math.max(1, Math.abs(globalTotalSeconds));
        }
        totalDurationMinutes = Math.max(0, Math.round(Math.abs(globalInitialSeconds) / 60));
        isTimerRunning = false;

        const display = document.getElementById('countdown');
        if (display) {
            updateTimerDisplay(restoredSeconds);
            if (restoredSeconds >= 0) {
                display.style.color = restoredSeconds <= 60 ? "red" : "var(--chocolate)";
                const m = Math.floor(restoredSeconds / 60);
                const s = restoredSeconds % 60;
                updateTimeLabels(m, s, false);
            } else {
                display.style.color = "purple";
                alarmTriggered = true;
                const overtimeSeconds = Math.abs(restoredSeconds);
                const m = Math.floor(overtimeSeconds / 60);
                const s = overtimeSeconds % 60;
                updateTimeLabels(m, s, true);
            }
        }

        updateCircleProgress();

        if (savedState.isRunning) {
            
            // --- KODE BARU: RESTORE WAKTU MULAI ---
            if (savedState.savedAt) {
                const durasiBerjalanMs = (globalInitialSeconds - restoredSeconds) * 1000;
                const waktuMulaiAsli = new Date(Date.now() - durasiBerjalanMs);
                
                const startEl = document.getElementById('time-start');
                if (startEl) {
                    const startHours = String(waktuMulaiAsli.getHours()).padStart(2, '0');
                    const startMins = String(waktuMulaiAsli.getMinutes()).padStart(2, '0');
                    startEl.innerText = `Mulai: ${startHours}:${startMins}`;
                }
            }
            // ----------------------------------------

            const mainBtn = document.getElementById('main-start-btn');
            if (mainBtn) {
                mainBtn.innerText = "RESET PROOFING";
                mainBtn.style.background = "#d32f2f";
            }
            setControlsDisabled(true);
            alarmTriggered = restoredSeconds < 0;
            startProofing(true);
            if (restoredSeconds > 0 && typeof window.jadwalkanAlarmProofing === 'function') {
                const sisaMenit = Math.max(1, Math.ceil(restoredSeconds / 60));
                window.jadwalkanAlarmProofing(sisaMenit);
            }
        } else {
            setControlsDisabled(false);
            persistProofingState();
        }
    } catch (err) {
        console.warn('Gagal memulihkan state proofing:', err);
        clearProofingState();
    }
}

// Fungsi untuk menghitung waktu adaptif berdasarkan suhu dan kelembapan
function calculateAdaptiveTime(baseMinutes, currentTemp, currentHum) {
    const idealTemp = 26.0; // Suhu ideal patokan dalam Celcius
    const idealHum = 70.0;  // Kelembapan ideal dalam persen

    let timeMultiplier = 1.0;

    // Koreksi Suhu: Potong waktu 5% per 1 derajat kenaikan
    let tempDiff = currentTemp - idealTemp;
    timeMultiplier -= (tempDiff * 0.05);

    // Koreksi Kelembapan: Potong waktu sangat halus untuk kelembapan tinggi
    let humDiff = currentHum - idealHum;
    timeMultiplier -= (humDiff * 0.002);

    // Safety Limit: Pastikan waktu tidak terpotong ekstrem (min 50%, max 150%)
    if (timeMultiplier < 0.5) timeMultiplier = 0.5; 
    if (timeMultiplier > 1.5) timeMultiplier = 1.5;

    // Konversi hasil akhir menjadi detik
    return Math.round((baseMinutes * 60) * timeMultiplier);
}

// ==========================================
// 3. EVENT LISTENER TOMBOL MODE PROOFING (UPDATED)
// ==========================================
// Mengganti nama fungsi menjadi setProofingMode untuk menghindari bentrok
// 1. Pemetaan Opsi Tahapan Fermentasi Berdasarkan Produk
const proofingStages = {
    donut: [
        { key: 'initial', name: 'Initial', minutes: 30, desc: 'Pengembangan awal setelah mixing.' },
        { key: 'rounding', name: 'Rounding', minutes: 15, desc: 'Istirahat adonan setelah pembulatan.' },
        { key: 'final', name: 'Final', minutes: 45, desc: 'Fermentasi akhir siap goreng (white ring).' }
    ],
    roti: [
        { key: 'initial', name: 'Bulk Ferment', minutes: 40, desc: 'Fermentasi awal ragi hingga mengembang optimal.' },
        { key: 'rounding', name: 'Bench Rest', minutes: 20, desc: 'Melemaskan gluten sebelum dicetak (shaping).' },
        { key: 'final', name: 'Final Proofing', minutes: 60, desc: 'Pengembangan akhir optimal sebelum masuk oven.' }
    ],
    bakpao: [
        { key: 'initial', name: 'Relaxing Awal', minutes: 25, desc: 'Istirahat singkat setelah adonan dibagi.' },
        { key: 'rounding', name: 'Intermediate', minutes: 10, desc: 'Pembentukan dan penataan isian.' },
        { key: 'final', name: 'Final Proofing', minutes: 30, desc: 'Proofing akhir (Waspada over-proof agar tidak keriput).' }
    ],
    pizza: [
        { key: 'initial', name: 'Bulk Ferment', minutes: 60, desc: 'Initial fermentasi adonan pizza lebih lama agar empuk.' },
        { key: 'rounding', name: 'Ball Rest', minutes: 20, desc: 'Istirahat adonan setelah dibentuk bola (dough balls).' },
        { key: 'final', name: 'Stretching Rest', minutes: 30, desc: 'Relaksasi adonan sebelum diregangkan di pan/loyang.' }
    ],
    saltbread: [
        { key: 'initial', name: 'Bulk Ferment', minutes: 45, desc: 'Fermentasi awal ragi adonan dasar butter roll.' },
        { key: 'rounding', name: 'Shaping Rest', minutes: 15, desc: 'Istirahat adonan sebelum digulung dengan mentega.' },
        { key: 'final', name: 'Final Proofing', minutes: 50, desc: 'Salt bread butuh proofing mentega/gulung yang pas.' }
    ]
};


// 1. Data Langkah Pembuatan per Produk
const resepProduk = {
  donat: [
    "Campur tepung, ragi, gula, dan susu bubuk hingga rata.",
    "Tambahkan telur dan air es bertahap sambil diuleni hingga setengah kalis.",
    "Masukkan mentega dan garam, uleni hingga kalis elastis (windowpane test).",
    "Lakukan **Initial Proofing** sesuai durasi timer.",
    "Kempiskan adonan, bagi dan potong sesuai berat target, lalu **Rounding**.",
    "Bentuk donat (beri lubang/flatten), letakkan di tray paper.",
    "Masuk tahap **Final Proofing** hingga mengembang ideal.",
    "Goreng pada suhu 165°C - 170°C hingga membentuk ring emas."
  ],
  roti: [
    "Aduk bahan kering hingga menyatu.",
    "Tuang cairan (susu/air) dan telur, aduk hingga bergumpal.",
    "Tambahkan mentega & garam, mixer hingga kalis elastis.",
    "Istirahatkan adonan (Initial Proofing).",
    "Dividing & Rounding, diamkan 10-15 menit.",
    "Forming / Shaping roti sesuai varian isi.",
    "Final Proofing dalam proofer (Suhu 35-38°C, RH 80%).",
    "Panggang dalam oven hingga matang kecokelatan."
  ],
  bakpao: [
    "Campur tepung terigu protein rendah, ragi, gula, dan baking powder.",
    "Tuang air dingin perlahan, uleni hingga menyatu.",
    "Masukkan mentega putih dan garam, uleni hingga mulus.",
    "Potong & timbang adonan, bulatkan (Rounding).",
    "Isi adonan dengan isian sesuai selera dan beri alas kertas roti.",
    "Proofing singkat (20-30 menit) hingga mengembang lembut.",
    "Kukus dengan api sedang selama 10-12 menit."
  ],
  pizza: [
    "Aduk tepung terigu, ragi, gula, garam, dan minyak zaitun.",
    "Tambahkan air hangat, uleni hingga adonan halus dan elastis.",
    "Initial Proofing hingga adonan mengembang 2x lipat.",
    "Pipihkan adonan membentuk lingkaran pizza.",
    "Tusuk-tusuk dengan garpu dan oleskan saus serta topping.",
    "Panggang pada suhu tinggi (220°C - 250°C) hingga pinggiran crispy."
  ],
  salt_bread: [
    "Mixer adonan roti hingga mencapai windowpane.",
    "Initial proofing selama 45-60 menit.",
    "Bagi adonan dan bentuk segitiga memanjang.",
    "Gulung butter dingin di dalam adonan membentuk rulo.",
    "Final proofing hingga mengembang 1.5x lipat.",
    "Semprotkan sedikit air, taburi sea salt, panggang suhu tinggi."
  ]
};

// Fungsi untuk memperbarui daftar cara pembuatan berdasarkan produk
function updateCaraPembuatanContent(productKey) {
  const listContainer = document.getElementById("cara-pembuatan-list");
  if (!listContainer) return;

  // Normalisasi nama produk ke huruf kecil dan ubah spasi/strip jadi underscore
  const key = productKey.toLowerCase().trim().replace(/[\s-]+/g, '_');

  const steps = resepProduk[productKey] || [
    "Langkah pembuatan belum tersedia untuk produk ini."
  ];

  // Render ulang isi resep
  listContainer.innerHTML = steps
    .map((step) => `<li>${step}</li>`)
    .join("");
}

// 2. Event Listener pada product-pills-container
const productPillsContainer = document.getElementById("product-pills-container");

if (productPillsContainer) {
  productPillsContainer.addEventListener("click", function (event) {
    const pill = event.target.closest(".product-pill, button");
    if (!pill) return;

    // Ambil ID / key produk dari data-attribute
    const selectedProduct = pill.dataset.product || pill.id;

    // AKTUALISASI RESEP (Tanpa mengubah status accordion / tanpa membuka otomatis)
    updateCaraPembuatanContent(selectedProduct);
  });
}

// 3. Event Listener khusus Tombol Toggle Cara Pembuatan
const toggleBtn = document.getElementById("toggle-cara-pembuatan");
const contentBody = document.getElementById("cara-pembuatan-content");

if (toggleBtn && contentBody) {
  toggleBtn.addEventListener("click", function () {
    // Toggle class hidden
    contentBody.classList.toggle("hidden");
    
    // Toggle class active untuk rotasi ikon panah
    toggleBtn.classList.toggle("active");
  });
}

// Set resep awal saat aplikasi dimuat pertama kali
document.addEventListener("DOMContentLoaded", () => {
  updateCaraPembuatanContent("donat");
});

// 2. Fungsi Eksekusi Saat User Mengganti Jenis Produk
// 1. Deklarasikan variabel status global di bagian paling atas skrip
let currentActiveProduct = '';
let isGuideVisible = true;

// 2. Fungsi utama selectProduct
function hideProductGuide() {
    const guideContainer = document.getElementById('product-guide-container');
    if (guideContainer) {
        guideContainer.innerHTML = '';
        guideContainer.style.display = 'none';
    }
    window.isGuideVisible = false;
}

function selectProduct(productKey) {
    if (typeof isTimerRunning !== 'undefined' && isTimerRunning) {
        alert("Timer sedang berjalan! Harap reset terlebih dahulu jika ingin mengganti produk.");
        return;
    }
    
    const guideContainer = document.getElementById('product-guide-container');

    if (currentActiveProduct === productKey && isGuideVisible) {
        hideProductGuide();
        return;
    }

    currentActiveProduct = productKey;

    document.querySelectorAll('.product-pill').forEach(btn => {
        const isSelected = btn.id === `prod-${productKey}`;
        btn.classList.toggle('active', isSelected);
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    if (typeof renderModeButtons === 'function') {
        renderModeButtons(productKey);
    }
    
    const stages = typeof proofingStages !== 'undefined' ? proofingStages[productKey] : null;
    if (stages && stages.length > 0 && typeof setProductStage === 'function') {
        setProductStage(productKey, stages[0].key, stages[0].minutes, stages[0].desc);
    }

    if (guideContainer && typeof ProductGuides !== 'undefined' && ProductGuides[productKey]) {
        const guide = ProductGuides[productKey];
        const stepsList = Array.isArray(guide.steps) 
            ? guide.steps.map(step => `<li>${step}</li>`).join('') 
            : '';

        guideContainer.innerHTML = `
            <div class="product-guide-card">
                <div class="product-guide-header">
                    <span class="product-guide-title">📖 ${guide.title || 'Cara Pembuatan'}</span>
                    <button type="button" class="product-guide-close-btn" aria-label="Tutup panduan">✕ Tutup</button>
                </div>
                <ol class="product-guide-list">
                    ${stepsList}
                </ol>
            </div>
        `;

        guideContainer.style.display = 'block';
        window.isGuideVisible = true;

        const closeBtn = guideContainer.querySelector('.product-guide-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideProductGuide);
        }
    } else {
        hideProductGuide();
    }

    if (typeof updateProoferTimes === 'function') {
        updateProoferTimes(productKey);
    }
}

// 3. Render Tombol Tahapan secara Dinamis
function renderModeButtons(productKey) {
    const container = document.getElementById('mode-grid-container');
    if (!container) return;
    
    const stages = proofingStages[productKey] || [];
    container.innerHTML = '';
    
    // Atur jumlah kolom grid menyesuaikan jumlah tahapan produk
    container.style.gridTemplateColumns = `repeat(${stages.length}, 1fr)`;

    stages.forEach((stage, idx) => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn';
        btn.id = `btn-mode-${stage.key}`;
        btn.innerText = stage.name;
        
        // Tandai tombol pertama sebagai default aktif
        if (idx === 0) {
            btn.style.background = 'var(--accent)';
            btn.style.color = 'white';
        }

        btn.onclick = () => {
            // Reset warna semua tombol dalam grid
            document.querySelectorAll('#mode-grid-container .mode-btn').forEach(b => {
                b.style.background = 'rgba(0,0,0,0.03)';
                b.style.color = 'inherit';
            });
            // Berikan warna aktif pada tombol yang diklik
            btn.style.background = 'var(--accent)';
            btn.style.color = 'white';
            
            setProductStage(productKey, stage.key, stage.minutes, stage.desc);
        };
        container.appendChild(btn);
    });
}

// 4. Kalkulator Waktu & Penyesuaian Berdasarkan Kondisi Suhu/Kelembapan
function setProductStage(productKey, modeKey, baseMinutes, description) {
    if (typeof isTimerRunning !== 'undefined' && isTimerRunning) return;
    localStorage.setItem('activeMode', `${productKey}_${modeKey}`);

    // Ambil data sensor suhu & kelembapan real-time dari UI aplikasi Anda
    const temp = parseFloat(document.getElementById('temp-val')?.innerText) || 28;
    const hum = parseFloat(document.getElementById('hum-val')?.innerText) || 70;

    // Hitung waktu adaptif menggunakan fungsi referensi cuaca yang sudah ada di aplikasi
    globalTotalSeconds = typeof calculateAdaptiveTime === 'function' 
        ? calculateAdaptiveTime(baseMinutes, temp, hum) 
        : baseMinutes * 60;
    
    globalInitialSeconds = globalTotalSeconds;
    totalDurationMinutes = Math.round(globalTotalSeconds / 60);

    // Perbarui tampilan antarmuka timer
    let m = Math.floor(globalTotalSeconds / 60);
    let s = globalTotalSeconds % 60;
    
    if (typeof updateTimeLabels === 'function') updateTimeLabels(m, s, false);
    if (typeof updateTimerDisplay === 'function') updateTimerDisplay(globalTotalSeconds);
    if (typeof updateCircleProgress === 'function') updateCircleProgress();
    if (typeof updateETALabel === 'function') updateETALabel(totalDurationMinutes);
    if (typeof persistProofingState === 'function') persistProofingState();

    // Perbarui teks instruksi/tips AI di bawah timer
    const tipsEl = document.getElementById('ai-tips');
    if (tipsEl) {
        tipsEl.innerText = `[${productKey.toUpperCase()} - ${modeKey.toUpperCase()}] ${description}\nDurasi disesuaikan ke ${totalDurationMinutes} menit (Suhu Dapur: ${temp}°C).`;
    }
}

//========================================
// Script untuk update label waktu dan ETA
//========================================
function updateTimeLabels(minutesLeft, secondsLeft, isOvertime = false) {
    const durationEl = document.getElementById('time-duration');
    const etaEl = document.getElementById('time-eta');
    if (!durationEl || !etaEl) return;

    minutesLeft = Number.isFinite(minutesLeft) ? minutesLeft : 0;
    secondsLeft = Number.isFinite(secondsLeft) ? secondsLeft : 0;
    if (!Number.isFinite(totalDurationMinutes) || totalDurationMinutes < 0) {
        totalDurationMinutes = 0;
    }
    
    if (minutesLeft === 0 && secondsLeft === 0 && !isOvertime) {
        durationEl.innerText = ""; etaEl.innerText = ""; return;
    }
    // --- PERUBAHAN DI SINI: Format Menit ke Jam & Menit jika > 60 menit ---
    let teksDurasi = "";
    if (totalDurationMinutes > 60) {
        const jam = Math.floor(totalDurationMinutes / 60);
        const sisaMenit = totalDurationMinutes % 60;
        teksDurasi = sisaMenit > 0 ? `${jam} Jam ${sisaMenit} Menit` : `${jam} Jam`;
    } else {
        teksDurasi = `${totalDurationMinutes} Menit`;
    }
    
    durationEl.innerText = `Lama: ${teksDurasi}`;
    // --- AKHIR PERUBAHAN ---

    if (isOvertime) {
        etaEl.innerText = "Over-proofing! ⚠️"; etaEl.style.color = "red";
    } else {
        const now = new Date();
        const totalSecondsRemaining = (minutesLeft * 60) + secondsLeft;
        const etaTime = new Date(now.getTime() + totalSecondsRemaining * 1000);
        
        const hours = String(etaTime.getHours()).padStart(2, '0');
        const minutes = String(etaTime.getMinutes()).padStart(2, '0');
        etaEl.innerText = `Selesai ± ${hours}:${minutes}`;
        etaEl.style.color = "inherit";
    }
}

// 2. Fungsi baru untuk mengaktifkan mesin audio secara aman
function dapatkanAudioContext(isUserGesture = false) {
    // FIX BUG: Jika belum ada instansiasi AUDIO dan panggilan bukan dari klik user, 
    // jangan buat objek baru untuk menghindari warning autoplay browser.
    if (!audioCtx) {
        if (!isUserGesture) {
            return null; // Keluar dengan aman tanpa memicu warning ke konsol log
        }
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Jika mesin audio ter-suspend, coba aktifkan kembali jika dipicu oleh interaksi user
    if (audioCtx && audioCtx.state === 'suspended' && isUserGesture) {
        audioCtx.resume();
    }
    
    return audioCtx;
}

// 3. Fungsi Alarm bawaan Anda yang SUDAH DIOPTIMALKAN
// PERBAIKAN: state bersama untuk melacak audio/nada yang sedang berbunyi, supaya
// saat pengguna berpindah pilihan nada, suara LAMA dihentikan dulu sebelum
// suara BARU diputar — sebelumnya setiap panggilan membuat objek Audio/oscillator
// baru tanpa pernah menghentikan yang sebelumnya, sehingga 2+ suara menumpuk bersamaan.
let alarmAudioAktif = null;      // referensi elemen <audio> nada kustom/file yang sedang main
let alarmOscillatorAktif = [];   // referensi node oscillator bawaan yang sedang main

function hentikanSemuaSuaraAlarm() {
    // Hentikan audio file (nada kustom/preset) yang sedang berjalan
    if (alarmAudioAktif) {
        try {
            alarmAudioAktif.pause();
            alarmAudioAktif.currentTime = 0;
        } catch (e) { /* abaikan jika elemen sudah tidak valid */ }
        alarmAudioAktif = null;
    }
    // Hentikan oscillator bawaan (beep) yang masih terjadwal berbunyi
    if (alarmOscillatorAktif.length) {
        alarmOscillatorAktif.forEach(osc => {
            try { osc.stop(); osc.disconnect(); } catch (e) { /* sudah berhenti sendiri, aman diabaikan */ }
        });
        alarmOscillatorAktif = [];
    }
}
window.hentikanSemuaSuaraAlarm = hentikanSemuaSuaraAlarm;

function playAlarmTone() {
    hentikanSemuaSuaraAlarm(); // Pastikan tidak ada suara lain yang masih menumpuk
    try {
        const ctx = dapatkanAudioContext(true);
        if (!ctx) return;
        
        const startTime = ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, startTime + (i * 0.4)); 
            gainNode.gain.setValueAtTime(0.5, startTime + (i * 0.4));
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + (i * 0.4) + 0.3);        
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.start(startTime + (i * 0.4));
            osc.stop(startTime + (i * 0.4) + 0.3);
            alarmOscillatorAktif.push(osc); // PERBAIKAN: catat agar bisa dihentikan paksa jika nada lain dipilih sebelum beep ini selesai
            osc.addEventListener('ended', () => {
                alarmOscillatorAktif = alarmOscillatorAktif.filter(o => o !== osc);
            });
        }
    } catch (error) {
        console.warn("Gagal membunyikan alarm karena AudioContext diblokir sementara:", error);
    }
}

// Getar
async function triggerVibration() {
    if (window.Capacitor && window.Capacitor.isPluginAvailable('Haptics')) {
        // Menggunakan Capacitor Haptics (Bisa bergetar lama/berulang untuk alarm)
        await Capacitor.Plugins.Haptics.vibrate({ duration: 1000 });
    } else if (navigator.vibrate) {
        // Fallback untuk browser biasa
        navigator.vibrate([500, 300, 500]);
    }
}

function playAlarmSound(overrideTone, overrideVolume) {
    if (localStorage.getItem('app_sound') === 'false') return;
    hentikanSemuaSuaraAlarm(); // PERBAIKAN: hentikan dulu suara sebelumnya (file audio atau beep) sebelum memutar yang baru

    // PERBAIKAN UTAMA: sumber kebenaran nada alarm adalah localStorage (yaitu apa yang sudah
    // ditekan "SIMPAN PENGATURAN"), BUKAN elemen <select id="select-alarm-tone"> di DOM.
    // Sebelumnya fungsi ini selalu membaca dari DOM — jika modal Preferensi belum pernah
    // dibuka di sesi berjalan (atau timer berakhir saat user sedang di tab lain), elemen
    // select itu masih bernilai default HTML-nya ("Default Digital Beep"), sehingga pilihan
    // nada yang sudah disimpan pengguna tidak pernah benar-benar terpakai saat alarm asli
    // berbunyi di akhir countdown — selalu jatuh ke beep bawaan ("tung tung tung").
    // Parameter overrideTone/overrideVolume tetap disediakan khusus untuk mode PRATINJAU
    // (saat pengguna masih mengubah-ubah pengaturan sebelum menekan Simpan).
    const selectedTone = overrideTone || localStorage.getItem('app_alarm_tone') || 'default';
    const volumeRaw = (overrideVolume !== undefined && overrideVolume !== null)
        ? overrideVolume
        : (localStorage.getItem('app_alarm_volume') || '80');

    // Ambil nilai volume (0 - 100), diubah ke rentang 0.0 - 1.0
    const volumeValue = volumeRaw / 100;
    
    let audioPath = '';

    if (selectedTone === 'custom') {
        audioPath = 'assets/audio/donat-proofing.mp3'; 
    } else if (selectedTone === 'soft-bell') {
        audioPath = 'assets/audio/soft-bell.mp3';
    } else if (selectedTone === 'kitchen-timer') {
        audioPath = 'assets/audio/kitchen-timer.mp3';
    }

    // Jika memilih opsi selain default dan path tersedia
    if (audioPath && selectedTone !== 'default') {
        const audio = new Audio(audioPath);
        audio.volume = volumeValue; // Terapkan volume dari slider
        alarmAudioAktif = audio; // PERBAIKAN: simpan referensi supaya bisa dihentikan saat nada lain dipilih

        // PERBAIKAN: bersihkan referensi begitu file selesai main sendiri, agar tidak "dihentikan" ulang secara keliru nanti
        audio.addEventListener('ended', () => {
            if (alarmAudioAktif === audio) alarmAudioAktif = null;
        });
        
        audio.play().then(() => {
            console.log("Berhasil memutar audio:", audioPath);
        }).catch(err => {
            // CETAK ERROR ASLI KE CONSOLE UNTUK MELIHAT PENYEBABNYA
            console.error("GAGAL MEMUTAR AUDIO MP3:", err.name, err.message);
            if (alarmAudioAktif === audio) alarmAudioAktif = null;
            
            // Fallback ke suara default jika gagal (mis. file belum diupload ke server/404)
            if (typeof playAlarmTone === 'function') {
                playAlarmTone(); 
            }
        });
    } else {
        // Pemutaran default bawaan
        if (typeof playAlarmTone === 'function') {
            playAlarmTone();
        }
    }
}

// =========================================================
// FUNGSI RESEP / MANAJEMEN RESEP
// =========================================================
// FUNGSI PENCARIAN RESEP
function filterDaftarResep(keyword) {
    const query = keyword.toLowerCase().trim();
    const container = document.getElementById('recipe-list-container');
    const clearBtn = document.getElementById('recipe-clear-btn');
    
    // Tampilkan tombol 'X' hanya jika ada teks yang diketik
    if (clearBtn) {
        clearBtn.style.display = keyword.length > 0 ? 'block' : 'none';
    }

    if (!container) return;

    // Ambil seluruh elemen card resep dan filter berdasarkan kata kunci
    const cards = container.querySelectorAll('.recipe-card-item');
    cards.forEach(card => {
        const textContent = card.textContent.toLowerCase();
        if (textContent.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function clearRecipeSearch() {
    const input = document.getElementById('recipe-search-input');
    const clearBtn = document.getElementById('recipe-clear-btn');
    
    if (input) {
        input.value = '';
        filterDaftarResep(''); // Reset daftar resep
    }
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    if (input) {
        input.focus(); // Mengembalikan fokus kursor ke input
    }
}

// 1. FUNGSI NAVIGASI ANTAR LAYAR (MASTER VS DETAIL)
function bukaMasterViewResep() {
    const elMaster = document.getElementById('recipe-master-view');
    const elDetail = document.getElementById('recipe-detail-view');
    if (elMaster) elMaster.style.display = 'flex';
    if (elDetail) elDetail.style.display = 'none';
    
    // Refresh list saat kembali ke master view
    if (typeof tampilkanDaftarResepTersimpan === 'function') {
        tampilkanDaftarResepTersimpan();
    }
}

function kembaliKeMasterView() {
    if (currentEditingRecipeId) {
        if (!confirm("Keluar dari editor? Perubahan yang belum disimpan mungkin akan hilang.")) return;
    }
    bukaMasterViewResep();
}

function bukaDetailResepBaru() {
    currentEditingRecipeId = null;
    document.getElementById('recipe-save-name').value = '';
    document.getElementById('base-flour').value = '1000';
    document.getElementById('recipe-yield').value = '34';
    document.getElementById('input-harga-jual').value = '4500';
    activeRecipeSteps = [];
    
    if (typeof renderLangkahProduksi === 'function') renderLangkahProduksi();

    // Transisi ke Layar Detail
    document.getElementById('recipe-master-view').style.display = 'none';
    document.getElementById('recipe-detail-view').style.display = 'flex';
}

function bukaDetailResepEksisting(resep) {
    currentEditingRecipeId = resep.id;
    terapkanResepKeKalkulator(resep);
    
    if (resep.langkahProduksi && Array.isArray(resep.langkahProduksi)) {
        activeRecipeSteps = [...resep.langkahProduksi];
    } else {
        activeRecipeSteps = [];
    }
    if (typeof renderLangkahProduksi === 'function') renderLangkahProduksi();

    const nameInput = document.getElementById('recipe-save-name');
    if (nameInput) nameInput.value = resep.nama || '';

    // Transisi ke Layar Detail
    document.getElementById('recipe-master-view').style.display = 'none';
    document.getElementById('recipe-detail-view').style.display = 'flex';
}

function gantiTabMetode(namaTab) {
    // Sembunyikan semua kontainer tab
    document.getElementById('method-bahan-content').style.display = 'none';
    document.getElementById('method-steps-content').style.display = 'none';
    document.getElementById('method-foto-content').style.display = 'none';

    // Nonaktifkan semua class active tombol tab
    document.getElementById('btn-tab-bahan').classList.remove('active');
    document.getElementById('btn-tab-cara').classList.remove('active');
    document.getElementById('btn-tab-foto').classList.remove('active');

    // Tampilkan tab yang dipilih
    if (namaTab === 'bahan') {
        document.getElementById('method-bahan-content').style.display = 'block';
        document.getElementById('btn-tab-bahan').classList.add('active');
    } else if (namaTab === 'cara') {
        document.getElementById('method-steps-content').style.display = 'block';
        document.getElementById('btn-tab-cara').classList.add('active');
    } else if (namaTab === 'foto') {
        document.getElementById('method-foto-content').style.display = 'block';
        document.getElementById('btn-tab-foto').classList.add('active');
    }
}

// Fungsi untuk mereset form kalkulator resep menjadi baru/bersih
function buatResepBaruForm() {
    // Konfirmasi jika sedang mengedit resep aktif agar tidak kehilangan data tidak sengaja
    if (currentEditingRecipeId) {
        const lanjut = confirm("Anda sedang mengedit resep yang ada. Buat lembar resep baru?");
        if (!lanjut) return;
    }

    // Reset ID Edit aktif
    currentEditingRecipeId = null;

    // Kosongkan nama resep
    const namaInput = document.getElementById('recipe-save-name');
    if (namaInput) namaInput.value = '';

    // Reset standar tepung & yield ke default awal
    const flourInput = document.getElementById('base-flour');
    if (flourInput) flourInput.value = '1000';

    const yieldInput = document.getElementById('recipe-yield');
    if (yieldInput) yieldInput.value = '34';

    const hargaJualInput = document.getElementById('input-harga-jual');
    if (hargaJualInput) hargaJualInput.value = '4500';

    // Berikan notifikasi halus
    if (typeof NotifSystem !== 'undefined') {
        NotifSystem.tambah('resep', 'Lembar Resep Baru', 'Form kalkulator dikosongkan untuk resep baru.', '✨');
    } else {
        alert("Lembar resep baru disiapkan.");
    }
}

// 1. TAMBAHKAN FUNGSI INI DI LUAR (Global Scope) AGAR TOMBOL TITIK 3 BISA DIKLIK
function toggleRecipeMenu(event) {
    event.stopPropagation();
    document.querySelectorAll('.recipe-dropdown').forEach(dropdown => {
        if (dropdown !== event.currentTarget.nextElementSibling) dropdown.style.display = 'none';
    });
    const dropdown = event.currentTarget.nextElementSibling;
    dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
}

// Tutup dropdown jika area luar diklik
document.addEventListener('click', function(event) {
    if (!event.target.closest('.recipe-menu-container')) {
        document.querySelectorAll('.recipe-dropdown').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }
});

// ------------------------------------------------------------
// FITUR FOTO RESEP & BAHAN (GOLDEN RATIO LAYOUT)
// ------------------------------------------------------------
function prosesUnggahFotoResep(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const heroContainer = document.getElementById('recipe-hero-photo');
    const subContainer = document.getElementById('recipe-sub-photo');

    // Foto pertama otomatis menjadi Hero / Hasil Akhir Utama
    if (files[0] && heroContainer) {
        const reader = new FileReader();
        reader.onload = function(e) {
            heroContainer.style.background = `url('${e.target.result}') center/cover no-repeat`;
            heroContainer.innerHTML = `<button type="button" onclick="event.stopPropagation(); hapusFotoResep('hero')" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 0.65rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>`;
        };
        reader.readAsDataURL(files[0]);
    }

    // Foto kedua otomatis menjadi foto pendukung bahan baku
    if (files[1] && subContainer) {
        const reader = new FileReader();
        reader.onload = function(e) {
            subContainer.style.background = `url('${e.target.result}') center/cover no-repeat`;
            subContainer.innerHTML = `<button type="button" onclick="event.stopPropagation(); hapusFotoResep('sub')" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 0.65rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>`;
        };
        reader.readAsDataURL(files[1]);
    }
}

function hapusFotoResep(tipe) {
    if (tipe === 'hero') {
        const heroContainer = document.getElementById('recipe-hero-photo');
        if (heroContainer) {
            heroContainer.style.background = '#f8fafc';
            heroContainer.innerHTML = `<span style="font-size: 1.2rem; color: #94a3b8;">📷</span><span style="font-size: 0.6rem; color: #94a3b8; font-weight: 500; margin-top: 4px;">Foto Utama</span>`;
        }
    } else if (tipe === 'sub') {
        const subContainer = document.getElementById('recipe-sub-photo');
        if (subContainer) {
            subContainer.style.background = '#f8fafc';
            subContainer.innerHTML = `<span style="font-size: 1.2rem; color: #94a3b8;">🖼️</span><span style="font-size: 0.6rem; color: #94a3b8; font-weight: 500; margin-top: 4px;">Foto Pendukung</span>`;
        }
    }
}

// 1. Fungsi penampung saat aplikasi offline atau Supabase error
function simpanKeAntreanOffline(resep) {
    let offlineQueue = JSON.parse(localStorage.getItem('offline_recipe_queue') || '[]');
    const idx = offlineQueue.findIndex(r => r.id === resep.id);
    if (idx >= 0) {
        offlineQueue[idx] = resep; 
    } else {
        offlineQueue.push(resep);  
    }
    localStorage.setItem('offline_recipe_queue', JSON.stringify(offlineQueue));
    console.log("Resep diamankan ke antrean offline lokal.");
}

// 2. FUNGSI UTAMA PENYIMPANAN
async function simpanResepKeDatabase() {
    if (isSaving) return;
    isSaving = true;

    const namaResepInput = document.getElementById('recipe-save-name');
    let namaResep = namaResepInput ? namaResepInput.value.trim() : "";
    
    if (!namaResep) {
        const tanggalHariIni = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        namaResep = `Resep Donat (${tanggalHariIni})`;
        if (namaResepInput) namaResepInput.value = namaResep;
    }

    const objekResep = bangunObjekResepDariForm(namaResep);

    try {
        let daftarResep = readRecipesFromStorage();
        const indexExisting = daftarResep.findIndex(r => r.id === objekResep.id || r.nama.toLowerCase() === objekResep.nama.toLowerCase());
        
        if (indexExisting >= 0) {
            daftarResep[indexExisting] = objekResep; // Update / Edit resep yang sudah ada
        } else {
            daftarResep.push(objekResep); // Simpan resep baru
            if (typeof ProgressionSystem !== 'undefined') {
                ProgressionSystem.addRecipe();
            }
        }
        
        await simpanDaftarResepKePerangkat(daftarResep);

        // Sinkronisasi ke Supabase jika online
        if (navigator.onLine) {
            const { data: { user } } = await supabase.auth.getUser();
            const payload = {
                id: objekResep.id,
                user_id: user ? user.id : null,
                name: objekResep.nama,
                details: objekResep,
                updated_at: new Date().toISOString()
            };
            await supabase.from('recipes').upsert([payload]);
        }

        // --- PEMBERITAHUAN BERHASIL DISIMPAN ---
        if (typeof NotifSystem !== 'undefined') {
            NotifSystem.tambah('resep', 'Resep Berhasil Disimpan', `Resep "${namaResep}" berhasil disimpan dan diperbarui.`, '💾');
        }
        alert(`Sukses! Resep "${namaResep}" berhasil disimpan.`);
        
        // Reset state edit & form
        currentEditingRecipeId = null;
        if (namaResepInput) namaResepInput.value = '';
        
        if (typeof updateBakeryStatistics === 'function') updateBakeryStatistics();
    } catch (err) {
        console.error("Gagal menyimpan resep:", err);
        alert("Gagal menyimpan resep: " + err.message);
    } finally {
        isSaving = false;
    }
}


// ==========================================
// FUNGSI SINKRONISASI DATA OFFLINE KE SUPABASE
// ==========================================
async function syncLocalDataToSupabase() {
    // Ambil data langsung dari sumber utama penyimpanan resep lokal ('daftar_resep')
    let localRecipes = JSON.parse(localStorage.getItem('daftar_resep') || '[]');
    
    if (localRecipes.length === 0) {
        console.log("Tidak ada resep lokal untuk disinkronkan.");
        return;
    }

    console.log(`Memulai sinkronisasi ${localRecipes.length} resep ke Supabase...`);

    // 1. Dapatkan user ID aktif
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    if (userError || !user) {
        console.warn("⚠️ Pengguna belum login atau sesi habis, sinkronisasi dibatalkan.");
        return;
    }

    for (let item of localRecipes) {
        // 2. Bungkus menggunakan format kolom tabel Supabase Anda
        const payload = {
            id: item.id || ("resep_" + Date.now() + "_" + Math.random()),
            user_id: user.id,
            name: item.nama || item.name || "Tanpa Nama", 
            details: item, // Seluruh objek resep disimpan di kolom details
            updated_at: new Date().toISOString()
        };

        // 3. Kirim menggunakan upsert ke tabel 'recipes'
        const { error } = await window.supabase.from('recipes').upsert([payload], { onConflict: 'id' });
        
        if (error) {
            console.error("Gagal sinkronisasi resep ke Supabase:", error.message);
            return; // Hentikan proses jika ada yang gagal
        }
    }
    
    console.log("✅ Sinkronisasi otomatis ke Supabase selesai! Semua resep berhasil masuk ke cloud.");
}

// Fungsi untuk merender daftar langkah dengan card & textarea bergaya modern-clean
// PERBAIKAN FUNGSI RENDER LANGKAH PRODUKSI
function renderLangkahProduksi() {
    const container = document.getElementById('container-daftar-langkah');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (activeRecipeSteps.length === 0) {
        container.innerHTML = `
            <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; text-align: center; padding: 25px; color: #64748b;">
                <p style="margin: 0 0 8px 0; font-size: 0.85rem; font-weight: 500;">Belum ada langkah produksi.</p>
                <button type="button" onclick="window.tambahLangkahProduksi()" style="background: #E67E22; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">+ Buat Langkah Pertama</button>
            </div>`;
        return;
    }

    activeRecipeSteps.forEach((stepData, index) => {
        // PERBAIKAN: Deteksi struktur data (String vs Object) agar tidak error saat render
        let stepText = "";
        let stepPhoto = null;
        
        if (typeof stepData === 'object' && stepData !== null) {
            stepText = stepData.desc || "";
            stepPhoto = stepData.photo || null;
        } else {
            stepText = stepData || "";
        }

        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-item-card';
        stepDiv.style.cssText = "background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);";
        
        let actionButtons = '';
        if (index > 0) {
            actionButtons += `<button type="button" onclick="window.pindahLangkah(${index}, -1)" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; width: 26px; height: 26px; border-radius: 6px; font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;" title="Geser ke Atas">▲</button>`;
        } else {
            actionButtons += `<div style="width: 26px; height: 26px; opacity: 0.2; pointer-events: none; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc; color: #475569;">▲</div>`;
        }

        if (index < activeRecipeSteps.length - 1) {
            actionButtons += `<button type="button" onclick="window.pindahLangkah(${index}, 1)" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; width: 26px; height: 26px; border-radius: 6px; font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;" title="Geser ke Bawah">▼</button>`;
        } else {
            actionButtons += `<div style="width: 26px; height: 26px; opacity: 0.2; pointer-events: none; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc; color: #475569;">▼</div>`;
        }

        // PERBAIKAN: Memasukkan UI Foto Tahapan agar selaras dengan HTML
        const photoUI = `
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px; background: #f8fafc; padding: 6px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <div style="width: 50px; height: 50px; border-radius: 6px; background: #ffffff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; cursor: pointer;" onclick="if('${stepPhoto || ''}') window.previewRecipePhoto('${stepPhoto || ''}')">
                    ${stepPhoto ? `<img src="${stepPhoto}" style="width: 100%; height: 100%; max-width: min(90vw, 450px); max-height: 85vh; object-fit: contain; display: block; border-radius: 8px; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" onclick="previewRecipePhoto(event, this.src)" alt="Preview Foto">` : `<span style="font-size: 1.2rem; color: #94a3b8;">🖼️</span>`}
                </div>
                
                <div style="flex: 1;">
                    <input type="file" id="step-file-input-${index}" accept="image/*" style="display: none;" onchange="window.handleFotoLangkah(this, ${index})">
                    <button type="button" onclick="document.getElementById('step-file-input-${index}').click()" style="background: #E67E22; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: bold; cursor: pointer;">
                        📷 Unggah Foto Tahapan
                    </button>
                    <span style="font-size: 0.65rem; color: #64748b; margin-left: 6px; display: inline-block;">
                        ${stepPhoto ? 'Foto terpasang' : 'Belum ada foto'}
                    </span>
                </div>
            </div>
        `;

        const safeText = (typeof escapeHtmlResep === 'function') ? escapeHtmlResep(stepText) : stepText;

        stepDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                <span style="font-weight: 700; font-size: 0.8rem; color: #E67E22; background: #FFF3E0; padding: 2px 8px; border-radius: 6px; border: 1px solid #F2D2A9;">Langkah #${index + 1}</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <div style="display: flex; gap: 3px;">
                        ${actionButtons}
                    </div>
                    <button type="button" onclick="window.hapusLangkahProduksi(${index})" style="background: #fee2e2; color: #ef4444; border: none; width: 26px; height: 26px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-left: 4px;" title="Hapus Langkah">×</button>
                </div>
            </div>
            
            <textarea id="step-instruction-${index}" name="step_instruction_${index}" class="input-step-text" data-index="${index}" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.8rem; font-family: inherit; resize: none; overflow: hidden; min-height: 65px; color: #4E342E; background: #ffffff; outline: none; line-height: 1.5; transition: border-color 0.2s ease, box-shadow 0.2s ease;" placeholder="Tulis instruksi detail langkah ini..." oninput="if(typeof window.updateStepDesc === 'function') window.updateStepDesc(${index}, this.value)">${safeText}</textarea>
            
            ${photoUI}
        `;
        container.appendChild(stepDiv);
    });

    // Sinkronisasi input teks secara real-time & efek interaksi fokus
    document.querySelectorAll('.input-step-text').forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';

        textarea.addEventListener('input', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'), 10);
            const val = e.target.value;
            
            // PERBAIKAN: Jaga struktur objek agar foto tidak hilang saat mengetik
            if (typeof activeRecipeSteps[idx] === 'object' && activeRecipeSteps[idx] !== null) {
                activeRecipeSteps[idx].desc = val;
            } else {
                activeRecipeSteps[idx] = val;
            }

            e.target.style.height = 'auto'; 
            e.target.style.height = (e.target.scrollHeight) + 'px'; 
        });

        textarea.addEventListener('focus', (e) => {
            e.target.style.borderColor = '#E67E22';
            e.target.style.boxShadow = '0 0 0 3px rgba(230, 126, 34, 0.12)';
        });

        textarea.addEventListener('blur', (e) => {
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.boxShadow = 'none';
        });
    });
}

// PERBAIKAN FUNGSI TAMBAH LANGKAH PRODUKSI
function tambahLangkahProduksi() {
    if (typeof activeRecipeSteps === 'undefined') {
        window.activeRecipeSteps = [];
    }
    
    // PERBAIKAN: Masukkan Object yang valid, BUKAN string kosong ("")
    activeRecipeSteps.push({ desc: "", photo: null });
    renderLangkahProduksi();
    
    setTimeout(() => {
        const textareas = document.querySelectorAll('.input-step-text');
        if (textareas.length > 0) textareas[textareas.length - 1].focus();
    }, 50);
}

// Deklarasi Global
window.renderLangkahProduksi = renderLangkahProduksi;
window.tambahLangkahProduksi = tambahLangkahProduksi;

// =======================================================================
// 1. FUNGSI UNGGAH FOTO & PREVIEW (VERSI PRODUCTION-READY)
// =======================================================================

function handleFotoLangkah(inputElement, index) {
    if (inputElement.files && inputElement.files[0]) {
        const file = inputElement.files[0];
        
        // Validasi ukuran maksimal 2MB
        if (file.size > 2 * 1024 * 1024) {
            alert("Gagal: Ukuran file foto terlalu besar. Maksimal 2MB.");
            inputElement.value = ""; 
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const photoDataUrl = e.target.result;
            
            // Simpan ke array dengan menjaga struktur Object
            if (typeof activeRecipeSteps[index] === 'object' && activeRecipeSteps[index] !== null) {
                activeRecipeSteps[index].photo = photoDataUrl;
            } else {
                const oldText = activeRecipeSteps[index] || "";
                activeRecipeSteps[index] = { desc: oldText, photo: photoDataUrl };
            }
            
            if (typeof window.renderLangkahProduksi === 'function') {
                window.renderLangkahProduksi();
            }
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Fungsi untuk preview gambar skala penuh layaknya UI/UX Lightbox.
 * Mencegah navigasi bawaan dan merender overlay dinamis di halaman yang sama.
 */
function previewRecipePhoto(event, photoUrl) {
    if (!photoUrl) return;

    // Mencegah navigasi / aksi default browser
    if (event) {
        event.preventDefault(); 
        event.stopPropagation();
    }

    // 1. Mencegah duplikasi overlay di DOM
    const existingOverlay = document.getElementById('dynamic-image-preview-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // 2. Membuat kontainer overlay (Menggunakan top:0, left:0, right:0, bottom:0 untuk cegah overflow scrollbar)
    const overlayElement = document.createElement('div');
    overlayElement.id = 'dynamic-image-preview-overlay';
    overlayElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        cursor: zoom-out;
        opacity: 0;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        transition: opacity 0.2s ease-in-out;
    `;

    // 3. Membuat elemen gambar dengan isolasi style (margin: auto & box-sizing)
    const imgElement = document.createElement('img');
    imgElement.src = photoUrl;
    imgElement.style.cssText = `
        width: auto;
        height: auto;
        max-width: min(90vw, 450px);
        max-height: 85vh;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: rgba(0, 0, 0, 0.5) 0px 10px 25px;
        margin: auto;
        padding: 0;
        box-sizing: border-box;
        display: block;
        float: none;
    `;

    // 4. Penutupan overlay & cleanup event listener
    const closeOverlay = () => {
        overlayElement.style.opacity = '0';
        document.removeEventListener('keydown', handleKeyDown);
        
        setTimeout(() => {
            if (overlayElement.parentNode) {
                overlayElement.parentNode.removeChild(overlayElement);
            }
        }, 200);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeOverlay();
        }
    };

    overlayElement.onclick = closeOverlay;
    document.addEventListener('keydown', handleKeyDown);

    // 5. Render ke DOM
    overlayElement.appendChild(imgElement);
    document.body.appendChild(overlayElement);

    // Trigger animasi fade-in
    requestAnimationFrame(() => {
        overlayElement.style.opacity = '1';
    });
}

window.handleFotoLangkah = handleFotoLangkah;
window.previewRecipePhoto = previewRecipePhoto;


// =======================================================================
// 2. SINKRONISASI TEKS & AUTO-RESIZE (DILETAKKAN DI DALAM renderLangkahProduksi)
// =======================================================================
// Pastikan blok ini dieksekusi SETELAH elemen DOM textarea dirender.

document.querySelectorAll('.input-step-text').forEach(textarea => {
    // FITUR ALA GOOGLE KEEP: Sesuaikan tinggi awal saat pertama kali dirender
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';

    textarea.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        const val = e.target.value;

        // BUG FIX: Jaga struktur objek agar properti 'photo' tidak terhapus saat mengetik!
        if (typeof activeRecipeSteps[idx] === 'object' && activeRecipeSteps[idx] !== null) {
            activeRecipeSteps[idx].desc = val;
        } else {
            // Fallback konversi jika data masih berupa string lama
            activeRecipeSteps[idx] = { desc: val, photo: null };
        }

        // FITUR ALA GOOGLE KEEP: Auto-resize saat mengetik atau menghapus teks
        e.target.style.height = 'auto'; 
        e.target.style.height = (e.target.scrollHeight) + 'px'; 
    });

    textarea.addEventListener('focus', (e) => {
        e.target.style.borderColor = '#E67E22';
        e.target.style.boxShadow = '0 0 0 3px rgba(230, 126, 34, 0.12)';
    });

    textarea.addEventListener('blur', (e) => {
        e.target.style.borderColor = '#e2e8f0';
        e.target.style.boxShadow = 'none';
    });
});

// Fungsi untuk menambah langkah baru
let totalLangkah = 0;

/**
 * Menambahkan langkah produksi baru ke dalam state dan memicu re-render UI.
 * Menggunakan pola arsitektur State-Driven UI untuk mencegah memory leak dan duplikasi DOM.
 * 
 * @param {string} teksInstruksi - Deskripsi langkah produksi
 * @param {string} gambarUrl - URL atau base64 gambar langkah produksi
 */
window.tambahLangkahProduksi = function(teksInstruksi = '', gambarUrl = '') {
    // 1. Inisialisasi State Management yang aman (Mencegah undefined atau tipe non-array)
    if (!window.activeRecipeSteps || !Array.isArray(window.activeRecipeSteps)) {
        window.activeRecipeSteps = [];
    }

    // 2. Sanitasi Input (Mencegah error runtime jika parameter bukan string)
    const desc = (typeof teksInstruksi === 'string') ? teksInstruksi.trim() : '';
    const photo = (typeof gambarUrl === 'string' && gambarUrl.trim() !== '') ? gambarUrl.trim() : null;

    // 3. Mutasi State: Tambahkan entitas baru ke dalam array
    window.activeRecipeSteps.push({
        desc: desc,
        photo: photo
    });
    
    // 4. Update UI: Serahkan sepenuhnya pada fungsi render.
    if (typeof window.renderLangkahProduksi === 'function') {
        window.renderLangkahProduksi();
    } else {
        console.error("[Fatal Error] window.renderLangkahProduksi tidak terdefinisi. UI gagal diperbarui.");
    }

    // Catatan Refactoring (Clean Code): 
    // Logika menyembunyikan 'empty-step-placeholder' secara manual (style.display = 'none') 
    // DIHAPUS karena fungsi renderLangkahProduksi() sudah menimpa (overwrite) 
    // keseluruhan innerHTML dari kontainer berdasarkan panjang array activeRecipeSteps.
};

// Fungsi Preview Foto saat dipilih
function previewFotoLangkah(input, stepId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewBox = document.getElementById(`step-preview-container-${stepId}`);
            previewBox.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain;">`;
            document.getElementById(`step-filename-${stepId}`).innerText = input.files[0].name;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Fungsi untuk menghapus langkah berdasarkan indeks
function hapusLangkahProduksi(index) {
    if (confirm("Hapus langkah produksi ini?")) {
        activeRecipeSteps.splice(index, 1);
        renderLangkahProduksi();
    }
}

// Helper Update Deskripsi
function updateStepDesc(index, val) {
    if (typeof activeRecipeSteps[index] === 'string') {
        activeRecipeSteps[index] = { desc: val, photo: '' };
    } else {
        activeRecipeSteps[index].desc = val;
    }
}

// Fungsi baru: Memindahkan urutan langkah (Naik / Turun)
function pindahLangkah(index, arah) {
    const targetIndex = index + arah;
    if (targetIndex < 0 || targetIndex >= activeRecipeSteps.length) return;
    
    // Tukar posisi elemen di dalam array
    const temp = activeRecipeSteps[index];
    activeRecipeSteps[index] = activeRecipeSteps[targetIndex];
    activeRecipeSteps[targetIndex] = temp;
    
    renderLangkahProduksi();
}

// Fungsi baru: Template instan standar pembuatan donat
function muatTemplateLangkahDonat() {
    if (confirm("Muat template standar produksi donat? Catatan langkah saat ini akan digantikan.")) {
        activeRecipeSteps = [
            "Campurkan Tepung Utama dan bahan kering lainnya. Lakukan proses autolisis bersama air dingin untuk membentuk gluten alami.",
            "Masukkan ragi aktif, aduk rata, lalu tambahkan mentega dan garam. Mixer hingga adonan mencapai kalis elastis (windowpane test).",
            "Istirahatkan adonan (First Proofing) selama 45-60 menit hingga mengembang dua kali lipat.",
            "Timbang dan bulatkan adonan (Rounding), lalu istirahatkan kembali (Bench Proofing) selama 15 menit.",
            "Proses cetak / bentuk donat, tata di loyang yang sudah ditaburi terigu tipis.",
            "Lakukan fermentasi akhir (Final Proofing) hingga ringan dan mengembang pas.",
            "Goreng dalam minyak panas sedang dengan satu kali balik hingga matang kecokelatan."
        ];
        renderLangkahProduksi();
        if (typeof NotifSystem !== 'undefined') {
            NotifSystem.tambah('resep', 'Template Dimuat', 'Langkah standar donat berhasil diterapkan.', '⚡');
        }
    }
}

async function simpanPdfNative(base64Data, namaFile) {
  try {
    // Jika lingkungan native tersedia, gunakan Filesystem + Share
    if (window.Capacitor && typeof Filesystem !== 'undefined' && typeof Share !== 'undefined') {
      const result = await Filesystem.writeFile({
        path: namaFile,
        data: base64Data,
        directory: Directory.Documents,
      });
      await Share.share({
        title: 'Simpan Dokumen Donut Proofing',
        text: 'Simpan atau bagikan laporan cetak Anda.',
        url: result.uri,
        dialogTitle: 'Simpan PDF',
      });
      return;
    }

    // Fallback untuk web: buat blob dari base64 dan trigger unduh
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = namaFile || 'Laporan_Proofing.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    } catch (err) {
      console.error('Fallback unduh PDF gagal:', err);
      throw err;
    }
  } catch (error) {
    console.error('Gagal menyimpan PDF di mode Native / fallback:', error);
    alert('Gagal menyimpan PDF: ' + (error && error.message ? error.message : error));
  }
}

async function bacaLegacyResepTunggal() {
    let raw = localStorage.getItem(RESEP_LEGACY_KEY);
    if (window.Capacitor) {
        const { value } = await Preferences.get({ key: RESEP_LEGACY_KEY });
        if (value) raw = value;
    }
    return raw;
}

async function bacaSemuaResepDariPerangkat() {
    let raw = localStorage.getItem('premium_saved_recipes');
    if (window.Capacitor) {
        const { value } = await Preferences.get({ key: 'premium_saved_recipes' });
        if (value) raw = value;
    }
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            console.warn('Data resep rusak, reset daftar:', e);
        }
    }
    const legacyRaw = await bacaLegacyResepTunggal();
    if (legacyRaw) {
        try {
            const legacyResep = JSON.parse(legacyRaw);
            const daftar = [legacyResep];
            await simpanDaftarResepKePerangkat(daftar);
            localStorage.removeItem(RESEP_LEGACY_KEY);
            if (window.Capacitor) await Preferences.remove({ key: RESEP_LEGACY_KEY });
            return daftar;
        } catch (e) {
            console.warn('Migrasi resep lama gagal:', e);
        }
    }
    return [];
}

/* FUNGSI PENYIMPANAN RESEP KE PERANGKAT (LOCALSTORAGE / PREFERENCES) */
async function simpanDaftarResepKePerangkat(daftarResep) {
    const jsonString = JSON.stringify(daftarResep);
    try {
        localStorage.setItem('premium_saved_recipes', jsonString);
    } catch (err) {
        // Handle QuotaExceededError by clearing older data or notifying user
        if (err.name === 'QuotaExceededError') {
            console.error('localStorage penuh, mencoba cleanup data lama...');
            try {
                // Remove oldest recipes if quota exceeded
                if (daftarResep.length > 0) {
                    const trimmedRecipes = daftarResep.slice(Math.max(0, daftarResep.length - 5));
                    localStorage.setItem('premium_saved_recipes', JSON.stringify(trimmedRecipes));
                    console.warn('Menyimpan hanya 5 resep terbaru karena storage penuh.');
                    if (typeof NotifSystem !== 'undefined') {
                        NotifSystem.tambah('sistem', '⚠️ Storage Penuh', 'Hanya 5 resep terbaru yang disimpan.', '💾');
                    }
                    return;
                }
            } catch (trimErr) {
                console.error('Gagal trim data:', trimErr);
            }
        }
        console.warn('Gagal menyimpan ke localStorage:', err);
    }
    if (window.Capacitor && typeof Preferences !== 'undefined') {
        try {
            await Preferences.set({ key: 'premium_saved_recipes', value: jsonString });
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                console.error('Preferences juga penuh, data tidak bisa disimpan');
                if (typeof NotifSystem !== 'undefined') {
                    NotifSystem.tambah('sistem', '🔴 Penyimpanan Penuh', 'Tidak dapat menyimpan data resep lebih lanjut.', '❌');
                }
            } else {
                console.warn('Gagal menyimpan ke Preferences native:', err);
            }
        }
    }
}

function formatTanggalResep(isoString) {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        return isoString;
    }
}

// Fungsi pelindung karakter HTML (pastikan hanya ada 1 fungsi ini di skrip Anda)
function escapeHtmlResep(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function bangunObjekResepDariForm(namaResep) {
    const tepungUtama = document.getElementById('base-flour')?.value || "1000";
    const targetYield = document.getElementById('recipe-yield')?.value || "1";
    const hargaJual = document.getElementById('input-harga-jual')?.value || "0";
    
    const namaBersih = namaResep.toLowerCase().replace(/[^a-z0-9]/g, '');
    const stableId = currentEditingRecipeId || ("resep_" + namaBersih + "_" + Date.now());

    return {
        id: stableId,
        nama: namaResep,
        tepungUtama: parseFloat(tepungUtama),
        targetYield: parseInt(targetYield, 10),
        hargaJual: parseFloat(hargaJual),
        bahanBaku: JSON.parse(JSON.stringify(bakeryIngredients)),
        langkahProduksi: JSON.parse(JSON.stringify(activeRecipeSteps)), // <--- Menyimpan langkah produksi
        waktuSimpan: new Date().toISOString()
    };
}

function terapkanResepKeKalkulator(resep) {
    if (!resep) return;
    if (resep.tepungUtama != null && document.getElementById('base-flour')) {
        document.getElementById('base-flour').value = resep.tepungUtama;
    }
    if (resep.targetYield != null && document.getElementById('recipe-yield')) {
        document.getElementById('recipe-yield').value = resep.targetYield;
    }
    if (resep.hargaJual != null && document.getElementById('input-harga-jual')) {
        document.getElementById('input-harga-jual').value = resep.hargaJual;
    }
    if (resep.bahanBaku && Array.isArray(resep.bahanBaku)) {
        bakeryIngredients = JSON.parse(JSON.stringify(resep.bahanBaku));
        window.bakeryIngredients = bakeryIngredients;
        if (typeof renderRecipeTableBakuTotal === 'function') {
            renderRecipeTableBakuTotal();
        }
    }
    if (typeof hitungHPPBakeryTotal === 'function') {
        hitungHPPBakeryTotal();
    } else if (typeof window.hitungHPPBakeryTotal === 'function') {
        window.hitungHPPBakeryTotal();
    }
}



// 1. FUNGSI SIMPAN RESEP (Dipertahankan & Dioptimalkan agar tidak double pop-up)
async function simpanResepKeLokal(dataResep) {
  const json = JSON.stringify(dataResep);
  if (window.Capacitor && typeof Filesystem !== 'undefined') {
    try {
      await Filesystem.writeFile({
        path: FILE_RESEP_PATH,
        data: json,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
        recursive: true
      });
      window.DEBUG && console.log('File resep berhasil diperbarui di storage perangkat (native).');
      if (typeof showToast === 'function') showToast('Resep berhasil disimpan di perangkat Anda.');
      return;
    } catch (err) {
      window.DEBUG && console.warn('Gagal writeFile native, fallback ke simpanDaftarResepKePerangkat:', err);
    }
  }
  // Fallback: simpan ke daftar resep (localStorage / Preferences) dan tawarkan unduh JSON sebagai backup
  try {
    let daftar = await bacaSemuaResepDariPerangkat();
    const idx = daftar.findIndex(r => r.id === dataResep.id);
    if (idx >= 0) daftar[idx] = dataResep; else daftar.unshift(dataResep);
    if (daftar.length > MAX_RESEP_TERSIMPAN) daftar = daftar.slice(0, MAX_RESEP_TERSIMPAN);
    await simpanDaftarResepKePerangkat(daftar);
    window.DEBUG && console.log('File resep disimpan ke localStorage sebagai fallback.');

    // Buat file JSON untuk diunduh sebagai cadangan user (non-intrusive)
    try {
      const blob = new Blob([JSON.stringify(dataResep, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const namaFile = (dataResep && dataResep.id) ? `resep-${dataResep.id}.json` : `resep-${Date.now()}.json`;
      a.href = url;
      a.download = namaFile;
      // Jangan otomatis menambahkan/klik jika user agent mencegahnya — bungkus dalam timeouts kecil untuk kompatibilitas
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      window.DEBUG && console.log('Cadangan resep telah diunduh sebagai', namaFile);
      if (typeof showToast === 'function') showToast('Cadangan berhasil diunduh. Terima kasih, file tersimpan di perangkat Anda.');
    } catch (dlErr) {
      // Jika unduhan gagal, hanya log saja — jangan ganggu alur utama
      window.DEBUG && console.warn('Gagal membuat unduhan cadangan JSON:', dlErr);
    }
  } catch (err) {
    console.error('Gagal menyimpan resep di fallback:', err);
    throw err;
  }
}

async function muatDataResep() {
    try {
        // 1. Coba ambil dulu dari IndexedDB agar loading terasa instan
        const dataLokal = await ambilDariIndexedDB();
        if (dataLokal && dataLokal.length > 0) {
            renderTampilan(dataLokal);
        }

        // 2. Jika ada koneksi internet, ambil data terbaru dari Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: dataCloud, error } = await supabase
                .from('recipes')
                .select('*')
                .eq('user_id', user.id);

            if (!error && dataCloud) {
                // Simpan ulang data dari cloud ke IndexedDB agar sinkron
                await simpanKeIndexedDB(dataCloud);
                renderTampilan(dataCloud); // Refresh tampilan dengan data terbaru
            }
        }
    } catch (err) {
        console.error("Gagal memuat data, menggunakan mode offline:", err);
    }
}

// Fungsi untuk menyinkronkan resep dari Cloud Supabase ke lokal
async function sinkronisasiAwalDariSupabase() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log('Pengguna tidak terautentikasi, skip sinkronisasi cloud');
            return;
        }

        const { data, error } = await supabase.from('recipes').select('*').eq('user_id', user.id);
        if (error) throw error;

        if (data && data.length > 0) {
            let resepLokal = await bacaSemuaResepDariPerangkat() || [];
            let adaPerubahan = false;
            
            data.forEach(serverRow => {
                const resepServer = serverRow.details || serverRow;
                const idxLokal = resepLokal.findIndex(r => r.id === resepServer.id);
                
                if (idxLokal >= 0) {
                    // Cek jika butuh update (opsional, untuk amannya kita timpa data lokal dengan server)
                    resepLokal[idxLokal] = resepServer;
                } else {
                    resepLokal.push(resepServer);
                }
                adaPerubahan = true;
            });

            if (adaPerubahan) {
                await simpanDaftarResepKePerangkat(resepLokal);
                window.recipes = resepLokal;
                console.log("✅ Data lokal berhasil disinkronkan dengan Supabase.");
            }
        }
    } catch (err) {
        console.error("Gagal menarik data awal Supabase:", err);
    }
}

// ==========================================
// 3. FUNGSI HAPUS SATUAN BERDASARKAN ID (FIX BUG HAPUS SEMUA)
// ==========================================
async function hapusResepBerdasarkanId(id) {
    try {
        // A. Filter dan hapus spesifik berdasarkan ID dari penyimpanan lokal
        let list = await bacaSemuaResepDariPerangkat();
        list = (list || []).filter(r => r.id !== id);
        await simpanDaftarResepKePerangkat(list);

        // B. Hapus spesifik baris data dari tabel Supabase berdasarkan ID
        if (navigator.onLine) {
            try {
                const { error } = await supabase.from('recipes').delete().eq('id', id);
                if (error) {
                    console.warn("Gagal hapus di Supabase:", error.message);
                } else {
                    console.log(`Resep ID ${id} berhasil dihapus dari Supabase.`);
                }
            } catch (cloudErr) {
                console.warn("Cloud delete bypassed:", cloudErr);
            }
        }
    } catch (err) {
        console.error("Gagal menghapus resep:", err);
        alert("Gagal menghapus resep: " + err.message);
    }
}

// 6. TUTUP MODAL
function tutupDaftarResepTersimpan() {
    const modal = document.getElementById('recipe-list-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('inert', '');
    }
    document.body.style.overflow = '';
}

// Fungsi inti untuk memproses penghapusan resep
async function eksekusiHapusResepMaster(resepId) {
    // 1. Validasi ketat ID
    if (!resepId || resepId === 'undefined' || resepId === 'null') {
        alert("Gagal menghapus: ID resep tidak valid.");
        return;
    }

    if (!confirm("Apakah Anda yakin ingin menghapus resep ini secara permanen dari perangkat?")) {
        return;
    }

    try {
        console.log("Mengeksekusi penghapusan aman untuk ID:", resepId);

        // A. Hapus presisi dari IndexedDB (Offline Storage Utama)
        if (typeof initIndexedDB === 'function') {
            try {
                const db = await initIndexedDB();
                const tx = db.transaction('recipes', 'readwrite');
                await tx.store.delete(resepId);
                await tx.done;
                console.log("Berhasil dihapus dari IndexedDB.");
            } catch (e) {
                console.warn("IndexedDB delete warning:", e);
            }
        }

        // B. Hapus presisi dari LocalStorage (Dengan pengaman ketat agar item tanpa ID tidak ikut terhapus)
        const rawData = localStorage.getItem('premium_saved_recipes');
        if (rawData) {
            let recipes = JSON.parse(rawData);
            if (Array.isArray(recipes)) {
                // HANYA filter item yang memiliki r.id dan TIDAK SAMA dengan resepId yang dipilih
                let filteredRecipes = recipes.filter(r => r.id && String(r.id) !== String(resepId));
                localStorage.setItem('premium_saved_recipes', JSON.stringify(filteredRecipes));
                console.log("LocalStorage berhasil dibersihkan dengan aman.");
            }
        }

        // C. Hapus dari Supabase Cloud (Jika online & tabel 'recipes' tersedia)
        if (navigator.onLine && typeof supabase !== 'undefined') {
            try {
                const { error } = await supabase
                    .from('recipes')
                    .delete()
                    .eq('id', resepId);

                if (error) {
                    console.warn("Catatan Cloud Supabase:", error.message);
                } else {
                    console.log("Berhasil dihapus dari Cloud Supabase.");
                }
            } catch (cloudErr) {
                console.warn("Cloud delete bypassed:", cloudErr);
            }
        }

        // D. Refresh tampilan modal resep secara instan
        if (typeof tampilkanDaftarResepTersimpan === 'function') {
            await tampilkanDaftarResepTersimpan();
        }

        // E. Notifikasi Sukses
        if (typeof NotifSystem !== 'undefined' && typeof NotifSystem.tambah === 'function') {
            NotifSystem.tambah('resep', '🗑️ Resep Dihapus', 'Resep berhasil dihapus dari perangkat.', '⚠️');
        } else {
            alert("Resep berhasil dihapus.");
        }

    } catch (err) {
        console.error("Gagal mengeksekusi penghapusan resep:", err);
        alert("Terjadi kesalahan sistem saat menghapus resep.");
    }
};

// Fungsi Penutup Aman (Diletakkan DI LUAR document.addEventListener('DOMContentLoaded'))
function tutupHalamanResepSecaraAman() {
    window.DEBUG && console.log("Menutup halaman resep secara aman.");
    
    // GANTI 'recipe-page' MENJADI 'recipe' Sesuai ID HTML Utama
    const resepPage = document.getElementById('recipe'); 
    
    if (resepPage) {
        // Sembunyikan elemen modal/tab resep
        resepPage.style.display = 'none';
        resepPage.classList.remove('active');
        
        // Kembalikan interaksi scroll layar utama proofer/HP
        document.body.style.overflow = 'auto';
        document.body.style.pointerEvents = 'auto';
    } else {
        console.warn("Elemen #recipe tidak ditemukan di dalam DOM.");
    }
}

function readRecipesFromStorage() {
    try {
        const raw = localStorage.getItem('premium_saved_recipes');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.warn('Gagal parse premium_saved_recipes:', e);
    }
    return Array.isArray(window.recipes) ? window.recipes : [];
}

// 2. Eksekutor Pembaruan Lokal (Real-time sync)
async function tanganiPerubahanResepRealtime(payload) {
    try {
        const dataServer = payload.new || payload.old;
        const tipeAksi = payload.eventType; // INSERT, UPDATE, atau DELETE

        // Baca data lokal saat ini menggunakan fungsi async
        let resepLokal = await bacaSemuaResepDariPerangkat() || [];

        if (tipeAksi === 'INSERT' || tipeAksi === 'UPDATE') {
            const index = resepLokal.findIndex(r => r.id === dataServer.id);
            
            // Ambil objek detail resep utuh dari server
            const resepUtuh = dataServer.details || dataServer;

            if (index >= 0) {
                resepLokal[index] = resepUtuh; // Timpa dengan data baru (Update)
            } else {
                resepLokal.push(resepUtuh); // Tambahkan data baru (Insert)
            }
        } else if (tipeAksi === 'DELETE') {
            const dataLama = payload.old || dataServer;
            resepLokal = resepLokal.filter(r => r.id !== dataLama.id);
        }

        // Simpan paksa ke IndexedDB / Preferences
        await simpanDaftarResepKePerangkat(resepLokal);

        // 3. Reaktivitas UI (Hot Reload)
        window.recipes = resepLokal; // Update variabel global
        
        // Jika modal daftar resep sedang terbuka, refresh tampilannya
        const modalDaftarResep = document.getElementById('recipe-list-modal');
        if (modalDaftarResep && modalDaftarResep.classList.contains('active')) {
            if (typeof window.tampilkanDaftarResepTersimpan === 'function') {
                await window.tampilkanDaftarResepTersimpan();
            }
        }

        // Berikan notifikasi halus di UI
        if (typeof NotifSystem !== 'undefined') {
            NotifSystem.tambah('sistem', 'Resep Tersinkronisasi', 'Data resep baru saja diperbarui dari server.', '🔄');
        }
    } catch (err) {
        console.error("Gagal menangani perubahan realtime:", err);
    }
}

// ==========================================
// 4. FUNGSI PIP (Picture-in-Picture) UNTUK TIMER
// ==========================================
async function aktifkanModePIP() {
    // 1. Validasi dukungan API Document Picture-in-Picture pada Browser
    if (!('documentPictureInPicture' in window)) {
        const container = document.getElementById('app-container');
        const pipBtn = document.getElementById('pip-trigger-btn');
        
        if (container) {
            // Aktifkan/nonaktifkan mode mini
            container.classList.toggle('mini-mode');
            
            // Ubah tampilan tombol sebagai indikator
            if (container.classList.contains('mini-mode')) {
                pipBtn.innerHTML = "❌ Tutup Mini";
                pipBtn.style.background = "#c0392b"; // Ubah merah saat aktif
                if (typeof NotifSystem !== 'undefined') {
                    NotifSystem.tambah('sistem', 'Mode Mini Aktif', 'Tampilan disederhanakan ke mode widget.', '📱');
                }
            } else {
                pipBtn.innerHTML = "📺 PIP Mode";
                pipBtn.style.background = "var(--accent)"; // Kembali oranye
            }
        }
        return; // Hentikan eksekusi kode Desktop di bawah ini
    }

    // Jika PIP sudah terbuka, fokuskan kembali jendelanya
    if (pipWindowInstance) {
        pipWindowInstance.focus();
        return;
    }

    try {
        // 2. Buka jendela PIP melayang dengan aspek rasio mini kotak
        pipWindowInstance = await window.documentPictureInPicture.requestWindow({
            width: 280,
            height: 180,
        });

        // 3. Salin CSS Stylesheet dari aplikasi utama agar font dan layout rapi
        [...document.styleSheets].forEach((styleSheet) => {
            try {
                const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                const style = document.createElement('style');
                style.textContent = cssRules;
                pipWindowInstance.document.head.appendChild(style);
            } catch (e) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = styleSheet.href;
                pipWindowInstance.document.head.appendChild(link);
            }
        });

        // 4. Suntikkan struktur HTML khusus ke dalam jendela pop-out PIP
        pipWindowInstance.document.body.innerHTML = `
            <div class="pip-container" style="
                padding: 12px; 
                text-align: center; 
                background: #FDF5E6; 
                height: 100vh; 
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                user-select: none;
            ">
                <div style="font-size: 10px; font-weight: bold; color: #E67E22; margin-bottom: 2px; letter-spacing: 0.5px;">PROOFER TIMER</div>
                <div id="pip-countdown" style="font-size: 32px; font-weight: bold; color: #4E342E; font-family: monospace; line-height: 1.1;">00:00</div>
                <div id="pip-status" style="font-size: 9px; margin-top: 4px; color: #5d4037; max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 4px;">Memantau ragi adonan...</div>
                
                <div style="margin-top: 10px; display: flex; gap: 8px;">
                    <button id="pip-btn-control" style="background: #4E342E; color: white; border: none; padding: 6px 14px; border-radius: 12px; font-size: 10px; cursor: pointer; font-weight: bold; transition: background 0.2s;">START</button>
                    <button id="pip-btn-close" style="background: #bdc3c7; color: #4E342E; border: none; padding: 6px 14px; border-radius: 12px; font-size: 10px; cursor: pointer; font-weight: bold;">Tutup</button>
                </div>
            </div>
        `;

        // 5. Ambil referensi elemen dari dalam dokumen PiP yang baru disuntikkan
        const pipBtnControl = pipWindowInstance.document.getElementById('pip-btn-control');
        const pipBtnClose = pipWindowInstance.document.getElementById('pip-btn-close');
        const pipCountdown = pipWindowInstance.document.getElementById('pip-countdown');
        const pipStatus = pipWindowInstance.document.getElementById('pip-status');

        // 6. Sinkronisasi Data Real-Time secara dua arah dari DOM Aplikasi Utama
        const updatePipDisplay = () => {
            const mainCountdownText = document.getElementById('countdown')?.innerText || "00:00";
            const mainStatusText = document.getElementById('ai-tips')?.innerText || "Memantau ragi adonan...";

            if (pipCountdown) {
                pipCountdown.innerText = mainCountdownText;
                // Selaraskan warna countdown dari warna aslinya di aplikasi utama
                const mainCountdownEl = document.getElementById('countdown');
                if (mainCountdownEl) {
                    const mainColor = window.getComputedStyle(mainCountdownEl).color;
                    pipCountdown.style.color = mainColor;
                }
            }
            if (pipStatus) {
                pipStatus.innerText = mainStatusText;
            }
            
            // Atur status tombol secara reaktif berdasarkan variabel global isTimerRunning
            if (pipBtnControl && typeof isTimerRunning !== 'undefined') {
                if (isTimerRunning) {
                    pipBtnControl.innerText = "RESET";
                    pipBtnControl.style.background = "#d32f2f"; 
                } else {
                    pipBtnControl.innerText = "START";
                    pipBtnControl.style.background = "#4E342E";  
                }
            }
        };

        // Jalankan sinkronisasi DOM instan & berkala (200ms) selama jendela terbuka
        updatePipDisplay();
        pipIntervalInstance = setInterval(updatePipDisplay, 200);

        // 7. Event Listener: Tombol START/RESET di dalam PiP
        if (pipBtnControl) {
            pipBtnControl.addEventListener('click', () => {
                if (typeof isTimerRunning !== 'undefined' && isTimerRunning) {
                    // Simulasikan klik pada elemen countdown utama untuk memicu reset/stop
                    const countdownEl = document.getElementById('countdown');
                    if (countdownEl) {
                        countdownEl.click();
                    } else {
                        // Fallback jika elemen tidak ditemukan, panggil tombol utama
                        document.getElementById('main-start-btn')?.click();
                    }
                } else {
                    // Jika timer mati, jalankan fungsi start proofing bawaan aplikasi Anda
                    const mainStartBtn = document.getElementById('main-start-btn');
                    if (mainStartBtn) {
                        mainStartBtn.click();
                    } else if (typeof startProofing === 'function') {
                        startProofing();
                    }
                }
            });
        }

        // 8. Event Listener: Tombol Tutup di dalam PiP
        if (pipBtnClose) {
            pipBtnClose.addEventListener('click', () => {
                pipWindowInstance.close();
            });
        }

        // 9. Pembersihan memori interval saat jendela PiP ditutup oleh user
        pipWindowInstance.addEventListener('pagehide', () => {
            clearInterval(pipIntervalInstance);
            pipWindowInstance = null;
            pipIntervalInstance = null;
            if (typeof NotifSystem !== 'undefined') {
                NotifSystem.tambah('sistem', 'Mode PIP Nonaktif', 'Kembali memantau adonan di halaman utama.', '📱');
            }
        });

    } catch (error) {
        console.error("Gagal membuka Document PIP:", error);
        if (typeof NotifSystem !== 'undefined') {
            NotifSystem.tambah('sistem', 'Gagal Membuka PIP', 'Harus dipicu oleh aksi sentuhan/klik langsung oleh user.', '❌');
        }
    }
}

// ==========================================
// FUNGSI KALKULATOR HPP & BAHAN BAKU
// ==========================================
function hitungHPPBakeryTotal() {
    const baseFlourInput = document.getElementById('base-flour');
    const yieldInput = document.getElementById('recipe-yield');
    const hargaJualInput = document.getElementById('input-harga-jual');
    
    if (!baseFlourInput || !yieldInput) return;

    const baseFlourWeight = parseFloat(baseFlourInput.value) || 1000;
    const totalYield = parseFloat(yieldInput.value) || 1;
    const hargaJualPerPcs = parseFloat(hargaJualInput ? hargaJualInput.value : 0) || 0;

    let totalDoughCost = 0;
    let totalBebanBiayaCost = 0; // Akumulasi khusus biaya (minyak, toping, kemasan)
    let sumNetDough = 0;         // Berat bersih adonan fisik
    let sumNetTopping = 0;       // Berat khusus topping

    // Mendeteksi sumber array data (menjaga kompatibilitas kode lama Anda)
    let dataArray = null;
    if (typeof bumbuResepList !== 'undefined') {
        dataArray = bumbuResepList;
    } else if (typeof window.bumbuResepList !== 'undefined') {
        dataArray = window.bumbuResepList;
    } else if (typeof bakeryIngredients !== 'undefined') {
        dataArray = bakeryIngredients;
    } else if (typeof window.bakeryIngredients !== 'undefined') {
        dataArray = window.bakeryIngredients;
    }

    if (!dataArray) return;

    // 1. Hitung Biaya Riil Penggunaan Tiap Bahan Baku (LOGIKA BARU)
    dataArray.forEach((ing, index) => {
        let grossWeight = 0;
        let costTerpakai = 0;

        const packSize = parseFloat(ing.pack) || 1;
        const currentPrice = parseFloat(ing.price) || 0;
        const currentRatio = parseFloat(ing.ratio) || 0;
        
        const kategori = ing.category || ing.type || "";
        const namaBahan = (ing.name || ing.nama || "").toLowerCase();
        let ratio = ing.isFlour ? 100 : currentRatio;

        // Validasi Kategori: Minyak, Toping, dan Kemasan masuk ke Beban/Biaya
        const isBebanBiaya = namaBahan.includes("minyak") || 
                             kategori === "Bahan Toping" || 
                             kategori === "Kemasan" || 
                             kategori === "Toping" ||
                             ing.type === "Toping";

        if (isBebanBiaya) {
            // Masuk ke perhitungan biaya, tetapi TIDAK dihitung sebagai berat fisik adonan netto
            grossWeight = currentRatio * (kategori === "Kemasan" ? 1 : totalYield);
            
            // Khusus topping tetap dihitung untuk UI "Total Toping"
            if (kategori === "Bahan Toping" || kategori === "Toping" || ing.type === "Toping") {
                sumNetTopping += grossWeight;
            }
            
            costTerpakai = (grossWeight / packSize) * currentPrice;
            totalBebanBiayaCost += costTerpakai;
        } else {
            // Masuk ke kategori pembentuk berat adonan fisik (Kering, Basah, Pengembang, Tambahan, dll)
            grossWeight = (ratio / 100) * baseFlourWeight;
            sumNetDough += grossWeight;
            costTerpakai = (grossWeight / packSize) * currentPrice;
            totalDoughCost += costTerpakai;
        }

        // --- FIX VISUAL KARTU KOMPONEN SECARA REAL-TIME ---
        const idBahan = ing.id !== undefined ? ing.id : index;
        
        // 1. Tambahkan format desimal di sini agar angka seperti 2.5 tidak dibulatkan
        const formatBerat = grossWeight % 1 !== 0 ? Number(grossWeight.toFixed(1)) : grossWeight;
        
        const grossEl = document.getElementById(`gross-${idBahan}`);
        if (grossEl) grossEl.innerText = formatBerat; // <-- Math.round dihapus
        
        const costEl = document.getElementById(`cost-${idBahan}`);
        if (costEl) costEl.innerText = Math.round(costTerpakai).toLocaleString('id-ID');
        
        const grossTabEl = document.getElementById(`gross-table-${idBahan}`);
        if (grossTabEl) grossTabEl.innerText = formatBerat; // <-- Math.round dihapus
        
        const costTabEl = document.getElementById(`cost-table-${idBahan}`);
        if (costTabEl) costTabEl.innerText = Math.round(costTerpakai).toLocaleString('id-ID');

        const cardTarget = document.querySelector(`[data-id="${index}"]`);
        if (cardTarget) {
            const txtBeratLokal = cardTarget.querySelector('.berat-pakai-text, .text-berat-pakai');
            if (txtBeratLokal) txtBeratLokal.innerText = formatBerat + " gr"; // <-- Math.round dihapus
            
            const txtBiayaLokal = cardTarget.querySelector('.biaya-text, .text-biaya');
            if (txtBiayaLokal) txtBiayaLokal.innerText = "Rp " + Math.round(costTerpakai).toLocaleString('id-ID');
        }
    });

    // 2. Kalkulasi Akumulasi Total Biaya & Berat Per Pcs
    const totalBiProduksi = totalDoughCost + totalBebanBiayaCost;
    const hppGabunganPerPcs = totalBiProduksi / totalYield;
    const weightPerPcs = sumNetDough / totalYield;

    // 3. Rumus Utama: Persentase Food Cost & Profit Margin
    let foodCostPercentage = 0;
    let profitMarginPercentage = 0;
    let totalKeuntunganBersih = 0;

    if (hargaJualPerPcs > 0) {
        foodCostPercentage = (hppGabunganPerPcs / hargaJualPerPcs) * 100;
        profitMarginPercentage = ((hargaJualPerPcs - hppGabunganPerPcs) / hargaJualPerPcs) * 100;
        totalKeuntunganBersih = (hargaJualPerPcs * totalYield) - totalBiProduksi;
    }

    // 4. Update Tampilan Ringkasan Finansial ke Elemen HTML
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    
    // Menampilkan hasil penyaringan baru ke UI DOM
    setTxt('sum-net-dough', sumNetDough.toFixed(0));
    setTxt('sum-net-topping', sumNetTopping.toFixed(0));
    setTxt('sum-weight-pcs', weightPerPcs.toFixed(1));
    
    setTxt('total-modal', "Rp " + Math.round(totalBiProduksi).toLocaleString('id-ID'));
    setTxt('sum-hpp-gabungan', "Rp " + Math.round(hppGabunganPerPcs).toLocaleString('id-ID'));
    setTxt('profit-bersih', "Rp " + Math.round(totalKeuntunganBersih).toLocaleString('id-ID'));
    
    const marginEl = document.getElementById('sum-profit-margin');
    if (marginEl) {
        marginEl.innerText = profitMarginPercentage.toFixed(1) + "%";
        marginEl.style.color = foodCostPercentage > 40 ? "#e67e22" : "#27ae60";
    }

    const fcEl = document.getElementById('food-cost-percent');
    if (fcEl) {
        fcEl.innerText = foodCostPercentage.toFixed(1) + "%";
        
        const badge = document.getElementById('fc-badge');
        if (badge) {
            if (foodCostPercentage > 45) {
                badge.innerText = "🚨 BOROS / OVERBUDGET (Food Cost > 45%)";
                badge.style.background = "#e74c3c";
            } else if (foodCostPercentage > 30) {
                badge.innerText = "⚠️ STANDAR REKOMENDASI INDUSTRIAL";
                badge.style.background = "#f39c12";
            } else if (foodCostPercentage === 0) {
                badge.innerText = "📌 MENUNGGU HARGA JUAL DIINPUT";
                badge.style.background = "#7f8c8d";
            } else {
                badge.innerText = "✅ IDEAL & SANGAT SEHAT (Kelebihan Untung)";
                badge.style.background = "#27ae60";
            }
        }
    }
    
    // ---------------------------------------------------------
    // 5. PEMICU AI AGENT DI SINI (BAGIAN AKHIR FUNGSI)
    // ---------------------------------------------------------
    if (typeof window.jalankanAnalisisAIAgent === 'function') {
        window.jalankanAnalisisAIAgent(
            hppGabunganPerPcs, // Total HPP per pcs yang didapat
            hargaJualPerPcs,   // Harga jual yang sudah diparsing di awal fungsi
            weightPerPcs       // Berat per pcs dari akumulasi sumNetDough
        );
    }
}

function perbaruiLabelRasioBahan() {
    const cat = document.getElementById('new-ing-type')?.value;
    const label = document.getElementById('label-new-ing-ratio');
    const ratioInp = document.getElementById('new-ing-ratio');
    const hint = document.getElementById('hint-new-ing-ratio');
    if (!label || !ratioInp) return;

    if (cat === 'Bahan Toping') {
        label.textContent = 'Berat / pcs';
        ratioInp.placeholder = '5';
        if (hint) hint.textContent = 'gram netto per 1 donat';
    } else if (cat === 'Kemasan') {
        label.textContent = 'Qty / pcs';
        ratioInp.placeholder = '0.17';
        if (hint) hint.textContent = 'unit kemasan per 1 donat';
    } else {
        label.textContent = 'Rasio baker %';
        ratioInp.placeholder = '10';
        if (hint) hint.textContent = '% dari tepung utama';
    }
}

function inisialisasiFormTambahBahan() {
    const quickContainer = document.getElementById('quick-ing-chips');
    if (quickContainer && !quickContainer.dataset.ready) {
        quickContainer.dataset.ready = '1';
        PRESET_BAHAN_CEPAT.forEach((preset, idx) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'quick-ing-chip';
            chip.textContent = preset.label;
            chip.addEventListener('click', () => window.isiBahanCepat(PRESET_BAHAN_CEPAT[idx]));
            quickContainer.appendChild(chip);
        });
    }

    ['new-ing-ratio', 'new-ing-price', 'new-ing-pack', 'new-ing-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', perbaruiPreviewBahanBaru);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    tambahBahanBakuKustom();
                }
            });
        }
    });

    ['base-flour', 'recipe-yield'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', perbaruiPreviewBahanBaru);
    });

    perbaruiLabelRasioBahan();
    perbaruiPreviewBahanBaru();
}

// Fungsi tambah bahan yang disesuaikan agar masuk ke sistem dinamis localStorage
function tambahBahanBakuKustom() {
    const name = document.getElementById('new-ing-name')?.value.trim();
    const category = document.getElementById('new-ing-type')?.value || 'Bahan Kering';
    const ratio = parseFloat(document.getElementById('new-ing-ratio')?.value) || 0;
    const price = parseFloat(document.getElementById('new-ing-price')?.value) || 0;
    const pack = parseFloat(document.getElementById('new-ing-pack')?.value) || 1000;

    if (!name) { 
        alert("Silakan isi nama bahan baku terlebih dahulu!"); 
        return; 
    }

    // Buat ID unik berdasarkan nama
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const isFlour = (category === 'Bahan Kering' && ratio === 100); // deteksi sederhana jika ingin dijadikan acuan tepung

    // Masukkan ke array dinamis & simpan
    window.addBakeryIngredient({
        id: newId,
        name: name,
        type: (category === 'Bahan Toping' || category === 'Kemasan') ? 'Topping' : 'Dough',
        category: category,
        ratio: ratio,
        price: price,
        pack: pack,
        isFlour: isFlour
    });
    
    // Reset Form Input
    document.getElementById('new-ing-name').value = '';
    document.getElementById('new-ing-ratio').value = '';
    document.getElementById('new-ing-price').value = '';
    document.getElementById('new-ing-pack').value = '';
    perbaruiPreviewBahanBaru();
}

// Fungsi untuk membalikkan status (buka jadi tutup, tutup jadi buka) saat disentuh
function renderRecipeTableBakuTotal() {
    const tbody = document.getElementById('recipe-ingredients-body');
    const container = document.getElementById('recipe-ingredients-body');
    const cardsContainer = document.getElementById('recipe-cards-container'); // Ambil kontainer kartu baru
    
    // Tampilan mobile hanya memakai #recipe-cards-container; tbody merupakan
    // elemen legacy untuk PDF dan memang tidak selalu ada di DOM aplikasi.
    if (!cardsContainer && !tbody) return;

    if (!container && !cardsContainer) {
        console.warn("Elemen container untuk tabel bahan baku tidak ditemukan di DOM.");
        return; 
    }

    if (container) container.innerHTML = '';
    if (cardsContainer) cardsContainer.innerHTML = '';

    let htmlContentTable = ""; // Untuk menampung HTML format tabel cetak
    let htmlContentCards = ""; // Untuk menampung HTML format kartu mobile

    const daftarKategori = [
        { nama: "Bahan Kering", emoji: "🌾", warnaTeks: "#2c3e50", info: "(Rasio % dari Terigu)" },
        { nama: "Bahan Basah", emoji: "💧", warnaTeks: "#2980b9", info: "(Rasio % dari Terigu)" },
        { nama: "Bahan Pengembang", emoji: "☁️", warnaTeks: "#d35400", info: "(Rasio % dari Terigu)" },
        { nama: "Bahan Tambahan", emoji: "🧂", warnaTeks: "#7f8c8d", info: "(Rasio % dari Terigu)" },
        { nama: "Bahan Toping", emoji: "🍫", warnaTeks: "#8e44ad", info: "(gr Netto per 1 Pcs)" },
        { nama: "Kemasan", emoji: "📦", warnaTeks: "#27ae60", info: "(Kebutuhan unit per 1 Pcs)" }
    ];

    let totalBahanDitambahkan = 0;

    daftarKategori.forEach(kat => {
        // Filter bahan berdasarkan kategori masing-masing
        const items = bakeryIngredients.filter(x => {
            if (x.category) return x.category === kat.nama;
            if (kat.nama === "Bahan Toping") return x.type === "Topping";
            if (kat.nama === "Bahan Kering") return x.type === "Dough";
            return false;
        });

        if (items.length > 0) {
            totalBahanDitambahkan += items.length;
            const apakahTerbuka = window.statusKategoriResep[kat.nama];
            const indikatorPanah = apakahTerbuka ? "🔽" : "▶️";

            // 1. BUAT HEADER UNTUK FORMAT TABEL CETAK PDF
            htmlContentTable += `
                <tr style="background: #f1f5f9;">
                    <td colspan="6" style="text-align: left; font-weight: 700; color: ${kat.warnaTeks}; padding: 6px; font-size: 11px;">
                        ${kat.nama.toUpperCase()}
                    </td>
                </tr>
            `;

            // 2. BUAT HEADER SEPARATOR UNTUK FORMAT KARTU MOBILE
            htmlContentCards += `
                <div  data-onclick="toggleCollapseKategori('${kat.nama}')" style="background: #e2e8f0; cursor: pointer; user-select: none; padding: 6px 10px; border-radius: 6px; font-weight: 700; font-size: 0.72rem; color: ${kat.warnaTeks}; display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <span>${indikatorPanah} ${kat.emoji} ${kat.nama.toUpperCase()} <small style="font-weight:500; color:#64748b; font-size:0.6rem;">${kat.info}</small></span>
                    <span style="background: #fff; padding: 1px 6px; border-radius: 10px; font-size: 0.65rem;">${items.length} item</span>
                </div>
            `;
            
            // JIKA STATUSNYA TERBUKA (TRUE), MAKA ISIKAN DATA BAHANNYA
            if (apakahTerbuka) {
                items.forEach(ing => {
                    let unitSymbol = "%";
                    if (ing.category === "Bahan Toping") unitSymbol = "g";
                    if (ing.category === "Kemasan") unitSymbol = "pc";

                    // ISI TABEL TRADISIONAL (Untuk Ekspor PDF)
                    htmlContentTable += `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="text-align: left; padding: 5px;">${ing.name}</td>
                            <td>${ing.ratio}${unitSymbol}</td>
                            <td><span id="gross-table-${ing.id}">0</span>g</td>
                            <td>Rp ${ing.price.toLocaleString('id-ID')}</td>
                            <td>${ing.pack}g</td>
                            <td style="text-align: right; padding-right: 5px;">Rp <span id="cost-table-${ing.id}">0</span></td>
                        </tr>
                    `;

                    // ISI SEBAGAI KARTU MODERN SECARA DINAMIS (Tampilan Nyata Layar HP)
                    // Mencari index asli bahan untuk parameter fungsi hapus
                    const indexAsli = bakeryIngredients.findIndex(b => b.id === ing.id);

                    htmlContentCards += `
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); position: relative;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                                <span style="font-weight: 700; font-size: 0.8rem; color: var(--chocolate);">${ing.name}</span>
                                ${ing.isFlour ? '<span style="font-size:0.65rem; font-weight:700; color:#3498db;">🔑 Utama</span>' : 
                                `<button type="button"  data-onclick="window.hapusBahanBakeryDinamis(${indexAsli})" style="background: #fee2e2; color: #ef4444; border: none; padding: 3px 8px; font-weight: bold; border-radius: 6px; font-size: 0.68rem; cursor: pointer;">Hapus</button>`}
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1.2fr 1.2fr; gap: 6px; align-items: center;">
                                <div>
                                    <label for="ing-${ing.id}-ratio" style="display:block; font-size:0.6rem; color:#94a3b8; font-weight:600;">TAKARAN</label>
                                    <div style="display:flex; align-items:center; gap:2px;">
                                        <input type="number" 
                                                id="ing-${ing.id}-ratio" 
                                                name="ing_${ing.id}_ratio" 
                                                value="${ing.ratio}" 
                                                step="1" 
                                                 data-oninput="perbaruiKomponenBahan('${ing.id}', 'ratio', this.value)" 
                                                style="width:40px; font-size:0.75rem; text-align:center; font-weight:700; border:1px solid #cbd5e1; border-radius:4px; padding:1px 0;" 
                                                ${ing.isFlour ? 'disabled' : ''}>
                                        <span style="font-size:0.7rem; font-weight:600; color:#64748b;">${unitSymbol}</span>
                                    </div>
                                </div>
                                <div>
                                    <label for="ing-${ing.id}-price" style="display:block; font-size:0.6rem; color:#94a3b8; font-weight:600;">HARGA BELI</label>
                                    <div style="display:flex; align-items:center; gap:2px; font-size:0.75rem;">
                                        <span style="color:#64748b; font-weight:600;">Rp</span>
                                        <input type="number" 
                                                id="ing-${ing.id}-price" 
                                                name="ing_${ing.id}_price" 
                                                value="${ing.price}" 
                                                 data-oninput="perbaruiKomponenBahan('${ing.id}', 'price', this.value)" 
                                                style="width:55px; font-size:0.75rem; text-align:center; border:1px solid #cbd5e1; border-radius:4px; padding:1px 0; font-weight:600;">
                                    </div>
                                </div>
                                <div>
                                    <label for="ing-${ing.id}-pack" style="display:block; font-size:0.6rem; color:#94a3b8; font-weight:600;">ISI PACK (g)</label>
                                    <input type="number" 
                                            id="ing-${ing.id}-pack" 
                                            name="ing_${ing.id}_pack" 
                                            value="${ing.pack}" 
                                             data-oninput="perbaruiKomponenBahan('${ing.id}', 'pack', this.value)" 
                                            style="width:55px; font-size:0.75rem; text-align:center; border:1px solid #cbd5e1; border-radius:4px; padding:1px 0; font-weight:600;">
                                </div>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; margin-top: 2px;">
                                <span style="color: #64748b;">Berat Pakai: <b style="color:var(--chocolate)"><span id="gross-${ing.id}">0</span>g</b></span>
                                <span style="color: #475569; font-weight: 700;">Biaya: <span style="color:#b91c1c;">Rp <span id="cost-${ing.id}">0</span></span></span>
                            </div>
                        </div>
                    `;
                });
            }
        }
    });

    // Masukkan hasil kompilasi string HTML ke wadahnya masing-masing
    if (tbody) tbody.innerHTML = htmlContentTable;

    if (cardsContainer) {
        if (totalBahanDitambahkan === 0) {
            cardsContainer.innerHTML = `
            <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; text-align: center; padding: 25px; color: #64748b;">
                <p style="margin: 0 0 8px 0; font-size: 0.85rem; font-weight: 500;">Belum ada bahan baku yang ditambahkan.</p>
                <button type="button" onclick="document.getElementById('form-tambah-bahan').open = true; document.getElementById('new-ing-name').focus();" style="background: #E67E22; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">+ Tambah Bahan Pertama</button>
            </div>
        `;
        } else {
            cardsContainer.innerHTML = htmlContentCards;
        }
    }
    
    // Jalankan kalkulasi angka berat & rupiah pasca render agar tidak blank 0
    if (typeof hitungHPPBakeryTotal === 'function') {
        hitungHPPBakeryTotal();
    }
}

function tampilkanErrorBahan(pesan) {
    const errorEl = document.getElementById('new-ing-error');
    if (!errorEl) {
        if (pesan) alert(pesan);
        return;
    }
    if (!pesan) {
        errorEl.style.display = "none";
        errorEl.innerText = "";
        return;
    }
    errorEl.innerText = "⚠️ " + pesan;
    errorEl.style.display = 'block';
    }

function renderIngredientsTable() {
    const tableBody = document.getElementById('recipe-ingredients-body');
    const cardsContainer = document.getElementById('recipe-cards-container');
    
    if (!tableBody || !cardsContainer) return;

    tableBody.innerHTML = '';
    cardsContainer.innerHTML = '';

    if (bakeryIngredients.length === 0) {
        cardsContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; font-size: 0.75rem; padding: 20px; background: #fff; border-radius: 8px; border: 1px dashed #cbd5e1;">Belum ada bahan baku yang ditambahkan.</div>`;
        return;
    }

    bakeryIngredients.forEach((item, index) => {
        // 1. RENDER FORMAT TABEL (Untuk Kebutuhan Cetak PDF Tersembunyi)
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #e2e8f0";
        tr.innerHTML = `
            <td style="text-align: left; padding: 6px;">${item.name} <br><small style="color:#94a3b8">${item.type}</small></td>
            <td>${item.ratio}%</td>
            <td>${item.weight} gr</td>
            <td>Rp ${item.price}</td>
            <td>${item.pack} gr</td>
            <td>Rp ${Math.round(item.cost)}</td>
        `;
        tableBody.appendChild(tr);

        // 2. RENDER FORMAT KARTU MOBILE (Sangat Nyaman Dilihat & Diinput di HP)
        const card = document.createElement('div');
        card.style.cssText = "background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); position: relative;";
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 2px;">
                <div>
                    <span style="font-weight: 700; font-size: 0.85rem; color: var(--chocolate);">${item.name}</span>
                    <span style="font-size: 0.65rem; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; margin-left: 4px; color: #64748b;">${item.type}</span>
                </div>
                <button type="button"  data-onclick="hapusBahanBakeryDinamis(${index})" style="background: #fee2e2; color: #ef4444; border: none; padding: 4px 8px; font-weight: bold; border-radius: 6px; font-size: 0.7rem; cursor: pointer;">Hapus</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); font-size: 0.72rem; color: #475569; gap: 4px;">
                <div><b>Rasio:</b> ${item.ratio}%</div>
                <div><b>Berat:</b> ${item.weight}g</div>
                <div style="text-align: right; color: #b91c1c; font-weight: 700;">Biaya: Rp${Math.round(item.cost)}</div>
            </div>
        `;
        cardsContainer.appendChild(card);
    });
}

function syncInventoryWithProfile() {
    // 1. Ambil bahan aktif dari state kalkulator resep
    const currentIngredients = window.bakeryIngredients || [];
    
    // 2. Petakan ke format inventaris bahan baku
    const inventoryData = currentIngredients.map(item => ({
        nama: item.name || item.nama || 'Bahan Baku',
        stok: item.pack || item.quantity || 0,
        satuan: item.packUnit || 'g',
        kategori: item.category || 'Bahan Keras'
    }));

    // 3. Simpan ke penyimpanan lokal agar persisten di halaman profil
    localStorage.setItem('bakery_inventory_cache', JSON.stringify(inventoryData));

    // 4. Perbarui tampilan baris inventaris di modal profil secara real-time
    if (typeof renderInventoryCards === 'function') {
        renderInventoryCards();
    }
}

// ==========================================
// SENSOR BLUETOOTH (TERMOMETER)
// =========================================
async function connectEnvironmentalSensor() {
    const statusEl = document.getElementById('ble-status');
    
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BluetoothLe) {
        try {
            const BleClient = window.Capacitor.Plugins.BluetoothLe;
            
            statusEl.innerText = "Status: Mencari perangkat (Native)...";
            await BleClient.initialize();
            
            const device = await BleClient.requestDevice({
                services: [ENVIRONMENTAL_SENSING_SERVICE]
            });
            
            statusEl.innerText = "Status: Menghubungkan (Native)...";
            await BleClient.connect({ deviceId: device.deviceId }, (disconnectDeviceId) => {
                onDisconnected();
            });

            statusEl.innerText = "Status: Terhubung (Native)";

            await BleClient.startNotifications({
                deviceId: device.deviceId,
                service: ENVIRONMENTAL_SENSING_SERVICE,
                characteristic: TEMPERATURE_CHARACTERISTIC
            }, (value) => {
                let dataView = new DataView(new Uint8Array(atob(value.value).split("").map(c => c.charCodeAt(0))).buffer);
                currentTemp = dataView.getInt16(0, true) / 100;
                updateSensorUI('temp-val', currentTemp.toFixed(1) + " °C");
            });

            try {
                await BleClient.startNotifications({
                    deviceId: device.deviceId,
                    service: ENVIRONMENTAL_SENSING_SERVICE,
                    characteristic: HUMIDITY_CHARACTERISTIC
                }, (value) => {
                    let dataView = new DataView(new Uint8Array(atob(value.value).split("").map(c => c.charCodeAt(0))).buffer);
                    currentHum = dataView.getUint16(0, true) / 100;
                    updateSensorUI('hum-val', currentHum.toFixed(1) + " %");
                });
            } catch (e) {
                console.warn("Sensor ini tidak mendukung kelembaban pada mode native.");
            }

        } catch (error) {
            statusEl.innerText = "Status: Gagal - " + error.message;
            console.error("Gagal koneksi BLE via Capacitor:", error);
        }
        
    } else if (navigator.bluetooth) {
        try {
            statusEl.innerText = "Status: Mencari perangkat (Web)...";
            
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['environmental_sensing'] }] 
            });

            bleDevice = device;
            device.addEventListener('gattserverdisconnected', onDisconnected);

            statusEl.innerText = "Status: Menghubungkan (Web)...";
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('environmental_sensing');
            
            const tempChar = await service.getCharacteristic('temperature');
            await tempChar.startNotifications();
            tempChar.addEventListener('characteristicvaluechanged', (e) => {
                currentTemp = e.target.value.getInt16(0, true) / 100;
                updateSensorUI('temp-val', currentTemp.toFixed(1) + " °C");
            });

            try {
                const humChar = await service.getCharacteristic('humidity');
                await humChar.startNotifications();
                humChar.addEventListener('characteristicvaluechanged', (e) => {
                    currentHum = e.target.value.getUint16(0, true) / 100;
                    updateSensorUI('hum-val', currentHum.toFixed(1) + " %");
                });
            } catch (e) {
                console.warn("Sensor ini tidak mendukung kelembaban.");
            }

            statusEl.innerText = "Status: Terhubung (Web)";
        } catch (error) {
            statusEl.innerText = "Status: Gagal - " + error.message;
        }
    } else {
        statusEl.innerText = "Status: Bluetooth tidak didukung";
        alert("Bluetooth tidak didukung di perangkat/platform ini.");
    }
}

function updateSensorUI(elementId, valueText) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = valueText;
    
    if (typeof processWeatherData === "function") {
        processWeatherData(currentTemp, currentHum);
    }
    if (typeof tampilkanSapaanAwalAI === "function") {
        tampilkanSapaanAwalAI();
    }
}

function onDisconnected() {
    const statusEl = document.getElementById('ble-status');
    if (statusEl) statusEl.innerText = "Status: Terputus (Periksa Sensor)";
    window.DEBUG && console.log("Perangkat Bluetooth terputus!");
}

// ==========================================
// FUNGSI MENGELOLA KONEKSI BLUETOOTH (MULTI-DEVICE)
// ==========================================
async function putuskanSensorBluetooth(idPerangkat) {
    // 1. Jika dipanggil dengan parameter idPerangkat (Multi-sensor)
    if (idPerangkat) {
        try {
            if (typeof koneksiGATT !== 'undefined' && koneksiGATT[idPerangkat] && koneksiGATT[idPerangkat].gatt && koneksiGATT[idPerangkat].gatt.connected) {
                await koneksiGATT[idPerangkat].gatt.disconnect();
            }
        } catch (e) {
            console.error("Gagal disconnect GATT perangkat " + idPerangkat, e);
        }
        
        if (typeof handlerSensorTerputus === 'function') {
            handlerSensorTerputus(idPerangkat);
        }
        return;
    }

    // 2. Jika dipanggil tanpa parameter (Perangkat Utama / Web Bluetooth / Capacitor)
    const statusEl = document.getElementById('ble-status');
    const labelRuang = document.getElementById('sensor-ruang-status');
    
    try {
        // A. Jika menggunakan Capacitor (Native Mobile)
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BluetoothLe) {
            const BleClient = window.Capacitor.Plugins.BluetoothLe;
            if (window.activeBleDeviceId) {
                await BleClient.disconnect({ deviceId: window.activeBleDeviceId });
                window.activeBleDeviceId = null;
            }
        } 
        // B. Jika menggunakan Web Bluetooth (Browser / PWA)
        else if (typeof bleDevice !== 'undefined' && bleDevice && bleDevice.gatt.connected) {
            await bleDevice.gatt.disconnect();
            bleDevice = null;
        }

        // Perbarui Tampilan Status UI
        if (statusEl) statusEl.innerText = "Status: Terputus Manual";
        if (labelRuang) {
            labelRuang.innerText = "⚫ Sensor Ruangan (Terputus)";
            labelRuang.style.color = "#999";
        }
        
        if (typeof NotifSystem !== 'undefined') {
            NotifSystem.tambah('sistem', 'Sensor Diputus', 'Koneksi perangkat sensor Bluetooth berhasil dihentikan.', '🔌');
        } else {
            alert("Sensor Bluetooth berhasil diputus.");
        }

    } catch (error) {
        console.error("Gagal memutuskan perangkat Bluetooth:", error);
        alert("Gagal memutuskan perangkat: " + error.message);
    }
}

// Daftarkan ke window agar dapat diakses secara global
window.putuskanSensorBluetooth = putuskanSensorBluetooth;

// Fungsi untuk menganalisis suhu dan memberikan rekomendasi ragi/proofing
function analisisKondisiSuhu(suhuTeks) {
    // Ambil angka suhunya saja (misal "30°C" -> 30)
    const suhu = parseFloat(suhuTeks);
    
    if (isNaN(suhu)) {
        return "Siapkan bahan-bahan Anda, kami akan memantau waktu proofing ideal begitu suhu terdeteksi.";
    }
    
    if (suhu >= 28 && suhu <= 32) {
        return "Suhu ruangan Anda <strong>sangat ideal</strong> untuk fermentasi! Ragi akan aktif dengan optimal. Waktu proofing kemungkinan besar akan berjalan sesuai standar.";
    } else if (suhu > 32) {
        return "Kondisi ruangan cukup <strong>panas</strong>. Adonan akan mengembang lebih cepat (over-proofing), pantau timer Anda dengan ketat atau kurangi sedikit porsi ragi/es batu.";
    } else {
        return "Suhu ruangan cenderung <strong>dingin</strong>. Proses fermentasi mungkin berjalan lebih lambat (under-proofing). Disarankan menggunakan air hangat kuku atau menambah waktu proofing.";
    }
}

// ==========================================
// FUNGSI NOTIFIKASI
// ==========================================
function closeNotifModal() {
    const modal = document.getElementById('notif-modal');
    if (!modal) return;

    // Lepaskan fokus dari elemen aktif di dalam modal
    if (document.activeElement && modal.contains(document.activeElement)) {
        document.activeElement.blur();
    }
    
    // Hilangkan class aktif untuk memicu animasi CSS close
    modal.classList.remove('active');
    document.body.style.overflow = '';

    // Sembunyikan modal secara total setelah animasi/delay singkat
    setTimeout(() => {
        modal.style.display = 'none'; // Fallback aman
        modal.setAttribute('inert', '');
        modal.setAttribute('aria-hidden', 'true');
    }, 50);
}

// Fungsi global yang dipanggil dari HTML — harus di-assign ke window karena berada di dalam <script type="module">
function filterNotif(kat, btn) { 
    if (typeof NotifSystem !== 'undefined') {
        NotifSystem.filter(kat, btn); 
    }
}

function bacaSemua() { 
    if (typeof NotifSystem !== 'undefined') {
        NotifSystem.bacaSemua(); 
    }
}

// Fungsi untuk memicu/menambah notifikasi baru ke dalam daftar
function tambahNotifikasi(pesan, kategori, icon) {
    // Ambil kontainer list berdasarkan ID sesuai HTML Anda
    const targetBox = document.getElementById('notif-list-container');
    
    if (!targetBox) return;

    // Sembunyikan pesan kosong jika ada notifikasi baru masuk
    const emptyMsg = document.getElementById('notif-empty-msg');
    if (emptyMsg) emptyMsg.style.display = 'none';

    const waktuNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    // Buat ID unik berbasis timestamp
    const notifId = Date.now() + Math.floor(Math.random() * 1000);
    
    const notifHTML = `
        <div class="notif-item ${kategori}" id="notif-${notifId}" data-type="${kategori}" style="padding: 12px 14px; border-bottom: 1px solid rgba(78,52,46,0.08); display: flex; gap: 10px; align-items: center; position: relative;">
            <div style="font-size: 1.2rem; flex-shrink:0;">${icon}</div>
            <div style="flex-grow: 1; padding-right: 20px;">
                <p style="margin: 0; font-size: 0.85rem; color: #4E342E; font-weight: 500;">${pesan}</p>
                <span style="font-size: 0.72rem; color: #8d6e63;">Hari ini, ${waktuNow}</span>
            </div>
            <button class="btn-hapus-notif-cepat" data-id="${notifId}" title="Hapus"
                style="background:none; border:none; font-size:0.9rem; color:#bbb; cursor:pointer; padding:4px; align-self:flex-start; flex-shrink:0; line-height:1; position:absolute; right:8px; top:12px; transition: color 0.2s;"
                 data-onmouseover="this.style.color='#e74c3c'"  data-onmouseout="this.style.color='#bbb'">✕</button>
        </div>
    `;
    
    targetBox.insertAdjacentHTML('afterbegin', notifHTML);
}

// REKATKAN FUNGSI IZIN NOTIFIKASI DI SINI (DI DALAM MODUL)
async function requestNotificationPermission() {
    try {
        // Langsung minta izin tanpa cek checkPermissions untuk menghindari error method tidak ditemukan
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
            const { LocalNotifications } = window.Capacitor.Plugins;
            
            const permission = await LocalNotifications.requestPermissions();
            if (permission.display === 'granted') {
                console.log('Izin notifikasi diberikan.');
                return true;
            } else {
                console.warn('Izin notifikasi ditolak oleh pengguna.');
                return false;
            }
        } else if (typeof LocalNotifications !== 'undefined') {
            // Jika menggunakan modul ES6 / import biasa
            const permission = await LocalNotifications.requestPermissions();
            return permission.display === 'granted';
        } else {
            console.warn('Plugin LocalNotifications tidak tersedia di lingkungan ini.');
            return false;
        }
    } catch (error) {
        console.error('Gagal meminta izin notifikasi Capacitor:', error);
        return false;
    }
}

// Jalankan fungsi penyaringan aktual terhadap daftar list notifikasi Anda
function filterNotificationElements(category) {
    // Cari elemen pembungkus list/item notifikasi Anda (sesuaikan dengan class/id asli Anda)
    const notifItems = document.querySelectorAll('.notif-item'); 
    
    if (notifItems.length === 0) return; // Lewati jika elemen tidak ditemukan
    
    notifItems.forEach(item => {
        if (category === 'semua') {
            item.style.display = ''; // Tampilkan semua
        } else {
            // Jika item notifikasi memiliki class atau data yang cocok dengan kategori
            if (item.classList.contains(category) || item.getAttribute('data-type') === category) {
                item.style.display = '';
            } else {
                item.style.display = 'none'; // Sembunyikan yang tidak cocok
            }
        }
    });
}

// 2. Fungsi untuk mengirim pesan yang aman
function kirimPesanKeSW(lat, lon) {
    if (!('serviceWorker' in navigator)) {
        // Native Capacitor atau browser/WebView lama tanpa dukungan Service Worker
        window.DEBUG && console.log('Service Worker tidak tersedia di lingkungan ini, lewati kirim pesan cuaca via SW.');
        return;
    }
    if (navigator.serviceWorker.controller) {
        // Jika sudah ada controller, langsung kirim
        navigator.serviceWorker.controller.postMessage({
            action: 'fetchWeather',
            lat: lat,
            lon: lon
        });
    } else {
        // Jika belum, tunggu sampai Service Worker siap
        navigator.serviceWorker.ready.then((registration) => {
            if (registration.active) {
                registration.active.postMessage({
                    action: 'fetchWeather',
                    lat: lat,
                    lon: lon
                });
            }
        });
    }
}

// ------------------------------------------------------------
// ASISTEN AI & INSIGHT BISNIS
// ------------------------------------------------------------
// Fungsi utama sapaan AI
function tampilkanSapaanAwalAI() {
    const sekarang = new Date();
    const jam = sekarang.getHours();
    let waktuSapaan = "Selamat Malam";

    if (jam >= 5 && jam < 11) {
        waktuSapaan = "Selamat Pagi";
    } else if (jam >= 11 && jam < 15) {
        waktuSapaan = "Selamat Siang";
    } else if (jam >= 15 && jam < 18) {
        waktuSapaan = "Selamat Sore";
    }

    const formatJam = String(sekarang.getHours()).padStart(2, '0') + ':' + String(sekarang.getMinutes()).padStart(2, '0');

    // Mengambil elemen HTML cuaca & suhu
    const elemenSuhu = document.getElementById('temp-val')?.innerText || '--';
    const elemenCuaca = document.getElementById('shrunk-weather-text')?.innerText || 'Mendeteksi Cuaca';
    
    const aiInsightBox = document.getElementById('ai-insight');
    const aiAnalysisWrapper = document.getElementById('ai-analysis-body');

    if (elemenSuhu === '--' || elemenSuhu.includes('--') || elemenSuhu === '') {
        window.DEBUG && console.log("Analisis AI ditangguhkan: Menunggu sinkronisasi GPS/Sensor.");
        return; 
    }

    const infoSuhuCuaca = `Saat ini jam menunjukkan pukul <strong>${formatJam} WIB</strong>. Kondisi di sekitar lokasi Anda terpantau <strong>${elemenCuaca}</strong> dengan suhu sekitar <strong>${elemenSuhu}</strong>.`;
    const rekomendasiAI = analisisKondisiSuhu(elemenSuhu);

    // Teks narasi (Memperbaiki bug tanda bintang menjadi tag strong)
    const pesanNarasi = `
        👋 <strong>${waktuSapaan}, Chef!</strong><br><br>
        ${infoSuhuCuaca}<br><br>
        💡 <strong>Analisis AI:</strong> ${rekomendasiAI}<br><br>
        Nah, <strong>hari ini kita mau membuat adonan apa?</strong> 🍩🥖<br>
        Silakan pilih mode <strong>Proofing</strong> (Initial/Rounding/Final) di bawah atau siapkan formula Anda di tab Resep!
    `;

    if (aiInsightBox) {
        aiInsightBox.innerHTML = pesanNarasi;
        if (aiAnalysisWrapper) {
            aiAnalysisWrapper.style.display = 'block';
            if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';
        }
    }
}

// =================================================================================
// FUNGSI AI AGENT - ANALISIS ADONAN
// =================================================================================
function performAIAnalysis(temp, humidity) {
    const insightEl = document.getElementById('ai-insight');
    const recEl = document.getElementById('ai-recommendation');
    if (!insightEl || !recEl) return;

    let insight = "";
    let action = "";
    let recommendation = "";

    if (temp < 22) {
        insight = `Suhu ${temp}°C tergolong dingin. Ragi akan bekerja lambat.`;
        action = "Adonan membutuhkan waktu lebih lama untuk mengembang dengan baik.";
        recommendation = "💡 Rekomendasi: Gunakan air hangat untuk melarutkan ragi.";
    } else if (temp >= 22 && temp <= 28) {
        insight = `Suhu ${temp}°C adalah suhu ideal untuk proofing adonan donat.`;
        action = "Kondisi sangat stabil untuk fermentasi ragi.";
        recommendation = "<br>✅ Kondisi sempurna, ikuti durasi standar proofing.";
    } else {
        insight = `Suhu ${temp}°C cukup panas. Ragi akan bekerja sangat cepat. Kelembaban ${humidity}% Cukup untuk mencegah permukaan adonan mengering, namun perlu pengawasan agar tidak membentuk "kulit" tebal.`;
        action = `Risiko over-proofing sangat tinggi jika tidak dipantau. Karena kelembapan ${humidity}%, sangat disarankan untuk menutup adonan dengan kain lembap atau plastik (plastic wrap) agar bagian atas adonan tidak mengalami crusting (pengerasan kulit) yang bisa menyebabkan permukaan donat pecah saat digoreng.`;
        recommendation = "⚠️ Rekomendasi: Awasi dengan ketat setiap 15 menit, jangan sampai adonan terlalu mengembang.";
    }

    if (humidity > 70) {
        insight += " Kelembaban tinggi dapat membuat adonan lengket.";
        action += " Taburi sedikit tepung saat membentuk adonan untuk mencegah lengket.";
        recommendation += "<br>💡 Rekomendasi: Taburi sedikit tepung saat membentuk donat.";
    }
    insightEl.innerHTML = `<strong>Insight:</strong> ${insight}<br><br><strong>Action:</strong> ${action}`;
    recEl.innerHTML = `<strong>Rekomendasi:</strong> ${recommendation}`;
}

// FUNGSI ANALISIS AI TIMER COUNTDOWN
// Fungsi pembantu untuk menentukan URL endpoint backend secara aman
function resolveApiUrl(path) {
    if (typeof window.getVercelApiUrl === 'function') {
        return window.getVercelApiUrl(path);
    }
    // Fallback otomatis jika helper global belum tersedia
    const isLocal = window.location.hostname === 'localhost' || window.location.protocol === 'file:';
    const base = isLocal ? 'https://timer-proofer.vercel.app' : '';
    return base + path;
}

async function toggleAI() {
    // Ambil elemen sensor berdasarkan ID aktual di HTML Anda (sesuaikan ID-nya jika berbeda)
const elSuhu = document.getElementById('suhu-sekarang') || document.getElementById('status-text-ruang') || document.getElementById('temp-val');
const elKelembapan = document.getElementById('kelembapan-sekarang') || document.getElementById('humidity-val');
const elWaktu = document.getElementById('input-waktu-proofing') || document.getElementById('waktu-val');
const elKeterangan = document.getElementById('input-keterangan-adonan');

// Ekstraksi nilai angka secara dinamis dari teks elemen
let nilaiSuhu = 28;
if (elSuhu) {
    let matchSuhu = elSuhu.innerText.match(/[\d.]+/);
    if (matchSuhu) nilaiSuhu = parseFloat(matchSuhu[0]);
}

let nilaiKelembapan = 75;
if (elKelembapan) {
    let matchKelembapan = elKelembapan.innerText.match(/[\d.]+/);
    if (matchKelembapan) nilaiKelembapan = parseFloat(matchKelembapan[0]);
}

    let nilaiWaktu = elWaktu ? (elWaktu.value || elWaktu.innerText) : '45 menit';
    let nilaiKeterangan = elKeterangan ? elKeterangan.value : 'Permukaan adonan mulai mengendur';

    const btnAi = document.getElementById('btn-ai-trigger');
    if (btnAi) {
        btnAi.innerText = "Menganalisis...";
        btnAi.disabled = true;
    }

    try {
        const payloadData = {
            promptContext: `Analisis fermentasi adonan dengan suhu ${nilaiSuhu}°C, durasi ${nilaiWaktu}, catatan: ${nilaiKeterangan}`,
            suhuRuang: nilaiSuhu,
            temperature: nilaiSuhu,
            waktuProofing: nilaiWaktu,
            time: nilaiWaktu,
            keterangan: nilaiKeterangan,
            note: nilaiKeterangan
        };

        const response = await fetch(resolveApiUrl('/api/ai-telemetry'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payloadData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server menolak (Status ${response.status}): ${errorText}`);
        }

        const result = await response.json();
        tampilkanHasilAnalisisAI(result);

    } catch (error) {
        console.error("Gagal melakukan analisis AI:", error);
        
        // Tampilkan error secara elegan di UI alih-alih menggunakan alert() yang mengganggu
        tampilkanHasilAnalisisAI({
            analisis: `⚠️ Gagal memuat analisis AI dari server.<br><small style="color: #c0392b;">Detail: ${error.message}</small><br><br>💡 <em>Tips: Pastikan koneksi internet stabil atau periksa konfigurasi backend Anda.</em>`
        });

    } finally {
        if (btnAi) {
            btnAi.innerText = "Analisis AI";
            btnAi.disabled = false;
        }
    }
}

// Fungsi pembantu untuk menampilkan hasil dari backend
function tampilkanHasilAnalisisAI(data) {
    const containerHasil = document.getElementById('ai-result-container');
    
    let targetContainer = containerHasil;
    if (!targetContainer) {
        const judulAnalisis = Array.from(document.querySelectorAll('h3, div')).find(el => el.innerText && el.innerText.includes('Analisis Kondisi Adonan'));
        targetContainer = document.createElement('div');
        targetContainer.id = 'ai-result-container';
        targetContainer.style.cssText = "margin-top: 15px; padding: 15px; background: #fdf8f4; border: 1px solid rgba(78,52,46,0.1); border-radius: 8px; font-size: 0.85rem; color: var(--chocolate, #4E342E); line-height: 1.5;";
        
        if (judulAnalisis && judulAnalisis.parentNode) {
            judulAnalisis.parentNode.insertBefore(targetContainer, judulAnalisis.nextSibling);
        } else {
            document.body.appendChild(targetContainer);
        }
    }

    let teksHasil = "";
    if (typeof data === 'string') {
        teksHasil = data;
    } else if (data) {
        teksHasil = data.analisis || data.message || data.result || data.text || data.response || JSON.stringify(data, null, 2);
    }

    targetContainer.innerHTML = `<div style="font-weight: bold; margin-bottom: 5px; color: var(--accent);">💡 Hasil Analisis AI:</div><div>${teksHasil.replace(/\n/g, '<br>')}</div>`;
}

// =================================================================================
// ANALISIS AI PADA ANALISIS KONDISI ADONAN
// =================================================================================
async function muatAnalisisAI(contextData) {
    try {
        const response = await fetch('/api/ai-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptContext: contextData })
        });
        const data = await response.json();

        if (response.ok) {
            // Masukkan hasil teks dari AI ke elemen HTML penampung
            document.getElementById('container-analisis-adonan').innerText = data.result;
        } else {
            console.error("Gagal memuat analisis:", data.error);
        }
    } catch (err) {
        console.error("Kesalahan jaringan:", err);
    }
}

// =================================================================================
// ANALISIS AI SUNGGUHAN (Gemini via /api/ai-analyze) - dipanggil on-demand
// lewat tombol "Analisis AI Mendalam (Live)", BUKAN otomatis tiap ketikan
// seperti window.jalankanAnalisisAIAgent (yang murni rule-based & instan).
// Kalau gagal/timeout/offline, fallback ke ringkasan lokal berbasis rule
// yang sama supaya fitur tetap jalan di app native tanpa koneksi.
// =================================================================================
async function mintaAnalisisAISungguhan() {
    const btn = document.getElementById('btn-ai-live-analysis');
    const resultContainer = document.getElementById('ai-live-result');
    const prevText = btn ? btn.innerText : '🤖 Analisis AI Mendalam (Live)';

    if (!resultContainer) return;

    if (btn) {
        btn.innerText = "⏳ AI Agent Menganalisis...";
        btn.disabled = true;
    }
    resultContainer.style.display = "block";
    resultContainer.innerHTML = "<div style='font-size:0.8rem; color:#6c3483; text-align:center;'><i class='fas fa-spinner fa-spin'></i> Mengkalkulasi rasio bahan dan efisiensi...</div>";

    try {
        const hppGabungan = document.getElementById('sum-hpp-gabungan')?.innerText || "Rp 0";
        const marginProfit = document.getElementById('sum-profit-margin')?.innerText || "0%";
        const fcPersen = document.getElementById('food-cost-percent')?.innerText || "0%";
        const beratPerPcs = document.getElementById('sum-weight-pcs')?.innerText || "0";

        const daftarBahan = (window.bakeryIngredients || []).map(b => 
            `- ${b.name} (${b.category}): ${b.ratio}%, Berat: ${b.weight}g, Cost: Rp${Math.round(b.cost)}`
        ).join('\n');

        const daftarLangkah = (window.activeRecipeSteps || []).map((l, i) => 
            `${i + 1}. ${l}`
        ).join('\n');

        // Prompt dimodifikasi agar AI lebih disiplin menggunakan paragraf dan list
        const aiPrompt = `
Bertindaklah sebagai Konsultan Artisan Bakery. Analisis resep ini:

[METRIK FINANSIAL & FISIK]
HPP per Pcs: ${hppGabungan} | Profit Margin: ${marginProfit} | Food Cost: ${fcPersen} | Berat Adonan per Pcs: ${beratPerPcs}g

[KOMPOSISI BAHAN]
${daftarBahan || "Belum ada bahan."}

[METODOLOGI PROSES]
${daftarLangkah || "Belum ada langkah."}

Gunakan struktur ini:
🔬 Analisis Adonan & Komposisi
⚙️ Rekomendasi Optimalisasi Proses
📊 Ringkasan Kondisi Finansial
💰 Analisis Food Cost & Margin

ATURAN FORMAT: Gunakan paragraf naratif untuk penjelasan, gunakan sub-judul dengan titik dua (contoh: "Potensi Masalah:"), gunakan simbol (-) HANYA untuk list, dan angka (1.) HANYA untuk urutan langkah.`;

        const response = await fetch(resolveApiUrl('/api/ai-analyze'), { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptContext: aiPrompt }) 
        });

        if (!response.ok) throw new Error(`Server AI merespons dengan status ${response.status}`);
        const data = await response.json();
        
        // --- FUNGSI FORMATTING BARU (LEBIH CERDAS & RAPI) ---
        const formatHasilAI = (teks) => {
            if (!teks) return "Analisis tidak tersedia.";

            // 1. Perbaiki spasi bocor dari AI (misal simbol '-' lalu enter)
            let cleanText = teks.replace(/([\*\-\•])\s*\n\s*/g, '$1 ');

            // 2. Format Bold & Italic Bawaan Markdown
            cleanText = cleanText
                .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
                .replace(/_([^_\n]+)_/g, '<em>$1</em>');

            const lines = cleanText.split('\n');
            let htmlLines = [];

            lines.forEach(line => {
                let t = line.trim();
                // Abaikan baris kosong atau simbol nyasar
                if (!t || t === '•' || t === '-' || t === '*') return; 

                // A. Deteksi Judul Utama (Ada Emoji di awal atau pakai #) -> Jadi Title Case
                if (/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])\s*(.+)$/.test(t) || /^#\s/.test(t)) {
                    t = t.replace(/^#\s*/, '').toLowerCase();
                    htmlLines.push(`<div style="font-weight:900; margin:24px 0 12px 0; color:#4a235a; font-size:1.05rem; border-bottom:2px solid #e8daef; padding-bottom:6px; text-transform:capitalize; letter-spacing:0.3px;">${t}</div>`);
                }
                // B. Deteksi Sub-Judul (Berakhiran ":" atau pakai ##) -> Warna Biru
                else if (t.endsWith(':') || /^#{2,6}\s/.test(t)) {
                    t = t.replace(/^#{2,6}\s*/, '');
                    htmlLines.push(`<div style="font-weight:800; margin:16px 0 6px 0; color:#2980b9; font-size:0.95rem;">${t}</div>`);
                }
                // C. Deteksi List Angka (1. 2. 3.) -> Warna Oranye
                else if (/^(\d+)\.\s+(.+)/.test(t)) {
                    const match = t.match(/^(\d+)\.\s+(.+)/);
                    htmlLines.push(`<div style="padding-left:12px; margin-bottom:8px; display:flex; line-height:1.5; font-size:0.9rem;"><span style="margin-right:8px; font-weight:900; color:#d35400;">${match[1]}.</span><span>${match[2]}</span></div>`);
                }
                // D. Deteksi List Bullet (- atau *) -> Warna Oranye
                else if (/^[\*\-\•]\s+/.test(t)) {
                    t = t.replace(/^[\*\-\•]\s+/, '');
                    htmlLines.push(`<div style="padding-left:12px; margin-bottom:8px; display:flex; line-height:1.5; font-size:0.9rem;"><span style="margin-right:10px; color:#d35400; font-size:1.2rem; line-height:0.8;">•</span><span>${t}</span></div>`);
                }
                // E. Paragraf Biasa (Narasi)
                else {
                    htmlLines.push(`<div style="margin-bottom:10px; line-height:1.6; font-size:0.9rem; color:#444; text-align:justify;">${t}</div>`);
                }
            });

            return htmlLines.join('');
        };

        resultContainer.innerHTML = `
            <div style="font-weight:900; color:#6c3483; margin-bottom:10px; font-size:0.9rem; text-align:center; background:#f5eef8; padding:8px; border-radius:6px; letter-spacing:0.5px;">
                <i class="fas fa-robot"></i> LAPORAN ANALISIS AI
            </div>
            <div>${formatHasilAI(data.result)}</div>
        `;

    } catch (error) {
        resultContainer.innerHTML = `
            <div style="background:#fee2e2; border:1px solid #ef4444; padding:10px; border-radius:8px; color:#b91c1c; font-size:0.75rem;">
                ⚠️ Gagal memproses analisis AI: ${error.message}
            </div>`;
    } finally {
        if (btn) {
            btn.innerText = prevText;
            btn.disabled = false;
        }
    }
}

async function generateBusinessInsight(recipeData) {
    const insightBox = document.getElementById('biz-analysis-insight');
    const insightText = document.getElementById('biz-insight-text');

    insightBox.style.display = 'block';
    insightText.innerHTML = '<em><i class="fas fa-spinner fa-spin"></i> Menganalisis performa bisnis resep Anda...</em>';

    // CATATAN: Sebelumnya fungsi ini fetch ke '/api/donut-agent/analyze-finance',
    // sebuah endpoint yang TIDAK PERNAH ADA (tidak ada server.js/route Vercel
    // untuknya, tidak seperti /api/weather yang memang di-deploy). Akibatnya di
    // app native (base URL https://localhost) request ini selalu gagal, dan di
    // web pun akan selalu 404 lalu jatuh ke fallback lewat try/catch.
    //
    // Untuk sementara dipakai analisis lokal (heuristik) di bawah ini supaya
    // fitur benar-benar berfungsi & instan, termasuk saat offline di app native.
    //
    // Kalau nanti mau pakai AI beneran, buat serverless function baru (contoh
    // polanya lihat /api/weather.js + rewrite di vercel.json), deploy ke Vercel,
    // lalu ganti bagian di bawah ini dengan fetch ke URL PENUH-nya, misal:
    //   fetch('https://proofing-donat-2.vercel.app/api/donut-agent/analyze-finance', {...})
    // (bukan path relatif '/api/...', karena itu yang menyebabkan bug ini).

    const ratio = parseFloat(recipeData.ratio) || 0;
    const margin = parseFloat(recipeData.margin) || 0;
    let analysis;

    if (ratio > 35) {
        analysis = `Food cost "${recipeData.name}" ada di angka ${recipeData.ratio}% — cukup tinggi. Coba cari supplier alternatif untuk bahan termahal (misalnya cokelat/mentega) atau sesuaikan porsi supaya margin naik ke level yang lebih sehat.`;
    } else if (ratio > 0) {
        analysis = `Food cost "${recipeData.name}" ada di angka ${recipeData.ratio}% dengan margin ${recipeData.margin}% — sudah di rentang yang sehat. Pertahankan konsistensi kualitas bahan supaya harga jual tetap kompetitif.`;
    } else {
        analysis = `Belum cukup data untuk menghitung food cost "${recipeData.name}". Pastikan harga bahan dan harga jual per pcs sudah terisi.`;
    }

    insightText.innerText = analysis;
}

// ------------------------------------------------------------
// STATISTIK & PENCAPAIAN
// ------------------------------------------------------------
// FUNGSI UPDATE BAKERY STATISTIC - DI HALAMAN USER PROFILE
function setStat(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = Number.isFinite(value) ? value : 0;
}

function updateBakeryStatistics() {
    const recipes = ProfileService.getRecipes();
    const ingredients = ProfileService.getIngredients();
    const proofings = ProfileService.getProofings();
    const timers = ProfileService.getTimers();

    setStat('stat-recipes', recipes.length);
    setStat('stat-ingredients', ingredients.length);
    setStat('stat-proofing', proofings.length);
    setStat('stat-timers', timers.length);
}

async function waitForStatistics(timeout = 1500) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (Array.isArray(window.bakeryIngredients)) break;
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    updateBakeryStatistics();
}

// ==============================================
/**
 * Mengarahkan aksi sentuhan pada kartu statistik ke fitur yang sesuai
 * @param {string} jenis - Kategori kartu yang ditekan ('resep', 'bahan', 'proofing', 'timer')
 */
function bukaStatistikDetail(jenis) {
    // Berikan efek getar ringan (haptics) jika didukung perangkat seluler
    if (navigator.vibrate) {
        navigator.vibrate(15);
    }

    switch (jenis) {
        case 'resep':
            // 1. Menyentuh "Resep" -> Membuka daftar resep tersimpan
            if (typeof window.tampilkanDaftarResepTersimpan === 'function') {
                window.tampilkanDaftarResepTersimpan();
            } else {
                console.warn("Fungsi tampilkanDaftarResepTersimpan tidak ditemukan.");
            }
            break;

        case 'bahan':
            // 2. Menyentuh "Bahan" -> Membuka daftar bahan sesuai resep yang sedang dibuka
            // Kita arahkan ke tab Resep/Bahan & HPP yang ada di kalkulator resep
            if (typeof switchTab === 'function') {
                switchTab('recipe');
            }
            // Pastikan tab sub-menu bahan di dalam resep aktif
            if (typeof gantiTabMetode === 'function') {
                gantiTabMetode('bahan');
            }
            break;

        case 'proofing':
            // 3. Menyentuh "Proofing" -> Membuka modal profil atau riwayat proofing
            if (typeof toggleModal === 'function') {
                // Membuka modal profil pengguna di mana bagian riwayat proofing berada
                toggleModal('user-modal');
            }
            break;

        case 'timer':
            // 4. Menyentuh "Timer Log" -> Membuka riwayat timer log atau notifikasi
            if (typeof toggleModal === 'function') {
                // Membuka modal notifikasi / log timer
                toggleModal('notif-modal');
                if (typeof filterNotif === 'function') {
                    // Filter khusus kategori timer jika ada
                    const timerBtn = document.querySelector('.notif-tab-btn[data-onclick*="timer"]');
                    filterNotif('timer', timerBtn);
                }
            }
            break;

        default:
            console.log("Kategori statistik tidak dikenal:", jenis);
            break;
    }
}


// =========================================================
// SISTEM PROGRESSION & ACHIEVEMENT PENGGUNA
// =========================================================
// ==========================================
// 1. Fungsi Cek Pencapaian via Supabase
// ==========================================
async function checkRecipeAchievements(userId) {
    if (!userId) return;

    try {
        const { count: totalRecipes, error: countError } = await supabase
            .from('recipes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (countError) throw countError;

        const tiers = [
            { id: 'tier_1', threshold: 5, icon: '🥉', title: 'First Batch', desc: 'Membuat 5 Resep perdana!' },
            { id: 'tier_2', threshold: 25, icon: '🥈', title: 'Artisan Baker', desc: 'Membuat 25 Resep Donat!' },
            { id: 'tier_3', threshold: 50, icon: '🥇', title: 'Head Pastry Chef', desc: 'Mencapai 50 Resep!' },
            { id: 'tier_4', threshold: 100, icon: '👑', title: 'Master Baker', desc: 'Luar biasa! 100 Resep tercipta!' }
        ];

        const { data: existingAchievements, error: fetchError } = await supabase
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', userId);

        if (fetchError) throw fetchError;

        const unlockedIds = existingAchievements ? existingAchievements.map(a => a.achievement_id) : [];
        const newUnlocked = [];

        for (const tier of tiers) {
            if ((totalRecipes || 0) >= tier.threshold && !unlockedIds.includes(tier.id)) {
                
                const { error: insertError } = await supabase
                    .from('user_achievements')
                    .insert([{ user_id: userId, achievement_id: tier.id }]);

                if (insertError) {
                    console.error("Gagal menyimpan pencapaian:", insertError);
                } else {
                    newUnlocked.push(tier); 
                }
            }
        }

        if (newUnlocked.length > 0) {
            showAchievementPopups(newUnlocked);
        }

    } catch (error) {
        console.error("Error pada sistem Achievement:", error.message);
    }
}

window.checkRecipeAchievements = checkRecipeAchievements;

// ==========================================
// 2. Fungsi Penampil Popup (Dengan Efek Suara & Notif dari Kode Lama)
// ==========================================
function showAchievementPopups(achievements) {
    if (achievements.length === 0) return;

    let delay = 0;
    achievements.forEach((achievement, index) => {
        setTimeout(() => {
            const popup = document.getElementById('achievement-popup');
            const titleElement = document.getElementById('achievement-title');
            const descElement = document.getElementById('achievement-desc');
            const iconElement = document.getElementById('ach-icon'); // Pastikan ID ini ada di HTML Anda

            if(titleElement && descElement && popup) {
                titleElement.innerText = achievement.title;
                descElement.innerText = achievement.desc;
                if(iconElement && achievement.icon) iconElement.innerText = achievement.icon;
                
                popup.classList.add('show');

                // --- FITUR DARI KODE LAMA: Efek Suara ---
                if (typeof dapatkanAudioContext === 'function') {
                    try {
                        const ctx = dapatkanAudioContext(true);
                        if (ctx) {
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.type = 'triangle';
                            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
                            osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
                            gain.gain.setValueAtTime(0.5, ctx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                            osc.connect(gain); gain.connect(ctx.destination);
                            osc.start(); osc.stop(ctx.currentTime + 0.5);
                        }
                    } catch(e) { console.warn("Audio error:", e); }
                }

                // --- FITUR DARI KODE LAMA: Integrasi NotifSystem ---
                if (typeof NotifSystem !== 'undefined') {
                    NotifSystem.tambah('sistem', `🏅 Pencapaian Terbuka: ${achievement.title}`, achievement.desc, achievement.icon || '🏅');
                }

                // Sembunyikan setelah 4 detik (mengikuti durasi lama)
                setTimeout(() => { popup.classList.remove('show'); }, 4000);
            }
            
            // Perbarui Lencana Profil jika ada
            if (index === achievements.length - 1) {
                const badge = document.getElementById('profile-status-badge');
                if(badge) {
                    badge.innerText = achievement.title;
                    badge.classList.add('badge-upgrade-animation');
                }
            }
        }, delay);
        delay += 4500; // Jeda antar popup
    });
}

// Contoh pemanggilan fetch ke backend PHP Anda
async function cekPencapaianUser() {
    try {
        const response = await fetch('api_achievements.php');
        const unlockedTiers = await response.json();

        // Jika ada pencapaian baru yang terbuka dari backend
        if (Array.isArray(unlockedTiers) && unlockedTiers.length > 0) {
            unlockedTiers.forEach((tier, index) => {
                // Berikan jeda waktu (timeout) jika tier yang terbuka lebih dari satu
                setTimeout(() => {
                    window.tampilkanPopupAchievement(tier.title, tier.desc, '🏆');
                }, index * 5000);
            });
        }
    } catch (err) {
        console.error("Gagal memeriksa pencapaian:", err);
    }
}

// =======================================================================
// Fungsi untuk menukar tampilan waktu dan cuaca di sisi kanan shrunk-view
// =======================================================================
function swapRightStats() {
    const container = document.getElementById('shrunk-right-container');
    if (!container) return;

    // Tambahkan feedback visual getaran jika perangkat mendukung
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }

    // Toggle class untuk memicu transisi CSS
    if (container.classList.contains('show-time')) {
        container.classList.remove('show-time');
        container.classList.add('show-text');
    } else {
        container.classList.remove('show-text');
        container.classList.add('show-time');
    }
}

// Fungsi animasi dan pertukaran tempat saat disentuh
function swapMiniStats() {
    isTempMain = !isTempMain;
    
    const mainEl = document.getElementById('shrunk-main');
    const subEl = document.getElementById('shrunk-sub');
    
    // Efek transisi halus (menghilang cepat lalu muncul lagi)
    mainEl.style.opacity = '0';
    subEl.style.opacity = '0';
    
    setTimeout(() => {
        updateMiniHeader(); // Tukar isinya
        mainEl.style.opacity = '1';
        subEl.style.opacity = '1';
    }, 150);
}

// Fungsi menyalin data asli ke header mini
// Fungsi menyalin data asli ke header mini
function updateMiniHeader() {
    const tempText = document.getElementById('temp-val')?.innerText || '--';
    const humText = document.getElementById('hum-val')?.innerText || '--';
    
    // 1. Ambil teks lokasi baris 1 (Jalan, Kelurahan, Kecamatan)
    let locLine1 = document.getElementById('loc-line1')?.innerText || 'Lokasi';
    locLine1 = locLine1.replace('📍', '').trim();
    
    // 2. Ambil teks lokasi baris 2 (Kabupaten, Provinsi, Negara)
    let locLine2 = document.getElementById('loc-line2')?.innerText || '';
    locLine2 = locLine2.trim();

    // 3. Gabungkan menjadi alamat lengkap (Abaikan jika isinya pesan 'Mendeteksi')
    let fullLocation = locLine1;
    if (locLine2 && !locLine2.includes('Mendeteksi') && !locLine2.includes('Koordinat')) {
        fullLocation += ', ' + locLine2;
    }

    const locEl = document.getElementById('shrunk-loc-text');
    if (locEl) locEl.innerText = fullLocation;

    // 2. Logika Tukar Posisi Statistik (Suhu & Kelembaban)
    const mainEl = document.getElementById('shrunk-main');
    const subEl = document.getElementById('shrunk-sub');
    if (isTempMain) {
        if (mainEl) mainEl.innerHTML = `🌡️ ${tempText}`;
        if (subEl) subEl.innerHTML = `💧 ${humText}`;
    } else {
        if (mainEl) mainEl.innerHTML = `💧 ${humText}`;
        if (subEl) subEl.innerHTML = `🌡️ ${tempText}`;
    }
}

// Fungsi internal modul untuk menukar tampilan data cuaca proofer
function jalankanSwapMini() {
    window.DEBUG && console.log("Mini stats swapped secara aman di dalam modul!");
    
    if (typeof isTempMain !== 'undefined') {
        // Balikkan status penanda tampilan utama
        isTempMain = !isTempMain; 
        
        // Tambahkan efek transisi memudar (fade) tipis agar visualnya halus di HP
        const mainEl = document.getElementById('shrunk-main');
        const subEl = document.getElementById('shrunk-sub');
        if (mainEl) mainEl.style.opacity = '0.3';
        if (subEl) subEl.style.opacity = '0.3';
        
        setTimeout(() => {
            // Panggil fungsi bawaan aplikasi Anda untuk memperbarui teks di header mini
            if (typeof updateMiniHeader === 'function') {
                updateMiniHeader();
            }
            if (mainEl) mainEl.style.opacity = '1';
            if (subEl) subEl.style.opacity = '1';
        }, 100);
    }
}

// =========================================================
// FUNGSI REFRESH MANDIRI PER PARAMETER CUACA
// =========================================================
async function refreshSatuData(jenis, element) {
    window.DEBUG && console.log(`Memperbarui data ${jenis}...`);

    // Berikan efek animasi visual loading jika elemen kartu dikirim
    if (element) {
        element.style.transform = "scale(0.95)";
        element.style.opacity = "0.6";
    }
    
    // Konfigurasi Geolokasi dengan batas waktu lebih longgar (10 detik)
    const geoOptions = {
        enableHighAccuracy: true,
        timeout: 10000, 
        maximumAge: 0
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                // Panggil fungsi utama untuk memperbarui cuaca dan menyusun 2 baris alamat
                await fetchLocationAndWeather(lat, lon, 'GPS');
                
                // Kembalikan animasi kartu setelah sukses
                if (element) {
                    setTimeout(() => {
                        element.style.transform = "scale(1)";
                        element.style.opacity = "1";
                    }, 150);
                }
            },
            async (error) => {
                console.error(`Gagal memperbarui data ${jenis}:`, error);
                
                // --- STRATEGI CADANGAN (FALLBACK) JIKA TIMEOUT ---
                if (error.code === error.TIMEOUT || error.code === 3) {
                    window.DEBUG && console.log("Pencarian GPS Akurat Timeout. Mencoba mengambil data koordinat cepat...");
                    
                    // Coba sekali lagi dengan menonaktifkan HighAccuracy agar instan didapat dari BTS/Wifi
                    navigator.geolocation.getCurrentPosition(
                        async (posFast) => {
                            await fetchLocationAndWeather(posFast.coords.latitude, posFast.coords.longitude, 'Network-Fast');
                            if (element) {
                                element.style.transform = "scale(1)";
                                element.style.opacity = "1";
                            }
                        },
                        () => {
                            // Jika masih gagal total, ambil koordinat lama dari localStorage agar alamat tidak rusak
                            const savedLat = localStorage.getItem('saved_lat') || -7.4950;
                            const savedLon = localStorage.getItem('saved_lon') || 112.7238;
                            fetchLocationAndWeather(savedLat, savedLon, 'Cache-Fallback');
                            if (element) {
                                element.style.transform = "scale(1)";
                                element.style.opacity = "1";
                            }
                        },
                        { enableHighAccuracy: false, timeout: 5000 }
                    );
                } else {
                    if (typeof NotifSystem !== 'undefined') {
                        NotifSystem.tambah('sistem', 'Pembaruan Gagal', `Gagal memuat lokasi: ${error.message}.`, '⚠️');
                    }
                    if (element) {
                        element.style.transform = "scale(1)";
                        element.style.opacity = "1";
                    }
                }
            }, 
            geoOptions
        );
    } else {
        console.error("Geolokasi tidak didukung oleh browser ini.");
        if (element) {
            element.style.transform = "scale(1)";
            element.style.opacity = "1";
        }
    }
}

function hideRefreshIndicator() {
    const indicator = document.getElementById('refresh-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

//=========================================================
// FUNGSI UNTUK UPDATE TEKS JAM SELESAI (ETA) - MENUNJUKKAN PERKIRAAN WAKTU SELESAI PROOFING BERDASARKAN DURASI YANG DIPILIH
//=========================================================
function updateDurationLabel(minutes) {
    const el = document.getElementById('time-duration');
    if (el) {
        el.innerText = `Lama: ${minutes} Menit`;
    }
}

//=======================================================================
// PERBAIKAN: openTosModal() sebelumnya dipanggil di HTML (link checkbox
// ToS & menu Pengaturan) tetapi TIDAK PERNAH didefinisikan, sehingga
// tombol/link "Syarat & Ketentuan Layanan" tidak bereaksi sama sekali.
//=======================================================================
function openTosModal() {
    toggleModal('tos-modal');
}
window.openTosModal = openTosModal;

// TAMBAHAN
function openBackupModal() {
    toggleModal('backup-modal');
}
window.openBackupModal = openBackupModal;

// Memperbarui ringkasan jumlah resep & tanggal cadangan terakhir setiap kali modal Pencadangan dibuka
// (dipanggil dari toggleModal(), sama seperti loadDynamicProfile() untuk 'user-modal').
async function refreshBackupModalInfo() {
    const elJumlah = document.getElementById('backup-info-jumlah-resep');
    const elTerakhir = document.getElementById('backup-info-terakhir');
    if (!elJumlah && !elTerakhir) return;

    try {
        let dataResepArray = [];
        if (typeof bacaSemuaResepDariPerangkat === 'function') {
            dataResepArray = await bacaSemuaResepDariPerangkat();
        } else if (typeof readRecipesFromStorage === 'function') {
            dataResepArray = readRecipesFromStorage();
        } else {
            const raw = localStorage.getItem('daftar_resep') || localStorage.getItem('resep_list') || localStorage.getItem('recipes') || '[]';
            dataResepArray = JSON.parse(raw);
        }
        if (elJumlah) elJumlah.innerText = Array.isArray(dataResepArray) ? dataResepArray.length : '0';
    } catch (e) {
        if (elJumlah) elJumlah.innerText = '0';
    }

    if (elTerakhir) {
        const iso = localStorage.getItem('last_backup_date');
        if (iso) {
            try {
                const d = new Date(iso);
                elTerakhir.innerText = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            } catch (e) { elTerakhir.innerText = 'Belum pernah'; }
        } else {
            elTerakhir.innerText = 'Belum pernah';
        }
    }
}
window.refreshBackupModalInfo = refreshBackupModalInfo;

//=======================================================================
// TOGGLE MODAL (ENTAH INI UNTUK APA DAN KENAPA PALING ATAS DI JAVASCRIPT)
//=======================================================================
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error("Modal element not found:", modalId);
        return;
    }

    const isActive = modal.classList.toggle('active');

    if (isActive) {
        modal.removeAttribute('inert');
        document.body.style.overflow = 'hidden';
        modal.setAttribute('tabindex', '-1');
        window.history.pushState({ modalOpen: modalId }, "");
        setTimeout(() => {
            modal.focus();
        }, 50);

        if (modalId === 'user-modal' && typeof loadDynamicProfile === 'function') {
            loadDynamicProfile(false);
        }
        } else if (modalId === 'backup-modal' && typeof refreshBackupModalInfo === 'function') {
            refreshBackupModalInfo();
    } else {
        if (document.activeElement && modal.contains(document.activeElement)) {
            document.activeElement.blur();
        }
        
        // PERBAIKAN: hentikan suara pratinjau alarm (jika sedang berbunyi) begitu modal ditutup,
        // supaya nada tidak terus berputar di latar belakang setelah pengguna keluar dari halaman Pengaturan
        if (typeof hentikanSemuaSuaraAlarm === 'function') {
            hentikanSemuaSuaraAlarm();
        }
        
        setTimeout(() => {
            modal.setAttribute('inert', '');
            document.body.style.overflow = '';
        }, 50);
    }
}

// ==========================================================
// CORE MODULE: FUNGSI UPLOAD FOTO & PREVIEW (REFACTORED)
// Arsitektur: Clean Code, Single Source of Truth, Dynamic UI
// ==========================================================

// 1. STATE MANAGEMENT
// Menggabungkan variabel array agar tidak ada state yang tumpang tindih
window.uploadedRecipeFiles = []; 
let recipePhotoFiles = window.uploadedRecipeFiles; // Pointer ke referensi memori yang sama

// 2. TRIGGER UPLOAD GLOBAL
window.triggerPhotoInput = function(index = null) {
    const fileInput = document.getElementById('foto-akhir') || document.getElementById('recipe-photo-input');
    if (fileInput) {
        if (index !== null) fileInput.setAttribute('data-target-index', index);
        fileInput.click();
    } else {
        console.warn("[Debugger] Elemen input file foto tidak ditemukan di DOM.");
    }
};

/**
 * INISIALISASI EVENT LISTENER UTAMA
 */
function initPhotoUploader() {
    const fileInput =
        document.getElementById('foto-akhir') ||
        document.getElementById('recipe-photo-input');

    if (!fileInput) return;

    // Handler perubahan file.
    fileInput.addEventListener('change', (event) => {
        handleRecipePhotosSelected(event.target);
    });
}

/**
 * HANDLE LOGIKA PEMROSESAN FILE
 */
function handleRecipePhotosSelected(input) {
    if (!input.files || input.files.length === 0) return;
    
    // Validasi batas maksimal index
    if (input.files.length > 5) {
        alert("Peringatan: Maksimal 5 foto yang dapat diunggah.");
        input.value = ""; 
        return;
    }

    const newFiles = Array.from(input.files);
    
    // Immutable merge: Batasi array maksimal 5 slot
    recipePhotoFiles.splice(0, recipePhotoFiles.length, ...[...recipePhotoFiles, ...newFiles].slice(0, 5));
    
    renderPhotoPreviews();
}

/**
 * UI/UX TRANSLATOR: RENDER ULANG DOM SECARA DINAMIS & FIT
 */
function renderPhotoPreviews() {
    // Fase 1: Reset & Pembersihan (Mencegah Memory Leak)
    for (let i = 0; i < 5; i++) {
        const slot = document.getElementById(`recipe-photo-slot-${i}`);
        if (!slot) continue;
        
        const existingImg = slot.querySelector('img.preview-img');
        const existingBtn = slot.querySelector('.btn-remove-photo');
        if (existingImg) existingImg.remove();
        if (existingBtn) existingBtn.remove();
        
        slot.classList.remove('has-image');
        slot.style.borderStyle = 'dashed'; 
        slot.style.position = ''; // Reset CSS
        slot.style.overflow = ''; // Reset CSS
    }

    // Fase 2: Injeksi elemen & Styling Dinamis
    recipePhotoFiles.forEach((file, index) => {
        const slot = document.getElementById(`recipe-photo-slot-${index}`);
        if (!slot) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            slot.classList.add('has-image');
            slot.style.borderStyle = 'none'; 
            
            // [UI/UX FIX] Ubah slot menjadi relative & hidden agar memotong overflow
            slot.style.position = 'relative';
            slot.style.overflow = 'hidden';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-img';
            
            // [UI/UX FIX] Paksa gambar 100% fit, absolute menutupi icon placeholder di belakangnya
            img.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: contain;
                z-index: 1;
                border-radius: inherit;
                background-color: #f1f5f9;
            `;
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button'; 
            removeBtn.className = 'btn-remove-photo';
            removeBtn.innerHTML = '✕';
            
            // [UI/UX FIX] Styling tombol hapus melayang konsisten
            removeBtn.style.cssText = `
                position: absolute;
                top: 6px;
                right: 6px;
                z-index: 10;
                background: rgba(0, 0, 0, 0.65);
                color: #fff;
                border: none;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background 0.2s;
            `;
            
            removeBtn.addEventListener('click', (event) => {
                event.stopPropagation(); // Cegah propagasi ke fungsi zoom / upload
                removePhoto(index);
            });
            
            slot.appendChild(img);
            slot.appendChild(removeBtn);
        }
        reader.readAsDataURL(file);
    });
}

/**
 * FUNGSI HAPUS FOTO
 */
function removePhoto(indexToRemove) {
    recipePhotoFiles.splice(indexToRemove, 1);
    
    const inputEl = document.getElementById('foto-akhir') || document.getElementById('recipe-photo-input');
    if (inputEl) inputEl.value = ''; // Clear memory handler browser
    
    // Opsional: Integrasi dengan render UI eksternal jika ada
    if (typeof updateRecipePhotoGridUI === 'function') {
        updateRecipePhotoGridUI();
    }
    
    renderPhotoPreviews();
}

// Pertahankan API existing yang dipakai tombol hapus foto.
window.removeRecipePhoto = removePhoto;

/**
 * GLOBAL EVENT INTERCEPTOR & MODAL GENERATOR (Disatukan agar tidak bentrok)
 */
document.addEventListener('DOMContentLoaded', () => {
    initPhotoUploader();

    // Event Delegation menggunakan fase Capture untuk handling klik slot vs klik zoom
    document.addEventListener('click', function(e) {
        const slot = e.target.closest('.photo-slot') || e.target.closest('[id^="recipe-photo-slot-"]');
        if (!slot) return;

        // Izinkan klik murni jika target adalah tombol hapus
        if (e.target.closest('.btn-remove-photo')) return;

        const img = slot.querySelector('.preview-img');
        const hasImage = slot.classList.contains('has-image') && img && img.src;

        if (hasImage) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); 
            
            showImagePreview(img.src); // Jalankan lightbox dinamis
        }
    }, true); 

    // Preview menggunakan modal existing agar tidak membuat ID/DOM baru.
    window.tutupPreviewFoto = function() {
        const previewModal = document.getElementById('modal-preview-foto');
        const previewImage = document.getElementById('img-modal-preview');

        if (!previewModal) return;

        previewModal.style.display = 'none';
        if (previewImage) {
            previewImage.onload = null;
            previewImage.removeAttribute('src');
        }

        // Hapus listener resize yang dipasang saat preview dibuka agar tidak menumpuk.
        if (previewModal._fitPreview) {
            window.removeEventListener('resize', previewModal._fitPreview);
            window.visualViewport?.removeEventListener('resize', previewModal._fitPreview);
            previewModal._fitPreview = null;
        }
        document.body.style.overflow = '';
    };

    window.showImagePreview = function(imgSrc) {
        const previewModal = document.getElementById('modal-preview-foto');
        const previewImage = document.getElementById('img-modal-preview');

        if (!previewModal || !previewImage || !imgSrc) return;

        // Pastikan mode flex aktif sebelum ukuran gambar dihitung terhadap ruang konten modal.
        previewModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Hapus listener preview sebelumnya sebelum memasang yang terbaru.
        if (previewModal._fitPreview) {
            window.removeEventListener('resize', previewModal._fitPreview);
            window.visualViewport?.removeEventListener('resize', previewModal._fitPreview);
        }

        // Ukur area konten modal secara langsung agar gambar tidak pernah mengikuti
        // lebar intrinsiknya melewati layar, termasuk pada WebView Android/iOS.
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

        // Hitung pertama kali setelah modal tampil, lalu ulangi setelah gambar selesai dimuat.
        previewModal._fitPreview();
        previewImage.onload = previewModal._fitPreview;
        previewImage.src = imgSrc;

        window.visualViewport?.addEventListener('resize', previewModal._fitPreview, { passive: true });
        window.addEventListener('resize', previewModal._fitPreview, { passive: true });

        // Klik area gelap menutup preview tanpa membuat elemen/ID baru.
        previewModal.onclick = function(event) {
            if (event.target === previewModal) {
                window.tutupPreviewFoto();
            }
        };
    };
});

// ==========================================================
// EKSTENSI DATA (TIPS COMPONENT)
// ==========================================================
window.renderTipsCards = function() {
    const container = document.getElementById('tips-container');
    if (!container || typeof TIPS_DATA === 'undefined') return;

    container.innerHTML = TIPS_DATA.map((tip, index) => `
        <article class="tip-card">
            <h4>${tip.title}</h4>
            <p>${tip.content}</p>
        </article>
    `).join('');
};

// ============================================================
// 1. FUNGSI UTAMA NAVIGATION & SWITCH TAB
// ============================================================
// 1. Inisialisasi state global
window.tipFilterState = { category: 'all', searchQuery: '' };

// 2. Fungsi Utama Switch Tab (Satu-satunya deklarasi)
window.switchTab = function(tabName) {
    // 1. Ambil elemen dengan ID yang sesuai dengan HTML ('tips-page')
    const recipeModal = document.getElementById('recipe') || document.getElementById('recipe-modal');
    const tipsModal = document.getElementById('tips-page'); // Pastikan ID ini 'tips-page'

    // 2. Lepas fokus dari input/tombol aktif
    if (document.activeElement && (recipeModal?.contains(document.activeElement) || tipsModal?.contains(document.activeElement))) {
        document.activeElement.blur();
    }

    // 3. Reset status tombol navigasi bawah
    document.querySelectorAll('.bottom-item').forEach(item => {
        item.classList.remove('active-tab');
    });

    const activeItem = document.getElementById(`tab-${tabName}`) || document.querySelector(`.bottom-item[onclick*="${tabName}"]`);
    if (activeItem) activeItem.classList.add('active-tab');

    // 4. Sembunyikan semua modal terlebih dahulu
    [recipeModal, tipsModal].forEach(modal => {
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    });

    document.body.style.overflow = '';

    // 5. Logika Tampilkan Tab
    if (tabName === 'recipe' && recipeModal) {
        recipeModal.style.display = 'flex';
        recipeModal.classList.add('active');
        recipeModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        const recipeMaster = document.getElementById('recipe-master-view');
        const recipeDetail = document.getElementById('recipe-detail-view');
        if (recipeMaster && recipeDetail) {
            recipeMaster.style.display = 'flex';
            recipeDetail.style.display = 'none';
        }

        if (typeof window.tampilkanDaftarResepTersimpan === 'function') window.tampilkanDaftarResepTersimpan();
        if (typeof renderRecipeTableBakuTotal === 'function') renderRecipeTableBakuTotal();
        if (typeof calculateIngredients === 'function') calculateIngredients();
        if (typeof inisialisasiFormTambahBahan === 'function') inisialisasiFormTambahBahan();

    } else if (tabName === 'tips' && tipsModal) {
        // Tampilkan halaman tips
        tipsModal.style.display = 'flex';
        tipsModal.classList.add('active');
        tipsModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        try {
            if (typeof renderTipsCards === 'function') renderTipsCards();
            if (typeof window.filterTips === 'function') window.filterTips();
        } catch (err) {
            console.error("Error pada script tips:", err);
        }

        window.requestAnimationFrame(() => {
            const searchInput = document.getElementById('tip-search-input');
            if (searchInput) searchInput.focus();
        });
    }
};

window.handleSearchInput = function(value) {
    const clearBtn = document.getElementById('clear-search-btn');
    
    // Tampilkan tombol X jika input terisi, sembunyikan jika kosong
    if (clearBtn) {
        clearBtn.style.display = value.trim() ? 'flex' : 'none';
    }
    
    // Panggil fungsi pencarian utama Anda
    if (typeof window.filterTipsAndTrack === 'function') {
        window.filterTipsAndTrack(value);
    }
};

/**
 * Membersihkan nilai input dan mereset tampilan tips
 */
window.clearSearchInput = function() {
    const input = document.getElementById('tip-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    
    if (input) {
        input.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        
        // Panggil filter dengan nilai kosong untuk memulihkan tampilan menu awal
        if (typeof window.filterTipsAndTrack === 'function') {
            window.filterTipsAndTrack('');
        }
    }
};

// 1. Amankan state global (Hanya SATU deklarasi)
window.tipFilterState = { category: 'all', searchQuery: '' };

// Fungsi untuk menampilkan menu kategori utama
// 1. Definisikan renderCategoryCards secara global (Grid Kotak 2 Kolom)
window.renderCategoryCards = function() {
    const container = document.getElementById('tips-container');
    if (!container || !Array.isArray(window.tipsKategori)) return;

    container.replaceChildren();
    
    const titleEl = document.createElement('div');
    titleEl.innerHTML = `<h3 style="margin-bottom: 12px; font-size: 1.1rem; color: var(--text-color, #333);">Pilih Kategori Tips & Sains:</h3>`;
    container.appendChild(titleEl);

    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = "display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;";

    window.tipsKategori.forEach(cat => {
        const catCard = document.createElement('div');
        catCard.className = 'category-menu-card';
        catCard.style.cssText = "background: #fff; padding: 16px; border-radius: 12px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; min-height: 120px; transition: transform 0.2s, box-shadow 0.2s;";
        
        catCard.innerHTML = `
            <div style="font-size: 1.8rem; margin-bottom: 8px;">${cat.icon}</div>
            <div>
                <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; color: #2c3e50; line-height: 1.3;">${cat.kategori}</h4>
                <small style="color: #7f8c8d; font-size: 0.8rem;">${cat.items.length} Artikel</small>
            </div>
        `;

        catCard.addEventListener('mouseover', () => {
            catCard.style.transform = 'translateY(-2px)';
            catCard.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
        });
        catCard.addEventListener('mouseout', () => {
            catCard.style.transform = 'translateY(0)';
            catCard.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        });

        catCard.addEventListener('click', () => {
            window.renderTipsByCategoryId(cat.id);
        });

        gridContainer.appendChild(catCard);
    });

    container.appendChild(gridContainer);
};

// 2. Definisikan renderTipsByCategoryId secara global (Lengkap dengan Tombol Kembali)
window.renderTipsByCategoryId = function(categoryId) {
    const container = document.getElementById('tips-container');
    const selectedCategory = window.tipsKategori.find(c => c.id === categoryId);
    if (!container || !selectedCategory) return;

    container.replaceChildren();

    const backBtn = document.createElement('button');
    backBtn.innerHTML = "← Kembali ke Kategori";
    backBtn.style.cssText = "background: #f1f2f6; border: none; color: #2c3e50; font-weight: 600; cursor: pointer; margin-bottom: 15px; padding: 8px 14px; font-size: 0.9rem; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);";
    
    backBtn.addEventListener('click', () => {
        window.renderCategoryCards();
    });
    container.appendChild(backBtn);

    const headerTitle = document.createElement('h3');
    headerTitle.style.cssText = "margin-bottom: 15px; font-size: 1.2rem; color: #2c3e50;";
    headerTitle.innerText = `${selectedCategory.icon} ${selectedCategory.kategori}`;
    container.appendChild(headerTitle);

    selectedCategory.items.forEach(tip => {
        const card = document.createElement('article');
        card.className = 'tip-card';
        card.dataset.keywords = tip.keywords;

        const header = document.createElement('div');
        header.className = 'tip-card-header';
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        const bodyId = `tip-body-${tip.id}`;
        header.setAttribute('aria-expanded', 'false');
        header.setAttribute('aria-controls', bodyId);
        
        header.addEventListener('click', () => window.toggleTipCard(header));
        header.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.toggleTipCard(header);
            }
        });
        
        header.innerHTML = `
            <span class="tip-card-index">${String(tip.id).padStart(2, '0')}</span>
            <div>
                <h4>${tip.title}</h4>
            </div>
            <span class="toggle-icon" aria-hidden="true">▼</span>
        `;

        const body = document.createElement('div');
        body.className = 'tip-card-body';
        body.id = bodyId;
        body.setAttribute('role', 'region');
        body.setAttribute('aria-label', `Detail ${tip.title}`);
        body.hidden = true;
        
        tip.content.forEach((paragraph, index) => {
            const paragraphElement = document.createElement('p');
            paragraphElement.style.margin = index === tip.content.length - 1 ? '0' : '0 0 8px 0';
            paragraphElement.innerHTML = paragraph;
            body.appendChild(paragraphElement);
        });

        card.append(header, body);
        container.appendChild(card);
    });
};

// 3. Panggil fungsi pertama kali saat halaman dimuat
window.renderCategoryCards();

window.toggleTipCard = function(headerEl) {
    const bodyEl = headerEl.nextElementSibling;
    const iconEl = headerEl.querySelector('.toggle-icon');
    if (!bodyEl) return;
    
    // Cek status berdasarkan properti .hidden bawaan HTML
    const isHidden = bodyEl.hidden || window.getComputedStyle(bodyEl).display === 'none';

    if (isHidden) {
        bodyEl.hidden = false;
        bodyEl.style.display = 'block';
        headerEl.setAttribute('aria-expanded', 'true');
        if (iconEl) iconEl.style.transform = 'rotate(180deg)';
    } else {
        bodyEl.hidden = true;
        bodyEl.style.display = 'none';
        headerEl.setAttribute('aria-expanded', 'false');
        if (iconEl) iconEl.style.transform = 'rotate(0deg)';
    }
};

// 2. Fungsi Filter Tunggal (Menghapus duplikasi)
window.filterTips = function() {
    const selectedCategory = window.tipFilterState.category || 'all';
    const searchQuery = window.tipFilterState.searchQuery || '';
    
    const tipCards = document.querySelectorAll('.tip-card');
    const emptyState = document.getElementById('tip-empty-state');
    let visibleCount = 0;

    tipCards.forEach(card => {
        const text = card.innerText.toLowerCase();
        const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
        const cardCategoryAttr = card.getAttribute('data-category') || '';
        
        const categoryMatches = (selectedCategory === 'all' || cardCategoryAttr === selectedCategory);
        const searchMatches = (!searchQuery || text.includes(searchQuery) || keywords.includes(searchQuery));

        if (categoryMatches && searchMatches) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
        if(visibleCount === 0) emptyState.innerHTML = `Tidak ada tips yang cocok untuk kategori/pencarian ini.`;
    }

    // Panggil log analitik jika ada pencarian teks
    if (searchQuery) {
        logUserSearchBehavior(searchQuery, visibleCount);
    }
};

// 4. Developer Monitoring
// 1. Variabel penampung timer untuk Debounce
// 1. Deklarasi timer di ruang lingkup global (di luar fungsi)
var searchDebounceTimer = null;

window.filterTipsAndTrack = function(query) {
    const keyword = (query || "").toLowerCase().trim();
    const container = document.getElementById('tips-container');
    const emptyState = document.getElementById('tip-empty-state');
    const queryTarget = document.getElementById('search-query-target');
    
    // 1. Jika kotak pencarian dikosongkan, kembalikan ke menu kategori utama
    if (keyword === '') {
        if (typeof window.renderCategoryCards === 'function') {
            window.renderCategoryCards(); 
        }
        if (emptyState) emptyState.style.display = 'none';
        return;
    }

    // 2. Lakukan pencarian langsung ke dalam sumber DATA (bukan DOM)
    let matchedTips = [];
    
    window.tipsKategori.forEach(category => {
        category.items.forEach(tip => {
            // Cek apakah keyword ada di judul, keywords, atau isi konten
            const titleMatch = tip.title.toLowerCase().includes(keyword);
            const keywordMatch = (tip.keywords || "").toLowerCase().includes(keyword);
            const contentMatch = tip.content.some(paragraph => paragraph.toLowerCase().includes(keyword));

            if (titleMatch || keywordMatch || contentMatch) {
                // Simpan data artikel yang cocok
                matchedTips.push(tip); 
            }
        });
    });

    // 3. Bersihkan layar utama untuk menampilkan hasil pencarian
    if (container) container.replaceChildren();

    // 4. Render hasil jika ada artikel yang cocok
    if (matchedTips.length > 0) {
        if (emptyState) emptyState.style.display = 'none';

        // Buat tombol kembali ke menu
        const backBtn = document.createElement('button');
        backBtn.innerHTML = "← Batal Pencarian";
        backBtn.style.cssText = "background: #f1f2f6; border: none; color: #2c3e50; font-weight: 600; cursor: pointer; margin-bottom: 15px; padding: 8px 14px; font-size: 0.9rem; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);";
        backBtn.addEventListener('click', () => {
            document.getElementById('tip-search-input').value = ''; // Kosongkan input
            window.renderCategoryCards(); // Render ulang menu utama
        });
        container.appendChild(backBtn);

        // Cetak artikel (tip-card) yang cocok menggunakan logika render Anda
        matchedTips.forEach(tip => {
            const card = document.createElement('article');
            card.className = 'tip-card';
            card.dataset.keywords = tip.keywords;

            const header = document.createElement('div');
            header.className = 'tip-card-header';
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');
            const bodyId = `tip-body-${tip.id}`;
            header.setAttribute('aria-expanded', 'false');
            header.setAttribute('aria-controls', bodyId);
            
            header.addEventListener('click', () => window.toggleTipCard(header));
            
            header.innerHTML = `
                <span class="tip-card-index">${String(tip.id).padStart(2, '0')}</span>
                <div><h4>${tip.title}</h4></div>
                <span class="toggle-icon" aria-hidden="true">▼</span>
            `;

            const body = document.createElement('div');
            body.className = 'tip-card-body';
            body.id = bodyId;
            body.setAttribute('role', 'region');
            body.hidden = true;
            
            tip.content.forEach((paragraph, index) => {
                const paragraphElement = document.createElement('p');
                paragraphElement.style.margin = index === tip.content.length - 1 ? '0' : '0 0 8px 0';
                paragraphElement.innerHTML = paragraph;
                body.appendChild(paragraphElement);
            });

            card.append(header, body);
            container.appendChild(card);
        });

    } else {
        // 5. Tangani State Kosong (Tidak ada hasil)
        if (emptyState) {
            container.appendChild(emptyState); // Pastikan empty state tetap di dalam container
            emptyState.style.display = 'block';
        }
        if (queryTarget) queryTarget.textContent = `"${query}"`;
    }

    // 6. Analitik Monitoring Developer
    clearTimeout(searchDebounceTimer);
    if (!keyword) return;
    searchDebounceTimer = setTimeout(function() {
        if (keyword.length > 3 && typeof window.logUserSearchBehavior === 'function') {
            window.logUserSearchBehavior(keyword, matchedTips.length);
        }
    }, 2000);
};

// 4. Fungsi untuk Mengunduh Hasil Analitik (Bisa dihubungkan ke tombol ekspor di panel admin/developer)
function exportSearchAnalytics() {
    try {
        const rawLogs = localStorage.getItem('developer_search_analytics') || '[]';
        const blob = new Blob([rawLogs], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-search-analytics-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("Gagal mengekspor log analisis: " + err.message);
    }
}

// FUNGSI AI TIPS
window.initTipsAIAssistant = function() {
    const btn = document.getElementById('ai-tips-btn');
    const input = document.getElementById('ai-tips-input');
    const container = document.getElementById('ai-tips-result-container');

    if (!btn || !input || !container) return;

    // --- FUNGSI FORMATTING HASIL AI (Diadaptasi dari ai-analyze.js) ---
    const formatHasilAI = (teks) => {
        if (!teks) return "Analisis tidak tersedia.";

        let cleanText = teks.replace(/([\*\-\•])\s*\n\s*/g, '$1 ');

        cleanText = cleanText
            .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
            .replace(/_([^_\n]+)_/g, '<em>$1</em>');

        const lines = cleanText.split('\n');
        let htmlLines = [];

        lines.forEach(line => {
            let t = line.trim();
            if (!t || t === '•' || t === '-' || t === '*') return; 

            // A. Deteksi Judul Utama (Mengandung Emoji)
            if (/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])\s*(.+)$/.test(t) || /^#\s/.test(t)) {
                t = t.replace(/^#\s*/, '').toLowerCase();
                htmlLines.push(`<div style="font-weight:900; margin:24px 0 12px 0; color:#4a235a; font-size:1.05rem; border-bottom:2px solid #e8daef; padding-bottom:6px; text-transform:capitalize; letter-spacing:0.3px;">${t}</div>`);
            }
            // B. Deteksi Sub-Judul (Berakhiran ":")
            else if (t.endsWith(':') || /^#{2,6}\s/.test(t)) {
                t = t.replace(/^#{2,6}\s*/, '');
                htmlLines.push(`<div style="font-weight:800; margin:16px 0 6px 0; color:#2980b9; font-size:0.95rem;">${t}</div>`);
            }
            // C. Deteksi List Angka
            else if (/^(\d+)\.\s+(.+)/.test(t)) {
                const match = t.match(/^(\d+)\.\s+(.+)/);
                htmlLines.push(`<div style="padding-left:12px; margin-bottom:8px; display:flex; line-height:1.5; font-size:0.9rem;"><span style="margin-right:8px; font-weight:900; color:#d35400;">${match[1]}.</span><span>${match[2]}</span></div>`);
            }
            // D. Deteksi List Bullet
            else if (/^[\*\-\•]\s+/.test(t)) {
                t = t.replace(/^[\*\-\•]\s+/, '');
                htmlLines.push(`<div style="padding-left:12px; margin-bottom:8px; display:flex; line-height:1.5; font-size:0.9rem;"><span style="margin-right:10px; color:#d35400; font-size:1.2rem; line-height:0.8;">•</span><span>${t}</span></div>`);
            }
            // E. Paragraf Biasa
            else {
                htmlLines.push(`<div style="margin-bottom:10px; line-height:1.6; font-size:0.9rem; color:#444; text-align:justify;">${t}</div>`);
            }
        });

        return htmlLines.join('');
    };

    btn.addEventListener('click', async () => {
        const query = input.value.trim();
        if (!query) return;

        // Simpan teks tombol asli jika diperlukan untuk reset state
        const prevText = btn.innerText;
        btn.innerText = "⏳ AI Menganalisis...";
        btn.disabled = true;

        // Tampilkan loading interaktif
        container.style.display = "block";
        container.innerHTML = `
            <div style="background: #fff; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; color: #718096; margin-bottom: 20px; font-size: 0.9rem;">
                🤖 AI sedang menganalisis parameter sains adonan...
            </div>
        `;

        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const endpoint = isLocal ? 'https://timer-proofer.vercel.app/api/ai-tips' : '/api/ai-tips';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promptContext: query })
            });

            const responseText = await response.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error(responseText || 'Terjadi kesalahan internal pada server.');
            }

            if (!response.ok) {
                throw new Error(data.error || data.details || 'Gagal memproses analisis AI.');
            }

            // Render hasil analisis AI menggunakan fungsi formatHasilAI yang lebih cerdas
            container.innerHTML = `
                <div id="ai-result-card" style="background: #fff; padding: 18px; border-radius: 16px; border-left: 4px solid #b7791f; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="
                        const body = document.getElementById('ai-body-content'); 
                        const icon = document.getElementById('ai-toggle-icon'); 
                        if(body.style.display === 'none'){ 
                            body.style.display = 'block'; 
                            icon.innerText = '▲'; 
                        } else { 
                            body.style.display = 'none'; 
                            icon.innerText = '▼'; 
                        }
                    ">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h4 style="margin: 0; color: #2c3e50; font-size: 1rem;">🧠 Hasil Analisis Sains AI</h4>
                            <span style="font-size: 0.75rem; color: #718096; background: #feebc8; padding: 2px 8px; border-radius: 10px;">Akurat</span>
                        </div>
                        <span id="ai-toggle-icon" style="font-size: 0.8rem; color: #718096; font-weight: bold; padding: 4px 8px;">▲</span>
                    </div>
                    
                    <div id="ai-body-content" style="max-height: 320px; overflow-y: auto; overflow-x: hidden; padding-right: 8px; margin-top: 12px; border-top: 1px solid #f1f5f9; padding-top: 10px; scrollbar-width: thin; scroll-behavior: smooth;">
                        ${formatHasilAI(data.result)}
                    </div>
                </div>
            `;

        } catch (error) {
            container.innerHTML = `
                <div style="background: #fff5f5; color: #c53030; padding: 14px; border-radius: 8px; border: 1px solid #feb2b2; font-size: 0.9rem; margin-bottom: 20px;">
                    ⚠️ ${error.message || 'Terjadi kesalahan jaringan.'}
                </div>
            `;
        } finally {
            btn.innerText = prevText;
            btn.disabled = false;
        }
    });
};

// Panggil fungsi saat halaman dimuat
window.initTipsAIAssistant();

// ==========================================
// 2. FUNGSI UTAMA: UPDATE TEMA & WAKTU DINAMIS
// ==========================================
function updateDynamicTheme(weatherId, mainWeather) {
    const root = document.documentElement;
    const body = document.body;
    const now = new Date();
    const hours = now.getHours();
    
    // =========================================================================
    // WAJIB: DEKLARASIKAN SEMUA VARIABEL TEMA DI AWAL AGAR TIDAK REFERENCEERROR
    // =========================================================================
    let bgGradient = "linear-gradient(135deg, #FDF5E6, #F2D2A9)"; 
    let accentColor = "#E67E22";
    let textWeatherColor = "#4E342E"; 
    let cardBg = "rgba(0, 0, 0, 0.04)";
    let containerBg = "linear-gradient(135deg, #FDF5E6 0%, #F2D2A9 100%)"; 
    let textColor = "#4E342E"; 

    // 1. DETERMINASI KETERANGAN WAKTU
    let timeOfDay = dapatkanKeteranganWaktuLokal().toLowerCase(); 
    if (hours >= 12 && hours < 13) {
        timeOfDay = "tengah siang";
    } else if (hours >= 10 && hours < 15) {
        timeOfDay = "siang";
    } else if (hours >= 3 && hours < 4) {
        timeOfDay = "dini hari"; 
    } else if (hours >= 4 && hours < 6) {
        timeOfDay = "fajar";
    } else if (hours >= 6 && hours < 10) {
        timeOfDay = "pagi";
    } else if (hours >= 15 && hours < 18) {
        timeOfDay = "sore";
    } else if (hours >= 18 && hours < 19) {
        timeOfDay = "senja";
    } else if (hours >= 19 && hours < 20) {
        timeOfDay = "petang";
    } else if (hours >= 20 && hours < 24) {
        timeOfDay = "malam";
    } else {
        timeOfDay = "tengah malam";
    }

    // 2. DETERMINASI KONDISI CUACA
    let condition = "cerah"; 
    const main = String(mainWeather).toLowerCase();
    const tempElement = document.getElementById('temp-val');
    let currentTemp = 28;
    if (tempElement) {
        currentTemp = parseFloat(tempElement.innerText) || 28;
    }

    if (weatherId >= 200 && weatherId < 600) condition = "hujan";
    else if (weatherId >= 701 && weatherId <= 781) condition = "mendung";
    else if (weatherId == 801 || weatherId == 802) condition = "berawan";
    else if (weatherId == 803 || weatherId == 804) condition = "mendung";
    else if (main.includes("rain") || main.includes("drizzle") || main.includes("thunderstorm")) condition = "hujan";
    else if (main.includes("overcast") || main.includes("fog")) condition = "mendung";
    else if (main.includes("cloud")) condition = "berawan";
    else if (currentTemp >= 33) condition = "panas";
    else condition = "cerah";

    window.DEBUG && console.log(`Mengubah tema berdasarkan waktu: ${timeOfDay} dan cuaca: ${mainWeather}`);

    // 3. PENGONDISIAN WARNA GLOBAL (Aplikasi / Body)
    if (weatherId >= 200 && weatherId < 600) { 
        bgGradient = "linear-gradient(135deg, #2c3e50, #34495e)";
        accentColor = "#3498db";
        textWeatherColor = "#ecf0f1"; 
        cardBg = "rgba(255, 255, 255, 0.12)";
    } else if (weatherId >= 801 && weatherId <= 804) { 
        bgGradient = "linear-gradient(135deg, #e6d5c3, #bda58f)";
        accentColor = "#d35400";
        textWeatherColor = "#3e2723"; 
        cardBg = "rgba(0, 0, 0, 0.05)";
    } else if (["malam", "tengah malam", "dini hari"].includes(timeOfDay)) {
        bgGradient = "linear-gradient(135deg, #242A4A, #171B30)";
        accentColor = "#f1c40f";
        textWeatherColor = "#E0E0E0";
        cardBg = "rgba(255, 255, 255, 0.08)";
    } else if (timeOfDay === "senja" || timeOfDay === "petang") {
        bgGradient = "linear-gradient(135deg, #FF7F50, #6F1E51)";
        accentColor = "#ffffff";
        textWeatherColor = "#C0C0C0";
        cardBg = "rgba(255, 255, 255, 0.15)";
    }

    // Terapkan tema global ke CSS Root & Body
    body.style.background = bgGradient;
    root.style.setProperty('--accent', accentColor);
    root.style.setProperty('--text-weather', textWeatherColor);

    // 4. PENGONDISIAN WARNA KHUSUS CONTAINER HEADER
    if (timeOfDay === "dini hari") {
        if (condition === "hujan") { containerBg = "linear-gradient(135deg, #0F172A 0%, #020617 100%)"; textColor = "#94A3B8"; cardBg = "rgba(255,255,255,0.05)"; }
        else { containerBg = "linear-gradient(135deg, #182238 0%, #0B111E 100%)"; textColor = "#CBD5E1"; cardBg = "rgba(255,255,255,0.06)"; }
    } 
    else if (timeOfDay === "fajar") {
        if (condition === "hujan") { containerBg = "linear-gradient(135deg, #3A4454 0%, #29303D 100%)"; textColor = "#ECEFF1"; cardBg = "rgba(255,255,255,0.08)"; }
        else if (condition === "mendung" || condition === "berawan") { containerBg = "linear-gradient(135deg, #708090 0%, #576574 100%)"; textColor = "#F5F5F5"; cardBg = "rgba(255,255,255,0.07)"; }
        else { containerBg = "linear-gradient(135deg, #E0AAFF 0%, #FFC6FF 100%)"; textColor = "#4A148C"; cardBg = "rgba(74,20,140,0.06)"; }
    } 
    else if (timeOfDay === "pagi") {
        if (condition === "hujan") { containerBg = "linear-gradient(135deg, #F4F6F7 0%, #E5EAEF 100%)"; textColor = "#263238"; cardBg = "rgba(38,50,56,0.07)"; }
        else if (condition === "mendung") { containerBg = "linear-gradient(135deg, #BDC3C7 0%, #95A5A6 100%)"; textColor = "#2C3E50"; cardBg = "rgba(0,0,0,0.06)"; }
        else if (condition === "berawan") { containerBg = "linear-gradient(135deg, #F0FDFB 0%, #D2F7F2 100%)"; textColor = "#004D40"; cardBg = "rgba(0,77,64,0.06)"; }
        else if (condition === "panas") { containerBg = "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)"; textColor = "#E65100"; cardBg = "rgba(230,81,0,0.06)"; }
        else { containerBg = "linear-gradient(135deg, #FFFDEB 0%, #FFF5D1 100%)"; textColor = "#5D4037"; cardBg = "rgba(93,64,55,0.06)"; }
    } 
    else if (timeOfDay === "tengah siang") {
        if (condition === "hujan") { containerBg = "linear-gradient(135deg, #EBF0F2 0%, #D4DFE2 100%)"; textColor = "#37474F"; cardBg = "rgba(55,71,79,0.08)"; }
        else if (condition === "mendung" || condition === "berawan") { containerBg = "linear-gradient(135deg, #F7FFFC 0%, #E1F9F1 100%)"; textColor = "#37474F"; cardBg = "rgba(55,71,79,0.06)"; }
        else if (condition === "panas") { containerBg = "linear-gradient(135deg, #FFE0B2 0%, #FFB74D 100%)"; textColor = "#BF360C"; cardBg = "rgba(191,54,12,0.07)"; }
        else { containerBg = "linear-gradient(135deg, #FFF8F0 0%, #FFEEDD 100%)"; textColor = "#E65100"; cardBg = "rgba(230,81,0,0.06)"; }
    }
    else if (timeOfDay === "siang") {
        if (condition === "hujan") { containerBg = "linear-gradient(135deg, #EBF0F2 0%, #D4DFE2 100%)"; textColor = "#37474F"; cardBg = "rgba(55,71,79,0.08)"; }
        else if (condition === "mendung") { containerBg = "linear-gradient(135deg, #A6B1B5 0%, #8A979C 100%)"; textColor = "#212121"; cardBg = "rgba(0,0,0,0.07)"; }
        else if (condition === "berawan") { containerBg = "linear-gradient(135deg, #F7FFFC 0%, #E1F9F1 100%)"; textColor = "#37474F"; cardBg = "rgba(55,71,79,0.06)"; }
        else if (condition === "panas") { containerBg = "linear-gradient(135deg, #FFCC80 0%, #FFB74D 100%)"; textColor = "#BF360C"; cardBg = "rgba(191,54,12,0.07)"; }
        else { containerBg = "linear-gradient(135deg, #FFF8F0 0%, #FFEEDD 100%)"; textColor = "#E65100"; cardBg = "rgba(230,81,0,0.06)"; }
    } 
    else if (timeOfDay === "sore") {
        if (condition === "hujan") { containerBg = "linear-gradient(135deg, #DFE4EA 0%, #CED6E0 100%)"; textColor = "#2F3542"; cardBg = "rgba(47,53,66,0.08)"; }
        else if (condition === "mendung" || condition === "berawan") { containerBg = "linear-gradient(135deg, #E4E7EB 0%, #C8D6E5 100%)"; textColor = "#222F3E"; cardBg = "rgba(34,47,62,0.06)"; }
        else { containerBg = "linear-gradient(135deg, #FFEAA7 0%, #FFD32A 100%)"; textColor = "#5D4037"; cardBg = "rgba(93,64,55,0.06)"; }
    } 
    else if (timeOfDay === "senja") {
        if (condition === "hujan" || condition === "mendung") { containerBg = "linear-gradient(135deg, #4B4B4B 0%, #2C3E50 100%)"; textColor = "#FFFFFF"; cardBg = "rgba(255,255,255,0.1)"; }
        else { containerBg = "linear-gradient(135deg, #FF7F50 0%, #6F1E51 100%)"; textColor = "#FFFFFF"; cardBg = "rgba(255,255,255,0.12)"; }
    } 
    else if (timeOfDay === "petang") {
        if (condition === "hujan" || condition === "mendung") { containerBg = "linear-gradient(135deg, #2A2E3D 0%, #1A1C24 100%)"; textColor = "#E2E8F0"; cardBg = "rgba(255,255,255,0.07)"; }
        else { containerBg = "linear-gradient(135deg, #3B3B58 0%, #24243A 100%)"; textColor = "#F1F5F9"; cardBg = "rgba(255,255,255,0.09)"; }
    }
    else if (timeOfDay === "malam") {
        if (condition === "hujan") { containerBg = "linear-gradient(135deg, #203A54 0%, #122538 100%)"; textColor = "#FFFFFF"; cardBg = "rgba(255,255,255,0.12)"; }
        else if (condition === "mendung" || condition === "berawan") { containerBg = "linear-gradient(135deg, #2D3539 0%, #202628 100%)"; textColor = "#ECEFF1"; cardBg = "rgba(255,255,255,0.08)"; }
        else { containerBg = "linear-gradient(135deg, #242A4A 0%, #171B30 100%)"; textColor = "#E0E0E0"; cardBg = "rgba(255,255,255,0.08)"; }
    } 
    else {
        if (condition === "hujan") { containerBg = "linear-gradient(135deg, #0F172A 0%, #020617 100%)"; textColor = "#94A3B8"; cardBg = "rgba(255,255,255,0.05)"; }
        else { containerBg = "linear-gradient(135deg, #111827 0%, #030712 100%)"; textColor = "#9CA3AF"; cardBg = "rgba(255,255,255,0.05)"; }
    }

    // Terapkan warna kontainer lokasi header jika ada
    const locationSectionHeader = document.getElementById('location-section');
    if (locationSectionHeader) {
        locationSectionHeader.style.setProperty('--bg-container', containerBg);
        locationSectionHeader.style.setProperty('--text-container', textColor);
        locationSectionHeader.style.setProperty('--card-bg', cardBg);
        locationSectionHeader.style.color = textColor;
    }

    // 5. SUNTIKKAN TEKS KETERANGAN WAKTU DAN CUACA KE HTML
    const lineweather = document.getElementById('loc-line-weather');
    if (lineweather) {
        let iconWaktu = "🌙";
        if (["pagi", "tengah siang", "siang"].includes(timeOfDay)) {
            iconWaktu = "☀️";
        } else if (["sore", "senja", "petang", "fajar"].includes(timeOfDay)) {
            iconWaktu = "🌇";
        }

        let iconCuaca = "☀️";
        if (condition === "hujan") iconCuaca = "🌧️";
        else if (condition === "mendung") iconCuaca = "☁️";
        else if (condition === "berawan") iconCuaca = "⛅";
        else if (condition === "panas") iconCuaca = "🔥";
        else if (["malam", "tengah malam", "dini hari"].includes(timeOfDay) && condition === "cerah") iconCuaca = "✨";

        const namaWaktuTampil = dapatkanKeteranganWaktuLokal(); 
        const moon = typeof getMoonPhase === 'function' ? getMoonPhase() : { icon: "" };
        const capitalizedCond = condition.charAt(0).toUpperCase() + condition.slice(1);

        let teksFaseBulan = "";
        if (["malam", "tengah malam", "dini hari", "fajar"].includes(timeOfDay)) {
            teksFaseBulan = ` ${moon.icon || ''}`;
        }

        // Posisi ikon waktu: matahari/sore di KIRI, fase bulan di KANAN (cuma 1 ikon bulan)
        const isMalamSekarang = ["malam", "tengah malam", "dini hari", "fajar"].includes(timeOfDay);
        const baseTimeHtml = isMalamSekarang
            ? `${namaWaktuTampil}${teksFaseBulan}`
            : `${iconWaktu} ${namaWaktuTampil}`;

        lineweather.innerHTML = `
        <div style="background-color: ${cardBg}; display: inline-flex; flex-direction: column; gap: 4px; padding: 8px 14px; border-radius: 12px; margin-top: 6px; font-size: 0.82rem; font-weight: 500; align-items: center; justify-content: center; width: max-content; max-width: 100%; color: var(--text-weather); transition: all 0.4s ease; box-sizing: border-box;">
            <div style="font-weight: 700; opacity: 0.95; color: var(--text-weather); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                ${baseTimeHtml}
            </div>
            <div style="width: 100%; height: 1px; background: rgba(148, 163, 184, 0.2); margin: 2px 0;"></div>
            <div style="font-size: 0.78rem; opacity: 0.9; color: var(--text-weather); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                ${iconCuaca} ${capitalizedCond}
            </div>
        </div>`;
    }

    // 6. UPDATE TEMA DI KONDISI SHRUNK
    const shrunkWeatherText = document.getElementById('shrunk-weather-text');
    const shrunkWeatherEmoji = document.getElementById('shrunk-weather-emoji');
    
    if (shrunkWeatherText) shrunkWeatherText.innerText = condition.charAt(0).toUpperCase() + condition.slice(1);
    
    // Targetkan 'weather-emoji' (bukan time-emoji) dan set manual sesuai kondisi
    if (shrunkWeatherEmoji) {
        let emojiMini = "☀️";
        if (condition === "hujan") emojiMini = "🌧️";
        else if (condition === "mendung") emojiMini = "☁️";
        else if (condition === "berawan") emojiMini = "⛅";
        else if (condition === "panas") emojiMini = "🔥";
        else if (["malam", "tengah malam", "dini hari"].includes(timeOfDay) && condition === "cerah") emojiMini = "✨";
        
        shrunkWeatherEmoji.innerText = emojiMini;
    }
}

async function bagikanAplikasi() {
    const shareData = {
        title: 'Timer Proofing - Donut Fermentation Agent',
        text: 'Halo! Saya menggunakan aplikasi cerdas ini untuk memantau waktu proofing adonan donat berdasarkan suhu cuaca. Sangat membantu! Coba di sini:',
        url: window.location.origin + window.location.pathname
    };

    // Cek apakah browser mendukung share dan tidak sedang dibuka di desktop yang rentan error
    if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        try {
            await navigator.share(shareData);
            return;
        } catch (err) {
            console.warn("Share dibatalkan pengguna atau gagal:", err);
            return;
        }
    }

    // Fallback otomatis (untuk PC/Desktop atau browser yang tidak mendukung)
    const textToCopy = `${shareData.text} ${shareData.url}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            alert("🔗 Tautan aplikasi berhasil disalin! Silakan tempel (paste) ke WhatsApp atau media sosial teman Anda.");
        }).catch(err => {
            prompt("Salin tautan berikut:", textToCopy);
        });
    } else {
        prompt("Salin tautan berikut:", textToCopy);
    }
}

function updateVersion() {
    // Referensi elemen-elemen yang perlu diupdate versinya
    const els = {
        profile: document.getElementById("profile-version"),
        aboutModal: document.getElementById("about-app-version"),
        aboutMenu: document.getElementById("about-menu-version")
    };
    
    fetch('./version.json')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            const versionString = data?.version ? `Donut Fermentation Agent v${data.version}` : 'Donut Fermentation Agent v1.2.0';
            const versionSimple = data?.version ? `Versi ${data.version}` : 'Versi 1.2.0';

            // Update elemen yang ada
            if (els.profile) els.profile.textContent = versionSimple;
            if (els.aboutModal) els.aboutModal.textContent = versionSimple;
            // Untuk menu, kita gunakan format yang menyertakan nama aplikasi
            if (els.aboutMenu) els.aboutMenu.textContent = versionString;
        })
        .catch(() => {
            // Fallback jika file tidak ditemukan
            if (els.profile) els.profile.textContent = 'Versi 1.2.0';
            if (els.aboutModal) els.aboutModal.textContent = 'Versi 1.2.0';
            if (els.aboutMenu) els.aboutMenu.textContent = 'Donut Fermentation Agent v1.2.0';
        });
}

function bukaArtikelLengkap(id) {
    const artikel = dataArtikelLengkap[id];
    if (!artikel) return;

    // Pasang konten teks ke dalam modal pop-up
    document.getElementById('modal-badge').innerText = artikel.badge;
    document.getElementById('modal-title').innerText = artikel.title;
    document.getElementById('modal-body').innerHTML = artikel.content;
    
    // Tampilkan overlay modal via class .active (CSS menangani display)
    const overlay = document.getElementById('article-modal');
    if (overlay) {
        overlay.classList.add('active');
    }
}

// FUNGSI UNTUK MENUTUP KEMBALI HALAMAN ARTIKEL
// Cukup gunakan satu fungsi ini saja di dalam <script type="module"> Anda:
function tutupArtikelSecaraAman() {
    window.DEBUG && console.log("Menutup artikel dan membersihkan efek buram...");
    const articleModal = document.getElementById('article-modal');
    const modalOverlay = document.querySelector('.article-modal-overlay');
    
    if (articleModal) {
        articleModal.classList.remove('active');
        articleModal.style.removeProperty('display');
    }
    if (modalOverlay && modalOverlay !== articleModal) {
        modalOverlay.classList.remove('active');
        modalOverlay.style.removeProperty('display');
    }
    
    document.body.style.overflow = ''; // Kembalikan scroll utama
}

// Minimal toast helper used by storage fallback to inform users about backup downloads
function showToast(msg, duration = 2000) {
  try {
    let t = document.getElementById('copilot-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'copilot-toast';
      // PERBAIKAN: elemen ini sebelumnya tidak punya aturan CSS sama sekali,
      // sehingga menjadi elemen block statis biasa yang ikut menambah tinggi
      // dokumen <body> setiap kali dibuat. Di browser mobile, penambahan tinggi
      // dokumen ini bisa memicu address bar sembul/hilang, yang mengubah nilai
      // 100dvh secara tiba-tiba -> menyebabkan #recipe (lihat CSS #recipe.recipe-modal)
      // mengecil dan bottom navbar terlihat "bergeser". Fix: kunci posisinya sebagai
      // overlay fixed yang keluar dari alur dokumen, tidak memengaruhi layout lain.
      t.style.position = 'fixed';
      t.style.left = '50%';
      t.style.bottom = 'calc(84px + env(safe-area-inset-bottom))';
      t.style.transform = 'translateX(-50%) translateY(-8px)';
      t.style.background = 'rgba(78, 52, 46, 0.92)';
      t.style.color = '#fff';
      t.style.padding = '10px 18px';
      t.style.borderRadius = '20px';
      t.style.fontSize = '0.82rem';
      t.style.fontWeight = '600';
      t.style.boxShadow = '0 6px 20px rgba(0,0,0,0.18)';
      t.style.zIndex = '99999';
      t.style.maxWidth = '85vw';
      t.style.textAlign = 'center';
      t.style.opacity = '0';
      t.style.pointerEvents = 'none';
      t.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    // apply style via existing style block; toggle via attribute/class
    t.style.pointerEvents = 'auto';
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._hideTimeout);
    t._hideTimeout = setTimeout(function () {
      if (t) {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(-8px)';
        t.style.pointerEvents = 'none';
      }
    }, duration);
  } catch (e) {
    // non-fatal
    console.warn('showToast error', e);
  }
}

// PERBAIKAN: toast KHUSUS untuk peringatan waktu proofing lebih (over-proofing).
// Beda dari showToast() biasa (dipakai di banyak tempat lain untuk pesan singkat generik):
// - Tombol × untuk menutup secara eksplisit
// - TIDAK hilang otomatis (showToast biasa terlalu cepat hilang untuk pesan sepenting ini,
//   membuat pengguna tak sempat membaca atau bereaksi)
// - Menutup toast = mengakui alarm: suara langsung dihentikan DAN hitungan "waktu kelebihan"
//   yang terus berjalan naik ikut dibekukan (interval dihentikan), tanpa mereset sesi proofing
//   sepenuhnya (tombol RESET PROOFING tetap terpisah untuk itu).
function tampilkanToastOvertime(pesan) {
    try {
        let t = document.getElementById('overtime-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'overtime-toast';
            t.style.position = 'fixed';
            t.style.left = '50%';
            t.style.bottom = 'calc(84px + env(safe-area-inset-bottom))';
            t.style.transform = 'translateX(-50%) translateY(0)';
            t.style.background = 'rgba(211, 47, 47, 0.96)'; // merah — selaras warna peringatan over-proofing
            t.style.color = '#fff';
            t.style.padding = '12px 14px 12px 16px';
            t.style.borderRadius = '14px';
            t.style.fontSize = '0.8rem';
            t.style.fontWeight = '600';
            t.style.lineHeight = '1.35';
            t.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
            t.style.zIndex = '99999';
            t.style.maxWidth = '85vw';
            t.style.display = 'flex';
            t.style.alignItems = 'center';
            t.style.gap = '10px';
            t.style.opacity = '0';
            t.style.pointerEvents = 'none';
            t.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            document.body.appendChild(t);
        }

        clearTimeout(t._hideTimeout); // batalkan sisa auto-hide toast versi lama jika ada

        t.innerHTML = '';
        const teks = document.createElement('span');
        teks.textContent = pesan;
        teks.style.flex = '1';

        const tombolTutup = document.createElement('button');
        tombolTutup.type = 'button';
        tombolTutup.textContent = '✕';
        tombolTutup.setAttribute('aria-label', 'Tutup, hentikan alarm & hitungan kelebihan waktu');
        tombolTutup.style.background = 'rgba(255,255,255,0.2)';
        tombolTutup.style.border = 'none';
        tombolTutup.style.color = '#fff';
        tombolTutup.style.width = '26px';
        tombolTutup.style.height = '26px';
        tombolTutup.style.minWidth = '26px';
        tombolTutup.style.borderRadius = '50%';
        tombolTutup.style.fontSize = '0.75rem';
        tombolTutup.style.cursor = 'pointer';
        tombolTutup.style.flexShrink = '0';

        const sembunyikanToastOvertime = () => {
            t.style.opacity = '0';
            t.style.pointerEvents = 'none';

            // Hentikan suara alarm yang masih berbunyi
            if (typeof hentikanSemuaSuaraAlarm === 'function') {
                hentikanSemuaSuaraAlarm();
            }
            // Bekukan hitungan "waktu kelebihan" (bukan reset total — cuma hentikan interval-nya,
            // supaya display berhenti naik tapi sesi belum dianggap direset; RESET PROOFING
            // tetap tombol terpisah untuk mengakhiri sesi sepenuhnya)
            if (typeof timerInterval !== 'undefined' && timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        };

        tombolTutup.onclick = sembunyikanToastOvertime;
        t.appendChild(teks);
        t.appendChild(tombolTutup);

        t.style.pointerEvents = 'auto';
        t.style.opacity = '1';
        // Sengaja TIDAK diberi auto-hide — toast tetap tampil sampai pengguna menutupnya sendiri,
        // supaya tidak lagi "terlalu singkat" seperti keluhan sebelumnya.
    } catch (e) {
        console.warn('tampilkanToastOvertime error', e);
    }
}
window.tampilkanToastOvertime = tampilkanToastOvertime;

// ==========================================
// FUNGSI PENGIRIMAN SARAN KE SUPABASE + POP-UP
// ==========================================
async function kirimSaran() {
    const type = document.getElementById('feedback-type').value;
    const text = document.getElementById('feedback-text').value.trim();
    const btn = document.querySelector('button[onclick="kirimSaran()"]');
    
    if (!text) {
        alert("Pesan tidak boleh kosong. Silakan tuliskan masukan Anda.");
        return;
    }

    const originalText = btn.innerText;
    btn.innerText = "MENGIRIM...";
    btn.disabled = true;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase.from('app_feedback').insert([
            { 
              user_id: user ? user.id : null, 
              kategori: type, 
              pesan: text,
              created_at: new Date().toISOString()
            }
        ]);

        if (error) throw error;

        // 1. Reset form terlebih dahulu
        document.getElementById('feedback-text').value = '';
        
        // 2. Tutup modal form "Berikan Saran"
        if (typeof toggleModal === 'function') {
            toggleModal('feedback-modal'); 
        }

        // 3. Tampilkan Pop-up Konfirmasi Berhasil yang Elegan
        tampilkanPopupSukses("Terima Kasih!", "Saran atau laporan Anda telah berhasil dikirim ke sistem kami.");

    } catch (err) {
        console.error("Gagal mengirim saran ke Supabase:", err);
        alert("Gagal mengirim pesan: " + err.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Fungsi pendukung untuk memunculkan pop-up
function tampilkanPopupSukses(judul, pesan) {
    // Cek apakah elemen pop-up sudah ada, jika belum buat secara otomatis
    let popupOverlay = document.getElementById('custom-success-popup');
    if (!popupOverlay) {
        popupOverlay = document.createElement('div');
        popupOverlay.id = 'custom-success-popup';
        popupOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
            justify-content: center; z-index: 99999; opacity: 0; transition: opacity 0.3s ease;
        `;
        popupOverlay.innerHTML = `
            <div style="background: #fff; padding: 24px; border-radius: 16px; width: 85%; max-width: 320px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transform: scale(0.9); transition: transform 0.3s ease;">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">✨</div>
                <h3 id="popup-title" style="margin: 0 0 8px 0; color: #3e2723; font-size: 1.1rem; font-weight: bold;"></h3>
                <p id="popup-message" style="margin: 0 0 20px 0; color: #666; font-size: 0.85rem; line-height: 1.4;"></p>
                <button onclick="tutupPopupSukses()" style="background: #e67e22; color: white; border: none; width: 100%; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(230, 126, 34, 0.3);">OK, MENGERTI</button>
            </div>
        `;
        document.body.appendChild(popupOverlay);
    }

    document.getElementById('popup-title').innerText = judul;
    document.getElementById('popup-message').innerText = pesan;

    popupOverlay.style.display = 'flex';
    setTimeout(() => {
        popupOverlay.style.opacity = '1';
        popupOverlay.firstElementChild.style.transform = 'scale(1)';
    }, 10);
}

function tutupPopupSukses() {
    const popupOverlay = document.getElementById('custom-success-popup');
    if (popupOverlay) {
        popupOverlay.style.opacity = '0';
        popupOverlay.firstElementChild.style.transform = 'scale(0.9)';
        setTimeout(() => {
            popupOverlay.style.display = 'none';
        }, 300);
    }
}

// ============================================================
// FUNGSI PENCARIAN DAN TANYA AI UNTUK TIPS TEKNIS ADONAN
// ============================================================
// Izinkan pengguna menekan tombol Enter di keyboard untuk memanggil AI
function handleTipsEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        tanyaAITips();
    }
}

async function tanyaAITips() {
    const inputEl = document.getElementById('tips-search-input');
    const resultBox = document.getElementById('ai-tips-result');
    const pertanyaan = inputEl.value.trim();

    if (!pertanyaan) {
        alert("Ketikkan masalah adonan atau pertanyaan Anda terlebih dahulu.");
        return;
    }

    resultBox.style.display = "block";
    resultBox.innerHTML = `
        <div style='font-size:0.85rem; color:#6c3483; text-align:center;'>
            <i class='fas fa-circle-notch fa-spin'></i> AI sedang memformulasikan solusi untuk "${pertanyaan}"...
        </div>`;

    try {
        // Prompt khusus Asisten Tips
        const aiPrompt = `
Bertindaklah sebagai Asisten Teknis Artisan Bakery.
Pengguna bertanya atau mengalami kendala berikut: "${pertanyaan}"

Berikan jawaban teknis, padat, dan solutif.
ATURAN FORMAT: Gunakan paragraf naratif untuk penjelasan, gunakan sub-judul dengan titik dua (contoh: "Solusi Cepat:"), gunakan simbol (-) HANYA untuk list, dan angka (1.) HANYA untuk urutan langkah.`;

        // Panggil endpoint yang sama dengan fitur Live Analysis
        const response = await fetch(getVercelApiUrl('/api/ai-analyze'), { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptContext: aiPrompt }) 
        });

        if (!response.ok) throw new Error(`Gangguan server: ${response.status}`);
        const data = await response.json();

        // Render hasil menggunakan fungsi formatting cerdas sebelumnya
        resultBox.innerHTML = `
            <div style="font-weight:900; color:#6c3483; margin-bottom:12px; font-size:0.85rem; text-align:center; background:#f5eef8; padding:8px; border-radius:6px; letter-spacing:0.5px;">
                <i class="fas fa-robot"></i> JAWABAN ASISTEN AI
            </div>
            <div>${formatHasilAI(data.result)}</div>
            <button onclick="document.getElementById('ai-tips-result').style.display='none'" style="margin-top:14px; width:100%; padding:10px; border-radius:8px; background:#f1f5f9; border:none; color:#475569; font-weight:bold; cursor:pointer;">
                Tutup Jawaban
            </button>
        `;

    } catch (error) {
        resultBox.innerHTML = `
            <div style="background:#fee2e2; padding:10px; border-radius:8px; color:#b91c1c; font-size:0.75rem;">
                ⚠️ Gagal terhubung ke AI Asisten: ${error.message}
            </div>`;
    }
}

// ============================================================
// INISIALISASI, STATE, DAN PENGIKAT EVENT (URUTAN ASLI DIPERTAHANKAN)
// ============================================================

    // Browser/file:// fallback: native Capacitor and idb helpers are optional.
    const capacitorPlugins = window.Capacitor?.Plugins || {};
    const App = capacitorPlugins.App || { addListener: () => {}, minimizeApp: () => {} };
    const LocalNotifications = capacitorPlugins.LocalNotifications || {
        requestPermissions: async () => ({ display: 'denied' }),
        checkPermissions: async () => ({ display: 'denied' }),
        schedule: async () => {},
        cancel: async () => {}
    };
    const Preferences = capacitorPlugins.Preferences || { get: async ({ key }) => ({ value: localStorage.getItem(key) }), set: async ({ key, value }) => localStorage.setItem(key, value), remove: async ({ key }) => localStorage.removeItem(key) };
    const Share = capacitorPlugins.Share || { share: async ({ text, title }) => navigator.share ? navigator.share({ text, title }) : undefined };
    const Filesystem = capacitorPlugins.Filesystem || { writeFile: async () => { throw new Error('Filesystem native tidak tersedia'); } };
    const Directory = window.Capacitor?.Directory || { Documents: 'DOCUMENTS' };
    const Encoding = window.Capacitor?.Encoding || { UTF8: 'utf8' };
    const openDB = window.idb?.openDB || (async () => { throw new Error('IndexedDB helper tidak tersedia'); });

    const i18n = {
        "id": {
            "app_title": "Timer Proofer",
            "btn_login": "Masuk",
            "btn_register": "Daftar",
            "tab_recipe": "Resep"
        },
        "en": {
            "app_title": "Proofer Timer",
            "btn_login": "Login",
            "btn_register": "Register",
            "tab_recipe": "Recipe"
        }
    };

    const RESEP_LIST_KEY = 'premium_saved_recipes';
    const RESEP_LEGACY_KEY = 'premium_saved_recipe';
    const FILE_RESEP_PATH = 'data/resep_sourdough.json';
    const MAX_RESEP_TERSIMPAN = 10;
    window.MAX_RESEP_TERSIMPAN = MAX_RESEP_TERSIMPAN;

window.setLanguage = function(lang) {
    // Potong kode bahasa (misal 'id-ID' jadi 'id', 'zh-CN' jadi 'zh')
    const cleanLang = String(lang || 'id').split('-')[0].toLowerCase();
    // Kamus lokal hanya ada untuk sebagian bahasa. Bahasa lain dibiarkan tetap
    // teks asli (Indonesia) agar Google Translate menerjemahkan dari sumber yang benar.
    const dictLang = i18n[cleanLang] ? cleanLang : 'id';

    // CATATAN: sengaja TIDAK menulis localStorage 'app_lang' di sini.
    // Sebelumnya pilihan user (mis. 'ja') ditimpa fallback ('en') sehingga
    // setelah reload pilihan bahasa "hilang". Penyimpanan dilakukan oleh pilihBahasaGlobal().

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[dictLang] && i18n[dictLang][key]) {
            el.innerText = i18n[dictLang][key];
        }
    });

    // Bila paket offline aktif, atribut lang/dir diatur oleh offline-i18n.js (mis. dir="rtl" untuk Arab)
    if (!(window.OfflineI18n && window.OfflineI18n.current() !== 'id')) document.documentElement.lang = dictLang;
};

document.addEventListener('DOMContentLoaded', initLanguage);

window.buatResepBaruForm = buatResepBaruForm;

window.buatResepBaruForm = function() {
    if (confirm("Membuat resep baru akan mengosongkan nama resep, pengaturan, daftar bahan, dan langkah produksi saat ini. Lanjutkan?")) {
        
        // 1. Kosongkan input nama resep
        const recipeNameInput = document.getElementById('recipe-save-name');
        if (recipeNameInput) recipeNameInput.value = '';

        // 2. Kosongkan kolom Tepung, Porsi, dan Harga/Pcs
        const baseFlour = document.getElementById('base-flour');
        if (baseFlour) baseFlour.value = '';

        const recipeYield = document.getElementById('recipe-yield');
        if (recipeYield) recipeYield.value = '';

        const hargaJual = document.getElementById('input-harga-jual');
        if (hargaJual) hargaJual.value = '';

        // 3. Kosongkan data bahan
        if (typeof window.resetBakeryIngredients === 'function') {
            window.resetBakeryIngredients();
        } else {
            window.bakeryIngredients = [];
            localStorage.removeItem('bakeryIngredients');
        }

        // 4. BUG FIX: Reset State Langkah-langkah Produksi yang BENAR
        window.activeRecipeSteps = []; // Ini variabel utama yang dipakai untuk render

        if (typeof window.langkahProduksi !== 'undefined') {
            window.langkahProduksi = []; // Bersihkan juga variabel lama jika masih tersisa
        }

        // 5. Perbarui tampilan tabel dan kalkulasi HPP
        if (typeof window.renderRecipeTable === 'function') window.renderRecipeTable();
        if (typeof window.hitungHPP === 'function') window.hitungHPP();
        
        // 6. BUG FIX: Panggil fungsi render agar placeholder "+ Buat Langkah Pertama" muncul kembali
        if (typeof window.renderLangkahProduksi === 'function') window.renderLangkahProduksi();
    }
};


window.simpanResepKeDatabase = simpanResepKeDatabase;
/* ========================================= */


    /* FUNGSI HALAMAN LOGIN */
// Inisialisasi Klien Supabase
/* FUNGSI HALAMAN LOGIN */
// Inisialisasi Klien Supabase
const SUPABASE_URL = 'https://rshnirlkjicnklrybjpf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzaG5pcmxramljbmtscnlianBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjM0NjAsImV4cCI6MjA5OTY5OTQ2MH0.v5FXEfIQ1hLDLQmWgS9tv0f6OD2VqMdgius_cRjV9FI';

// 1. Ekstrak createClient secara aman dari library CDN
const { createClient } = window.supabase || {};

if (typeof createClient === 'function') {
    // 2. Inisialisasi Instance Client Supabase ke global window.supabase
    window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Listener auth TUNGGAL untuk gamifikasi.
    // PENTING: jangan `await` panggilan Supabase di dalam callback ini (bisa deadlock pada lock auth);
    // pekerjaan dijadwalkan lewat setTimeout agar callback selesai lebih dulu.
    if (window.supabase && window.supabase.auth) {
        window.supabase.auth.onAuthStateChange((event, session) => {
            if (session && session.user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
                const uid = session.user.id;
                if (typeof GamificationModule !== 'undefined' && typeof GamificationModule.init === 'function') {
                    setTimeout(() => GamificationModule.init(window.supabase, uid), 0);
                }
            } else if (event === 'SIGNED_OUT') {
                if (typeof GamificationModule !== 'undefined' && typeof GamificationModule.reset === 'function') {
                    setTimeout(() => GamificationModule.reset(), 0);
                }
            }
        });
    }
} else {
    console.error('Gagal memuat Supabase SDK. Pastikan library CDN Supabase sudah dimuat.');
}

// Event listener saat koneksi internet pulih (online)
window.addEventListener('online', async () => {
    console.log("Koneksi pulih! Memulai sinkronisasi data lokal ke Supabase...");
    
    // Eksekusi aman untuk GamificationModule.flush()
    if (typeof GamificationModule !== 'undefined' && typeof GamificationModule.flush === 'function') {
        GamificationModule.flush();
    }
    
    // Eksekusi aman untuk syncLocalDataToSupabase()
    if (typeof syncLocalDataToSupabase === 'function') {
        try {
            await syncLocalDataToSupabase();
        } catch (err) {
            console.error("Gagal melakukan sinkronisasi data lokal ke Supabase:", err);
        }
    }
});


// Deklarasikan variabel status di luar fungsi agar dikenali secara global
let isRegisterMode = false;

// ⚠️ WAJIB: Ekspos fungsi agar bisa dibaca oleh atribut onclick="..." di HTML (Cukup dipanggil 1 kali saja)
window.switchMode = switchAuthTab;

// Pastikan fungsi terdaftar secara global jika menggunakan module
window.togglePasswordVisibility = togglePasswordVisibility;

// Variabel global untuk menyimpan email sementara
let pendingVerificationEmail = "";

// Ekspos fungsi ke atribut HTML global
window.handleAuthSubmit = handleAuthSubmit;
window.verifyEmailOtp = verifyEmailOtp;
window.cancelVerification = cancelVerification;

window.signInWithProvider = signInWithProvider; // Ekspos ke global

window.signInWithWhatsApp = signInWithWhatsApp; // Ekspos ke global
    /* AKHIR FUNGSI HALAMAN LOGIN */




// Ekspos ke global object agar dapat diakses oleh Atribut onclick di HTML
window.hapusDataProfilLokal = hapusDataProfilLokal;
window.hapusAkunPermanen = hapusAkunPermanen;


window.renderLangkahProduksi = renderLangkahProduksi;

window.tambahBahanBaruDinamis = function() {
    const name = document.getElementById('new-ing-name')?.value.trim();
    const category = document.getElementById('new-ing-type')?.value || 'Bahan Kering';
    const ratio = parseFloat(document.getElementById('new-ing-ratio')?.value) || 0;
    const price = parseFloat(document.getElementById('new-ing-price')?.value) || 0;
    const pack = parseFloat(document.getElementById('new-ing-pack')?.value) || 1000;

    if (!name) { 
        alert("Silakan isi nama bahan baku terlebih dahulu!"); 
        return; 
    }

    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const isFlour = (category === 'Bahan Kering' && ratio === 100);

    window.addBakeryIngredient({
        id: newId,
        name: name,
        type: (category === 'Bahan Toping' || category === 'Kemasan') ? 'Topping' : 'Dough',
        category: category,
        ratio: ratio,
        price: price,
        pack: pack,
        isFlour: isFlour
    });
    
    // Reset Form Input
    document.getElementById('new-ing-name').value = '';
    document.getElementById('new-ing-ratio').value = '';
    document.getElementById('new-ing-price').value = '';
    document.getElementById('new-ing-pack').value = '';
    perbaruiPreviewBahanBaru();
};

window.tambahLangkahProduksi = tambahLangkahProduksi;

window.hapusLangkahProduksi = hapusLangkahProduksi;

window.pindahLangkah = pindahLangkah;

window.muatTemplateLangkahDonat = muatTemplateLangkahDonat;

/* FUNGSI HALAMAN LOGIN*/
document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('loginBtn');
    
    // Check if element exists to avoid errors (Pengecekan ini sudah sangat bagus)
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            // Simulasi proses login berhasil, ubah kelas body
            document.body.classList.remove('logged-out');
            document.body.classList.add('logged-in');
        });
    }
});
/* == AKHIR FUNGSI HALAMAN LOGIN = */

window.addEventListener('DOMContentLoaded', () => {
    // Panggil inisialisasi bahasa
    initLanguage();

    // Event listener untuk elemen switcher
    const customSwitcher = document.getElementById('custom-lang-switcher');
    if (customSwitcher) {
        customSwitcher.addEventListener('change', (e) => {
            window.setLanguage(e.target.value);
        });
    }

    // Auto-fill login
    const savedEmail = localStorage.getItem('saved_email');
    const savedPass = localStorage.getItem('saved_pass');
    if (savedEmail && savedPass) {
        const emailEl = document.getElementById('input-email');
        const passEl = document.getElementById('input-password');
        const rememberEl = document.getElementById('remember-me-checkbox');
        
        if (emailEl) emailEl.value = savedEmail;
        if (passEl) passEl.value = savedPass;
        if (rememberEl) rememberEl.checked = true;
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const savedEmail = localStorage.getItem('saved_email');
    const savedPass = localStorage.getItem('saved_pass');
    if (savedEmail && savedPass) {
        document.getElementById('input-email').value = savedEmail; // Sesuaikan ID input email Anda
        document.getElementById('input-password').value = savedPass;
        document.getElementById('remember-me-checkbox').checked = true;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Memeriksa sesi Supabase aktif saat aplikasi direfresh
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            document.body.classList.remove('logged-out');
            document.body.classList.add('logged-in');
            
            // Tarik data cloud -> Push data antrean offline -> Mulai dengar realtime server
            sinkronisasiAwalDariSupabase().then(() => {
                syncLocalDataToSupabase();
            });
            initSupabaseRealtime();
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    renderLangkahProduksi();
});

window.renderInventoryCards = function() {
    const container = document.getElementById('dynamic-inventory-cards');
    if (!container) return;

    // Ambil data bahan dari state global resep
    const ingredients = window.bakeryIngredients || [];
    container.innerHTML = '';

    if (ingredients.length === 0) {
        container.innerHTML = `<div class="log-empty">Tidak ada stok bahan tersedia.</div>`;
        return;
    }

    // Definisi bobot prioritas kategori standar produksi bakery
    // Angka lebih kecil akan diposisikan lebih dulu di bagian atas
    const categoryPriority = {
        'utama': 1,      // Tepung terigu, dll.
        'tepung': 1,
        'tambahan': 2,   // Gula, Susu, Telur, Ragi, Garam, Butter
        'cairan': 3,     // Air Es, Minyak Goreng
        'minyak': 3,
        'toping': 4,     // Glaze, Meses
        'kemasan': 5     // Kotak dus, dll.
    };

    // Fungsi helper untuk mendeteksi peringkat kategori
    const getCategoryRank = (categoryName) => {
        if (!categoryName) return 99; // Jika kategori tidak diisi, taruh di paling bawah
        const lower = categoryName.toLowerCase();
        for (const key in categoryPriority) {
            if (lower.includes(key)) return categoryPriority[key];
        }
        return 99;
    };

    // Urutkan berdasarkan bobot kategori terlebih dahulu, 
    // sehingga Minyak/Cairan atau bahan lain otomatis masuk ke kelompoknya yang tepat
    const sortedIngredients = [...ingredients].sort((a, b) => {
        const catA = getCategoryRank(a.category || a.kategori);
        const catB = getCategoryRank(b.category || b.kategori);
        
        if (catA !== catB) {
            return catA - catB;
        }
        
        // Jika kategori sama, urutkan berdasarkan abjad nama bahan
        const nameA = (a.name || a.nama || '').toLowerCase();
        const nameB = (b.name || b.nama || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    // Render kartu inventaris yang sudah terstruktur rapi
    sortedIngredients.forEach(item => {
        const stock = Number(item.pack ?? item.stok ?? 0);
        
        // Logika Status Badge profesional
        let statusClass = stock <= 500 ? 'stock-low' : (stock <= 1500 ? 'stock-medium' : 'stock-good');
        let statusText = stock <= 500 ? 'Rendah' : (stock <= 1500 ? 'Cukup' : 'Aman');

        const card = document.createElement('div');
        card.className = 'recipe-slide';
        card.style.cssText = "background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(242, 210, 169, 0.5);";
        
        card.innerHTML = `
            <div>
                <h4 style="margin: 0; font-size: 0.9rem; color: var(--chocolate); font-weight: 700;">${item.name || item.nama}</h4>
                <p style="margin: 2px 0 0; font-size: 0.75rem; color: #8d6e63;">Stok: ${stock} ${item.packUnit || 'g'}</p>
            </div>
            <span class="inventory-status-badge ${statusClass}">${statusText}</span>
        `;
        
        container.appendChild(card);
    });
};

// ==============================================




//==============================================

window.bagikanAplikasi = bagikanAplikasi;

// Data Default Profil (Fallback jika storage kosong)
const defaultProfile = {
    name: "name",
    bakery: "baker",
    phone: "_",
    email: "_"
};


// Daftarkan ke objek window agar aman dipanggil dari inline onclick
window.loadDynamicProfile = loadDynamicProfile;

// loadDynamicProfile dipanggil otomatis dari toggleModal('user-modal') saat modal profil dibuka

// =============================================

const ProfileService = {

    getRecipes() {
        const recipes = readRecipesFromStorage();
        window.recipes = recipes;
        return recipes;
    },

    getIngredients() {
        return Array.isArray(window.bakeryIngredients)
            ? window.bakeryIngredients
            : [];
    },

    getTimers() {
        const logs = readProofingLogsFromStorage();
        window.timerHistory = logs;
        return logs;
    },

    getProofings() {
        return readProofingLogsFromStorage();
    }

};

window.openHelpSubModal = openHelpSubModal;


window.openRecipesFromProfile = openRecipesFromProfile;



window.openEditProfile = openEditProfile;
window.closeEditProfile = closeEditProfile;
// =============================================

window.saveProfile = saveProfile;
// =============================================


// Panggil fungsi ini saat inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', () => {
    // Form login sudah memakai onsubmit inline (lihat #auth-form); listener kedua di sini
    // membuat handleAuthSubmit terpanggil DUA kali per submit, jadi dihapus.

    // Jalankan sapaan AI & sinkronisasi statistik dengan aman setelah DOM siap
    updateGreeting();
    tampilkanSapaanAwalAI();
    // loadDynamicProfile dipanggil otomatis saat user-modal dibuka via toggleModal()
});
//===============================================

// Daftarkan ke global window agar dapat diakses oleh atribut onclick HTML
window.bukaStatistikDetail = bukaStatistikDetail;

// TIPS TERBAIK: Jangan pakai setTimeout jika memungkinkan. 
// Panggil fungsi `tampilkanSapaanAwalAI()` ini tepat di dalam fungsi 
// Fetch API Cuaca Anda, tepat setelah data suhu berhasil dimasukkan ke elemen '#temp-val'.


window.escapeHtmlResep = escapeHtmlResep;

window.jadwalkanAlarmProofing = jadwalkanAlarmProofing;

if (window.Capacitor) {
            App.addListener('backButton', () => {
                const recipeListModal = document.getElementById('recipe-list-modal');
                if (recipeListModal && recipeListModal.classList.contains('active')) {
                    window.tutupDaftarResepTersimpan();
                    return;
                }
                const activeModal = document.querySelector('.unified-modal.active, .page-modal.active, .recipe-modal.active');
                if (activeModal) {
                    activeModal.classList.remove('active');
                } else {
                    App.minimizeApp();
                }
            });
        }
// 1. TARUH KODE BARU ANDA DI SINI (DI BAGIAN PALING ATAS SCRIPT)
if ('serviceWorker' in navigator) {
    let refreshing = false; // Pengunci agar tidak loop
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}
window.isFetchingLocation = window.isFetchingLocation ?? false;       // Pengunci agar tidak berjalan double
window.locationPermissionDenied = window.locationPermissionDenied ?? false; // Penanda jika user sudah pernah menolak GPS
// =========================================================
// SISTEM NOTIFIKASI — TIMER PROOFER
// =========================================================
const NotifSystem = (() => {
    let notifs = [];
    try {
        const parsed = JSON.parse(localStorage.getItem('tp_notifs') || '[]');
        notifs = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        notifs = [];
    }
    let filterAktif = 'semua';

    function simpan() {
        // Simpan max 50 notifikasi terakhir
        notifs = notifs.slice(0, 50);
        localStorage.setItem('tp_notifs', JSON.stringify(notifs));
    }

    function waktuSekarang() {
        return new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    }

    function tambah(kategori, judul, deskripsi, ikon) {
        const n = {
            id: Date.now(),
            kategori, judul, deskripsi, ikon,
            waktu: waktuSekarang(),
            dibaca: false
        };
        notifs.unshift(n);
        simpan();
        renderList();
        updateBadge();
    }

    function updateBadge() {
        const badge = document.getElementById('global-notif-badge');
        if (!badge) return;
        const unread = notifs.filter(n => !n.dibaca).length;
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }

    function renderList() {
        const container = document.getElementById('notif-list-container');
        const empty = document.getElementById('notif-empty-msg');
        if (!container) return;

        // Bersihkan daftar visual lama secara total
        container.innerHTML = '';

        // Sinkronisasi filter kategori secara presisi
        const tampil = filterAktif === 'semua'
            ? notifs
            : notifs.filter(n => {
                const kat = n.kategori || n.category || '';
                return kat.toLowerCase() === filterAktif.toLowerCase();
            });

        if (tampil.length === 0) {
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';

        tampil.forEach(n => {
            const div = document.createElement('div');
            div.className = 'notif-item' + (n.dibaca ? '' : ' unread');
            div.id = `notif-${n.id}`;
            div.dataset.id = n.id;
            
            // Menggabungkan string literal HTML secara utuh & aman
            div.innerHTML = `
                <div class="notif-icon-box" style="cursor:default">${n.ikon || '🔔'}</div>
                <div class="notif-body" style="cursor:pointer" onclick="NotifSystem.baca('${n.id}')">
                    <div class="notif-title">${n.judul}</div>
                    <div class="notif-desc">${n.deskripsi}</div>
                    <div class="notif-time">${n.waktu || ''}</div>
                </div>
                <button class="btn-hapus-notif-cepat" onclick="event.stopPropagation(); NotifSystem.hapus('${n.id}')" title="Hapus notifikasi ini"
                    style="background:none;border:none;font-size:1rem;color:#bbb;cursor:pointer;padding:4px 6px;align-self:flex-start;flex-shrink:0;line-height:1;"
                    onmouseover="this.style.color='#e74c3c'" onmouseout="this.style.color='#bbb'">✕</button>
            `;
            container.appendChild(div);
        });
    }

    function filter(kat, btnEl) {
        filterAktif = kat;
        document.querySelectorAll('.notif-tab-btn').forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
        renderList();
    }

    function bacaSemua() {
        notifs.forEach(n => n.dibaca = true);
        simpan(); renderList(); updateBadge();
    }

    function baca(id) {
        const targetId = Number(id);
        const n = notifs.find(x => x.id === targetId || x.id === id);
        if (n) { 
            n.dibaca = true; 
            simpan(); 
            renderList(); 
            updateBadge(); 
        }
    }

    function hapus(id) {
        const targetId = Number(id);
        notifs = notifs.filter(n => n.id !== targetId && n.id !== id);
        simpan(); 
        updateBadge();
        
        const visualItem = document.getElementById(`notif-${id}`);
        if (visualItem) visualItem.remove();
        
        const container = document.getElementById('notif-list-container');
        if (container && container.querySelectorAll('.notif-item').length === 0) {
            const empty = document.getElementById('notif-empty-msg');
            if (empty) empty.style.display = 'block';
        }
    }

    function hapusSemua() {
        notifs = [];
        filterAktif = 'semua';
        simpan(); renderList(); updateBadge();
        document.querySelectorAll('.notif-tab-btn').forEach((b, i) => {
            b.classList.toggle('active', i === 0);
        });
    }

    // Inisialisasi awal saat aplikasi dimuat
    setTimeout(() => { updateBadge(); }, 100);

    // Kembalikan semua fungsi lengkap agar bisa diakses di luar modul
    return { 
        tambah, 
        renderList, 
        updateBadge, 
        filter, 
        bacaSemua, 
        baca, 
        hapus, 
        hapusSemua 
    };
})();

// Daftarkan ke skop global window agar aman diakses dari atribut onclick HTML
window.NotifSystem = NotifSystem;

// Daftarkan ke global window hanya SEKALI di paling bawah file
window.filterNotif = filterNotif;
window.bacaSemua = bacaSemua;
window.closeNotifModal = closeNotifModal;

// =========================================================
// LOGIKA SLIDER ARTIKEL OTOMATIS & SWIPE MANUAL
// =========================================================
// DATABASE DATA TEKS ARTIKEL LENGKAP (OFFLINE & ONLINE READY)
const dataArtikelLengkap = {
    1: {
        badge: "💡 Tips Proofer",
        title: "Kunci Utama Menjaga Fermentasi Donat Tetap Konsisten",
        content: `
            <p>Fermentasi atau <i>proofing</i> adalah tahap paling krusial dalam pembuatan donat yang empuk dan memiliki ring yang cantik. Ragi (Saccharomyces cerevisiae) membutuhkan lingkungan yang spesifik untuk memproduksi gas karbon dioksida secara stabil.</p>
            <p><b>1. Rentang Suhu Ideal:</b> Pastikan proofer Anda berada di kisaran 28°C hingga 35°C. Jika suhu di bawah 25°C, metabolisme ragi melambat secara drastis, membuat waktu tunggu menjadi terlalu lama. Sebaliknya, suhu di atas 40°C dapat membunuh sel ragi dan membuat donat terasa asam.</p>
            <p><b>2. Kelembaban (Humidity) Udara:</b> Jaga kelembaban di angka 70% - 80%. Kelembaban yang pas mencegah permukaan kulit adonan donat menjadi kering (crusting). Kulit adonan yang kering akan mengunci gas di dalam, memicu retakan saat donat digoreng.</p>
            <p><b>Tips Tambahan :</b> Selalu catat kombinasi waktu dan suhu yang berhasil di aplikasi ini sebagai referensi produksi harian Anda!</p>
        `
    },
    2: {
        badge: "🍩 Sains Adonan",
        title: "Mengenal Proses Autolisis: Teknik Rahasia Donat Lembut Tanpa Pegal",
        content: `
            <p>Autolisis adalah teknik mengistirahatkan campuran tepung terigu dan air (atau susu) selama beberapa waktu sebelum ragi, garam, dan lemak dimasukkan ke dalam adonan.</p>
            <p><b>Bagaimana Autolisis Bekerja?</b><br>Saat terigu bertemu dengan cairan, enzim alami di dalam tepung (protease dan amilase) akan aktif secara mandiri. Enzim ini akan memecah protein menjadi rantai gluten yang lentur dan mengurai pati menjadi gula sederhana yang siap dikonsumsi ragi nanti.</p>
            <p><b>Manfaat Utama Teknik Ini:</b></p>
            <ul>
                <li>Waktu pengulenan (*kneading*) berkurang hingga 50%, menghemat tenaga mixer atau tangan Anda.</li>
                <li>Serat atau remah (*crumb*) donat yang dihasilkan menjadi jauh lebih halus, sutra, dan empuk tahan lama.</li>
                <li>Adonan menjadi lebih melar dan mudah dicetak tanpa membal kembali.</li>
            </ul>
            <p>Cobalah lakukan autolisis selama 30 - 60 menit untuk tepung protein tinggi sebelum memulai perhitungan timer di aplikasi ini.</p>
        `
    },
    3: {
        badge: "⚠️ Solusi Over-proofing",
        title: "Tanda Adonan Terlalu Lama Mengembang dan Cara Mengatasinya",
        content: `
            <p>Over-proofing terjadi ketika ragi mengonsumsi seluruh nutrisi gula di dalam adonan dan menghasilkan gas yang melebihi kapasitas kekuatan dinding gluten.</p>
            <p><b>Ciri-Ciri Utama Donat Over-proof:</b></p>
            <ul>
                <li><b>Tes Tekan:</b> Saat permukaan adonan ditekan lembut dengan ujung jari, bekas tekanan tidak kembali naik, melainkan tetap ambles ke dalam.</li>
                <li><b>Visual:</b> Adonan terlihat sangat mengembang penuh, namun teksturnya terlihat rapuh, berpori besar, dan berkeriput saat digoyangkan.</li>
                <li><b>Aroma:</b> Tercium bau asam menyengat seperti aroma tapai yang terlalu matang.</li>
            </ul>
            <p><b>Solusi Penyelamatan:</b> Jika adonan terlanjur over-proof, jangan digoreng dengan suhu minyak standar karena donat akan menyerap minyak sangat banyak dan langsung mengempis kempot. Turunkan suhu minyak goreng sedikit lebih rendah, dan goreng dengan durasi sesingkat mungkin demi mempertahankan bentuk ring.</p>
        `
    }
};


// Daftarkan ke global window agar bisa dipanggil dari HTML onclick
window.tutupArtikelSecaraAman = tutupArtikelSecaraAman;

// Menutup modal secara otomatis jika user menyentuh area background hitam transparan di luar modal
window.addEventListener('click', (event) => {
    const overlay = document.getElementById('article-modal');
    if (event.target === overlay) {
        tutupArtikelSecaraAman();
    }
});

window.bukaArtikelLengkap = bukaArtikelLengkap;
window.tutupArtikelLengkap = tutupArtikelSecaraAman;


window.toggleModal = toggleModal;

// listener untuk mendeteksi tombol 'Esc' pada keyboard
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        // Menggunakan '.page-modal.active' sesuai struktur class di HTML Anda
        const activeModal = document.querySelector('.page-modal.active');
        if (activeModal) {
            toggleModal(activeModal.id);
        }
    }
});
//===========================================================================

// Guard declarations to avoid "Cannot redeclare" errors if this script
// block is accidentally included/executed more than once.
if (typeof timerInterval === 'undefined') var timerInterval;
if (typeof isTimerRunning === 'undefined') var isTimerRunning = false;
if (typeof currentLat === 'undefined') var currentLat;
if (typeof currentLon === 'undefined') var currentLon;
if (typeof totalDurationMinutes === 'undefined') var totalDurationMinutes = 0;
if (typeof alarmTriggered === 'undefined') var alarmTriggered = false;
if (typeof currentSelectedBaseDuration === 'undefined') var currentSelectedBaseDuration = 30;
if (typeof globalTotalSeconds === 'undefined') var globalTotalSeconds = 0;
if (typeof globalInitialSeconds === 'undefined') var globalInitialSeconds = 0;

// ===========================================================

window.refreshSatuData = refreshSatuData;
//=============================================================

//======================================
//FUNGSI BLUETOOTH THERMOMETER
//======================================
// --- TETAP PERTAHANKAN VARIABEL GLOBAL INI ---
let bleDevice = null;
let currentTemp = 28;
let currentHum = 65;

// UUID Standar GATT untuk Environmental Sensing (Suhu & Kelembaban)
const ENVIRONMENTAL_SENSING_SERVICE = '0000181a-0000-1000-8000-00805f9b34fb';
const TEMPERATURE_CHARACTERISTIC = '00002a6e-0000-1000-8000-00805f9b34fb';
const HUMIDITY_CHARACTERISTIC = '00002a6f-0000-1000-8000-00805f9b34fb';
// ===================================================================================


//=========================================================

window.toggleRecipe = function() {
    const modal = document.getElementById('recipe');
    if (!modal) return;
    // Jika modal sedang terbuka, maka tutup
    if (modal.style.display === 'flex' || modal.style.display === 'block') {
        modal.style.display = 'none';
        
        // OPsional: Jika Anda juga ingin otomatis pindah ke tab timer saat ditutup,
        // aktifkan baris di bawah ini:
        // switchTab('timer'); 
    } else {
        // Jika sedang tertutup, maka buka
        modal.style.display = 'flex';
        
        // Hitung ulang HPP otomatis saat resep dibuka
        if (typeof hitungHPPBakeryTotal === 'function') {
            hitungHPPBakeryTotal();
        }
    }
};

//================================
// FUNGSI ALARM
//================================
// 1. Deklarasikan variabel global di paling atas (jika belum ada)
let audioCtx = null;

//==============================================
// 1. FUNGSI SUNTIK PRESET BAHAN INSTAN (Meningkatkan Efisiensi)
window.suntikPresetBahanCepat = function(nama, kategori, rasio, harga, pack) {
    const inputNama = document.getElementById('new-ing-name');
    const inputKategori = document.getElementById('new-ing-type');
    const inputRasio = document.getElementById('new-ing-ratio');
    const inputHarga = document.getElementById('new-ing-price');
    const inputPack = document.getElementById('new-ing-pack');
    const errorEl = document.getElementById('new-ing-error');

    if (errorEl) errorEl.style.display = 'none';

    // Isi formulir secara otomatis
    if (inputNama) inputNama.value = nama;
    if (inputKategori) inputKategori.value = kategori;
    if (inputRasio) inputRasio.value = rasio;
    if (inputHarga) inputHarga.value = harga;
    if (inputPack) inputPack.value = pack;

    // Otomatis arahkan kursor fokus ke kolom rasio agar user tinggal mengganti persentase angka jika perlu
    if (inputRasio) {
        inputRasio.focus();
        inputRasio.select();
    }
};

//===================================================================================
// FUNGSI BARU: DOCUMENT PICTURE-IN-PICTURE UNTUK PROOFING TIMER DONAT
//===================================================================================
// Variabel global untuk menyimpan referensi jendela PiP aktif
let pipWindowInstance = null;
let pipIntervalInstance = null;

// Inisialisasi Event Listener pemicu PIP aman setelah DOM selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    const pipTrigger = document.getElementById('pip-trigger-btn');
    if (pipTrigger) {
        pipTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            aktifkanModePIP();
        });
    }
    const btnResep = document.getElementById('btn-buka-resep');
    if (btnResep) {
        btnResep.addEventListener('click', () => {
            if (typeof openRecipesFromProfile === 'function') openRecipesFromProfile();
            else if (typeof window.tampilkanDaftarResepTersimpan === 'function') window.tampilkanDaftarResepTersimpan();
        });
    }
});
// =========================================================

//=======================================
// INIT APP
//=======================================
let isFetchingLocation = false;
    
// Listener untuk menerima data cuaca kembali dari Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'weatherData') {
            const payload = event.data.data || {};
            const cuaca = payload.weather || payload;
            const geocode = payload.geocode || cuaca.geocode;
            
            if (cuaca && cuaca.main) {
                const suhu = Math.round(cuaca.main.temp);
                const kelembaban = cuaca.main.humidity;
                const tekanan = cuaca.main.pressure;
                
                const tempEl = document.getElementById('temp-val');
                const humEl = document.getElementById('hum-val');
                const presEl = document.getElementById('pres-val');
                const premiumBox = document.getElementById('premium-box');

                if (tempEl) tempEl.innerText = suhu;
                if (humEl) humEl.innerText = kelembaban;
                if (presEl) presEl.innerText = tekanan;
                
                // KONDISIONAL UTAMA: Jika data didapat secara online, paksa kotak luring sembunyi
                if (premiumBox) {
                    if (navigator.onLine) {
                        premiumBox.style.display = "none";
                    } else if (typeof handleOfflinePremium === 'function') {
                        // Alihkan ke fungsi standard penanganan luring Anda agar UI sinkron
                        handleOfflinePremium();
                    } else {
                        premiumBox.style.display = "block";
                    }
                }
                
                if (typeof hitungEstimasiOtomatis === "function") {
                    hitungEstimasiOtomatis(suhu);
                }
                if (typeof hitungKebutuhan === "function") {
                    hitungKebutuhan();
                }

                if (typeof NotifSystem !== 'undefined') {
                    const namaLokasi = (geocode && (geocode.village || geocode.address?.village || geocode.city)) || 'lokasi Anda';
                    const deskripsiCuaca = (cuaca.weather && cuaca.weather[0] && cuaca.weather[0].description) || 'Cerah Berawan';

                    NotifSystem.tambah(
                        'cuaca', 
                        'Info Cuaca Terkini', 
                        `Suhu di ${namaLokasi} saat ini ${suhu}°C (${deskripsiCuaca}).`, 
                        '🌦️'
                    );
                }
            }
        }
    });
}

// =========================================================================
// LOGIK PENGAMBILAN DATA LOKASI & CUACA (MENDUKUNG WEB PWA & ANDROID APK)
// =========================================================================
window.handleOfflinePremium = handleOfflinePremium;
//==================================================================================

//==================================================================================
window.calculateIngredients = calculateIngredients;
window.hitungKebutuhan = hitungKebutuhan;
window.hitungEstimasiOtomatis = hitungEstimasiOtomatis;
window.hitungEstimasiProofing = hitungEstimasiProofing;
window.perbaruiKalkulasiWaktu = perbaruiKalkulasiWaktu;
window.startCountdownEngine = startCountdownEngine;

// Variabel kontrol timer global (Hapus kata 'let' agar tidak bentrok dengan deklarasi sebelumnya)
timerInterval = null;
isTimerRunning = false;
globalTotalSeconds = 0;
globalInitialSeconds = 0;
let targetEndTime = null; // Variabel baru ini tetap menggunakan 'let'

// 1. Inisialisasi Listener Realtime
// ⚠️ 1. DEKLARASIKAN DI PALING ATAS (Global Scope) AGAR TERBACA SEMUA FUNGSI
let globalResepChannel = null;

// =========================================================
// INTEGRASI GOOGLE MAPS DAN EVENT SENTUHAN
// =========================================================
window.openInGoogleMaps = function() {
    // Membaca koordinat global yang sudah disimpan aplikasi Anda saat GPS aktif
    if (typeof currentLat !== 'undefined' && typeof currentLon !== 'undefined' && currentLat && currentLon) {
        const mapsUrl = `https://www.google.com/maps?q=${currentLat},${currentLon}`;
        window.open(mapsUrl, '_blank');
    } else {
        // Fallback jika GPS browser ditolak, gunakan estimasi koordinat provider Sidoarjo/Surabaya (-7.4950, 112.7237)
        window.open(`https://www.google.com/maps?q=-7.4950029,112.7237925`, '_blank');
    }
};

let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const refreshIndicator = document.getElementById('refresh-indicator');

    // Logika Refresh — scroll terjadi di .scrollable-content, bukan window
    const scrollArea = document.querySelector('.scrollable-content');
    const scrollTop = scrollArea ? scrollArea.scrollTop : window.scrollY;
    if (touchEndY - touchStartY > 100 && scrollTop <= 0) {
        // 1. CEK APAKAH SEDANG FETCHING? Jika iya, ABORT / JANGAN REFRESH LAGI
        if (isFetchingLocation) {
            console.warn("Refresh diabaikan karena proses memuat lokasi/cuaca sebelumnya belum selesai.");
            return; 
        }

        // 2. AKTIFKAN PENGUNCI & TAMPILKAN INDIKATOR
        isFetchingLocation = true;
        if (refreshIndicator) {
            refreshIndicator.style.display = "block";
        }

        // 3. JALANKAN PROSES REFRESH
        initApp()
            .then(() => {
                hideRefreshIndicator(); 
            })
            .catch((error) => {
                console.error("Gagal refresh:", error);
                hideRefreshIndicator(); // Penting: tetap sembunyikan jika ada error
            })
            .finally(() => {
                // 4. PENTING: Buka kembali pengunci setelah semua proses selesai (baik sukses/gagal)
                isFetchingLocation = false;
            });
    }
});

// ===================================================================
// PENGATUR KLIK GLOBAL (Menangani Luar Kotak AI & Tombol Silang Notif)
// ===================================================================
document.addEventListener('click', function(event) {
    
    const arrowIcon = document.querySelector('.accordion-arrow');
    const aiBox = document.getElementById('ai-analysis-body');
    const aiToggle = document.getElementById('ai-toggle');
    if (aiBox && aiBox.style.display !== 'none') {
        if (!aiBox.contains(event.target) && !aiToggle?.contains(event.target)) {
            aiBox.style.display = 'none';
            if (arrowIcon) arrowIcon.style.transform = 'rotate(-90deg)';
        }
    }

    // --- 2. Logika Menangkap Klik Tombol Silang Notifikasi Baru (Bebas Eror) ---
    const tombolHapus = event.target.closest('.btn-hapus-notif-cepat');
    if (tombolHapus) {
        const idNotif = tombolHapus.getAttribute('data-id');
        
        // Eksekusi penghapusan data array/localStorage internal jika fungsi tersedia
        if (typeof NotifSystem !== 'undefined' && typeof NotifSystem.hapus === 'function') {
            NotifSystem.hapus(idNotif);
        } else if (typeof window.NotifSystem !== 'undefined' && typeof window.NotifSystem.hapus === 'function') {
            window.NotifSystem.hapus(idNotif);
        }
        
        // Langsung lenyapkan elemen visual div notifikasi tersebut dari layar secara instan
        const itemNotif = document.getElementById(`notif-${idNotif}`) || tombolHapus.closest('.notif-item');
        if (itemNotif) {
            itemNotif.remove();
        }

        // Tampilkan kembali tulisan "Belum ada notifikasi" jika kotak list sudah kosong melongpong
        const targetBox = document.getElementById('notif-list-container');
        const sisaNotif = targetBox?.querySelectorAll('.notif-item');
        if (sisaNotif && sisaNotif.length === 0) {
            const emptyMsg = document.getElementById('notif-empty-msg');
            if (emptyMsg) emptyMsg.style.display = 'block';
        }
    }
});

// =====================================================================
// FIX BACKGROUND THROTTLING: MENGATASI TIMER BERHENTI SAAT LAYAR MATI
// =====================================================================

// 1. Deteksi Sinkronisasi untuk PWA dan Browser Web
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Layar menyala kembali atau tab browser dibuka ulang
        if (typeof isTimerRunning !== 'undefined' && isTimerRunning && typeof checkAndRestoreTimer === 'function') {
            window.DEBUG && console.log("Layar menyala: Menghitung waktu kompensasi timer...");
            checkAndRestoreTimer();
        }
    } else {
        // Layar mati atau aplikasi di-minimize
        if (typeof isTimerRunning !== 'undefined' && isTimerRunning && typeof persistProofingState === 'function') {
            persistProofingState();
        }
    }
});

// 2. Deteksi Sinkronisasi untuk Aplikasi Mobile Native (Android/iOS via Capacitor)
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
            // Aplikasi kembali ke layar utama (Foreground)
            if (typeof isTimerRunning !== 'undefined' && isTimerRunning && typeof checkAndRestoreTimer === 'function') {
                window.DEBUG && console.log("Aplikasi Native aktif: Menghitung waktu kompensasi timer...");
                checkAndRestoreTimer();
            }
        } else {
            // Aplikasi tertutup ke latar belakang (Background)
            if (typeof isTimerRunning !== 'undefined' && isTimerRunning && typeof persistProofingState === 'function') {
                persistProofingState();
            }
        }
    });
}

document.addEventListener('click', () => {
    // Berikan argumen 'true' untuk menandakan bahwa ini dipicu langsung oleh klik user
    const ctx = dapatkanAudioContext(true);
    if (ctx) {
        window.DEBUG && console.log("AudioContext berhasil dibuka secara aman. State:", ctx.state);
    }
}, { once: true }); // 'once: true' memastikan ini hanya berjalan satu kali pada ketukan pertama

window.toggleAI = toggleAI;

// =========================================================
// LOGIKA HEADER MENYUSUT & FITUR SENTUH (SWAP STATS)
// =========================================================

let isTempMain = true; // Status awal: Suhu di kiri (besar)

// =========================================================================
// INTERFAZ PREMIUM KALKULATOR RESEP: DUAL-GROUP AUTO SPREADSHEET
// =========================================================================

// ==========================================
// 1. DATA DASAR & KATEGORI DINAMIS
// ==========================================
window.bakeryCategories = [
    "Bahan Kering",
    "Bahan Basah",
    "Bahan Pengembang",
    "Bahan Tambahan",
    "Bahan Toping",
    "Kemasan"
];

// Kosong saat pertama kali instal, tersimpan otomatis di localStorage setelahnya
window.bakeryIngredients = JSON.parse(localStorage.getItem('bakeryIngredients')) || [];

// Menyimpan status buka-tutup kategori (default: true = terbuka semua)
if (window.statusKategoriResep === undefined) {
    window.statusKategoriResep = {
        "Bahan Kering": true,
        "Bahan Basah": true,
        "Bahan Pengembang": true,
        "Bahan Tambahan": true,
        "Bahan Toping": true,
        "Kemasan": true
    };
}

// ==========================================
// 2. FUNGSI PENYIMPANAN & MANAJEMEN DATA
// ==========================================
window.saveBakeryIngredients = function() {
    localStorage.setItem('bakeryIngredients', JSON.stringify(window.bakeryIngredients));
    if (typeof window.renderRecipeTable === 'function') window.renderRecipeTable();
    if (typeof window.hitungHPP === 'function') window.hitungHPP();
};

window.addBakeryIngredient = function(newIngredient) {
    window.bakeryIngredients.push(newIngredient);
    window.saveBakeryIngredients();
};

window.updateBakeryIngredient = function(id, updatedData) {
    const index = window.bakeryIngredients.findIndex(item => item.id === id);
    if (index !== -1) {
        window.bakeryIngredients[index] = { ...window.bakeryIngredients[index], ...updatedData };
        window.saveBakeryIngredients();
    }
};

window.deleteBakeryIngredient = function(id) {
    window.bakeryIngredients = window.bakeryIngredients.filter(item => item.id !== id);
    window.saveBakeryIngredients();
};

window.resetBakeryIngredients = function() {
    window.bakeryIngredients = [];
    window.saveBakeryIngredients();
};

// Hubungkan Fungsi Render & HPP Utama
window.renderRecipeTable = function() { 
    if (typeof renderRecipeTableBakuTotal === 'function') renderRecipeTableBakuTotal(); 
};

window.hitungHPP = function() { 
    if (typeof hitungHPPBakeryTotal === 'function') hitungHPPBakeryTotal(); 
};

// ==========================================
// 3. PRESET & INTERAKSI FORM UI (DIAMBIL DARI KODE LAMA)
// ==========================================
const PRESET_BAHAN_CEPAT = [
    { label: 'Mentega', name: 'Mentega', category: 'Bahan Basah', ratio: 10, price: 18000, pack: 200 },
    { label: 'Gula', name: 'Gula Pasir', category: 'Bahan Kering', ratio: 12, price: 14000, pack: 1000 },
    { label: 'Telur', name: 'Telur Ayam', category: 'Bahan Basah', ratio: 15, price: 28000, pack: 1000 },
    { label: 'Susu', name: 'Susu Cair', category: 'Bahan Basah', ratio: 20, price: 15000, pack: 1000 },
    { label: 'Ragi', name: 'Ragi Instan', category: 'Bahan Pengembang', ratio: 1, price: 5000, pack: 500 },
    { label: 'Garam', name: 'Garam', category: 'Bahan Tambahan', ratio: 1, price: 3000, pack: 500 },
    { label: 'Meses', name: 'Cokelat Meses', category: 'Bahan Toping', ratio: 8, price: 22000, pack: 500 },
    { label: 'Dus', name: 'Kotak Donat', category: 'Kemasan', ratio: 0.17, price: 2500, pack: 1 }
];

window.pilihKategoriBahan = function(kategori) {
    const sel = document.getElementById('new-ing-type');
    if (sel) sel.value = kategori;
    document.querySelectorAll('.ing-cat-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.kategori === kategori);
    });
    perbaruiLabelRasioBahan();
    perbaruiPreviewBahanBaru();
};

window.isiBahanCepat = function(preset) {
    if (!preset) return;
    window.pilihKategoriBahan(preset.category);
    const nameInp = document.getElementById('new-ing-name');
    const ratioInp = document.getElementById('new-ing-ratio');
    const priceInp = document.getElementById('new-ing-price');
    const packInp = document.getElementById('new-ing-pack');
    if (nameInp) nameInp.value = preset.name;
    if (ratioInp) ratioInp.value = preset.ratio;
    if (priceInp) priceInp.value = preset.price;
    if (packInp) packInp.value = preset.pack;
    perbaruiPreviewBahanBaru();
    if (nameInp) nameInp.focus();
};

window.perbaruiPreviewBahanBaru = function() {
    const previewEl = document.getElementById('new-ing-preview-value');
    if (!previewEl) return;

    const category = document.getElementById('new-ing-type')?.value || 'Bahan Kering';
    const ratio = parseFloat(document.getElementById('new-ing-ratio')?.value) || 0;
    const price = parseFloat(document.getElementById('new-ing-price')?.value) || 0;
    const pack = parseFloat(document.getElementById('new-ing-pack')?.value) || 0;
    const baseFlour = parseFloat(document.getElementById('base-flour')?.value) || 1000;
    const totalYield = parseFloat(document.getElementById('recipe-yield')?.value) || 1;

    if (ratio <= 0 || price <= 0 || pack <= 0) {
        previewEl.textContent = '— gr · Rp —';
        return;
    }

    let grossWeight = 0;
    if (category === 'Bahan Toping' || category === 'Kemasan') {
        grossWeight = ratio * totalYield;
    } else {
        grossWeight = (ratio / 100) * baseFlour;
    }
    const costTerpakai = (grossWeight / pack) * price;
    previewEl.textContent = `${Math.round(grossWeight)} gr · Rp ${Math.round(costTerpakai).toLocaleString('id-ID')}`;
};

window.toggleCollapseKategori = function(namaKategori) {
    if (window.statusKategoriResep) {
        window.statusKategoriResep[namaKategori] = !window.statusKategoriResep[namaKategori];
    }
    if (typeof renderRecipeTableBakuTotal === 'function') {
        renderRecipeTableBakuTotal();
    }
};

window.gantiTabMetode = function(metode) {
    const tabBahan = document.getElementById('btn-tab-bahan');
    const tabCara = document.getElementById('btn-tab-cara');
    const contentBahan = document.getElementById('method-bahan-content');
    const contentCara = document.getElementById('method-steps-content');

    if (metode === 'cara') {
        if (tabCara) { tabCara.style.background = "#4E342E"; tabCara.style.color = "white"; }
        if (tabBahan) { tabBahan.style.background = "#F2D2A9"; tabBahan.style.color = "#4E342E"; }
        
        if (contentCara) contentCara.style.display = "flex";
        if (contentBahan) contentBahan.style.display = "none";
    } else {
        if (tabBahan) { tabBahan.style.background = "#4E342E"; tabBahan.style.color = "white"; }
        if (tabCara) { tabCara.style.background = "#F2D2A9"; tabCara.style.color = "#4E342E"; }
        
        if (contentBahan) contentBahan.style.display = "flex";
        if (contentCara) contentCara.style.display = "none";
    }
};

window.playAlarmSound = playAlarmSound;
window.playAlarmTone = playAlarmTone;
window.setMode = setMode;
window.setProofingMode = setProofingMode;
window.setTimerByTab = setTimerByTab;
window.resetToManualInput = resetToManualInput;

// Fix: fungsi navigasi form resep tidak terekspos ke window (module scope),
// sehingga onclick inline di HTML gagal dengan "ReferenceError: bukaDetailResepBaru is not defined"
window.bukaDetailResepBaru = bukaDetailResepBaru;
window.bukaDetailResepEksisting = bukaDetailResepEksisting;
window.kembaliKeMasterView = kembaliKeMasterView;
window.tutupHalamanResepSecaraAman = tutupHalamanResepSecaraAman;
window.filterDaftarResep = filterDaftarResep;
window.clearRecipeSearch = clearRecipeSearch;

window.perbaruiKomponenBahan = function(idBahan, properti, nilai) {
    const angkaValid = parseFloat(nilai) || 0;
    if (!Array.isArray(window.bakeryIngredients)) window.bakeryIngredients = [];

    // 1. Cari data bahan di dalam array memori utama dan update nilainya
    const ing = window.bakeryIngredients.find(x => x.id === idBahan);
    if (!ing) return;
    ing[properti] = angkaValid;

    // [PERBAIKAN] Simpan secara diam-diam ke localStorage 
    // agar data tidak hilang di-refresh, tanpa memicu kursor lompat
    localStorage.setItem('bakeryIngredients', JSON.stringify(window.bakeryIngredients));

    // 2. Ambil nilai acuan input utama dari dokumen HTML
    const baseFlourInput = document.getElementById('base-flour') || document.getElementById('base-tepung');
    const baseFlourWeight = baseFlourInput ? (parseFloat(baseFlourInput.value) || 1000) : 1000;
    
    const yieldInput = document.getElementById('recipe-yield') || document.getElementById('total-yield');
    const totalYield = yieldInput ? (parseFloat(yieldInput.value) || 1) : 1;

    // 3. Kalkulasi ulang matematika khusus
    let grossWeight = 0;
    let costTerpakai = 0;

    const packSize = parseFloat(ing.pack) || 1;
    const currentPrice = parseFloat(ing.price) || 0;
    const currentRatio = parseFloat(ing.ratio) || 0;

    if (ing.type === "Dough" || ing.category === "Bahan Kering" || ing.category === "Bahan Basah" || ing.category === "Bahan Pengembang" || ing.category === "Bahan Tambahan") {
        let ratio = ing.isFlour ? 100 : currentRatio;
        grossWeight = (ratio / 100) * baseFlourWeight;
        costTerpakai = (grossWeight / packSize) * currentPrice;
    } else {
        grossWeight = currentRatio * totalYield;
        costTerpakai = (grossWeight / packSize) * currentPrice;
    }

    // [PERBAIKAN] Tampilkan 1 angka desimal jika ada koma (misal: 2.5), 
    // jangan bulatkan penuh agar harga dan berat sinkron secara logika.
    const formatBerat = grossWeight % 1 !== 0 ? Number(grossWeight.toFixed(1)) : grossWeight;

    // 4. SUNTIK LANGSUNG ANGKA TERBARU KE ELEMENT KARTU DAN TABEL
    const grossEl = document.getElementById(`gross-${idBahan}`);
    if (grossEl) grossEl.innerText = formatBerat;

    const costEl = document.getElementById(`cost-${idBahan}`);
    if (costEl) costEl.innerText = Math.round(costTerpakai).toLocaleString('id-ID');

    // Update Tampilan Format Cetak Tabel PDF
    const grossTabEl = document.getElementById(`gross-table-${idBahan}`);
    if (grossTabEl) grossTabEl.innerText = formatBerat;
    
    const costTabEl = document.getElementById(`cost-table-${idBahan}`);
    if (costTabEl) costTabEl.innerText = Math.round(costTerpakai).toLocaleString('id-ID');

    // 5. Jalankan fungsi hitung total global
    if (typeof hitungHPPBakeryTotal === 'function') {
        hitungHPPBakeryTotal();
    } else if (typeof hitungHPP === 'function') {
        hitungHPP();
    }
};

// FUNGSI JEMBATAN UNTUK MEMPERBARUI DATA BAHAN SECARA DINAMIS SAAT DIINPUT
window.perbaruiKomponenBahan = function(idBahan, properti, nilai) {
    const ing = bakeryIngredients.find(x => x.id === idBahan);

    if (!ing) return;

    ing[properti] = parseFloat(nilai) || 0;

    if (typeof hitungHPPBakeryTotal === 'function') {
        hitungHPPBakeryTotal();
    }
};

// =========================================================================
// FUNGSI UNTUK MENANGKAP INPUT USER DAN MEMASUKKANNYA KE DAFTAR RESEP
// =========================================================================
window.tambahBahanBakeryDinamis = function(tambahLagi = true) {
    const nameInp = document.getElementById('new-ing-name');
    const typeSel = document.getElementById('new-ing-type');
    const ratioInp = document.getElementById('new-ing-ratio');
    const priceInp = document.getElementById('new-ing-price');
    const packInp = document.getElementById('new-ing-pack');

    if (!nameInp || !typeSel || !ratioInp || !priceInp || !packInp) {
        tampilkanErrorBahan('Komponen form tidak ditemukan. Muat ulang halaman.');
        return;
    }

    const name = nameInp.value.trim();
    const category = typeSel.value;
    const ratio = parseFloat(ratioInp.value) || 0;
    const price = parseFloat(priceInp.value) || 0;
    const pack = parseFloat(packInp.value) || 0;

    if (name === '') {
        tampilkanErrorBahan('Masukkan nama bahan baku terlebih dahulu.');
        nameInp.focus();
        return;
    }
    if (ratio <= 0) {
        tampilkanErrorBahan('Rasio / takaran harus lebih besar dari 0.');
        ratioInp.focus();
        return;
    }
    if (price <= 0) {
        tampilkanErrorBahan('Harga beli harus lebih besar dari 0.');
        priceInp.focus();
        return;
    }

    if (pack <= 0) {
        tampilkanErrorBahan("Isi pack belum diisi.");
        packInp.focus();
        return;
    }

    const duplikat = window.bakeryIngredients.find(b =>
        b.name?.toLowerCase() === name.toLowerCase() && b.category === category
        
    );
    if (duplikat) {
        const lanjut = confirm(`"${name}" sudah ada di kategori ${category}. Tambahkan lagi?`);
        if (!lanjut) return;
    }

    tampilkanErrorBahan('');

    const KATEGORI_TOPPING = ["Bahan Toping", "Kemasan"];
    const type = KATEGORI_TOPPING.includes(category)
    ? "Topping"
    : "Dough";

    const dataBahanBaru = {
        id: crypto.randomUUID(),
        name: name,
        type: type,
        category: category,
        ratio: ratio,
        price: price,
        pack: pack,
        isFlour: /tepung|terigu/i.test(name)
    };

    if (!Array.isArray(window.bakeryIngredients)) {
        console.error("window.bakeryIngredients belum diinisialisasi.");
        tampilkanErrorBahan("Data bahan belum siap. Muat ulang halaman.");
        return;
    }

    window.bakeryIngredients.push(dataBahanBaru);
    syncInventoryWithProfile();
    if (window.dbManager && window.dbManager.db) {
        window.dbManager.db.saveRecipe({
            id: dataBahanBaru.id,
            name: dataBahanBaru.name,
            ingredients: window.bakeryIngredients // Menyimpan seluruh list bahan resep terupdate
        }).catch(err => console.error("Gagal backup ke DB lokal:", err));
    }

    nameInp.value = '';
    ratioInp.value = '';
    priceInp.value = '';
    packInp.value = '';
    perbaruiPreviewBahanBaru();

    if (typeof renderRecipeTableBakuTotal === 'function') renderRecipeTableBakuTotal();
    if (typeof hitungHPPBakeryTotal === 'function') {hitungHPPBakeryTotal();}

    const cardsContainer = document.getElementById('recipe-cards-container');
    if (cardsContainer) {
        setTimeout(() => {
            cardsContainer.scrollTop = cardsContainer.scrollHeight;
        },50);
    }

    if (tambahLagi) {
        // Fokuskan kembali ke kolom nama agar user bisa langsung mengetik
        nameInp.focus();
    } else {
        // Menggunakan getElementById agar 100% tepat sasaran ke form tambah bahan
        const accordion = document.getElementById("form-tambah-bahan");
        
        if (accordion) {
            // Gunakan properti DOM asli (open = false) untuk memaksa tag <details> menutup
            accordion.open = false; 
            accordion.removeAttribute("open");
        }
    }

    if (typeof NotifSystem !== 'undefined' && typeof NotifSystem.tambah === 'function') {
        NotifSystem.tambah('resep', '✓ Bahan Ditambahkan', `"${name}" masuk ke ${category}.`, '🧾');
    }
};

    // 3. FIX TERHADAP ERROR: Mengekspos fungsi utama ke level Global (Window Object)
    window.hitungHPPBakeryTotal = hitungHPPBakeryTotal;

// =========================================================================
// FUNGSI UNTUK MENGHAPUS BAHAN DARI DAFTAR KARTU & TABEL
// =========================================================================
window.hapusBahanBakeryDinamis = function(index) {
    if (confirm("Apakah Anda yakin ingin menghapus komponen bahan ini?")) {
        // Hapus data dari array berdasarkan nomor indexnya
        if (Array.isArray(window.bakeryIngredients)) {
            window.bakeryIngredients.splice(index, 1);
        } else if (Array.isArray(bakeryIngredients)) {
            bakeryIngredients.splice(index, 1);
            syncInventoryWithProfile();
        }

        // Gambar ulang & hitung ulang total biaya produksi
        if (typeof renderRecipeTableBakuTotal === 'function') {
            renderRecipeTableBakuTotal();
        } else if (typeof renderIngredientsTable === 'function') {
            renderIngredientsTable();
        }
        
        if (typeof hitungHPPBakeryTotal === 'function') {
            hitungHPPBakeryTotal();
        }
    }
};

// Mendeteksi bahasa/negara perangkat user secara otomatis (bawaan HP)
const userLocale = navigator.language || navigator.userLanguage || 'id-ID';

// Membuat formater angka desimal dinamis (bisa otomatis titik/koma)
const formatDesimalUmat = new Intl.NumberFormat(userLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
});

// Membuat formater mata uang dinamis tanpa simbol (untuk ribuan)
const formatRibuanUmat = new Intl.NumberFormat(userLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});

// Logika Kalkulasi Utama Sesuai Parameter Gambar
hitungHPPBakeryTotal


// Daftarkan fungsi ke objek window agar bisa diakses oleh atribut onclick HTML

// Mendefinisikan kedua nama fungsi (alias) agar cocok dengan HTML manapun yang Anda pakai

window.logUserSearchBehavior = function(query, resultsCount) {
    try {
        // 1. Integrasi Google Analytics (GA4)
        if (typeof gtag === 'function' && query) {
            gtag('event', 'search', {
                search_term: query,
                results_count: resultsCount
            });
        }

        // 2. Logika penyimpanan ke localStorage dengan pencegah duplikasi
        let searchLogs = JSON.parse(localStorage.getItem('developer_search_analytics') || '[]');
        
        const lastLog = searchLogs[searchLogs.length - 1];
        if (lastLog && lastLog.query === query) {
            return; 
        }

        searchLogs.push({
            query: query,
            resultsFound: resultsCount,
            timestamp: new Date().toISOString()
        });

        if (searchLogs.length > 100) {
            searchLogs = searchLogs.slice(-100);
        }

        localStorage.setItem('developer_search_analytics', JSON.stringify(searchLogs));

        const statEl = document.getElementById('dev-search-stat');
        if (statEl) {
            statEl.innerText = `Log Aktif: "${query}" (${resultsCount} hasil ditemukan)`;
        }
    } catch (e) {
        console.warn("Gagal menyimpan log penelusuran:", e);
    }
};

window.exportSearchAnalytics = function() {
    try {
        const rawLogs = localStorage.getItem('developer_search_analytics') || '[]';
        const blob = new Blob([rawLogs], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-search-analytics-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("Gagal mengekspor log analisis: " + err.message);
    }
};

// =========================================================
// LOGIK SERVICE WORKER UNTUK PWA - FUNGSI SERVICE WORKER UNTUK PWA
// =========================================================
if (!window.Capacitor) {
    // Jika berjalan di browser biasa, daftarkan service worker untuk PWA
    if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
        .then(reg => {
            window.DEBUG && console.log('Service Worker terdaftar:', reg.scope);

            // Logika auto-update lanjutan
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });
        })
        .catch(err => window.DEBUG && console.log('Pendaftaran gagal:', err));
});
}
} else {
    // Jika berjalan di dalam aplikasi native Capacitor, hapus Service Worker yang terlanjur aktif
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for (let registration of registrations) {
                registration.unregister();
                window.DEBUG && console.log('Service Worker lama berhasil dihapus dari lingkungan native Capacitor');
            }
        });
    }
}


window.addEventListener('offline', () => {
    if (typeof handleOfflinePremium === 'function') {
        NotifSystem.tambah('sistem', 'Mode luring aktif', 'Tidak ada koneksi. Menggunakan data cuaca cache terakhir.', '📡');
        handleOfflinePremium();
    }
});

window.addEventListener('online', () => {
    // Hanya jalankan jika aplikasi memang sedang tidak dalam proses memuat sesuatu
    if (typeof initApp === 'function' && !isFetchingLocation) {
        initApp();
    }
});

window.addEventListener('beforeunload', (event) => {
    if (isTimerRunning) { // variabel global proofer Anda
        event.preventDefault();
        event.returnValue = 'Proses proofing sedang berjalan. Apakah Anda yakin ingin keluar?';
    }
});

// Jalankan ini secara global untuk menangkap tombol kembali HP
window.addEventListener('popstate', function(event) {
    const recipeListModal = document.getElementById('recipe-list-modal');
    if (recipeListModal && recipeListModal.classList.contains('active')) {
        window.tutupDaftarResepTersimpan();
        return;
    }
    const activeModal = document.querySelector('.page-modal.active, .unified-modal.active');
    if (activeModal) {
        toggleModal(activeModal.id);
    }
});

// Panggil fungsi restore bawaan kamu saat halaman selesai dimuat ulang (refresh)
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
    if (typeof checkAndRestoreTimer === 'function') {
        checkAndRestoreTimer();
    }
    }, 150); // Jeda 100ms biasanya cukup untuk menyelesaikan init bawaan
});

// 2. FUNGSI EKSPOR PDF MENGGUNAKAN WINDOW PRINT (CLEAN & MOBILE FRIENDLY)
window.eksporResepKePDF = function() {
    // 1. Ambil nilai input terbaru dari kalkulator webview
    const flourValue = document.getElementById('base-flour').value || "1000";
    const yieldValue = document.getElementById('recipe-yield').value || "1";
    const today = new Date().toLocaleDateString('id-ID', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 2. Salin nilainya ke komponen teks khusus cetak cetak formal
    document.getElementById('print-flour').innerText = flourValue;
    document.getElementById('print-yield').innerText = yieldValue;
    document.getElementById('print-date').innerText = today;

    // 3. Jalankan kalkulasi AI Agent agar narasinya ter-update sebelum dicetak
    if (typeof window.jalankanAnalisisAIAgent === 'function') {
        window.jalankanAnalisisAIAgent();
    }

    // 4. Picu jendela ekspor PDF native sistem operasi perangkat
    setTimeout(() => {
        window.print();
    }, 300);
};

// Panggil fungsi ini saat data profil diperbarui atau saat halaman dimuat
perbaruiTampilanUnitUsaha();

window.eksekusiCetakPremium = function() {
    window.DEBUG && console.log("Mengeksekusi Cetak Laporan PDF Pro (Include Parameter Card & Ringkasan)...");

    // 1. Ambil Nama Resep
    let namaResep = "";
    const elJudulResep = document.getElementById('recipe-save-name');
    if (elJudulResep) namaResep = elJudulResep.value.trim();
    if (namaResep === "") namaResep = "RESEP PRODUKSI"; 

    const safeFileName = namaResep.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
    const finalDocTitle = safeFileName + " - " + (document.getElementById('profile-bakery')?.value || "Nama Bakery");

    // 2. Ambil Insight AI
    const elPM = document.getElementById('text-analysis-pm');
    const elFC = document.getElementById('text-analysis-fc');
    const elUB = document.getElementById('text-analysis-ub');
    const insightPM = elPM ? elPM.innerText.trim() : "Data analisis margin belum dihitung.";
    const insightFC = elFC ? elFC.innerText.trim() : "Data analisis food cost belum dihitung.";
    const insightUB = elUB ? elUB.innerText.trim() : "Data analisis standar belum dihitung.";

    let fcPercent = window.currentFoodCostPersen || 35; 
    let pmPercent = 100 - fcPercent;
    if (pmPercent < 0) pmPercent = 0;

    // 3. Ambil Nilai Parameter Utama
    let baseFlourVal = "1000";
    const elBaseFlour = document.getElementById('base-flour');
    if (elBaseFlour) baseFlourVal = elBaseFlour.value || elBaseFlour.innerText || "1000";

    let recipeYieldVal = "34";
    const elRecipeYield = document.getElementById('recipe-yield');
    if (elRecipeYield) recipeYieldVal = elRecipeYield.value || elRecipeYield.innerText || "34";

    let hargaJualVal = "4500";
    const elHargaJual = document.getElementById('input-harga-jual');
    if (elHargaJual) hargaJualVal = elHargaJual.value || elHargaJual.innerText || "4500";
    const formattedHargaJual = "Rp " + (parseFloat(hargaJualVal) || 0).toLocaleString('id-ID');

    // 4. Ambil Langkah Produksi
    let stepsArray = window.activeRecipeSteps || [];
    if (stepsArray.length === 0) {
        const stepInputs = document.querySelectorAll('.input-step-text');
        stepInputs.forEach(input => {
            if (input.value.trim() !== '') stepsArray.push(input.value.trim());
        });
    }

    let stepsHTML = "";
    if (stepsArray.length > 0) {
        stepsArray.forEach(step => { stepsHTML += `<li style="margin-bottom: 4px; font-size: 7.5pt; line-height: 1.3; text-align: justify;">${step}</li>`; });
    } else {
        stepsHTML = '<li style="font-size: 7.5pt;">Belum ada instruksi langkah produksi.</li>';
    }

    // 5. Ambil Data Tabel Bahan & Hitung Total Biaya
    let rowsHTML = "";
    let totalModalBatch = 0;   
    let totalModalBelanja = 0; 
    let totalBeratAdonan = 0;  

    const tableRows = document.querySelectorAll('.recipe-table tbody tr');
    if (tableRows && tableRows.length > 0) {
        tableRows.forEach(row => {
            const ths = row.querySelectorAll('th');
            const tds = row.querySelectorAll('td');
            
            if (ths.length > 0 || (tds.length === 1)) {
                const namaKategori = ths.length > 0 ? ths[0].innerText.trim() : tds[0].innerText.trim();
                rowsHTML += `<tr style="background-color: #f8fafc;">
                    <td colspan="6" style="padding: 3px 6px; font-weight: 800; color: #d35400; font-size: 7pt; border: 1px solid #cbd5e1; text-transform: uppercase;">
                        ${namaKategori}
                    </td>
                </tr>`;
            } else if (tds.length >= 2) {
                const namaBahan = tds[0] ? tds[0].innerText.trim() : '-';
                const takaran = tds[1] ? tds[1].innerText.trim() : '-';
                const beratPakai = tds[2] ? tds[2].innerText.trim() : '0'; 
                const hargaBeli = tds[3] ? tds[3].innerText.trim() : '0'; 
                const isiPack = tds[tds.length - 2] ? tds[tds.length - 2].innerText.trim() : '-'; 
                const strBiaya = tds[tds.length - 1] ? tds[tds.length - 1].innerText.trim() : '0';
                
                const angkaBiaya = parseFloat(strBiaya.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
                const angkaHargaBeli = parseFloat(hargaBeli.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
                const angkaBeratPakai = parseFloat(beratPakai.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
                
                totalModalBatch += angkaBiaya;
                totalModalBelanja += angkaHargaBeli;
                totalBeratAdonan += angkaBeratPakai;

                rowsHTML += `<tr>
                    <td style="padding: 2.5px 4px; padding-left: 8px; font-size: 6.5pt;">${namaBahan}</td>
                    <td style="text-align: center; padding: 2.5px 4px; font-size: 6.5pt;">${takaran}</td>
                    <td style="text-align: center; padding: 2.5px 4px; font-size: 6.5pt;">${isiPack}</td>
                    <td style="text-align: right; padding: 2.5px 4px; font-size: 6.5pt;">${hargaBeli}</td>
                    <td style="text-align: right; padding: 2.5px 4px; font-size: 6.5pt; font-weight: 600;">${beratPakai}</td>
                    <td style="text-align: right; font-weight: bold; color: #4E342E; padding: 2.5px 4px; font-size: 6.5pt;">${strBiaya}</td>
                </tr>`;
            }
        });
    }

    if (!rowsHTML) {
        rowsHTML = '<tr><td colspan="6" style="text-align: center; color: #666; padding: 6px; font-size: 7pt;">Data komposisi bahan belum tersedia.</td></tr>';
    }

    // =========================================================================
    // 6. KALKULASI RINGKASAN FINANSIAL (Sesuai dengan gambar referensi Anda)
    // =========================================================================
    const calcBiaya = totalModalBatch || 0; 
    const calcPcs = parseInt(recipeYieldVal) || 1;
    const calcHargaJual = parseFloat(hargaJualVal) || 0;

    const calcHppPerPcs = Math.round(calcBiaya / calcPcs);
    const calcTotalBiayaModal = calcHppPerPcs * calcPcs;
    const calcTotalPendapatan = calcPcs * calcHargaJual;
    const calcProfitMargin = calcTotalPendapatan - calcTotalBiayaModal;

    const formatRp = (angka) => "Rp " + Math.round(angka).toLocaleString('id-ID');
    // =========================================================================

    const tanggalCetak = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    // 7. Bangun Template HTML PDF
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '0';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '794px'; 
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '30px 35px'; 
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    tempContainer.style.color = '#1e293b'; 

    tempContainer.innerHTML = `
        <style>
            .header-container { border-bottom: 3px solid #4E342E; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end; }
            h1 { color: #4E342E; margin: 0; font-size: 14pt; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
            .brand-tag { color: #e67e22; font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
            .meta-box { background: #fdf8f2; border: 1px solid #f3e5dc; padding: 6px 10px; margin-bottom: 10px; border-radius: 5px; font-size: 7.5pt; display: flex; justify-content: space-between; }
            .meta-box strong { color: #4E342E; }
            
            .param-card-container { background: white; padding: 10px 14px; border-radius: 8px; box-sizing: border-box; margin-bottom: 12px; display: flex; gap: 12px; border: 1px solid #e2e8f0; }
            .param-item { flex: 1; background: #f8fafc; border: 1px solid #F2D2A9; border-radius: 6px; padding: 6px 10px; text-align: center; box-sizing: border-box; }
            .param-label { font-size: 6.5pt; font-weight: bold; color: #8D6E63; display: block; margin-bottom: 2px; text-transform: uppercase; }
            .param-value { font-size: 9pt; font-weight: bold; color: #4E342E; }

            .section-title { background: #4E342E; color: white; padding: 3px 8px; font-size: 8pt; font-weight: bold; border-radius: 3px; display: block; width: 100%; box-sizing: border-box; text-transform: uppercase; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { border: 1px solid #cbd5e1; }
            th { background: #F2D2A9; color: #4E342E; text-align: left; font-weight: bold; padding: 3px 4px; font-size: 6pt; }
            ol { padding-left: 16px; margin: 8px 0 0 0; }
            .footer { margin-top: 15px; text-align: center; font-size: 7pt; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
        </style>
        
        <div class="header-container">
            <div>
                <div class="brand-tag">Lembar Kerja Produksi Resmi</div>
                <h1>${namaResep}</h1>
            </div>
            <div style="text-align: right; font-size: 7.5pt; color: #64748b; margin-bottom: 2px;">
                <strong>Dicetak:</strong> ${tanggalCetak}
            </div>
        </div>
        
        <div class="meta-box">
            <div><strong>Pembuat:</strong> <span>${document.getElementById('profile-nama-user')?.value || document.getElementById('profile-user')?.value || document.getElementById('nama-pembuat')?.value || "Pengguna"}</span></div>
            <div><strong>Unit Usaha:</strong> <span>${document.getElementById('profile-bakery')?.value || document.getElementById('nama-bakery')?.value || document.getElementById('nama-unit-usaha')?.value || "Unit Usaha"}</span></div>
            <div><strong>Status:</strong> Valid (PWA Dashboard)</div>
        </div>

        <div class="param-card-container">
            <div class="param-item" style="flex: 1.618;">
                <span class="param-label">Tepung Utama (gr)</span>
                <span class="param-value">${baseFlourVal} g</span>
            </div>
            <div class="param-item" style="flex: 1;">
                <span class="param-label">Total Porsi</span>
                <span class="param-value">${recipeYieldVal} pcs</span>
            </div>
            <div class="param-item" style="flex: 1.5; background: #f0fdf4; border-color: #27ae60;">
                <span class="param-label" style="color: #27ae60;">Harga Jual / Pcs</span>
                <span class="param-value" style="color: #27ae60;">${formattedHargaJual}</span>
            </div>
        </div>

        <div style="display: flex; gap: 18px; align-items: flex-start; margin-bottom: 15px;">
            
            <div style="flex: 1.618; width: 0; display: flex; flex-direction: column;">
                <div class="section-title">📋 Komposisi Bahan & Struktur Biaya</div>
                <table>
                    <thead>
                        <tr>
                            <th>Komponen Bahan</th>
                            <th style="text-align: center; width: 35px;">Takaran</th>
                            <th style="text-align: center; width: 40px;">Isi Pack</th>
                            <th style="text-align: right; width: 55px;">Harga Beli</th>
                            <th style="text-align: right; width: 50px;">Berat Pakai</th>
                            <th style="text-align: right; width: 60px;">Biaya (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                        <tr style="border-top: 2px solid #4E342E; background-color: #f8fafc;">
                            <td colspan="3" style="text-align: right; padding: 3px 5px; font-size: 6pt; font-weight: 800; color: #4E342E;">SUBTOTAL:</td>
                            <td style="text-align: right; padding: 3px 5px; font-size: 6.5pt; font-weight: 800; color: #1e293b;">Rp ${totalModalBelanja.toLocaleString('id-ID')}</td>
                            <td style="text-align: right; padding: 3px 5px; font-size: 6.5pt; font-weight: 800; color: #1e293b;">${totalBeratAdonan.toLocaleString('id-ID')}</td>
                            <td style="text-align: right; padding: 3px 5px; font-size: 7pt; font-weight: 800; color: #d97706;">Rp ${totalModalBatch.toLocaleString('id-ID')}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- KOTAK RINGKASAN FINANSIAL YANG DIINTEGRASIKAN -->
                <div style="margin-top: 12px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #f8fafc; font-family: sans-serif; color: #334155; page-break-inside: avoid;">
                    <h4 style="margin: 0 0 8px 0; color: #4E342E; font-size: 8pt; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">Ringkasan Finansial Produksi</h4>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 7pt;">
                        <span>Total Biaya Modal (Adonan, Toping, Kemasan):</span>
                        <span style="font-weight: 600;">${formatRp(calcBiaya)}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 7pt;">
                        <span>Harga Pokok Produksi per Pcs (${calcPcs} pcs):</span>
                        <span style="font-weight: 600;">${formatRp(calcHppPerPcs)}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 7pt;">
                        <span>Proyeksi Pendapatan (Harga Jual ${formatRp(calcHargaJual)}):</span>
                        <span style="font-weight: 600;">${formatRp(calcTotalPendapatan)}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; font-size: 8pt; font-weight: bold; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #94a3b8; color: #27ae60;">
                        <span>Estimasi Keuntungan Bersih:</span>
                        <span>${formatRp(calcProfitMargin)}</span>
                    </div>
                </div>
                <!-- AKHIR KOTAK RINGKASAN FINANSIAL -->

            </div>

            <div style="flex: 1; width: 0; display: flex; flex-direction: column;">
                <div class="section-title">💡 Wawasan Bisnis (AI)</div>
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 12px; margin-top: 6px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 12px;">
                    
                    <canvas id="pdf-pie-canvas" width="300" height="300" style="width: 130px; height: 130px; display: block;"></canvas>
                    
                    <div style="font-size: 7.5pt; font-weight: 800; display: flex; width: 100%; justify-content: center; gap: 12px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 4px; color: #4E342E;">
                            <span style="width: 8px; height: 8px; background: #e67e22; display: inline-block; border-radius: 2px;"></span> Cost (${Number(fcPercent).toFixed(1)}%)
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; color: #4E342E;">
                            <span style="width: 8px; height: 8px; background: #27ae60; display: inline-block; border-radius: 2px;"></span> Profit (${Number(pmPercent).toFixed(1)}%)
                        </div>
                    </div>

                    <div style="font-size: 7.5pt; display: flex; flex-direction: column; gap: 8px; line-height: 1.4; text-align: justify; width: 100%;">
                        <div><strong style="color: #0f172a; font-size: 8pt;">📊 Margin:</strong><br>${insightPM}</div>
                        <div><strong style="color: #0f172a; font-size: 8pt;">💰 Food Cost:</strong><br>${insightFC}</div>
                        <div><strong style="color: #0f172a; font-size: 8pt;">🛡️ Standar:</strong><br>${insightUB}</div>
                    </div>
                </div>
            </div>

        </div>

        <div style="width: 100%;">
            <div class="section-title">📝 Instruksi Langkah Demi Langkah</div>
            <ol>${stepsHTML}</ol>
        </div>

        <div class="footer">Dokumen Manajemen Operasional • Dicetak via Sistem PWA Mobile Kelas Premium</div>
    `;

    document.body.appendChild(tempContainer);

    // 8. Render Canvas (Pie Chart)
    const canvasEl = tempContainer.querySelector('#pdf-pie-canvas');
    if (canvasEl) {
        const ctx = canvasEl.getContext('2d');
        const centerX = 150, centerY = 150, radius = 135; 
        
        let startAngle = -0.5 * Math.PI; 
        
        const fcVal = parseFloat(fcPercent) || 0;
        const pmVal = 100 - fcVal;
        
        const slices = [
            { percent: fcVal, color: '#e67e22' },      
            { percent: pmVal > 0 ? pmVal : 0, color: '#27ae60' } 
        ];

        slices.forEach(slice => {
            if (slice.percent > 0) {
                const sliceAngle = (slice.percent / 100) * 2 * Math.PI;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
                ctx.closePath();
                ctx.fillStyle = slice.color;
                ctx.fill();
                
                ctx.lineWidth = 4;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();

                startAngle += sliceAngle;
            }
        });
    }

    // 9. Eksekusi PDF Download
    setTimeout(() => {
        html2canvas(tempContainer, {
            scale: 2.5, 
            useCORS: true,
            backgroundColor: '#ffffff',
            windowWidth: 794
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png', 1.0);
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const lebarPDF = pdf.internal.pageSize.getWidth();
            const tinggiPDF = (canvas.height * lebarPDF) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, lebarPDF, tinggiPDF);
            pdf.save(`${finalDocTitle}.pdf`); 
            
            document.body.removeChild(tempContainer);
        }).catch(err => {
            console.error("Gagal merender PDF: ", err);
            alert("Terjadi kesalahan saat memproses file PDF.");
            document.body.removeChild(tempContainer);
        });
    }, 300);
};

window.jalankanAnalisisAIAgent = function(hppPcs, hargaJual, beratPcs) {
    // 1. Validasi & Kalkulasi Angka Dasar
    const hpp = parseFloat(hppPcs) || 0;
    const jual = parseFloat(hargaJual) || 0;
    const berat = parseFloat(beratPcs) || 0;

    // Hindari pembagian dengan nol
    const foodCostPersen = jual > 0 ? (hpp / jual) * 100 : 0;
    const profitMarginPersen = jual > 0 ? ((jual - hpp) / jual) * 100 : 0;

    // ==========================================
    // 2. UPDATE ELEMEN BADGE ATAS (PROFIT & FOOD COST)
    // ==========================================
    const elTabProfit = document.getElementById('sum-profit-margin');
    const elTabFC = document.getElementById('food-cost-percent');
    const elBadgeFC = document.getElementById('fc-badge');

    if (elTabProfit) {
        elTabProfit.innerText = profitMarginPersen.toFixed(1) + '%';
        // Ubah warna text jika rugi (merah) atau untung (hijau)
        elTabProfit.style.color = profitMarginPersen < 0 ? '#e74c3c' : '#27ae60'; 
    }

    if (elTabFC) {
        elTabFC.innerText = foodCostPersen.toFixed(1) + '%';
    }

    if (elBadgeFC) {
        // Logika Badge Peringatan Dinamis
        if (foodCostPersen > 45) {
            elBadgeFC.innerText = "🚨 BOROS / OVERBUDGET (Food Cost > 45%)";
            elBadgeFC.style.background = "#e74c3c"; // Merah
        } else if (foodCostPersen >= 35 && foodCostPersen <= 45) {
            elBadgeFC.innerText = "⚠️ STANDAR / AMAN (Food Cost 35% - 45%)";
            elBadgeFC.style.background = "#f39c12"; // Oranye/Kuning
        } else if (foodCostPersen > 0 && foodCostPersen < 35) {
            elBadgeFC.innerText = "✅ SANGAT EFISIEN (Food Cost < 35%)";
            elBadgeFC.style.background = "#27ae60"; // Hijau
        } else {
            elBadgeFC.innerText = "ℹ️ BELUM ADA DATA";
            elBadgeFC.style.background = "#95a5a6"; // Abu-abu
        }
    }

    // ==========================================
    // 3. UPDATE TEKS AI AGENT (INSIGHT FOLDER)
    // ==========================================
    const elPM = document.getElementById('text-analysis-pm');
    const elFC = document.getElementById('text-analysis-fc');
    const elUB = document.getElementById('text-analysis-ub');

    // --- Insight Profit Margin ---
    if (elPM) {
        if (profitMarginPersen >= 50) {
            elPM.innerText = `Margin keuntungan sangat sehat di angka ${profitMarginPersen.toFixed(1)}%. Harga jual memberikan bantalan laba yang sangat baik terhadap fluktuasi harga bahan baku.`;
        } else if (profitMarginPersen > 0) {
            elPM.innerText = `Margin keuntungan stabil di angka ${profitMarginPersen.toFixed(1)}%. Bisnis berada di zona aman, namun tetap pantau kenaikan harga bahan utama.`;
        } else {
            elPM.innerText = `Peringatan Kritis: Anda mengalami kerugian dengan margin ${profitMarginPersen.toFixed(1)}%. Segera naikkan harga jual atau kurangi biaya bahan baku!`;
        }
    }

    // --- Insight Food Cost ---
    if (elFC) {
        if (foodCostPersen <= 35) {
            elFC.innerText = `Food Cost sangat ideal berada di ${foodCostPersen.toFixed(1)}%. Pengelolaan HPP Anda sudah setara dengan standar industri F&B profesional.`;
        } else if (foodCostPersen <= 45) {
            elFC.innerText = `Food Cost berada di kisaran ${foodCostPersen.toFixed(1)}%. Masih wajar, namun cari supplier alternatif untuk bahan berbiaya tinggi agar margin naik.`;
        } else {
            elFC.innerText = `Food Cost membengkak hingga ${foodCostPersen.toFixed(1)}%! Beban bahan baku terlalu berat. Tinjau ulang resep atau naikkan harga jual secepatnya.`;
        }
    }

    // --- Insight Unilever (Berat Pcs) ---
    if (elUB) {
        if (berat >= 55 && berat <= 65) {
            elUB.innerText = `Berat adonan (${berat.toFixed(1)}g per pcs) sudah ideal dan presisi untuk standar grade komersial masal, menghasilkan konsistensi proofing yang stabil.`;
        } else if (berat > 65) {
            elUB.innerText = `Berat adonan tergolong besar (${berat.toFixed(1)}g). Hati-hati, ini bisa memakan Food Cost. Pastikan waktu proofing disesuaikan agar ragi aktif sempurna.`;
        } else {
            elUB.innerText = `Berat adonan terlalu kecil (${berat.toFixed(1)}g). Risiko produk kempes atau kering saat digoreng lebih tinggi. Sesuaikan kembali dengan cetakan standar.`;
        }
    }
    
    // Simpan data ke window agar terbaca oleh fungsi Cetak PDF
    window.currentFoodCostPersen = foodCostPersen;
};

// Panggil fungsi ini setiap kali kalkulasi resep diubah/dihitung ulang oleh user
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.jalankanAnalisisAIAgent === 'function') {
        window.jalankanAnalisisAIAgent();
    }
});

// Fungsi baru untuk menyembunyikan kotak AI secara manual oleh user
window.sembunyikanKotakAI = function() {
    const boxAI = document.getElementById('premium-ai-analysis-box');
    if (boxAI) {
        // Berikan efek transisi menghilang secara halus (optional) sebelum display none
        boxAI.style.display = "none";
        
        // Opsional: Otomatis scroll layar kembali ke bawah agar tombol "TUTUP KALKULATOR" langsung terlihat jelas
        const modalResep = document.getElementById('recipe');
        if (modalResep) {
            setTimeout(() => {
                modalResep.scrollTo({ top: modalResep.scrollHeight, behavior: 'smooth' });
            }, 50);
        }
    }
};

window.hubungkanKeSensorBluetoothProofer = async function() {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'SensorProofer' }],
            optionalServices: ['environmental_sensing']
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('environmental_sensing');
        const characteristic = await service.getCharacteristic('temperature');
        
        // Membaca nilai dari hardware
        let value = await characteristic.readValue();
        let suhuHardware = value.getUint8(0);
        
        window.lastDetectedTemp = suhuHardware;
        window.jalankanAnalisisAIAgent(); // Perbarui rekomendasi AI otomatis
    } catch(error) {
        window.DEBUG && console.log("Koneksi Bluetooth dibatalkan / gagal: " + error);
    }
};

/**
 * Fungsi untuk mengatur perpindahan tab internal folder bertumpuk (Business Analysis Insight)
 * @param {string} tabId - Nama tab target ('profit-margin', 'food-cost', atau 'unilever-badge')
 */
window.switchFolderTab = function(tabId) {
    const pages = {
        'profit-margin': 'page-profit-margin',
        'food-cost': 'page-food-cost',
        'unilever-badge': 'page-unilever-badge'
    };
    Object.values(pages).forEach(id => {
        const page = document.getElementById(id);
        if (page) page.style.display = 'none';
    });
    const selectedPage = document.getElementById(pages[tabId] || pages['profit-margin']);
    if (selectedPage) selectedPage.style.display = 'block';
};

document.addEventListener("DOMContentLoaded", function() {
    
    // Fungsi untuk menyembunyikan semua teks keterangan
    function hideAllInsights() {
        ['page-profit-margin', 'page-food-cost', 'page-unilever-badge'].forEach(id => {
            const page = document.getElementById(id);
            if (page) page.style.display = 'none';
        });
    }

    // 1. Menangkap klik dari elemen #sum-profit-margin milik Anda
    const btnProfitMargin = document.getElementById('sum-profit-margin');
    if (btnProfitMargin) {
        btnProfitMargin.style.cursor = 'pointer'; // Menambahkan efek pointer agar jelas bisa diklik
        btnProfitMargin.addEventListener('click', function() {
            window.switchFolderTab('profit-margin');
        });
    }

    // 2. Menangkap klik dari elemen #food-cost-percent milik Anda
    const btnFoodCost = document.getElementById('food-cost-percent');
    if (btnFoodCost) {
        btnFoodCost.style.cursor = 'pointer';
        btnFoodCost.addEventListener('click', function() {
            window.switchFolderTab('food-cost');
        });
    }

    // 3. Menangkap klik dari elemen #fc-badge milik Anda
    const btnBadge = document.getElementById('fc-badge');
    if (btnBadge) {
        btnBadge.style.cursor = 'pointer';
        btnBadge.addEventListener('click', function() {
            window.switchFolderTab('unilever-badge');
        });
    }

});

// ==========================================
// FIX SWAPRIGHTSTATS REFERENCE ERROR
// ==========================================
if (typeof swapRightStats === 'function') {
    window.swapRightStats = swapRightStats;
} else {
    // Fallback otomatis jika fungsi internal terisolasi di dalam modul
    window.swapRightStats = function() {
        if (typeof isWindMain !== 'undefined') {
            isWindMain = !isWindMain;
            const rightMainEl = document.getElementById('shrunk-right-main');
            const rightSubEl = document.getElementById('shrunk-right-sub');
            if (rightMainEl) rightMainEl.style.opacity = '0';
            if (rightSubEl) rightSubEl.style.opacity = '0';
            
            setTimeout(() => {
                if (typeof updateMiniHeader === 'function') {
                    updateMiniHeader();
                }
                if (rightMainEl) rightMainEl.style.opacity = '1';
                if (rightSubEl) rightSubEl.style.opacity = '1';
            }, 150);
        }
    };
}

window.tambahNotifikasi = tambahNotifikasi;

/**
 * =========================================================================
 * INISIALISASI UTAMA APLIKASI (SINGLE DOMCONTENTLOADED EVENT)
 * Semua pengikatan elemen UI, Event Listener, dan restore data digabung di sini
 * =========================================================================
 */
document.addEventListener("DOMContentLoaded", async () => {
    window.DEBUG && console.log("🚀 Memulai inisialisasi modul Timer Proofer & Kalkulator HPP...");

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
            document.body.classList.remove('logged-out');
            document.body.classList.add('logged-in');
            console.log('Login terdeteksi untuk:', session.user.email);
        } else {
            document.body.classList.remove('logged-in');
            document.body.classList.add('logged-out');
        }
    } catch (err) {
        console.error('Gagal memeriksa sesi:', err);
    }

    // Pantau perubahan status login secara real-time
    supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(async () => {
        // 1. Jika User Login atau Sesi Awal Terdeteksi saat Halaman Dimuat
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            if (session) {
                document.body.classList.remove('logged-out');
                document.body.classList.add('logged-in');

                // Jalankan sinkronisasi awal
                if (typeof sinkronisasiAwalDariSupabase === 'function') {
                    await sinkronisasiAwalDariSupabase();
                }
                if (typeof syncLocalDataToSupabase === 'function') {
                    await syncLocalDataToSupabase();
                }

                // Inisialisasi Realtime (pastikan membersihkan channel lama di dalam fungsi ini jika ada)
                if (typeof initSupabaseRealtime === 'function') {
                    initSupabaseRealtime();
                }
            }
        } 
        
        // 2. Jika Hanya Token yang Diperbarui di Latar Belakang
        else if (event === 'TOKEN_REFRESHED') {
            console.log('Token Supabase diperbarui secara otomatis.');
            // Cukup pastikan kelas CSS tetap aman tanpa perlu sinkron ulang seluruh data
            if (session) {
                document.body.classList.remove('logged-out');
                document.body.classList.add('logged-in');
            }
        } 
        
        // 3. Jika User Logout
        else if (event === 'SIGNED_OUT') {
            document.body.classList.remove('logged-in');
            document.body.classList.add('logged-out');

            // Bersihkan channel Realtime saat logout
            if (globalResepChannel && window.supabase) {
                await window.supabase.removeChannel(globalResepChannel);
                globalResepChannel = null;
            }
        }
    }, 0);
});

    // Pengecekan sesi awal (jika user membuka ulang aplikasi)
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            document.body.classList.remove('logged-out');
            document.body.classList.add('logged-in');
        }
    });
    
    // -----------------------------------------------------------------
    // 1. INI-AWAL GLOBAL & CORE SYSTEM DISPLAY
    // -----------------------------------------------------------------
    if (typeof initArticleSlider === 'function') {
        initArticleSlider();
    }
    if (typeof inisialisasiFormTambahBahan === 'function') {
        inisialisasiFormTambahBahan();
    }
    if (typeof updateVersion === 'function') {
        updateVersion();
    }
    if (typeof renderUserProfile === 'function') {
        renderUserProfile();
    }
    if (typeof initApp === 'function') {
        initApp();
    }

    // Set default folder yang terbuka pertama kali ke 'profit-margin'
    if (typeof window.switchFolderTab === 'function') {
        window.switchFolderTab('profit-margin');
    }

    // Jalankan sistem keterangan waktu shrunk otomatis
    if (typeof perbaruiKeteranganWaktuShrunk === 'function') {
        perbaruiKeteranganWaktuShrunk(); // Jalankan sekali saat start awal
        setInterval(perbaruiKeteranganWaktuShrunk, 30000); // Periksa otomatis setiap 30 detik
    }

    window.DEBUG && console.log("✅ Sistem Kalkulator Resep & Core berhasil diinisialisasi tanpa eror.");
    //--------------------------------
    const dateElement = document.getElementById("summary-date");
    
    if (dateElement) {
        // Mengambil data waktu lokal dari perangkat
        const sekarang = new Date();
        
        // Mengatur format tanggal ke Bahasa Indonesia
        const opsiFormat = { 
            weekday: 'long', // Menampilkan nama hari (Senin, Selasa, dst)
            day: 'numeric',   // Menampilkan angka tanggal
            month: 'long',   // Menampilkan nama bulan (Januari, Februari, dst)
            year: 'numeric'  // Menampilkan angka tahun
        };
        
        const tanggalLokal = sekarang.toLocaleDateString('id-ID', opsiFormat);
        
        // Memasukkan hasilnya ke dalam elemen HTML
        dateElement.textContent = tanggalLokal;
    }
    // -----------------------------------------------------------------
    // 2. INPUT OFFLINE PREMIUM
    // -----------------------------------------------------------------
    const offTempInput = document.getElementById("off-temp");
    const offHumInput = document.getElementById("off-hum");
    const offConditionInput = document.getElementById("off-condition");

    if (offTempInput && typeof handleOfflinePremium === 'function') {
        offTempInput.addEventListener("input", handleOfflinePremium);
    }
    if (offHumInput && typeof handleOfflinePremium === 'function') {
        offHumInput.addEventListener("input", handleOfflinePremium);
    }
    if (offConditionInput && typeof handleOfflinePremium === 'function') {
        offConditionInput.addEventListener("change", handleOfflinePremium);
    }

    // -----------------------------------------------------------------
    // 3. HARDWARE & HEADER (BLE, SCROLL AREA, GESTURE, MUTATION OBSERVER)
    // -----------------------------------------------------------------
    const tombolBle = document.getElementById('btn-ble');
    if (tombolBle && typeof connectBluetoothThermometer === 'function') {
        tombolBle.addEventListener('click', connectBluetoothThermometer);
    }

    const scrollArea = document.querySelector('.scrollable-content');
    const headerSection = document.getElementById('location-section');

    if (scrollArea && headerSection) {
        // Auto-shrink saat konten di-scroll ke bawah
        scrollArea.addEventListener('scroll', () => {
            if (scrollArea.scrollTop > 30) {
                if (!headerSection.classList.contains('shrunk')) {
                    headerSection.classList.add('shrunk');
                    if (typeof updateMiniHeader === 'function') updateMiniHeader();
                }
            } else {
                headerSection.classList.remove('shrunk');
            }
        });

        // Gesture sentuh langsung pada location-section
        let locTouchStartY = 0;
        let locTouchMoved = false;

        headerSection.addEventListener('touchstart', (e) => {
            if (!e.touches || !e.touches[0]) return;
            locTouchStartY = e.touches[0].clientY;
            locTouchMoved = false;
        }, { passive: true });

        headerSection.addEventListener('touchmove', (e) => {
            if (!e.touches || !e.touches[0]) return;
            const deltaY = e.touches[0].clientY - locTouchStartY;
            if (Math.abs(deltaY) < 20) return;
            locTouchMoved = true;

            if (deltaY < -30 && !headerSection.classList.contains('shrunk')) {
                headerSection.classList.add('shrunk');
                if (typeof updateMiniHeader === 'function') updateMiniHeader();
            }
            if (deltaY > 30 && headerSection.classList.contains('shrunk')) {
                headerSection.classList.remove('shrunk');
            }
        }, { passive: true });

        headerSection.addEventListener('touchend', () => {
            locTouchMoved = false;
        });
    }

    // Mutation Observer Cuaca Mini Header
    const headerSectionAlt = document.getElementById('header-id');
    const tempValEl = document.getElementById('temp-val');

    if (headerSectionAlt && headerSection) {
        const headerObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' && headerSection.classList.contains('shrunk')) {
                    if (typeof updateMiniHeader === 'function') updateMiniHeader();
                }
            });
        });
        headerObserver.observe(headerSection, { attributes: true });
    }

    if (tempValEl) {
        const tempObserver = new MutationObserver(() => {
            if (typeof updateMiniHeader === 'function') updateMiniHeader();
        });
        tempObserver.observe(tempValEl, { characterData: true, childList: true, subtree: true });
    }

    // -----------------------------------------------------------------
    // 4. MANAGEMENT ARTIKEL & SWAP MINI STATS
    // -----------------------------------------------------------------
    document.querySelectorAll('.article-slide').forEach((slide, index) => {
        slide.style.cursor = 'pointer';
        slide.addEventListener('click', () => {
            if (typeof bukaArtikelLengkap === 'function') bukaArtikelLengkap(index + 1); 
        });
    });

    const miniMain = document.getElementById('shrunk-main');
    const miniSub = document.getElementById('shrunk-sub');
    if (miniMain && miniSub && typeof jalankanSwapMini === 'function') {
        miniMain.addEventListener('click', jalankanSwapMini);
        miniSub.addEventListener('click', jalankanSwapMini);
    }

    const overlayArtikel = document.querySelector('.article-modal-overlay');
    if (overlayArtikel) {
        overlayArtikel.addEventListener('click', function(event) {
            if (event.target === overlayArtikel) {
                if (typeof tutupArtikelSecaraAman === 'function') tutupArtikelSecaraAman();
                else if (typeof tutupArtikelLengkap === 'function') tutupArtikelLengkap();
            }
        });
    }

    // -----------------------------------------------------------------
    // 5. TIMER CONTROLS & MODE PROSES
    // -----------------------------------------------------------------
    const tombolMode = document.querySelectorAll('.mode-btn[id^="btn-mode-"]');
    tombolMode.forEach(button => {
        button.addEventListener('click', () => {
            const modeDipilih = button.id.replace('btn-mode-', '');
            if (typeof setMode === 'function') {
                setMode(modeDipilih);
            } else {
                console.warn("Fungsi setMode() asli belum dideklarasikan di dalam skrip.");
            }
        });
    });

    const btnSetCustomTime = document.getElementById('set-btn');
    const inputCustomTime = document.getElementById('custom-time');
    if (btnSetCustomTime && inputCustomTime) {
        btnSetCustomTime.addEventListener('click', () => {
            const waktuMenit = parseInt(inputCustomTime.value, 10);
            if (!isNaN(waktuMenit) && waktuMenit > 0) {
                window.DEBUG && console.log(`Menetapkan waktu proofer kustom secara aman: ${waktuMenit} menit.`);
                if (typeof setCustomTime === 'function') {
                    setCustomTime();
                } else if (typeof updateTimerDisplay === 'function') {
                    updateTimerDisplay(waktuMenit * 60);
                }
            } else {
                alert("Mohon masukkan durasi menit yang valid (1 - 120 menit).");
            }
        });
    }

    const btnStartProofing = document.getElementById('main-start-btn');
    if (btnStartProofing) {
        btnStartProofing.addEventListener('click', async () => {
            window.DEBUG && console.log("Tombol Start Proofing dipicu secara aman.");
            let diizinkan = false;
            if (typeof requestNotificationPermission === 'function') {
                diizinkan = await requestNotificationPermission();
            }
            if (!diizinkan) {
                console.warn("Melanjutkan tanpa notifikasi karena izin ditolak OS/User.");
            }
            if (typeof triggerMainProofing === 'function') {
                triggerMainProofing();
            } else {
                console.warn("Fungsi triggerMainProofing() utama belum terdeteksi.");
                if (typeof isProofingActive !== 'undefined') {
                    isProofingActive = true;
                    if (typeof startCountdownEngine === 'function') startCountdownEngine();
                }
            }
        });
    }

    // -----------------------------------------------------------------
    // 6. MANAGEMENT NOTIFIKASI SYSTEM
    // -----------------------------------------------------------------
    const btnNotifBaca = document.getElementById('btn-notif-baca');
    if (btnNotifBaca) {
        btnNotifBaca.addEventListener('click', () => {
            if (typeof NotifSystem !== 'undefined' && typeof NotifSystem.bacaSemua === 'function') {
                NotifSystem.bacaSemua();
            } else {
                window.DEBUG && console.log("Notifikasi ditandai telah dibaca semua.");
            }
        });
    }
    
    // Tambahkan ini tepat di bawah kode close notifikasi Anda
const btnCloseSetting = document.getElementById('btn-close-setting');
if (btnCloseSetting) {
    btnCloseSetting.addEventListener('click', () => {
        // Logikanya sekarang 100% sama dengan notifikasi karena strukturnya sudah kembar
        const modalSettings = btnCloseSetting.closest('.article-modal-header')?.parentElement;
        if (modalSettings) modalSettings.classList.remove('active');
    });
}

    // EVENT LISTENER UNTUK TOMBOL CLOSE PENGATURAN
const btnCloseSettings = document.getElementById('btn-close-settings');
if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
        // Mencari container pembungkus modal pengaturan terdekat (.page-modal)
        const modalSettings = btnCloseSettings.closest('.page-modal');
        if (modalSettings) modalSettings.classList.remove('active');
    });
}

    const btnNotifHapus = document.getElementById('btn-notif-hapus');
    if (btnNotifHapus) {
        btnNotifHapus.addEventListener('click', () => {
            if (confirm("Apakah Anda yakin ingin menghapus semua notifikasi?")) {
                if (typeof NotifSystem !== 'undefined' && typeof NotifSystem.hapusSemua === 'function') {
                    NotifSystem.hapusSemua();
                } else {
                    window.DEBUG && console.log("Semua data riwayat notifikasi dikosongkan.");
                }
            }
        });
    }

    const btnNotifKembali = document.getElementById('btn-notif-kembali');
    if (btnNotifKembali) {
        btnNotifKembali.addEventListener('click', () => {
            const modalNotif = btnNotifKembali.closest('.modal-bottom-actions')?.parentElement;
            if (modalNotif) {
                modalNotif.classList.remove('active');
            } else {
                const altModal = document.getElementById('article-modal');
                if (altModal) altModal.classList.remove('active');
            }
        });
    }

    const notifContainerBox = document.getElementById('notif-list-container');
    if (notifContainerBox) {
        notifContainerBox.addEventListener('click', function(event) {
            const tombolHapus = event.target.closest('.btn-hapus-notif-cepat') || event.target.closest('.btn-hapus-notif');
            if (tombolHapus) {
                const idNotif = tombolHapus.getAttribute('data-id');
                const itemNotif = document.getElementById(`notif-${idNotif}`) || tombolHapus.closest('.notif-item');
                if (itemNotif) itemNotif.remove();

                const sisaNotif = notifContainerBox.querySelectorAll('.notif-item');
                if (sisaNotif.length === 0) {
                    const emptyMsg = document.getElementById('notif-empty-msg');
                    if (emptyMsg) emptyMsg.style.display = 'block';
                }
            }
        });
    }

    // Suntik log default ke sistem notifikasi secara aman
    if (typeof tambahNotifikasi === 'function') {
        tambahNotifikasi("Kalkulator : Mengubah porsi resep menjadi 50 Pcs. Komposisi terigu otomatis disesuaikan.", "resep", "🧾");
        tambahNotifikasi("Rekomendasi Adonan: Suhu Sidoarjo terdeteksi berawan. Sistem menyarankan air es bersuhu 4°C.", "resep", "🧾");
        tambahNotifikasi("Sistem: GPS berhasil mendeteksi posisi di Balonggabus, Candi, Sidoarjo. Tema malam aktif.", "sistem", "⚙️");
        tambahNotifikasi("Capacitor Native: Izin Push Notification disetujui. Pengingat proofer siap berjalan di latar belakang.", "sistem", "⚙️");
    }

    // -----------------------------------------------------------------
    // 7. REAL-TIME KALKULATOR RESEP & DATABASE BINDING
    // -----------------------------------------------------------------
    const recipeContainer = document.getElementById('recipe-cards-container');
    if (recipeContainer) {
        recipeContainer.addEventListener('input', function(event) {
            if (event.target.tagName === 'INPUT') {
                const inputField = event.target;
                const recipeCard = inputField.closest('.recipe-card[data-id]') || inputField.closest('[data-id]');
                
                if (!recipeCard) {
                    window.DEBUG && console.log("Input ditangani langsung oleh Core System.");
                    return; 
                }

                const indexBahan = recipeCard.getAttribute('data-id');
                if (indexBahan === null || indexBahan === undefined) return;

                let dataArray = null;
                if (typeof bumbuResepList !== 'undefined') dataArray = bumbuResepList;
                else if (typeof window.bumbuResepList !== 'undefined') dataArray = window.bumbuResepList;
                else if (typeof bakeryIngredients !== 'undefined') dataArray = bakeryIngredients;
                else if (typeof window.bakeryIngredients !== 'undefined') dataArray = window.bakeryIngredients;

                if (dataArray && dataArray[indexBahan]) {
                    const allInputs = recipeCard.querySelectorAll('input');
                    if (allInputs.length >= 3) {
                        const nilaiTakaran = parseFloat(allInputs[0].value) || 0;
                        const hargaBeli = parseFloat(allInputs[1].value) || 0;
                        const beratPack = parseFloat(allInputs[2].value) || 1;

                        dataArray[indexBahan].ratio = nilaiTakaran;
                        dataArray[indexBahan].price = hargaBeli;
                        dataArray[indexBahan].pack = beratPack;

                        const baseFlourInput = document.getElementById('base-flour');
                        const baseFlourWeight = parseFloat(baseFlourInput?.value) || 1000;
                        const yieldInput = document.getElementById('recipe-yield');
                        const totalYield = parseFloat(yieldInput?.value) || 1;

                        let grossWeight = 0;
                        let costTerpakai = 0;
                        const ing = dataArray[indexBahan];

                        if (ing.type === "Dough" || ing.category === "Bahan Kering" || ing.category === "Bahan Basah" || ing.category === "Bahan Pengembang") {
                            let ratio = ing.isFlour ? 100 : nilaiTakaran;
                            grossWeight = (ratio / 100) * baseFlourWeight;
                        } else {
                            grossWeight = nilaiTakaran * totalYield;
                        }
                        costTerpakai = (grossWeight / beratPack) * hargaBeli;

                        const idBahan = ing.id !== undefined ? ing.id : indexBahan;
                        const grossEl = document.getElementById(`gross-${idBahan}`);
                        if (grossEl) grossEl.innerText = Math.round(grossWeight);
                        
                        const costEl = document.getElementById(`cost-${idBahan}`);
                        if (costEl) costEl.innerText = Math.round(costTerpakai).toLocaleString('id-ID');

                        const grossTabEl = document.getElementById(`gross-table-${idBahan}`);
                        if (grossTabEl) grossTabEl.innerText = Math.round(grossWeight);
                        const costTabEl = document.getElementById(`cost-table-${idBahan}`);
                        if (costTabEl) costTabEl.innerText = Math.round(costTerpakai).toLocaleString('id-ID');
                    }
                }

                if (typeof hitungHPPBakeryTotal === 'function') hitungHPPBakeryTotal();
                else if (typeof window.hitungHPPBakeryTotal === 'function') window.hitungHPPBakeryTotal();
            }
        });
    }

    // Tombol DB Simpan/Muat/Impor Resep
    const btnSimpan = document.getElementById('btn-simpan-resep');
    if (btnSimpan && typeof simpanResepKeDatabase === 'function') {
        btnSimpan.addEventListener('click', simpanResepKeDatabase);
    }

    const btnMuat = document.getElementById('btn-muat-resep');
    if (btnMuat && typeof window.tampilkanDaftarResepTersimpan === 'function') {
        btnMuat.addEventListener('click', () => window.tampilkanDaftarResepTersimpan());
    }

    const inputImpor = document.getElementById('recipe-import-input');
    if (inputImpor) {
        inputImpor.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (file && typeof window.imporResepDariFile === 'function') {
                await window.imporResepDariFile(file);
            }
            e.target.value = '';
        });
    }

    const btnRecipeCloseTop = document.getElementById('btn-recipe-close-top');
    if (btnRecipeCloseTop && typeof tutupHalamanResepSecaraAman === 'function') {
        btnRecipeCloseTop.addEventListener('click', tutupHalamanResepSecaraAman);
    }

    const btnRecipeCloseBottom = document.getElementById('btn-recipe-close-bottom');
    if (btnRecipeCloseBottom && typeof tutupHalamanResepSecaraAman === 'function') {
        btnRecipeCloseBottom.addEventListener('click', tutupHalamanResepSecaraAman);
    }

    const btnCetak = document.getElementById('btn-cetak-pdf'); // Sesuaikan ID tombol Anda
    if (btnCetak) {
        btnCetak.addEventListener('click', () => window.cetakLaporanPdfNative());
    }
});

/* ============================================================*/

    // --- LOGIKA KLIK & PEMFILTERAN DATA ---
    // 2. Fungsi Filter Tunggal (Diperkuat: Case-Insensitive & Fallback)
window.filterTips = function() {
    // Gunakan toLowerCase() agar pencocokan kebal terhadap typo huruf besar/kecil
    const selectedCategory = (window.tipFilterState.category || 'all').toLowerCase().trim();
    const searchQuery = (window.tipFilterState.searchQuery || '').toLowerCase().trim();
    
    const tipCards = document.querySelectorAll('.tip-card');
    const emptyState = document.getElementById('tip-empty-state');
    let visibleCount = 0;

    tipCards.forEach(card => {
        const text = card.innerText.toLowerCase();
        const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
        const cardCategoryAttr = (card.getAttribute('data-category') || '').toLowerCase().trim();
        
        // Cerdas mencocokkan kategori, termasuk membaca teks badge jika data-category kosong
        const badgeElement = card.querySelector('.tip-category-badge');
        const badgeText = badgeElement ? badgeElement.textContent.toLowerCase() : '';
        
        const categoryMatches = (
            selectedCategory === 'all' || 
            cardCategoryAttr === selectedCategory ||
            badgeText.includes(selectedCategory)
        );
        
        const searchMatches = (!searchQuery || text.includes(searchQuery) || keywords.includes(searchQuery));

        if (categoryMatches && searchMatches) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
        if(visibleCount === 0) emptyState.innerHTML = `Tidak ada tips yang cocok untuk kategori/pencarian ini.`;
    }

    if (searchQuery) {
        logUserSearchBehavior(searchQuery, visibleCount);
    }
};

window.addEventListener('online', async () => {
    console.log("Koneksi internet pulih. Mengirim antrean resep offline ke Supabase...");
    let queue = JSON.parse(localStorage.getItem('offline_recipe_queue') || '[]');
    
    if (queue.length > 0) {
        // Dapatkan user ID terlebih dahulu
        const { data: { user } } = await supabase.auth.getUser();

        for (let item of queue) {
            // Bungkus rapi ke dalam payload 5 kolom agar sesuai skema database
            const payload = {
                id: item.id,
                user_id: user ? user.id : null,
                name: item.nama || item.name,
                details: item, // Semua bahanBaku dkk masuk dengan aman di sini
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase.from('recipes').upsert([payload]);
            if (error) {
                console.error("Gagal sinkronisasi resep:", error);
                return;
            }
        }
        localStorage.removeItem('offline_recipe_queue');
        console.log("Semua resep offline berhasil disinkronkan ke Cloud Supabase.");
    }
});

    // A. Hubungkan klik luar pada overlay buram artikel agar otomatis menutup
    const overlayArtikel = document.querySelector('.article-modal-overlay');
    if (overlayArtikel) {
        overlayArtikel.addEventListener('click', function(event) {
            if (event.target === overlayArtikel) {
                tutupArtikelSecaraAman();
            }
        });
    }

    // Filter tab sudah ditangani oleh onclick filterNotif() di HTML

// Pengaman kapasitas maksimum resep jika belum didefinisikan di file lain
if (typeof MAX_RESEP_TERSIMPAN === 'undefined') {
    const MAX_RESEP_TERSIMPAN = 10; 
}

// ==========================================
// 4. FUNGSI EKSPOR & IMPOR FILE JSON
// ==========================================
window.eksporSemuaResep = async function() {
    try {
        let dataResepArray = [];
        
        // Mengambil data menggunakan fungsi internal aplikasi Anda
        if (typeof bacaSemuaResepDariPerangkat === 'function') {
            dataResepArray = await bacaSemuaResepDariPerangkat();
        } else if (typeof readRecipesFromStorage === 'function') {
            dataResepArray = readRecipesFromStorage();
        } else {
            // Fallback membaca localStorage dari berbagai kemungkinan key
            const raw = localStorage.getItem('daftar_resep') || localStorage.getItem('resep_list') || localStorage.getItem('recipes') || '[]';
            dataResepArray = JSON.parse(raw);
        }

        // Validasi jika resep kosong
        if (!dataResepArray || dataResepArray.length === 0) {
            alert("Tidak ada resep yang ditemukan untuk dicadangkan.");
            return;
        }

        // Ubah array resep menjadi format JSON string yang rapi
        const dataResepString = JSON.stringify(dataResepArray, null, 2);
        
        // Format nama file otomatis dengan tanggal hari ini
        const tanggalHariIni = new Date().toISOString().split('T')[0];
        const namaFile = `Cadangan_Resep${tanggalHariIni}.txt`;
        
        // Proses pembuatan dan pengunduhan file .txt
        const blob = new Blob([dataResepString], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = namaFile;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`Berhasil mencadangkan ${dataResepArray.length} resep! Silakan simpan file .txt ini.`);
    } catch (error) {
        console.error("Gagal mencadangkan resep:", error);
        alert("Terjadi kesalahan saat membuat cadangan resep.");
    }
};
// ==========================================
// 2. FUNGSI IMPOR (PULIHKAN RESEP)
// ==========================================

// Memicu klik pada input file tersembunyi
window.pilihFileCadangan = function() {
    const inputEl = document.getElementById('recipe-import-input');
    if (inputEl) inputEl.click();
};

// Proses pembacaan file .txt pilihan pengguna
window.prosesImporResep = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // [BUG FIX] Validasi ketat: Cegah file gambar (.png, .jpg) dibaca sebagai JSON
    if (file.type !== "application/json" && !file.name.toLowerCase().endsWith('.json')) {
        alert("Peringatan: Mohon pilih file cadangan berformat .json yang valid, bukan gambar atau format lainnya.");
        event.target.value = ''; // Reset input
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const kontenFile = e.target.result;
            
            if (typeof kontenFile === 'string' && kontenFile.trim().startsWith('<')) {
                throw new Error("File merespons dengan format HTML, bukan JSON.");
            }

            const dataParsed = JSON.parse(kontenFile);
            
            if (!Array.isArray(dataParsed)) {
                throw new Error("Format data di dalam file tidak valid.");
            }

            if (confirm(`File cadangan terdeteksi berisi ${dataParsed.length} resep. Apakah Anda ingin memulihkan resep-resep ini sekarang?`)) {
                localStorage.setItem('daftar_resep', JSON.stringify(dataParsed));
                
                if (typeof simpanDaftarResepKePerangkat === 'function') {
                    await simpanDaftarResepKePerangkat(dataParsed);
                }

                if (typeof syncLocalDataToSupabase === 'function') {
                    try {
                        console.log("Mengirim data impor ke Supabase...");
                        await syncLocalDataToSupabase();
                    } catch (syncErr) {
                        console.error("Gagal sinkronisasi otomatis ke Supabase:", syncErr);
                    }
                }

                alert(`Berhasil memulihkan dan menyinkronkan ${dataParsed.length} resep!`);
                
                if (typeof tampilkanDaftarResepTersimpan === 'function') {
                    tampilkanDaftarResepTersimpan();
                } else if (typeof muatDaftarResep === 'function') {
                    muatDaftarResep();
                } else {
                    location.reload();
                }
            }
        } catch (error) {
            console.error("Gagal membaca file:", error.message || error);
            alert("Maaf, file yang Anda pilih tidak valid, rusak, atau bukan file JSON cadangan resep yang benar.");
        } finally {
            event.target.value = '';
        }
    };
    
    reader.readAsText(file);
};

// 2. FUNGSI MUAT RESEP
window.muatResepDariDatabase = async function(idResep) {
    try {
        const daftar = await bacaSemuaResepDariPerangkat();
        if (!daftar.length) {
            alert("📂 Tidak ada resep yang tersimpan di perangkat ini.");
            return;
        }
        const resep = idResep ? daftar.find(r => r.id === idResep) : daftar[0];
        if (!resep) {
            alert("Resep tidak ditemukan.");
            return;
        }
        terapkanResepKeKalkulator(resep);
        window.tutupDaftarResepTersimpan();

        if (typeof NotifSystem !== 'undefined' && typeof NotifSystem.tambah === 'function') {
            NotifSystem.tambah('resep', '📂 Resep Dimuat', `"${resep.nama}" diterapkan ke kalkulator.`, '🍩');
        } else {
            alert(`📂 Resep "${resep.nama}" berhasil dimuat.`);
        }
    } catch (e) {
        console.error("Gagal memuat resep:", e);
        alert("Gagal memuat resep: " + e.message);
    }
};

// 3. FUNGSI HAPUS RESEP
window.hapusResepTersimpan = async function(idResep) {
    try {
        let daftar = await bacaSemuaResepDariPerangkat();
        const resep = daftar.find(r => r.id === idResep);
        if (!resep) return;
        if (!confirm(`Hapus resep "${resep.nama}" dari perangkat ini?`)) return;
        daftar = daftar.filter(r => r.id !== idResep);
        await simpanDaftarResepKePerangkat(daftar);
        await window.renderDaftarResepTersimpan();
        if (typeof NotifSystem !== 'undefined' && typeof NotifSystem.tambah === 'function') {
            NotifSystem.tambah('resep', '🗑️ Resep Dihapus', `"${resep.nama}" dihapus dari perangkat.`, '🧾');
        }
    } catch (e) {
        alert("Gagal menghapus resep: " + e.message);
    }
};

// 4. FUNGSI RENDER (MENAMPILKAN DAFTAR KE HTML)

window.tutupDaftarResepTersimpan = function() {
    const modal = document.getElementById('recipe-list-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('inert', '');
    }
    document.body.style.overflow = '';
};

window.tutupDaftarResepTersimpan = tutupDaftarResepTersimpan;

window.muatResepTersimpan = async function(resepId) {
    try {
        console.log("Mencari data resep dengan ID:", resepId);
        let savedRecipes = [];

        // LANGKAH 1: Coba ambil dari IndexedDB (Sistem Luring Utama Anda)
        if (typeof initIndexedDB === 'function') {
            try {
                const db = await initIndexedDB();
                savedRecipes = await db.getAll('recipes');
            } catch(e) {
                console.warn("Pencarian IndexedDB dilewati:", e);
            }
        }

        // LANGKAH 2: Jika di IndexedDB kosong, gunakan fungsi baca bawaan Anda (Fallback Storage/Capacitor)
        if ((!savedRecipes || savedRecipes.length === 0) && typeof bacaSemuaResepDariPerangkat === 'function') {
            savedRecipes = await bacaSemuaResepDariPerangkat();
        }

        // LANGKAH 3: Fallback terakhir ke LocalStorage Premium
        if (!savedRecipes || savedRecipes.length === 0) {
            const rawData = localStorage.getItem('premium_saved_recipes');
            if (rawData) savedRecipes = JSON.parse(rawData);
        }

        // COCOKKAN ID
        const resepData = savedRecipes.find(r => String(r.id) === String(resepId));

        if (!resepData) {
            alert("Maaf, data resep tidak ditemukan di memori perangkat ini.");
            return;
        }

        console.log("Resep ditemukan! Memuat ke kalkulator...", resepData);

        // --- PROSES TRANSFER DATA KE KALKULATOR UTAMA ---
        // (Berjaga-jaga jika format array bahan bernama 'ingredients', 'bahan', atau 'komposisi')
        window.bakeryIngredients = resepData.bahanBaku || resepData.ingredients || resepData.bahan || resepData.komposisi || [];
        // JIKA Anda memiliki input nama resep di layar utama, otomatis diisi:
        const inputNama = document.getElementById('recipe-name-input');
        if (inputNama) inputNama.value = resepData.nama || '';

        // --- RENDER ULANG UI ---
        if (typeof perbaruiPreviewBahanBaru === 'function') perbaruiPreviewBahanBaru();
        if (typeof renderRecipeTableBakuTotal === 'function') renderRecipeTableBakuTotal();
        if (typeof hitungHPPBakeryTotal === 'function') hitungHPPBakeryTotal();
        if (typeof syncInventoryWithProfile === 'function') syncInventoryWithProfile();

        // --- TUTUP MODAL ---
        const modal = document.getElementById('recipe-list-modal');
        if (modal) {
            modal.classList.remove('active');
            // Pastikan overlay tertutup
            document.body.style.overflow = '';
        }
        if (typeof window.tutupDaftarResepTersimpan === 'function') {
            window.tutupDaftarResepTersimpan();
        }

        // --- NOTIFIKASI SUKSES ---
        if (typeof NotifSystem !== 'undefined' && typeof NotifSystem.tambah === 'function') {
            NotifSystem.tambah('resep', '✓ Resep Dimuat', `Formula "${resepData.nama || 'Tanpa Nama'}" siap digunakan.`, '📂');
        } else {
            alert(`Resep "${resepData.nama || 'Tanpa Nama'}" berhasil dimuat ke kalkulator!`);
        }

    } catch (error) {
        console.error("Gagal mengeksekusi pemuatan resep:", error);
        alert("Terjadi kesalahan sistem saat menarik data dari database.");
    }
};

// Daftarkan ke semua alias fungsi agar tombol di HTML tidak meleset
window.hapusResep = eksekusiHapusResepMaster;
window.hapusResepTersimpan = eksekusiHapusResepMaster;
window.hapusResepDariDatabase = eksekusiHapusResepMaster;


window.cetakLaporanPdfNative = function() {
    const element = document.getElementById('konten-pdf');
    if (element && typeof html2pdf !== 'undefined') {
        html2pdf().from(element).outputPdf('datauristring').then(function(pdfBase64Str) {
            const base64Murni = pdfBase64Str.split(',')[1];
            if (typeof simpanPdfNative === 'function') {
                simpanPdfNative(base64Murni, 'Laporan_Proofing.pdf');
            }
        });
    } else {
        console.warn("Elemen #konten-pdf atau library html2pdf tidak ditemukan.");
    }
};

// Renderer kanonik daftar resep. Definisi lama yang memakai #recipe-list-modal
// tidak sesuai dengan tampilan resep utama yang memakai #recipe-master-view.
window.tampilkanDaftarResepTersimpan = async function() {
    const container = document.getElementById('recipe-list-container');
    const modalList = document.getElementById('recipe');
    
    if (!container) return;

    const scrollPos = container.scrollTop;

    if (modalList) {
        modalList.classList.add('active');
        modalList.style.display = 'flex';
        modalList.removeAttribute('inert');
    }

    const cardBaruHTML = `
        <div onclick="if(typeof bukaDetailResepBaru === 'function') bukaDetailResepBaru()" style="background:#fff;border:2px dashed #E67E22;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;box-shadow:0 2px 6px rgba(230,126,34,.05);">
            <span style="font-size:1.4rem;font-weight:bold;color:#E67E22;">+</span>
            <strong style="font-size:.9rem;color:#E67E22;">Buat Resep Baru</strong>
        </div>`;

    // 1. BACA DATA LOKAL TERLEBIH DAHULU (INSTANT UI)
    let daftarResep = [];
    try {
        if (typeof bacaSemuaResepDariPerangkat === 'function') {
            daftarResep = await bacaSemuaResepDariPerangkat();
        }
        if (!Array.isArray(daftarResep)) daftarResep = [];
    } catch (error) {
        console.error('Gagal membaca resep lokal:', error);
    }

    // 2. FUNGSI UNTUK RENDER CARD (TIDAK MERUSAK LAYOUT CONTAINER)
    function renderList(list) {
        container.innerHTML = cardBaruHTML;
        if (list.length === 0) {
            container.insertAdjacentHTML('beforeend', '<div style="text-align:center;padding:30px;color:#94a3b8;font-style:italic;">Belum ada resep tersimpan.</div>');
            return;
        }

        for (const resep of list) {
            const card = document.createElement('div');
            card.className = "recipe-card-item";
            card.style.cssText = "background: rgb(255, 255, 255); border: 1px solid rgb(226, 232, 240); border-radius: 10px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: rgba(0, 0, 0, 0.02) 0px 1px 3px; position: relative;";

            const namaResep = (typeof escapeHtmlResep === 'function' ? escapeHtmlResep(resep.nama || resep.name) : (resep.nama || resep.name)) || 'Tanpa Nama';
            const tepungUtama = resep.tepungUtama || 1000;
            const targetYield = resep.targetYield || 1;
            const waktuSimpan = typeof formatTanggalResep === 'function' ? formatTanggalResep(resep.waktuSimpan || resep.updated_at) : (resep.waktuSimpan || '-');

            card.innerHTML = `
                <div style="min-width:0; flex:1; padding-right:8px;">
                    <strong style="font-size:.9rem;color:var(--chocolate);display:block;margin-bottom:2px;">${namaResep}</strong>
                    <small style="color:#64748b;font-size:.72rem;">Terigu: ${tepungUtama}g | Porsi: ${targetYield} pcs</small><br>
                    <small style="color:#94a3b8;font-size:.68rem;">Disimpan: ${waktuSimpan}</small>
                </div>
                
                <div class="recipe-menu-wrapper" style="position:relative; flex-shrink:0;">
                    <button type="button" class="recipe-menu-btn" style="background:transparent; border:none; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#64748b; cursor:pointer;">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <circle cx="12" cy="5" r="2"/>
                            <circle cx="12" cy="12" r="2"/>
                            <circle cx="12" cy="19" r="2"/>
                        </svg>
                    </button>
                    <div class="recipe-dropdown-menu" style="display:none; position:absolute; right:0; top:100%; margin-top:4px; background:#ffffff; border:1px solid rgba(78, 52, 46, 0.1); box-shadow:0 10px 25px rgba(0,0,0,0.1); border-radius:8px; padding:6px; z-index:50; min-width:130px;">
                        <button type="button" class="recipe-dropdown-item recipe-load-btn" style="display:block; width:100%; text-align:left; background:transparent; border:none; padding:8px 12px; font-size:0.78rem; font-weight:600; color:#334155; cursor:pointer;">Muat</button>
                        <button type="button" class="recipe-dropdown-item recipe-edit-btn" style="display:block; width:100%; text-align:left; background:transparent; border:none; padding:8px 12px; font-size:0.78rem; font-weight:600; color:#334155; cursor:pointer;">Edit</button>
                        <button type="button" class="recipe-dropdown-item recipe-copy-btn" style="display:block; width:100%; text-align:left; background:transparent; border:none; padding:8px 12px; font-size:0.78rem; font-weight:600; color:#334155; cursor:pointer;">Salin</button>
                        <button type="button" class="recipe-dropdown-item recipe-share-btn" style="display:block; width:100%; text-align:left; background:transparent; border:none; padding:8px 12px; font-size:0.78rem; font-weight:600; color:#334155; cursor:pointer;">Bagikan</button>
                        <button type="button" class="recipe-dropdown-item recipe-print-btn" style="display:block; width:100%; text-align:left; background:transparent; border:none; padding:8px 12px; font-size:0.78rem; font-weight:600; color:#334155; cursor:pointer;">Print</button>
                        <button type="button" class="recipe-dropdown-item recipe-delete-btn" style="display:block; width:100%; text-align:left; background:transparent; border:none; padding:8px 12px; font-size:0.78rem; font-weight:600; color:#e74c3c; cursor:pointer;">Hapus</button>
                    </div>
                </div>
            `;

            card.querySelector('.recipe-load-btn').addEventListener('click', () => {
                // "MUAT": buka resep ini ke layar kalkulator sebagai TITIK AWAL,
                // TANPA menandainya sebagai resep yang sedang diedit. Jadi kalau
                // pengguna menyimpan, tersimpan sebagai resep BARU -- resep asli
                // yang ada di daftar tidak ikut tertimpa/berubah.
                currentEditingRecipeId = null;

                if (typeof terapkanResepKeKalkulator === 'function') terapkanResepKeKalkulator(resep);

                if (resep.langkahProduksi && Array.isArray(resep.langkahProduksi)) {
                    activeRecipeSteps = [...resep.langkahProduksi];
                } else {
                    activeRecipeSteps = [];
                }
                if (typeof renderLangkahProduksi === 'function') renderLangkahProduksi();

                const nameInput = document.getElementById('recipe-save-name');
                if (nameInput) nameInput.value = resep.nama || '';

                document.getElementById('recipe-master-view').style.display = 'none';
                document.getElementById('recipe-detail-view').style.display = 'flex';

                if (typeof showToast === 'function') {
                    showToast('Resep dimuat sebagai dasar baru. Simpan akan membuat resep baru, bukan menimpa yang asli.');
                }
            });

            card.querySelector('.recipe-edit-btn').addEventListener('click', () => {
                // "EDIT": membuka & menandai resep ini sebagai yang sedang diedit.
                // Menyimpan akan MENIMPA/memperbarui resep yang sama persis.
                if (typeof bukaDetailResepEksisting === 'function') bukaDetailResepEksisting(resep);
            });

            // TOMBOL SALIN (PERBAIKAN UTAMA: TANPA RE-RENDER TOTAL KCONTAINER)
            card.querySelector('.recipe-copy-btn').addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const duplicatedRecipe = {
                    ...resep,
                    id: "resep_" + Date.now(),
                    nama: `${resep.nama || 'Tanpa Nama'} (Salinan)`,
                    waktuSimpan: new Date().toISOString()
                };

                // Update data memori & simpan lokal
                daftarResep.unshift(duplicatedRecipe);
                if (typeof simpanDaftarResepKePerangkat === 'function') {
                    await simpanDaftarResepKePerangkat(daftarResep);
                }

                // Render ulang secara instan tanpa memicu 'Memuat...'
                renderList(daftarResep);

                // Notifikasi non-blocking
                if (typeof showToast === 'function') showToast('Resep berhasil digandakan! 📄');

                // Simpan ke Supabase di background tanpa mengganggu UI
                if (navigator.onLine && typeof supabase !== 'undefined') {
                    try {
                        const payload = { id: duplicatedRecipe.id, name: duplicatedRecipe.nama, details: duplicatedRecipe, updated_at: duplicatedRecipe.waktuSimpan };
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) payload.user_id = user.id;
                        await supabase.from('recipes').upsert([payload]);
                    } catch (err) {
                        console.warn("Gagal simpan salinan ke cloud", err);
                    }
                }

                if (window.GamificationUI && typeof window.GamificationUI.refresh === 'function') {
                    window.GamificationUI.refresh();
                }
            });

            card.querySelector('.recipe-share-btn').addEventListener('click', async () => {
                const shareData = { title: namaResep, text: `Resep ${namaResep} - Terigu: ${tepungUtama}g, Porsi: ${targetYield} pcs`, url: window.location.href };
                if (navigator.share) {
                    try { await navigator.share(shareData); } catch (err) {}
                }
            });

            card.querySelector('.recipe-print-btn').addEventListener('click', () => {
                const printWindow = window.open('', '_blank');
                if (!printWindow) return;
                printWindow.document.write('<!DOCTYPE html><html><head><title>Cetak Resep</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#2c3e50;}h2{color:#4e342e;border-bottom:2px solid #e7e7e7;padding-bottom:10px;}.box{background:#fdfbf7;border:1px solid #e2e8f0;border-radius:8px;padding:15px;}.box p{margin:8px 0;font-size:14px;}</style></head><body><h2>🍩 ' + namaResep + '</h2><div class="box"><p><strong>Tepung Utama:</strong> ' + tepungUtama + ' gram</p><p><strong>Target Porsi:</strong> ' + targetYield + ' pcs</p><p><strong>Waktu Disimpan:</strong> ' + waktuSimpan + '</p></div><script>window.onload=function(){window.print();window.close();};<\/script></body></html>');
                printWindow.document.close();
            });

            card.querySelector('.recipe-delete-btn').addEventListener('click', async () => {
                if (!confirm(`Hapus resep "${namaResep}" permanen?`)) return;
                daftarResep = daftarResep.filter(item => String(item.id) !== String(resep.id));
                if (typeof simpanDaftarResepKePerangkat === 'function') await simpanDaftarResepKePerangkat(daftarResep);
                
                renderList(daftarResep);

                if (navigator.onLine && typeof supabase !== 'undefined') {
                    try { await supabase.from('recipes').delete().eq('id', resep.id); } 
                    catch (error) { console.warn('Gagal hapus cloud:', error); }
                }
            });

            container.appendChild(card);
        }
    }

    // Render awal instan dari lokal
    renderList(daftarResep);
    container.scrollTop = scrollPos;

    // 3. SINKRONISASI CLOUD DI BACKGROUND (TIDAK MERUSAK UI KELIHATAN)
    if (navigator.onLine && typeof supabase !== 'undefined') {
        try {
            const { data, error } = await supabase.from('recipes').select('*');
            if (!error && data) {
                let adaPerubahan = false;
                for (const row of data) {
                    const cloudRecipe = typeof row.details === 'string' 
                        ? JSON.parse(row.details) 
                        : (row.details || { id: row.id, nama: row.name, ...row });
                    
                    if (cloudRecipe && cloudRecipe.id != null && !daftarResep.some(item => String(item.id) === String(cloudRecipe.id))) {
                        daftarResep.push(cloudRecipe);
                        adaPerubahan = true;
                    }
                }
                if (adaPerubahan) {
                    if (typeof simpanDaftarResepKePerangkat === 'function') {
                        await simpanDaftarResepKePerangkat(daftarResep);
                    }
                    renderList(daftarResep);
                }
            }
        } catch (error) {
            console.warn('Sinkronisasi cloud dilewati:', error);
        }
    }
};
window.tampilkanDaftarResepTersimpan = tampilkanDaftarResepTersimpan

document.addEventListener('click', (e) => {
    // Cek apakah yang diklik adalah tombol menu titik tiga atau bagian di dalamnya
    const menuBtn = e.target.closest('.recipe-menu-btn');
    
    if (menuBtn) {
        const wrapper = menuBtn.closest('.recipe-menu-wrapper');
        
        // Tutup semua menu lain yang mungkin sedang terbuka di layar
        document.querySelectorAll('.recipe-menu-wrapper').forEach(item => {
            if (item !== wrapper) {
                item.classList.remove('active');
                const menu = item.querySelector('.recipe-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });
        
        // Toggle status aktif pada wrapper saat ini
        wrapper.classList.toggle('active');
        const dropdownMenu = wrapper.querySelector('.recipe-dropdown-menu');
        
        if (dropdownMenu) {
            // Sinkronkan properti display inline dengan status aktif
            if (wrapper.classList.contains('active')) {
                dropdownMenu.style.display = 'block';
                // Reset dulu ke posisi default (ke bawah) sebelum diukur ulang
                dropdownMenu.style.top = '100%';
                dropdownMenu.style.bottom = 'auto';
                dropdownMenu.style.marginTop = '4px';
                dropdownMenu.style.marginBottom = '0';

                // PERBAIKAN: cek sisa ruang di bawah tombol titik tiga. Kalau tidak
                // cukup untuk menampung menu (mis. kartu resep paling bawah), buka
                // menu ke ATAS supaya tidak ketiban tombol TUTUP / bottom navbar.
                // CATATAN: properti diatur langsung via inline style (bukan class),
                // karena elemen ini sudah punya inline style top/margin-top bawaan
                // dari template HTML-nya -- class CSS tidak akan pernah menang
                // melawan inline style dengan properti yang sama.
                const listContainer = wrapper.closest('#recipe-list-container');
                const btnRect = menuBtn.getBoundingClientRect();
                const menuHeight = dropdownMenu.offsetHeight;
                const boundaryBottom = listContainer
                    ? listContainer.getBoundingClientRect().bottom
                    : window.innerHeight;
                const boundaryTop = listContainer
                    ? listContainer.getBoundingClientRect().top
                    : 0;
                const spaceBelow = boundaryBottom - btnRect.bottom;
                const spaceAbove = btnRect.top - boundaryTop;

                if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                    dropdownMenu.style.top = 'auto';
                    dropdownMenu.style.bottom = '100%';
                    dropdownMenu.style.marginTop = '0';
                    dropdownMenu.style.marginBottom = '4px';
                }
            } else {
                dropdownMenu.style.display = 'none';
            }
        }
        
        e.stopPropagation();
        return;
    }

    // Jika pengguna mengklik di luar area menu, tutup semua dropdown yang terbuka
    if (!e.target.closest('.recipe-dropdown-menu')) {
        document.querySelectorAll('.recipe-menu-wrapper').forEach(item => {
            item.classList.remove('active');
            const menu = item.querySelector('.recipe-dropdown-menu');
            if (menu) {
                menu.style.display = 'none';
                menu.classList.remove('dropup');
            }
        });
    }
});

// Ekspos fungsi modul ke window agar onclick HTML berfungsi
window.handleTimerClick = handleTimerClick;
window.initApp = initApp;
window.connectEnvironmentalSensor = connectEnvironmentalSensor;
window.setMode = setMode;
window.triggerMainProofing = triggerMainProofing;
window.startProofing = startProofing;


// Catatan: showToast (versi toast bertema, bukan alert) didefinisikan di script
// biasa paling bawah file (bukan di sini) supaya tidak menimpa versi alert() lama.

// Fallback global untuk tombol profil inline bila script module belum selesai dieksekusi.
(function () {
    function profileGet(key, fallback) {
        return localStorage.getItem(key) || fallback || "";
    }

    function profileSet(key, value) {
        localStorage.setItem(key, value);
    }

    function showProfileToast(message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    if (typeof window.openEditProfile !== "function") {
        window.openEditProfile = function () {
            const name = document.getElementById("edit-name");
            const bakery = document.getElementById("edit-bakery");
            const phone = document.getElementById("edit-phone");
            const email = document.getElementById("edit-email");
            const userModal = document.getElementById("user-modal");
            const editModal = document.getElementById("edit-profile-modal");

            if (name) name.value = profileGet("profile_name", "");
            if (bakery) bakery.value = profileGet("profile_bakery", "");
            if (phone) phone.value = profileGet("profile_phone", "");
            if (email) email.value = profileGet("profile_email", "");

            userModal?.classList.remove("active");
            userModal?.setAttribute("inert", "");
            editModal?.classList.add("active");
            editModal?.removeAttribute("inert");
            document.body.style.overflow = "hidden";
        };
    }

    if (typeof window.closeEditProfile !== "function") {
        window.closeEditProfile = function () {
            const userModal = document.getElementById("user-modal");
            const editModal = document.getElementById("edit-profile-modal");

            editModal?.classList.remove("active");
            editModal?.setAttribute("inert", "");
            userModal?.classList.add("active");
            userModal?.removeAttribute("inert");
            document.body.style.overflow = "hidden";
        };
    }

    if (typeof window.saveProfile !== "function") {
        window.saveProfile = function () {
            const profile = {
                name: document.getElementById("edit-name")?.value.trim() || "Pengguna",
                bakery: document.getElementById("edit-bakery")?.value.trim() || "Nama Bakery",
                phone: document.getElementById("edit-phone")?.value.trim() || "-",
                email: document.getElementById("edit-email")?.value.trim() || "-"
            };

            profileSet("profile_name", profile.name);
            profileSet("profile_bakery", profile.bakery);
            profileSet("profile_phone", profile.phone);
            profileSet("profile_email", profile.email);
            profileSet("user_profile", JSON.stringify(profile));

            const profileName = document.getElementById("profile-name");
            const profileBakery = document.getElementById("profile-bakery");
            const profilePhone = document.getElementById("profile-phone");
            const profileEmail = document.getElementById("profile-email");

            if (profileName) profileName.textContent = profile.name;
            if (profileBakery) profileBakery.textContent = profile.bakery;
            if (profilePhone) profilePhone.textContent = profile.phone;
            if (profileEmail) profileEmail.textContent = profile.email;

            window.closeEditProfile();
            showProfileToast("Profil berhasil diperbarui.");
        };
    }
})();

(function(){
    function parseSimpleCall(code, el) {
        // match patterns like funcName('arg', this, 123)
        var m = String(code).trim().match(/^\s*(?:window\.)?([A-Za-z_$][\w$]*)\s*\(([\s\S]*)\)\s*;?\s*$/);
        if (!m) return null;
        var fnName = m[1];
        var argsStr = m[2].trim();
        var args = [];
        if (argsStr.length > 0) {
            // split by commas but keep quoted strings together
            var parts = argsStr.match(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|[^,]+)/g) || [];
            for (var i = 0; i < parts.length; i++) {
                var a = parts[i].trim();
                if (a === 'this') { args.push(el); continue; }
                if (/^['"`].*['"`]$/.test(a)) { args.push(a.slice(1, -1)); continue; }
                if (/^\d+(?:\.\d+)?$/.test(a)) { args.push(Number(a)); continue; }
                if (/^(true|false|null)$/.test(a)) { args.push(JSON.parse(a)); continue; }
                // unknown complex expression -> bail out
                return null;
            }
        }
        var fn = window[fnName];
        if (typeof fn !== 'function') return null;
        return { fn: fn, args: args };
    }

    function executeHandler(code, event, el) {
        try {
            var simple = parseSimpleCall(code, el);
            if (simple !== null) {
                return simple.fn.apply(el, simple.args);
            }
            // fallback to function constructor for complex handlers
            var fn = new Function('event','el', code);
            return fn.call(el, event, el);
        } catch (e) {
            window.DEBUG && console.error('Handler exec error:', e);
            return undefined;
        }
    }

    function findClosestData(el, key) {
        while (el && el !== document) {
            if (el.dataset && el.dataset[key]) return el;
            el = el.parentElement;
        }
        return null;
    }

    document.addEventListener('click', function(e){
        var el = findClosestData(e.target, 'onclick');
        if (el) { executeHandler(el.getAttribute('data-onclick'), e, el); }
    });
    document.addEventListener('input', function(e){
        var el = findClosestData(e.target, 'oninput');
        if (el) { executeHandler(el.getAttribute('data-oninput'), e, el); }
    });
    document.addEventListener('change', function(e){
        var el = findClosestData(e.target, 'onchange');
        if (el) { executeHandler(el.getAttribute('data-onchange'), e, el); }
    });
    document.addEventListener('mouseover', function(e){
        var el = findClosestData(e.target, 'onmouseover');
        if (el) { executeHandler(el.getAttribute('data-onmouseover'), e, el); }
    }, true);
    document.addEventListener('mouseout', function(e){
        var el = findClosestData(e.target, 'onmouseout');
        if (el) { executeHandler(el.getAttribute('data-onmouseout'), e, el); }
    }, true);
    document.addEventListener('submit', function(e){
        var form = e.target;
        var code = form.getAttribute && form.getAttribute('data-onsubmit');
        if (code) {
            var res = executeHandler(code, e, form);
            if (res === false) e.preventDefault();
        }
    }, true);
})();

window.tampilkanPopupAchievement = function(judul, desc) {
    console.log("Fungsi pop-up dipanggil dengan data:", judul); // Cek apakah baris ini muncul di console
    
    const popup = document.getElementById('achievement-popup');
    if (!popup) {
        console.error("Elemen pop-up tidak ditemukan!");
        return;
    }
    
    popup.classList.add('show');
}

// Listener mode proofing sudah diikat sekali di blok TIMER CONTROLS (setMode).

// Memanggil dan menyiapkan data sebelum modal terbuka
function PreferensiModal() {
    muatDataPreferensi();
    toggleModal('modal-preferensi');
}
window.PreferensiModal = PreferensiModal; // PERBAIKAN: fungsi ada di dalam <script type="module">, tidak otomatis global, jadi onclick inline gagal (ReferenceError)

// Memuat data dari sistem ke elemen UI
function muatDataPreferensi() {
    const isSound = localStorage.getItem('app_sound') !== 'false'; // Default True
    const isVib = localStorage.getItem('app_vib') !== 'false';
    const isOffline = localStorage.getItem('app_force_offline') === 'true'; // Default False
    const tone = localStorage.getItem('app_alarm_tone') || 'default';
    const vol = localStorage.getItem('app_alarm_volume') || '80';

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

// Fungsi Simpan ke LocalStorage saat ditekan "SIMPAN PENGATURAN"
function simpanPreferensiLengkap() {
    const elSound = document.getElementById('set-sound');
    const elVib = document.getElementById('set-vib');
    const elOffline = document.getElementById('set-offline');
    const elTone = document.getElementById('select-alarm-tone');
    const elVol = document.getElementById('range-alarm-volume');

    if (elSound) localStorage.setItem('app_sound', elSound.checked);
    if (elVib) localStorage.setItem('app_vib', elVib.checked);
    if (elTone) localStorage.setItem('app_alarm_tone', elTone.value);
    if (elVol) localStorage.setItem('app_alarm_volume', elVol.value);
    
    if (elOffline) {
        localStorage.setItem('app_force_offline', elOffline.checked);
        // Panggil fungsi luring bawaan aplikasi jika ada
        if (elOffline.checked && typeof handleOfflinePremium === 'function') {
            handleOfflinePremium();
        }
    }

    toggleModal('modal-preferensi');
    
    // PERBAIKAN: tampilkan konfirmasi visual langsung di layar (toast) saat pengaturan
    // tersimpan — sebelumnya hanya masuk ke kotak notifikasi (badge lonceng) yang mudah
    // tidak disadari, sehingga terasa seperti tombol "Simpan" tidak melakukan apa-apa.
    if (typeof showToast === 'function') {
        showToast('✅ Pengaturan alarm tersimpan');
    }

    // Tampilkan juga di kotak notifikasi jika sistem NotifSystem Anda tersedia
    if (typeof NotifSystem !== 'undefined') {
        NotifSystem.tambah('sistem', 'Pengaturan Tersimpan', 'Preferensi aplikasi berhasil diperbarui.', '✅');
    }
}
window.simpanPreferensiLengkap = simpanPreferensiLengkap; // PERBAIKAN: dipanggil via onclick inline di HTML, wajib diekspos ke window

// ----------------------------------------------------
// FUNGSI MODAL KONEKSI BLUETOOTH 
// ----------------------------------------------------
// Objek global untuk menyimpan referensi sesi perangkat GATT yang terkoneksi
const koneksiGATT = {
    utama: null,
    ruang: null,
    adonan: null
};

// Fungsi membuka modal
function KoneksiBluetoothModal() {
    if (typeof toggleModal === 'function') {
        toggleModal('modal-koneksi-sensor');
    }
}
window.KoneksiBluetoothModal = KoneksiBluetoothModal; // PERBAIKAN: fungsi ada di dalam <script type="module">, tidak otomatis global, jadi onclick inline gagal (ReferenceError)

// 1. FUNGSI UTAMA MENYAMBUNGKAN BLUETOOTH & PROFIL GATT
async function connectHealthThermometer(idPerangkat) {
    if (!navigator.bluetooth) {
        alert("Browser Anda belum mendukung Web Bluetooth API.");
        return;
    }

    updateUIBluetoothLoading(idPerangkat);

    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['health_thermometer'] } 
            ],
            optionalServices: ['battery_service', 'device_information']
        });

        const server = await device.gatt.connect();
        koneksiGATT[idPerangkat] = device;
        
        device.addEventListener('gattserverdisconnected', () => handlerSensorTerputus(idPerangkat));

        const service = await server.getPrimaryService('health_thermometer');
        const characteristic = await service.getCharacteristic('temperature_measurement');

        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
            const dataBiner = event.target.value;
            const suhuCelcius = parseHealthThermometerData(dataBiner);
            
            if (suhuCelcius !== null) {
                updateUIRealtimeSuhu(idPerangkat, suhuCelcius);
            }
        });

        updateUIBluetoothConnected(idPerangkat, device.name || "Termometer BLE");

    } catch (error) {
        if (error.name === 'NotFoundError') {
            console.log("Pencarian dibatalkan oleh pengguna.");
        } else {
            console.warn("Bluetooth Error:", error);
        }
        handlerSensorTerputus(idPerangkat);
    }
}
window.connectHealthThermometer = connectHealthThermometer; // PERBAIKAN: perlu diekspos agar bisa dipanggil dari onclick inline
// PERBAIKAN: tombol "Pindai" di HTML memanggil connectBluetoothThermometer(...) — nama berbeda dari fungsi aslinya di atas.
// Alias ini menyambungkan nama yang dipanggil HTML ke fungsi yang benar-benar berjalan, tanpa perlu mengubah atribut onclick di HTML.
window.connectBluetoothThermometer = connectHealthThermometer;

// Fungsi Parsing Data Biner Spesifik Health Thermometer (IEEE-11073 Float)
function parseHealthThermometerData(dataView) {
    try {
        // Byte pertama adalah flags (menentukan unit Celsius/Fahrenheit dan format data)
        const flags = dataView.getUint8(0);
        const unitFahrenheit = (flags & 0x01) !== 0; // Bit 0: 0 = Celsius, 1 = Fahrenheit

        // Pembacaan nilai float 32-bit pada byte ke-1
        let tempValue = dataView.getFloat32(1, true);

        if (unitFahrenheit) {
            // Konversi Fahrenheit ke Celsius jika perangkat mengirim format F
            tempValue = (tempValue - 32) * 5 / 9;
        }

        return tempValue.toFixed(1);
    } catch (e) {
        console.error("Gagal melakukan parsing biner sensor:", e);
        return null;
    }
}



// --- FUNGSI UPDATE UI DINAMIS & REAL-TIME ---

function updateUIRealtimeSuhu(id, suhu) {
    if (id === 'utama') {
        const status = document.getElementById('ble-status-utama');
        if (status) {
            status.innerText = `Status: Terhubung • ${suhu}°C`;
            status.style.color = "#27ae60";
        }
    } else {
        const status = document.getElementById(`status-text-${id}`);
        if (status) {
            status.innerText = `Terhubung • ${suhu}°C`;
            status.style.color = "#27ae60";
        }
    }
}

function updateUIBluetoothLoading(id) {
    if (id === 'utama') {
        const btn = document.getElementById('btn-ble');
        const status = document.getElementById('ble-status-utama');
        if (btn) {
            btn.innerText = "Mencari Perangkat...";
            btn.style.opacity = "0.7";
            btn.disabled = true;
        }
        if (status) status.innerText = "Status: Memindai sinyal...";
    } else {
        const btn = document.getElementById(`btn-${id}`);
        if (btn) {
            btn.innerText = "Mencari...";
            btn.disabled = true;
        }
    }
}

function updateUIBluetoothConnected(id, namaDevice) {
    if (id === 'utama') {
        const btn = document.getElementById('btn-ble');
        const icon = document.getElementById('ble-main-icon');
        const status = document.getElementById('ble-status-utama');
        
        if (btn) {
            btn.innerText = "Putuskan Koneksi";
            btn.style.background = "#ef4444";
            btn.style.opacity = "1";
            btn.disabled = false;
            btn.onclick = () => putuskanSensorBluetooth('utama');
        }
        if (icon) icon.innerHTML = "🔗";
        if (status) {
            status.innerText = `Status: Terhubung ke ${namaDevice}`;
            status.style.color = "#27ae60";
        }
    } else {
        const btn = document.getElementById(`btn-${id}`);
        const card = document.getElementById(`card-sensor-${id}`);
        const dot = document.getElementById(`dot-${id}`);
        const status = document.getElementById(`status-text-${id}`);
        
        if (btn) {
            btn.innerText = "Putus";
            btn.style.background = "#fee2e2";
            btn.style.color = "#ef4444";
            btn.disabled = false;
            btn.onclick = () => putuskanSensorBluetooth(id);
        }
        if (card) {
            card.style.border = "1px solid #27ae60";
            card.style.opacity = "1";
            card.style.boxShadow = "0 1px 3px rgba(39, 174, 96, 0.1)";
        }
        if (dot) {
            dot.innerText = "🟢";
            dot.style.animation = "pulse 2s infinite";
        }
        if (status) {
            status.innerText = "Terhubung • Menunggu data...";
            status.style.color = "#27ae60";
        }
    }
}

function handlerSensorTerputus(id) {
    koneksiGATT[id] = null;

    if (id === 'utama') {
        const btn = document.getElementById('btn-ble');
        const icon = document.getElementById('ble-main-icon');
        const status = document.getElementById('ble-status-utama');
        
        if (btn) {
            btn.innerText = "Hubungkan Termometer BLE";
            btn.style.background = "#27ae60";
            btn.disabled = false;
            btn.onclick = () => connectHealthThermometer('utama');
        }
        if (icon) icon.innerHTML = "📶";
        if (status) {
            status.innerText = "Status: Belum Terhubung";
            status.style.color = "#64748b";
        }
    } else {
        const btn = document.getElementById(`btn-${id}`);
        const card = document.getElementById(`card-sensor-${id}`);
        const dot = document.getElementById(`dot-${id}`);
        const status = document.getElementById(`status-text-${id}`);
        
        if (btn) {
            btn.innerText = "Pindai";
            btn.style.background = "var(--accent)";
            btn.style.color = "#fff";
            btn.disabled = false;
            btn.onclick = () => connectHealthThermometer(id);
        }
        if (card) {
            card.style.border = "1px solid #e2e8f0";
            card.style.opacity = "0.8";
            card.style.boxShadow = "none";
        }
        if (dot) {
            dot.innerText = "⚫";
            dot.style.animation = "none";
        }
        if (status) {
            status.innerText = "Terputus";
            status.style.color = "#94a3b8";
        }
    }
}

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
    if (elSound && elSound.checked && typeof playAlarmSound === 'function') {
        // PERBAIKAN: kirim nilai form saat ini langsung sebagai parameter (mode pratinjau),
        // tanpa menyentuh localStorage sama sekali — jadi tidak ada risiko nilai tersimpan
        // "keselip"/tertimpa keliru jika pengguna gonta-ganti nada dengan cepat sebelum
        // menekan tombol Simpan.
        const toneSementara = document.getElementById('select-alarm-tone').value;
        const volSementara = document.getElementById('range-alarm-volume').value;
        
        playAlarmSound(toneSementara, volSementara); // Membunyikan suara tes sesuai form, belum disimpan
    }
}

function handlerPratinjauGetaran() {
    const elVib = document.getElementById('set-vib');
    if (elVib && elVib.checked) {
        // Test getaran jika diizinkan browser/perangkat
        if (typeof triggerVibration === 'function') {
            triggerVibration();
        } else if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    }
}

// =====================================================================
// PERBAIKAN: Blok konsolidasi ekspos fungsi ke window.
// Fungsi-fungsi ini dipanggil lewat onclick inline di HTML (berjalan di scope
// global), tapi didefinisikan di dalam <script type="module"> yang scope-nya
// terpisah, sehingga tanpa baris di bawah ini akan muncul "ReferenceError:
// ... is not defined" persis seperti error yang dilaporkan.
// =====================================================================
window.selectProduct = selectProduct;
window.tutupPopupSukses = tutupPopupSukses;
window.mintaAnalisisAISungguhan = mintaAnalisisAISungguhan;
window.kirimSaran = kirimSaran;
window.perbaruiIndikatorVolume = perbaruiIndikatorVolume; // dipanggil via oninput slider volume alarm
window.handlerPratinjauSuara = handlerPratinjauSuara;     // dipanggil via onchange checkbox suara/pilihan nada/slider volume
window.handlerPratinjauGetaran = handlerPratinjauGetaran; // dipanggil via onchange checkbox getaran
