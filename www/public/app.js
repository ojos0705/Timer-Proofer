import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { Printer } from 'https://esm.sh/@awesome-cordova-plugins/printer';
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .catch(err => console.log("Service Worker Gagal Terdaftar", err));
}