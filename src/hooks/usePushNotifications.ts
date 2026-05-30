import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { requestFCMToken, onForegroundMessage } from '../services/firebase';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import { useNotificationStore } from '../store/useNotificationStore';
import type { Notification } from '../types';

export function usePushNotifications() {
  const { user }            = useUserStore();
  const { addNotification } = useNotificationStore();
  const registeredRef       = useRef(false);
  const unsubscribeRef      = useRef<(() => void) | null>(null);

  // Register FCM token on login
  useEffect(() => {
    if (!user || registeredRef.current) return;
    if (!('Notification' in globalThis)) return;

    const register = async () => {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
      }
      if (Notification.permission !== 'granted') return;

      const token = await requestFCMToken();
      if (!token) return;

      await api.post(endpoints.saveFcmToken, {
        token,
        device_info: navigator.userAgent.slice(0, 200),
      }).catch(() => {});

      registeredRef.current = true;
    };

    register();
  }, [user?.id]);

  // Listen for foreground messages
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    onForegroundMessage((payload) => {
      if (cancelled) return;

      const title = payload.notification?.title ?? 'AdsLife';
      const body  = payload.notification?.body  ?? '';
      const data  = payload.data ?? {};

      // Show toast
      toast(`🔔 ${title}\n${body}`, {
        duration: 6000,
        position: 'top-right',
        style: { maxWidth: '340px', whiteSpace: 'pre-line' },
      });

      const n: Notification = {
        id:        Date.now(),
        userId:    user.id,
        title,
        body,
        type:      data.type ?? 'push',
        offerId:   data.offer_id ? Number(data.offer_id) : undefined,
        isRead:    false,
        createdAt: new Date().toISOString(),
      };
      addNotification(n);
    }).then((unsub) => {
      if (cancelled) { unsub(); return; }
      unsubscribeRef.current = unsub;
    });

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [user?.id]);
}
