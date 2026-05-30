import { useState, useEffect, useCallback } from 'react';
import { openDB } from 'idb';
import type { Offer } from '../types';

const DB_NAME    = 'adslife-offline';
const DB_VERSION = 1;
const STORE_NAME = 'offers';

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('interactions')) {
        db.createObjectStore('interactions', { autoIncrement: true });
      }
    },
  });
}

export function useOfflineOffers() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedOffers, setCachedOffers] = useState<Offer[]>([]);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  syncPendingInteractions(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    loadCachedOffers();
  }, []);

  const cacheOffers = useCallback(async (offers: Offer[]) => {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await Promise.all(offers.map((o) => tx.store.put(o)));
    await tx.done;
    setLastSynced(new Date());
  }, []);

  const loadCachedOffers = useCallback(async () => {
    const db    = await getDb();
    const items = await db.getAll(STORE_NAME);
    setCachedOffers(items);
  }, []);

  const queueInteraction = useCallback(async (interaction: {
    userId: number; offerId: number; action: string;
  }) => {
    const db = await getDb();
    await db.add('interactions', { ...interaction, timestamp: Date.now() });
  }, []);

  const syncPendingInteractions = useCallback(async () => {
    const db      = await getDb();
    const pending = await db.getAll('interactions');
    for (const item of pending) {
      try {
        const token = localStorage.getItem('adslife_token');
        await fetch('/api/feed/interaction.php', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ user_id: item.userId, offer_id: item.offerId, action: item.action }),
        });
        await db.delete('interactions', item.id);
      } catch {}
    }
    setLastSynced(new Date());
  }, []);

  return { isOnline, cachedOffers, lastSynced, cacheOffers, queueInteraction };
}
