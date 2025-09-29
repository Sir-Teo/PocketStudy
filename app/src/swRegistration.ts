if (import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Service worker registration failed', error);
    });
  });
}
