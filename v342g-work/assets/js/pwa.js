import { NativeCapacitorService } from './native-capacitor-service.js';
/**
 * PWA / Service Worker lifecycle.
 * [AI-GENERATED][REFACTOR] Single owner for Service Worker registration/update.
 */

let pendingWorker = null;
let isReloadingForUpdate = false;

function isPwaNativePlatform() {
  // [AI-GENERATED][REFACTOR][V40] Reuse the canonical native capability bridge.
  return NativeCapacitorService.isNativePlatform();
}

async function unregisterServiceWorkersOnNative() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister())
    );
    if (registrations.length) {
      console.info('[PWA] Service Worker lama dilepas dari lingkungan native Capacitor.');
    }
  } catch (error) {
    console.warn('[PWA] Gagal membersihkan Service Worker native:', error);
  }
}

async function registerServiceWorker() {
  if (isPwaNativePlatform() || !('serviceWorker' in navigator)) return null;

  try {
    // [AI-GENERATED][ROBUSTNESS] Register exactly once and let the browser
    // own the update lifecycle for this page.
    const registration = await navigator.serviceWorker.register('./sw.js');
    console.info('[PWA] Service Worker terdaftar:', registration.scope);

    const watchInstallingWorker = () => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          pendingWorker = worker;
          const banner = document.getElementById('app-update-banner');
          if (banner) banner.style.display = 'block';
        }
      });
    };

    if (registration.installing) watchInstallingWorker();
    registration.addEventListener('updatefound', watchInstallingWorker);

    return registration;
  } catch (error) {
    console.warn('[PWA] Service Worker gagal didaftarkan:', error);
    return null;
  }
}

function bindUpdateButton() {
  const button = document.getElementById('btn-refresh-app');
  if (!button || button.dataset.swUpdateBound === 'true') return;

  button.dataset.swUpdateBound = 'true';
  button.addEventListener('click', () => {
    if (!pendingWorker) return;
    pendingWorker.postMessage({ type: 'SKIP_WAITING' });
  });
}

function initPwaLifecycle() {
  if (isPwaNativePlatform()) {
    unregisterServiceWorkersOnNative();
    return;
  }

  bindUpdateButton();
  registerServiceWorker();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isReloadingForUpdate) return;
    isReloadingForUpdate = true;
    window.location.reload();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPwaLifecycle, { once: true });
} else {
  initPwaLifecycle();
}
