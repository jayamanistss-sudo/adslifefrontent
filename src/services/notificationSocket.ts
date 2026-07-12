import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getPublicOrigin } from '../utils/api';
import { useNotificationStore } from '../store/useNotificationStore';

// The backend gateway is at namespace "/notifications" and authenticates via
// the same httpOnly cookie that authenticates every REST call now (falls
// back to handshake.auth.token / an Authorization header for mobile, which
// has no cookie jar) — see backend-nest/src/gateway/notifications.gateway.ts.
let socket: Socket | null = null;

/** Connect once after login so every notification type reaches an active
 *  tab in real time — call disconnectNotificationSocket() on logout. Callers
 *  already know the user is authenticated (post-login, or after the boot
 *  session check confirms one) before calling this. */
export function connectNotificationSocket(): void {
  if (socket?.connected) return;

  socket = io(`${getPublicOrigin()}/notifications`, {
    withCredentials: true,
    // Polling first, then opportunistically upgrade — Socket.IO's own
    // recommended order. Listing websocket first makes the client attempt a
    // cold direct upgrade with no fallback; if that fails (as it does behind
    // this nginx setup) the connection fails outright instead of degrading
    // to the always-reliable long-polling transport.
    transports: ['polling', 'websocket'],
    reconnection: true,
  });

  socket.on('notification', (payload: Record<string, any>) => {
    const { type = 'push', title = 'AdsLife', body = '', offer_id, created_at } = payload;
    toast(`${title}\n${body}`, { icon: '🔔', duration: 5000 });
    useNotificationStore.getState().addNotification({
      id: Date.now(),
      userId: 0,
      title,
      body,
      type,
      offerId: offer_id ? Number(offer_id) : undefined,
      isRead: false,
      createdAt: created_at ?? new Date().toISOString(),
    });
  });
}

export function disconnectNotificationSocket(): void {
  socket?.disconnect();
  socket = null;
}
