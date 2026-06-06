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

    if (isAuthenticated) {
      connectorRef.current = new AdslifeConnector();

      const status = db.currentStatus;
      if (!status.connected && !status.connecting) {
        db.connect(connectorRef.current).catch(() => {});
      }

      return () => {
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
