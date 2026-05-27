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
  event.waitUntil((async () => {
    let data = {};
    try {
      data = event.data ? event.data.json() : {};
    } catch {
      data = { title: 'Organizér', body: event.data ? event.data.text() : '' };
    }

    // Pokud má uživatel appku otevřenou a viditelnou, NEUKAZUJEME systémovou
    // bublinu — místo toho pošleme zprávu do okna, kde se zobrazí plnohodnotný
    // doodle pop-up (NotifModal).
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visible = all.find(c => c.visibilityState === 'visible');
    if (visible) {
      visible.postMessage({ type: 'NOTIF_INLINE', data });
      return;
    }

    // Appka zavřená nebo na pozadí → systémová notifikace.
    const title = data.title || 'Organizér';
    const options = {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'organizer',
      renotify: true,
      requireInteraction: true,   // drží na obrazovce, dokud nezareaguješ
      data: {
        url: data.url || '/',
        targetKind: data.targetKind || null,
        targetId: data.targetId || null,
        notifPayload: data,        // celý payload pro doodle popup po kliknutí
      },
      actions: [
        { action: 'open', title: 'Otevřít' },
        { action: 'snooze', title: 'Posunout (10 min)' },
      ],
    };

    await self.registration.showNotification(title, options);
  })());
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
