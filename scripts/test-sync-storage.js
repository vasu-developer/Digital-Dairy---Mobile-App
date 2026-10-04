const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function setup(platform = 'web') {
  const values = new Map();
  let failKey = null;
  const storage = {
    getItem: async k => values.get(k) ?? null,
    setItem: async (k, v) => { if (k === failKey) throw new Error('disk full'); values.set(k, v); },
    removeItem: async k => values.delete(k),
    multiGet: async keys => keys.map(k => [k, values.get(k) ?? null]),
    multiSet: async entries => { for (const [k, v] of entries) { if (k === failKey) throw new Error('disk full'); values.set(k, v); } },
    multiRemove: async keys => keys.forEach(k => values.delete(k)),
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/sync/storage.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const requireMock = name => {
    if (name.includes('async-storage')) return storage;
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === '@/db/database') return { getDatabase: async () => null };
    if (name === '@/utils/rate-chart') return { DAIRY_PRICING_STORAGE_KEY: '@pricing' };
    throw new Error(name);
  };
  vm.runInNewContext(js, { exports, require: requireMock });
  return { api: exports, values, fail: key => { failKey = key; } };
}
const snapshot = () => ({ schemaVersion: 1, customers: [{ id: 'c1', name: 'Farmer', status: 'ACTIVE' }], collections: [], transactions: [], dispatches: [], profile: null, pricing: null });
test('web download restores records and removes absent profile instead of writing JSON null', async () => {
  const { api, values } = setup();
  values.set('@doodh_khata_dairy_profile', '{"dairyName":"Old"}');
  const data = snapshot();
  await api.applySyncedData(data, { dairyId: 'a', base: data });
  assert.equal(JSON.parse(values.get('@doodh_khata_customers'))[0].id, 'c1');
  assert.equal(values.has('@doodh_khata_dairy_profile'), false);
  assert.equal(values.has('@doodh_khata_cloud_pending_v1'), false);
  assert.equal((await api.getSyncState()).dairyId, 'a');
});
test('interrupted local writes retain journal and recover before advancing baseline', async () => {
  const { api, values, fail } = setup();
  fail('@doodh_khata_transactions');
  const data = snapshot();
  await assert.rejects(api.applySyncedData(data, { dairyId: 'a', base: data }));
  assert.equal(values.has('@doodh_khata_cloud_pending_v1'), true);
  assert.equal(await api.getSyncState(), null);
  fail(null);
  await api.recoverPendingSync();
  assert.equal(values.has('@doodh_khata_cloud_pending_v1'), false);
  assert.equal((await api.getSyncState()).base.customers[0].name, 'Farmer');
});
test('native sync refuses to upload or replace data when SQLite is unavailable', async () => {
  const { api } = setup('android');
  await assert.rejects(api.readSnapshot(), /database is unavailable/);
  await assert.rejects(api.applySyncedData(snapshot(), { dairyId: 'a' }), /database is unavailable/);
});
