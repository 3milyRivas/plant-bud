const frontend = document.body.dataset.frontend

if (frontend === 'PC' || frontend === 'Phone') {
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', async () => {
      try {
        await navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      } catch (error) {
        console.warn('Plant Bud could not enable offline support.', error)
      }
    })
  }
}
