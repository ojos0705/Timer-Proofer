import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { Printer } from 'https://esm.sh/@awesome-cordova-plugins/printer';

// Enhanced Capacitor detection with fallbacks
const isNative = (() => {
  try {
    return Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNativePlatform);
  } catch (e) {
    console.warn('Capacitor detection failed, assuming web platform:', e);
    return false;
  }
})();

// Service Worker registration only for PWA/web
if (!isNative && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker berhasil didaftarkan'))
    .catch(err => console.warn("Service Worker Gagal Terdaftar:", err));
}

// Exposed plugins with safe fallbacks
window.CapacitorPlugins = {
  LocalNotifications: isNative ? LocalNotifications : null,
  App: isNative ? App : null,
  Preferences: isNative ? Preferences : null,
  Printer: isNative ? Printer : null
};

// Provide graceful degradation for non-native platforms
if (!isNative) {
  window.CapacitorPlugins.Preferences = {
    get: async ({ key }) => ({ value: localStorage.getItem(key) || null }),
    set: async ({ key, value }) => { localStorage.setItem(key, value); },
    remove: async ({ key }) => { localStorage.removeItem(key); }
  };
}
