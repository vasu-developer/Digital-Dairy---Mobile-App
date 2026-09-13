import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase, closeDatabase } from './database';
import { DAIRY_PRICING_STORAGE_KEY } from '@/utils/rate-chart';

export type ExportResult = {
  canceled: boolean;
  fileName?: string;
};

export type ImportResult = {
  canceled: boolean;
};

export type ExportOptions = {
  onFolderSelected?: () => void;
};

export type ImportOptions = {
  onFileSelected?: (fileName: string) => void;
};

/**
 * Generate a standard date/time based backup filename:
 * DigitalDairy_Backup_YYYY-MM-DD_HH-mm-ss.db (local 24-hour time)
 */
export function generateBackupFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `DigitalDairy_Backup_${YYYY}-${MM}-${DD}_${HH}-${mm}-${ss}.db`;
}

/**
 * Fast dependency-free Base64 conversion for Uint8Array binary buffers
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  const len = bytes.length;
  let i = 0;

  for (; i + 2 < len; i += 3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += chars[bytes[i + 2] & 63];
  }

  if (i < len) {
    base64 += chars[bytes[i] >> 2];
    if (i + 1 < len) {
      base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      base64 += chars[(bytes[i + 1] & 15) << 2];
      base64 += '=';
    } else {
      base64 += chars[(bytes[i] & 3) << 4];
      base64 += '==';
    }
  }

  return base64;
}

/**
 * Fast dependency-free Base64 decoding into Uint8Array binary buffer
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  let padLength = 0;
  if (clean.endsWith('==')) padLength = 2;
  else if (clean.endsWith('=')) padLength = 1;

  const totalBytes = Math.floor((clean.length * 3) / 4) - padLength;
  const bytes = new Uint8Array(totalBytes);

  let byteIdx = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const enc0 = chars.indexOf(clean[i]);
    const enc1 = chars.indexOf(clean[i + 1]);
    const enc2 = i + 2 < clean.length && clean[i + 2] !== '=' ? chars.indexOf(clean[i + 2]) : -1;
    const enc3 = i + 3 < clean.length && clean[i + 3] !== '=' ? chars.indexOf(clean[i + 3]) : -1;

    if (enc0 >= 0 && enc1 >= 0 && byteIdx < totalBytes) {
      bytes[byteIdx++] = (enc0 << 2) | (enc1 >> 4);
    }
    if (enc2 >= 0 && byteIdx < totalBytes) {
      bytes[byteIdx++] = ((enc1 & 15) << 4) | (enc2 >> 2);
    }
    if (enc3 >= 0 && byteIdx < totalBytes) {
      bytes[byteIdx++] = ((enc2 & 3) << 6) | enc3;
    }
  }

  return bytes;
}

/**
 * Export the actual SQLite database file (.db) to an Android user-selected folder
 * using Android's Storage Access Framework document/save picker.
 */
export async function exportDatabase(options?: ExportOptions): Promise<ExportResult> {
  if (Platform.OS === 'web') {
    throw new Error('Export is not supported on web.');
  }

  try {
    // 1. Ensure live database exists and is accessible
    const db = await getDatabase();
    if (!db) {
      throw new Error('No local database is available yet. Add some data and try again.');
    }

    // 2. Checkpoint SQLite WAL log to ensure all writes are flushed into the database pages
    try {
      await db.execAsync('PRAGMA wal_checkpoint(FULL);');
    } catch (e) {
      console.warn('WAL checkpoint warning:', e);
    }

    // 3. Sync pricing settings, dispatches, dairy profile & owner PIN into app_metadata table
    try {
      const pricing = await AsyncStorage.getItem(DAIRY_PRICING_STORAGE_KEY);
      if (pricing) {
        await db.runAsync(
          'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
          [DAIRY_PRICING_STORAGE_KEY, pricing]
        );
      }
      const dispatches = await AsyncStorage.getItem('@doodh_khata_dispatches');
      if (dispatches) {
        await db.runAsync(
          'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
          ['@doodh_khata_dispatches', dispatches]
        );
      }
      const profile = await AsyncStorage.getItem('@doodh_khata_dairy_profile');
      if (profile) {
        await db.runAsync(
          'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
          ['@doodh_khata_dairy_profile', profile]
        );
      }
      const ownerPin = await AsyncStorage.getItem('@doodh_khata_owner_security_pin');
      if (ownerPin) {
        await db.runAsync(
          'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
          ['@doodh_khata_owner_security_pin', ownerPin]
        );
      }
    } catch (metaErr) {
      console.warn('Metadata sync warning during export:', metaErr);
    }

    // 4. Capture atomic binary snapshot of the SQLite database
    const dbBytes = await db.serializeAsync();
    if (!dbBytes || dbBytes.length === 0) {
      throw new Error('No local database is available yet. Add some data and try again.');
    }

    // 5. Generate formatted backup filename
    const fileName = generateBackupFilename();

    // 6. Open Android system folder picker (Storage Access Framework)
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions || !permissions.granted) {
      return { canceled: true };
    }

    options?.onFolderSelected?.();

    // 7. Create the .db backup file in the user's chosen folder
    const safFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      'application/x-sqlite3'
    );

    // 8. Write binary SQLite data to the destination file
    const base64Data = uint8ArrayToBase64(dbBytes);
    await FileSystem.writeAsStringAsync(safFileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Record last backup time in persistent storage
    try {
      await AsyncStorage.setItem('@doodh_khata_last_backup_time', new Date().toISOString());
    } catch (e) {
      console.warn('Failed to record last backup timestamp:', e);
    }

    return { canceled: false, fileName };
  } catch (error: any) {
    if (error?.message?.includes('No local database is available yet')) {
      throw error;
    }
    console.error('Export database error:', error);
    throw new Error('Backup could not be created. Please try again.');
  }
}

export const STORAGE_LAST_BACKUP_KEY = '@doodh_khata_last_backup_time';

export async function getLastBackupTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

/**
 * Import and restore an actual SQLite database (.db) from an Android user-selected file
 * using Android's system document picker and in-memory SQLite deserialization.
 */
export async function importDatabase(options?: ImportOptions): Promise<ImportResult> {
  if (Platform.OS === 'web') {
    throw new Error('Import is not supported on web.');
  }

  // 1. Open Android document picker restricted to database files
  let pickerResult: DocumentPicker.DocumentPickerResult;
  try {
    pickerResult = await DocumentPicker.getDocumentAsync({
      type: [
        '*/*',
        'application/octet-stream',
        'application/x-sqlite3',
        'application/vnd.sqlite3',
      ],
      copyToCacheDirectory: false,
    });
  } catch (pickerErr) {
    console.error('Document picker error:', pickerErr);
    throw new Error('Unable to read the selected backup file.\nPlease select the .db file again.');
  }

  if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
    return { canceled: true };
  }

  const asset = pickerResult.assets[0];

  // 2. Validate filename extension strictly (.db)
  const selectedName = asset.name || '';
  if (!selectedName.toLowerCase().endsWith('.db')) {
    throw new Error('Please select a .db backup file created by Digital Dairy.');
  }

  options?.onFileSelected?.(selectedName);

  // 3. Read binary SQLite data from selected file
  let base64Data: string;
  try {
    base64Data = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (readErr) {
    // Fallback: Copy to guaranteed writable cacheDirectory first
    try {
      const cacheUri = `${FileSystem.cacheDirectory}temp_import_${Date.now()}.db`;
      await FileSystem.copyAsync({ from: asset.uri, to: cacheUri });
      base64Data = await FileSystem.readAsStringAsync(cacheUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.deleteAsync(cacheUri, { idempotent: true }).catch(() => {});
    } catch (copyErr) {
      console.error('Failed to read picked file:', readErr, copyErr);
      throw new Error('Unable to read the selected backup file.\nPlease select the .db file again.');
    }
  }

  if (!base64Data || base64Data.length === 0) {
    throw new Error('The selected backup file is empty or corrupted.');
  }

  const dbBytes = base64ToUint8Array(base64Data);

  // 4. Validate SQLite structure & schema in memory (no disk file conflicts!)
  let tempDb: SQLite.SQLiteDatabase | null = null;
  try {
    tempDb = await SQLite.deserializeDatabaseAsync(dbBytes);

    // Verify expected tables exist
    const tables = await tempDb.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const tableNames = tables.map((t) => t.name);
    const requiredTables = ['customers', 'milk_collections', 'transactions'];
    const hasAllRequired = requiredTables.every((t) => tableNames.includes(t));

    if (!hasAllRequired) {
      throw new Error('This backup is not compatible with this version of Digital Dairy.');
    }
  } catch (valErr: any) {
    if (tempDb) {
      await tempDb.closeAsync().catch(() => {});
    }
    if (valErr?.message?.includes('compatible with this version')) {
      throw valErr;
    }
    console.error('SQLite validation error:', valErr);
    throw new Error('This file is not a valid Digital Dairy database backup.');
  }

  // 5. Validation passed! Safely replace the active database
  try {
    // Close active database connection first
    await closeDatabase();

    // Open target active database
    const targetDb = await SQLite.openDatabaseAsync('doodh_khata.db');

    // Atomically transfer all pages from in-memory tempDb to targetDb
    await SQLite.backupDatabaseAsync({
      sourceDatabase: tempDb,
      destDatabase: targetDb,
    });

    // Close in-memory temp database
    await tempDb.closeAsync();

    // Restore any metadata / dispatches / profile stored in app_metadata back to AsyncStorage
    try {
      const metaRows = (await targetDb.getAllAsync(
        'SELECT key, value FROM app_metadata'
      )) as { key: string; value: string }[];
      if (Array.isArray(metaRows)) {
        for (const row of metaRows) {
          if (row.key && row.value) {
            await AsyncStorage.setItem(row.key, row.value);
          }
        }
      }
    } catch {
      // Optional app_metadata
    }

    return { canceled: false };
  } catch (restoreErr) {
    if (tempDb) {
      await tempDb.closeAsync().catch(() => {});
    }
    console.error('Database restore error:', restoreErr);
    throw new Error('Failed to restore database. Please try again.');
  }
}
