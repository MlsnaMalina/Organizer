/// <reference lib="webworker" />
// Custom Service Worker pro Organizér
//   - Precache assets pomocí Workboxu (auto-update)
//   - Web Push handler: zobrazí systémovou notifikaci
//   - Notification click: otevře/zaměří appku

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

// Precache (vyplní VitePWA při buildu)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ============ PUSH NOTIFICATION ============
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Organizér', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Organizér';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'organizer',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/',
      targetKind: data.targetKind || null,
      targetId: data.targetId || null,
    },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ============ NOTIFICATION CLICK ============
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const data = event.notification.data || {};
  event.notification.close();

  // "snooze 10 min" akce — pošleme zpátky do appky přes message
  if (action === 'snooze') {
    event.waitUntil((async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      all.forEach(c => c.postMessage({ type: 'NOTIF_SNOOZE', target: data }));
    })());
    return;
  }

  // Default: otevřít nebo zaměřit existující okno
  const targetUrl = data.url || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = all.find(c => c.url.includes(self.registration.scope.replace(/\/$/, '')));
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'NOTIF_OPEN', target: data });
    } else {
      await self.clients.openWindow(targetUrl);
    }
  })());
});
