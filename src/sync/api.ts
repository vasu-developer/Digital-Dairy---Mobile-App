import AsyncStorage from '@react-native-async-storage/async-storage';
import { applySyncedData, getSyncState, readSnapshot, recoverPendingSync, SYNC_STATE } from './storage';

const SERVER = ('https://digital-dairy-backend.vercel.app');
// Keep credentials out of AsyncStorage and exported backups. Reauthenticate after app restart.
let session: { token: string; dairy: { id: string; phone: string } } | null = null;
let running = false;
export class SyncApiError extends Error {
  constructor(message: string, public status: number, public conflicts: string[] = []) { super(message); }
}
async function request(path: string, body?: unknown) {
  if (!SERVER) throw new Error('Set EXPO_PUBLIC_API_URL in the app environment and rebuild to enable cloud sync.');
  if (!/^https:\/\//.test(SERVER) && !__DEV__) throw new Error('Cloud sync requires an HTTPS server.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`${SERVER}/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) session = null;
      throw new SyncApiError(result.message || 'Unable to sync.', response.status, result.conflicts || []);
    }
    return result;
  } catch (error) {
    if (error instanceof SyncApiError) throw error;
    throw new Error('Could not reach the server. Check your connection and try again. Your local data is safe.');
  } finally { clearTimeout(timeout); }
}
export function isSignedIn() { return session !== null; }
export function signOut() { session = null; }
export async function authenticate(phone: string, password: string, register: boolean) {
  const state = await getSyncState();
  const normalized = phone.replace(/[\s()-]/g, '').replace(/^\+/, '');
  if (state && (state.phone !== normalized || state.server !== SERVER)) throw new Error('This device’s records belong to another dairy account or server. Use the original account to avoid mixing dairy records.');
  const result = await request(register ? '/auth/register' : '/auth/login', { phone, password });
  if (state && state.dairyId !== result.dairy.id) throw new Error('The dairy account has changed. Contact your administrator before syncing.');
  await AsyncStorage.setItem(SYNC_STATE, JSON.stringify(state || { dairyId: result.dairy.id, phone: result.dairy.phone, server: SERVER, base: null, syncedAt: null }));
  session = result;
}
export async function syncData(resolution?: 'local' | 'server') {
  if (running) throw new Error('Sync already in progress.');
  running = true;
  try {
    await recoverPendingSync();
    const state = await getSyncState();
    if (!state || !session) throw new SyncApiError('Please log in to sync.', 401);
    const data = await readSnapshot();
    const result = await request('/sync', { data, base: state.base, ...(resolution ? { resolution } : {}) });
    const next = { ...state, base: result.data, syncedAt: result.syncedAt };
    await applySyncedData(result.data, next);
    return next;
  } finally { running = false; }
}
