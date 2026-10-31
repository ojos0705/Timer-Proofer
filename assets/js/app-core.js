// [AI-GENERATED][REFACTOR] Import explicit feature/core dependencies instead of hidden local utilities.
import { syncModalBodyScrollLock } from './modal-bootstrap.js?v=20261031-v328'; // [AI-GENERATED][ES6 MODULE IDENTITY][V270]
import { toggleModal } from './modal.js';
import { init as initializeAppLifecycle, setTimerBackGuard } from './app-lifecycle-service.js'; // [AI-GENERATED][ES6 MODULE][V269]
import { bindReplaceableClick } from './core/dom-events.js';
import { formatHasilAI, formatTipsHasilAI } from './ai-formatters.js';
import { StorageService } from './storage-service.js';
import { removeStorageKeys } from './profile-cleanup.js'; // [AI-GENERATED][ROBUSTNESS][V227]
import { RecipeStorageService } from './recipe-storage-service.js';
import { RecipePhotoService, getRecipePhotoMutationEpoch } from './recipe-photo-service.js'; // [AI-GENERATED][ES6 MODULE][V285]
import { RecipePhotoPersistenceService } from './recipe-photo-persistence-service.js';
import { RecipeDomainService } from './recipe-domain-service.js';
import { ProofingService } from './proofing-service.js';
import { ProfileService as ProfileDataService } from './profile-service.js';
import { AuthService } from './auth-service.js';
import { calculateIngredientMetrics, calculateRecipeHPP } from './recipe-calculator.js';
import { getRecipeInstructionSteps } from './product-instructions.js'; // [AI-GENERATED][REFACTOR][V221]
import { BakeryIngredientService } from './bakery-ingredient-service.js';
import { parseTimerSeconds, formatTimerSeconds, calculateAdaptiveProofingSeconds, calculateTimerProgress } from './timer-engine.js';
import { createProofingTimerController } from './proofing-timer-controller.js';
import { startTimerWithRecovery } from './core/timer-start-guard.js'; // [AI-GENERATED][ROBUSTNESS][V226]
import { ProofingNotificationService } from './proofing-notification-service.js';
import { ProofingAlarmService } from './proofing-alarm-service.js';
import { ProofingCompletionService } from './proofing-completion-service.js';
import { requestAITelemetry, requestAIAnalysis } from './ai-service.js';
import { getJson } from './api-client-service.js';
import { fetchWeather, fetchElevation } from './weather-service.js';
import { NativeCapacitorService } from './native-capacitor-service.js';
import { escapeHtmlMarkup, normalizeSafeRecipeImageSource } from './core/markup-security.js';
import { buildProofingInsight } from './core/proofing-insight.js';
import { normalizeGamificationCache } from './gamification-cache.js'; // [AI-GENERATED][ROBUSTNESS][V250]
import { PdfRenderService } from './pdf-render-service.js'; // [AI-GENERATED][ES6 MODULE][V258]
import { PdfExportService } from './pdf-export-service.js'; // [AI-GENERATED][ES6 MODULE][V258]
import { OfflineI18n } from './offline-i18n.js'; // [AI-GENERATED][ES6 MODULE][V261]
import { NotifSystem } from './notification-service.js'; // [AI-GENERATED][ES6 MODULE][V272]
import { readForcedOfflinePreference, readOfflineWeatherCache, readOfflineWeatherValue, splitWeatherLocationName, writeOfflineWeatherCache } from './core/offline-weather-cache.js'; // [AI-GENERATED][ES6 MODULE][V292]
import { isRecipePhotoRestoreCurrent } from './recipe-photo-restore-guard.js'; // [AI-GENERATED][ES6 MODULE][V277]
import { shouldPersistRecipePhotos } from './recipe-photo-save-policy.js'; // [AI-GENERATED][ES6 MODULE][V280]
import { isRecipeRealtimeOwnerConsistent } from './recipe-realtime-owner-guard.js'; // [AI-GENERATED][ES6 MODULE][V278]
import { isRecipeSaveContextCurrent } from './recipe-save-transaction-guard.js'; // [AI-GENERATED][ES6 MODULE][V279]
import { switchAuthTab, validateRegistrationConsent } from './features-auth-ui.js?v=20261031-v328'; // [AI-GENERATED][ES6 MODULE][V295]

const proofingTimerController = createProofingTimerController();

// [AI-GENERATED][ROBUSTNESS][V138] Photo restore is asynchronous. Keep its
// current promise + epoch so a rapid recipe switch cannot re-inject photos from
// the previous recipe after the editor has already been cleared.
let activeRecipePhotoRestorePromise = null;
let recipePhotoRestoreEpoch = 0;
// [AI-GENERATED][ROBUSTNESS][V280] Keep restore outcome separate from its Promise so a failed read is not confused with an intentional empty photo set.
let latestRecipePhotoRestoreOutcome = null;

// [AI-GENERATED][REFACTOR][V54] Canonical Supabase client accessor for app-core.
// Prevents feature code from depending on the mutable global `supabase` namespace.
function getAppSupabaseClient() {
    try {
        return AuthService.getClient?.() || null;
    } catch (error) {
        console.warn('[Supabase] Client belum siap:', error);
        return null;
    }
}

/**
 * TIMER PROOFER - WELCOME SCREEN & INTERACTIVE TOUR CONTROLLER
 * Cross-Platform Architecture (Android, iOS, Samsung, Huawei, PWA)
 */


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
  // [AI-GENERATED][ROBUSTNESS][V116] Own delayed badge checks so a stale
  // callback cannot mutate the next authenticated session.
  _badgeCheckTimer: null,
  // [AI-GENERATED][ROBUSTNESS][V123] Own the delayed achievement popup hide
  // so an old session cannot dismiss a popup belonging to the current session.
  _achievementHideTimer: null,
  _bound: false,
  // [AI-GENERATED][BUG FIX] Invalidates async sync work when auth user changes.
  _sessionEpoch: 0,

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
    let cache = null;
    try {
      const raw = localStorage.getItem(this._cacheKey());
      if (raw) cache = JSON.parse(raw);
    } catch (error) {
      // [AI-GENERATED][ROBUSTNESS][V250] Corrupt/unavailable cache must not
      // prevent app startup; treat it as a cache miss and rebuild safe defaults.
      console.warn('[Gamification] Cache lokal tidak dapat dibaca; memakai state default.', error);
    }

    const normalized = normalizeGamificationCache(cache, this._defaultState(), this._defaultPending());
    this.state = normalized.state;
    this.pending = normalized.pending;
    const today = this._dateKey();
    this.state.quests = this.state.quests.filter(q => q.quest_date === today);
    this.pending.quests = this.pending.quests.filter(q => q.quest_date === today);
    this.state.level = this.calculateLevel(this.state.xp);
    return normalized.found;
  },

  // ---------- Siklus hidup ----------
  init(supabaseClient, userId) {
    if (!supabaseClient || !userId) return Promise.resolve();
    if (this._initKey === userId && this._initPromise) return this._initPromise;
    this._sessionEpoch += 1;
    this._initKey = userId;
    this.supabase = supabaseClient;
    this.userId = userId;
    this._bindLifecycle();
    const epoch = this._sessionEpoch;
    this._initPromise = this._doInit(epoch).catch(err => {
      if (epoch === this._sessionEpoch) console.error('Gagal inisialisasi gamifikasi:', err);
    });
    return this._initPromise;
  },

  async _doInit(epoch = this._sessionEpoch) {
    if (epoch !== this._sessionEpoch) return;
    this._fresh = !this._loadCache();
    this.ready = true;
    this.renderUI();
    if (epoch !== this._sessionEpoch) return;
    if (this._canSync()) {
      await this.flush(epoch);
    } else {
      if (epoch !== this._sessionEpoch) return;
      this._dailyCheckin();
      this.checkBadges();
    }
    if (epoch === this._sessionEpoch) this.renderUI();
  },

  reset() {
    // [AI-GENERATED][BUG FIX] Invalidate every pending async operation from the old user.
    this._sessionEpoch += 1;
    clearTimeout(this._flushTimer);
    clearTimeout(this._badgeCheckTimer);
    clearTimeout(this._achievementHideTimer);
    this._flushTimer = null;
    this._badgeCheckTimer = null;
    this._achievementHideTimer = null;
    this._flushAgain = false;
    this._flushPromise = null;
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
    // [AI-GENERATED][REFACTOR][V37] Listener ownership is centralized in AppLifecycleService.
    // Gamification only exposes its flush capability to the lifecycle coordinator.
    if (this._bound) return;
    this._bound = true;
  },

  // ---------- Sinkronisasi ----------
  _scheduleFlush(ms = 1200) {
    clearTimeout(this._flushTimer);
    const scheduledEpoch = this._sessionEpoch;
    // [AI-GENERATED][ROBUSTNESS][V114] Bind delayed gamification flushes to the
    // session that scheduled them. A timer from account A must never trigger
    // work after reset()/init() has advanced the session epoch for account B.
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      if (scheduledEpoch !== this._sessionEpoch) return;
      void this.flush(scheduledEpoch);
    }, ms);
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

  async flush(epoch = this._sessionEpoch) {
    if (epoch !== this._sessionEpoch || !this._canSync()) return false;
    if (this._flushPromise) { this._flushAgain = true; return this._flushPromise; }

    this._flushPromise = (async () => {
      let ok = true;
      try {
        do {
          if (epoch !== this._sessionEpoch || !this._canSync()) return false;
          this._flushAgain = false;
          await this._pull();
          if (epoch !== this._sessionEpoch || !this._canSync()) return false;
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
          if (epoch !== this._sessionEpoch || !this._canSync()) return false;
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
      if (epoch === this._sessionEpoch) this.renderUI();
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
    // Data resep/log baru ditulis ke penyimpanan sesaat setelah pemanggilan ini.
    // [AI-GENERATED][ROBUSTNESS][V116] Bind the delayed badge check to the
    // current auth session and coalesce repeated awards within the same session.
    clearTimeout(this._badgeCheckTimer);
    const scheduledEpoch = this._sessionEpoch;
    this._badgeCheckTimer = setTimeout(() => {
      this._badgeCheckTimer = null;
      if (scheduledEpoch !== this._sessionEpoch) return;
      this.checkBadges();
    }, 800);
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

// [AI-GENERATED][REFACTOR][V274] AuthService owns the sole Supabase auth-state
// lifecycle. Gamification receives a client from that lifecycle instead of
// registering another listener during app-core module evaluation.


// ================================================================= 
// SKRIP JAVASCRIPT: LOGIKA NAVIGASI & MANAJEMEN STATE (OPSI 1 HALAMAN RESEP)       
// ================================================================= 
// [AI-GENERATED][ES6 MODULE STATE BRIDGE][V287]
// Keep the legacy window.bakeryIngredients facade connected to the module's
// canonical binding. Several older UI/service integrations still assign the
// global directly; an accessor prevents those writes from splitting state.
let bakeryIngredients = Array.isArray(window.bakeryIngredients)
    ? window.bakeryIngredients
    : [];

try {
    const bakeryIngredientsDescriptor = Object.getOwnPropertyDescriptor(window, 'bakeryIngredients');
    if (!bakeryIngredientsDescriptor || bakeryIngredientsDescriptor.configurable) {
        Object.defineProperty(window, 'bakeryIngredients', {
            configurable: true,
            enumerable: true,
            get() {
                return bakeryIngredients;
            },
            set(nextIngredients) {
                bakeryIngredients = Array.isArray(nextIngredients) ? nextIngredients : [];
            }
        });
    } else {
        console.warn('[BakeryIngredients] window.bakeryIngredients sudah non-configurable; bridge ESM tidak dapat dipasang.');
    }
} catch (error) {
    console.warn('[BakeryIngredients] Gagal memasang bridge state bahan bakery:', error);
}

let isSaving = false;
let currentEditingRecipeId = null;
// [AI-GENERATED][ROBUSTNESS][V279] Invalidate pending saves when the active editor target changes.
let recipeEditorEpoch = 0;
// [AI-GENERATED][ES6 MODULE STATE BRIDGE][V286]
// app-core.js owns the canonical production-step state. Keep the existing
// window.activeRecipeSteps integration as an accessor so legacy callers and
// module-local code can never mutate two different arrays.
const defaultRecipeSteps = [
    "Campurkan Tepung Utama dan bahan kering lainnya. Lakukan proses autolisis selama 20-30 menit bersama air dingin untuk membentuk gluten alami.",
    "Masukkan ragi aktif, aduk rata, lalu tambahkan mentega dan garam. Mixer kembali hingga adonan mencapai status kalis elastis (windowpane test)."
];
let activeRecipeSteps = Array.isArray(window.activeRecipeSteps)
    ? window.activeRecipeSteps
    : defaultRecipeSteps;

try {
    const activeRecipeStepsDescriptor = Object.getOwnPropertyDescriptor(window, 'activeRecipeSteps');
    if (!activeRecipeStepsDescriptor || activeRecipeStepsDescriptor.configurable) {
        Object.defineProperty(window, 'activeRecipeSteps', {
            configurable: true,
            enumerable: true,
            get() {
                return activeRecipeSteps;
            },
            set(nextSteps) {
                activeRecipeSteps = Array.isArray(nextSteps) ? nextSteps : [];
            }
        });
    } else {
        // A non-configurable legacy property cannot be safely converted to an
        // accessor; keep the app running and make this compatibility limit visible.
        console.warn('[RecipeSteps] window.activeRecipeSteps sudah non-configurable; bridge ESM tidak dapat dipasang.');
    }
} catch (error) {
    console.warn('[RecipeSteps] Gagal memasang bridge state langkah produksi:', error);
}

// ------------------------------------------------------------
// INISIALISASI APLIKASI
// ------------------------------------------------------------
// [AI-GENERATED][REFACTOR][V24] Legacy IndexedDB recipe bootstrap removed.
// Recipe persistence is owned by StorageService; the old openDB helper was
// not part of the ES module dependency graph and could never be guaranteed.

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
        const geolocationPlugin = NativeCapacitorService.getPlugin('Geolocation');
        if (NativeCapacitorService.isNativePlatform() && geolocationPlugin?.getCurrentPosition) {
            try {
                const coordinates = await geolocationPlugin.getCurrentPosition({
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
                            // [AI-GENERATED][BUG FIX][V51] Always settle the geolocation
                            // promise so a weather/location failure cannot leave the
                            // isFetchingLocation lock active forever.
                            try {
                                const lat = position.coords.latitude;
                                const lon = position.coords.longitude;
                                await fetchLocationAndWeather(lat, lon, "GPS");
                                kirimPesanKeSW(lat, lon);

                                // PENGAMAN ONLINE: Pastikan box premium luring sembunyi!
                                if (premiumBox) premiumBox.style.display = "none";
                            } catch (error) {
                                console.warn("Gagal memuat cuaca setelah GPS browser berhasil; mencoba fallback IP...", error);
                                if (typeof fetchLocationByIPFallback === "function") {
                                    try {
                                        await fetchLocationByIPFallback();
                                        if (premiumBox) premiumBox.style.display = "none";
                                    } catch (fallbackError) {
                                        console.warn("Fallback lokasi IP juga gagal:", fallbackError);
                                        handleOfflinePremium();
                                    }
                                } else {
                                    handleOfflinePremium();
                                }
                            } finally {
                                resolve();
                            }
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
// [AI-GENERATED][REFACTOR] Canonical handleAuthSubmit is defined once below with login/register/forgot flows.
// [AI-GENERATED][REFACTOR] Canonical auth UI binding: one initialization path, idempotent guards, no duplicate listeners.
function initAuthUiBindings() {
    const authForm = document.getElementById('auth-form');
    const forgotLink = document.getElementById('link-forgot-password');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const backToLoginLink = document.getElementById('link-back-to-login');
    const forgotModal = document.getElementById('forgot-password-modal') || document.getElementById('forgot-modal');

    if (authForm && authForm.dataset.authBound !== 'true') {
        authForm.addEventListener('submit', (event) => window.handleAuthSubmit(event));
        authForm.dataset.authBound = 'true';
    }

    const bindOnce = (element, key, handler) => {
        if (!element || element.dataset[key] === 'true') return;
        element.addEventListener('click', handler);
        element.dataset[key] = 'true';
    };

    bindOnce(forgotLink, 'authForgotBound', (event) => {
        event.preventDefault();
        if (forgotModal) forgotModal.classList.add('active');
        else window.switchAuthTab?.('forgot');
    });

    bindOnce(tabLogin, 'authTabBound', (event) => {
        event.preventDefault();
        window.switchAuthTab?.('login');
    });

    bindOnce(tabRegister, 'authTabBound', (event) => {
        event.preventDefault();
        window.switchAuthTab?.('register');
    });

    bindOnce(backToLoginLink, 'authBackBound', (event) => {
        event.preventDefault();
        window.switchAuthTab?.('login');
    });

    window.switchAuthTab?.('login');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthUiBindings, { once: true });
} else {
    initAuthUiBindings();
}

// 2. Fungsi Eksekusi Verifikasi OTP
async function verifyEmailOtp() {
    const otpInput = document.getElementById('input-otp');
    const errorBox = document.getElementById('auth-error-box');
    const btn = document.getElementById('btn-verify-otp');
    if (!otpInput || !btn) {
        console.warn('[Auth] OTP UI belum tersedia.');
        return;
    }
    const otpCode = otpInput.value.trim();
    
    if (errorBox) errorBox.style.display = 'none';

    if (otpCode.length !== 6) {
        showError("Masukkan 6 digit angka OTP yang valid.");
        return;
    }

    const originalText = btn.innerText;
    btn.innerText = "MEMVERIFIKASI...";
    btn.disabled = true;

    try {
        // [AI-GENERATED][REFACTOR][V54] AuthService owns the OTP API boundary.
        // Eksekusi API Supabase untuk validasi OTP
        const { data, error } = await AuthService.verifyOtp({
            email: pendingVerificationEmail,
            token: otpCode,
            type: 'signup' // Tipe spesifik untuk verifikasi pendaftaran
        });

        if (error) throw error;

        // [AI-GENERATED][REFACTOR][V33] AuthService owns session transition after OTP verification.
        
        // [AI-GENERATED][ROBUSTNESS][V117] Keep the OTP cleanup timer owned by the
        // current verification flow. A stale timer from an earlier OTP attempt
        // must never cancel a newer verification form.
        clearTimeout(otpCleanupTimer);
        const scheduledVerificationEpoch = verificationEpoch;
        otpCleanupTimer = setTimeout(() => {
            otpCleanupTimer = null;
            if (scheduledVerificationEpoch !== verificationEpoch) return;
            cancelVerification();
        }, 1000);

    } catch (err) {
        showError("Kode OTP salah atau sudah kedaluwarsa. " + err.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// 3. Fungsi Batal (Mengembalikan Form ke Awal)
window.cancelVerification = function() {
    // [AI-GENERATED][ROBUSTNESS][V117] Invalidate any deferred OTP cleanup
    // before resetting the verification UI.
    verificationEpoch += 1;
    clearTimeout(otpCleanupTimer);
    otpCleanupTimer = null;

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
        const { data, error } = await AuthService.signInWithOAuth(providerName, {
            redirectTo: window.location.origin + window.location.pathname
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
        const { data, error } = await AuthService.signInWithOtp({
            phone: phone,
            options: {
                channel: 'whatsapp' // <--- Tambahkan baris ini
            }
        });
        if (error) throw error;

        const token = prompt('Kode OTP telah dikirim via WhatsApp. Masukkan 6 digit kode OTP:');
        if (!token) return;

        const { data: verifyData, error: verifyError } = await AuthService.verifyOtp({
            phone: phone,
            token: token,
            type: 'sms'
        });
        if (verifyError) throw verifyError;

        // [AI-GENERATED][REFACTOR][V54] Session lifecycle remains owned by AuthService.
        // PENTING: Ganti kelas body, JANGAN reload halaman
        document.body.classList.remove('logged-out');
        document.body.classList.add('logged-in');

    } catch (err) {
        showError('Gagal autentikasi WhatsApp: ' + err.message);
    }
}

function handleLogin() {
    const email = document.getElementById('input-email').value;
    const remember = document.getElementById('remember-me-checkbox').checked;

    if (remember) {
        // [AI-GENERATED][SECURITY] Remember only the email; never persist a plaintext password.
        localStorage.setItem('saved_email', email);
        localStorage.removeItem('saved_pass');
    } else {
        localStorage.removeItem('saved_email');
        localStorage.removeItem('saved_pass');
    }
}

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
        // [AI-GENERATED][REFACTOR] Profile cleanup uses the same persistence owner as profile writes.
        // [AI-GENERATED][SECURITY][V254] Profile fields now live in an account-scoped
        // namespace. Clear that namespace through ProfileService; don't blindly delete
        // ambiguous global legacy keys that may belong to a different account.
        const profileNamespaceCleared = await ProfileDataService.clear();
        const keysToRemove = [
            'proofing_state', 'proofing_logs', 'activeMode', 'timerDuration', 'tp_notifs',
            'terakhir_sukses_cuaca', 'donut_weather_cache'
        ];

        // [AI-GENERATED][ROBUSTNESS][V227] StorageService.remove() now returns
        // whether every active persistence backend confirmed removal. Do not report
        // a successful profile cleanup when one native key may remain recoverable.
        const storageCleanupResult = await removeStorageKeys(
            keysToRemove,
            (key) => key === 'proofing_logs'
                ? ProofingService.clearLogs()
                : StorageService.remove(key)
        );
        const cleanupResult = {
            success: profileNamespaceCleared === true && storageCleanupResult.success,
            failedKeys: [
                ...storageCleanupResult.failedKeys,
                ...(profileNamespaceCleared === true ? [] : ['profile namespace'])
            ],
            attempted: storageCleanupResult.attempted + 1
        };

        if (cleanupResult.success) {
            // [AI-GENERATED][BUG FIX][V252] Clear the in-memory compatibility mirror
            // and refresh its existing UI after the persistent history is removed.
            window.proofingHistory = [];
            try {
                await renderProofingLogs();
            } catch (renderError) {
                console.warn('[Profil] Riwayat sudah dibersihkan, tetapi UI log gagal diperbarui:', renderError);
            }
            alert("Data profil lokal berhasil dibersihkan.");
        } else {
            console.warn('[Profil] Pembersihan lokal belum lengkap:', cleanupResult.failedKeys);
            alert(`Sebagian data profil belum berhasil dihapus dari seluruh penyimpanan (${cleanupResult.failedKeys.length} dari ${cleanupResult.attempted} kunci). Tutup dan buka kembali aplikasi, lalu ulangi pembersihan.`);
        }

        // Memaksa UI untuk render ulang dengan state kosong meskipun pembersihan parsial.
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
        // [AI-GENERATED][REFACTOR][V52] Destructive auth operations now use
        // AuthService as the single client boundary; no mutable global client access.
        const user = await AuthService.getUser();
        if (!user) throw new Error("Gagal mengautentikasi pengguna saat ini.");

        // 2. Eksekusi penghapusan akun di sisi Server (Via RPC)
        // Syarat: Anda harus membuat function 'delete_user' di Database Postgres Supabase Anda
        try {
            await AuthService.rpc('delete_user');
        } catch (rpcError) {
            console.error("RPC Error:", rpcError);
            throw new Error("Gagal menghapus akun di server. Pastikan RPC 'delete_user' telah dikonfigurasi.");
        }

        // [AI-GENERATED][SECURITY][V156] Sign out before the origin-wide persistence
        // cleanup. StorageService.clear() uses localStorage.clear() on the browser
        // path, which can remove Supabase's persisted session before the canonical
        // AuthService signOut() boundary completes. Keep the destructive account
        // RPC authenticated, then invalidate the session, then clear local/native
        // persistence. If signOut fails, still perform cleanup so a deleted account
        // cannot remain persisted locally.
        let signOutError = null;
        try {
            await AuthService.signOut();
        } catch (error) {
            signOutError = error;
            console.error("Sign Out setelah penghapusan akun gagal:", error);
        }

        // [AI-GENERATED][ROBUSTNESS][V222] Cleanup is deliberately after sign-out
        // and remains mandatory even when the auth client reports an error. A failed
        // native clear must not make account deletion look successful or leave the
        // UI on a session that no longer exists on the server.
        let persistenceCleared = false;
        try {
            persistenceCleared = await StorageService.clear();
        } catch (cleanupError) {
            console.error("Pembersihan penyimpanan setelah penghapusan akun gagal:", cleanupError);
        }

        // [AI-GENERATED][PRIVACY][V224] Recipe photo blobs live in IndexedDB,
        // outside StorageService.clear(). Remove only the deleted user's records
        // and never use this destructive operation for an ordinary sign-out.
        let photoDataCleared = false;
        try {
            photoDataCleared = await RecipePhotoPersistenceService.deleteAllPhotosForOwner(user.id) === true;
        } catch (photoCleanupError) {
            console.error('Pembersihan foto resep IndexedDB gagal:', photoCleanupError);
        }

        // [AI-GENERATED][PRIVACY][V224] Clear in-memory files/previews too, so
        // deleted-account photos cannot remain visible if the auth UI is reopened.
        let photoRuntimeCleared = false;
        try {
            RecipePhotoService.clear();
            photoRuntimeCleared = true;
        } catch (photoRuntimeError) {
            console.error('Pembersihan pratinjau foto resep gagal:', photoRuntimeError);
        }

        // [AI-GENERATED][SECURITY][V254] Seal in-memory account namespaces even if
        // Supabase sign-out failed and therefore did not trigger SIGNED_OUT cleanup.
        try {
            ProfileDataService.clearOwner();
            await RecipeStorageService.clearOwner();
        } catch (ownerCleanupError) {
            console.warn('[AccountDeletion] Gagal menutup namespace pemilik lokal:', ownerCleanupError);
        }

        // 5. Kembalikan State UI ke Halaman Login awal even if cleanup was partial.
        document.body.classList.remove('logged-in');
        document.body.classList.add('logged-out');

        // Tutup semua modal aktif
        const activeModals = document.querySelectorAll('.page-modal.active');
        activeModals.forEach(modal => modal.classList.remove('active'));

        if (signOutError || !persistenceCleared || !photoDataCleared || !photoRuntimeCleared) {
            const reasons = [];
            if (signOutError) reasons.push('proses sign-out tidak mengonfirmasi keberhasilan');
            if (!persistenceCleared) reasons.push('tidak semua penyimpanan lokal/native berhasil dibersihkan');
            if (!photoDataCleared) reasons.push('foto resep di IndexedDB tidak berhasil dipastikan terhapus');
            if (!photoRuntimeCleared) reasons.push('pratinjau foto yang masih berada di memori tidak berhasil dibersihkan');
            alert(`Akun telah dihapus dari server dan aplikasi dikembalikan ke layar login, tetapi ${reasons.join(' serta ')}. Tutup dan buka kembali aplikasi; jangan gunakan sesi lama.`);
        } else {
            alert("Akun Timer Proofing Anda telah berhasil dihapus.");
        }

    } catch (err) {
        console.error("Gagal eksekusi hapus akun:", err);
        alert("Pesan Sistem: " + err.message);
    }
}



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

            // [AI-GENERATED][REFACTOR][V54] AuthService owns password-reset API access.
            // Kirim link reset password via Supabase Auth
            const { data, error } = await AuthService.resetPasswordForEmail(email, {
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
            const consentAccepted = validateRegistrationConsent({
                onMissing: (consent) => {
                    if (typeof showError === 'function') {
                        showError('Setujui Syarat & Ketentuan Layanan sebelum mendaftar.');
                    }
                    consent?.focus?.();
                }
            });
            if (!consentAccepted) return;

            if (!name) {
                if (typeof showError === 'function') showError("Nama Lengkap wajib diisi.");
                if (nameInput) nameInput.focus();
                return;
            }

            const { data, error } = await AuthService.signUp({
                email: email,
                password: password,
                options: { data: { full_name: name } }
            });
            if (error) throw error;

            if (typeof pendingVerificationEmail !== 'undefined') {
                // [AI-GENERATED][ROBUSTNESS][V117] A new registration starts a new
                // OTP lifecycle and invalidates deferred cleanup from an older one.
                verificationEpoch += 1;
                clearTimeout(otpCleanupTimer);
                otpCleanupTimer = null;
                pendingVerificationEmail = email;
            }

            const authForm = document.getElementById('auth-form');
            if (authForm) authForm.style.display = 'none';

            const tabSwitch = document.querySelector('.tab-switch, #auth-tab-switch');
            if (tabSwitch) tabSwitch.style.display = 'none';
            const divider = document.querySelector('.divider');
            if (divider) divider.style.display = 'none';
            const socialGrid = document.querySelector('.social-grid');
            if (socialGrid) socialGrid.style.display = 'none';
            const whatsappBtn = document.querySelector('.whatsapp-btn');
            if (whatsappBtn) whatsappBtn.style.display = 'none';

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
            // [AI-GENERATED][SECURITY] Remember only the email; never persist a plaintext password.
            localStorage.setItem('saved_email', email);
            localStorage.removeItem('saved_pass');
        } else {
            localStorage.removeItem('saved_email');
            localStorage.removeItem('saved_pass');
        }

        const { data, error } = await AuthService.signInWithPassword({
            email: email,
            password: password
        });
        if (error) throw error;

        // [AI-GENERATED][REFACTOR][V33] Session side effects are handled by auth-service.js.
        // Keeping this submit handler focused on credential submission prevents duplicate sync/init calls.

    } catch (err) {
        if (typeof showError === 'function') {
            showError(err.message);
        } else {
            alert(err.message || 'Terjadi kesalahan saat otentikasi.');
        }
    }
};

// [AI-GENERATED][REFACTOR][V15]
// Auth lifecycle dipusatkan di blok inisialisasi Supabase di bawah agar hanya
// AuthService adalah satu-satunya onAuthStateChange owner untuk seluruh aplikasi.

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
    if (window.GamificationUI && typeof window.GamificationUI.refresh === 'function') {
        await window.GamificationUI.refresh();
    }

    // 6. Versi aplikasi
    updateVersion();
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
            ProofingAlarmService.vibrate();

            // [AI-GENERATED][ROBUSTNESS][V123] A delayed hide must belong to
            // the session that displayed this achievement. Otherwise an old
            // popup timer can close a newer user's achievement after logout/login.
            clearTimeout(this._achievementHideTimer);
            const scheduledEpoch = this._sessionEpoch;
            this._achievementHideTimer = setTimeout(() => {
                this._achievementHideTimer = null;
                if (scheduledEpoch !== this._sessionEpoch) return;
                popup.classList.remove('show');
            }, 6000);
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

// [AI-GENERATED][REFACTOR] GamificationUI is owned by the canonical UI adapter below.
// ProgressionSystem remains the legacy compatibility API for internal callers.

// [AI-GENERATED][ROBUSTNESS][V254] Latest-request token prevents a slower profile
// load from an obsolete account/session overwriting the current profile DOM.
let profileLoadGeneration = 0;

// Fungsi memuat data profil secara dinamis saat aplikasi dibuka / modal diakses
/**
 * Memperbarui data pada halaman profil (user-modal) secara dinamis
 * Menggabungkan pemuatan data akun (Nama, Bakery, dll) dengan sinkronisasi sensor (Lokasi, Cuaca).
 * @param {boolean} showNotifications - Jika true, akan memicu toast notifikasi
 */
async function loadDynamicProfile(showNotifications = false) {
    const loadGeneration = ++profileLoadGeneration;
    const profileOwnerAtStart = ProfileDataService.getActiveOwnerId?.() ?? null;
    const isCurrentProfileLoad = () => loadGeneration === profileLoadGeneration
        && profileOwnerAtStart === (ProfileDataService.getActiveOwnerId?.() ?? null);
    try {
        if (typeof setProfileLoadingState === 'function') setProfileLoadingState(true);

        // ==========================================
        // BAGIAN 1: MEMUAT DATA AKUN USER
        // [AI-GENERATED][REFACTOR][V22] ProfileService menjadi satu-satunya
        // owner pembacaan/normalisasi/persistensi profil lokal.
        // ==========================================
        const savedProfile = await ProfileDataService.load();
        if (!isCurrentProfileLoad()) return;

        // Sinkronkan email dari akun Supabase jika profil belum punya email.
        if (getAppSupabaseClient() && (!savedProfile.email || savedProfile.email === '-')) {
            try {
                const session = await AuthService.getSession();
                if (!isCurrentProfileLoad()) return;
                if (session?.user?.email) {
                    savedProfile.email = session.user.email;
                    await ProfileDataService.save(savedProfile);
                    if (!isCurrentProfileLoad()) return;
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
        if (!isCurrentProfileLoad()) return;

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
        if (!isCurrentProfileLoad()) return;
        console.error("Gagal memuat profil dinamis:", error);
        if (showNotifications && typeof showToast === 'function') {
            showToast('Gagal memuat profil. Coba lagi.');
        }
    } finally {
        // [AI-GENERATED][ROBUSTNESS][V254] Only the latest load owns the loading UI.
        if (loadGeneration === profileLoadGeneration && typeof setProfileLoadingState === 'function') {
            setProfileLoadingState(false);
        }
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
    // [AI-GENERATED][NAV FIX][V308] Canonical modal controller preserves Settings as parent.
    return document.getElementById('help-modal') ? toggleModal('help-modal') : false;
}

function closeHelpModal() {
    const modal = document.getElementById('help-modal');
    return modal?.classList.contains('active') ? toggleModal('help-modal') : false;
}
window.closeHelpModal = closeHelpModal;

window.handleRestartTourFromSettings = function() {
    // [AI-GENERATED][NAV FIX][V308] Close Settings through the canonical lifecycle.
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal?.classList.contains('active')) toggleModal('settings-modal');
    window.setTimeout(() => {
        if (typeof window.restartAppTour === 'function') window.restartAppTour();
        else window.appOnboarding?.startTour?.();
    }, 80);
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
    // [AI-GENERATED][REFACTOR] Profile data has one canonical persistence owner.
    const profileOwnerAtStart = ProfileDataService.getActiveOwnerId?.() ?? null;
    const profileData = await ProfileDataService.load();
    if (profileOwnerAtStart !== (ProfileDataService.getActiveOwnerId?.() ?? null)) return;
    const nameVal = profileData.name;
    const bakeryVal = profileData.bakery;
    const phoneVal = profileData.phone;
    const emailVal = profileData.email;

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
        // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
        syncModalBodyScrollLock();
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
    // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
    syncModalBodyScrollLock();
    if (typeof loadDynamicProfile === 'function') loadDynamicProfile(false);
}

// [AI-GENERATED][REFACTOR][V22] Profile persistence is centralized in ProfileService.
// FUNGSI LOAD PROFILE
async function loadProfile() {
    const profileOwnerAtStart = ProfileDataService.getActiveOwnerId?.() ?? null;
    const profile = await ProfileDataService.load();
    if (profileOwnerAtStart !== (ProfileDataService.getActiveOwnerId?.() ?? null)) return null;

    const name = document.getElementById("profile-name");
    const bakery = document.getElementById("profile-bakery");
    const phone = document.getElementById("profile-phone");
    const email = document.getElementById("profile-email");

    if (name) name.textContent = profile.name;
    if (bakery) bakery.textContent = profile.bakery;
    if (phone) phone.textContent = profile.phone;
    if (email) email.textContent = profile.email;

    return profile;
}

// FUNGSI SIMPAN USER PROFILE
async function saveProfile() {
    const profileOwnerAtStart = ProfileDataService.getActiveOwnerId?.() ?? null;
    const isSameProfileOwner = () => profileOwnerAtStart === (ProfileDataService.getActiveOwnerId?.() ?? null);
    const profile = ProfileDataService.normalize({
        name: document.getElementById("edit-name")?.value,
        bakery: document.getElementById("edit-bakery")?.value,
        phone: document.getElementById("edit-phone")?.value,
        email: document.getElementById("edit-email")?.value
    });

    // [AI-GENERATED][BUG FIX][V253] Never show a success notification or close
    // the edit form when one of the local/native profile writes was not confirmed.
    try {
        await ProfileDataService.save(profile);
    } catch (error) {
        if (!isSameProfileOwner()) return null;
        console.error('[Profile] Penyimpanan profil tidak lengkap:', error);
        const detail = error?.message || 'Penyimpanan profil gagal. Silakan coba lagi.';
        if (typeof showToast === 'function') showToast(detail);
        else alert(detail);
        return null;
    }

    if (!isSameProfileOwner()) return null;
    await renderUserProfile();
    if (!isSameProfileOwner()) return null;
    closeEditProfile();
    if (typeof showToast === 'function') showToast("Profil berhasil diperbarui.");
    return profile;
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

    // [AI-GENERATED][ROBUSTNESS][V122] Destroy any previous slider instance before
    // binding a new one. This prevents duplicate intervals/listeners if the app
    // re-initializes the UI without replacing the article DOM.
    const previous = wrapper.__tpArticleSliderState;
    if (previous?.destroy) previous.destroy();

    const slides = wrapper.querySelectorAll('.article-slide');
    const totalSlides = slides.length;
    let currentIndex = 0;
    let autoPlayInterval = null;

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
        // [AI-GENERATED][ROBUSTNESS][V122] Never keep an autoplay interval alive
        // while the document is hidden; this avoids unnecessary background work.
        if (document.hidden || totalSlides <= 1 || autoPlayInterval !== null) return;
        autoPlayInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % totalSlides;
            goToSlide(currentIndex);
        }, 5000); // 5000ms = 5 detik
    }

    function stopAutoPlay() {
        if (autoPlayInterval !== null) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }

    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }

    // 5. Sinkronisasi Titik Indikator jika User Menggeser Sendiri Menggunakan Jari (Swipe)
    function handleScroll() {
        const slideWidth = wrapper.offsetWidth;
        if (slideWidth > 0) {
            const newIndex = Math.round(wrapper.scrollLeft / slideWidth);
            if (newIndex !== currentIndex && newIndex < totalSlides) {
                currentIndex = newIndex;
                updateDots();
            }
        }
    }

    function handleTouchStart() {
        stopAutoPlay();
    }

    function handleTouchEnd() {
        resetAutoPlay();
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            stopAutoPlay();
        } else {
            resetAutoPlay();
        }
    }

    wrapper.addEventListener('scroll', handleScroll);
    wrapper.addEventListener('touchstart', handleTouchStart);
    wrapper.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // [AI-GENERATED][ROBUSTNESS][V122] Keep all listeners and timers owned by the
    // current slider instance so a future re-init can tear them down completely.
    const state = {
        destroy() {
            stopAutoPlay();
            wrapper.removeEventListener('scroll', handleScroll);
            wrapper.removeEventListener('touchstart', handleTouchStart);
            wrapper.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wrapper.__tpArticleSliderState === state) {
                delete wrapper.__tpArticleSliderState;
            }
        }
    };
    wrapper.__tpArticleSliderState = state;

    // Jalankan pertama kali
    startAutoPlay();
}

// [AI-GENERATED][REFACTOR][V54] Single realtime owner.
// The former implementation contained two competing channel constructors;
// the second silently overwrote the first and could target the wrong table.
async function initSupabaseRealtime() {
    const client = getAppSupabaseClient();
    if (!client?.channel) return false;

    try {
        if (globalResepChannel) {
            await client.removeChannel(globalResepChannel);
            globalResepChannel = null;
        }

        globalResepChannel = client.channel('sinkronisasi-resep')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, payload => {
                console.log('Pembaruan dari server tertangkap!', payload);
                if (typeof tanganiPerubahanResepRealtime === 'function') {
                    tanganiPerubahanResepRealtime(payload);
                }
            })
            .subscribe(status => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime Listener Aktif!');
                }
            });

        return true;
    } catch (err) {
        globalResepChannel = null;
        console.error('Gagal mengaktifkan Realtime Supabase:', err);
        return false;
    }
}

// ------------------------------------------------------------
// TIMER & PROOFING
// ------------------------------------------------------------
// FUNGSI MENAMPILKAN LOG DI PROFIL (Mendukung Mobile Native & PWA)
async function renderProofingLogs() {
    const container = document.getElementById('dynamic-proofing-logs');
    if (!container) return;

    // [AI-GENERATED][REFACTOR] UI rendering consumes the canonical proofing persistence service.
    const rawLogs = await ProofingService.readLogs();
    const logs = Array.isArray(rawLogs) ? rawLogs.slice(-5).reverse() : [];
    container.innerHTML = '';

    if (!logs.length) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'log-empty';
        emptyItem.textContent = 'Belum ada aktivitas proofing terbaru.';
        container.appendChild(emptyItem);
        return;
    }

    logs.forEach((entry) => {
        const title = entry.title || entry.recipe || entry.name || 'Proofing';
        let details = entry.message || entry.details || entry.note;
        if (!details && (entry.duration || entry.temp)) {
            const dur = entry.duration || '0';
            const temp = entry.temp || '--';
            const hum = entry.humidity || '--';
            details = `Durasi: ${dur}m | Suhu: ${temp}°C | Kelembapan: ${hum}%`;
        }
        if (!details) details = 'Aktivitas proofing dicatat.';

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

// [AI-GENERATED][REFACTOR] Proofing log persistence is owned by ProofingService.
async function appendProofingLog(entry) {
    const logs = await ProofingService.appendLog(entry);
    window.proofingHistory = logs;
    await renderProofingLogs();
}

function readProofingLogsFromStorage() {
    return ProofingService.readLogsSync();
}

async function jadwalkanAlarmProofing(menitDurasi) {
    // [AI-GENERATED][REFACTOR] Native scheduling is owned by ProofingNotificationService.
    if (!NativeCapacitorService.isNativePlatform()) {
        window.DEBUG && console.log("Berjalan di browser biasa, mengabaikan alarm native.");
        return { scheduled: false, reason: 'browser' };
    }

    const result = await ProofingNotificationService.schedule(menitDurasi);
    if (result.reason === 'permission-denied') {
        alert("⏱️ Notifikasi Terblokir\n\nUntuk mendapatkan alarm saat proses proofing selesai di latar belakang, mohon aktifkan izin notifikasi aplikasi ini melalui Pengaturan HP Anda.");
    }
    return result;
}

//==================================================================================
// FUNGSI TOMBOL PROOFING
//==================================================================================
function parseCountdownToSeconds(text) {
    // [AI-GENERATED][REFACTOR] Compatibility wrapper around the canonical timer engine.
    return parseTimerSeconds(text);
}

//1. UPDATE TIMER DISPLAY
// PERTAHANKAN fungsi updateTimerDisplay Anda tetap utuh seperti semula.
function updateTimerDisplay(totalSeconds) {
    // [AI-GENERATED][REFACTOR] Canonical timer formatting keeps UI output consistent.
    const display = document.getElementById('countdown');
    if (!display) return;
    display.innerText = formatTimerSeconds(totalSeconds);
}

// CIRCLE PROGRESS
function updateCircleProgress() {
    const circle = document.getElementById('progress-circle');
    if (!circle) return;

    const appContainer = document.getElementById('app-container');
    const isMini = appContainer?.classList.contains('mini-mode') === true;
    const circumference = isMini ? 282.7 : 904.78;
    const progress = calculateTimerProgress(globalTotalSeconds, globalInitialSeconds);

    if (!Number.isFinite(globalInitialSeconds) || globalInitialSeconds <= 0) {
        circle.style.strokeDashoffset = '0';
        circle.style.stroke = 'var(--accent)';
        return;
    }

    circle.style.strokeDashoffset = progress.overtime
        ? circumference
        : circumference - (progress.ratio * circumference);

    if (progress.overtime) {
        circle.style.stroke = '#d32f2f';
    } else if (progress.elapsedPercent <= 33.33) {
        circle.style.stroke = '#80ef80';
    } else if (progress.elapsedPercent <= 66.66) {
        circle.style.stroke = '#FF9800';
    } else {
        circle.style.stroke = '#ff0000';
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
    // [AI-GENERATED][BUG FIX] Countdown tap is a safe reset action when idle.
    // The previous implementation called handleTimerClick() recursively, causing
    // a RangeError/stack overflow whenever #countdown was tapped while idle.
    if (isTimerRunning) return;

    const startEl = document.getElementById('time-start');
    const display = document.getElementById('countdown');
    const tips = document.getElementById('ai-tips');

    if (startEl) startEl.innerText = '';
    if (display) {
        display.innerText = '00:00';
        display.style.color = 'var(--chocolate)';
    }

    totalDurationMinutes = 0;
    currentSelectedBaseDuration = 0;
    globalTotalSeconds = 0;
    globalInitialSeconds = 0;
    removeProofingPreference('activeMode');
    removeProofingPreference('timerDuration');
    clearProofingState();
    updateCircleProgress();
    updateTimeLabels(0, 0);
    if (tips) tips.innerText = 'Waktu dikosongkan. Silakan pilih mode atau atur manual.';
}

function setControlsDisabled(disabled) {
    // [AI-GENERATED][ROBUSTNESS] Optional controls are tolerated during partial UI/bootstrap states.
    [
        'btn-mode-initial',
        'btn-mode-rounding',
        'btn-mode-final',
        'custom-time',
        'set-btn',
        'off-temp',
        'off-hum'
    ].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.disabled = Boolean(disabled);
    });
}

// [AI-GENERATED][ROBUSTNESS][V173] Retain the last readable mode as a fallback
// so a temporary storage denial does not turn a valid running snapshot into
// a mode-less state that the restore validator must reject.
let lastKnownProofingMode = 'custom';

// [AI-GENERATED][ROBUSTNESS][V174] Preference storage is best-effort: a browser
// privacy policy, quota issue, or native WebView transition must not abort a
// timer mode selection or prevent the corresponding UI/state update.
function writeProofingPreference(key, value) {
    try {
        localStorage.setItem(key, String(value));
        if (key === 'activeMode' && String(value).trim()) {
            lastKnownProofingMode = String(value).trim();
        }
        return true;
    } catch (error) {
        console.warn(`[Proofing] Preferensi ${key} tidak dapat disimpan; state runtime tetap dilanjutkan:`, error);
        return false;
    }
}

// [AI-GENERATED][ROBUSTNESS][V174] Reset should remain functional even when
// preference storage is unavailable; the canonical proofing state is cleared
// independently by clearProofingState().
function removeProofingPreference(key) {
    try {
        localStorage.removeItem(key);
        if (key === 'activeMode') lastKnownProofingMode = 'custom';
        return true;
    } catch (error) {
        console.warn(`[Proofing] Preferensi ${key} tidak dapat dihapus:`, error);
        return false;
    }
}

function persistProofingState() {
    // [AI-GENERATED][ROBUSTNESS][V75] Any local timer mutation invalidates a
    // restore transaction that is still waiting on asynchronous persistence.
    // This prevents an old read from re-starting a timer after the user has
    // already changed/reset the timer.
    timerStateMutationEpoch += 1;

    // [AI-GENERATED][REFACTOR] Canonical timer state persistence.
    // The absolute target is persisted so restore can compensate for background time
    // without double-counting elapsed seconds after each periodic save.
    // [AI-GENERATED][BUG FIX][V173] Storage may be blocked by browser privacy
    // settings or throw during WebView transitions. Do not let an active timer's
    // one-second tick fail before its display updates just because mode is unreadable.
    let activeMode = lastKnownProofingMode;
    try {
        const storedMode = localStorage.getItem('activeMode');
        if (typeof storedMode === 'string' && storedMode.trim()) {
            activeMode = storedMode.trim();
            lastKnownProofingMode = activeMode;
        }
    } catch (error) {
        // [AI-GENERATED][BUG FIX][V173] Keep the last known mode rather than
        // persisting null; running-state validation requires a mode to restore.
        console.warn('[Proofing] Mode aktif tidak dapat dibaca saat menyimpan timer; memakai mode terakhir yang diketahui:', error);
    }

    ProofingService.saveState({
        totalSeconds: globalTotalSeconds,
        initialSeconds: globalInitialSeconds,
        isRunning: isTimerRunning,
        targetEndTime: proofingTimerController.getTargetEndTime(),
        mode: activeMode
    });
}

// [AI-GENERATED][NATIVE PIP][V326] Mirror timer-active state to the Android plugin.
// Android 12+ uses this to prepare automatic PiP when the Activity is sent to background.
function syncNativePictureInPictureTimerState(active) {
    if (!NativeCapacitorService.isNativePlatform()) return;
    const plugin = NativeCapacitorService.getPlugin('TimerPip');
    if (typeof plugin?.setTimerActive !== 'function') return;
    void Promise.resolve(plugin.setTimerActive({ active: Boolean(active) })).catch((error) => {
        console.warn('[Proofing][PiP] Gagal menyinkronkan status timer ke Android:', error);
    });
}

function clearProofingState() {
    // [AI-GENERATED][ROBUSTNESS][V75] Reset is also a state mutation. Invalidate
    // any restore read that may still be awaiting StorageService/Preferences.
    timerStateMutationEpoch += 1;

    ProofingService.clearState();
    // [AI-GENERATED][ROBUSTNESS][V61] Weather-cache cleanup is best-effort. A
    // storage/privacy failure must never abort timer shutdown, notification
    // cancellation, or completion-state reset.
    try {
        localStorage.removeItem('user_profile_weather_cache');
    } catch (error) {
        console.warn('[Proofing] Gagal membersihkan weather cache:', error);
    }
    
    // [AI-GENERATED][BUG FIX] Stop the actual proofing engine interval.
    // V5 only cleared a legacy window.proofingInterval that is never assigned by the engine.
    proofingTimerController.stop();
    timerInterval = null;

    // Retain cleanup for any legacy integration that may still use this property.
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
        ProofingAlarmService.stopAll();
    }

    // [AI-GENERATED][ROBUSTNESS] Clearing proofing state must also cancel any
    // pending native notification, regardless of which reset/cleanup path invoked it.
    void ProofingNotificationService.cancel();

    isTimerRunning = false;
    setTimerBackGuard(false);
    syncNativePictureInPictureTimerState(false);
    ProofingCompletionService.reset();
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
        ProofingCompletionService.reset();
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
        // [AI-GENERATED][ROBUSTNESS][V62] Use the local canonical compatibility
        // wrapper directly. Runtime scheduling must not depend on whether its
        // legacy window alias has already been attached.
        // [AI-GENERATED][ROBUSTNESS][V65] Schedule with the exact remaining
        // seconds. Converting to whole minutes could delay the native alarm by
        // up to 59 seconds after a manual/custom start.
        const sisaDetik = Math.max(1, Math.ceil(globalTotalSeconds));
        const targetEndTime = proofingTimerController.getTargetEndTime();
        if (sisaDetik > 0 && typeof ProofingNotificationService?.scheduleSeconds === 'function') {
            void ProofingNotificationService.scheduleSeconds(sisaDetik, {
                targetEndTime
            });
        }
    } else {
        const startEl = document.getElementById('time-start'); // TAMBAHAN
        if (startEl) startEl.innerText = "";                   // TAMBAHAN

        // PERBAIKAN: menekan "RESET PROOFING" tidak pernah menghentikan suara alarm yang
        // masih berbunyi (file MP3 nada kustom/preset maupun beep bawaan), sehingga nada
        // terus bermain sendiri sampai durasinya habis walau timer sudah direset.
        ProofingAlarmService.stopAll();
        ProofingCompletionService.reset();

        proofingTimerController.stop();
        timerInterval = null; // [AI-GENERATED][REFACTOR] Controller owns the actual interval.
        isTimerRunning = false;
        setControlsDisabled(false); 
        if (mainBtn) {
            mainBtn.innerText = "START PROOFING";
            mainBtn.style.background = "var(--chocolate)";
            // [AI-GENERATED][ROBUSTNESS][V62] clearProofingState() owns
            // notification cancellation for every platform; do not duplicate
            // a platform-specific cancellation here.
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
        removeProofingPreference('activeMode');
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
    if (!customInput) return false;
    const customVal = Number.parseInt(customInput.value, 10);

    if (!Number.isInteger(customVal) || customVal < 1 || customVal > 120) {
        alert("Mohon masukkan durasi yang valid (1 - 120 menit).");
        customInput.focus?.();
        return false;
    }

    totalDurationMinutes = customVal;

    // Tandai mode custom agar refresh cuaca tidak menimpa durasi user
    currentSelectedBaseDuration = -1;

    // 1. Set variabel logika
    globalTotalSeconds = customVal * 60;
    globalInitialSeconds = customVal * 60;

    // 2. Simpan data
    writeProofingPreference('activeMode', 'custom');
    writeProofingPreference('timerDuration', customVal);
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
    return true;
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
        // [AI-GENERATED][REFACTOR][V36] Use the shared network policy for IP fallback.
        const ipData = await getJson('https://ipapi.co/json/', { timeoutMs: 10000 });
        
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

// [AI-GENERATED][ROBUSTNESS][V36] Latest-request-wins lifecycle for weather refreshes.
let weatherRequestEpoch = 0;
let weatherRequestController = null;

// 1. Fungsi Utama Mengambil Data Backend Vercel & Distribusi Ke Grid UI Masing-Masing
async function fetchLocationAndWeather(lat, lon, source) {
    const requestEpoch = ++weatherRequestEpoch;
    weatherRequestController?.abort();
    weatherRequestController = new AbortController();

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
        // [AI-GENERATED][REFACTOR][V36] Network retrieval is owned by WeatherService.
        const weatherResult = await fetchWeather(lat, lon, { signal: weatherRequestController.signal });
        if (requestEpoch !== weatherRequestEpoch) return;
        const data = weatherResult.raw;
        const weatherData = weatherResult.weather;
        const temp = weatherResult.temp;
        const humidity = weatherResult.humidity;
        const pressure = weatherResult.pressure;
        const weatherId = weatherResult.weatherId;
        const mainWeather = weatherResult.mainWeather;
        const description = weatherResult.description;

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
                    ${Math.round(temp)}°C • ${escapeHtmlMarkup(deskripsiBersih)}
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
        // [AI-GENERATED][ROBUSTNESS][V36] Ignore stale/aborted requests so an older GPS response
        // cannot overwrite a newer location/weather state.
        if (requestEpoch !== weatherRequestEpoch || error?.name === 'AbortError') return;
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
                <div class="weather-status-line" style="font-size: 0.75rem; opacity: 0.7; color: #e74c3c;">${escapeHtmlMarkup(userMessage)}</div>
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
    const insightEl = document.getElementById('ai-insight');
    const recommendationEl = document.getElementById('ai-recommendation');
    const btn = document.getElementById('ai-refresh-btn') || document.getElementById('btn-ai-trigger');
    const badge = document.getElementById('ai-status-badge');
    const activeProductBtn = document.querySelector('.product-btn.active, [data-product].active, .pill-btn.active, .btn-product.active');
    const jenisProduk = activeProductBtn ? activeProductBtn.innerText.trim() : 'Adonan bakery';

    // Ambil hanya nilai sensor yang benar-benar tersedia; jangan mengarang angka default.
    const readMetric = (selectors, pattern) => {
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (!el) continue;
            const raw = el.dataset?.value || el.getAttribute('aria-valuenow') || el.textContent || '';
            const match = String(raw).replace(',', '.').match(pattern);
            if (match) {
                const value = Number.parseFloat(match[1] || match[0]);
                if (Number.isFinite(value)) return value;
            }
        }
        return null;
    };
    const nilaiSuhu = readMetric(
        ['#suhu-sekarang', '#status-text-ruang', '#temp-val', '[data-sensor="temperature"]', '[data-sensor="temp"]'],
        /-?\d+(?:[.,]\d+)?/
    );
    const nilaiKelembapan = readMetric(
        ['#kelembapan-sekarang', '#humidity-val', '#hum-val', '#summary-humidity', '[data-sensor="humidity"]', '[data-sensor="rh"]'],
        /\d+(?:[.,]\d+)?/
    );
    // Use only explicitly saved weather readings when the UI has not rendered yet.
    // Never substitute a fabricated default such as 28°C or 70% RH.
    const readCachedMetric = (keys, min, max) => {
        for (const key of keys) {
            try {
                const raw = localStorage.getItem(key);
                if (raw === null || raw.trim() === '') continue;
                const value = Number(String(raw).replace(',', '.'));
                if (Number.isFinite(value) && value >= min && value <= max) return value;
            } catch (storageError) {
                console.debug('[AI Telemetry] Cache sensor tidak dapat dibaca:', storageError?.message || storageError);
            }
        }
        return null;
    };
    const suhuAktual = Number.isFinite(nilaiSuhu) ? nilaiSuhu : readCachedMetric(['cache_suhu'], -10, 60);
    const kelembapanAktual = Number.isFinite(nilaiKelembapan) ? nilaiKelembapan : readCachedMetric(['cache_kelembaban'], 0, 100);

    if (!Number.isFinite(suhuAktual) || !Number.isFinite(kelembapanAktual)) {
        const message = 'Data suhu dan kelembapan belum tersedia. Aktifkan atau perbarui sensor/cuaca terlebih dahulu agar rekomendasi tidak menggunakan angka perkiraan.';
        if (insightEl) insightEl.textContent = message;
        if (recommendationEl) recommendationEl.textContent = 'Analisis menunggu data sensor yang valid.';
        if (badge) {
            badge.style.background = '#FADBD8';
            badge.style.color = '#922B21';
            badge.textContent = '🔴 Sensor belum tersedia';
        }
        console.warn('[AI Telemetry] Analisis tidak dikirim: data suhu/kelembapan tidak tersedia.');
        return;
    }

    if (suhuAktual < -10 || suhuAktual > 60 || kelembapanAktual < 0 || kelembapanAktual > 100) {
        const message = `Data sensor di luar rentang yang wajar (suhu ${suhuAktual}°C, kelembapan ${kelembapanAktual}%). Periksa sensor sebelum meminta rekomendasi.`;
        if (insightEl) insightEl.textContent = message;
        if (recommendationEl) recommendationEl.textContent = 'Analisis dihentikan sampai data sensor valid.';
        console.warn('[AI Telemetry] Data sensor di luar rentang:', { temperature: suhuAktual, humidity: kelembapanAktual });
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Menganalisis telemetri…';
        btn.style.opacity = '0.7';
    }
    if (badge) {
        badge.style.background = '#FCF3CF';
        badge.style.color = '#B7950B';
        badge.textContent = '🟡 Menganalisis…';
    }
    if (insightEl) insightEl.textContent = 'Menganalisis suhu, kelembapan, dan karakteristik produk…';

    try {
        const timerText = document.getElementById('timer-display')?.textContent
            || document.getElementById('timer')?.textContent
            || document.getElementById('waktu-proofing')?.value
            || '';
        const payloadData = {
            promptContext: [
                'Buat rekomendasi proofing/fermentasi yang dinamis dan spesifik berdasarkan data aktual berikut.',
                `Suhu ruang terukur: ${suhuAktual}°C.`,
                `Kelembapan relatif terukur: ${kelembapanAktual}%.`,
                `Jenis produk yang dipilih: ${jenisProduk}.`,
                `Informasi timer yang terlihat (bila ada): ${timerText || 'tidak tersedia'}.`,
                'Jelaskan rentang estimasi waktu, tanda visual/tekstur untuk menentukan akhir proofing, risiko underproof/overproof, dan kapan pengguna perlu memeriksa ulang adonan.',
                'Jangan mengarang data bahan, suhu inti, jenis ragi, atau durasi awal yang tidak diberikan. Jangan menyajikan satu angka waktu sebagai jaminan; sebutkan bahwa kondisi adonan dan resep tetap menentukan.'
            ].join('\n'),
            suhuRuang: suhuAktual,
            temperature: suhuAktual,
            kelembapan: kelembapanAktual,
            humidity: kelembapanAktual,
            jenisProduk,
            waktuProofing: timerText || 'Belum tersedia'
        };
        const data = await requestAITelemetry(payloadData);
        const hasilAI = data?.result || data?.analisis || data?.insight || data?.text || '';
        if (!String(hasilAI).trim()) throw new Error('Server AI tidak mengembalikan rekomendasi.');

        const jenisProdukHtml = escapeHtmlMarkup(jenisProduk);
        if (insightEl) insightEl.innerHTML = `<strong>Analisis (${jenisProdukHtml} — ${suhuAktual}°C / ${kelembapanAktual}% RH):</strong><br><br>${formatHasilAI(hasilAI)}`;
        if (recommendationEl) recommendationEl.textContent = 'Rekomendasi dibuat berdasarkan data sensor yang tersedia; pantau kondisi adonan secara visual.';
        if (badge) {
            badge.style.background = '#D4EFDF';
            badge.style.color = '#196F3D';
            badge.textContent = '🟢 Analisis diperbarui';
        }
    } catch (error) {
        // Fallback menjelaskan batasan dengan jujur; tidak mengarang durasi proofing.
        console.error('[AI Telemetry] Permintaan analisis gagal:', {
            name: error?.name || 'Error', message: error?.message || String(error),
            status: error?.status ?? null, code: error?.code ?? null,
            url: error?.url || undefined
        });
        if (insightEl) insightEl.innerHTML = `<strong>Analisis lokal (${escapeHtmlMarkup(jenisProduk)}):</strong> Suhu ${suhuAktual}°C dan kelembapan ${kelembapanAktual}% telah terbaca, tetapi layanan AI sedang tidak tersedia. Jangan gunakan durasi otomatis sebagai kepastian; periksa volume adonan, aktivitas ragi, dan tanda proofing secara berkala. <em>Detail teknis tercatat di console.</em>`;
        if (recommendationEl) recommendationEl.textContent = 'AI tidak dapat dihubungi. Pertahankan pemeriksaan visual dan coba kembali nanti.';
        if (badge) {
            badge.style.background = '#FADBD8';
            badge.style.color = '#922B21';
            badge.textContent = '🟠 AI tidak tersedia';
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔄 Perbarui Analisis Telemetri';
            btn.style.opacity = '1';
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
        // [AI-GENERATED][REFACTOR][V36] Elevation transport is owned by WeatherService.
        return await fetchElevation(lat, lon);
    } catch (error) {
        console.warn("Gagal mengambil API Ketinggian:", error.message);
        return null; // Kembalikan null agar pemanggil memakai rumus cadangan.
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
    const dipaksaLuring = readForcedOfflinePreference();

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
    const { cache, hasSavedCache } = readOfflineWeatherCache();

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
    if (hasSavedCache && cache.locationName) {
        const [locationPrimary, locationSecondary] = splitWeatherLocationName(cache.locationName);
        if (line1) line1.innerText = locationPrimary;
        if (line2) line2.innerText = locationSecondary;
    } else {
        if (line1) line1.innerText = "📍 Mode Luring Premium";
        if (line2) line2.innerText = "Menggunakan Parameter Manual Mandiri";
    }

    // Ambil data ketinggian/koordinat sekunder
    const altValue = cache.alt || readOfflineWeatherValue('saved_altitude') || "10";
    if (document.getElementById('alt-val')) {
        document.getElementById('alt-val').innerText = altValue + " m";
    }
    
    currentLat = cache.lat || readOfflineWeatherValue('saved_lat');
    currentLon = cache.lon || readOfflineWeatherValue('saved_lon');

    // 7. PERBARUI TEMA VISUAL SECARA DINAMIS BERDASARKAN PILIHAN INPUT CUACA USER
    if (typeof updateDynamicTheme === "function") {
        let weatherId = 800; 
        let weatherMain = "Clear";
        if (condition === 'rain' || condition === 'hujan') { weatherId = 500; weatherMain = "Rain"; }
        else if (condition === 'clouds' || condition === 'mendung') { weatherId = 803; weatherMain = "Clouds"; }
        
        updateDynamicTheme(weatherId, weatherMain);
    }

    // 8. SIMPAN DATA SIMULASI TERBARU KE STORAGE
    writeOfflineWeatherCache({
        ...cache,
        temp: temp,
        hum: humidity,
        humidity: humidity,
        mainWeather: condition,
        condition: condition
    });

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
// FUNGSI UTAMA START PROOFING (GABUNGAN AMAN & PRESISI)
// =========================================================
function startProofing(isRestoring = false, restoredTargetEndTime = null) {
    const display = document.getElementById('countdown');

    // 1. Sinkronisasi pengaman global agar tidak bernilai 0 atau NaN.
    if (globalTotalSeconds <= 0 && display) {
        globalTotalSeconds = parseCountdownToSeconds(display.innerText);
    }
    if (globalInitialSeconds <= 0) {
        globalInitialSeconds = globalTotalSeconds;
    }

    // [AI-GENERATED][BUG FIX] Jangan memulai interval kosong dari jalur start manual.
    if (!isRestoring && (!Number.isFinite(globalTotalSeconds) || globalTotalSeconds <= 0)) {
        console.warn("Timer belum memiliki durasi yang valid.");
        return;
    }

    // 2. Proteksi Autoplay Audio Browser (Mencegah blokir suara alarm).
    try {
        ProofingAlarmService.getAudioContext(!isRestoring);
    } catch (e) {
        console.warn("AudioContext belum diizinkan oleh sistem browser:", e);
    }

    // Cegah timer berjalan ganda.
    if (isTimerRunning && proofingTimerController.isRunning()) {
        console.warn("Timer sudah berjalan.");
        return;
    }

    // [AI-GENERATED][REFACTOR] Scheduling, drift correction, and interval ownership
    // are delegated to the canonical proofing timer controller.
    isTimerRunning = true;
    setTimerBackGuard(true);
    syncNativePictureInPictureTimerState(true);
    // [AI-GENERATED][ROBUSTNESS][V226] start() immediately executes its first
    // callback. If a renderer throws there, the controller stops its interval
    // and rethrows before the assignment returns; without this guard, the app's
    // global isTimerRunning flag would incorrectly remain true forever.
    const timerStartResult = startTimerWithRecovery(
        () => proofingTimerController.start(globalTotalSeconds, {
            allowOvertime: isRestoring,
            targetEndTime: restoredTargetEndTime,
            onTick: (remainingSeconds) => {
                globalTotalSeconds = remainingSeconds;
                persistProofingState();

                updateTimerDisplay(globalTotalSeconds);
                updateCircleProgress();

                const minutesLeft = Math.floor(globalTotalSeconds / 60);
                const secondsLeft = globalTotalSeconds % 60;
                if (typeof updateTimeLabels === 'function') {
                    updateTimeLabels(minutesLeft, secondsLeft, false);
                }

                // Peringatan visual warna merah jika sisa 1 menit terakhir.
                if (globalTotalSeconds <= 60 && display) {
                    display.style.color = "red";
                }
            },
            onOvertime: (remainingSeconds) => {
                globalTotalSeconds = remainingSeconds;
                persistProofingState();

                updateTimerDisplay(globalTotalSeconds);
                updateCircleProgress();

                const overtimeSecs = Math.abs(globalTotalSeconds);
                const overMins = Math.floor(overtimeSecs / 60);
                const overSecs = overtimeSecs % 60;

                if (typeof updateTimeLabels === 'function') {
                    updateTimeLabels(overMins, overSecs, true);
                }

                // [AI-GENERATED][REFACTOR] Completion side effects are owned by the canonical service.
                ProofingCompletionService.triggerOvertime(globalTotalSeconds);

                const aiTipsEl = document.getElementById('ai-tips');
                if (aiTipsEl) {
                    aiTipsEl.innerText = `⚠️ PERINGATAN: Adonan melewati batas waktu standar selama ${overMins} menit ${overSecs} detik!`;
                }
            }
        }), (startError) => {
        console.error('[Proofing] Timer gagal dimulai; memulihkan state runtime:', startError);
        // Cleanup steps are independent: one failed UI/native operation must not
        // prevent the remaining flags and durable running-state from recovering.
        try { proofingTimerController.stop(); } catch (error) {
            console.warn('[Proofing] Gagal menghentikan controller setelah startup error:', error);
        }
        timerInterval = null;
        isTimerRunning = false;
        setTimerBackGuard(false);
        syncNativePictureInPictureTimerState(false);
        try { setControlsDisabled(false); } catch (error) {
            console.warn('[Proofing] Gagal mengaktifkan ulang kontrol setelah startup error:', error);
        }
        try {
            void Promise.resolve(ProofingNotificationService.cancel()).catch((error) => {
                console.warn('[Proofing] Gagal membatalkan notifikasi setelah startup error:', error);
            });
        } catch (error) {
            console.warn('[Proofing] Pembatalan notifikasi melempar error setelah startup error:', error);
        }
        try { persistProofingState(); } catch (error) {
            console.warn('[Proofing] Gagal menyimpan state idle setelah startup error:', error);
        }
    });

    timerInterval = timerStartResult.handle;
    if (!timerStartResult.ok) {
        if (timerStartResult.recoveryError) {
            console.error('[Proofing] Pembersihan startup timer juga mengalami error:', timerStartResult.recoveryError);
        }
        return;
    }

    if (timerInterval === null || timerInterval === undefined) {
        // Controller rejects invalid durations; restore path remains state-safe.
        isTimerRunning = false;
        setTimerBackGuard(false);
        syncNativePictureInPictureTimerState(false);
        clearProofingState();
        return;
    }

    persistProofingState();
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

    // [AI-GENERATED][REFACTOR] Use the same adaptive calculation as product stages.
    const temp = parseFloat(document.getElementById('temp-val')?.innerText) || 28;
    const hum = parseFloat(document.getElementById('hum-val')?.innerText) || 70;
    const calculatedSeconds = calculateAdaptiveProofingSeconds(duration, temp, hum);
    const calculated = Math.max(1, Math.round(calculatedSeconds / 60));

    totalDurationMinutes = calculated;
    writeProofingPreference('activeMode', mode);
    if (typeof NotifSystem !== 'undefined' && typeof NotifSystem.tambah === 'function') {
        NotifSystem.tambah('timer', `Mode ${namaMode[mode]}`, `Durasi diatur ke ${calculated} menit berdasarkan suhu ${temp}°C dan kelembapan ${hum}%.`, '🍩');
    }

    globalTotalSeconds = calculatedSeconds;
    globalInitialSeconds = calculatedSeconds;
    updateTimerDisplay(globalTotalSeconds);
    updateTimeLabels(calculated, 0, false);
    const aiTips = document.getElementById('ai-tips');
    if (aiTips) {
        aiTips.innerText = `Anda memilih Mode ${mode.toUpperCase()}. \nWaktu disesuaikan ke ${calculated} menit berdasarkan suhu dapur.`;
    }
    
    updateCircleProgress();
    persistProofingState();
    
    if (display) display.style.color = "var(--chocolate)";
}

// [AI-GENERATED][ROBUSTNESS][V71] Single-flight restore guard.
// Multiple lifecycle signals can arrive close together (DOMContentLoaded, resume,
// foreground reconciliation). They must share one restore transaction so two
// concurrent reads cannot both restart the canonical timer controller.
let timerRestorePromise = null;

// [AI-GENERATED][ROBUSTNESS][V75] Mutation epoch for restore cancellation.
// Single-flight prevents duplicate restores, while this epoch prevents a restore
// from applying stale data after a user mutation/reset occurs during its async read.
let timerStateMutationEpoch = 0;

// FUNGSI CHECK AND RESTORE TIMER
async function checkAndRestoreTimer() {
    if (timerRestorePromise) return timerRestorePromise;

    timerRestorePromise = (async () => {
        // [AI-GENERATED][ROBUSTNESS][V75] Capture the mutation epoch before the
        // asynchronous read. If the timer is changed/reset while the read is in
        // flight, the snapshot must never be applied to the newer runtime state.
        const restoreEpoch = timerStateMutationEpoch;

        // [AI-GENERATED][ROBUSTNESS][V68] Restore may need native Preferences when
        // LocalStorage is unavailable, so await the canonical persistence boundary.
        // [AI-GENERATED][BUG FIX][V171] A transient storage/bridge rejection is
        // not equivalent to a confirmed empty snapshot. Keep the current runtime
        // and pending notification untouched; a later foreground reconciliation
        // can retry the read without converting an I/O failure into a reset.
        let savedState;
        try {
            savedState = await ProofingService.readState();
        } catch (readError) {
            console.warn('[Proofing] Pembacaan state gagal sementara; pemulihan akan dicoba lagi:', readError);
            return;
        }

        // [AI-GENERATED][ROBUSTNESS][V75] User/runtime mutation wins over a stale
        // asynchronous restore transaction.
        if (restoreEpoch !== timerStateMutationEpoch) return;

        // [AI-GENERATED][ROBUSTNESS][V136] A missing persisted snapshot must not
        // tear down a timer that is already running in memory. Storage can be
        // temporarily unavailable during WebView/native transitions; the active
        // runtime remains the source of truth until its next persistence barrier.
        if (!savedState) {
            if (!isTimerRunning) {
                void ProofingNotificationService.cancel();
            }
            return;
        }

    // [AI-GENERATED][ROBUSTNESS][V57] Ignore duplicate startup/foreground restore
    // attempts while the canonical timer controller is already running. This keeps
    // DOMContentLoaded + lifecycle reconciliation from rewriting timer state twice.
    if (savedState.isRunning && isTimerRunning && proofingTimerController.isRunning()) {
        // [AI-GENERATED][ROBUSTNESS][V130] A native WebView can return from
        // background/recreation with its LocalNotification removed by the OS
        // even though the canonical timer is still running. Reconcile the
        // notification against the persisted absolute deadline without
        // restarting the timer engine or mutating timer state.
        // [AI-GENERATED][BUG FIX][V181] When the timer is already running in
        // this WebView, its live controller deadline is authoritative. A stale
        // native snapshot can occur when local storage is blocked and native
        // Preferences has not caught up; using it here could move the OS alarm
        // away from the countdown the user is actually seeing.
        const liveTarget = Number(proofingTimerController.getTargetEndTime());
        const persistedTarget = Number(savedState.targetEndTime);
        const runningTarget = Number.isFinite(liveTarget) && liveTarget > 0
            ? liveTarget
            : persistedTarget;
        const runningSeconds = Number.isFinite(runningTarget) && runningTarget > 0
            ? Math.round((runningTarget - Date.now()) / 1000)
            : 0;
        if (runningSeconds > 0) {
            void ProofingNotificationService.scheduleSeconds(runningSeconds, {
                targetEndTime: runningTarget
            });
        } else {
            // [AI-GENERATED][BUG FIX][V172] A duplicate restore can run after
            // the absolute deadline has elapsed while the in-memory controller
            // is still intentionally running in overtime. Do not leave or
            // recreate a completion alarm for an already-expired deadline.
            void ProofingNotificationService.cancel();
        }
        return;
    }

    try {
        if (!savedState || typeof savedState.totalSeconds !== 'number' || !Number.isFinite(savedState.totalSeconds)) {
            clearProofingState();
            return;
        }

        let restoredSeconds = savedState.totalSeconds;
        if (savedState.isRunning) {
            const targetEndTime = Number(savedState.targetEndTime);
            if (Number.isFinite(targetEndTime) && targetEndTime > 0) {
                restoredSeconds = Math.round((targetEndTime - Date.now()) / 1000);
            }
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
                const overtimeSeconds = Math.abs(restoredSeconds);
                const m = Math.floor(overtimeSeconds / 60);
                const s = overtimeSeconds % 60;
                updateTimeLabels(m, s, true);
            }
        }

        updateCircleProgress();

        if (savedState.isRunning) {
            // [AI-GENERATED][ROBUSTNESS][V132] A persisted running timer may be
            // restored after its absolute deadline has already passed (for example
            // after OS suspension or WebView recreation). The timer must continue
            // in overtime, but its old native completion notification is now stale.
            if (restoredSeconds <= 0) {
                void ProofingNotificationService.cancel();
            }

            // [AI-GENERATED][ROBUSTNESS][V67] Restore the validated mode together
            // with the timer state so duration/target/mode remain coherent.
            if (savedState.mode) {
                try {
                    writeProofingPreference('activeMode', savedState.mode);
                } catch (error) {
                    console.warn('[Proofing] Gagal memulihkan activeMode:', error);
                }
            }

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
            if (restoredSeconds < 0) {
                ProofingCompletionService.markTriggered();
            } else {
                ProofingCompletionService.reset();
            }
            startProofing(true, savedState.targetEndTime);
            if (restoredSeconds > 0) {
                // [AI-GENERATED][ROBUSTNESS][V185] The timer controller normalizes
                // missing/invalid persisted deadlines when it restores the timer.
                // Use that canonical runtime deadline for the native alarm so the
                // notification cannot drift from the countdown after recovery.
                const restoredTargetEndTime = proofingTimerController.getTargetEndTime();
                void ProofingNotificationService.scheduleSeconds(restoredSeconds, {
                    targetEndTime: restoredTargetEndTime
                });
            }
        } else {
            // [AI-GENERATED][ROBUSTNESS][V132] An idle persisted state must never
            // leave an orphan native alarm from an earlier proofing session.
            void ProofingNotificationService.cancel();
            setControlsDisabled(false);
            persistProofingState();
        }
    } catch (err) {
        console.warn('Gagal memulihkan state proofing:', err);
        // [AI-GENERATED][ROBUSTNESS][V136] Never destroy a live timer because a
        // foreground/storage reconciliation failed transiently. Preserve the
        // runtime state and let the normal background persistence barrier repair
        // the durable snapshot. Only an idle runtime may safely be cleared here.
        if (!isTimerRunning) {
            void ProofingNotificationService.cancel();
            await ProofingService.clearState();
        }
    }
    })();

    try {
        return await timerRestorePromise;
    } finally {
        timerRestorePromise = null;
    }
}

// Fungsi untuk menghitung waktu adaptif berdasarkan suhu dan kelembapan
function calculateAdaptiveTime(baseMinutes, currentTemp, currentHum) {
    // [AI-GENERATED][REFACTOR] Canonical pure adaptive-time calculation.
    return calculateAdaptiveProofingSeconds(baseMinutes, currentTemp, currentHum);
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
  donut: [
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

  // [AI-GENERATED][BUG-FIX][V221] Resolve localized/legacy product aliases (e.g. donat -> donut).
  const steps = getRecipeInstructionSteps(resepProduk, productKey);

  // [AI-GENERATED][SECURITY][V221] Recipe steps are text; build list items without an HTML sink.
  listContainer.replaceChildren();
  for (const step of steps) {
    const item = document.createElement('li');
    item.textContent = String(step ?? '');
    listContainer.appendChild(item);
  }
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

// 3. Toggle Cara Pembuatan sebagai overlay di atas timer-circle.
// Pengukuran dilakukan sebelum mengubah posisi ke absolute agar timer tidak terdorong.
const toggleBtn = document.getElementById("toggle-cara-pembuatan");
const contentBody = document.getElementById("cara-pembuatan-content");
const caraPembuatanWrapper = document.getElementById("cara-pembuatan-container");

if (toggleBtn && contentBody && caraPembuatanWrapper && !toggleBtn.dataset.tpOverlayBound) {
  toggleBtn.dataset.tpOverlayBound = 'v325';
  toggleBtn.addEventListener("click", function () {
    const willOpen = contentBody.classList.contains('hidden');
    if (willOpen) {
      const positioningParent = caraPembuatanWrapper.parentElement;
      if (positioningParent) {
        const parentRect = positioningParent.getBoundingClientRect();
        const wrapperRect = caraPembuatanWrapper.getBoundingClientRect();
        const top = wrapperRect.top - parentRect.top + positioningParent.scrollTop;
        caraPembuatanWrapper.style.setProperty('--cara-overlay-top', `${Math.max(0, top)}px`);
      }
      contentBody.classList.remove('hidden');
      caraPembuatanWrapper.classList.add('overlay-open');
    } else {
      contentBody.classList.add('hidden');
      caraPembuatanWrapper.classList.remove('overlay-open');
      caraPembuatanWrapper.style.removeProperty('--cara-overlay-top');
    }
    toggleBtn.classList.toggle("active", willOpen);
    toggleBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  });
}

// Set resep awal bekerja baik sebelum maupun sesudah DOMContentLoaded.
const initializeDefaultRecipeInstructions = () => updateCaraPembuatanContent("donat");
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initializeDefaultRecipeInstructions, { once: true });
} else {
  initializeDefaultRecipeInstructions();
}

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

        // [AI-GENERATED][REFACTOR] Replaceable listener avoids DOM onclick state.
        bindReplaceableClick(btn, () => {
            // Reset warna semua tombol dalam grid
            document.querySelectorAll('#mode-grid-container .mode-btn').forEach(b => {
                b.style.background = 'rgba(0,0,0,0.03)';
                b.style.color = 'inherit';
            });
            // Berikan warna aktif pada tombol yang diklik
            btn.style.background = 'var(--accent)';
            btn.style.color = 'white';
            
            setProductStage(productKey, stage.key, stage.minutes, stage.desc);
        });
        container.appendChild(btn);
    });
}

// 4. Kalkulator Waktu & Penyesuaian Berdasarkan Kondisi Suhu/Kelembapan
function setProductStage(productKey, modeKey, baseMinutes, description) {
    if (typeof isTimerRunning !== 'undefined' && isTimerRunning) return;
    writeProofingPreference('activeMode', `${productKey}_${modeKey}`);

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

// [AI-GENERATED][REFACTOR] Alarm audio + haptics are owned by ProofingAlarmService.
// Compatibility globals remain exported by the service for existing UI/features.

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
    // [AI-GENERATED][ROBUSTNESS][V279] Leaving the detail editor invalidates queued save context.
    markRecipeEditorContextChanged();
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
    markRecipeEditorContextChanged();
    resetRecipeAiAnalysisState();
    currentEditingRecipeId = null;
    // [AI-GENERATED][ROBUSTNESS][V138] A new recipe starts with an empty photo
    // session so photos from the previously edited recipe can never be attached
    // accidentally to a newly generated recipe ID. Invalidate any late restore.
    recipePhotoRestoreEpoch += 1;
    activeRecipePhotoRestorePromise = null;
    latestRecipePhotoRestoreOutcome = null;
    RecipePhotoService.clear?.();
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
    markRecipeEditorContextChanged();
    resetRecipeAiAnalysisState();
    currentEditingRecipeId = resep.id;
    terapkanResepKeKalkulator(resep);
    void restoreRecipePhotosForRecipe(resep);
    
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

// [AI-GENERATED][REFACTOR][V98] Canonical recipe-method tab controller.
// Preserves the existing DOM contract while combining the legacy foto tab
// behavior with the guarded UI updates used by the compatibility export.
function gantiTabMetode(namaTab) {
    const tabs = {
        bahan: { button: 'btn-tab-bahan', content: 'method-bahan-content' },
        cara: { button: 'btn-tab-cara', content: 'method-steps-content' },
        foto: { button: 'btn-tab-foto', content: 'method-foto-content' }
    };
    const selected = tabs[namaTab];
    if (!selected) return;

    Object.values(tabs).forEach(({ button, content }) => {
        document.getElementById(content)?.style.setProperty('display', 'none');
        document.getElementById(button)?.classList.remove('active');
    });

    const selectedContent = document.getElementById(selected.content);
    const selectedButton = document.getElementById(selected.button);
    // [AI-GENERATED][BUG FIX][V304] Method panels are vertical document-flow
    // sections, not flex containers. Switching tabs must not convert the
    // ingredient/HPP panel to flex and trigger shrink on its nested content.
    if (selectedContent) selectedContent.style.display = 'block';
    if (selectedButton) {
        selectedButton.classList.add('active');
        selectedButton.style.background = '#4E342E';
        selectedButton.style.color = 'white';
    }

    Object.entries(tabs).forEach(([key, { button }]) => {
        if (key === namaTab) return;
        const el = document.getElementById(button);
        if (el) {
            el.style.background = '#F2D2A9';
            el.style.color = '#4E342E';
        }
    });
}

// [AI-GENERATED][REFACTOR][V106] Removed obsolete recipe-menu/photo handlers.
// The active recipe menu is rendered by the canonical .recipe-menu-wrapper /
// .recipe-dropdown-menu flow below, while recipe photo upload/delete is owned
// by RecipePhotoService. No active HTML contract referenced these legacy paths.

// [AI-GENERATED][ROBUSTNESS][V279] Capture the authenticated namespace and the
// current editor/photo generations before the first await in a save transaction.
function markRecipeEditorContextChanged() {
    recipeEditorEpoch += 1;
    // [AI-GENERATED][ROBUSTNESS][V280] Editor navigation invalidates the previous recipe's photo restore result.
    latestRecipePhotoRestoreOutcome = null;
    return recipeEditorEpoch;
}

function captureRecipeSaveContext() {
    return Object.freeze({
        expectedOwnerId: RecipeStorageService.getActiveOwnerId?.() ?? null,
        capturedEditorEpoch: recipeEditorEpoch,
        capturedEditingRecipeId: currentEditingRecipeId ?? null,
        capturedPhotoMutationEpoch: getRecipePhotoMutationEpoch() // [AI-GENERATED][ES6 MODULE][V285]
    });
}

// [AI-GENERATED][ROBUSTNESS][V279] Snapshot all form/domain inputs which feed
// the saved recipe. This detects edits that do not cause editor navigation.
function captureRecipeFormFingerprint(recipeName) {
    return JSON.stringify({
        name: String(recipeName ?? document.getElementById('recipe-save-name')?.value ?? '').trim(),
        flourWeight: document.getElementById('base-flour')?.value || '1000',
        targetYield: document.getElementById('recipe-yield')?.value || '1',
        salePrice: document.getElementById('input-harga-jual')?.value || '0',
        ingredients: Array.isArray(bakeryIngredients) ? bakeryIngredients : [],
        productionSteps: Array.isArray(activeRecipeSteps) ? activeRecipeSteps : [],
        editingId: currentEditingRecipeId ?? null
    });
}

async function inspectRecipeSaveContext(context) {
    let owner = null;
    let authError = null;
    try {
        // [AI-GENERATED][ROBUSTNESS][V279] A local recipe save must remain
        // offline-capable: inspect the cached session first, and use the older
        // verified-user API only as a compatibility fallback for older builds.
        if (typeof AuthService.getSessionUser === 'function') {
            owner = await AuthService.getSessionUser();
        } else {
            owner = await AuthService.getUser?.();
        }
    } catch (error) {
        authError = error;
    }

    const current = !authError && isRecipeSaveContextCurrent({
        ...context,
        authenticatedOwnerId: owner?.id,
        activeOwnerId: RecipeStorageService.getActiveOwnerId?.() ?? null,
        activeEditorEpoch: recipeEditorEpoch,
        activeEditingRecipeId: currentEditingRecipeId ?? null,
        activePhotoMutationEpoch: getRecipePhotoMutationEpoch(), // [AI-GENERATED][ES6 MODULE][V285]
        activeFormFingerprint: context.recipeFormFingerprint == null
            ? null
            : captureRecipeFormFingerprint()
    });
    return { current, owner, error: authError };
}

async function assertRecipeSaveContextCurrent(context, stage) {
    const status = await inspectRecipeSaveContext(context);
    if (!status.current) {
        const error = new Error('Sesi akun atau editor resep berubah selama penyimpanan. Buka kembali resep sebelum mencoba lagi.');
        error.code = context.expectedOwnerId ? 'RECIPE_SAVE_CONTEXT_CHANGED' : 'RECIPE_OWNER_REQUIRED';
        error.stage = stage;
        error.cause = status.error || undefined;
        throw error;
    }
    return status.owner;
}

function warnStaleRecipeSaveContext(stage) {
    console.warn(`[RecipeSave] Sesi/editor berubah pada tahap ${stage}; hasil lama tidak diterapkan ke tampilan aktif.`);
    if (typeof window.showToast === 'function') {
        window.showToast('Sesi atau editor berubah saat menyimpan. Tampilan aktif tidak diubah; periksa daftar resep akun asal.');
    }
}

// 2. FUNGSI UTAMA PENYIMPANAN
async function simpanResepKeDatabase() {
    if (isSaving) return;
    isSaving = true;
    // [AI-GENERATED][ROBUSTNESS][V279] Allocate transaction state before try,
    // but capture owner/editor context inside try and before the first await so
    // even an unexpected context-capture error releases the global save lock.
    let saveContext = null;
    let localCommitSucceeded = false;
    let cloudSyncError = null;

    try {
        saveContext = captureRecipeSaveContext();
        const namaResepInput = document.getElementById('recipe-save-name');
        let namaResep = namaResepInput ? namaResepInput.value.trim() : "";

        if (!namaResep) {
            const tanggalHariIni = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            namaResep = `Resep Donat (${tanggalHariIni})`;
            if (namaResepInput) namaResepInput.value = namaResep;
        }

        // [AI-GENERATED][ROBUSTNESS][V279] Bind the transaction to the exact
        // editor inputs that produced the recipe object, not just the recipe ID.
        saveContext = Object.freeze({
            ...saveContext,
            recipeName: namaResep,
            recipeFormFingerprint: captureRecipeFormFingerprint(namaResep)
        });
        const objekResep = bangunObjekResepDariForm(namaResep);
        const saveOwner = await assertRecipeSaveContextCurrent(saveContext, 'initial');
        const saveOwnerId = String(saveOwner.id);

        // [AI-GENERATED][ROBUSTNESS][V279] A read may finish after the account or
        // selected editor changes. Revalidate before using that list to build a write.
        let daftarResep = await bacaSemuaResepDariPerangkat();
        if (!Array.isArray(daftarResep)) daftarResep = [];
        await assertRecipeSaveContextCurrent(saveContext, 'after-local-read');

        const indexExisting = daftarResep.findIndex((recipe) =>
            String(recipe?.id) === String(objekResep.id) ||
            RecipeDomainService.isSameName(recipe?.nama || recipe?.name, objekResep.nama)
        );
        const isNewRecipe = indexExisting < 0;
        if (indexExisting >= 0) daftarResep[indexExisting] = objekResep;
        else daftarResep.push(objekResep);

        // [AI-GENERATED][SECURITY][V279] Pin the original owner and revalidate
        // auth/editor/photo generations inside RecipeStorageService's FIFO immediately
        // before it writes. This closes the read-complete -> queued-commit race.
        await RecipeStorageService.saveList(daftarResep, {
            maxItems: window.MAX_RESEP_TERSIMPAN || 10,
            expectedOwnerId: saveContext.expectedOwnerId,
            validateBeforeCommit: async () => {
                await assertRecipeSaveContextCurrent(saveContext, 'before-local-write');
                return true;
            }
        });
        localCommitSucceeded = true;

        // The scoped local commit may complete during a transition. Never render or
        // mutate secondary data if its originating session/editor is no longer active.
        let contextStatus = await inspectRecipeSaveContext(saveContext);
        if (!contextStatus.current) {
            warnStaleRecipeSaveContext('after-local-write');
            return;
        }

        // Reward progression only after the local write is confirmed and the save
        // still belongs to the active editor/session.
        if (isNewRecipe && typeof ProgressionSystem !== 'undefined') {
            ProgressionSystem.addRecipe();
        }

        // Recipe photos are persisted separately from recipe JSON. Wait for the
        // captured editor's restore, then validate again before reading current slots.
        if (activeRecipePhotoRestorePromise) {
            await activeRecipePhotoRestorePromise.catch(() => false);
        }
        contextStatus = await inspectRecipeSaveContext(saveContext);
        if (!contextStatus.current) {
            warnStaleRecipeSaveContext('before-photo-write');
            return;
        }

        const photoSavePolicy = shouldPersistRecipePhotos({
            expectedOwnerId: saveOwnerId,
            recipeId: objekResep?.id,
            editingRecipeId: saveContext.capturedEditingRecipeId,
            restoreOutcome: latestRecipePhotoRestoreOutcome,
            photoMutationEpochAtSave: saveContext.capturedPhotoMutationEpoch
        });
        if (!photoSavePolicy.allowed) {
            // [AI-GENERATED][ROBUSTNESS][V280] A failed photo restore must not turn into an empty-set write and erase persisted photos. Users can retry restore or explicitly replace/remove photos, which advances the mutation epoch.
            console.warn('[RecipePhotoPersistence] Foto lama dipertahankan karena slot foto belum berhasil dipulihkan.', photoSavePolicy.reason);
        } else if (saveOwnerId && objekResep?.id && RecipePhotoPersistenceService?.replaceRecipePhotos) {
            try {
                const slotFiles = RecipePhotoService.getSlotFiles?.() || [];
                await RecipePhotoPersistenceService.replaceRecipePhotos(saveOwnerId, objekResep.id, slotFiles);
            } catch (photoError) {
                // [AI-GENERATED][ROBUSTNESS][V138] Photo persistence is a device enhancement;
                // a private-mode/IndexedDB failure must not roll back valid recipe JSON.
                console.warn('[RecipePhotoPersistence] Foto tidak dapat dipersistenkan:', photoError);
            }
        }

        contextStatus = await inspectRecipeSaveContext(saveContext);
        if (!contextStatus.current) {
            warnStaleRecipeSaveContext('after-photo-write');
            return;
        }

        // Synchronize only for the owner captured at save start. The service repeats
        // auth/local namespace checks at its own cloud mutation boundary.
        const client = getAppSupabaseClient();
        if (navigator.onLine && client?.auth) {
            try {
                await RecipeStorageService.syncRecipeToSupabase(client, objekResep, saveOwnerId);
            } catch (syncError) {
                cloudSyncError = syncError;
                console.warn('[RecipeSave] Resep tersimpan lokal, tetapi sinkronisasi cloud gagal:', syncError);
            }
        }

        contextStatus = await inspectRecipeSaveContext(saveContext);
        if (!contextStatus.current) {
            warnStaleRecipeSaveContext('after-cloud-sync');
            return;
        }

        if (typeof NotifSystem?.tambah === 'function') {
            NotifSystem.tambah('resep', 'Resep Berhasil Disimpan', `Resep "${namaResep}" berhasil disimpan secara lokal.`, '💾');
        }
        if (cloudSyncError) {
            alert(`Resep "${namaResep}" berhasil disimpan di perangkat, tetapi sinkronisasi cloud belum berhasil. Sinkronisasi dapat dicoba kembali saat koneksi tersedia.`);
        } else {
            alert(`Sukses! Resep "${namaResep}" berhasil disimpan.`);
        }

        // Clear the editor only after the final owner/editor validation succeeded.
        markRecipeEditorContextChanged();
        currentEditingRecipeId = null;
        if (namaResepInput) namaResepInput.value = '';
        if (typeof updateBakeryStatistics === 'function') updateBakeryStatistics();
    } catch (err) {
        if (err?.code === 'RECIPE_SAVE_CONTEXT_CHANGED' || err?.code === 'RECIPE_OWNER_REQUIRED' || err?.code === 'RECIPE_OWNER_CHANGED') {
            console.warn('[RecipeSave] Penyimpanan dibatalkan oleh guard sesi/editor:', err);
            if (typeof window.showToast === 'function') {
                window.showToast(localCommitSucceeded
                    ? 'Sesi berubah setelah penyimpanan lokal. Tampilan tidak diperbarui; periksa daftar resep akun asal.'
                    : 'Penyimpanan dibatalkan karena sesi/editor berubah. Buka kembali resep lalu coba lagi.');
            } else {
                alert(localCommitSucceeded
                    ? 'Sesi berubah setelah penyimpanan lokal. Periksa daftar resep akun asal.'
                    : 'Penyimpanan dibatalkan karena sesi/editor berubah. Buka kembali resep lalu coba lagi.');
            }
            return;
        }
        console.error('Gagal menyimpan resep:', err);
        alert('Gagal menyimpan resep: ' + (err?.message || String(err)));
    } finally {
        isSaving = false;
    }
}


// ==========================================
// FUNGSI SINKRONISASI DATA OFFLINE KE SUPABASE
// ==========================================
async function syncLocalDataToSupabase() {
    // [AI-GENERATED][REFACTOR][V25] Cloud sync delegated to RecipeStorageService.
    try {
        const result = await RecipeStorageService.syncLocalToSupabase(getAppSupabaseClient());
        if (result.skipped) console.log('Tidak ada resep lokal untuk disinkronkan atau pengguna belum login.');
        else console.log(`✅ Sinkronisasi otomatis ke cloud selesai: ${result.synced} resep.`);
    } catch (error) {
        console.error('Gagal sinkronisasi resep ke Supabase:', error);
        // [AI-GENERATED][ROBUSTNESS][V87] Propagate cloud-sync failures so the
        // canonical AuthService lifecycle cannot mark a failed sync as handled.
        throw error;
    }
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
                <button type="button" data-action="tambahLangkahProduksi" style="background: #E67E22; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">+ Buat Langkah Pertama</button>
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

        // [AI-GENERATED][SECURITY][V215] Imported/synced recipe data is untrusted.
        // Only passive raster data URLs or HTTP(S)/blob image URLs may reach src.
        const safeStepPhoto = normalizeSafeRecipeImageSource(stepPhoto);
        const safeStepPhotoAttribute = escapeHtmlMarkup(safeStepPhoto);
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-item-card';
        stepDiv.style.cssText = "background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);";
        
        let actionButtons = '';
        if (index > 0) {
            actionButtons += `<button type="button" data-action="pindahLangkah" data-arg="${index}" data-direction="-1" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; width: 26px; height: 26px; border-radius: 6px; font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;" title="Geser ke Atas">▲</button>`;
        } else {
            actionButtons += `<div style="width: 26px; height: 26px; opacity: 0.2; pointer-events: none; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc; color: #475569;">▲</div>`;
        }

        if (index < activeRecipeSteps.length - 1) {
            actionButtons += `<button type="button" data-action="pindahLangkah" data-arg="${index}" data-direction="1" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; width: 26px; height: 26px; border-radius: 6px; font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;" title="Geser ke Bawah">▼</button>`;
        } else {
            actionButtons += `<div style="width: 26px; height: 26px; opacity: 0.2; pointer-events: none; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc; color: #475569;">▼</div>`;
        }

        // PERBAIKAN: Memasukkan UI Foto Tahapan agar selaras dengan HTML
        const photoUI = `
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px; background: #f8fafc; padding: 6px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <div data-action="previewRecipePhoto" style="width: 50px; height: 50px; border-radius: 6px; background: #ffffff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; cursor: pointer;">
                    ${safeStepPhoto ? `<img src="${safeStepPhotoAttribute}" style="width: 100%; height: 100%; max-width: min(90vw, 450px); max-height: 85vh; object-fit: contain; display: block; border-radius: 8px; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" data-action="previewRecipePhotoSrc" alt="Preview Foto">` : `<span style="font-size: 1.2rem; color: #94a3b8;">🖼️</span>`}
                </div>
                
                <div style="flex: 1;">
                    <input type="file" id="step-file-input-${index}" accept="image/*" style="display: none;" data-onchange="window.handleFotoLangkah(this, ${index})">
                    <button type="button" data-action="openStepFileInput" data-arg="${index}" style="background: #E67E22; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: bold; cursor: pointer;">
                        📷 Unggah Foto Tahapan
                    </button>
                    <span style="font-size: 0.65rem; color: #64748b; margin-left: 6px; display: inline-block;">
                        ${safeStepPhoto ? 'Foto terpasang' : (stepPhoto ? 'Format foto tidak didukung' : 'Belum ada foto')}
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
                    <button type="button" data-action="hapusLangkahProduksi" data-arg="${index}" style="background: #fee2e2; color: #ef4444; border: none; width: 26px; height: 26px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-left: 4px;" title="Hapus Langkah">×</button>
                </div>
            </div>
            
            <textarea id="step-instruction-${index}" name="step_instruction_${index}" class="input-step-text" data-index="${index}" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.8rem; font-family: inherit; resize: none; overflow: hidden; min-height: 65px; color: #4E342E; background: #ffffff; outline: none; line-height: 1.5; transition: border-color 0.2s ease, box-shadow 0.2s ease;" placeholder="Tulis instruksi detail langkah ini..." data-oninput="if(typeof window.updateStepDesc === 'function') window.updateStepDesc(${index}, this.value)">${safeText}</textarea>
            
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

// [AI-GENERATED][REFACTOR] Canonical tambahLangkahProduksi implementation is defined below.

// =======================================================================
// 1. FUNGSI UNGGAH FOTO & PREVIEW (VERSI PRODUCTION-READY)
// =======================================================================

function handleFotoLangkah(inputElement, index) {
    // [AI-GENERATED][BUG FIX][V303] Validate the dynamic input and keep the
    // handler reachable from the existing data-onchange module delegation.
    const stepIndex = Number(index);
    const file = inputElement?.files?.[0];
    if (!inputElement || !Number.isInteger(stepIndex) || stepIndex < 0 || !file) return;

    // Allow common browser image formats only; accept="image/*" is not validation.
    if (!String(file.type || '').startsWith('image/')) {
        alert('File yang dipilih bukan gambar. Silakan pilih foto.');
        inputElement.value = '';
        return;
    }

    // Validasi ukuran maksimal 2MB.
    if (file.size > 2 * 1024 * 1024) {
        alert("Gagal: Ukuran file foto terlalu besar. Maksimal 2MB.");
        inputElement.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onerror = function() {
        alert('Foto gagal dibaca. Silakan coba pilih foto lain.');
        inputElement.value = '';
    };
    reader.onload = function(e) {
            // [AI-GENERATED][SECURITY][V215] File picker accept filters are only a UI
            // hint; validate the actual FileReader MIME before persisting the image.
            const photoDataUrl = normalizeSafeRecipeImageSource(
                typeof e.target?.result === 'string' ? e.target.result : ''
            );
            if (!photoDataUrl) {
                alert('Format foto tidak didukung. Gunakan PNG, JPEG, GIF, WebP, AVIF, atau BMP.');
                inputElement.value = '';
                return;
            }
            
            // Simpan ke array dengan menjaga struktur Object
            if (typeof activeRecipeSteps[index] === 'object' && activeRecipeSteps[index] !== null) {
                activeRecipeSteps[stepIndex].photo = photoDataUrl;
            } else {
                const oldText = activeRecipeSteps[stepIndex] || "";
                activeRecipeSteps[stepIndex] = { desc: oldText, photo: photoDataUrl };
            }
            
            // [AI-GENERATED][BUG FIX][V303] Re-render immediately so the thumbnail
            // and status label update together after upload.
            if (typeof window.renderLangkahProduksi === 'function') {
                window.renderLangkahProduksi();
            }
            inputElement.value = '';
        };
    reader.readAsDataURL(file);
}

// [AI-GENERATED][COMPATIBILITY][V303] The dynamic input uses the existing
// data-onchange="window.handleFotoLangkah(...)" contract; expose its module API.
window.handleFotoLangkah = handleFotoLangkah;

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

    // [AI-GENERATED][REFACTOR] Preserve the useful focus behavior from the removed duplicate.
    window.setTimeout(() => {
        const textareas = document.querySelectorAll('.input-step-text');
        textareas[textareas.length - 1]?.focus();
    }, 50);

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
            const safeSource = normalizeSafeRecipeImageSource(
                typeof e.target?.result === 'string' ? e.target.result : ''
            );
            if (!previewBox || !safeSource) {
                alert('Format foto tidak didukung. Gunakan PNG, JPEG, GIF, WebP, AVIF, atau BMP.');
                input.value = '';
                return;
            }
            const image = document.createElement('img');
            image.src = safeSource;
            image.alt = 'Preview foto langkah';
            image.style.cssText = 'width:100%; height:100%; object-fit:contain;';
            previewBox.replaceChildren(image);
            const fileName = document.getElementById(`step-filename-${stepId}`);
            if (fileName) fileName.textContent = input.files[0].name;
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
    // [AI-GENERATED][REFACTOR][V38] Use explicit plugin instances from the
    // canonical bridge; ESM exports are not guaranteed to create globals.
    const filesystem = NativeCapacitorService.getPlugin('Filesystem');
    const share = NativeCapacitorService.getPlugin('Share');

    if (NativeCapacitorService.isNativePlatform() && filesystem?.writeFile && share?.share) {
      const result = await filesystem.writeFile({
        path: namaFile,
        data: base64Data,
        directory: NativeCapacitorService.DocumentsDirectory,
        recursive: true
      });
      await share.share({
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

// [AI-GENERATED][REFACTOR][V25] Canonical recipe read delegated to RecipeStorageService.
async function bacaSemuaResepDariPerangkat() {
    return RecipeStorageService.read();
}


// [AI-GENERATED][REFACTOR][V25] Canonical recipe write delegated to RecipeStorageService.
async function simpanDaftarResepKePerangkat(daftarResep) {
    return RecipeStorageService.saveList(daftarResep, { maxItems: window.MAX_RESEP_TERSIMPAN || 10 });
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
    // [AI-GENERATED][REFACTOR][V215] Preserve the legacy browser-global contract
    // while delegating escaping to one canonical utility implementation.
    if (!str) return '';
    return escapeHtmlMarkup(str);
}

// [AI-GENERATED][REFACTOR][V34] Recipe construction is delegated to the pure domain service.
function bangunObjekResepDariForm(namaResep) {
    return RecipeDomainService.build({
        name: namaResep,
        flourWeight: document.getElementById('base-flour')?.value || '1000',
        targetYield: document.getElementById('recipe-yield')?.value || '1',
        salePrice: document.getElementById('input-harga-jual')?.value || '0',
        ingredients: Array.isArray(bakeryIngredients) ? bakeryIngredients : [],
        productionSteps: Array.isArray(activeRecipeSteps) ? activeRecipeSteps : [],
        editingId: currentEditingRecipeId
    });
}

async function restoreRecipePhotosForRecipe(resep) {
    const epoch = ++recipePhotoRestoreEpoch;
    RecipePhotoService.clear?.();
    const mutationEpoch = getRecipePhotoMutationEpoch(); // [AI-GENERATED][ES6 MODULE][V285]
    const outcome = {
        epoch,
        recipeId: resep?.id == null ? null : String(resep.id),
        ownerId: null,
        mutationEpochAtStart: mutationEpoch,
        status: 'pending'
    };
    latestRecipePhotoRestoreOutcome = outcome;

    if (!resep?.id || !RecipePhotoService?.restoreFiles || !RecipePhotoPersistenceService?.loadRecipePhotos) {
        outcome.status = 'failed';
        return false;
    }

    const task = (async () => {
        try {
            const owner = await AuthService.getUser?.();
            const ownerId = owner?.id || null;
            if (!ownerId) {
                if (latestRecipePhotoRestoreOutcome === outcome) outcome.status = 'failed';
                return false;
            }
            outcome.ownerId = String(ownerId);
            const slotFiles = await RecipePhotoPersistenceService.loadRecipePhotos(ownerId, resep.id);
            // [AI-GENERATED][ROBUSTNESS][V277] Revalidate the authenticated owner
            // after IndexedDB resolves. A late restore from account A must not
            // render A's photos after logout/login has switched to account B.
            const activeOwner = await AuthService.getUser?.();
            if (!isRecipePhotoRestoreCurrent({
                capturedOwnerId: ownerId,
                activeOwnerId: activeOwner?.id,
                capturedRestoreEpoch: epoch,
                activeRestoreEpoch: recipePhotoRestoreEpoch,
                capturedMutationEpoch: mutationEpoch,
                activeMutationEpoch: getRecipePhotoMutationEpoch() // [AI-GENERATED][ES6 MODULE][V285]
            })) {
                if (latestRecipePhotoRestoreOutcome === outcome) outcome.status = 'stale';
                return false;
            }
            RecipePhotoService.restoreFiles(slotFiles);
            outcome.status = 'restored';
            return true;
        } catch (error) {
            if (epoch === recipePhotoRestoreEpoch) {
                outcome.status = 'failed';
                console.warn('[RecipePhotoPersistence] Gagal memulihkan foto resep:', error);
            }
            return false;
        }
    })();

    activeRecipePhotoRestorePromise = task;
    try {
        return await task;
    } finally {
        if (activeRecipePhotoRestorePromise === task) activeRecipePhotoRestorePromise = null;
    }
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



// [AI-GENERATED][REFACTOR][V34] Removed obsolete native-file recipe writer.
// RecipeStorageService is now the single persistence owner for saved recipes.

// [AI-GENERATED][REFACTOR][V24] Removed unreachable legacy recipe loader.
// It referenced a retired legacy storage/render path that is no longer part of
// the active ES6 runtime graph. The canonical recipe flow below
// uses bacaSemuaResepDariPerangkat() + StorageService.

// Fungsi untuk menyinkronkan resep dari Cloud Supabase ke lokal
// [AI-GENERATED][REFACTOR][V25] Cloud bootstrap sync delegated to RecipeStorageService.
async function sinkronisasiAwalDariSupabase() {
    try {
        const result = await RecipeStorageService.syncFromSupabase(getAppSupabaseClient());
        if (result.changed) {
            window.recipes = result.recipes;
            console.log('✅ Data lokal berhasil disinkronkan dengan Supabase.');
        }
    } catch (err) {
        console.error('Gagal menarik data awal Supabase:', err);
        // [AI-GENERATED][ROBUSTNESS][V87] Propagate bootstrap-sync failures to
        // AuthService so transient cloud errors remain retryable.
        throw err;
    }
}


// [AI-GENERATED][REFACTOR][V25] Recipe delete delegated to RecipeStorageService.
async function hapusResepBerdasarkanId(id) {
    try {
        const result = await RecipeStorageService.deleteEverywhere(getAppSupabaseClient(), id);
        // [AI-GENERATED][ROBUSTNESS][V144] Use the owner captured by the canonical
        // delete operation. Never re-read the current auth user after an async
        // delete, because A->logout->B could otherwise make photo cleanup use B's
        // namespace for a recipe that belonged to A.
        const photoOwnerId = result?.ownerId || null;
        if (!result?.aborted && photoOwnerId && RecipePhotoPersistenceService?.deleteRecipePhotos) {
            try {
                await RecipePhotoPersistenceService.deleteRecipePhotos(photoOwnerId, id);
            } catch (photoError) {
                console.warn('[RecipePhotoPersistence] Gagal membersihkan foto resep terhapus:', photoError);
            }
        }
        return result;
    } catch (err) {
        // [AI-GENERATED][ROBUSTNESS][V145] If cloud deletion failed but the
        // owner-scoped tombstone is durable, the destructive intent is safe
        // to finalize locally. Never re-read AuthService here because the
        // account may have changed while the delete was in flight.
        if (err?.pendingDeletePersisted && err?.ownerId && RecipePhotoPersistenceService?.deleteRecipePhotos) {
            try {
                await RecipePhotoPersistenceService.deleteRecipePhotos(err.ownerId, id);
            } catch (photoError) {
                console.warn('[RecipePhotoPersistence] Gagal membersihkan foto setelah tombstone durable:', photoError);
            }
        }
        console.error('Gagal menghapus resep:', err);
        alert('Gagal menghapus resep: ' + err.message);
    }
}


function tutupDaftarResepTersimpan() {
    const modal = document.getElementById('recipe-list-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('inert', '');
    }
    // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
    syncModalBodyScrollLock();
}

// [AI-GENERATED][COMPATIBILITY] Single global bridge for the canonical recipe-list close action.
window.tutupDaftarResepTersimpan = tutupDaftarResepTersimpan;

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

        // [AI-GENERATED][ROBUSTNESS][V91] RecipeStorageService is the single
        // destructive persistence owner. Do not delete the same local record
        // here and then delete it again inside the service.
        // [AI-GENERATED][ROBUSTNESS][V90] Route destructive cloud deletion
        // through the canonical RecipeStorageService owner. The previous
        // app-core path performed a direct DELETE without the authenticated
        // owner revalidation introduced by V89.
        // [AI-GENERATED][ROBUSTNESS][V92] Always use the canonical delete
        // boundary, including offline mode. The service owns local deletion
        // and conditionally performs the cloud mutation when connectivity and
        // authentication permit it. The previous online-only guard caused an
        // offline delete request to do nothing at all.
        const result = await RecipeStorageService.deleteEverywhere(getAppSupabaseClient(), resepId);
        // [AI-GENERATED][ROBUSTNESS][V144] Photo cleanup must use the same owner
        // captured by the canonical delete operation; never use a later auth read.
        const photoOwnerId = result?.ownerId || null;
        if (!result?.aborted && photoOwnerId && RecipePhotoPersistenceService?.deleteRecipePhotos) {
            try {
                await RecipePhotoPersistenceService.deleteRecipePhotos(photoOwnerId, resepId);
            } catch (photoError) {
                console.warn('[RecipePhotoPersistence] Gagal membersihkan foto resep terhapus:', photoError);
            }
        }
        if (result?.aborted) {
            console.warn("Penghapusan cloud dibatalkan karena sesi akun berubah.");
        } else if (result?.cloudDeleted) {
            console.log("Berhasil dihapus dari Cloud Supabase.");
        } else {
            console.log("Resep dihapus dari perangkat; penghapusan cloud ditunda karena offline atau belum login.");
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
        // [AI-GENERATED][ROBUSTNESS][V145] A durable owner-scoped tombstone
        // means the cloud delete will be retried safely; cleanup may therefore
        // proceed without risking a later resurrection of the recipe's photos.
        if (err?.pendingDeletePersisted && err?.ownerId && RecipePhotoPersistenceService?.deleteRecipePhotos) {
            try {
                await RecipePhotoPersistenceService.deleteRecipePhotos(err.ownerId, resepId);
            } catch (photoError) {
                console.warn('[RecipePhotoPersistence] Gagal membersihkan foto setelah tombstone durable:', photoError);
            }
        }
        console.error("Gagal mengeksekusi penghapusan resep:", err);
        alert("Terjadi kesalahan sistem saat menghapus resep.");
    }
};

// Fungsi Penutup Aman (Diletakkan DI LUAR document.addEventListener('DOMContentLoaded'))
function tutupHalamanResepSecaraAman() {
    window.DEBUG && console.log("Menutup atau kembali dari halaman resep secara aman.");

    const resepPage = document.getElementById('recipe');
    const masterView = document.getElementById('recipe-master-view');
    const detailView = document.getElementById('recipe-detail-view');
    const detailIsVisible = Boolean(
        detailView && detailView.style.display !== 'none' &&
        window.getComputedStyle(detailView).display !== 'none'
    );

    // Tombol close di editor kembali ke daftar resep terlebih dahulu.
    // Modal #recipe hanya ditutup ketika pengguna sudah berada di master view.
    if (detailIsVisible) {
        if (currentEditingRecipeId && !confirm("Keluar dari editor? Perubahan yang belum disimpan mungkin akan hilang.")) {
            return;
        }
        bukaMasterViewResep();
        if (masterView) masterView.style.display = 'flex';
        if (detailView) detailView.style.display = 'none';
        return;
    }

    if (resepPage) {
        resepPage.style.display = 'none';
        resepPage.classList.remove('active');
        syncModalBodyScrollLock();
        document.body.style.pointerEvents = 'auto';
    } else {
        console.warn("Elemen #recipe tidak ditemukan di dalam DOM.");
    }
}

// [AI-GENERATED][REFACTOR] Synchronous UI/legacy read stays browser-safe; async/native reads use StorageService.
// [AI-GENERATED][REFACTOR][V25] Synchronous recipe read delegated to RecipeStorageService.
function readRecipesFromStorage() {
    return RecipeStorageService.readSync();
}


async function tanganiPerubahanResepRealtime(payload) {
    try {
        const dataServer = payload?.new || payload?.old;
        if (!dataServer || !payload) return;

        const tipeAksi = payload.eventType; // INSERT, UPDATE, atau DELETE
        const eventOwnerId = dataServer?.user_id ?? payload.old?.user_id ?? payload.new?.user_id ?? null;
        // [AI-GENERATED][SECURITY][V278] Capture the active local namespace before
        // the first async auth read. Auth and recipe-owner transitions are separate
        // state machines, so both must be bound to the realtime event owner.
        const expectedLocalOwnerId = RecipeStorageService.getActiveOwnerId?.() ?? null;
        const activeOwner = await AuthService.getUser?.();
        const localOwnerAfterAuth = RecipeStorageService.getActiveOwnerId?.() ?? null;

        if (!isRecipeRealtimeOwnerConsistent({
            eventOwnerId,
            authenticatedOwnerId: activeOwner?.id,
            localOwnerId: localOwnerAfterAuth,
            expectedLocalOwnerId
        })) {
            window.DEBUG && console.warn('[RecipeRealtime] Pemilik event, autentikasi, dan namespace lokal tidak konsisten; perubahan diabaikan.');
            return;
        }

        // A local read may await storage, so verify both owner state machines again
        // before applying server changes or starting owner-scoped photo cleanup.
        let resepLokal = await bacaSemuaResepDariPerangkat() || [];
        const ownerAfterRead = await AuthService.getUser?.();
        const localOwnerAfterRead = RecipeStorageService.getActiveOwnerId?.() ?? null;
        if (!isRecipeRealtimeOwnerConsistent({
            eventOwnerId,
            authenticatedOwnerId: ownerAfterRead?.id,
            localOwnerId: localOwnerAfterRead,
            expectedLocalOwnerId
        })) {
            window.DEBUG && console.warn('[RecipeRealtime] Sesi berubah selama pembacaan lokal; perubahan diabaikan.');
            return;
        }

        if (tipeAksi === 'INSERT' || tipeAksi === 'UPDATE') {
            const index = resepLokal.findIndex(r => r.id === dataServer.id);
            const resepUtuh = dataServer.details || dataServer;
            if (index >= 0) resepLokal[index] = resepUtuh;
            else resepLokal.push(resepUtuh);
        } else if (tipeAksi === 'DELETE') {
            const dataLama = payload.old || dataServer;
            resepLokal = resepLokal.filter(r => r.id !== dataLama.id);

            // Cleanup stays explicitly scoped to the immutable event owner.
            if (dataLama?.id && RecipePhotoPersistenceService?.deleteRecipePhotos) {
                try {
                    await RecipePhotoPersistenceService.deleteRecipePhotos(eventOwnerId, dataLama.id);
                } catch (photoError) {
                    console.warn('[RecipePhotoPersistence] Gagal membersihkan foto realtime:', photoError);
                }
            }
        } else {
            return;
        }

        // [AI-GENERATED][ROBUSTNESS][V278] Revalidate at the local commit boundary.
        // A stale event must never be written into the namespace active after an
        // auth or local-owner transition.
        const ownerBeforeCommit = await AuthService.getUser?.();
        const localOwnerBeforeCommit = RecipeStorageService.getActiveOwnerId?.() ?? null;
        if (!isRecipeRealtimeOwnerConsistent({
            eventOwnerId,
            authenticatedOwnerId: ownerBeforeCommit?.id,
            localOwnerId: localOwnerBeforeCommit,
            expectedLocalOwnerId
        })) {
            window.DEBUG && console.warn('[RecipeRealtime] Sesi/namespace berubah sebelum commit; perubahan diabaikan.');
            return;
        }

        await simpanDaftarResepKePerangkat(resepLokal);

        // The write is owner-scoped, but UI state is global. Revalidate after the
        // awaited persistence operation before publishing this list into the UI.
        const ownerAfterCommit = await AuthService.getUser?.();
        const localOwnerAfterCommit = RecipeStorageService.getActiveOwnerId?.() ?? null;
        if (!isRecipeRealtimeOwnerConsistent({
            eventOwnerId,
            authenticatedOwnerId: ownerAfterCommit?.id,
            localOwnerId: localOwnerAfterCommit,
            expectedLocalOwnerId
        })) {
            window.DEBUG && console.warn('[RecipeRealtime] Sesi/namespace berubah setelah commit; pembaruan UI dibatalkan.');
            return;
        }

        // UI globals are updated only when the event still belongs to the active owner.
        window.recipes = resepLokal;

        const modalDaftarResep = document.getElementById('recipe-list-modal');
        if (modalDaftarResep && modalDaftarResep.classList.contains('active')) {
            if (typeof window.tampilkanDaftarResepTersimpan === 'function') {
                await window.tampilkanDaftarResepTersimpan();
            }
        }

        // [AI-GENERATED][ROBUSTNESS][V278] Avoid displaying a stale-account toast
        // if the user switches accounts while the optional list renderer awaits.
        const ownerBeforeNotification = await AuthService.getUser?.();
        if (isRecipeRealtimeOwnerConsistent({
            eventOwnerId,
            authenticatedOwnerId: ownerBeforeNotification?.id,
            localOwnerId: RecipeStorageService.getActiveOwnerId?.() ?? null,
            expectedLocalOwnerId
        })) {
            NotifSystem.tambah('sistem', 'Resep Tersinkronisasi', 'Data resep baru saja diperbarui dari server.', '🔄');
        }
    } catch (err) {
        console.error('Gagal menangani perubahan realtime:', err);
    }
}

// ==========================================
// 4. FUNGSI PIP (Picture-in-Picture) UNTUK TIMER
// ==========================================
// [AI-GENERATED][PWA VIDEO PIP][V326] Chrome Android does not implement the
// Document Picture-in-Picture API. A canvas-backed muted video provides the
// standards-based HTMLVideoElement PiP path on browsers that support it.
let webVideoPipState = null;

function canUseVideoPictureInPicture() {
    // Capacitor Android must use the Activity's system PiP only. Never create
    // a second WebView video-PiP surface inside the native Activity.
    if (NativeCapacitorService.isNativePlatform()) return false;
    return typeof HTMLVideoElement !== 'undefined'
        && typeof HTMLVideoElement.prototype.requestPictureInPicture === 'function'
        && document.pictureInPictureEnabled === true;
}

function drawWebVideoPipFrame(context, canvas) {
    const width = canvas.width;
    const height = canvas.height;
    const countdown = document.getElementById('countdown')?.textContent?.trim() || '00:00';
    const status = document.getElementById('ai-tips')?.textContent?.trim()
        || (isTimerRunning ? 'Proofing sedang berjalan' : 'Timer Proofer');
    const mainCountdown = document.getElementById('countdown');
    const timerColor = mainCountdown ? getComputedStyle(mainCountdown).color : '#4E342E';
    const isRunning = Boolean(isTimerRunning);

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#FDF5E6';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#E67E22';
    context.font = '700 28px Segoe UI, sans-serif';
    context.textAlign = 'center';
    context.fillText('TIMER PROOFER', width / 2, 55);

    context.fillStyle = timerColor;
    context.font = '700 106px ui-monospace, SFMono-Regular, Consolas, monospace';
    context.fillText(countdown, width / 2, 190);

    context.fillStyle = '#6D4C41';
    context.font = '600 25px Segoe UI, sans-serif';
    context.fillText(isRunning ? 'PROOFING BERJALAN' : 'TIMER DIJEDA', width / 2, 242);

    context.fillStyle = 'rgba(78,52,46,.18)';
    context.fillRect(55, 282, width - 110, 12);
    const initial = Math.max(1, Number(globalInitialSeconds) || 1);
    const remaining = Math.max(0, Number(globalTotalSeconds) || 0);
    const ratio = Math.max(0, Math.min(1, remaining / initial));
    context.fillStyle = '#E67E22';
    context.fillRect(55, 282, (width - 110) * ratio, 12);

    context.fillStyle = '#6D4C41';
    context.font = '18px Segoe UI, sans-serif';
    const statusText = status.replace(/\s+/g, ' ').slice(0, 62);
    context.fillText(statusText || 'Memantau proofing adonan', width / 2, 335);
}

function updatePipTriggerButton(isActive, mode = 'mini') {
    const button = document.getElementById('pip-trigger-btn');
    if (!button) return;
    button.textContent = isActive ? (mode === 'video' ? '❌ Tutup PIP' : '❌ Tutup Mini') : '📺 PIP Mode';
    button.style.background = isActive ? '#c0392b' : 'var(--accent)';
}

async function enterWebVideoPictureInPicture() {
    if (!canUseVideoPictureInPicture()) return false;
    if (document.pictureInPictureElement) return document.pictureInPictureElement === webVideoPipState?.video;

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext('2d');
    if (!context || typeof canvas.captureStream !== 'function') return false;

    drawWebVideoPipFrame(context, canvas);
    const stream = canvas.captureStream(2);
    const video = document.createElement('video');
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.disablePictureInPicture = false;
    video.setAttribute('aria-hidden', 'true');
    video.tabIndex = -1;
    Object.assign(video.style, {
        position: 'fixed', left: '0', bottom: '0', width: '2px', height: '2px',
        opacity: '0.01', pointerEvents: 'none', zIndex: '-1'
    });
    video.srcObject = stream;
    document.body.appendChild(video);

    let frameTimer = null;
    const cleanup = () => {
        if (frameTimer !== null) clearInterval(frameTimer);
        frameTimer = null;
        try { video.pause(); } catch (_) {}
        try { stream.getTracks().forEach((track) => track.stop()); } catch (_) {}
        video.srcObject = null;
        video.remove();
        if (webVideoPipState?.video === video) webVideoPipState = null;
        document.body?.classList.remove('web-video-pip-active');
        updatePipTriggerButton(false);
    };

    try {
        await video.play();
        // Request directly after play while the button's transient user activation
        // is still available. The same call is attempted on PWA Back and falls
        // back to the in-app mini widget if the browser rejects the activation.
        const pipWindow = await video.requestPictureInPicture();
        webVideoPipState = { video, stream, canvas, cleanup, pipWindow };
        document.body.classList.add('web-video-pip-active');
        updatePipTriggerButton(true, 'video');
        frameTimer = setInterval(() => drawWebVideoPipFrame(context, canvas), 500);
        webVideoPipState.frameTimer = frameTimer;
        video.addEventListener('leavepictureinpicture', cleanup, { once: true });
        return true;
    } catch (error) {
        console.warn('[Proofing][PiP] Video PiP browser tidak tersedia pada konteks ini:', error);
        cleanup();
        return false;
    }
}

function activateInAppMiniTimer() {
    const container = document.getElementById('app-container');
    const pipButton = document.getElementById('pip-trigger-btn');
    if (!container) return false;

    const enabled = !container.classList.contains('mini-mode');
    container.classList.toggle('mini-mode', enabled);
    if (pipButton) updatePipTriggerButton(enabled, 'mini');
    if (enabled && typeof NotifSystem !== 'undefined') {
        NotifSystem.tambah('sistem', 'Mode Mini Aktif', 'Timer tetap terlihat dalam widget mini di halaman aplikasi.', '📱');
    }
    return true;
}

async function aktifkanModePIP(options = {}) {
    const fromBack = options?.fromBack === true;

    // [AI-GENERATED][NATIVE PIP SINGLE SURFACE][V328]
    // Capacitor Android owns exactly one PiP surface: the MainActivity itself.
    // Do not let the browser video/document PiP paths create a second window.
    if (NativeCapacitorService.isNativePlatform()) {
        if (document.pictureInPictureElement && typeof document.exitPictureInPicture === 'function') {
            try { await document.exitPictureInPicture(); } catch (error) {
                console.warn('[Proofing][PiP] Gagal membersihkan video-PiP web sebelum native PiP:', error);
            }
        }
        if (webVideoPipState?.cleanup) {
            try { webVideoPipState.cleanup(); } catch (_) {}
        }
        if (pipWindowInstance) {
            try { pipWindowInstance.close(); } catch (_) {}
            pipWindowInstance = null;
            if (pipIntervalInstance !== null) clearInterval(pipIntervalInstance);
            pipIntervalInstance = null;
        }

        const nativePipPlugin = NativeCapacitorService.getPlugin('TimerPip');
        if (typeof nativePipPlugin?.enterPictureInPicture !== 'function') return false;
        document.body?.classList.add('native-pip');
        try {
            const result = await nativePipPlugin.enterPictureInPicture();
            if (result?.entered === true) return true;
        } catch (error) {
            console.warn('[Proofing][PiP] Gagal mengaktifkan PiP native:', error);
        }
        document.body?.classList.remove('native-pip');
        return false;
    }

    // If the user taps the PiP control while the in-app fallback is already
    // compacted, treat the action as a close toggle before opening another mode.
    const appContainer = document.getElementById('app-container');
    if (!fromBack && !NativeCapacitorService.isNativePlatform()
        && appContainer?.classList.contains('mini-mode')) {
        return activateInAppMiniTimer();
    }

    // An explicit toolbar/button tap toggles an already-open browser PiP window
    // closed. A Back action never closes an existing PiP window.
    if (!fromBack && webVideoPipState?.video && document.pictureInPictureElement === webVideoPipState.video
        && typeof document.exitPictureInPicture === 'function') {
        try {
            await document.exitPictureInPicture();
            return true;
        } catch (error) {
            console.warn('[Proofing][PiP] Gagal menutup video PiP:', error);
        }
    }
    if (document.pictureInPictureElement && fromBack) return true;

    // Desktop Chromium may open an arbitrary HTML Document PiP window.
    if ('documentPictureInPicture' in window) {
        if (pipWindowInstance) {
            if (fromBack) {
                pipWindowInstance.focus();
                return true;
            }
            try { pipWindowInstance.close(); } catch (_) {}
            pipWindowInstance = null;
            if (pipIntervalInstance !== null) clearInterval(pipIntervalInstance);
            pipIntervalInstance = null;
            updatePipTriggerButton(false);
            return true;
        }
        try {
            pipWindowInstance = await window.documentPictureInPicture.requestWindow({ width: 280, height: 180 });
            [...document.styleSheets].forEach((styleSheet) => {
                try {
                    const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                    const style = document.createElement('style');
                    style.textContent = cssRules;
                    pipWindowInstance.document.head.appendChild(style);
                } catch (_) {
                    if (!styleSheet.href) return;
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = styleSheet.href;
                    pipWindowInstance.document.head.appendChild(link);
                }
            });
            pipWindowInstance.document.body.innerHTML = `
                <div style="padding:12px;text-align:center;background:#FDF5E6;height:100vh;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:center;user-select:none;">
                    <div style="font-size:10px;font-weight:bold;color:#E67E22;margin-bottom:2px;letter-spacing:.5px;">PROOFER TIMER</div>
                    <div id="pip-countdown" style="font-size:32px;font-weight:bold;color:#4E342E;font-family:monospace;line-height:1.1;">00:00</div>
                    <div id="pip-status" style="font-size:9px;margin-top:4px;color:#5d4037;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px;">Memantau ragi adonan...</div>
                </div>`;
            const pipCountdown = pipWindowInstance.document.getElementById('pip-countdown');
            const pipStatus = pipWindowInstance.document.getElementById('pip-status');
            const update = () => {
                if (!pipCountdown || !pipStatus) return;
                pipCountdown.textContent = document.getElementById('countdown')?.textContent || '00:00';
                pipStatus.textContent = isTimerRunning ? 'PROOFING BERJALAN' : 'TIMER DIJEDA';
            };
            update();
            pipIntervalInstance = setInterval(update, 500);
            updatePipTriggerButton(true, 'video');
            pipWindowInstance.addEventListener('pagehide', () => {
                clearInterval(pipIntervalInstance);
                pipWindowInstance = null;
                pipIntervalInstance = null;
                updatePipTriggerButton(false);
            }, { once: true });
            return true;
        } catch (error) {
            console.warn('[Proofing][PiP] Document PiP gagal:', error);
        }
    }

    // Chrome Android supports video PiP, not Document PiP. The canvas stream
    // mirrors the countdown as a native floating video window.
    if (canUseVideoPictureInPicture()) {
        const entered = await enterWebVideoPictureInPicture();
        if (entered) return true;
    }

    // Browser/PWA fallback when system PiP is unavailable or denied. This is an
    // in-app compact widget, not an OS-level always-on-top window.
    if (fromBack) {
        const container = document.getElementById('app-container');
        if (container && !container.classList.contains('mini-mode')) {
            container.classList.add('mini-mode');
            const pipButton = document.getElementById('pip-trigger-btn');
            if (pipButton) {
                pipButton.textContent = '❌ Tutup Mini';
                pipButton.style.background = '#c0392b';
            }
        }
        return Boolean(container);
    }
    return activateInAppMiniTimer();
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

    // [AI-GENERATED][REFACTOR] Pure calculation is delegated to the canonical Recipe/HPP service.
    let dataArray = null;
    if (typeof bumbuResepList !== 'undefined') dataArray = bumbuResepList;
    else if (Array.isArray(window.bumbuResepList)) dataArray = window.bumbuResepList;
    else if (Array.isArray(bakeryIngredients)) dataArray = bakeryIngredients;
    else if (Array.isArray(window.bakeryIngredients)) dataArray = window.bakeryIngredients;
    if (!Array.isArray(dataArray)) return;

    const result = calculateRecipeHPP(dataArray, {
        baseFlourWeight,
        totalYield,
        salePrice: hargaJualPerPcs
    });

    result.items.forEach(({ ingredient, grossWeight, cost }) => {
        const idBahan = ingredient.id !== undefined ? ingredient.id : dataArray.indexOf(ingredient);
        const formatBerat = grossWeight % 1 !== 0 ? Number(grossWeight.toFixed(1)) : grossWeight;
        const costText = Math.round(cost).toLocaleString('id-ID');

        const grossEl = document.getElementById(`gross-${idBahan}`);
        if (grossEl) grossEl.innerText = formatBerat;
        const costEl = document.getElementById(`cost-${idBahan}`);
        if (costEl) costEl.innerText = costText;
        const grossTabEl = document.getElementById(`gross-table-${idBahan}`);
        if (grossTabEl) grossTabEl.innerText = formatBerat;
        const costTabEl = document.getElementById(`cost-table-${idBahan}`);
        if (costTabEl) costTabEl.innerText = costText;

        const cardTarget = document.querySelector(`[data-id="${dataArray.indexOf(ingredient)}"]`);
        if (cardTarget) {
            const txtBeratLokal = cardTarget.querySelector('.berat-pakai-text, .text-berat-pakai');
            if (txtBeratLokal) txtBeratLokal.innerText = `${formatBerat} gr`;
            const txtBiayaLokal = cardTarget.querySelector('.biaya-text, .text-biaya');
            if (txtBiayaLokal) txtBiayaLokal.innerText = `Rp ${costText}`;
        }
    });

    const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
    };

    setTxt('sum-net-dough', result.netDoughWeight.toFixed(0));
    setTxt('sum-net-topping', result.netToppingWeight.toFixed(0));
    setTxt('sum-weight-pcs', result.weightPerPiece.toFixed(1));
    setTxt('total-modal', `Rp ${Math.round(result.totalProductionCost).toLocaleString('id-ID')}`);
    setTxt('sum-hpp-gabungan', `Rp ${Math.round(result.hppPerPiece).toLocaleString('id-ID')}`);
    setTxt('profit-bersih', `Rp ${Math.round(result.totalNetProfit).toLocaleString('id-ID')}`);

    const marginEl = document.getElementById('sum-profit-margin');
    if (marginEl) {
        marginEl.innerText = result.profitMarginPercentage.toFixed(1) + '%';
        marginEl.style.color = result.foodCostPercentage > 40 ? '#e67e22' : '#27ae60';
    }

    const fcEl = document.getElementById('food-cost-percent');
    if (fcEl) {
        fcEl.innerText = result.foodCostPercentage.toFixed(1) + '%';
        const badge = document.getElementById('fc-badge');
        if (badge) {
            if (result.foodCostPercentage > 45) {
                badge.innerText = '🚨 BOROS / OVERBUDGET (Food Cost > 45%)';
                badge.style.background = '#e74c3c';
            } else if (result.foodCostPercentage > 30) {
                badge.innerText = '⚠️ STANDAR REKOMENDASI INDUSTRIAL';
                badge.style.background = '#f39c12';
            } else if (result.foodCostPercentage === 0) {
                badge.innerText = '📌 MENUNGGU HARGA JUAL DIINPUT';
                badge.style.background = '#7f8c8d';
            } else {
                badge.innerText = '✅ IDEAL & SANGAT SEHAT (Kelebihan Untung)';
                badge.style.background = '#27ae60';
            }
        }
    }

    if (typeof window.jalankanAnalisisAIAgent === 'function') {
        window.jalankanAnalisisAIAgent(result.hppPerPiece, hargaJualPerPcs, result.weightPerPiece);
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
    // [AI-GENERATED][REFACTOR][V35] Legacy alias now delegates to canonical form flow.
    return window.tambahBahanBakeryDinamis?.(true);
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
                <div  data-action="toggleCollapseKategori" data-arg="${kat.nama.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" style="background: #e2e8f0; cursor: pointer; user-select: none; padding: 6px 10px; border-radius: 6px; font-weight: 700; font-size: 0.72rem; color: ${kat.warnaTeks}; display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
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

                    // [AI-GENERATED][SECURITY][V218] Persisted/imported ingredient values
                    // are untrusted. Escape HTML values and encode IDs as JS string literals.
                    const ingredientId = String(ing.id ?? '');
                    const ingredientIdHtml = escapeHtmlMarkup(ingredientId);
                    const ingredientIdJs = escapeHtmlMarkup(JSON.stringify(ingredientId));
                    const ingredientNameHtml = escapeHtmlMarkup(ing.name ?? '');
                    const ingredientRatio = Number.isFinite(Number(ing.ratio)) ? Number(ing.ratio) : 0;
                    const ingredientPrice = Number.isFinite(Number(ing.price)) ? Number(ing.price) : 0;
                    const ingredientPack = Number.isFinite(Number(ing.pack)) ? Number(ing.pack) : 0;

                    // ISI TABEL TRADISIONAL (Untuk Ekspor PDF)
                    htmlContentTable += `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="text-align: left; padding: 5px;">${ingredientNameHtml}</td>
                            <td>${ingredientRatio}${unitSymbol}</td>
                            <td><span id="gross-table-${ingredientIdHtml}">0</span>g</td>
                            <td>Rp ${ingredientPrice.toLocaleString('id-ID')}</td>
                            <td>${ingredientPack}g</td>
                            <td style="text-align: right; padding-right: 5px;">Rp <span id="cost-table-${ingredientIdHtml}">0</span></td>
                        </tr>
                    `;

                    // ISI SEBAGAI KARTU MODERN SECARA DINAMIS (Tampilan Nyata Layar HP)
                    // Mencari index asli bahan untuk parameter fungsi hapus
                    const indexAsli = bakeryIngredients.findIndex(b => b.id === ing.id);

                    htmlContentCards += `
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); position: relative;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                                <span style="font-weight: 700; font-size: 0.8rem; color: var(--chocolate);">${ingredientNameHtml}</span>
                                ${ing.isFlour ? '<span style="font-size:0.65rem; font-weight:700; color:#3498db;">🔑 Utama</span>' : 
                                `<button type="button"  data-action="hapusBahanBakeryDinamis" data-arg="${indexAsli}" style="background: #fee2e2; color: #ef4444; border: none; padding: 3px 8px; font-weight: bold; border-radius: 6px; font-size: 0.68rem; cursor: pointer;">Hapus</button>`}
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1.2fr 1.2fr; gap: 6px; align-items: center;">
                                <div>
                                    <label for="ing-${ingredientIdHtml}-ratio" style="display:block; font-size:0.6rem; color:#94a3b8; font-weight:600;">TAKARAN</label>
                                    <div style="display:flex; align-items:center; gap:2px;">
                                        <input type="number" 
                                                id="ing-${ingredientIdHtml}-ratio" 
                                                name="ing_${ingredientIdHtml}_ratio" 
                                                value="${ingredientRatio}" 
                                                step="1" 
                                                 data-oninput="perbaruiKomponenBahan(${ingredientIdJs}, 'ratio', this.value)" 
                                                style="width:40px; font-size:0.75rem; text-align:center; font-weight:700; border:1px solid #cbd5e1; border-radius:4px; padding:1px 0;" 
                                                ${ing.isFlour ? 'disabled' : ''}>
                                        <span style="font-size:0.7rem; font-weight:600; color:#64748b;">${unitSymbol}</span>
                                    </div>
                                </div>
                                <div>
                                    <label for="ing-${ingredientIdHtml}-price" style="display:block; font-size:0.6rem; color:#94a3b8; font-weight:600;">HARGA BELI</label>
                                    <div style="display:flex; align-items:center; gap:2px; font-size:0.75rem;">
                                        <span style="color:#64748b; font-weight:600;">Rp</span>
                                        <input type="number" 
                                                id="ing-${ingredientIdHtml}-price" 
                                                name="ing_${ingredientIdHtml}_price" 
                                                value="${ingredientPrice}" 
                                                 data-oninput="perbaruiKomponenBahan(${ingredientIdJs}, 'price', this.value)" 
                                                style="width:55px; font-size:0.75rem; text-align:center; border:1px solid #cbd5e1; border-radius:4px; padding:1px 0; font-weight:600;">
                                    </div>
                                </div>
                                <div>
                                    <label for="ing-${ingredientIdHtml}-pack" style="display:block; font-size:0.6rem; color:#94a3b8; font-weight:600;">ISI PACK (g)</label>
                                    <input type="number" 
                                            id="ing-${ingredientIdHtml}-pack" 
                                            name="ing_${ingredientIdHtml}_pack" 
                                            value="${ingredientPack}" 
                                             data-oninput="perbaruiKomponenBahan(${ingredientIdJs}, 'pack', this.value)" 
                                            style="width:55px; font-size:0.75rem; text-align:center; border:1px solid #cbd5e1; border-radius:4px; padding:1px 0; font-weight:600;">
                                </div>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; margin-top: 2px;">
                                <span style="color: #64748b;">Berat Pakai: <b style="color:var(--chocolate)"><span id="gross-${ingredientIdHtml}">0</span>g</b></span>
                                <span style="color: #475569; font-weight: 700;">Biaya: <span style="color:#b91c1c;">Rp <span id="cost-${ingredientIdHtml}">0</span></span></span>
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
                <button type="button" data-action="openAddIngredientForm" style="background: #E67E22; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">+ Tambah Bahan Pertama</button>
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

    tableBody.replaceChildren();
    cardsContainer.replaceChildren();

    // [AI-GENERATED][SECURITY][V223] Backups/imports may contain malformed ingredient
    // records. Normalize records and numeric fields before HTML generation.
    const ingredients = Array.isArray(bakeryIngredients) ? bakeryIngredients : [];
    if (ingredients.length === 0) {
        cardsContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; font-size: 0.75rem; padding: 20px; background: #fff; border-radius: 8px; border: 1px dashed #cbd5e1;">Belum ada bahan baku yang ditambahkan.</div>`;
        return;
    }

    const finiteNumber = value => {
        try {
            const number = Number(value);
            return Number.isFinite(number) ? number : 0;
        } catch {
            return 0;
        }
    };

    ingredients.forEach((sourceItem, index) => {
        const item = sourceItem && typeof sourceItem === 'object' ? sourceItem : {};
        const ingredientNameHtml = escapeHtmlMarkup(item.name ?? '');
        const ingredientTypeHtml = escapeHtmlMarkup(item.type ?? '');
        const ratio = finiteNumber(item.ratio);
        const weight = finiteNumber(item.weight);
        const price = finiteNumber(item.price);
        const pack = finiteNumber(item.pack);
        const cost = Math.round(finiteNumber(item.cost));

        // 1. RENDER FORMAT TABEL (Untuk Kebutuhan Cetak PDF Tersembunyi)
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #e2e8f0";
        tr.innerHTML = `
            <td style="text-align: left; padding: 6px;">${ingredientNameHtml} <br><small style="color:#94a3b8">${ingredientTypeHtml}</small></td>
            <td>${ratio}%</td>
            <td>${weight} gr</td>
            <td>Rp ${price}</td>
            <td>${pack} gr</td>
            <td>Rp ${cost}</td>
        `;
        tableBody.appendChild(tr);

        // 2. RENDER FORMAT KARTU MOBILE (Sangat Nyaman Dilihat & Diinput di HP)
        const card = document.createElement('div');
        card.style.cssText = "background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); position: relative;";
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 2px;">
                <div>
                    <span style="font-weight: 700; font-size: 0.85rem; color: var(--chocolate);">${ingredientNameHtml}</span>
                    <span style="font-size: 0.65rem; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; margin-left: 4px; color: #64748b;">${ingredientTypeHtml}</span>
                </div>
                <button type="button" data-action="hapusBahanBakeryDinamis" data-arg="${index}" style="background: #fee2e2; color: #ef4444; border: none; padding: 4px 8px; font-weight: bold; border-radius: 6px; font-size: 0.7rem; cursor: pointer;">Hapus</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); font-size: 0.72rem; color: #475569; gap: 4px;">
                <div><b>Rasio:</b> ${ratio}%</div>
                <div><b>Berat:</b> ${weight}g</div>
                <div style="text-align: right; color: #b91c1c; font-weight: 700;">Biaya: Rp${cost}</div>
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
    
    const nativeBleClient = NativeCapacitorService.getPlugin('BluetoothLe');
    if (NativeCapacitorService.isNativePlatform() && nativeBleClient) {
        try {
            const BleClient = nativeBleClient;
            
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
        const nativeBleClient = NativeCapacitorService.getPlugin('BluetoothLe');
        if (NativeCapacitorService.isNativePlatform() && nativeBleClient) {
            const BleClient = nativeBleClient;
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

// REKATKAN FUNGSI IZIN NOTIFIKASI DI SINI (DI DALAM MODUL)
async function requestNotificationPermission() {
    // [AI-GENERATED][REFACTOR] Permission ownership moved to ProofingNotificationService.
    return ProofingNotificationService.requestPermission();
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

    // Values read from the rendered weather UI may originate from a provider; escape them before HTML interpolation.
    const elemenCuacaHtml = escapeHtmlMarkup(elemenCuaca);
    const elemenSuhuHtml = escapeHtmlMarkup(elemenSuhu);
    const infoSuhuCuaca = `Saat ini jam menunjukkan pukul <strong>${formatJam} WIB</strong>. Kondisi di sekitar lokasi Anda terpantau <strong>${elemenCuacaHtml}</strong> dengan suhu sekitar <strong>${elemenSuhuHtml}</strong>.`;
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

    // [AI-GENERATED][SECURITY][V217] Sensor/Bluetooth/provider values are data, never markup.
    const advice = buildProofingInsight(temp, humidity);
    insightEl.innerHTML = `<strong>Insight:</strong> ${escapeHtmlMarkup(advice.insight)}<br><br><strong>Action:</strong> ${escapeHtmlMarkup(advice.action)}`;
    recEl.innerHTML = `<strong>Rekomendasi:</strong> ${escapeHtmlMarkup(advice.recommendation).replace(/\n/g, '<br>')}`;
}

// FUNGSI ANALISIS AI TIMER COUNTDOWN
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

        const result = await window.AIService.requestAITelemetry(payloadData);
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

    targetContainer.innerHTML = `<div style="font-weight: bold; margin-bottom: 5px; color: var(--accent);">💡 Hasil Analisis AI:</div><div>${formatHasilAI(teksHasil)}</div>`;
}

// =================================================================================
// ANALISIS AI SUNGGUHAN (Gemini via /api/ai-analyze) - dipanggil on-demand
// lewat tombol "Analisis AI Mendalam (Live)", BUKAN otomatis tiap ketikan
// seperti window.jalankanAnalisisAIAgent (yang murni rule-based & instan).
// Kalau gagal/timeout/offline, fallback ke ringkasan lokal berbasis rule
// yang sama supaya fitur tetap jalan di app native tanpa koneksi.
// =================================================================================
// [AI-GENERATED][BUG FIX][V320] Every recipe change invalidates an in-flight AI result.
// The request itself may finish at the provider, but an older response must never
// overwrite the editor after the user has started/opened another recipe.
let recipeAiAnalysisRequestEpoch = 0;

function resetRecipeAiAnalysisState() {
    recipeAiAnalysisRequestEpoch += 1;

    const resultContainer = document.getElementById('ai-live-result');
    if (resultContainer) {
        resultContainer.replaceChildren();
        resultContainer.style.display = 'none';
    }

    const button = document.getElementById('btn-ai-live-analysis');
    if (button) {
        button.textContent = '🤖 Analisis AI Mendalam (Live)';
        button.disabled = false;
    }
}

async function mintaAnalisisAISungguhan() {
    const requestEpoch = recipeAiAnalysisRequestEpoch;
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

        const data = await window.AIService.requestAIAnalysis(aiPrompt);
        if (requestEpoch !== recipeAiAnalysisRequestEpoch) return;

        resultContainer.innerHTML = `
            <div style="font-weight:900; color:#6c3483; margin-bottom:10px; font-size:0.9rem; text-align:center; background:#f5eef8; padding:8px; border-radius:6px; letter-spacing:0.5px;">
                <i class="fas fa-robot"></i> LAPORAN ANALISIS AI
            </div>
            <div>${formatHasilAI(data.result)}</div>
        `;

    } catch (error) {
        if (requestEpoch !== recipeAiAnalysisRequestEpoch) return;
        console.error('[AI Analysis] Permintaan analisis mendalam gagal:', { name: error?.name || 'Error', message: error?.message || String(error), status: error?.status ?? null, code: error?.code ?? null, url: error?.url || undefined });
        const safeFallback = `Analisis AI online sedang tidak tersedia (${escapeHtmlMarkup(error?.message || 'gangguan layanan')}).\n\nRingkasan lokal: periksa kembali komposisi bahan, berat per porsi, suhu adonan, dan tanda visual proofing. Untuk keputusan fermentasi, gunakan kondisi adonan aktual; jangan menganggap estimasi waktu sebagai kepastian.`;
        resultContainer.innerHTML = `
            <div style="background:#fffaf0; border:1px solid #f6ad55; padding:12px; border-radius:8px; color:#744210; font-size:0.85rem; white-space:normal;">
                <strong>AI online belum tersedia.</strong>
                <div style="margin-top:8px; white-space:pre-line;">${safeFallback}</div>
                <small>Detail teknis tercatat di Console. Silakan coba lagi beberapa saat.</small>
            </div>`;
    } finally {
        if (requestEpoch === recipeAiAnalysisRequestEpoch && btn) {
            btn.innerText = prevText;
            btn.disabled = false;
        }
    }
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
    const recipes = ProfileStatsService.getRecipes();
    const ingredients = ProfileStatsService.getIngredients();
    const proofings = ProfileStatsService.getProofings();
    const timers = ProfileStatsService.getTimers();

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
/**
 * Mengarahkan aksi sentuhan pada kartu statistik ke fitur yang sesuai
 * @param {string} jenis - Kategori kartu yang ditekan ('resep', 'bahan', 'proofing', 'timer')
 */
function bukaStatistikDetail(jenis) {
    // Berikan efek getar ringan (haptics) jika didukung perangkat seluler
    if (navigator.vibrate) navigator.vibrate(15);

    switch (jenis) {
        case 'resep':
            // 1. Tutup modal profil terlebih dahulu agar tidak tumpang tindih
            if (typeof toggleModal === 'function') toggleModal('user-modal');
            if (typeof window.tampilkanDaftarResepTersimpan === 'function') {
                window.tampilkanDaftarResepTersimpan();
            }
            break;

        case 'bahan':
            // 2. Tutup modal profil terlebih dahulu
            if (typeof toggleModal === 'function') toggleModal('user-modal');
            if (typeof switchTab === 'function') switchTab('recipe');
            if (typeof gantiTabMetode === 'function') gantiTabMetode('bahan');
            break;

        case 'proofing':
            // 3. Riwayat proofing berada di dalam modal profil. 
            // Arahkan scroll secara mulus ke bagian riwayat tanpa mereset modal.
            const logSection = document.getElementById('dynamic-proofing-logs');
            if (logSection) {
                logSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            break;

        case 'timer':
            // 4. Tutup modal profil, lalu buka notifikasi setelah jeda singkat (untuk transisi mulus)
            if (typeof toggleModal === 'function') {
                toggleModal('user-modal');
                
                setTimeout(() => {
                    toggleModal('notif-modal');
                    if (typeof filterNotif === 'function') {
                        const timerBtn = document.querySelector('.notif-tab-btn[data-action="filterNotif"][data-arg="timer"]');
                        filterNotif('timer', timerBtn);
                    }
                }, 50); // Jeda transisi 50ms
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

    // [AI-GENERATED][ROBUSTNESS][V125] Bind the whole legacy achievement
    // transaction to the authentication lifecycle so a slow response from
    // account A cannot write/show achievements after account B is active.
    const authEpoch = AuthService.getLifecycleEpoch?.();
    const isCurrent = () => authEpoch === undefined
        || AuthService.isLifecycleEpochCurrent?.(authEpoch) !== false;

    try {
        const client = getAppSupabaseClient();
        if (!client || !isCurrent()) return;
        const { count: totalRecipes, error: countError } = await client
            .from('recipes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (countError) throw countError;
        if (!isCurrent()) return;

        const tiers = [
            { id: 'tier_1', threshold: 5, icon: '🥉', title: 'First Batch', desc: 'Membuat 5 Resep perdana!' },
            { id: 'tier_2', threshold: 25, icon: '🥈', title: 'Artisan Baker', desc: 'Membuat 25 Resep Donat!' },
            { id: 'tier_3', threshold: 50, icon: '🥇', title: 'Head Pastry Chef', desc: 'Mencapai 50 Resep!' },
            { id: 'tier_4', threshold: 100, icon: '👑', title: 'Master Baker', desc: 'Luar biasa! 100 Resep tercipta!' }
        ];

        const { data: existingAchievements, error: fetchError } = await client
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', userId);

        if (fetchError) throw fetchError;
        if (!isCurrent()) return;

        const unlockedIds = existingAchievements ? existingAchievements.map(a => a.achievement_id) : [];
        const newUnlocked = [];

        for (const tier of tiers) {
            if ((totalRecipes || 0) >= tier.threshold && !unlockedIds.includes(tier.id)) {
                if (!isCurrent()) return;

                const { error: insertError } = await client
                    .from('user_achievements')
                    .insert([{ user_id: userId, achievement_id: tier.id }]);

                if (insertError) {
                    console.error("Gagal menyimpan pencapaian:", insertError);
                } else {
                    if (!isCurrent()) return;
                    newUnlocked.push(tier); 
                }
            }
        }

        if (newUnlocked.length > 0 && isCurrent()) {
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
// [AI-GENERATED][ROBUSTNESS][V124] Own legacy achievement popup timers as one
// sequence so stale delayed callbacks cannot mutate a newer achievement popup.
let achievementPopupSequence = 0;
let achievementPopupTimers = [];

function clearAchievementPopupTimers() {
    achievementPopupTimers.forEach((timerId) => clearTimeout(timerId));
    achievementPopupTimers = [];
}

function showAchievementPopups(achievements) {
    if (!Array.isArray(achievements) || achievements.length === 0) return;

    clearAchievementPopupTimers();
    const sequence = ++achievementPopupSequence;
    let delay = 0;

    achievements.forEach((achievement, index) => {
        const showTimer = setTimeout(() => {
            if (sequence !== achievementPopupSequence) return;

            const popup = document.getElementById('achievement-popup');
            const titleElement = document.getElementById('achievement-title');
            const descElement = document.getElementById('achievement-desc');
            const iconElement = document.getElementById('ach-icon');

            if(titleElement && descElement && popup) {
                titleElement.innerText = achievement.title;
                descElement.innerText = achievement.desc;
                if(iconElement && achievement.icon) iconElement.innerText = achievement.icon;
                
                popup.classList.add('show');

                try {
                        const ctx = ProofingAlarmService.getAudioContext(true);
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

                if (typeof NotifSystem !== 'undefined') {
                    NotifSystem.tambah('sistem', `🏅 Pencapaian Terbuka: ${achievement.title}`, achievement.desc, achievement.icon || '🏅');
                }

                const hideTimer = setTimeout(() => {
                    if (sequence !== achievementPopupSequence) return;
                    popup.classList.remove('show');
                }, 4000);
                achievementPopupTimers.push(hideTimer);
            }
            
            if (index === achievements.length - 1 && sequence === achievementPopupSequence) {
                const badge = document.getElementById('profile-status-badge');
                if(badge) {
                    badge.innerText = achievement.title;
                    badge.classList.add('badge-upgrade-animation');
                }
            }
        }, delay);
        achievementPopupTimers.push(showTimer);
        delay += 4500;
    });
}

// [AI-GENERATED][REFACTOR][V154]
// Gunakan achievement service berbasis Supabase yang sudah menjadi canonical path.
// Endpoint PHP legacy tidak dijalankan oleh deployment Vercel dan dapat menghasilkan 404.
async function cekPencapaianUser() {
    try {
        const user = await AuthService.getUser();
        const userId = user?.id;
        if (!userId) return;
        await checkRecipeAchievements(userId);
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

/**
 * [AI-GENERATED][ROBUSTNESS][V324]
 * Bind mini-stat swapping outside DOMContentLoaded. The ES-module graph may
 * evaluate after DOMContentLoaded, in which case nested direct listeners are
 * never attached. Delegation also survives header DOM replacement and works
 * for the synthesized click generated by mobile taps.
 */
function initMiniStatsSwapBinding() {
    if (window.__TP_MINI_STATS_SWAP_BOUND__) return true;
    if (!document) return false;

    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element
            ? event.target.closest('#shrunk-main, #shrunk-sub')
            : null;
        if (!target) return;

        const locationHeader = document.getElementById('location-section');
        if (!locationHeader?.classList.contains('shrunk')) return;

        event.preventDefault();
        jalankanSwapMini();
    }, true);

    window.__TP_MINI_STATS_SWAP_BOUND__ = true;
    return true;
}

// Bind immediately whether app-core loads before or after DOMContentLoaded.
initMiniStatsSwapBinding();

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
        // [AI-GENERATED][REFACTOR][V25] Canonical recipe read; no direct legacy localStorage fallback.
        const dataResepArray = await RecipeStorageService.read();
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

// [AI-GENERATED][REFACTOR] Removed duplicate toggleModal implementation; modal.js is the single source of truth.

// ==========================================================
// RECIPE PHOTO COMPATIBILITY
// [AI-GENERATED][REFACTOR][V40] Photo ownership moved to recipe-photo-service.js.
// Existing global APIs remain exposed by the canonical service.
// ==========================================================

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
window.tipFilterState ??= { category: 'all', searchQuery: '' };

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

    // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
    syncModalBodyScrollLock();

    // 5. Logika Tampilkan Tab
    if (tabName === 'recipe' && recipeModal) {
        recipeModal.style.display = 'flex';
        recipeModal.classList.add('active');
        recipeModal.setAttribute('aria-hidden', 'false');
        // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
        syncModalBodyScrollLock();

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
        // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
        syncModalBodyScrollLock();

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

// [AI-GENERATED][REFACTOR] Canonical filterTips implementation is defined later with case-insensitive fallback matching.

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

// [AI-GENERATED][REFACTOR][V98] Canonical search analytics export.
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
        alert("Gagal mengekspor log analisis: " + (err?.message || err));
    }
}

// FUNGSI AI TIPS
window.initTipsAIAssistant = function() {
    const btn = document.getElementById('ai-tips-btn');
    const input = document.getElementById('ai-tips-input');
    const container = document.getElementById('ai-tips-result-container');

    if (!btn || !input || !container) return;
    if (btn.dataset.aiInitialized === 'true') return;
    btn.dataset.aiInitialized = 'true';

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
            const data = await window.AIService.requestAITips(query);

            // Render hasil analisis AI menggunakan fungsi formatHasilAI yang lebih cerdas
            container.innerHTML = `
                <div id="ai-result-card" style="background: #fff; padding: 18px; border-radius: 16px; border-left: 4px solid #b7791f; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 20px;">
                    <div data-action="toggleAiResult" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <h4 style="margin: 0; color: #2c3e50; font-size: 1rem;">🧠 Hasil Analisis Sains AI</h4>
                            <span style="font-size: 0.75rem; color: #718096; background: #feebc8; padding: 2px 8px; border-radius: 10px;">Akurat</span>
                        </div>
                        <span id="ai-toggle-icon" style="font-size: 0.8rem; color: #718096; font-weight: bold; padding: 4px 8px;">▲</span>
                    </div>
                    
                    <div id="ai-body-content" style="max-height: 320px; overflow-y: auto; overflow-x: hidden; padding-right: 8px; margin-top: 12px; border-top: 1px solid #f1f5f9; padding-top: 10px; scrollbar-width: thin; scroll-behavior: smooth;">
                        ${formatTipsHasilAI(data.result)}
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('[AI Tips] Permintaan tips AI gagal:', { name: error?.name || 'Error', message: error?.message || String(error), status: error?.status ?? null, code: error?.code ?? null, url: error?.url || undefined });
            const safeQuery = escapeHtmlMarkup(query.slice(0, 240));
            const fallbackMessage = `Layanan AI online sedang sibuk atau tidak dapat dijangkau.\n\nSaran sementara untuk pertanyaan “${safeQuery}”: catat suhu ruang dan suhu adonan, jaga adonan agar tidak mengering, lalu nilai perkembangan volume dan tes tekan ringan secara berkala. Akhiri proofing berdasarkan kondisi adonan, bukan waktu saja.`;
            container.innerHTML = `
                <div style="background:#fffaf0; color:#744210; padding:14px; border-radius:8px; border:1px solid #f6ad55; font-size:0.9rem; margin-bottom:20px; white-space:pre-line;">
                    <strong>AI online belum tersedia.</strong>\n${fallbackMessage}\n\n<small>Detail teknis tercatat di Console. Coba kembali beberapa saat lagi.</small>
                </div>
            `;
        } finally {
            btn.innerText = prevText;
            btn.disabled = false;
        }
    });
};

// [AI-GENERATED][ROBUSTNESS] Initialize after DOM readiness and keep the initializer idempotent.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initTipsAIAssistant, { once: true });
} else {
    window.initTipsAIAssistant();
}

// ==========================================
// 2. FUNGSI UTAMA: UPDATE TEMA & WAKTU DINAMIS
// ==========================================
function updateDynamicTheme(weatherId, mainWeather) {
    const now = new Date();
    const hours = now.getHours();
    
    // =========================================================================
    // WAJIB: DEKLARASIKAN SEMUA VARIABEL TEMA DI AWAL AGAR TIDAK REFERENCEERROR
    // =========================================================================
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
        accentColor = "#3498db";
        textWeatherColor = "#ecf0f1"; 
        cardBg = "rgba(255, 255, 255, 0.12)";
    } else if (weatherId >= 801 && weatherId <= 804) { 
        accentColor = "#d35400";
        textWeatherColor = "#3e2723"; 
        cardBg = "rgba(0, 0, 0, 0.05)";
    } else if (["malam", "tengah malam", "dini hari"].includes(timeOfDay)) {
        accentColor = "#f1c40f";
        textWeatherColor = "#E0E0E0";
        cardBg = "rgba(255, 255, 255, 0.08)";
    } else if (timeOfDay === "senja" || timeOfDay === "petang") {
        accentColor = "#ffffff";
        textWeatherColor = "#C0C0C0";
        cardBg = "rgba(255, 255, 255, 0.15)";
    }

    // 4. PENGONDISIAN WARNA KHUSUS CONTAINER HEADER
    // Jangan mengubah --accent pada :root atau background body: warna brand
    // cokelat/adonan harus konsisten di seluruh aplikasi, apa pun kondisi cuaca.

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
        // Scope dynamic weather colors to the weather/location header only.
        locationSectionHeader.style.setProperty('--bg-container', containerBg);
        locationSectionHeader.style.setProperty('--text-container', textColor);
        locationSectionHeader.style.setProperty('--card-bg', cardBg);
        locationSectionHeader.style.setProperty('--accent', accentColor);
        locationSectionHeader.style.setProperty('--text-weather', textWeatherColor);
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

/**
 * [AI-GENERATED][BUGFIX][V311] Bagikan aplikasi lintas web, PWA, dan Capacitor.
 * Tidak mengubah kontrak DOM/data-action yang sudah dipakai menu Pengaturan.
 */
async function bagikanAplikasi() {
    const isHttpLocation = /^https?:$/.test(window.location.protocol);
    // URL capacitor://localhost bukan URL yang dapat dibuka teman; gunakan URL web publik.
    const appUrl = isHttpLocation
        ? new URL('./', window.location.href).href
        : 'https://timer-proofer.vercel.app/';
    const shareData = {
        title: 'Timer Proofer & Kalkulator HPP',
        text: 'Yuk coba Timer Proofer & Kalkulator HPP untuk membantu memantau waktu proofing adonan dan menghitung biaya resep.',
        url: appUrl
    };
    const textToCopy = `${shareData.text} ${shareData.url}`;

    const showShareMessage = (message) => {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        } else if (typeof window.showNotification === 'function') {
            window.showNotification(message);
        } else {
            window.alert(message);
        }
    };

    // Native Capacitor: gunakan plugin Share, bukan mengandalkan user-agent atau navigator.share.
    try {
        if (NativeCapacitorService?.isNativePlatform?.()) {
            const nativeShare = NativeCapacitorService.getPlugin('Share');
            if (typeof nativeShare?.share === 'function') {
                await nativeShare.share({
                    title: shareData.title,
                    text: shareData.text,
                    url: shareData.url,
                    dialogTitle: 'Bagikan Timer Proofer'
                });
                return true;
            }
        }
    } catch (error) {
        // Membatalkan dialog native adalah perilaku normal, jangan munculkan fallback yang mengganggu.
        if (error?.name === 'AbortError' || /cancel|canceled|cancelled|dismiss/i.test(String(error?.message || ''))) {
            return false;
        }
        console.warn('[BagikanAplikasi] Share native gagal; mencoba fallback web:', error);
    }

    // Web Share API tersedia di browser modern, termasuk desktop yang mendukungnya.
    if (typeof navigator.share === 'function') {
        try {
            await navigator.share(shareData);
            return true;
        } catch (error) {
            if (error?.name === 'AbortError') return false;
            console.warn('[BagikanAplikasi] Web Share API gagal; mencoba salin tautan:', error);
        }
    }

    // Clipboard API memerlukan secure context dan dapat ditolak oleh izin browser.
    try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(textToCopy);
            showShareMessage('Tautan aplikasi berhasil disalin. Tempelkan ke WhatsApp atau media sosial untuk membagikannya.');
            return true;
        }
    } catch (error) {
        console.warn('[BagikanAplikasi] Clipboard tidak tersedia:', error);
    }

    // Fallback akhir: prompt tetap menyediakan teks yang bisa disalin secara manual.
    try {
        const copiedText = window.prompt('Salin teks dan tautan aplikasi berikut:', textToCopy);
        return copiedText !== null;
    } catch (error) {
        console.error('[BagikanAplikasi] Semua metode berbagi gagal:', error);
        showShareMessage('Fitur berbagi tidak tersedia di perangkat ini. Silakan buka menu Pengaturan dan salin tautan aplikasi secara manual.');
        return false;
    }
}

/**
 * [AI-GENERATED][VERSION-CONFIG][V313]
 * version.json is the single manual control point for the visible app version.
 * The HTML meta tag is only an offline fallback; internal package/cache revisions
 * are intentionally independent from the version shown to users.
 */
function updateVersion() {
    const els = {
        profile: document.getElementById("profile-version"),
        aboutModal: document.getElementById("about-app-version"),
        aboutMenu: document.getElementById("about-menu-version")
    };
    const fallbackVersion = document.querySelector('meta[name="app-version"]')?.content?.trim() || 'Versi belum diatur';
    const render = (version, build = '') => {
        const cleanVersion = String(version || fallbackVersion).trim();
        const simple = /^versi\s/i.test(cleanVersion) ? cleanVersion : `Versi ${cleanVersion}`;
        const full = `Timer Proofer ${cleanVersion}${build ? ` · ${build}` : ''}`;
        if (els.profile) els.profile.textContent = simple;
        if (els.aboutModal) els.aboutModal.textContent = simple;
        if (els.aboutMenu) els.aboutMenu.textContent = full;
    };

    render(fallbackVersion);
    try {
        const metadataUrl = new URL('../../version.json', import.meta.url);
        metadataUrl.searchParams.set('_release', '20261031-v328');
        return fetch(metadataUrl.href, { cache: 'no-store' })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status} saat memuat version.json`);
                return response.json();
            })
            .then(data => {
                if (!data || typeof data.version !== 'string' || !data.version.trim()) {
                    throw new Error('Field version pada version.json kosong atau tidak valid.');
                }
                render(data.version, typeof data.build === 'string' ? data.build : '');
                return data;
            })
            .catch(error => {
                console.warn('[Version] version.json gagal dimuat; menggunakan meta app-version:', error);
                return null;
            });
    } catch (error) {
        console.warn('[Version] Gagal memulai pembacaan version.json:', error);
        return Promise.resolve(null);
    }
}

window.updateVersion = updateVersion;

function bukaArtikelLengkap(id) {
    const artikel = dataArtikelLengkap[id];
    if (!artikel) return;

    // [AI-GENERATED][ROBUSTNESS][V219] Guard each existing modal node so a partial
    // DOM/template mismatch cannot throw and interrupt the rest of the application.
    const badgeElement = document.getElementById('modal-badge');
    const titleElement = document.getElementById('modal-title');
    const bodyElement = document.getElementById('modal-body');
    const overlay = document.getElementById('article-modal');

    if (badgeElement) badgeElement.textContent = String(artikel.badge ?? '');
    if (titleElement) titleElement.textContent = String(artikel.title ?? '');
    // Article content is a fixed, source-controlled HTML template in dataArtikelLengkap.
    // Keep its intentional formatting; never replace this with user/API-supplied content.
    if (bodyElement && typeof artikel.content === 'string') bodyElement.innerHTML = artikel.content;

    // [AI-GENERATED][ARTICLE FULLSCREEN][V326] The body is transformed and width-capped
    // for the app shell. Portal this existing node to <html> while open so fixed
    // positioning covers the whole viewport instead of being clipped to the shell.
    if (overlay) {
        if (!overlay.__tpPortalPlaceholder && overlay.parentNode !== document.documentElement) {
            const placeholder = document.createComment('article-modal-origin');
            overlay.parentNode?.insertBefore(placeholder, overlay);
            overlay.__tpPortalPlaceholder = placeholder;
        }
        if (overlay.parentNode !== document.documentElement) document.documentElement.appendChild(overlay);
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
        const placeholder = articleModal.__tpPortalPlaceholder;
        if (placeholder?.parentNode) {
            placeholder.parentNode.insertBefore(articleModal, placeholder.nextSibling);
            placeholder.remove();
        } else if (articleModal.parentNode === document.documentElement && document.body) {
            document.body.appendChild(articleModal);
        }
        delete articleModal.__tpPortalPlaceholder;
    }
    if (modalOverlay && modalOverlay !== articleModal) {
        modalOverlay.classList.remove('active');
        modalOverlay.style.removeProperty('display');
    }
    
    // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
    syncModalBodyScrollLock(); // Kembalikan scroll utama
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
                ProofingAlarmService.stopAll();
            }
            // Bekukan hitungan "waktu kelebihan" (bukan reset total — cuma hentikan interval-nya,
            // supaya display berhenti naik tapi sesi belum dianggap direset; RESET PROOFING
            // tetap tombol terpisah untuk mengakhiri sesi sepenuhnya)
            proofingTimerController.stopIntervalOnly();
            timerInterval = null;

            // [AI-GENERATED][ROBUSTNESS][V78] Closing the overtime toast freezes
            // the timer session. stopIntervalOnly() intentionally clears only the
            // controller interval, so the application runtime flag must also be
            // changed before persistence. Otherwise persistProofingState() would
            // save isRunning=true and a later foreground restore could resurrect
            // the already-frozen overtime session.
            isTimerRunning = false;

            // [AI-GENERATED][ROBUSTNESS][V78] Persist the frozen state immediately
            // so foreground/native lifecycle restore cannot restart this session.
            if (typeof persistProofingState === 'function') {
                persistProofingState();
            }
        };

        // [AI-GENERATED][REFACTOR] Avoid the DOM onclick property.
        tombolTutup.addEventListener('click', sembunyikanToastOvertime);
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
    const btn = document.querySelector('button[data-action="kirimSaran"]');
    
    if (!text) {
        alert("Pesan tidak boleh kosong. Silakan tuliskan masukan Anda.");
        return;
    }

    const originalText = btn.innerText;
    btn.innerText = "MENGIRIM...";
    btn.disabled = true;

    try {
        // [AI-GENERATED][REFACTOR][V52] Read auth identity through the canonical
        // AuthService boundary; feedback persistence remains on its existing Supabase table.
        const user = await AuthService.getUser();
        
        const client = getAppSupabaseClient();
        if (!client) throw new Error('Koneksi Supabase belum siap.');
        const { error } = await client.from('app_feedback').insert([
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

// [AI-GENERATED][ROBUSTNESS][V121] Own success-popup transition timers.
// Prevent delayed open/close callbacks from mutating a popup after its state
// has already changed because of a rapid reopen/close interaction.
let popupSuksesOpenTimer = null;
let popupSuksesCloseTimer = null;

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
                <button data-action="tutupPopupSukses" style="background: #e67e22; color: white; border: none; width: 100%; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(230, 126, 34, 0.3);">OK, MENGERTI</button>
            </div>
        `;
        document.body.appendChild(popupOverlay);
    }

    document.getElementById('popup-title').innerText = judul;
    document.getElementById('popup-message').innerText = pesan;

    clearTimeout(popupSuksesOpenTimer);
    clearTimeout(popupSuksesCloseTimer);
    popupSuksesOpenTimer = null;
    popupSuksesCloseTimer = null;

    popupOverlay.style.display = 'flex';
    popupSuksesOpenTimer = setTimeout(() => {
        popupSuksesOpenTimer = null;
        // [AI-GENERATED][ROBUSTNESS][V121] Do not apply stale animation after
        // the popup has already been closed.
        if (popupOverlay.style.display === 'none') return;
        popupOverlay.style.opacity = '1';
        popupOverlay.firstElementChild.style.transform = 'scale(1)';
    }, 10);
}

function tutupPopupSukses() {
    const popupOverlay = document.getElementById('custom-success-popup');
    if (popupOverlay) {
        clearTimeout(popupSuksesOpenTimer);
        clearTimeout(popupSuksesCloseTimer);
        popupSuksesOpenTimer = null;
        popupSuksesCloseTimer = null;

        popupOverlay.style.opacity = '0';
        popupOverlay.firstElementChild.style.transform = 'scale(0.9)';
        popupSuksesCloseTimer = setTimeout(() => {
            popupSuksesCloseTimer = null;
            // [AI-GENERATED][ROBUSTNESS][V121] A reopened popup owns the current
            // visual state; an older close callback must not hide it.
            if (popupOverlay.style.display !== 'none' && popupOverlay.style.opacity !== '0') return;
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
            <i class='fas fa-circle-notch fa-spin'></i> AI sedang memformulasikan solusi untuk "${escapeHtmlMarkup(pertanyaan)}"...
        </div>`;

    try {
        // Prompt khusus Asisten Tips
        const aiPrompt = `
Bertindaklah sebagai Asisten Teknis Artisan Bakery.
Pengguna bertanya atau mengalami kendala berikut: "${pertanyaan}"

Berikan jawaban teknis, padat, dan solutif.
ATURAN FORMAT: Gunakan paragraf naratif untuk penjelasan, gunakan sub-judul dengan titik dua (contoh: "Solusi Cepat:"), gunakan simbol (-) HANYA untuk list, dan angka (1.) HANYA untuk urutan langkah.`;

        // [AI-GENERATED][REFACTOR][V36] Reuse canonical AI transport and timeout handling.
        const data = await requestAIAnalysis(aiPrompt);

        // Render hasil menggunakan fungsi formatting cerdas sebelumnya
        resultBox.innerHTML = `
            <div style="font-weight:900; color:#6c3483; margin-bottom:12px; font-size:0.85rem; text-align:center; background:#f5eef8; padding:8px; border-radius:6px; letter-spacing:0.5px;">
                <i class="fas fa-robot"></i> JAWABAN ASISTEN AI
            </div>
            <div>${formatHasilAI(data.result)}</div>
            <button data-action="hideAiTipsResult" style="margin-top:14px; width:100%; padding:10px; border-radius:8px; background:#f1f5f9; border:none; color:#475569; font-weight:bold; cursor:pointer;">
                Tutup Jawaban
            </button>
        `;

    } catch (error) {
        resultBox.innerHTML = `
            <div style="background:#fee2e2; padding:10px; border-radius:8px; color:#b91c1c; font-size:0.75rem;">
                ⚠️ Gagal terhubung ke AI Asisten: ${escapeHtmlMarkup(error?.message || 'Terjadi kesalahan jaringan.')}
            </div>`;
    }
}

// ============================================================
// INISIALISASI, STATE, DAN PENGIKAT EVENT (URUTAN ASLI DIPERTAHANKAN)
// ============================================================

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

    // [AI-GENERATED][CLEANUP][V101] Recipe persistence is owned exclusively by
    // RecipeStorageService. These legacy key/path constants had no runtime
    // consumers in app-core and are removed to prevent split ownership.
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
    if (!(OfflineI18n && OfflineI18n.current() !== 'id')) document.documentElement.lang = dictLang;
};

document.addEventListener('DOMContentLoaded', initLanguage);

window.buatResepBaruForm = function() {
    // [AI-GENERATED][BUG FIX] Preserve the original edit-state reset before creating a new recipe.
    if (currentEditingRecipeId) {
        const lanjut = confirm("Anda sedang mengedit resep yang ada. Buat lembar resep baru?");
        if (!lanjut) return;
    }

    // [AI-GENERATED][ROBUSTNESS][V279] Only invalidate pending saves after the
    // user confirms the editor transition; cancelling must leave the current form valid.
    markRecipeEditorContextChanged();
    resetRecipeAiAnalysisState();
    // [AI-GENERATED][REFACTOR] Reset the active recipe identity first so later saves cannot overwrite the old recipe.
    currentEditingRecipeId = null;

    const recipeNameInput = document.getElementById('recipe-save-name');
    const baseFlour = document.getElementById('base-flour');
    const recipeYield = document.getElementById('recipe-yield');
    const hargaJual = document.getElementById('input-harga-jual');

    if (recipeNameInput) recipeNameInput.value = '';
    if (baseFlour) baseFlour.value = '';
    if (recipeYield) recipeYield.value = '';
    if (hargaJual) hargaJual.value = '';

    // [AI-GENERATED][REFACTOR][V35] Canonical ingredient reset; no alternate writer remains.
    if (typeof window.resetBakeryIngredients === 'function') {
        window.resetBakeryIngredients();
    }

    window.activeRecipeSteps = [];
    if (typeof window.langkahProduksi !== 'undefined') {
        window.langkahProduksi = [];
    }

    if (typeof window.renderRecipeTable === 'function') window.renderRecipeTable();
    if (typeof window.hitungHPP === 'function') window.hitungHPP();
    if (typeof window.renderLangkahProduksi === 'function') window.renderLangkahProduksi();

    if (typeof NotifSystem?.tambah === 'function') {
        NotifSystem.tambah('resep', 'Lembar Resep Baru', 'Form kalkulator dikosongkan untuk resep baru.', '✨');
    }
};

window.simpanResepKeDatabase = simpanResepKeDatabase;
/* ========================================= */


    /* FUNGSI HALAMAN LOGIN */
// [AI-GENERATED][ES6 MODULE][V274] Supabase auth calls go through AuthService.
// `window.supabase` remains only as a third-party/legacy SDK compatibility bridge.

// [AI-GENERATED][REFACTOR][V15] Online lifecycle dipusatkan di bawah.

// Deklarasikan variabel status di luar fungsi agar dikenali secara global
let isRegisterMode = false;

// [AI-GENERATED][REFACTOR] Legacy global exposure retained temporarily for compatibility with remaining module actions.
window.switchMode = switchAuthTab;

// Pastikan fungsi terdaftar secara global jika menggunakan module
window.togglePasswordVisibility = togglePasswordVisibility;

// Variabel global untuk menyimpan email sementara
let pendingVerificationEmail = "";
// [AI-GENERATED][ROBUSTNESS][V117] OTP verification lifecycle owner.
// Prevents deferred cleanup from an older attempt from touching a newer attempt.
let otpCleanupTimer = null;
let verificationEpoch = 0;

// Ekspos fungsi ke atribut HTML global
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
    // [AI-GENERATED][REFACTOR][V35] Compatibility alias; one canonical add path.
    return window.tambahBahanBakeryDinamis?.(true);
};

window.hapusLangkahProduksi = hapusLangkahProduksi;

window.pindahLangkah = pindahLangkah;

window.muatTemplateLangkahDonat = muatTemplateLangkahDonat;

/* [AI-GENERATED][REFACTOR][V18] Legacy loginBtn simulator removed.
 * Authentication state is owned by the Supabase auth lifecycle above. */
window.addEventListener('DOMContentLoaded', () => {
    // [AI-GENERATED][REFACTOR][V18] initLanguage() is owned by its canonical binding at line 8341.
    const customSwitcher = document.getElementById('custom-lang-switcher');
    if (customSwitcher) {
        customSwitcher.addEventListener('change', (e) => {
            window.setLanguage(e.target.value);
        });
    }

    // [AI-GENERATED][SECURITY] Only the email is remembered. Remove any legacy plaintext password.
    const savedEmail = localStorage.getItem('saved_email');
    localStorage.removeItem('saved_pass');
    const emailEl = document.getElementById('input-email');
    const rememberEl = document.getElementById('remember-me-checkbox');

    if (savedEmail && emailEl) emailEl.value = savedEmail;
    if (savedEmail && rememberEl) rememberEl.checked = true;
});

/* [AI-GENERATED][REFACTOR][V18] Removed duplicate session bootstrap.
 * The single Supabase auth lifecycle owner handles INITIAL_SESSION. */

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
// Daftarkan ke objek window agar aman dipanggil dari inline onclick
window.loadDynamicProfile = loadDynamicProfile;

// loadDynamicProfile dipanggil otomatis dari toggleModal('user-modal') saat modal profil dibuka

// =============================================

const ProfileStatsService = {

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
    // Auth lifecycle bindings dikelola oleh satu owner; tidak menambahkan listener submit kedua di sini.

    // Jalankan sapaan AI & sinkronisasi statistik dengan aman setelah DOM siap
    updateGreeting();
    tampilkanSapaanAwalAI();
    // loadDynamicProfile dipanggil otomatis saat user-modal dibuka via toggleModal()
});
//===============================================

// Compatibility export untuk action delegation dan pemanggilan legacy.
window.bukaStatistikDetail = bukaStatistikDetail;

// TIPS TERBAIK: Jangan pakai setTimeout jika memungkinkan. 
// Panggil fungsi `tampilkanSapaanAwalAI()` ini tepat di dalam fungsi 
// Fetch API Cuaca Anda, tepat setelah data suhu berhasil dimasukkan ke elemen '#temp-val'.


window.escapeHtmlResep = escapeHtmlResep;

window.jadwalkanAlarmProofing = jadwalkanAlarmProofing;

window.isFetchingLocation = window.isFetchingLocation ?? false;       // Pengunci agar tidak berjalan double
window.locationPermissionDenied = window.locationPermissionDenied ?? false; // Penanda jika user sudah pernah menolak GPS
// [AI-GENERATED][REFACTOR] Notification ownership moved to notification-service.js.
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

// [AI-GENERATED][PWA PIP BINDING][V326] ES-module evaluation may occur after
// DOMContentLoaded. Bind immediately when the DOM already exists.
function bindPipAndRecipeShortcutButtons() {
    const pipTrigger = document.getElementById('pip-trigger-btn');
    if (pipTrigger && pipTrigger.dataset.tpPipBound !== 'v326') {
        pipTrigger.dataset.tpPipBound = 'v326';
        pipTrigger.addEventListener('click', (event) => {
            event.preventDefault();
            void aktifkanModePIP({ fromBack: false });
        });
    }
    const btnResep = document.getElementById('btn-buka-resep');
    if (btnResep && btnResep.dataset.tpRecipeShortcutBound !== 'v326') {
        btnResep.dataset.tpRecipeShortcutBound = 'v326';
        btnResep.addEventListener('click', () => {
            if (typeof openRecipesFromProfile === 'function') openRecipesFromProfile();
            else if (typeof window.tampilkanDaftarResepTersimpan === 'function') window.tampilkanDaftarResepTersimpan();
        });
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPipAndRecipeShortcutButtons, { once: true });
} else {
    bindPipAndRecipeShortcutButtons();
}
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

        // [AI-GENERATED][BUG FIX][V51] initApp() adalah satu-satunya pemilik lock
        // isFetchingLocation. Mengaktifkannya di caller membuat initApp() langsung
        // return, sehingga pull-to-refresh tidak pernah menjalankan refresh.
        initApp()
            .catch((error) => {
                console.error("Gagal refresh:", error);
            })
            .finally(() => {
                hideRefreshIndicator();
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

    // [AI-GENERATED][REFACTOR] Notification deletion is owned by data-action="notifHapus".
});

// [AI-GENERATED][REFACTOR][V37] Timer lifecycle listener ownership moved to AppLifecycleService.

document.addEventListener('click', () => {
    // Berikan argumen 'true' untuk menandakan bahwa ini dipicu langsung oleh klik user
    const ctx = ProofingAlarmService.getAudioContext(true);
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
// [AI-GENERATED][REFACTOR] Synchronous browser-safe bootstrap through StorageService.
// [AI-GENERATED][REFACTOR][V35] Ingredient persistence is owned by BakeryIngredientService.
bakeryIngredients = BakeryIngredientService.loadSync();
window.bakeryIngredients = bakeryIngredients;

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
    // [AI-GENERATED][REFACTOR][V35] Canonical ingredient persistence facade.
    const snapshot = Array.isArray(window.bakeryIngredients) ? window.bakeryIngredients : [];
    void BakeryIngredientService.persist(snapshot).then(() => {
        // [AI-GENERATED][ROBUSTNESS][V269] Persistence success is distinct from
        // the success of refreshing the dependent UI.
        try {
            if (typeof window.renderRecipeTable === 'function') window.renderRecipeTable();
            if (typeof window.hitungHPP === 'function') window.hitungHPP();
        } catch (error) {
            console.warn('[BakeryIngredientService] Bahan tersimpan, tetapi pembaruan tampilan gagal:', error);
        }
    }).catch((error) => {
        // [AI-GENERATED][ROBUSTNESS][V269] Surface failed writes and consume the
        // rejection; do not leave a false success toast or unhandled Promise.
        console.error('[BakeryIngredientService] Penyimpanan bahan gagal:', error);
        try {
            if (typeof NotifSystem?.tambah === 'function') {
                NotifSystem.tambah(
                    'sistem',
                    'Penyimpanan Bahan Gagal',
                    'Perubahan bahan belum dipastikan tersimpan di perangkat. Periksa penyimpanan lalu coba lagi.',
                    '⚠️'
                );
            }
        } catch (notificationError) {
            console.warn('[BakeryIngredientService] Notifikasi kegagalan penyimpanan tidak dapat ditampilkan:', notificationError);
        }
    });
};

window.addBakeryIngredient = function(newIngredient) {
    try {
        bakeryIngredients = BakeryIngredientService.add(bakeryIngredients, newIngredient);
        window.bakeryIngredients = bakeryIngredients;
        window.saveBakeryIngredients();
        return true;
    } catch (error) {
        console.error('[BakeryIngredientService] Gagal menambah bahan:', error);
        return false;
    }
};

window.updateBakeryIngredient = function(id, updatedData) {
    bakeryIngredients = BakeryIngredientService.update(bakeryIngredients, id, updatedData);
    window.bakeryIngredients = bakeryIngredients;
    window.saveBakeryIngredients();
};

window.deleteBakeryIngredient = function(id) {
    bakeryIngredients = BakeryIngredientService.remove(bakeryIngredients, id);
    window.bakeryIngredients = bakeryIngredients;
    window.saveBakeryIngredients();
};

window.resetBakeryIngredients = function() {
    bakeryIngredients = BakeryIngredientService.reset();
    window.bakeryIngredients = bakeryIngredients;
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

    // [AI-GENERATED][REFACTOR] Preview shares the canonical ingredient calculation.
    const { grossWeight, cost: costTerpakai } = calculateIngredientMetrics(
        { category, ratio, price, pack },
        { baseFlourWeight: baseFlour, totalYield }
    );
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

// [AI-GENERATED][REFACTOR][V98] Expose the single canonical controller.
window.gantiTabMetode = gantiTabMetode;

window.setMode = setMode;
window.setProofingMode = setProofingMode;
window.setTimerByTab = setTimerByTab;
window.resetToManualInput = resetToManualInput;

// Compatibility exports untuk navigasi form resep yang dipanggil melalui action delegation.
window.bukaDetailResepBaru = bukaDetailResepBaru;
window.bukaDetailResepEksisting = bukaDetailResepEksisting;
window.kembaliKeMasterView = kembaliKeMasterView;
window.tutupHalamanResepSecaraAman = tutupHalamanResepSecaraAman;
window.filterDaftarResep = filterDaftarResep;
window.clearRecipeSearch = clearRecipeSearch;

window.perbaruiKomponenBahan = function(idBahan, properti, nilai) {
    const angkaValid = parseFloat(nilai) || 0;
    if (!Array.isArray(window.bakeryIngredients)) window.bakeryIngredients = [];

    const ing = window.bakeryIngredients.find(x => x.id === idBahan);
    if (!ing) return;
    bakeryIngredients = BakeryIngredientService.update(bakeryIngredients, idBahan, { [properti]: angkaValid });
    window.bakeryIngredients = bakeryIngredients;
    // [AI-GENERATED][REFACTOR][V35] All ingredient mutations use the canonical service.
    window.saveBakeryIngredients();

    // [AI-GENERATED][REFACTOR] Calculation now uses the same canonical metric service as total HPP.
    const baseFlourInput = document.getElementById('base-flour') || document.getElementById('base-tepung');
    const baseFlourWeight = baseFlourInput ? (parseFloat(baseFlourInput.value) || 1000) : 1000;
    const yieldInput = document.getElementById('recipe-yield') || document.getElementById('total-yield');
    const totalYield = yieldInput ? (parseFloat(yieldInput.value) || 1) : 1;
    const { grossWeight, cost } = calculateIngredientMetrics(ing, { baseFlourWeight, totalYield });

    const formatBerat = grossWeight % 1 !== 0 ? Number(grossWeight.toFixed(1)) : grossWeight;
    const costText = Math.round(cost).toLocaleString('id-ID');

    const grossEl = document.getElementById(`gross-${idBahan}`);
    if (grossEl) grossEl.innerText = formatBerat;
    const costEl = document.getElementById(`cost-${idBahan}`);
    if (costEl) costEl.innerText = costText;
    const grossTabEl = document.getElementById(`gross-table-${idBahan}`);
    if (grossTabEl) grossTabEl.innerText = formatBerat;
    const costTabEl = document.getElementById(`cost-table-${idBahan}`);
    if (costTabEl) costTabEl.innerText = costText;

    if (typeof hitungHPPBakeryTotal === 'function') {
        hitungHPPBakeryTotal();
    } else if (typeof hitungHPP === 'function') {
        hitungHPP();
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

    if (!Array.isArray(window.bakeryIngredients)) {
        console.error("window.bakeryIngredients belum diinisialisasi.");
        tampilkanErrorBahan("Data bahan belum siap. Muat ulang halaman.");
        return;
    }

    // [AI-GENERATED][REFACTOR][V35] One canonical ingredient construction + persistence path.
    const dataBahanBaru = BakeryIngredientService.createFromForm({ name, category, ratio, price, pack });
    bakeryIngredients = BakeryIngredientService.add(bakeryIngredients, dataBahanBaru);
    window.bakeryIngredients = bakeryIngredients;
    syncInventoryWithProfile();
    window.saveBakeryIngredients();

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
        // [AI-GENERATED][REFACTOR][V35] Remove through canonical ingredient service.
        const target = Array.isArray(bakeryIngredients) ? bakeryIngredients[index] : null;
        if (!target) return;
        bakeryIngredients = BakeryIngredientService.remove(bakeryIngredients, target.id);
        window.bakeryIngredients = bakeryIngredients;
        window.saveBakeryIngredients();
        syncInventoryWithProfile();

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


// Compatibility exports untuk integrasi legacy dan action delegation.

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

// [AI-GENERATED][REFACTOR][V98] Expose the single canonical analytics exporter.
window.exportSearchAnalytics = exportSearchAnalytics;

// =========================================================
// SERVICE WORKER LIFECYCLE
// [AI-GENERATED][REFACTOR]
// Registrasi/update Service Worker dipusatkan di assets/js/pwa.js agar
// tidak terjadi double registration dari app-core.js dan pwa.js.
// app-core.js hanya menangani logika aplikasi yang membutuhkan SW.
// =========================================================

// [AI-GENERATED][REFACTOR][V15] SINGLE NETWORK LIFECYCLE OWNER.
// Semua pemulihan koneksi dan antrean offline diproses sekali per event.
// [AI-GENERATED][ROBUSTNESS][V108] Single-flight network recovery. Browser/PWA
// can emit repeated online events during captive-portal/Wi-Fi transitions; do not
// start overlapping cloud sync + location refresh pipelines. The existing recipe
// FIFO remains the persistence boundary; this guard prevents redundant recovery
// pipelines from being queued in the first place.
let networkRecoveryPromise = null;

window.addEventListener('offline', () => {
    if (typeof handleOfflinePremium === 'function') {
        NotifSystem.tambah('sistem', 'Mode luring aktif', 'Tidak ada koneksi. Menggunakan data cuaca cache terakhir.', '📡');
        handleOfflinePremium();
    }
});

window.addEventListener('online', () => {
    if (networkRecoveryPromise) {
        window.DEBUG && console.log('[NetworkLifecycle] Pemulihan koneksi sudah berjalan; event online diabaikan.');
        return networkRecoveryPromise;
    }

    // [AI-GENERATED][ROBUSTNESS][V139] Capture the auth lifecycle epoch before
    // starting network recovery. A reconnect pipeline may outlive logout/login;
    // never let work started for account A continue its post-sync refresh under
    // account B. RecipeStorageService already guards cloud mutations; this guard
    // protects the surrounding Gamification/initApp side effects as well.
    const recoveryEpoch = typeof AuthService?.getLifecycleEpoch === 'function'
        ? AuthService.getLifecycleEpoch()
        : null;
    const isRecoveryCurrent = () => typeof AuthService?.isLifecycleEpochCurrent !== 'function'
        || recoveryEpoch == null
        || AuthService.isLifecycleEpochCurrent(recoveryEpoch);

    // [AI-GENERATED][ROBUSTNESS][V162] Keep the reconnect event from leaking an
    // unhandled rejection if a future recovery step (especially gamification
    // flush) fails outside its local catch. Also make cleanup identity-aware so
    // an obsolete worker cannot clear a newer single-flight marker.
    const recoveryWorker = (async () => {
        console.log('[NetworkLifecycle] Koneksi internet pulih. Memulai pemulihan data.');
        if (!isRecoveryCurrent()) return { aborted: true, reason: 'auth-changed' };

        if (typeof GamificationModule !== 'undefined' && typeof GamificationModule.flush === 'function') {
            try {
                await GamificationModule.flush();
            } catch (error) {
                console.error('[NetworkLifecycle] Flush gamifikasi gagal:', error);
            }
            if (!isRecoveryCurrent()) return { aborted: true, reason: 'auth-changed' };
        }

        if (typeof syncLocalDataToSupabase === 'function') {
            try {
                await syncLocalDataToSupabase();
            } catch (error) {
                console.error('[NetworkLifecycle] Sinkronisasi lokal gagal:', error);
            }
            if (!isRecoveryCurrent()) return { aborted: true, reason: 'auth-changed' };
        }

        if (typeof initApp === 'function' && !isFetchingLocation) {
            try {
                await initApp();
            } catch (error) {
                console.error('[NetworkLifecycle] Refresh aplikasi gagal:', error);
            }
        }

        return { aborted: false };
    })();

    let trackedRecoveryPromise;
    trackedRecoveryPromise = recoveryWorker.then(
        (result) => {
            if (networkRecoveryPromise === trackedRecoveryPromise) networkRecoveryPromise = null;
            return result;
        },
        (error) => {
            console.error('[NetworkLifecycle] Pemulihan koneksi gagal:', error);
            if (networkRecoveryPromise === trackedRecoveryPromise) networkRecoveryPromise = null;
            return { aborted: false, error: true };
        }
    );
    networkRecoveryPromise = trackedRecoveryPromise;
    return trackedRecoveryPromise;
});

// [AI-GENERATED][ROBUSTNESS][V234] Flush independent persistence domains separately.
// A rejected proofing flush must not skip gamification persistence, and each
// async flush is awaited/caught so background transitions never leak rejections.
async function flushBackgroundPersistence() {
    // [AI-GENERATED][ES6 MODULE][V270] ProofingService is a required static import;
    // call it directly instead of checking a mutable global-style binding.
    try {
        const persistenceSucceeded = await ProofingService.flushPersistence();
        if (persistenceSucceeded === false) {
            console.warn('[AppLifecycle] Sebagian state/log proofing belum tersimpan; data tertahan untuk pemulihan berikutnya.');
        }
    } catch (error) {
        console.warn('[AppLifecycle] Flush state/log proofing gagal:', error);
    }

    if (typeof GamificationModule !== 'undefined' && typeof GamificationModule.flush === 'function') {
        try {
            await GamificationModule.flush();
        } catch (error) {
            console.warn('[AppLifecycle] Flush gamifikasi gagal:', error);
        }
    }
}

// [AI-GENERATED][ROBUSTNESS][V235] Guard every synchronous background preparation step.
// A throwing clock-stop or immediate snapshot must not prevent the awaited persistence
// barrier from running; each step is isolated and reports its own failure.
async function runBackgroundLifecycleTasks({
    stopClock,
    shouldPersistTimer = false,
    persistTimer,
    flushPersistence,
    logger = console
} = {}) {
    if (typeof stopClock === 'function') {
        try {
            stopClock();
        } catch (error) {
            logger.warn('[AppLifecycle] Menghentikan pembaruan jam background gagal:', error);
        }
    }

    if (shouldPersistTimer && typeof persistTimer === 'function') {
        try {
            persistTimer();
        } catch (error) {
            logger.warn('[AppLifecycle] Snapshot timer sebelum flush gagal:', error);
        }
    }

    if (typeof flushPersistence === 'function') {
        try {
            await flushPersistence();
        } catch (error) {
            logger.warn('[AppLifecycle] Flush persistensi lifecycle gagal:', error);
        }
    }
}

// [AI-GENERATED][REFACTOR][V37] Single application lifecycle owner.
// [AI-GENERATED][ES6 MODULE][V269] Use the canonical module binding instead of resolving a mutable window facade.
// Timer persistence/restore remains in app-core; listener ownership lives in AppLifecycleService.
initializeAppLifecycle({
    onForeground: (source) => {
        // Expand the normal timer UI when Android restores the Activity from PiP.
        document.body?.classList.remove('native-pip');
        if (document.readyState === 'loading') return;
        // [AI-GENERATED][ROBUSTNESS][V60] Always reconcile persisted timer state
        // on foreground. The V57 idempotency guard prevents duplicate restore
        // work when runtime state is already active. This also recovers when
        // the WebView/native lifecycle returns with a stale runtime flag.
        if (typeof startShrunkClockUpdater === 'function') {
            startShrunkClockUpdater();
        }
        if (typeof checkAndRestoreTimer === 'function') {
            window.DEBUG && console.log(`[AppLifecycle] Foreground (${source}): reconcile timer.`);
            return checkAndRestoreTimer();
        }
    },
    onBackButton: async (source = 'native-back') => {
        const timerIsActive = Boolean(isTimerRunning && proofingTimerController.isRunning());
        if (!timerIsActive) return false;

        if (NativeCapacitorService.isNativePlatform()) {
            const pipPlugin = NativeCapacitorService.getPlugin('TimerPip');
            if (typeof pipPlugin?.enterPictureInPicture === 'function') {
                document.body?.classList.add('native-pip');
                try {
                    const result = await pipPlugin.enterPictureInPicture();
                    if (result?.entered === true) return true;
                } catch (error) {
                    console.warn('[Proofing][PiP] Android gagal masuk Picture-in-Picture:', error);
                }
                document.body?.classList.remove('native-pip');
            }
            // Do not allow the WebView to navigate away and show a browser
            // beforeunload prompt. If system PiP is rejected, minimize the Activity.
            const appPlugin = NativeCapacitorService.getPlugin('App');
            try { await appPlugin?.minimizeApp?.(); } catch (error) {
                console.warn('[Proofing][PiP] Gagal meminimalkan aplikasi:', error);
            }
            return true;
        }

        // PWA/browser Back is trapped by a history sentinel while the timer runs.
        // Try system video PiP; use the legacy in-app mini widget if activation is denied.
        const entered = await aktifkanModePIP({ fromBack: true, source });
        return entered === true;
    },
    onBackground: async () => {
        // [AI-GENERATED][ROBUSTNESS][V235] Failures while stopping the clock or
        // taking the synchronous timer snapshot cannot short-circuit durable flush.
        await runBackgroundLifecycleTasks({
            stopClock: typeof stopShrunkClockUpdater === 'function' ? stopShrunkClockUpdater : null,
            shouldPersistTimer: typeof isTimerRunning !== 'undefined' && isTimerRunning,
            persistTimer: typeof persistProofingState === 'function' ? persistProofingState : null,
            flushPersistence: flushBackgroundPersistence
        });
    }
});

// [AI-GENERATED][ROBUSTNESS][V137] pagehide can be the last reliable browser/PWA
// lifecycle signal before a page is frozen, discarded, or moved into the back/forward
// cache. Persist the absolute timer deadline synchronously through ProofingService's
// LocalStorage write-through path; do not await native Preferences from this event.
// [AI-GENERATED][NATIVE UX][V325] Android reports PiP enter/exit separately
// from appState: the Activity can remain resumed when the PiP window expands.
window.addEventListener('timerproofer:pipchange', (event) => {
    const isInPictureInPictureMode = event?.detail?.isInPictureInPictureMode === true;
    document.body?.classList.toggle('native-pip', isInPictureInPictureMode);
});

window.addEventListener('pagehide', () => {
    if (typeof isTimerRunning !== 'undefined' && isTimerRunning && typeof persistProofingState === 'function') {
        persistProofingState();
    }
});

// [AI-GENERATED][PWA BACK UX][V326] No beforeunload confirmation: the absolute timer
// deadline is persisted through pagehide/visibility lifecycle and restored on return.


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
    const bakeryName = document.getElementById('profile-bakery')?.value || "Nama Bakery";
    const finalDocTitle = `${safeFileName} - ${bakeryName}`.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
    const namaResepHtml = escapeHtmlMarkup(namaResep);
    const bakeryNameHtml = escapeHtmlMarkup(bakeryName);
    const pembuatName = document.getElementById('profile-nama-user')?.value || document.getElementById('profile-user')?.value || document.getElementById('nama-pembuat')?.value || "Pengguna";
    const pembuatNameHtml = escapeHtmlMarkup(pembuatName);

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
        stepsArray.forEach(step => { stepsHTML += `<li style="margin-bottom: 4px; font-size: 7.5pt; line-height: 1.3; text-align: justify;">${escapeHtmlMarkup(step)}</li>`; });
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
                        ${escapeHtmlMarkup(namaKategori)}
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
                    <td style="padding: 2.5px 4px; padding-left: 8px; font-size: 6.5pt;">${escapeHtmlMarkup(namaBahan)}</td>
                    <td style="text-align: center; padding: 2.5px 4px; font-size: 6.5pt;">${escapeHtmlMarkup(takaran)}</td>
                    <td style="text-align: center; padding: 2.5px 4px; font-size: 6.5pt;">${escapeHtmlMarkup(isiPack)}</td>
                    <td style="text-align: right; padding: 2.5px 4px; font-size: 6.5pt;">${escapeHtmlMarkup(hargaBeli)}</td>
                    <td style="text-align: right; padding: 2.5px 4px; font-size: 6.5pt; font-weight: 600;">${escapeHtmlMarkup(beratPakai)}</td>
                    <td style="text-align: right; font-weight: bold; color: #4E342E; padding: 2.5px 4px; font-size: 6.5pt;">${escapeHtmlMarkup(strBiaya)}</td>
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
    // Keep the source inside the viewport. html2pdf deep-clones this element;
    // off-screen coordinates (especially top:-9999px) are copied to the clone
    // and can make html2canvas capture a blank page.
    tempContainer.style.position = 'relative';
    tempContainer.style.left = '0';
    tempContainer.style.top = '0';
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
                <h1>${namaResepHtml}</h1>
            </div>
            <div style="text-align: right; font-size: 7.5pt; color: #64748b; margin-bottom: 2px;">
                <strong>Dicetak:</strong> ${tanggalCetak}
            </div>
        </div>
        
        <div class="meta-box">
            <div><strong>Pembuat:</strong> <span>${pembuatNameHtml}</span></div>
            <div><strong>Unit Usaha:</strong> <span>${bakeryNameHtml}</span></div>
            <div><strong>Status:</strong> Valid (PWA Dashboard)</div>
        </div>

        <div class="param-card-container">
            <div class="param-item" style="flex: 1.618;">
                <span class="param-label">Tepung Utama (gr)</span>
                <span class="param-value">${escapeHtmlMarkup(baseFlourVal)} g</span>
            </div>
            <div class="param-item" style="flex: 1;">
                <span class="param-label">Total Porsi</span>
                <span class="param-value">${escapeHtmlMarkup(recipeYieldVal)} pcs</span>
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
                        <div><strong style="color: #0f172a; font-size: 8pt;">📊 Margin:</strong><br>${escapeHtmlMarkup(insightPM)}</div>
                        <div><strong style="color: #0f172a; font-size: 8pt;">💰 Food Cost:</strong><br>${escapeHtmlMarkup(insightFC)}</div>
                        <div><strong style="color: #0f172a; font-size: 8pt;">🛡️ Standar:</strong><br>${escapeHtmlMarkup(insightUB)}</div>
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

    // Keep the print element detached until the progress overlay is ready.
    // 8. Render Canvas (Pie Chart)
    const canvasEl = tempContainer.querySelector('#pdf-pie-canvas');
    if (canvasEl) {
        const ctx = canvasEl.getContext('2d');
        if (ctx) {
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
    }

    // 9. Eksekusi PDF Download
    if (window.__TP_PREMIUM_PDF_EXPORTING__ === true) return false;
    window.__TP_PREMIUM_PDF_EXPORTING__ = true;

    const exportOverlay = document.createElement('div');
    exportOverlay.setAttribute('role', 'status');
    exportOverlay.setAttribute('aria-live', 'polite');
    exportOverlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:rgba(253,245,230,.97);color:#4E342E;font:700 14px/1.5 system-ui,sans-serif;text-align:center;';
    exportOverlay.innerHTML = '<div style="max-width:280px;padding:20px;border:1px solid #F2D2A9;border-radius:16px;background:#fff;box-shadow:0 8px 28px rgba(78,52,46,.12);"><div style="font-size:28px;margin-bottom:8px;">📄</div><div>Sedang menyiapkan laporan PDF...</div><div style="font-size:12px;font-weight:500;color:#8D6E63;margin-top:5px;">Mohon jangan tutup halaman ini.</div></div>';
    document.body.appendChild(exportOverlay);
    document.body.appendChild(tempContainer);

    return (async () => {
        try {
            // Let the browser calculate layout before html2pdf clones the document.
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const exportHeight = Math.max(tempContainer.scrollHeight, tempContainer.offsetHeight, 1123);
            const { pdf } = await PdfRenderService.renderElementToPdf(tempContainer, {
                scale: 2.5,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 794,
                windowHeight: exportHeight,
                scrollX: 0,
                scrollY: 0,
                logging: false
            }, { orientation: 'p', unit: 'mm', format: 'a4' });
            if (!pdf || typeof pdf.save !== 'function') {
                throw new Error('Dokumen PDF tidak berhasil dibuat.');
            }
            pdf.save(`${finalDocTitle || 'Laporan_Resep'}.pdf`);
            return true;
        } catch (err) {
            console.error("Gagal merender PDF: ", err);
            alert(`Laporan PDF belum dapat dibuat: ${err?.message || 'Kesalahan renderer'}`);
            return false;
        } finally {
            tempContainer.remove();
            exportOverlay.remove();
            window.__TP_PREMIUM_PDF_EXPORTING__ = false;
        }
    })();
};

/**
 * [AI-GENERATED][FEATURE][V323]
 * Print a saved recipe with the same Premium PDF template used by the editor.
 * Temporarily hydrates the hidden recipe editor, awaits the PDF render, then
 * restores the user's in-progress editor state without persisting the snapshot.
 */
window.cetakResepTersimpanPremium = async function(resep) {
    if (!resep || typeof resep !== 'object') {
        console.warn('[RecipePrint] Data resep tersimpan tidak valid.');
        return false;
    }
    if (window.__TP_PREMIUM_PDF_EXPORTING__ === true) {
        if (typeof showToast === 'function') showToast('Laporan lain sedang dibuat. Coba kembali setelah selesai.');
        return false;
    }

    const fieldIds = ['recipe-save-name', 'base-flour', 'recipe-yield', 'input-harga-jual'];
    const fieldSnapshot = Object.fromEntries(fieldIds.map((id) => {
        const element = document.getElementById(id);
        return [id, element ? element.value : null];
    }));
    const cloneArray = (value) => {
        try { return JSON.parse(JSON.stringify(Array.isArray(value) ? value : [])); }
        catch { return []; }
    };
    const previousIngredients = cloneArray(bakeryIngredients);
    const previousSteps = cloneArray(activeRecipeSteps);
    const previousCategoryState = { ...(window.statusKategoriResep || {}) };
    const previousFoodCost = window.currentFoodCostPersen;

    const setField = (id, value) => {
        const element = document.getElementById(id);
        if (element && value != null) element.value = String(value);
    };
    const waitForLayout = () => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    try {
        const ingredients = cloneArray(resep.bahanBaku || resep.ingredients || resep.bahan || resep.komposisi);
        const steps = cloneArray(resep.langkahProduksi || resep.productionSteps);

        setField('recipe-save-name', resep.nama || resep.name || 'RESEP PRODUKSI');
        setField('base-flour', resep.tepungUtama ?? resep.flourWeight ?? 1000);
        setField('recipe-yield', resep.targetYield ?? 1);
        setField('input-harga-jual', resep.hargaJual ?? resep.salePrice ?? 0);

        bakeryIngredients = ingredients;
        window.bakeryIngredients = ingredients;
        activeRecipeSteps = steps;
        window.activeRecipeSteps = steps;

        const allCategories = [
            'Bahan Kering', 'Bahan Basah', 'Bahan Pengembang',
            'Bahan Tambahan', 'Bahan Toping', 'Kemasan'
        ];
        window.statusKategoriResep = { ...previousCategoryState };
        allCategories.forEach((category) => { window.statusKategoriResep[category] = true; });

        if (typeof renderRecipeTableBakuTotal === 'function') renderRecipeTableBakuTotal();
        if (typeof renderLangkahProduksi === 'function') renderLangkahProduksi();
        if (typeof hitungHPPBakeryTotal === 'function') hitungHPPBakeryTotal();
        await waitForLayout();

        const result = await window.eksekusiCetakPremium();
        if (result !== true) return false;
        return true;
    } catch (error) {
        console.error('[RecipePrint] Gagal mencetak resep tersimpan:', error);
        if (typeof showToast === 'function') showToast('Laporan resep gagal disiapkan. Silakan coba lagi.');
        return false;
    } finally {
        fieldIds.forEach((id) => {
            const element = document.getElementById(id);
            if (element && fieldSnapshot[id] !== null) element.value = fieldSnapshot[id];
        });

        bakeryIngredients = previousIngredients;
        window.bakeryIngredients = previousIngredients;
        activeRecipeSteps = previousSteps;
        window.activeRecipeSteps = previousSteps;
        window.statusKategoriResep = previousCategoryState;

        if (typeof renderRecipeTableBakuTotal === 'function') renderRecipeTableBakuTotal();
        if (typeof renderLangkahProduksi === 'function') renderLangkahProduksi();
        if (typeof hitungHPPBakeryTotal === 'function') hitungHPPBakeryTotal();
        if (previousFoodCost !== undefined) window.currentFoodCostPersen = previousFoodCost;
    }
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

});

// [AI-GENERATED][REFACTOR][V16] swapRightStats memiliki satu implementasi kanonik.
// Deklarasi fungsi berada pada module scope sehingga fallback legacy tidak pernah diperlukan.
window.swapRightStats = swapRightStats;


// [AI-GENERATED][ROBUSTNESS][V109] Lifecycle-safe updater for the compact time label.
// The previous anonymous setInterval could keep running while the WebView was
// backgrounded. Keep one named handle so lifecycle callbacks can stop/restart it
// deterministically without changing the existing UI contract.
let shrunkClockIntervalId = null;

function startShrunkClockUpdater() {
    if (typeof perbaruiKeteranganWaktuShrunk !== 'function') return;
    if (shrunkClockIntervalId !== null) return;

    perbaruiKeteranganWaktuShrunk();
    shrunkClockIntervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
            perbaruiKeteranganWaktuShrunk();
        }
    }, 30000);
}

function stopShrunkClockUpdater() {
    if (shrunkClockIntervalId === null) return;
    clearInterval(shrunkClockIntervalId);
    shrunkClockIntervalId = null;
}

/**
 * [AI-GENERATED][ROBUSTNESS][V323]
 * Bind the compact location header independently from the long application
 * DOMContentLoaded initializer. app-core can be evaluated after DCL when the
 * ES-module graph is delayed, so the old nested-only binding could be missed.
 * Observe the real scroll target (including nested scrollers), plus wheel and
 * touch gestures as a WebView fallback.
 */
function initLocationHeaderShrinkBehavior() {
    const header = document.getElementById('location-section');
    const appContainer = document.getElementById('app-container');
    const initialScrollArea = appContainer?.querySelector(':scope > .scrollable-content')
        || appContainer?.querySelector('.scrollable-content');
    if (!header || !appContainer || !initialScrollArea) return false;
    if (header.dataset.tpLocationShrinkBound === 'v324') return true;

    header.dataset.tpLocationShrinkBound = 'v324';

    // Resolve the main page scroller on every interaction. This also survives
    // a future render replacing the .scrollable-content node.
    const getMainScrollArea = () => appContainer.querySelector(':scope > .scrollable-content')
        || appContainer.querySelector('.scrollable-content')
        || initialScrollArea;

    const isMainContentTarget = (target) => {
        if (!(target instanceof Element)) return false;
        const area = getMainScrollArea();
        return target === appContainer || target === area || Boolean(area?.contains(target));
    };

    const getScrollTop = (eventTarget = null) => {
        const area = getMainScrollArea();
        const values = [
            Number(area?.scrollTop) || 0,
            Number(appContainer.scrollTop) || 0,
            Number(document.scrollingElement?.scrollTop) || 0,
            Number(document.documentElement?.scrollTop) || 0,
            Number(document.body?.scrollTop) || 0,
            Number(window.scrollY) || 0
        ];

        // Some WebViews dispatch scroll from an inner scrollable descendant.
        // Inspect its ancestors up to the app root, not unrelated modal panes.
        let node = eventTarget instanceof Element ? eventTarget : null;
        while (node && appContainer.contains(node)) {
            if (node.scrollHeight > node.clientHeight + 1) {
                const overflowY = window.getComputedStyle(node).overflowY;
                if (node === area || /auto|scroll|overlay/.test(overflowY)) {
                    values.push(Number(node.scrollTop) || 0);
                }
            }
            if (node === appContainer) break;
            node = node.parentElement;
        }
        return Math.max(...values);
    };

    const setShrunk = (shouldShrink) => {
        const wasShrunk = header.classList.contains('shrunk');
        if (wasShrunk === shouldShrink) return;
        header.classList.toggle('shrunk', shouldShrink);
        if (shouldShrink && typeof updateMiniHeader === 'function') updateMiniHeader();
    };

    const syncFromScroll = (eventTarget = null) => {
        setShrunk(getScrollTop(eventTarget) > 24);
    };

    let framePending = false;
    let pendingTarget = null;
    const onScroll = (event) => {
        const target = event?.target;
        const isViewportScrollTarget = target === document || target === document.documentElement || target === document.body;
        if (!isViewportScrollTarget && !isMainContentTarget(target)) return;
        pendingTarget = target instanceof Element ? target : null;
        if (framePending) return;
        framePending = true;
        requestAnimationFrame(() => {
            framePending = false;
            syncFromScroll(pendingTarget);
            pendingTarget = null;
        });
    };

    // Capture catches non-bubbling scroll from current and future descendants.
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    initialScrollArea.addEventListener('scroll', onScroll, { passive: true });
    appContainer.addEventListener('scroll', onScroll, { passive: true });

    // Wheel fallback: shrink immediately on a downward gesture even in WebViews
    // that delay or omit the expected scroll event; expand after returning top.
    const onWheel = (event) => {
        if (!isMainContentTarget(event.target)) return;
        if (event.deltaY > 6) setShrunk(true);
        else if (event.deltaY < -6) {
            requestAnimationFrame(() => syncFromScroll(event.target));
        }
    };
    document.addEventListener('wheel', onWheel, { capture: true, passive: true });

    let lastTouchY = null;
    const onTouchStart = (event) => {
        if (!isMainContentTarget(event.target)) {
            lastTouchY = null;
            return;
        }
        lastTouchY = event.touches?.[0]?.clientY ?? null;
    };
    const onTouchMove = (event) => {
        if (!isMainContentTarget(event.target)) return;
        const currentY = event.touches?.[0]?.clientY;
        if (!Number.isFinite(currentY) || !Number.isFinite(lastTouchY)) return;
        const fingerDelta = currentY - lastTouchY;
        if (fingerDelta < -12) setShrunk(true);
        else if (fingerDelta > 12) {
            requestAnimationFrame(() => syncFromScroll(event.target));
        }
        lastTouchY = currentY;
    };
    const onTouchEnd = () => { lastTouchY = null; };
    document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: true });
    document.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true });

    window.addEventListener('pageshow', () => syncFromScroll(), { passive: true });
    window.addEventListener('resize', () => syncFromScroll(), { passive: true });
    syncFromScroll();

    window.__TP_LOCATION_SHRINK_READY__ = true;
    return true;
}

// Bind whether this module is evaluated before or after DOMContentLoaded.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLocationHeaderShrinkBehavior, { once: true });
} else {
    initLocationHeaderShrinkBehavior();
}


// [AI-GENERATED][REGRESSION FIX][V325] Bind essential timer controls even when
// app-core is evaluated after DOMContentLoaded by the asynchronous ES-module boot chain.
let proofingControlsInitialized = false;
function initProofingControlBindings() {
    if (proofingControlsInitialized) return true;
    const startButton = document.getElementById('main-start-btn');
    const setButton = document.getElementById('set-btn');
    const customInput = document.getElementById('custom-time');
    const modeButtons = document.querySelectorAll('.mode-btn[id^="btn-mode-"]');

    modeButtons.forEach((button) => {
        if (button.dataset.tpProofingModeBound === 'v325') return;
        button.dataset.tpProofingModeBound = 'v325';
        bindReplaceableClick(button, () => {
            const mode = button.id.replace('btn-mode-', '');
            if (typeof setMode === 'function') setMode(mode);
        });
    });

    if (setButton && setButton.dataset.tpCustomTimeBound !== 'v325') {
        setButton.dataset.tpCustomTimeBound = 'v325';
        bindReplaceableClick(setButton, () => {
            if (typeof setCustomTime === 'function') setCustomTime();
        });
    }

    if (customInput && customInput.dataset.tpCustomTimeEnterBound !== 'v325') {
        customInput.dataset.tpCustomTimeEnterBound = 'v325';
        customInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (typeof setCustomTime === 'function') setCustomTime();
        });
    }

    if (startButton && startButton.dataset.tpProofingStartBound !== 'v325') {
        startButton.dataset.tpProofingStartBound = 'v325';
        bindReplaceableClick(startButton, () => {
            // Do not await notification permission here: the countdown must start
            // synchronously from the user's gesture. Notification service requests
            // permission independently while scheduling the native alarm.
            if (typeof triggerMainProofing === 'function') {
                triggerMainProofing();
            } else {
                console.warn('[Proofing] triggerMainProofing belum tersedia.');
            }
        });
    }

    proofingControlsInitialized = Boolean(startButton || setButton || customInput || modeButtons.length);
    return proofingControlsInitialized;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProofingControlBindings, { once: true });
} else {
    initProofingControlBindings();
}

/**
 * =========================================================================
 * INISIALISASI UTAMA APLIKASI (SINGLE DOMCONTENTLOADED EVENT)
 * Semua pengikatan elemen UI, Event Listener, dan restore data digabung di sini
 * =========================================================================
 */
document.addEventListener("DOMContentLoaded", async () => {
    window.DEBUG && console.log("🚀 Memulai inisialisasi modul Timer Proofer & Kalkulator HPP...");

    // [AI-GENERATED][REFACTOR][V33] Initial session/UI state is owned by auth-service.js.

    // -----------------------------------------------------------------
    // 1. INI-AWAL GLOBAL & CORE SYSTEM DISPLAY
    // -----------------------------------------------------------------
    if (typeof initArticleSlider === 'function') {
        initArticleSlider();
    }
    if (typeof inisialisasiFormTambahBahan === 'function') {
        inisialisasiFormTambahBahan();
    }

    // [AI-GENERATED][REFACTOR][V35] Hydrate native Preferences after DOM is ready.
    // LocalStorage remains the immediate synchronous fallback for first paint.
    void BakeryIngredientService.load().then((ingredients) => {
        if (!Array.isArray(ingredients)) return;
        bakeryIngredients = ingredients;
        window.bakeryIngredients = bakeryIngredients;
        if (typeof window.renderRecipeTable === 'function') window.renderRecipeTable();
        if (typeof window.hitungHPP === 'function') window.hitungHPP();
    }).catch((error) => console.warn('[BakeryIngredientService] Hydration gagal:', error));
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

    // [AI-GENERATED][ROBUSTNESS][V109] Keep the lightweight clock updater lifecycle-safe.
    // A single interval is reused while the app is visible and is stopped in the
    // background to avoid unnecessary WebView wakeups/battery use.
    if (typeof startShrunkClockUpdater === 'function') {
        startShrunkClockUpdater();
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
    // [AI-GENERATED][REFACTOR] BLE buttons use data-action/event-delegation;
    // the old direct listener was redundant and could trigger a connection twice.

    // [AI-GENERATED][ROBUSTNESS][V324] The independent initializer also runs after delayed module evaluation.
    initLocationHeaderShrinkBehavior();

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

    // Mini stats swap is delegated independently by initMiniStatsSwapBinding().

    const overlayArtikel = document.querySelector('.article-modal-overlay');
    if (overlayArtikel) {
        overlayArtikel.addEventListener('click', function(event) {
            if (event.target === overlayArtikel) {
                if (typeof tutupArtikelSecaraAman === 'function') tutupArtikelSecaraAman();
                else if (typeof tutupArtikelLengkap === 'function') tutupArtikelLengkap();
            }
        });
    }

    // Timer controls are initialized independently above so late ES-module
    // evaluation cannot miss DOMContentLoaded or block START on notification permission.

    // -----------------------------------------------------------------
    // 7. REAL-TIME KALKULATOR RESEP & DATABASE BINDING
    // -----------------------------------------------------------------
    const recipeContainer = document.getElementById('recipe-cards-container');
    if (recipeContainer) {
        recipeContainer.addEventListener('input', function(event) {
            const inputField = event.target?.closest?.('input');
            if (!inputField) return;

            // [AI-GENERATED][REFACTOR] data-oninput is the canonical delegated path.
            // This listener remains only as a compatibility fallback for legacy cards.
            if (inputField.hasAttribute('data-oninput')) return;

            const recipeCard = inputField.closest('.recipe-card[data-id]') || inputField.closest('[data-id]');
            if (!recipeCard) return;

            const indexBahan = recipeCard.getAttribute('data-id');
            const dataArray = Array.isArray(window.bakeryIngredients) ? window.bakeryIngredients : null;
            if (!dataArray || indexBahan === null || !dataArray[indexBahan]) return;

            const allInputs = recipeCard.querySelectorAll('input');
            if (allInputs.length < 3) return;
            const target = dataArray[indexBahan];
            const patch = {
                ratio: parseFloat(allInputs[0].value) || 0,
                price: parseFloat(allInputs[1].value) || 0,
                pack: parseFloat(allInputs[2].value) || 1
            };
            bakeryIngredients = BakeryIngredientService.update(dataArray, target.id, patch);
            window.bakeryIngredients = bakeryIngredients;
            window.saveBakeryIngredients();
            hitungHPPBakeryTotal();
        });
    }

    // Tombol DB Simpan/Muat/Impor Resep
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

    // #btn-recipe-close-top is handled through the canonical data-action delegation.

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

// [AI-GENERATED][REFACTOR][V15] Queue resep offline ditangani oleh unified online lifecycle.

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
        
        // [AI-GENERATED][REFACTOR][V25] Export reads from the canonical recipe persistence service.
        dataResepArray = await RecipeStorageService.read();

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
                // [AI-GENERATED][REFACTOR][V25] Import writes only through the canonical recipe persistence service.
                await RecipeStorageService.saveList(dataParsed, { maxItems: window.MAX_RESEP_TERSIMPAN || 10 });

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
        markRecipeEditorContextChanged();
        terapkanResepKeKalkulator(resep);
        await restoreRecipePhotosForRecipe(resep);
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

// [AI-GENERATED][REFACTOR] Canonical recipe deletion is eksekusiHapusResepMaster below.

// 4. FUNGSI RENDER (MENAMPILKAN DAFTAR KE HTML)

window.muatResepTersimpan = async function(resepId) {
    try {
        console.log("Mencari data resep dengan ID:", resepId);
        let savedRecipes = [];

        // [AI-GENERATED][REFACTOR][V24] Canonical local recipe storage.
        // [AI-GENERATED][REFACTOR] Final read also uses the canonical persistence service.
        if (!savedRecipes || savedRecipes.length === 0) {
            savedRecipes = await bacaSemuaResepDariPerangkat();
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
            // [AI-GENERATED][REFACTOR][V199] Scroll state is centralized in modal-bootstrap.js.
            syncModalBodyScrollLock();
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


window.cetakLaporanPdfNative = async function() {
    const element = document.getElementById('konten-pdf');
    if (!element) {
        console.warn("Elemen #konten-pdf tidak ditemukan.");
        return false;
    }

    try {
        // [AI-GENERATED][ES6 MODULE][V258] The module adapter owns access to the legacy html2pdf bridge.
        const base64Murni = await PdfExportService.createPdfBase64(element);
        await simpanPdfNative(base64Murni, 'Laporan_Proofing.pdf');
        return true;
    } catch (error) {
        // [AI-GENERATED][ROBUSTNESS][V258] Keep browser/native export failures explicit and retryable.
        console.error('[PDF] Gagal menghasilkan PDF:', error);
        alert('Gagal membuat PDF. Silakan coba lagi.');
        return false;
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
        <div data-action="bukaDetailResepBaru" style="background:#fff;border:2px dashed #E67E22;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;box-shadow:0 2px 6px rgba(230,126,34,.05);">
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

            // [AI-GENERATED][SECURITY][V215] Keep raw text for dialogs/sharing and
            // use escaped copies only in HTML text contexts. Imported/cloud values
            // must never be interpolated into innerHTML or document.write unescaped.
            const namaResep = String(resep.nama || resep.name || '').trim() || 'Tanpa Nama';
            const namaResepHtml = escapeHtmlMarkup(namaResep);
            const tepungUtama = resep.tepungUtama || 1000;
            const tepungUtamaHtml = escapeHtmlMarkup(tepungUtama);
            const targetYield = resep.targetYield || 1;
            const targetYieldHtml = escapeHtmlMarkup(targetYield);
            const waktuSimpan = typeof formatTanggalResep === 'function' ? formatTanggalResep(resep.waktuSimpan || resep.updated_at) : (resep.waktuSimpan || '-');
            const waktuSimpanHtml = escapeHtmlMarkup(waktuSimpan);

            card.innerHTML = `
                <div style="min-width:0; flex:1; padding-right:8px;">
                    <strong style="font-size:.9rem;color:var(--chocolate);display:block;margin-bottom:2px;">${namaResepHtml}</strong>
                    <small style="color:#64748b;font-size:.72rem;">Terigu: ${tepungUtamaHtml}g | Porsi: ${targetYieldHtml} pcs</small><br>
                    <small style="color:#94a3b8;font-size:.68rem;">Disimpan: ${waktuSimpanHtml}</small>
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

            card.querySelector('.recipe-load-btn').addEventListener('click', async () => {
                // "MUAT": buka resep ini ke layar kalkulator sebagai TITIK AWAL,
                // TANPA menandainya sebagai resep yang sedang diedit. Jadi kalau
                // pengguna menyimpan, tersimpan sebagai resep BARU -- resep asli
                // yang ada di daftar tidak ikut tertimpa/berubah.
                markRecipeEditorContextChanged();
                currentEditingRecipeId = null;

                if (typeof terapkanResepKeKalkulator === 'function') terapkanResepKeKalkulator(resep);
                await restoreRecipePhotosForRecipe(resep);

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

                // [AI-GENERATED][ROBUSTNESS][V274] The copy is committed in the
                // canonical recipe queue. Do not mutate/render the UI until local
                // persistence succeeds, and use the exact persisted list if the
                // storage-limit fallback had to trim older recipes.
                const duplicatedRecipe = RecipeDomainService.duplicate(resep);
                let copyResult;
                try {
                    copyResult = await RecipeStorageService.duplicateAndSave(duplicatedRecipe, {
                        maxItems: window.MAX_RESEP_TERSIMPAN || 10
                    });
                } catch (persistError) {
                    console.error('[RecipeCopy] Gagal menyimpan salinan resep:', persistError);
                    if (typeof showToast === 'function') {
                        showToast('Resep gagal disalin karena penyimpanan lokal tidak berhasil.');
                    }
                    return;
                }

                // [AI-GENERATED][ROBUSTNESS][V274] Do not repaint the recipe list
                // if logout/account switching completed while the save was pending.
                const activeCopyOwnerId = RecipeStorageService.getActiveOwnerId?.() ?? null;
                if (!activeCopyOwnerId || String(activeCopyOwnerId) !== String(copyResult.ownerId)) {
                    console.warn('[RecipeCopy] Hasil salinan tidak dirender karena sesi pemilik telah berubah.');
                    return;
                }

                daftarResep = copyResult.recipes;
                // Render ulang hanya setelah data lokal terkonfirmasi tersimpan.
                renderList(daftarResep);

                if (typeof showToast === 'function') {
                    showToast(copyResult.truncated
                        ? 'Resep disalin. Daftar lama diringkas karena batas penyimpanan. 📄'
                        : 'Resep berhasil digandakan! 📄');
                }

                // [AI-GENERATED][ES6 MODULE][V274] Resolve the stable client through
                // AuthService and preserve the operation owner across cloud sync.
                const client = getAppSupabaseClient();
                if (navigator.onLine && client?.auth && copyResult.ownerId) {
                    try {
                        await RecipeStorageService.syncRecipeToSupabase(
                            client,
                            duplicatedRecipe,
                            copyResult.ownerId
                        );
                    } catch (err) {
                        console.warn('Salinan tersimpan lokal; sinkronisasi cloud gagal:', err);
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

            card.querySelector('.recipe-print-btn').addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const dropdown = card.querySelector('.recipe-dropdown-menu');
                const menuWrapper = card.querySelector('.recipe-menu-wrapper');
                if (dropdown) dropdown.style.display = 'none';
                menuWrapper?.classList.remove('active');

                const printButton = event.currentTarget;
                const originalLabel = printButton.textContent;
                printButton.disabled = true;
                printButton.textContent = 'Menyiapkan PDF...';
                try {
                    const completed = await window.cetakResepTersimpanPremium(resep);
                    if (completed && typeof showToast === 'function') {
                        showToast(`Laporan premium resep "${namaResep}" berhasil dibuat.`);
                    }
                } finally {
                    printButton.disabled = false;
                    printButton.textContent = originalLabel;
                }
            });

            card.querySelector('.recipe-delete-btn').addEventListener('click', async () => {
                if (!confirm(`Hapus resep "${namaResep}" permanen?`)) return;
                // [AI-GENERATED][ROBUSTNESS][V91] Use the canonical delete
                // boundary for both local and cloud persistence. The service
                // already performs local deletion and authenticated-owner
                // validation before any cloud mutation.
                try {
                    const deleteResult = await RecipeStorageService.deleteEverywhere(
                        getAppSupabaseClient(),
                        resep.id
                    );
                    daftarResep = Array.isArray(deleteResult?.recipes)
                        ? deleteResult.recipes
                        : daftarResep.filter(item => String(item.id) !== String(resep.id));

                    // [AI-GENERATED][ROBUSTNESS][V148] This secondary recipe-list
                    // delete UI must use the same owner returned by the canonical
                    // destructive boundary. Without this cleanup, the recipe JSON
                    // could disappear while its owner-scoped IndexedDB photos
                    // remain orphaned indefinitely.
                    const photoOwnerId = deleteResult?.ownerId || null;
                    if (!deleteResult?.aborted
                        && photoOwnerId
                        && RecipePhotoPersistenceService?.deleteRecipePhotos) {
                        try {
                            await RecipePhotoPersistenceService.deleteRecipePhotos(photoOwnerId, resep.id);
                        } catch (photoError) {
                            console.warn('[RecipePhotoPersistence] Gagal membersihkan foto resep terhapus:', photoError);
                        }
                    }
                } catch (error) {
                    // [AI-GENERATED][ROBUSTNESS][V148] A durable tombstone means
                    // the destructive intent is safely recorded even if cloud
                    // DELETE failed; local photo cleanup may therefore proceed
                    // without consulting a potentially changed auth session.
                    if (error?.pendingDeletePersisted
                        && error?.ownerId
                        && RecipePhotoPersistenceService?.deleteRecipePhotos) {
                        try {
                            await RecipePhotoPersistenceService.deleteRecipePhotos(error.ownerId, resep.id);
                        } catch (photoError) {
                            console.warn('[RecipePhotoPersistence] Gagal membersihkan foto setelah tombstone durable:', photoError);
                        }
                    }
                    console.warn('Gagal hapus resep:', error);
                    return;
                }

                renderList(daftarResep);
            });

            container.appendChild(card);
        }
    }

    // Render awal instan dari lokal
    renderList(daftarResep);
    container.scrollTop = scrollPos;

    // 3. SINKRONISASI CLOUD DI BACKGROUND (TIDAK MERUSAK UI KELIHATAN)
    const recipeSyncClient = getAppSupabaseClient();
    if (navigator.onLine && recipeSyncClient?.auth) {
        try {
            const result = await RecipeStorageService.syncFromSupabase(recipeSyncClient);
            if (result.changed) {
                daftarResep = result.recipes;
                renderList(daftarResep);
            }
        } catch (error) {
            console.warn('Sinkronisasi cloud dilewati:', error);
        }
    }
};

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

// Compatibility exports untuk action delegation dan integrasi legacy.
window.handleTimerClick = handleTimerClick;
window.initApp = initApp;
// [AI-GENERATED][REFACTOR][V33] Auth lifecycle hooks keep Supabase session effects out of app-core listener ownership.
window.__TPAuthLifecycleHooks = {
    onSignedIn: async (session, epoch) => {
        if (!session?.user) return;

        // [AI-GENERATED][ROBUSTNESS][V82] AuthService owns the lifecycle epoch.
        // Every async boundary below revalidates it so a login pipeline that is
        // superseded by logout cannot continue syncing data or restoring the app.
        const isCurrent = () => typeof AuthService?.isLifecycleEpochCurrent !== 'function'
            || AuthService.isLifecycleEpochCurrent(epoch);
        if (!isCurrent()) return;

        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
            if (!isCurrent()) return;
        }
        // [AI-GENERATED][ROBUSTNESS][V133] Bind local recipe persistence to the
        // authenticated account before any cloud/local synchronization begins.
        // [AI-GENERATED][SECURITY][V254] Establish profile cache ownership before
        // any authenticated UI path can read or write locally persisted profile data.
        if (typeof ProfileDataService?.setOwner === 'function') {
            await ProfileDataService.setOwner(session.user.id);
            if (!isCurrent()) return;
        }
        if (typeof RecipeStorageService?.setOwner === 'function') {
            await RecipeStorageService.setOwner(session.user.id);
            if (!isCurrent()) return;
        }
        if (typeof GamificationModule !== 'undefined' && typeof GamificationModule.init === 'function') {
            GamificationModule.init(getAppSupabaseClient(), session.user.id);
        }
        if (typeof sinkronisasiAwalDariSupabase === 'function') {
            await sinkronisasiAwalDariSupabase();
            if (!isCurrent()) return;
        }
        if (typeof syncLocalDataToSupabase === 'function') {
            await syncLocalDataToSupabase();
            if (!isCurrent()) return;
        }
        if (typeof initSupabaseRealtime === 'function') {
            await initSupabaseRealtime();
            if (!isCurrent()) return;
        }
        if (typeof initApp === 'function') {
            await initApp();
            if (!isCurrent()) return;
        }
    },
    onSignedOut: async (epoch) => {
        // [AI-GENERATED][ROBUSTNESS][V85] Do not let stale logout cleanup
        // continue after a rapid re-login starts a newer auth lifecycle.
        const isCurrent = () => typeof AuthService?.isLifecycleEpochCurrent !== 'function'
            || AuthService.isLifecycleEpochCurrent(epoch);
        if (!isCurrent()) return;

        // [AI-GENERATED][SECURITY][V254] Close profile reads synchronously at the
        // signed-out boundary, before any awaited cleanup can yield to other work.
        if (typeof ProfileDataService?.clearOwner === 'function') {
            ProfileDataService.clearOwner();
        }
        if (typeof GamificationModule !== 'undefined' && typeof GamificationModule.reset === 'function') {
            GamificationModule.reset();
        }
        if (typeof stopSupabaseRealtime === 'function') await stopSupabaseRealtime();
        if (!isCurrent()) return;
        if (typeof resetProofingRuntime === 'function') await resetProofingRuntime('signed-out');
        if (!isCurrent()) return;
        // [AI-GENERATED][ROBUSTNESS][V133] Stop exposing the previous account's
        // recipe namespace to post-logout local callers.
        if (typeof RecipeStorageService?.clearOwner === 'function') {
            await RecipeStorageService.clearOwner();
        }
    }
};

async function stopSupabaseRealtime() {
    const client = getAppSupabaseClient();
    if (globalResepChannel && client?.removeChannel) {
        await client.removeChannel(globalResepChannel);
        globalResepChannel = null;
    }
}

async function resetProofingRuntime(reason = 'reset') {
    // [AI-GENERATED][ROBUSTNESS][V80] A lifecycle/auth reset is a real timer
    // mutation. Invalidate any asynchronous restore transaction before clearing
    // persistence so a stale read can never resurrect the signed-out/reset timer.
    timerStateMutationEpoch += 1;

    proofingTimerController.stop();
    timerInterval = null;
    isTimerRunning = false;
    globalTotalSeconds = 0;
    globalInitialSeconds = 0;
    totalDurationMinutes = 0;
    currentSelectedBaseDuration = 0;

    ProofingAlarmService.stopAll();
    ProofingCompletionService.reset();
    await ProofingNotificationService.cancel();
    await ProofingService.clearState();
    window.DEBUG && console.log('[Proofing] runtime reset:', reason);
}

window.connectEnvironmentalSensor = connectEnvironmentalSensor;
window.triggerMainProofing = triggerMainProofing;
window.startProofing = startProofing;


// Catatan: showToast (versi toast bertema, bukan alert) didefinisikan di script
// biasa paling bawah file (bukan di sini) supaya tidak menimpa versi alert() lama.


// [AI-GENERATED][REFACTOR][V19] Global toggleModal ownership remains in modal-bootstrap.js.
// Internal app-core calls use the imported toggleModal binding directly.

// [AI-GENERATED][BUG FIX][V249] Render the supplied achievement content as text.
// textContent avoids interpreting user- or server-provided strings as markup.
window.tampilkanPopupAchievement = function(judul, desc) {
    const popup = document.getElementById('achievement-popup');
    if (!popup) {
        console.warn('[Achievement] Elemen #achievement-popup tidak ditemukan.');
        return false;
    }

    const titleElement = document.getElementById('achievement-title');
    const descriptionElement = document.getElementById('ach-desc');

    if (titleElement && judul != null) titleElement.textContent = String(judul);
    if (descriptionElement && desc != null) descriptionElement.textContent = String(desc);

    popup.classList.add('show');
    return true;
}

// Listener mode proofing sudah diikat sekali di blok TIMER CONTROLS (setMode).

window.selectProduct = selectProduct;
window.tutupPopupSukses = tutupPopupSukses;
window.mintaAnalisisAISungguhan = mintaAnalisisAISungguhan;
window.kirimSaran = kirimSaran;


