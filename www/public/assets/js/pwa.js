let newWorker;

const isNative = (() => {
  try {
    return Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNativePlatform);
  } catch (e) {
    console.warn('Capacitor detection failed, assuming web platform:', e);
    return false;
  }
})();

if (!isNative && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker berhasil didaftarkan'))
    .catch(err => console.warn('Service Worker Gagal Terdaftar:', err));
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      registration.addEventListener('updatefound', () => {
        newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const banner = document.getElementById('app-update-banner');
            if (banner) banner.style.display = 'block';
          }
        });
      });
    }).catch(err => console.log('Service Worker registration failed:', err));
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

document.getElementById('btn-refresh-app')?.addEventListener('click', () => {
  if (newWorker) {
    newWorker.postMessage({ action: 'skipWaiting' });
  }
});
