export type SessionType = 'MORNING' | 'EVENING';

export type CustomerStatus = 'ACTIVE' | 'INACTIVE';

export type CustomerType = 'SELLER' | 'BUYER';

export interface Customer {
  id: string;
  farmer_code?: number;
  name: string;
  phone?: string;
  village?: string;
  customer_type?: CustomerType; // 'SELLER' = supplying milk, 'BUYER' = purchasing milk daily
  default_sale_rate?: number; // Fixed/default rate for milk buyers (₹/L)
  opening_balance?: number;
  status: CustomerStatus;
  created_at: string;
}

export interface MilkCollection {
  id: string;
  customer_id: string;
  customer_name?: string;
  village?: string;
  date: string; // YYYY-MM-DD
  session: SessionType;
  entry_type?: 'PURCHASE' | 'SALE'; // PURCHASE from seller, SALE to buyer
  quantity: number; // Litres
  fat: number;
  snf: number;
  rate: number; // ₹ / L
  amount: number; // Total Milk Value (₹)
  notes?: string;
  created_at?: string;
}

export type TransactionCategory = 'Milk Value' | 'Advance' | 'Expense' | 'Payment' | 'Received';

export type TransactionType =
  | 'MILK_VAL_EARNED'
  | 'ADVANCE_GIVEN'
  | 'PAYMENT_MADE'
  | 'CATTLE_FEED'
  | 'GROCERY'
  | 'OTHER_DEDUCTION'
  | 'CUSTOMER_PAYMENT_RECEIVED';

export interface Transaction {
  id: string;
  customer_id: string;
  customer_name?: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  is_credit: number; // 1 for Milk Value Earned (+), 0 for Deductions/Advances/Payments (-)
  notes?: string;
  milk_collection_id?: string;
  created_at?: string;
}

export interface MonthlySettlement {
  id: string;
  customer_id: string;
  month_year: string; // YYYY-MM
  previous_balance: number;
  milk_value_total: number;
  total_deductions: number;
  actual_payments_made: number;
  closing_balance: number;
  status: 'PENDING' | 'SETTLED';
  settled_at?: string;
}

export interface MilkDispatch {
  id: string;
  date: string; // YYYY-MM-DD
  session: SessionType; // 'MORNING' | 'EVENING'
  total_collected_litres: number;
  local_sales_litres: number;
  dispatched_litres: number; // Net milk dispatched to plant
  fat: number; // Bulk sample test Fat %
  snf: number; // Bulk sample test SNF %
  rate?: number; // Plant dispatch rate ₹/L
  amount?: number; // Total dispatch value = dispatched_litres * rate
  can_count?: number; // Number of milk cans dispatched
  vehicle_number?: string; // Optional vehicle or dispatch reference
  driver_name?: string; // Driver or plant representative name
  status: 'DISPATCHED' | 'CLOSED';
  dispatched_at: string;
  notes?: string;
}

export interface DailyProfitReport {
  date: string;
  totalFarmerLitres: number;
  totalFarmerAmount: number;
  totalDispatchedLitres: number;
  totalDispatchedAmount: number;
  totalLocalSaleLitres: number;
  totalLocalSaleAmount: number;
  netProfit: number;
  profitMarginPerLitre: number;
  hasDispatch: boolean;
  isRatePending: boolean;
}

export interface MonthlyProfitReport {
  monthYear: string;
  totalFarmerLitres: number;
  totalFarmerAmount: number;
  totalDispatchedLitres: number;
  totalDispatchedAmount: number;
  totalLocalSaleLitres: number;
  totalLocalSaleAmount: number;
  netProfit: number;
  profitMarginPerLitre: number;
  totalDispatchesRecorded: number;
  pendingDispatchRateCount: number;
}


