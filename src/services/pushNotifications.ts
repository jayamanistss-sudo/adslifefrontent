import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { api, endpoints } from '../utils/api';
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

/** Request notification permission, register for push, and save the token — call once after login. */
export async function registerPushToken(): Promise<void> {
  if (registered) return;
  if (!firebaseConfig.apiKey || !import.meta.env.VITE_FIREBASE_VAPID_KEY) return;
  if (!('serviceWorker' in navigator) || !('Notification' in globalThis)) return;

  try {
    if (!(await isSupported())) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const swRegistration = await navigator.serviceWorker.ready;
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

    // Foreground messages (tab focused) — service worker only handles background ones
    onMessage(messaging, (payload) => {
      const { title = 'AdsLife', body = '' } = payload.notification ?? {};
      toast(`${title}\n${body}`, { icon: '🔔', duration: 5000 });
    });
  } catch (err) {
    console.error('[Push] Registration failed:', err);
  }
}
