/**
 * Entry ES module untuk Timer Proofer.
 * [AI-GENERATED][REFACTOR] Controllers with independent UI responsibility load before app-core.
 */
// [AI-GENERATED][REFACTOR][V37] Activate bundled Capacitor plugin proxies before feature services.
// This keeps native App/Filesystem/Share/Preferences/LocalNotifications available
// without requiring global script tags in index.html.
import '../../vendor/capacitor-plugins.js';
import './tipsData.js';
import './lang-data.js';
import './lang-packs.js';
import './language-engine.js';
import './lang-renderer.js';
import './pwa.js';
import './app-lifecycle-service.js';
// [AI-GENERATED][REFACTOR][V38] Native plugin bridge is initialized before consumers.
import './native-capacitor-service.js';
import './module-manifest.js';
import './ai-formatters.js';
import './api-client-service.js';
import './ai-service.js';
import './weather-service.js';
import './storage-service.js';
import './recipe-storage-service.js';
import './recipe-domain-service.js';
import './bakery-ingredient-service.js';
import './proofing-service.js';
import './proofing-timer-controller.js';
import './proofing-notification-service.js';
import './proofing-alarm-service.js';
import './proofing-completion-service.js';
import './profile-service.js';
import './auth-service.js';
import './recipe-calculator.js';
import './ingredient-ui-service.js';
import './recipe-photo-service.js';
import './notification-service.js';

// [AI-GENERATED][REFACTOR] Feature entry modules are loaded explicitly before the legacy core facade.
import './features-onboarding.js';
import './features-bluetooth-thermometer.js';
import './features-preferences.js';
import './features-auth-ui.js?v=20261030-v321';

// [AI-GENERATED][REFACTOR] Modal controller owns modal clicks independently from app-core.
import './modal.js';
import './core/event-delegation.js';
import './app-core.js';

