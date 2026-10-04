import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getDatabase } from '@/db/database';
import { DAIRY_PRICING_STORAGE_KEY } from '@/utils/rate-chart';

export type Snapshot = {
  schemaVersion: 1;
  customers: Record<string, any>[];
  collections: Record<string, any>[];
  transactions: Record<string, any>[];
  dispatches: Record<string, any>[];
  profile: Record<string, any> | null;
  pricing: Record<string, any> | null;
};
export const SYNC_STATE = '@doodh_khata_cloud_state_v1';
const PENDING = '@doodh_khata_cloud_pending_v1';
export type SyncState = { dairyId: string; phone: string; server: string; base: Snapshot | null; syncedAt: string | null };
const keys = {
  customers: '@doodh_khata_customers', collections: '@doodh_khata_collections',
  transactions: '@doodh_khata_transactions', dispatches: '@doodh_khata_dispatches',
  profile: '@doodh_khata_dairy_profile', pricing: DAIRY_PRICING_STORAGE_KEY,
};
const columns = {
  customers: 'id farmer_code name phone village customer_type default_sale_rate opening_balance status created_at'.split(' '),
  collections: 'id customer_id date session entry_type quantity fat snf rate amount notes created_at'.split(' '),
  transactions: 'id customer_id date type category amount is_credit notes milk_collection_id created_at'.split(' '),
};
const tables = { customers: 'customers', collections: 'milk_collections', transactions: 'transactions' };
export async function getSyncState(): Promise<SyncState | null> {
  const raw = await AsyncStorage.getItem(SYNC_STATE);
  return raw ? JSON.parse(raw) : null;
}
export async function readSnapshot(): Promise<Snapshot> {
  const result: any = { schemaVersion: 1 };
  const stored = new Map(await AsyncStorage.multiGet(Object.values(keys)));
  const db = await getDatabase();
  if (Platform.OS !== 'web' && !db) throw new Error('Local database is unavailable. Restart the app before syncing.');
  for (const [key, storageKey] of Object.entries(keys)) {
    result[key] = stored.get(storageKey) ? JSON.parse(stored.get(storageKey)!) : (key === 'profile' || key === 'pricing' ? null : []);
  }
  for (const key of Object.keys(columns) as (keyof typeof columns)[]) {
    const rows = db ? await db.getAllAsync(`SELECT * FROM ${tables[key]}`) : result[key];
    // Stable shape across SQLite and web; display-only joined fields are not records.
    result[key] = rows.map((row: Record<string, any>) => Object.fromEntries(columns[key].map(c => [c, row[c] ?? null])));
  }
  return result;
}
async function writeSnapshot(data: Snapshot) {
  const db = await getDatabase();
  if (Platform.OS !== 'web' && !db) throw new Error('Local database is unavailable. Restart the app to finish restoring.');
  if (db) await db.withTransactionAsync(async () => {
    for (const key of Object.keys(columns) as (keyof typeof columns)[]) {
      await db.runAsync(`DELETE FROM ${tables[key]}`);
      for (const row of data[key]) {
        const cols = columns[key];
        await db.runAsync(`INSERT INTO ${tables[key]} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, cols.map(c => row[c] ?? null));
      }
    }
  });
  const entries = Object.entries(keys);
  await AsyncStorage.multiSet(entries.filter(([key]) => data[key as keyof typeof keys] !== null).map(([key, storageKey]) => [storageKey, JSON.stringify(data[key as keyof typeof keys])]));
  const removed = entries.filter(([key]) => data[key as keyof typeof keys] === null).map(([, storageKey]) => storageKey);
  if (removed.length) await AsyncStorage.multiRemove(removed);
}
export async function applySyncedData(data: Snapshot, state: SyncState) {
  // Write-ahead recovery protects the boundary between SQLite and AsyncStorage.
  await AsyncStorage.setItem(PENDING, JSON.stringify({ data, state }));
  await recoverPendingSync();
}
export async function recoverPendingSync() {
  const raw = await AsyncStorage.getItem(PENDING);
  if (!raw) return;
  const { data, state } = JSON.parse(raw);
  await writeSnapshot(data);
  await AsyncStorage.setItem(SYNC_STATE, JSON.stringify(state));
  await AsyncStorage.removeItem(PENDING);
}
