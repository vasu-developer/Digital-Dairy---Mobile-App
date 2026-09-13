import * as SQLite from 'expo-sqlite';
import { Customer, MilkCollection, Transaction } from '@/types';

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_COLLECTIONS: MilkCollection[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

let dbInstance: any = null;

export async function getDatabase() {
  if (dbInstance) return dbInstance;

  try {
    const db = await SQLite.openDatabaseAsync('doodh_khata.db');
    await initTables(db);
    dbInstance = db;
    return dbInstance;
  } catch (error) {
    console.warn('SQLite native init warning, fallback to memory store:', error);
    dbInstance = null;
    return null;
  }
}

export async function closeDatabase() {
  if (dbInstance) {
    try {
      await dbInstance.closeAsync();
    } catch (error) {
      console.warn('SQLite close warning:', error);
    }
    dbInstance = null;
  }
}

export async function safeAlterColumn(db: any, table: string, column: string, definition: string) {
  if (!db) return;
  try {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  } catch (err) {
    // Column already exists or table is up to date, perfectly normal in SQLite
  }
}

export async function initTables(db: any) {
  if (!db) return;
  try {
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        farmer_code INTEGER,
        name TEXT NOT NULL,
        phone TEXT,
        village TEXT,
        customer_type TEXT DEFAULT 'SELLER',
        default_sale_rate REAL DEFAULT 60,
        opening_balance REAL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS milk_collections (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        date TEXT NOT NULL,
        session TEXT NOT NULL,
        entry_type TEXT DEFAULT 'PURCHASE',
        quantity REAL NOT NULL,
        fat REAL NOT NULL,
        snf REAL NOT NULL,
        rate REAL NOT NULL,
        amount REAL NOT NULL,
        notes TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        is_credit INTEGER NOT NULL,
        notes TEXT,
        milk_collection_id TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  } catch (initErr) {
    console.warn('Initial CREATE TABLE warning:', initErr);
  }

  // Ensure all columns exist on customers table without relying on DROP COLUMN
  await safeAlterColumn(db, 'customers', 'farmer_code', 'INTEGER');
  await safeAlterColumn(db, 'customers', 'phone', 'TEXT');
  await safeAlterColumn(db, 'customers', 'village', 'TEXT');
  await safeAlterColumn(db, 'customers', 'customer_type', "TEXT DEFAULT 'SELLER'");
  await safeAlterColumn(db, 'customers', 'default_sale_rate', 'REAL DEFAULT 60');
  await safeAlterColumn(db, 'customers', 'opening_balance', 'REAL DEFAULT 0');
  await safeAlterColumn(db, 'customers', 'status', "TEXT DEFAULT 'ACTIVE'");
  await safeAlterColumn(db, 'customers', 'created_at', 'TEXT');

  // Ensure all columns exist on milk_collections table
  await safeAlterColumn(db, 'milk_collections', 'entry_type', "TEXT DEFAULT 'PURCHASE'");
  await safeAlterColumn(db, 'milk_collections', 'notes', 'TEXT');
  await safeAlterColumn(db, 'milk_collections', 'created_at', 'TEXT');

  // Ensure all columns exist on transactions table
  await safeAlterColumn(db, 'transactions', 'notes', 'TEXT');
  await safeAlterColumn(db, 'transactions', 'milk_collection_id', 'TEXT');
  await safeAlterColumn(db, 'transactions', 'created_at', 'TEXT');
}
