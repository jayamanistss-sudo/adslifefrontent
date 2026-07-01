import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck, Tag, Trophy, Flame, Star, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, endpoints } from '../utils/api';
import { useNotificationStore } from '../store/useNotificationStore';
import { useUserStore } from '../store/useUserStore';
import type { Notification } from '../types';

const TYPE_ICON: Record<string, { icon: React.ReactNode; color: string }> = {
  offer_match:        { icon: <Tag size={14} />,    color: 'bg-[var(--primary-light)] text-[var(--primary)]' },
  badge:              { icon: <Trophy size={14} />, color: 'bg-amber-50 dark:bg-amber-950/20 text-amber-500' },
  streak:             { icon: <Flame size={14} />,  color: 'bg-[var(--primary-light)] text-[var(--primary)]' },
  spotlight_approved: { icon: <Star size={14} />,   color: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600' },
  vendor_approved:    { icon: <Star size={14} />,   color: 'bg-[var(--accent-light)] text-emerald-600 dark:text-emerald-400' },
};

function NotifIcon({ type }: { readonly type: string }) {
  const t = TYPE_ICON[type] ?? { icon: <Bell size={14} />, color: 'bg-[var(--surface-2)] text-[var(--text-muted)]' };
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.color}`}>
      {t.icon}
    </div>
  );
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationPanel() {
  const { user } = useUserStore();
  const { notifications, unreadCount, setNotifications, markRead, markAllRead } = useNotificationStore();
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const ref      = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const mapNotifications = (raw: Record<string, unknown>[]): Notification[] =>
    raw.map((n) => ({
      id:        n.id as number,
      userId:    n.user_id as number,
      title:     n.title as string,
      body:      n.body as string,
      type:      n.type as string,
      offerId:   n.offer_id as number | undefined,
      isRead:    Number(n.is_read) === 1,
      createdAt: n.created_at as string,
    }));

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    api.get(endpoints.notificationsList(30))
      .then((res) => {
        if (res.data.success) setNotifications(mapNotifications(res.data.data.notifications));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, user?.id]);

  const fetchUnread = useCallback(() => {
    if (!user) return;
    api.get(endpoints.notificationsList(30))
      .then((res) => {
        if (res.data.success) setNotifications(mapNotifications(res.data.data.notifications));
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 60000);
    return () => clearInterval(t);
  }, [fetchUnread]);

  const handleNotifClick = async (n: Notification) => {
    if (!n.isRead) {
      markRead(n.id);
      try { await api.put(endpoints.notificationsMarkRead, { id: n.id }); }
      catch { fetchUnread(); }
    }
    if (n.offerId) { setOpen(false); navigate(`/offer/${n.offerId}`); }
  };

  const handleMarkAllRead = async () => {
    markAllRead();
    try { await api.put(endpoints.notificationsMarkRead, {}); }
    catch { fetchUnread(); }
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[var(--primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-xl)] border border-[var(--border)] w-80 sm:w-96 overflow-hidden animate-scale-in">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-semibold text-[var(--text)] text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline font-medium"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-[var(--border)]/50">
            {loading && (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-3/4 rounded" />
                      <div className="skeleton h-3 w-full rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="py-12 text-center text-[var(--text-muted)]">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            )}

            {!loading && notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)] ${!n.isRead ? 'bg-[var(--primary-light)]/50' : ''}`}
              >
                <NotifIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0 mt-1.5" />
                )}
                {n.isRead && (
                  <Check size={13} className="text-[var(--border)] flex-shrink-0 mt-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
