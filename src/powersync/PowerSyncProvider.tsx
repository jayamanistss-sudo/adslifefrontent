import { useEffect, useRef } from 'react';
import { PowerSyncContext } from '@powersync/react';
import { db } from './database';
import { AdslifeConnector } from './connector';
import { useUserStore } from '../store/useUserStore';

interface Props { readonly children: React.ReactNode }

export default function PowerSyncProvider({ children }: Props) {
  const { isAuthenticated } = useUserStore();
  const connectorRef = useRef<AdslifeConnector | null>(null);

  useEffect(() => {
    const url = import.meta.env.VITE_POWERSYNC_URL;
    if (!url) {
      console.warn('[PowerSync] VITE_POWERSYNC_URL is not set — sync disabled');
      return;
    }

    console.log('[PowerSync] URL:', url);
    console.log('[PowerSync] Authenticated:', isAuthenticated);

    if (isAuthenticated) {
      connectorRef.current = new AdslifeConnector();

      db.connect(connectorRef.current)
        .then(() => console.log('[PowerSync] Connected successfully'))
        .catch((e) => console.error('[PowerSync] connect() failed:', e));

      // Log status changes
      const unsub = db.registerListener({
        statusChanged: (status) => {
          console.log('[PowerSync] Status changed:', JSON.stringify(status));
          if ((status as any).error) {
            console.error('[PowerSync] Sync error:', (status as any).error);
          }
        },
      });

      return () => {
        unsub?.();
        db.disconnect().catch(() => {});
      };
    } else {
      db.disconnect().catch(() => {});
      connectorRef.current = null;
    }
  }, [isAuthenticated]);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
