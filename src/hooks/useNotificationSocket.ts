import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '../store/useUserStore';
import toast from 'react-hot-toast';

const WS_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ?? 'https://adslife.in';

export function useNotificationSocket(onNotification?: (n: any) => void) {
  const { user, token } = useUserStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !token) return;

    const socket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('notification', (payload: any) => {
      // Show toast
      if (payload.type === 'new_offer') {
        toast(
          `🏷️ ${payload.body}`,
          {
            duration: 5000,
            icon: '🔔',
            style: { background: '#FF6200', color: '#fff', fontWeight: '600' },
          }
        );
      }
      // Pass to caller (e.g. to update notification bell count)
      onNotification?.(payload);
    });

    socket.on('connect_error', () => {
      // Silent — don't flood console on reconnects
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, token]);

  return socketRef;
}
