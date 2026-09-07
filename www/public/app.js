import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { Printer } from 'https://esm.sh/@awesome-cordova-plugins/printer';

const isNative = Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNativePlatform);

if (!isNative && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .catch(err => console.log("Service Worker Gagal Terdaftar", err));
}

window.CapacitorPlugins = {
  LocalNotifications,
  App,
  Preferences,
  Printer
};
