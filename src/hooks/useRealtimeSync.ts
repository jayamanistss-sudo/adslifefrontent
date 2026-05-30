import { useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { firebaseConfig } from '../services/firebase';

function getApp() {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

function getDb() {
  return getFirestore(getApp());
}

/**
 * Subscribe to a Firestore signal document.
 * Calls `onUpdate` whenever the server writes a new signal.
 * Skips the initial snapshot on mount (only fires on real changes).
 */
function useSignal(collection: string, docId: string, onUpdate: () => void) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!firebaseConfig.projectId) return;
    initialized.current = false;

    const db  = getDb();
    const ref = doc(db, `signals_${collection}`, docId);

    let unsub: (() => void) | undefined;

    unsub = onSnapshot(
      ref,
      () => {
        if (!initialized.current) {
          initialized.current = true;
          return; // skip the initial snapshot
        }
        onUpdate();
      },
      () => {
        // Firestore connection failed (quota, network, missing project config).
        // Unsubscribe silently — avoids the thousands-of-retries error storm.
        unsub?.();
      },
    );

    return () => unsub?.();
  }, [collection, docId, onUpdate]);
}

/** Feed real-time sync — calls onNewOffer when any vendor creates/updates/deletes an offer */
export function useFeedSync(onNewOffer: () => void) {
  useSignal('feed', 'latest', onNewOffer);
}

/** Vendor dashboard stats sync — calls onStatsChange when interactions are logged */
export function useVendorStatsSync(vendorId: number | undefined, onStatsChange: () => void) {
  const stableId = String(vendorId ?? 0);
  useSignal('vendor_stats', stableId, onStatsChange);
}

/** Notification badge sync — calls onNotification when a push is sent to this user */
export function useNotificationSync(userId: number | undefined, onNotification: () => void) {
  const stableId = String(userId ?? 0);
  useSignal('notifications', stableId, onNotification);
}
