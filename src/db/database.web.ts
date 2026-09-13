import { Customer, MilkCollection, Transaction } from '@/types';

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_COLLECTIONS: MilkCollection[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export async function getDatabase(): Promise<any> {
  return null;
}

export async function closeDatabase(): Promise<void> {}

export async function initTables(_db: any): Promise<void> {}

export async function safeAlterColumn(_db: any, _table: string, _column: string, _def: string): Promise<void> {}
