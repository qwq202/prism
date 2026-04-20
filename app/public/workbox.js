
const isLocalDevHost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '::1';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    if (isLocalDevHost) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        registrations.forEach(function (registration) {
          registration.unregister();
        });
      });

      if ('caches' in window) {
        caches.keys().then(function (keys) {
          keys.forEach(function (key) {
            caches.delete(key);
          });
        });
      }

      console.debug('[service] skip service worker registration on local dev host');
      return;
    }

    navigator.serviceWorker.register('/service.js').then(function (registration) {
      console.debug(`[service] service worker registered with scope: ${registration.scope}`);
    }, function (err) {
      console.debug(`[service] service worker registration failed: ${err}`);
    });
  });
}
