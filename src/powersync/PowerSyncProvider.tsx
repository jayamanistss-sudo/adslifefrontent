import { useEffect, useRef } from 'react';
import { PowerSyncContext } from '@powersync/react';
import { db } from './database';
import { AdslifeConnector } from './connector';
import { useUserStore } from '../store/useUserStore';

interface Props { readonly children: React.ReactNode }

/**
 * Mounts the PowerSync database and connects/disconnects it
 * whenever the user logs in or out.
 *
 * Place this inside <BrowserRouter> but outside any auth-gated routes
 * so the DB is always available even on public pages.
 */
export default function PowerSyncProvider({ children }: Props) {
  const { isAuthenticated } = useUserStore();
  const connectorRef = useRef<AdslifeConnector | null>(null);

  useEffect(() => {
    if (!import.meta.env.VITE_POWERSYNC_URL) {
      // No PowerSync URL configured — skip sync, local DB still works as a
      // read-through cache seeded by the REST fallbacks in each hook.
      return;
    }

    if (isAuthenticated) {
      connectorRef.current = new AdslifeConnector();
      db.connect(connectorRef.current).catch((e) => {
        console.warn('[PowerSync] connect failed:', e);
      });
    } else {
      db.disconnect().catch(() => {});
      connectorRef.current = null;
    }

    return () => {
      db.disconnect().catch(() => {});
    };
  }, [isAuthenticated]);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
