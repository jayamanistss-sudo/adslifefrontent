import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/web';
import { api, endpoints } from '../utils/api';

/**
 * Bridges PowerSync to the Adslife backend.
 *
 * Backend requirements:
 *  GET /auth/powersync-token  → { token: string, expires_at: string }
 *    The JWT must include { sub: "<userId>" } so PowerSync sync rules can
 *    filter rows by the authenticated user.
 *
 * PowerSync sync rules (powersync.yaml) example:
 *  bucket_definitions:
 *    user_offers:
 *      parameters: SELECT request.jwt() ->> 'sub' AS user_id
 *      data:
 *        - SELECT * FROM offers WHERE is_active = true
 *    user_notifications:
 *      parameters: SELECT request.jwt() ->> 'sub' AS user_id
 *      data:
 *        - SELECT * FROM notifications WHERE user_id = cast(bucket.user_id as int)
 *    user_saved_offers:
 *      parameters: SELECT request.jwt() ->> 'sub' AS user_id
 *      data:
 *        - SELECT * FROM saved_offers WHERE user_id = cast(bucket.user_id as int)
 */
export class AdslifeConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    const res = await api.get<{ success: boolean; data: { token: string; powersync_url: string } }>(
      '/auth/powersync-token',
    );
    const { token } = res.data.data;
    return {
      endpoint:  import.meta.env.VITE_POWERSYNC_URL as string,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };
  }

  /**
   * Uploads local writes (made while offline) back to the server.
   * Only notification mark-read is handled here — all other mutations
   * (save offer, interactions, etc.) continue to use the REST API directly.
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const tx = await database.getNextCrudTransaction();
    if (!tx) return;

    try {
      for (const op of tx.crud) {
        if (op.table === 'notifications') {
          const isMarkRead = op.opData?.is_read === 1;
          if (isMarkRead) {
            await api.post(endpoints.notificationsMarkRead, { id: op.id });
          }
        }
        if (op.table === 'saved_offers') {
          if (op.op === 'PUT') {
            await api.post(endpoints.savedIds, {
              offer_id: op.opData?.offer_id,
            }).catch(() => {});
          }
          if (op.op === 'DELETE') {
            await api.post(endpoints.unsaveOffer, {
              offer_id: op.id,
            }).catch(() => {});
          }
        }
      }
      await tx.complete();
    } catch (e) {
      // Return the error so PowerSync retries the transaction later
      await tx.complete(e instanceof Error ? e.message : String(e));
    }
  }
}
