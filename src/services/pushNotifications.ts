import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { api, endpoints } from '../utils/api';
import { useNotificationStore } from '../store/useNotificationStore';
import toast from 'react-hot-toast';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let registered = false;
let currentToken: string | null = null;

/** Request notification permission, register for push, and save the token — call once after login. */
export async function registerPushToken(): Promise<void> {
  if (registered) return;
  if (!firebaseConfig.apiKey || !import.meta.env.VITE_FIREBASE_VAPID_KEY) return;
  if (!('serviceWorker' in navigator) || !('Notification' in globalThis)) return;

  try {
    if (!(await isSupported())) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // Registered at its OWN scope, distinct from the PWA caching SW
    // (sw.js, registered at "/" in App.tsx). Two service workers registered
    // at the same scope fight over control of the page — whichever wins
    // that race receives this postMessage, and if it's the wrong one,
    // firebase-messaging-sw.js never initializes, silently breaking both
    // foreground toasts AND background/killed-tab push display.
    const swRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/firebase-cloud-messaging-push-scope' },
    );
    // navigator.serviceWorker.ready resolves for the PAGE's default-scope
    // controller (sw.js), which tells us nothing about this distinct-scope
    // registration — wait for THIS worker's own activation instead.
    if (!swRegistration.active) {
      await new Promise<void>((resolve) => {
        const worker = swRegistration.installing ?? swRegistration.waiting;
        if (!worker) { resolve(); return; }
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') resolve();
        });
      });
    }
    swRegistration.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });

    if (!getApps().length) initializeApp(firebaseConfig);
    const messaging = getMessaging();

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });
    if (!token) return;

    await api.post(endpoints.saveToken, { token, platform: 'web' });
    registered = true;
    currentToken = token;

    // Foreground messages (tab focused) — service worker only handles background ones.
    // Push the notification straight into the store so the bell badge/list update
    // instantly, instead of waiting for NotificationPanel's next 60s REST poll.
    onMessage(messaging, (payload) => {
      const { title = 'AdsLife', body = '' } = payload.notification ?? {};
      const data = payload.data ?? {};
      toast(`${title}\n${body}`, { icon: '🔔', duration: 5000 });
      useNotificationStore.getState().addNotification({
        id: Date.now(),
        userId: 0,
        title,
        body,
        type: data.type ?? 'push',
        offerId: data.offer_id ? Number(data.offer_id) : undefined,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });
  } catch (err) {
    console.error('[Push] Registration failed:', err);
  }
}

/**
 * Call on logout — without this, a shared/public browser keeps receiving
 * the previous user's pushes on this device until FCM eventually decides
 * the token is stale on its own (which can take a long time).
 */
export async function unregisterPushToken(): Promise<void> {
  if (!currentToken) return;
  try {
    await api.delete(endpoints.notificationsRemoveToken, { data: { token: currentToken } });
  } catch { /* best-effort — logout must not be blocked by this */ }
  registered = false;
  currentToken = null;
}
