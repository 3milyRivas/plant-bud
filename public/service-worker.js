const CACHE_VERSION = 'plant-bud-mobile-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const OFFLINE_URL = '/offline.html'
const APP_SHELL = [
  OFFLINE_URL,
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/site.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('plant-bud-mobile-') && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  if (!isCacheableStaticRequest(request, url)) return

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const responseCopy = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseCopy))
          }

          return response
        })
        .catch(() => cachedResponse)

      return cachedResponse || networkResponse
    })
  )
})

function isCacheableStaticRequest(request, url) {
  if (request.headers.has('range')) return false
  if (url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/profiles/')) return false

  return (
    url.pathname.startsWith('/assets/') ||
    ['style', 'script', 'font', 'image'].includes(request.destination)
  )
}
