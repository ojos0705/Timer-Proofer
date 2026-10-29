/**
 * Entry ES module untuk Timer Proofer.
 * Urutan impor menjaga dependensi: data → i18n → PWA → aplikasi → delegasi klik.
 */
import './tipsData.js';
import './lang-data.js';
import './lang-packs.js';
import './offline-i18n.js';
import './language-engine.js';
import './lang-renderer.js';
import './pwa.js';
import './app-core.js';
import './core/onclick-migration.js';
