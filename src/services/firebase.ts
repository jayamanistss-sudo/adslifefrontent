import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             ?? '',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         ?? '',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          ?? '',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              ?? '',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID      ?? '',
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';

// Singleton messaging instance — created once after SW is ready
let messagingInstance: Messaging | null = null;

function getApp() {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  if (!firebaseConfig.projectId) return null;
  try {
    const app = getApp();
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch {
    return null;
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const sw = reg.active ?? reg.installing ?? reg.waiting;
    sw?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });

    return reg;
  } catch {
    return null;
  }
}

export async function requestFCMToken(): Promise<string | null> {
  if (!firebaseConfig.projectId) return null;
  try {
    const swReg     = await registerServiceWorker();
    const messaging = await getMessagingInstance();
    if (!messaging) return null;
    const token = await getToken(messaging, {
      vapidKey:                    VAPID_KEY,
      serviceWorkerRegistration:   swReg ?? undefined,
    });
    return token || null;
  } catch (e) {
    console.error('[FCM] getToken error:', e);
    return null;
  }
}

export async function onForegroundMessage(callback: (payload: any) => void): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
