import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './schema';

/**
 * Singleton PowerSync database.
 * Opened once, shared via React context through PowerSyncProvider.
 */
export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'adslife.db' },
  flags: { disableSSRWarning: true },
});

(globalThis as any).__psdb = db;
