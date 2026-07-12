importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Populated at runtime by the main thread via postMessage
let firebaseConfig = {};

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      const messaging = firebase.messaging();

      // Handle background messages
      messaging.onBackgroundMessage((payload) => {
        const { title = 'AdsLife', body = '' } = payload.notification ?? {};
        const data = payload.data ?? {};
        // data.route (e.g. support replies, promo/reengagement pushes) was
        // previously ignored entirely — every one of those opened /feed
        // instead of the intended destination, even though the backend
        // already sends the right route. offer_id is still the fallback
        // for the few push types that only carry that.
        const url = data.route ?? (data.offer_id ? `/offer/${data.offer_id}` : '/feed');
        self.registration.showNotification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: data.offer_id ? `offer-${data.offer_id}` : 'adslife',
          data: { url },
        });
      });
    }
  }
});

// Notification click → open the offer or feed
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/feed';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
