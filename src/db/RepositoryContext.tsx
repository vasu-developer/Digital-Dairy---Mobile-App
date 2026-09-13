import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, MilkCollection, Transaction, MonthlySettlement, MilkDispatch, DailyProfitReport, MonthlyProfitReport } from '@/types';
import { INITIAL_CUSTOMERS, INITIAL_COLLECTIONS, INITIAL_TRANSACTIONS, getDatabase, safeAlterColumn } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateTotalAmount } from '@/utils/calculator';
import {
  DairyPricingSettings,
  DEFAULT_PRICING_SETTINGS,
  DAIRY_PRICING_STORAGE_KEY,
  loadPricingSettings,
  savePricingSettings,
} from '@/utils/rate-chart';

const STORAGE_CUSTOMERS_KEY = '@doodh_khata_customers';
const STORAGE_COLLECTIONS_KEY = '@doodh_khata_collections';
const STORAGE_TRANSACTIONS_KEY = '@doodh_khata_transactions';
const STORAGE_DISPATCHES_KEY = '@doodh_khata_dispatches';

interface RepositoryContextType {
  customers: Customer[];
  collections: MilkCollection[];
  transactions: Transaction[];
  dispatches: MilkDispatch[];
  pricingSettings: DairyPricingSettings;
  updatePricingSettings: (settings: DairyPricingSettings) => Promise<void>;
  getDailyProfit: (date: string) => DailyProfitReport;
  getMonthlyProfit: (monthYear: string) => MonthlyProfitReport;
  addCustomer: (customer: Omit<Customer, 'id'> & { created_at?: string }) => Promise<Customer>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addMilkCollection: (collection: Omit<MilkCollection, 'id' | 'created_at'>) => Promise<MilkCollection>;
  deleteMilkCollection: (id: string) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'created_at'>) => Promise<Transaction>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addMilkDispatch: (dispatch: Omit<MilkDispatch, 'id' | 'dispatched_at'>) => Promise<MilkDispatch>;
  updateMilkDispatch: (dispatch: MilkDispatch) => Promise<void>;
  deleteMilkDispatch: (id: string) => Promise<void>;
  getDispatchByDateSession: (date: string, session: 'MORNING' | 'EVENING') => MilkDispatch | undefined;
  getCustomerById: (id: string) => Customer | undefined;
  getCollectionsByDate: (date: string, session?: 'MORNING' | 'EVENING') => MilkCollection[];
  getCustomerTransactions: (customerId: string) => Transaction[];
  getCustomerBalance: (customerId: string, monthYear?: string) => {
    isBuyer: boolean;
    openingBal: number;
    accumulatedMilkValue: number;
    customerRepayments: number;
    totalDeductions: number;
    netDeductions: number;
    paymentsMade: number;
    payableBalance: number;
    monthMilkLitres?: number;
    previousBalance?: number;
    isPastMonth?: boolean;
    isCurrentMonth?: boolean;
    isFutureMonth?: boolean;
  };
  getMonthlySummary: (monthYear: string) => { totalMilk: number; totalMilkValue: number; activeCustomers: number; daysRecorded: number };
  settleMonth: (customerId: string, monthYear: string) => Promise<MonthlySettlement>;
  refreshData: () => Promise<void>;
}

const RepositoryContext = createContext<RepositoryContextType | null>(null);

export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS || []);
  const [collections, setCollections] = useState<MilkCollection[]>(INITIAL_COLLECTIONS || []);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS || []);
  const [dispatches, setDispatches] = useState<MilkDispatch[]>([]);
  const [pricingSettings, setPricingSettings] = useState<DairyPricingSettings>(DEFAULT_PRICING_SETTINGS);

  const sanitizeCollections = (cols: MilkCollection[]): MilkCollection[] => {
    if (!Array.isArray(cols)) return [];
    const map = new Map<string, MilkCollection>();
    for (const c of cols) {
      if (!c || !c.customer_id || !c.date || !c.session) continue;
      const key = `${String(c.customer_id)}_${c.date}_${c.session}`;
      map.set(key, c);
    }
    return Array.from(map.values());
  };

  const sanitizeTransactions = (txs: Transaction[]): Transaction[] => {
    if (!Array.isArray(txs)) return [];
    const seenMilkTxKeys = new Set<string>();
    const result: Transaction[] = [];

    for (const tx of txs) {
      if (!tx) continue;
      if (tx.type === 'MILK_VAL_EARNED') {
        const sess = tx.notes?.includes('EVENING') ? 'EVENING' : 'MORNING';
        const key = `${String(tx.customer_id)}_${tx.date}_${sess}`;
        if (seenMilkTxKeys.has(key)) continue;
        seenMilkTxKeys.add(key);
      }
      result.push(tx);
    }
    return result;
  };

  const refreshData = async () => {
    // 0. Always load pricing settings
    try {
      const loadedPricing = await loadPricingSettings();
      setPricingSettings(loadedPricing);
    } catch (err) {
      console.warn('Failed to load pricing settings in refreshData:', err);
    }

    // 1. Try Native SQLite first
    const db = await getDatabase();
    if (db) {
      try {
        const custs = await db.getAllAsync('SELECT * FROM customers');
        if (custs && Array.isArray(custs)) {
          setCustomers(custs as Customer[]);
          await AsyncStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(custs)).catch(() => {});
        }
        const cols = await db.getAllAsync('SELECT * FROM milk_collections');
        if (cols && Array.isArray(cols)) {
          const sanitized = sanitizeCollections(cols as MilkCollection[]);
          setCollections(sanitized);
          await AsyncStorage.setItem(STORAGE_COLLECTIONS_KEY, JSON.stringify(sanitized)).catch(() => {});
        }
        const txs = await db.getAllAsync('SELECT * FROM transactions');
        if (txs && Array.isArray(txs)) {
          const sanitized = sanitizeTransactions(txs as Transaction[]);
          setTransactions(sanitized);
          await AsyncStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify(sanitized)).catch(() => {});
        }
        try {
          const storedDispatches = await AsyncStorage.getItem(STORAGE_DISPATCHES_KEY);
          if (storedDispatches) {
            setDispatches(JSON.parse(storedDispatches));
          }
        } catch (err) {
          console.warn('AsyncStorage load dispatches error:', err);
        }
        return;
      } catch (err) {
        console.warn('Native SQLite fetch warning, falling back to AsyncStorage:', err);
      }
    }

    // 2. Fallback to AsyncStorage for Web & memory persistence
    try {
      const storedCusts = await AsyncStorage.getItem(STORAGE_CUSTOMERS_KEY);
      if (storedCusts) setCustomers(JSON.parse(storedCusts));

      const storedCols = await AsyncStorage.getItem(STORAGE_COLLECTIONS_KEY);
      if (storedCols) setCollections(sanitizeCollections(JSON.parse(storedCols)));

      const storedTxs = await AsyncStorage.getItem(STORAGE_TRANSACTIONS_KEY);
      if (storedTxs) setTransactions(sanitizeTransactions(JSON.parse(storedTxs)));

      const storedDispatches = await AsyncStorage.getItem(STORAGE_DISPATCHES_KEY);
      if (storedDispatches) setDispatches(JSON.parse(storedDispatches));
    } catch (err) {
      console.warn('AsyncStorage load warning:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const safeCustomers = customers || [];
  const safeCollections = collections || [];
  const safeTransactions = transactions || [];
  const safeDispatches = dispatches || [];

  const addCustomer = async (custData: Omit<Customer, 'id'> & { created_at?: string }): Promise<Customer> => {
    const nextCode = custData.farmer_code || (safeCustomers.length > 0 ? Math.max(...safeCustomers.map((c) => c.farmer_code || 0)) + 1 : 1);
    const newCustomer: Customer = {
      ...custData,
      farmer_code: nextCode,
      customer_type: custData.customer_type || 'SELLER',
      default_sale_rate: custData.default_sale_rate || 60,
      opening_balance: custData.opening_balance || 0,
      id: 'c_' + Date.now(),
      created_at: custData.created_at || new Date().toISOString().split('T')[0],
    };

    const updatedCusts = [newCustomer, ...safeCustomers];
    setCustomers(updatedCusts);

    try {
      await AsyncStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(updatedCusts));
    } catch (err) {
      console.warn('AsyncStorage setItem customer error:', err);
    }

    const db = await getDatabase();
    if (db) {
      try {
        await db.runAsync(
          'INSERT INTO customers (id, farmer_code, name, phone, village, customer_type, default_sale_rate, opening_balance, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [newCustomer.id, newCustomer.farmer_code || null, newCustomer.name, newCustomer.phone || '', newCustomer.village || '', newCustomer.customer_type || 'SELLER', newCustomer.default_sale_rate || 60, newCustomer.opening_balance || 0, newCustomer.status, newCustomer.created_at]
        );
      } catch (err: any) {
        console.warn('DB insert customer primary attempt error, executing safe schema recovery:', err);
        try {
          await safeAlterColumn(db, 'customers', 'farmer_code', 'INTEGER');
          await safeAlterColumn(db, 'customers', 'phone', 'TEXT');
          await safeAlterColumn(db, 'customers', 'village', 'TEXT');
          await safeAlterColumn(db, 'customers', 'customer_type', "TEXT DEFAULT 'SELLER'");
          await safeAlterColumn(db, 'customers', 'default_sale_rate', 'REAL DEFAULT 60');
          await safeAlterColumn(db, 'customers', 'opening_balance', 'REAL DEFAULT 0');
          await safeAlterColumn(db, 'customers', 'status', "TEXT DEFAULT 'ACTIVE'");
          await safeAlterColumn(db, 'customers', 'created_at', 'TEXT');

          await db.runAsync(
            'INSERT INTO customers (id, farmer_code, name, phone, village, customer_type, default_sale_rate, opening_balance, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [newCustomer.id, newCustomer.farmer_code || null, newCustomer.name, newCustomer.phone || '', newCustomer.village || '', newCustomer.customer_type || 'SELLER', newCustomer.default_sale_rate || 60, newCustomer.opening_balance || 0, newCustomer.status, newCustomer.created_at]
          );
        } catch (retryErr) {
          try {
            await db.runAsync(
              'INSERT INTO customers (id, name, phone, village, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [newCustomer.id, newCustomer.name, newCustomer.phone || '', newCustomer.village || '', newCustomer.status, newCustomer.created_at]
            );
          } catch (fallbackErr) {
            console.warn('DB insert customer stored in state and AsyncStorage:', fallbackErr);
          }
        }
      }
    }

    return newCustomer;
  };

  const updateCustomer = async (updatedCust: Customer): Promise<void> => {
    const nextCusts = safeCustomers.map((c) => (c.id === updatedCust.id ? updatedCust : c));
    setCustomers(nextCusts);

    try {
      await AsyncStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(nextCusts));
    } catch (err) {
      console.warn('AsyncStorage updateCustomer error:', err);
    }

    const db = await getDatabase();
    if (db) {
      try {
        await db.runAsync(
          'UPDATE customers SET farmer_code = ?, name = ?, phone = ?, village = ?, customer_type = ?, default_sale_rate = ?, opening_balance = ?, status = ? WHERE id = ?',
          [updatedCust.farmer_code || null, updatedCust.name, updatedCust.phone || '', updatedCust.village || '', updatedCust.customer_type || 'SELLER', updatedCust.default_sale_rate || 60, updatedCust.opening_balance || 0, updatedCust.status, updatedCust.id]
        );
      } catch (err: any) {
        console.warn('DB updateCustomer primary attempt error, executing safe schema recovery:', err);
        try {
          await safeAlterColumn(db, 'customers', 'farmer_code', 'INTEGER');
          await safeAlterColumn(db, 'customers', 'phone', 'TEXT');
          await safeAlterColumn(db, 'customers', 'village', 'TEXT');
          await safeAlterColumn(db, 'customers', 'customer_type', "TEXT DEFAULT 'SELLER'");
          await safeAlterColumn(db, 'customers', 'default_sale_rate', 'REAL DEFAULT 60');
          await safeAlterColumn(db, 'customers', 'opening_balance', 'REAL DEFAULT 0');
          await safeAlterColumn(db, 'customers', 'status', "TEXT DEFAULT 'ACTIVE'");
          await safeAlterColumn(db, 'customers', 'created_at', 'TEXT');

          await db.runAsync(
            'UPDATE customers SET farmer_code = ?, name = ?, phone = ?, village = ?, customer_type = ?, default_sale_rate = ?, opening_balance = ?, status = ? WHERE id = ?',
            [updatedCust.farmer_code || null, updatedCust.name, updatedCust.phone || '', updatedCust.village || '', updatedCust.customer_type || 'SELLER', updatedCust.default_sale_rate || 60, updatedCust.opening_balance || 0, updatedCust.status, updatedCust.id]
          );
        } catch (retryErr) {
          try {
            await db.runAsync(
              'UPDATE customers SET name = ?, phone = ?, village = ?, status = ? WHERE id = ?',
              [updatedCust.name, updatedCust.phone || '', updatedCust.village || '', updatedCust.status, updatedCust.id]
            );
          } catch (fallbackErr) {
            console.warn('DB updateCustomer stored in state and AsyncStorage:', fallbackErr);
          }
        }
      }
    }
  };

  const deleteCustomer = async (id: string): Promise<void> => {
    const nextCusts = safeCustomers.filter((c) => c.id !== id);
    setCustomers(nextCusts);

    try {
      await AsyncStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(nextCusts));
    } catch (err) {
      console.warn('AsyncStorage deleteCustomer error:', err);
    }

    const db = await getDatabase();
    if (db) {
      try {
        await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
      } catch (err) {
        console.error('DB deleteCustomer error:', err);
      }
    }
  };

  const addMilkCollection = async (collData: Omit<MilkCollection, 'id' | 'created_at'>): Promise<MilkCollection> => {
    const customer = safeCustomers.find((c) => c && String(c.id) === String(collData.customer_id));
    const customerName = customer?.name || collData.customer_name || 'Customer';
    const villageName = customer?.village || collData.village || '';
    const computedAmount = collData.amount !== undefined ? collData.amount : calculateTotalAmount(collData.quantity, collData.rate);

    const targetCustId = collData.customer_id;

    const existingIndex = safeCollections.findIndex(
      (c) => c && String(c.customer_id) === String(targetCustId) && c.date === collData.date && c.session === collData.session
    );

    let finalCollection: MilkCollection;
    if (existingIndex >= 0) {
      const existing = safeCollections[existingIndex];
      finalCollection = {
        ...existing,
        ...collData,
        customer_id: targetCustId,
        customer_name: customerName,
        village: villageName,
        amount: computedAmount,
      };
    } else {
      finalCollection = {
        ...collData,
        id: 'm_' + Date.now(),
        customer_id: targetCustId,
        customer_name: customerName,
        village: villageName,
        amount: computedAmount,
        created_at: new Date().toISOString(),
      };
    }

    const remainingCols = safeCollections.filter(
      (c) => !(c && String(c.customer_id) === String(targetCustId) && c.date === collData.date && c.session === collData.session)
    );
    const updatedCols = [finalCollection, ...remainingCols];

    const existingTx = safeTransactions.find(
      (tx) =>
        tx &&
        (tx.milk_collection_id === finalCollection.id ||
          (String(tx.customer_id) === String(targetCustId) &&
            tx.date === collData.date &&
            tx.type === 'MILK_VAL_EARNED' &&
            tx.notes?.includes(collData.session)))
    );

    const finalTx: Transaction = {
      id: existingTx?.id || ('t_' + Date.now()),
      customer_id: finalCollection.customer_id,
      customer_name: finalCollection.customer_name,
      date: finalCollection.date,
      type: 'MILK_VAL_EARNED',
      category: 'Milk Value',
      amount: finalCollection.amount || 0,
      is_credit: 1,
      notes: `Milk Record (${finalCollection.session}) ${finalCollection.quantity}L @ ₹${finalCollection.rate}`,
      milk_collection_id: finalCollection.id,
      created_at: existingTx?.created_at || new Date().toISOString(),
    };

    const remainingTxs = safeTransactions.filter(
      (tx) =>
        !(
          tx &&
          (tx.id === finalTx.id ||
            tx.milk_collection_id === finalCollection.id ||
            (String(tx.customer_id) === String(targetCustId) &&
              tx.date === collData.date &&
              tx.type === 'MILK_VAL_EARNED' &&
              tx.notes?.includes(collData.session)))
        )
    );
    const updatedTxs = [finalTx, ...remainingTxs];

    setCollections(updatedCols);
    setTransactions(updatedTxs);

    try {
      await AsyncStorage.setItem(STORAGE_COLLECTIONS_KEY, JSON.stringify(updatedCols));
      await AsyncStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify(updatedTxs));
    } catch (err) {
      console.warn('AsyncStorage setItem collection error:', err);
    }

    const db = await getDatabase();
    if (db) {
      try {
        await db.runAsync(
          'DELETE FROM milk_collections WHERE (customer_id = ? OR CAST(customer_id AS TEXT) = ?) AND date = ? AND session = ?',
          [targetCustId, String(targetCustId), collData.date, collData.session]
        );

        try {
          await db.runAsync(
            'INSERT INTO milk_collections (id, customer_id, date, session, quantity, fat, snf, rate, amount, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              finalCollection.id,
              finalCollection.customer_id,
              finalCollection.date,
              finalCollection.session,
              finalCollection.quantity,
              finalCollection.fat,
              finalCollection.snf,
              finalCollection.rate,
              finalCollection.amount,
              finalCollection.notes || '',
              finalCollection.created_at,
            ]
          );
        } catch (mInsertErr: any) {
          if (mInsertErr?.message?.includes('milk_type') || String(mInsertErr).includes('milk_type')) {
            await db.runAsync(
              'INSERT INTO milk_collections (id, customer_id, date, session, milk_type, quantity, fat, snf, rate, amount, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                finalCollection.id,
                finalCollection.customer_id,
                finalCollection.date,
                finalCollection.session,
                'BUFFALO',
                finalCollection.quantity,
                finalCollection.fat,
                finalCollection.snf,
                finalCollection.rate,
                finalCollection.amount,
                finalCollection.notes || '',
                finalCollection.created_at,
              ]
            );
          } else {
            throw mInsertErr;
          }
        }

        await db.runAsync(
          'DELETE FROM transactions WHERE milk_collection_id = ? OR ((customer_id = ? OR CAST(customer_id AS TEXT) = ?) AND date = ? AND type = "MILK_VAL_EARNED" AND notes LIKE ?)',
          [finalCollection.id, targetCustId, String(targetCustId), collData.date, `%${collData.session}%`]
        );
        await db.runAsync(
          'INSERT INTO transactions (id, customer_id, date, type, category, amount, is_credit, notes, milk_collection_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            finalTx.id,
            finalTx.customer_id,
            finalTx.date,
            finalTx.type,
            finalTx.category,
            finalTx.amount,
            finalTx.is_credit,
            finalTx.notes || '',
            finalTx.milk_collection_id || '',
            finalTx.created_at,
          ]
        );
      } catch (err) {
        console.error('DB collection save error:', err);
      }
    }

    return finalCollection;
  };

  const deleteMilkCollection = async (id: string): Promise<void> => {
    const targetColl = safeCollections.find((c) => c && c.id === id);
    const updatedCols = safeCollections.filter((c) => c.id !== id);

    // Also remove the linked transaction
    const updatedTxs = safeTransactions.filter(
      (tx) =>
        !(
          tx &&
          (tx.milk_collection_id === id ||
            (targetColl &&
              String(tx.customer_id) === String(targetColl.customer_id) &&
              tx.date === targetColl.date &&
              tx.type === 'MILK_VAL_EARNED' &&
              tx.notes?.includes(targetColl.session)))
        )
    );

    setCollections(updatedCols);
    setTransactions(updatedTxs);

    try {
      await AsyncStorage.setItem(STORAGE_COLLECTIONS_KEY, JSON.stringify(updatedCols));
      await AsyncStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify(updatedTxs));
    } catch (err) {
      console.warn('AsyncStorage deleteMilkCollection error:', err);
    }

    const db = await getDatabase();
    if (db) {
      try {
        await db.runAsync('DELETE FROM milk_collections WHERE id = ?', [id]);
        await db.runAsync(
          'DELETE FROM transactions WHERE milk_collection_id = ? OR ((customer_id = ? OR CAST(customer_id AS TEXT) = ?) AND date = ? AND type = "MILK_VAL_EARNED" AND notes LIKE ?)',
          [id, targetColl?.customer_id, String(targetColl?.customer_id), targetColl?.date, `%${targetColl?.session}%`]
        );
      } catch (err) {
        console.error('DB deleteMilkCollection error:', err);
      }
    }
  };

  const addTransaction = async (txData: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> => {
    const customer = safeCustomers.find((c) => c && String(c.id) === String(txData.customer_id));
    const newTx: Transaction = {
      ...txData,
      id: 't_' + Date.now(),
      customer_name: customer?.name || txData.customer_name,
      created_at: new Date().toISOString(),
    };

    const updatedTxs = [newTx, ...safeTransactions];
    setTransactions(updatedTxs);

    try {
      await AsyncStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify(updatedTxs));
    } catch (err) {
      console.warn('AsyncStorage setItem tx error:', err);
    }

    const db = await getDatabase();
    if (db) {
      try {
        await db.runAsync(
          'INSERT INTO transactions (id, customer_id, date, type, category, amount, is_credit, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [newTx.id, newTx.customer_id, newTx.date, newTx.type, newTx.category, newTx.amount, newTx.is_credit, newTx.notes || '', newTx.created_at]
        );
      } catch (err) {
        console.error('DB insert transaction error:', err);
      }
    }

    return newTx;
  };

  const updateTransaction = async (updatedTx: Transaction): Promise<void> => {
    const customer = safeCustomers.find((c) => c && String(c.id) === String(updatedTx.customer_id));
    const finalTx: Transaction = {
      ...updatedTx,
      customer_name: customer?.name || updatedTx.customer_name,
    };

    const nextTxs = safeTransactions.map((t) => (t.id === finalTx.id ? finalTx : t));
    setTransactions(nextTxs);

    try {
      await AsyncStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify(nextTxs));
    } catch (err) {
      console.warn('AsyncStorage updateTransaction error:', err);
    }

    const db = await getDatabase();
    if (db) {
      try {
        await db.runAsync(
          'UPDATE transactions SET customer_id = ?, date = ?, type = ?, category = ?, amount = ?, is_credit = ?, notes = ? WHERE id = ?',
          [finalTx.customer_id, finalTx.date, finalTx.type, finalTx.category, finalTx.amount, finalTx.is_credit, finalTx.notes || '', finalTx.id]
        );
      } catch (err) {
        console.error('DB update transaction error:', err);
      }
    }
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    const nextTxs = safeTransactions.filter((t) => t.id !== id);
    setTransactions(nextTxs);

    try {
      await AsyncStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify(nextTxs));
    } catch (err) {
      console.warn('AsyncStorage deleteTransaction error:', err);
    }

    const db = await getDatabase();
    if (db) {
      try {
        await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
      } catch (err) {
        console.error('DB delete transaction error:', err);
      }
    }
  };

  const getCustomerById = (id: string) => safeCustomers.find((c) => c && String(c.id) === String(id));

  const getCollectionsByDate = (date: string, session?: 'MORNING' | 'EVENING') => {
    return safeCollections.filter((c) => c && c.date === date && (!session || c.session === session));
  };

  const getCustomerTransactions = (customerId: string) => {
    return safeTransactions.filter((t) => t && String(t.customer_id) === String(customerId));
  };

  const getCustomerBalance = (customerId: string, monthYear?: string) => {
    if (!customerId) {
      return {
        isBuyer: false,
        openingBal: 0,
        accumulatedMilkValue: 0,
        customerRepayments: 0,
        totalDeductions: 0,
        netDeductions: 0,
        paymentsMade: 0,
        payableBalance: 0,
        monthMilkLitres: 0,
        previousBalance: 0,
        isPastMonth: false,
        isCurrentMonth: true,
        isFutureMonth: false,
      };
    }

    const customer = safeCustomers.find((c) => c && String(c.id) === String(customerId));
    const isBuyer = customer?.customer_type === 'BUYER';
    const openingBal = customer?.opening_balance || 0;

    const _now = new Date();
    const currentYear = _now.getFullYear();
    const currentMonthIndex = _now.getMonth();
    const currentMonthStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

    const isPastMonth = Boolean(monthYear && monthYear < currentMonthStr);
    const isCurrentMonth = Boolean(!monthYear || monthYear === currentMonthStr);
    const isFutureMonth = Boolean(monthYear && monthYear > currentMonthStr);

    const custCols = safeCollections.filter((c) => c && String(c.customer_id) === String(customerId));
    const custTxs = safeTransactions.filter((t) => t && String(t.customer_id) === String(customerId));

    if (monthYear) {
      // 1. Month-specific collections
      const monthCols = custCols.filter((c) => c && c.date && typeof c.date === 'string' && c.date.startsWith(monthYear));
      const monthMilkLitres = monthCols.reduce((acc, c) => acc + (c?.quantity || 0), 0);
      const monthRecordedAmount = monthCols.reduce((acc, c) => acc + (c?.amount || 0), 0);
      const accumulatedMilkValue = isBuyer
        ? (monthRecordedAmount > 0 ? monthRecordedAmount : monthMilkLitres * (customer?.default_sale_rate || 60))
        : monthRecordedAmount;

      // 2. Month-specific transactions
      const monthTxs = custTxs.filter((t) => t && t.date && typeof t.date === 'string' && t.date.startsWith(monthYear));
      let totalDeductions = 0;
      let paymentsMade = 0;
      let customerRepayments = 0;

      for (const tx of monthTxs) {
        if (tx) {
          if (tx.type === 'ADVANCE_GIVEN' || tx.type === 'CATTLE_FEED' || tx.type === 'GROCERY' || tx.type === 'OTHER_DEDUCTION' || tx.category === 'Advance' || tx.category === 'Expense') {
            totalDeductions += tx.amount || 0;
          } else if (tx.type === 'PAYMENT_MADE' || tx.category === 'Payment') {
            paymentsMade += tx.amount || 0;
          } else if (tx.type === 'CUSTOMER_PAYMENT_RECEIVED' || tx.category === 'Received') {
            customerRepayments += tx.amount || 0;
          }
        }
      }
      const netDeductions = Math.max(0, totalDeductions - customerRepayments);

      // 3. Cumulative up to end of monthYear (closing balance)
      const cumCols = custCols.filter((c) => c && c.date && typeof c.date === 'string' && c.date.slice(0, 7) <= monthYear);
      const cumAmount = cumCols.reduce((acc, c) => acc + (c?.amount || 0), 0);
      const cumLitres = cumCols.reduce((acc, c) => acc + (c?.quantity || 0), 0);
      const cumMilkValue = isBuyer
        ? (cumAmount > 0 ? cumAmount : cumLitres * (customer?.default_sale_rate || 60))
        : cumAmount;

      const cumTxs = custTxs.filter((t) => t && t.date && typeof t.date === 'string' && t.date.slice(0, 7) <= monthYear);
      let cumDeduct = 0;
      let cumPayments = 0;
      let cumRepay = 0;

      for (const tx of cumTxs) {
        if (tx) {
          if (tx.type === 'ADVANCE_GIVEN' || tx.type === 'CATTLE_FEED' || tx.type === 'GROCERY' || tx.type === 'OTHER_DEDUCTION' || tx.category === 'Advance' || tx.category === 'Expense') {
            cumDeduct += tx.amount || 0;
          } else if (tx.type === 'PAYMENT_MADE' || tx.category === 'Payment') {
            cumPayments += tx.amount || 0;
          } else if (tx.type === 'CUSTOMER_PAYMENT_RECEIVED' || tx.category === 'Received') {
            cumRepay += tx.amount || 0;
          }
        }
      }

      // Previous balance before this month (date < monthYear-01)
      const prevCols = custCols.filter((c) => c && c.date && typeof c.date === 'string' && c.date.slice(0, 7) < monthYear);
      const prevAmount = prevCols.reduce((acc, c) => acc + (c?.amount || 0), 0);
      const prevLitres = prevCols.reduce((acc, c) => acc + (c?.quantity || 0), 0);
      const prevMilkVal = isBuyer
        ? (prevAmount > 0 ? prevAmount : prevLitres * (customer?.default_sale_rate || 60))
        : prevAmount;

      const prevTxs = custTxs.filter((t) => t && t.date && typeof t.date === 'string' && t.date.slice(0, 7) < monthYear);
      let prevDeduct = 0;
      let prevPayments = 0;
      let prevRepay = 0;
      for (const tx of prevTxs) {
        if (tx) {
          if (tx.type === 'ADVANCE_GIVEN' || tx.type === 'CATTLE_FEED' || tx.type === 'GROCERY' || tx.type === 'OTHER_DEDUCTION' || tx.category === 'Advance' || tx.category === 'Expense') {
            prevDeduct += tx.amount || 0;
          } else if (tx.type === 'PAYMENT_MADE' || tx.category === 'Payment') {
            prevPayments += tx.amount || 0;
          } else if (tx.type === 'CUSTOMER_PAYMENT_RECEIVED' || tx.category === 'Received') {
            prevRepay += tx.amount || 0;
          }
        }
      }

      const previousBalance = isBuyer
        ? openingBal + prevMilkVal + prevDeduct - prevRepay - prevPayments
        : openingBal + prevMilkVal + prevRepay - prevDeduct - prevPayments;

      const payableBalance = isBuyer
        ? openingBal + cumMilkValue + cumDeduct - cumRepay - cumPayments
        : openingBal + cumMilkValue + cumRepay - cumDeduct - cumPayments;

      return {
        isBuyer,
        openingBal,
        accumulatedMilkValue,
        customerRepayments,
        totalDeductions,
        netDeductions,
        paymentsMade,
        payableBalance,
        monthMilkLitres,
        previousBalance,
        isPastMonth,
        isCurrentMonth,
        isFutureMonth,
      };
    }

    // Default: All-time overall balance across entire history
    const totalLitres = custCols.reduce((acc, c) => acc + (c?.quantity || 0), 0);
    const recordedAmount = custCols.reduce((acc, c) => acc + (c?.amount || 0), 0);
    const accumulatedMilkValue = isBuyer
      ? (recordedAmount > 0 ? recordedAmount : totalLitres * (customer?.default_sale_rate || 60))
      : recordedAmount;

    let totalDeductions = 0;
    let paymentsMade = 0;
    let customerRepayments = 0;

    for (const tx of custTxs) {
      if (tx) {
        if (tx.type === 'ADVANCE_GIVEN' || tx.type === 'CATTLE_FEED' || tx.type === 'GROCERY' || tx.type === 'OTHER_DEDUCTION' || tx.category === 'Advance' || tx.category === 'Expense') {
          totalDeductions += tx.amount || 0;
        } else if (tx.type === 'PAYMENT_MADE' || tx.category === 'Payment') {
          paymentsMade += tx.amount || 0;
        } else if (tx.type === 'CUSTOMER_PAYMENT_RECEIVED' || tx.category === 'Received') {
          customerRepayments += tx.amount || 0;
        }
      }
    }

    const netDeductions = Math.max(0, totalDeductions - customerRepayments);

    const payableBalance = isBuyer
      ? openingBal + accumulatedMilkValue + totalDeductions - customerRepayments - paymentsMade
      : openingBal + accumulatedMilkValue + customerRepayments - totalDeductions - paymentsMade;

    return {
      isBuyer,
      openingBal,
      accumulatedMilkValue,
      customerRepayments,
      totalDeductions,
      netDeductions,
      paymentsMade,
      payableBalance,
      monthMilkLitres: totalLitres,
      previousBalance: openingBal,
      isPastMonth: false,
      isCurrentMonth: true,
      isFutureMonth: false,
    };
  };

  const getMonthlySummary = (monthYear: string) => {
    if (!monthYear) {
      return { totalMilk: 0, totalMilkValue: 0, activeCustomers: 0, daysRecorded: 0 };
    }

    const monthCols = safeCollections.filter((c) => c && c.date && typeof c.date === 'string' && c.date.startsWith(monthYear));
    let netMilk = 0;
    let sellerMilkValue = 0;

    for (const c of monthCols) {
      if (c) {
        const cust = safeCustomers.find((cust) => String(cust.id) === String(c.customer_id));
        const isBuyer = cust?.customer_type === 'BUYER';
        if (isBuyer) {
          netMilk -= (c.quantity || 0);
        } else {
          netMilk += (c.quantity || 0);
          sellerMilkValue += (c.amount || 0);
        }
      }
    }

    const datesRecorded = new Set(monthCols.map((c) => c.date)).size;

    return {
      totalMilk: Math.max(0, Math.round(netMilk * 10) / 10),
      totalMilkValue: Math.round(sellerMilkValue),
      activeCustomers: safeCustomers.filter((c) => c && c.status === 'ACTIVE').length,
      daysRecorded: datesRecorded,
    };
  };

  const settleMonth = async (customerId: string, monthYear: string): Promise<MonthlySettlement> => {
    const customer = safeCustomers.find((c) => c && String(c.id) === String(customerId));
    const isBuyer = customer?.customer_type === 'BUYER';
    const rate = customer?.default_sale_rate || 60;

    const custCols = safeCollections.filter((c) => c && String(c.customer_id) === String(customerId) && c.date && typeof c.date === 'string' && c.date.startsWith(monthYear));
    const custTxs = safeTransactions.filter((t) => t && String(t.customer_id) === String(customerId) && t.date && typeof t.date === 'string' && t.date.startsWith(monthYear));

    const previousCols = safeCollections.filter((c) => c && String(c.customer_id) === String(customerId) && c.date && typeof c.date === 'string' && c.date < `${monthYear}-01`);
    const previousTxs = safeTransactions.filter((t) => t && String(t.customer_id) === String(customerId) && t.date && typeof t.date === 'string' && t.date < `${monthYear}-01`);

    const prevColsAmount = previousCols.reduce((acc, c) => acc + (c?.amount || 0), 0);
    const prevMilkVal = isBuyer && prevColsAmount === 0
      ? previousCols.reduce((acc, c) => acc + (c?.quantity || 0), 0) * rate
      : prevColsAmount;

    let prevDeduct = 0;
    let prevPayments = 0;
    let prevRepay = 0;
    for (const t of previousTxs) {
      if (t) {
        if (t.type === 'ADVANCE_GIVEN' || t.type === 'CATTLE_FEED' || t.type === 'GROCERY' || t.type === 'OTHER_DEDUCTION') {
          prevDeduct += t.amount || 0;
        } else if (t.type === 'PAYMENT_MADE') {
          prevPayments += t.amount || 0;
        } else if (t.type === 'CUSTOMER_PAYMENT_RECEIVED') {
          prevRepay += t.amount || 0;
        }
      }
    }
    const previousBalance = isBuyer
      ? prevMilkVal + prevDeduct - prevRepay - prevPayments
      : prevMilkVal + prevRepay - prevDeduct - prevPayments;

    const currentColsAmount = custCols.reduce((acc, c) => acc + (c?.amount || 0), 0);
    const milkValueTotal = isBuyer && currentColsAmount === 0
      ? custCols.reduce((acc, c) => acc + (c?.quantity || 0), 0) * rate
      : currentColsAmount;

    const deductions = custTxs
      .filter((t) => t && (t.type === 'ADVANCE_GIVEN' || t.type === 'CATTLE_FEED' || t.type === 'GROCERY' || t.type === 'OTHER_DEDUCTION'))
      .reduce((acc, t) => acc + (t?.amount || 0), 0);
    const actualPaymentsMade = custTxs
      .filter((t) => t && t.type === 'PAYMENT_MADE')
      .reduce((acc, t) => acc + (t?.amount || 0), 0);
    const customerRepayments = custTxs
      .filter((t) => t && t.type === 'CUSTOMER_PAYMENT_RECEIVED')
      .reduce((acc, t) => acc + (t?.amount || 0), 0);

    const closingBalance = isBuyer
      ? previousBalance + milkValueTotal + deductions - customerRepayments - actualPaymentsMade
      : previousBalance + milkValueTotal + customerRepayments - deductions - actualPaymentsMade;

    const settlement: MonthlySettlement = {
      id: 's_' + Date.now(),
      customer_id: customerId,
      month_year: monthYear,
      previous_balance: previousBalance,
      milk_value_total: milkValueTotal,
      total_deductions: deductions,
      actual_payments_made: actualPaymentsMade,
      closing_balance: closingBalance,
      status: 'SETTLED',
      settled_at: new Date().toISOString(),
    };

    return settlement;
  };

  const addMilkDispatch = async (dispatchData: Omit<MilkDispatch, 'id' | 'dispatched_at'>): Promise<MilkDispatch> => {
    const newDispatch: MilkDispatch = {
      ...dispatchData,
      id: 'd_' + Date.now(),
      dispatched_at: new Date().toISOString(),
    };

    const existingIdx = safeDispatches.findIndex(
      (d) => d && d.date === newDispatch.date && d.session === newDispatch.session
    );
    let updatedDispatches: MilkDispatch[];
    if (existingIdx >= 0) {
      updatedDispatches = [...safeDispatches];
      updatedDispatches[existingIdx] = newDispatch;
    } else {
      updatedDispatches = [newDispatch, ...safeDispatches];
    }

    setDispatches(updatedDispatches);
    try {
      await AsyncStorage.setItem(STORAGE_DISPATCHES_KEY, JSON.stringify(updatedDispatches));
    } catch (err) {
      console.warn('AsyncStorage setItem dispatches error:', err);
    }

    return newDispatch;
  };

  const updateMilkDispatch = async (updatedDispatch: MilkDispatch): Promise<void> => {
    const updated = safeDispatches.map((d) => (d.id === updatedDispatch.id ? updatedDispatch : d));
    setDispatches(updated);
    try {
      await AsyncStorage.setItem(STORAGE_DISPATCHES_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('AsyncStorage update dispatch error:', err);
    }
  };

  const deleteMilkDispatch = async (id: string): Promise<void> => {
    const updated = safeDispatches.filter((d) => d.id !== id);
    setDispatches(updated);
    try {
      await AsyncStorage.setItem(STORAGE_DISPATCHES_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('AsyncStorage delete dispatch error:', err);
    }
  };

  const getDispatchByDateSession = (date: string, session: 'MORNING' | 'EVENING'): MilkDispatch | undefined => {
    return safeDispatches.find((d) => d && d.date === date && d.session === session);
  };

  const updatePricingSettings = async (newSettings: DairyPricingSettings): Promise<void> => {
    await savePricingSettings(newSettings);
    setPricingSettings(newSettings);
    const db = await getDatabase();
    if (db) {
      try {
        await db.runAsync(
          'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
          [DAIRY_PRICING_STORAGE_KEY, JSON.stringify(newSettings)]
        );
      } catch (err) {
        console.warn('Failed to persist pricing settings to app_metadata:', err);
      }
    }
  };

  const getDailyProfit = (date: string): DailyProfitReport => {
    const dayCols = safeCollections.filter((c) => c && c.date === date);
    let totalFarmerLitres = 0;
    let totalFarmerAmount = 0;
    let totalLocalSaleLitres = 0;
    let totalLocalSaleAmount = 0;

    for (const c of dayCols) {
      const cust = safeCustomers.find((cust) => String(cust.id) === String(c.customer_id));
      const isBuyer = c.entry_type === 'SALE' || cust?.customer_type === 'BUYER';
      const qty = c.quantity || 0;
      const amt = c.amount || 0;

      if (isBuyer) {
        totalLocalSaleLitres += qty;
        totalLocalSaleAmount += amt;
      } else {
        totalFarmerLitres += qty;
        totalFarmerAmount += amt;
      }
    }

    const dayDispatches = safeDispatches.filter((d) => d && d.date === date);
    let totalDispatchedLitres = 0;
    let totalDispatchedAmount = 0;
    let isRatePending = false;

    for (const d of dayDispatches) {
      const qty = d.dispatched_litres || 0;
      totalDispatchedLitres += qty;

      let amt = d.amount || 0;
      if (amt <= 0 && d.rate && d.rate > 0) {
        amt = Math.round(qty * d.rate * 100) / 100;
      }
      if (qty > 0 && (!d.rate || d.rate <= 0)) {
        isRatePending = true;
      }
      totalDispatchedAmount += amt;
    }

    const netProfit = Math.round((totalDispatchedAmount + totalLocalSaleAmount - totalFarmerAmount) * 100) / 100;
    const profitMarginPerLitre = totalFarmerLitres > 0
      ? Math.round((netProfit / totalFarmerLitres) * 100) / 100
      : 0;

    return {
      date,
      totalFarmerLitres: Math.round(totalFarmerLitres * 100) / 100,
      totalFarmerAmount: Math.round(totalFarmerAmount * 100) / 100,
      totalDispatchedLitres: Math.round(totalDispatchedLitres * 100) / 100,
      totalDispatchedAmount: Math.round(totalDispatchedAmount * 100) / 100,
      totalLocalSaleLitres: Math.round(totalLocalSaleLitres * 100) / 100,
      totalLocalSaleAmount: Math.round(totalLocalSaleAmount * 100) / 100,
      netProfit,
      profitMarginPerLitre,
      hasDispatch: dayDispatches.length > 0,
      isRatePending,
    };
  };

  const getMonthlyProfit = (monthYear: string): MonthlyProfitReport => {
    const monthPrefix = monthYear; // e.g. "2026-09"
    const monthCols = safeCollections.filter((c) => c && c.date && c.date.startsWith(monthPrefix));
    let totalFarmerLitres = 0;
    let totalFarmerAmount = 0;
    let totalLocalSaleLitres = 0;
    let totalLocalSaleAmount = 0;

    for (const c of monthCols) {
      const cust = safeCustomers.find((cust) => String(cust.id) === String(c.customer_id));
      const isBuyer = c.entry_type === 'SALE' || cust?.customer_type === 'BUYER';
      const qty = c.quantity || 0;
      const amt = c.amount || 0;

      if (isBuyer) {
        totalLocalSaleLitres += qty;
        totalLocalSaleAmount += amt;
      } else {
        totalFarmerLitres += qty;
        totalFarmerAmount += amt;
      }
    }

    const monthDispatches = safeDispatches.filter((d) => d && d.date && d.date.startsWith(monthPrefix));
    let totalDispatchedLitres = 0;
    let totalDispatchedAmount = 0;
    let pendingDispatchRateCount = 0;

    for (const d of monthDispatches) {
      const qty = d.dispatched_litres || 0;
      totalDispatchedLitres += qty;

      let amt = d.amount || 0;
      if (amt <= 0 && d.rate && d.rate > 0) {
        amt = Math.round(qty * d.rate * 100) / 100;
      }
      if (qty > 0 && (!d.rate || d.rate <= 0)) {
        pendingDispatchRateCount += 1;
      }
      totalDispatchedAmount += amt;
    }

    const netProfit = Math.round((totalDispatchedAmount + totalLocalSaleAmount - totalFarmerAmount) * 100) / 100;
    const profitMarginPerLitre = totalFarmerLitres > 0
      ? Math.round((netProfit / totalFarmerLitres) * 100) / 100
      : 0;

    return {
      monthYear,
      totalFarmerLitres: Math.round(totalFarmerLitres * 100) / 100,
      totalFarmerAmount: Math.round(totalFarmerAmount * 100) / 100,
      totalDispatchedLitres: Math.round(totalDispatchedLitres * 100) / 100,
      totalDispatchedAmount: Math.round(totalDispatchedAmount * 100) / 100,
      totalLocalSaleLitres: Math.round(totalLocalSaleLitres * 100) / 100,
      totalLocalSaleAmount: Math.round(totalLocalSaleAmount * 100) / 100,
      netProfit,
      profitMarginPerLitre,
      totalDispatchesRecorded: monthDispatches.length,
      pendingDispatchRateCount,
    };
  };

  return (
    <RepositoryContext.Provider
      value={{
        customers: safeCustomers,
        collections: safeCollections,
        transactions: safeTransactions,
        dispatches: safeDispatches,
        pricingSettings,
        updatePricingSettings,
        getDailyProfit,
        getMonthlyProfit,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addMilkCollection,
        deleteMilkCollection,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addMilkDispatch,
        updateMilkDispatch,
        deleteMilkDispatch,
        getDispatchByDateSession,
        getCustomerById,
        getCollectionsByDate,
        getCustomerTransactions,
        getCustomerBalance,
        getMonthlySummary,
        settleMonth,
        refreshData,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
};

export const useRepository = () => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
};
