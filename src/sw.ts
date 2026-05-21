/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
clientsClaim()

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// SPA navigation fallback — same denylist as the old generateSW config
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/functions\//],
  }),
)

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() as { title?: string; body?: string; url?: string } ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? '3AM Pipeline', {
      body:  data.body ?? '',
      icon:  '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag:   'wsp-alert',
      data:  { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string }).url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(wins => {
      for (const w of wins) {
        if ('focus' in w) { w.focus(); return }
      }
      return self.clients.openWindow(url)
    }),
  )
})
