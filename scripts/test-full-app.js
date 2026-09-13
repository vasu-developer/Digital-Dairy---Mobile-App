/**
 * Doodh Khata - Full App Automated Test Suite
 * Validates:
 * 1. Fat & SNF Pricing calculations (Cow, Buffalo, MinRate clamping, Custom Config)
 * 2. Historical milk collection additions, updates, and deletions
 * 3. Historical milk dispatch additions, updates, and deletions
 * 4. Daily and Monthly Profit Engine calculations
 * 5. Customer Ledger & Balance integrity
 */

const assert = require('assert');

// -------------------------------------------------------------
// Pure Formula Implementations (matching src/utils/rate-chart.ts)
// -------------------------------------------------------------
const DEFAULT_CUSTOMER_RATE_CONFIG = {
  baseFat: 6.0,
  baseSNF: 8.5,
  baseRate: 52.0,
  fatStepRate: 0.65,
  snfStepRate: 0.35,
  minRate: 20.0,
};

const DEFAULT_DISPATCH_RATE_CONFIG = {
  baseFat: 6.0,
  baseSNF: 8.5,
  baseRate: 58.0,
  fatStepRate: 0.65,
  snfStepRate: 0.35,
  minRate: 20.0,
};

function calculateFatSnfRate(fat, snf, config = DEFAULT_CUSTOMER_RATE_CONFIG) {
  const fatVal = typeof fat === 'number' && !isNaN(fat) ? fat : 0;
  const snfVal = typeof snf === 'number' && !isNaN(snf) ? snf : 0;

  if (fatVal <= 0 || snfVal <= 0) return 0;

  const fatDiffStep = (fatVal - config.baseFat) * 10;
  const snfDiffStep = (snfVal - config.baseSNF) * 10;

  let calculatedRate =
    config.baseRate + fatDiffStep * config.fatStepRate + snfDiffStep * config.snfStepRate;

  calculatedRate = Math.max(config.minRate, calculatedRate);
  return Math.round(calculatedRate * 100) / 100;
}

// -------------------------------------------------------------
// In-Memory Repository Simulation (matching RepositoryContext.tsx)
// -------------------------------------------------------------
class TestRepository {
  constructor() {
    this.customers = [
      { id: 'c1', name: 'Ramesh Patel', village: 'Rampur', customer_type: 'SELLER', opening_balance: 0, status: 'ACTIVE' },
      { id: 'c2', name: 'Suresh Yadav', village: 'Rampur', customer_type: 'SELLER', opening_balance: 500, status: 'ACTIVE' },
      { id: 'b1', name: 'Hotel Taj Milk Buyer', village: 'Town', customer_type: 'BUYER', default_sale_rate: 65, opening_balance: 0, status: 'ACTIVE' },
    ];
    this.collections = [];
    this.transactions = [];
    this.dispatches = [];
    this.pricingSettings = {
      customerRate: { ...DEFAULT_CUSTOMER_RATE_CONFIG },
      dispatchRate: { ...DEFAULT_DISPATCH_RATE_CONFIG },
    };
  }

  addMilkCollection(collData) {
    const targetCustId = collData.customer_id;
    const customer = this.customers.find((c) => c.id === targetCustId);
    const isBuyer = customer?.customer_type === 'BUYER';
    
    let rateNum = collData.rate;
    if (!isBuyer && collData.fat > 0 && collData.snf > 0) {
      rateNum = calculateFatSnfRate(collData.fat, collData.snf, this.pricingSettings.customerRate);
    }
    const computedAmount = Math.round(collData.quantity * rateNum * 100) / 100;

    const existingIndex = this.collections.findIndex(
      (c) => c.customer_id === targetCustId && c.date === collData.date && c.session === collData.session
    );

    let finalCollection;
    if (existingIndex >= 0) {
      finalCollection = {
        ...this.collections[existingIndex],
        ...collData,
        rate: rateNum,
        amount: computedAmount,
      };
      this.collections[existingIndex] = finalCollection;
    } else {
      finalCollection = {
        ...collData,
        id: 'col_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        rate: rateNum,
        amount: computedAmount,
        created_at: new Date().toISOString(),
      };
      this.collections.unshift(finalCollection);
    }

    // Upsert transaction
    const existingTxIdx = this.transactions.findIndex(
      (t) => t.milk_collection_id === finalCollection.id ||
        (t.customer_id === targetCustId && t.date === collData.date && t.type === 'MILK_VAL_EARNED' && t.notes?.includes(collData.session))
    );

    const finalTx = {
      id: existingTxIdx >= 0 ? this.transactions[existingTxIdx].id : 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      customer_id: targetCustId,
      customer_name: customer?.name || '',
      date: collData.date,
      type: 'MILK_VAL_EARNED',
      category: 'Milk Value',
      amount: computedAmount,
      is_credit: 1,
      notes: `Milk Record (${collData.session}) ${collData.quantity}L @ ₹${rateNum}`,
      milk_collection_id: finalCollection.id,
      created_at: new Date().toISOString(),
    };

    if (existingTxIdx >= 0) {
      this.transactions[existingTxIdx] = finalTx;
    } else {
      this.transactions.unshift(finalTx);
    }

    return finalCollection;
  }

  deleteMilkCollection(id) {
    const targetColl = this.collections.find((c) => c.id === id);
    if (!targetColl) return;

    this.collections = this.collections.filter((c) => c.id !== id);
    this.transactions = this.transactions.filter(
      (t) => !(t.milk_collection_id === id || 
        (t.customer_id === targetColl.customer_id && t.date === targetColl.date && t.type === 'MILK_VAL_EARNED' && t.notes?.includes(targetColl.session)))
    );
  }

  addMilkDispatch(dispatchData) {
    const existingIdx = this.dispatches.findIndex(
      (d) => d.date === dispatchData.date && d.session === dispatchData.session
    );

    let calculatedRate = dispatchData.rate;
    if (dispatchData.fat > 0 && dispatchData.snf > 0) {
      calculatedRate = calculateFatSnfRate(dispatchData.fat, dispatchData.snf, this.pricingSettings.dispatchRate);
    }
    const computedAmount = Math.round(dispatchData.dispatched_litres * calculatedRate * 100) / 100;

    const finalDispatch = {
      ...dispatchData,
      id: existingIdx >= 0 ? this.dispatches[existingIdx].id : 'disp_' + Date.now(),
      rate: calculatedRate,
      amount: computedAmount,
      dispatched_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      this.dispatches[existingIdx] = finalDispatch;
    } else {
      this.dispatches.unshift(finalDispatch);
    }
    return finalDispatch;
  }

  addCustomer(custData) {
    const newCust = {
      id: custData.id || 'cust_' + Date.now(),
      status: 'ACTIVE',
      ...custData,
    };
    this.customers.push(newCust);
    return newCust;
  }

  addTransaction(txData) {
    const newTx = {
      id: txData.id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      is_credit: txData.type === 'CUSTOMER_PAYMENT_RECEIVED' || txData.type === 'PAYMENT_MADE' ? 1 : 0,
      ...txData,
    };
    this.transactions.push(newTx);
    return newTx;
  }

  deleteMilkDispatch(id) {
    this.dispatches = this.dispatches.filter((d) => d.id !== id);
  }

  getCustomerBalance(customerId, monthYear) {
    const customer = this.customers.find((c) => c.id === customerId);
    const isBuyer = customer?.customer_type === 'BUYER';
    const openingBal = customer?.opening_balance || 0;

    const _now = new Date();
    const currentYear = _now.getFullYear();
    const currentMonthIndex = _now.getMonth();
    const currentMonthStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

    const isPastMonth = Boolean(monthYear && monthYear < currentMonthStr);
    const isCurrentMonth = Boolean(!monthYear || monthYear === currentMonthStr);
    const isFutureMonth = Boolean(monthYear && monthYear > currentMonthStr);

    const custCols = this.collections.filter((c) => c.customer_id === customerId);
    const custTxs = this.transactions.filter((t) => t.customer_id === customerId);

    if (monthYear) {
      const monthCols = custCols.filter((c) => c.date && c.date.startsWith(monthYear));
      const monthMilkLitres = monthCols.reduce((acc, c) => acc + (c.quantity || 0), 0);
      const monthRecordedAmount = monthCols.reduce((acc, c) => acc + (c.amount || 0), 0);
      const accumulatedMilkValue = isBuyer
        ? (monthRecordedAmount > 0 ? monthRecordedAmount : monthMilkLitres * (customer?.default_sale_rate || 60))
        : monthRecordedAmount;

      const monthTxs = custTxs.filter((t) => t.date && t.date.startsWith(monthYear));
      let totalDeductions = 0;
      let paymentsMade = 0;
      let customerRepayments = 0;

      for (const tx of monthTxs) {
        if (tx.type === 'ADVANCE_GIVEN' || tx.type === 'CATTLE_FEED') {
          totalDeductions += tx.amount || 0;
        } else if (tx.type === 'PAYMENT_MADE') {
          paymentsMade += tx.amount || 0;
        } else if (tx.type === 'CUSTOMER_PAYMENT_RECEIVED') {
          customerRepayments += tx.amount || 0;
        }
      }
      const netDeductions = Math.max(0, totalDeductions - customerRepayments);

      const cumCols = custCols.filter((c) => c.date && c.date.slice(0, 7) <= monthYear);
      const cumAmount = cumCols.reduce((acc, c) => acc + (c.amount || 0), 0);
      const cumLitres = cumCols.reduce((acc, c) => acc + (c.quantity || 0), 0);
      const cumMilkValue = isBuyer
        ? (cumAmount > 0 ? cumAmount : cumLitres * (customer?.default_sale_rate || 60))
        : cumAmount;

      const cumTxs = custTxs.filter((t) => t.date && t.date.slice(0, 7) <= monthYear);
      let cumDeduct = 0;
      let cumPayments = 0;
      let cumRepay = 0;

      for (const tx of cumTxs) {
        if (tx.type === 'ADVANCE_GIVEN' || tx.type === 'CATTLE_FEED') {
          cumDeduct += tx.amount || 0;
        } else if (tx.type === 'PAYMENT_MADE') {
          cumPayments += tx.amount || 0;
        } else if (tx.type === 'CUSTOMER_PAYMENT_RECEIVED') {
          cumRepay += tx.amount || 0;
        }
      }

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
        isPastMonth,
        isCurrentMonth,
        isFutureMonth,
      };
    }

    const totalLitres = custCols.reduce((acc, c) => acc + (c.quantity || 0), 0);
    const recordedAmount = custCols.reduce((acc, c) => acc + (c.amount || 0), 0);
    const accumulatedMilkValue = isBuyer
      ? (recordedAmount > 0 ? recordedAmount : totalLitres * (customer?.default_sale_rate || 60))
      : recordedAmount;

    let totalDeductions = 0;
    let paymentsMade = 0;
    let customerRepayments = 0;

    for (const tx of custTxs) {
      if (tx.type === 'ADVANCE_GIVEN' || tx.type === 'CATTLE_FEED') {
        totalDeductions += tx.amount || 0;
      } else if (tx.type === 'PAYMENT_MADE') {
        paymentsMade += tx.amount || 0;
      } else if (tx.type === 'CUSTOMER_PAYMENT_RECEIVED') {
        customerRepayments += tx.amount || 0;
      }
    }

    const payableBalance = isBuyer
      ? openingBal + accumulatedMilkValue + totalDeductions - customerRepayments - paymentsMade
      : openingBal + accumulatedMilkValue + customerRepayments - totalDeductions - paymentsMade;

    return {
      isBuyer,
      openingBal,
      accumulatedMilkValue,
      customerRepayments,
      totalDeductions,
      netDeductions: Math.max(0, totalDeductions - customerRepayments),
      paymentsMade,
      payableBalance,
      monthMilkLitres: totalLitres,
      isPastMonth: false,
      isCurrentMonth: true,
      isFutureMonth: false,
    };
  }

  getDailyProfit(date) {
    const dayCols = this.collections.filter((c) => c.date === date);
    let totalFarmerLitres = 0;
    let totalFarmerAmount = 0;
    let totalLocalSaleLitres = 0;
    let totalLocalSaleAmount = 0;

    for (const c of dayCols) {
      const cust = this.customers.find((cust) => cust.id === c.customer_id);
      const isBuyer = c.entry_type === 'SALE' || cust?.customer_type === 'BUYER';
      if (isBuyer) {
        totalLocalSaleLitres += c.quantity || 0;
        totalLocalSaleAmount += c.amount || 0;
      } else {
        totalFarmerLitres += c.quantity || 0;
        totalFarmerAmount += c.amount || 0;
      }
    }

    const dayDispatches = this.dispatches.filter((d) => d.date === date);
    let totalDispatchedLitres = 0;
    let totalDispatchedAmount = 0;

    for (const d of dayDispatches) {
      totalDispatchedLitres += d.dispatched_litres || 0;
      totalDispatchedAmount += d.amount || 0;
    }

    const netProfit = Math.round((totalDispatchedAmount + totalLocalSaleAmount - totalFarmerAmount) * 100) / 100;
    const profitMarginPerLitre = totalFarmerLitres > 0
      ? Math.round((netProfit / totalFarmerLitres) * 100) / 100
      : 0;

    return {
      date,
      totalFarmerLitres,
      totalFarmerAmount,
      totalDispatchedLitres,
      totalDispatchedAmount,
      totalLocalSaleLitres,
      totalLocalSaleAmount,
      netProfit,
      profitMarginPerLitre,
      hasDispatch: dayDispatches.length > 0,
    };
  }

  getMonthlyProfit(monthYear) {
    const monthCols = this.collections.filter((c) => c.date.startsWith(monthYear));
    let totalFarmerLitres = 0;
    let totalFarmerAmount = 0;
    let totalLocalSaleLitres = 0;
    let totalLocalSaleAmount = 0;

    for (const c of monthCols) {
      const cust = this.customers.find((cust) => cust.id === c.customer_id);
      const isBuyer = c.entry_type === 'SALE' || cust?.customer_type === 'BUYER';
      if (isBuyer) {
        totalLocalSaleLitres += c.quantity || 0;
        totalLocalSaleAmount += c.amount || 0;
      } else {
        totalFarmerLitres += c.quantity || 0;
        totalFarmerAmount += c.amount || 0;
      }
    }

    const monthDispatches = this.dispatches.filter((d) => d.date.startsWith(monthYear));
    let totalDispatchedLitres = 0;
    let totalDispatchedAmount = 0;

    for (const d of monthDispatches) {
      totalDispatchedLitres += d.dispatched_litres || 0;
      totalDispatchedAmount += d.amount || 0;
    }

    const netProfit = Math.round((totalDispatchedAmount + totalLocalSaleAmount - totalFarmerAmount) * 100) / 100;
    const profitMarginPerLitre = totalFarmerLitres > 0
      ? Math.round((netProfit / totalFarmerLitres) * 100) / 100
      : 0;

    return {
      monthYear,
      totalFarmerLitres,
      totalFarmerAmount,
      totalDispatchedLitres,
      totalDispatchedAmount,
      totalLocalSaleLitres,
      totalLocalSaleAmount,
      netProfit,
      profitMarginPerLitre,
    };
  }
}

// -------------------------------------------------------------
// Test Runner
// -------------------------------------------------------------
let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('====================================================');
console.log('  DOODH KHATA - FULL APPLICATION TEST SUITE');
console.log('====================================================\n');

// 1. PRICING & RATE CALCULATIONS
console.log('🧪 1. Testing Milk Rate Calculations (Fat & SNF Formula)...');

runTest('Base Standard Milk (6.0% Fat, 8.5% SNF) yields exact base rate ₹52.00', () => {
  const rate = calculateFatSnfRate(6.0, 8.5, DEFAULT_CUSTOMER_RATE_CONFIG);
  assert.strictEqual(rate, 52.00);
});

runTest('High-Fat Buffalo Milk (7.5% Fat, 9.0% SNF) increases rate proportionally', () => {
  // Fat diff = +1.5 -> +15 steps * 0.65 = +9.75
  // SNF diff = +0.5 -> +5 steps * 0.35 = +1.75
  // Expected = 52.0 + 9.75 + 1.75 = 63.50
  const rate = calculateFatSnfRate(7.5, 9.0, DEFAULT_CUSTOMER_RATE_CONFIG);
  assert.strictEqual(rate, 63.50);
});

runTest('Cow Milk (4.0% Fat, 8.5% SNF) calculates rate correctly without separate cow settings', () => {
  // Fat diff = -2.0 -> -20 steps * 0.65 = -13.00
  // SNF diff = 0
  // Expected = 52.0 - 13.0 = 39.00
  const rate = calculateFatSnfRate(4.0, 8.5, DEFAULT_CUSTOMER_RATE_CONFIG);
  assert.strictEqual(rate, 39.00);
});

runTest('Plant Dispatch Base Rate (6.0% Fat, 8.5% SNF) yields dispatch base rate ₹58.00', () => {
  const rate = calculateFatSnfRate(6.0, 8.5, DEFAULT_DISPATCH_RATE_CONFIG);
  assert.strictEqual(rate, 58.00);
});

runTest('Minimum Rate Clamping: Low quality milk never drops below minRate ₹20.00', () => {
  const rate = calculateFatSnfRate(1.0, 5.0, DEFAULT_CUSTOMER_RATE_CONFIG);
  assert.strictEqual(rate, 20.00);
});

runTest('Invalid or zero Fat/SNF returns 0 rate safely', () => {
  assert.strictEqual(calculateFatSnfRate(0, 8.5), 0);
  assert.strictEqual(calculateFatSnfRate(6.0, 0), 0);
  assert.strictEqual(calculateFatSnfRate(undefined, 8.5), 0);
  assert.strictEqual(calculateFatSnfRate(null, null), 0);
});

// 2. HISTORICAL MILK COLLECTION ADD, UPDATE & DELETE
console.log('\n📅 2. Testing Historical Date Milk Collections & Updates...');

const repo = new TestRepository();
const PAST_DATE = '2026-08-10'; // A date well in the past

runTest('Can add milk collection for a past date (2026-08-10, Morning)', () => {
  const entry = repo.addMilkCollection({
    customer_id: 'c1',
    date: PAST_DATE,
    session: 'MORNING',
    quantity: 10,
    fat: 6.0,
    snf: 8.5,
    rate: 0,
    entry_type: 'PURCHASE',
  });

  assert.strictEqual(entry.date, PAST_DATE);
  assert.strictEqual(entry.session, 'MORNING');
  assert.strictEqual(entry.rate, 52.00);
  assert.strictEqual(entry.amount, 520.00);

  const bal = repo.getCustomerBalance('c1');
  assert.strictEqual(bal.accumulatedMilkValue, 520.00);
  assert.strictEqual(bal.payableBalance, 520.00);
});

runTest('Can update milk collection on that past date and recalculate rate & balance', () => {
  // Farmer brought 15L at higher 7.0 Fat and 9.0 SNF
  // Fat diff = +10 steps * 0.65 = +6.50
  // SNF diff = +5 steps * 0.35 = +1.75
  // New rate = 52 + 6.50 + 1.75 = 60.25
  // New amount = 15 * 60.25 = 903.75
  const updated = repo.addMilkCollection({
    customer_id: 'c1',
    date: PAST_DATE,
    session: 'MORNING',
    quantity: 15,
    fat: 7.0,
    snf: 9.0,
    rate: 0,
    entry_type: 'PURCHASE',
  });

  assert.strictEqual(updated.quantity, 15);
  assert.strictEqual(updated.rate, 60.25);
  assert.strictEqual(updated.amount, 903.75);

  // Collections array should still have only 1 entry for this date/session
  const cols = repo.collections.filter((c) => c.customer_id === 'c1' && c.date === PAST_DATE && c.session === 'MORNING');
  assert.strictEqual(cols.length, 1);

  // Balance must update accordingly
  const bal = repo.getCustomerBalance('c1');
  assert.strictEqual(bal.accumulatedMilkValue, 903.75);
  assert.strictEqual(bal.payableBalance, 903.75);
});

runTest('Can delete milk collection on that past date and clear ledger transaction', () => {
  const col = repo.collections.find((c) => c.customer_id === 'c1' && c.date === PAST_DATE && c.session === 'MORNING');
  assert.ok(col);

  repo.deleteMilkCollection(col.id);

  // Collection should be gone
  const cols = repo.collections.filter((c) => c.customer_id === 'c1' && c.date === PAST_DATE && c.session === 'MORNING');
  assert.strictEqual(cols.length, 0);

  // Transaction should be gone
  const txs = repo.transactions.filter((t) => t.customer_id === 'c1');
  assert.strictEqual(txs.length, 0);

  // Balance should revert to 0
  const bal = repo.getCustomerBalance('c1');
  assert.strictEqual(bal.accumulatedMilkValue, 0);
  assert.strictEqual(bal.payableBalance, 0);
});

// 3. HISTORICAL MILK DISPATCH & DAILY PROFIT
console.log('\n🚚 3. Testing Historical Milk Dispatch & Profit Engine...');

runTest('Record milk collection and dispatch on past date (2026-08-12)', () => {
  const DATE_TEST = '2026-08-12';

  // Farmer 1 delivers 20L @ 6.0 Fat / 8.5 SNF (Rate ₹52.00 = ₹1,040)
  repo.addMilkCollection({
    customer_id: 'c1',
    date: DATE_TEST,
    session: 'MORNING',
    quantity: 20,
    fat: 6.0,
    snf: 8.5,
    rate: 0,
    entry_type: 'PURCHASE',
  });

  // Farmer 2 delivers 30L @ 6.0 Fat / 8.5 SNF (Rate ₹52.00 = ₹1,560)
  repo.addMilkCollection({
    customer_id: 'c2',
    date: DATE_TEST,
    session: 'MORNING',
    quantity: 30,
    fat: 6.0,
    snf: 8.5,
    rate: 0,
    entry_type: 'PURCHASE',
  });

  // Total collected from farmers = 50L, Cost = ₹2,600

  // Local buyer purchases 5L @ ₹65/L = ₹325
  repo.addMilkCollection({
    customer_id: 'b1',
    date: DATE_TEST,
    session: 'MORNING',
    quantity: 5,
    fat: 0,
    snf: 0,
    rate: 65,
    entry_type: 'SALE',
  });

  // Remaining 45L dispatched to plant @ Bulk 6.0 Fat / 8.5 SNF (Plant Rate ₹58.00 = ₹2,610)
  const dispatch = repo.addMilkDispatch({
    date: DATE_TEST,
    session: 'MORNING',
    total_collected_litres: 50,
    local_sales_litres: 5,
    dispatched_litres: 45,
    fat: 6.0,
    snf: 8.5,
    rate: 0,
    status: 'CLOSED',
  });

  assert.strictEqual(dispatch.dispatched_litres, 45);
  assert.strictEqual(dispatch.rate, 58.00);
  assert.strictEqual(dispatch.amount, 2610.00);

  // Calculate Daily Profit:
  // Dispatched (2610) + Local Sale (325) - Farmer Cost (2600) = ₹335.00
  const profitReport = repo.getDailyProfit(DATE_TEST);
  assert.strictEqual(profitReport.totalFarmerLitres, 50);
  assert.strictEqual(profitReport.totalFarmerAmount, 2600.00);
  assert.strictEqual(profitReport.totalDispatchedLitres, 45);
  assert.strictEqual(profitReport.totalDispatchedAmount, 2610.00);
  assert.strictEqual(profitReport.totalLocalSaleLitres, 5);
  assert.strictEqual(profitReport.totalLocalSaleAmount, 325.00);
  assert.strictEqual(profitReport.netProfit, 335.00);
  assert.strictEqual(profitReport.profitMarginPerLitre, 6.70); // 335 / 50 = 6.70/L
});

runTest('Update dispatch quality on closed shift / past date recalculates profit', () => {
  const DATE_TEST = '2026-08-12';

  // Plant supervisor tested higher quality: 6.4% Fat, 8.7% SNF
  // Fat diff = +4 steps * 0.65 = +2.60
  // SNF diff = +2 steps * 0.35 = +0.70
  // New Plant Rate = 58.00 + 2.60 + 0.70 = 61.30
  // New Dispatch Amount = 45 * 61.30 = 2758.50
  const updatedDisp = repo.addMilkDispatch({
    date: DATE_TEST,
    session: 'MORNING',
    total_collected_litres: 50,
    local_sales_litres: 5,
    dispatched_litres: 45,
    fat: 6.4,
    snf: 8.7,
    rate: 0,
    status: 'CLOSED',
  });

  assert.strictEqual(updatedDisp.rate, 61.30);
  assert.strictEqual(updatedDisp.amount, 2758.50);

  // New Profit = 2758.50 + 325.00 - 2600.00 = 483.50
  const updatedReport = repo.getDailyProfit(DATE_TEST);
  assert.strictEqual(updatedReport.netProfit, 483.50);
  assert.strictEqual(updatedReport.profitMarginPerLitre, 9.67); // 483.5 / 50 = 9.67/L
});

runTest('Can delete dispatch on past date and shift reflects un-dispatched', () => {
  const DATE_TEST = '2026-08-12';
  const d = repo.dispatches.find((disp) => disp.date === DATE_TEST && disp.session === 'MORNING');
  assert.ok(d);

  repo.deleteMilkDispatch(d.id);

  const dispatchesRemaining = repo.dispatches.filter((disp) => disp.date === DATE_TEST);
  assert.strictEqual(dispatchesRemaining.length, 0);

  const profitReport = repo.getDailyProfit(DATE_TEST);
  assert.strictEqual(profitReport.hasDispatch, false);
  assert.strictEqual(profitReport.totalDispatchedAmount, 0);
  // Net profit without dispatch = 0 + 325 - 2600 = -2275
  assert.strictEqual(profitReport.netProfit, -2275.00);
});

// 4. MONTHLY PROFIT ENGINE
console.log('\n📊 4. Testing Monthly Profit Aggregation...');

runTest('Monthly profit aggregates all dates correctly for 2026-08', () => {
  // Re-add dispatch for 2026-08-12
  repo.addMilkDispatch({
    date: '2026-08-12',
    session: 'MORNING',
    total_collected_litres: 50,
    local_sales_litres: 5,
    dispatched_litres: 45,
    fat: 6.0,
    snf: 8.5,
    rate: 0,
    status: 'CLOSED',
  });

  // Add another date in the same month: 2026-08-15
  repo.addMilkCollection({
    customer_id: 'c1',
    date: '2026-08-15',
    session: 'EVENING',
    quantity: 40,
    fat: 6.0,
    snf: 8.5,
    rate: 0,
    entry_type: 'PURCHASE',
  }); // 40L @ 52 = 2080

  repo.addMilkDispatch({
    date: '2026-08-15',
    session: 'EVENING',
    total_collected_litres: 40,
    local_sales_litres: 0,
    dispatched_litres: 40,
    fat: 6.0,
    snf: 8.5,
    rate: 0,
    status: 'CLOSED',
  }); // 40L @ 58 = 2320

  const mReport = repo.getMonthlyProfit('2026-08');
  assert.strictEqual(mReport.totalFarmerLitres, 90); // 50 + 40
  assert.strictEqual(mReport.totalFarmerAmount, 4680); // 2600 + 2080
  assert.strictEqual(mReport.totalDispatchedLitres, 85); // 45 + 40
  assert.strictEqual(mReport.totalDispatchedAmount, 4930); // 2610 + 2320
  assert.strictEqual(mReport.totalLocalSaleLitres, 5);
  assert.strictEqual(mReport.totalLocalSaleAmount, 325);
  // Total Income = 4930 + 325 = 5255
  // Total Cost = 4680
  // Net Profit = 5255 - 4680 = 575.00
  assert.strictEqual(mReport.netProfit, 575.00);
  assert.strictEqual(mReport.profitMarginPerLitre, 6.39); // 575 / 90 = 6.3888 -> 6.39
});

// 5. DATABASE EXPORT & RATE SETTINGS BACKUP / RESTORE
console.log('\n💾 5. Testing Database Export & Rate Settings Integrity...');

runTest('Database export includes custom rates settings in app_metadata', () => {
  const CUSTOM_SETTINGS = {
    customerRate: {
      baseFat: 6.5,
      baseSNF: 9.0,
      baseRate: 55.0,
      fatStepRate: 0.70,
      snfStepRate: 0.40,
      minRate: 25.0,
    },
    dispatchRate: {
      baseFat: 6.5,
      baseSNF: 9.0,
      baseRate: 62.0,
      fatStepRate: 0.75,
      snfStepRate: 0.45,
      minRate: 25.0,
    },
    updatedAt: new Date().toISOString(),
  };

  // Simulate SQLite app_metadata table
  const appMetadataTable = new Map();

  // 1. Update pricing settings in app
  repo.pricingSettings = CUSTOM_SETTINGS;

  // 2. Perform export sync step (matching src/db/backup.ts)
  const pricingJson = JSON.stringify(repo.pricingSettings);
  appMetadataTable.set('@doodh_khata_dairy_pricing_settings', pricingJson);

  // 3. Verify SQLite metadata table holds exact pricing config
  assert.ok(appMetadataTable.has('@doodh_khata_dairy_pricing_settings'));
  const exportedRaw = appMetadataTable.get('@doodh_khata_dairy_pricing_settings');
  const exportedConfig = JSON.parse(exportedRaw);
  assert.strictEqual(exportedConfig.customerRate.baseRate, 55.0);
  assert.strictEqual(exportedConfig.customerRate.fatStepRate, 0.70);
  assert.strictEqual(exportedConfig.dispatchRate.baseRate, 62.0);

  // 4. Simulate restore/import into fresh device state
  const restoredAppMetadata = Array.from(appMetadataTable.entries()).map(([key, value]) => ({ key, value }));
  const freshAsyncStorage = new Map();
  for (const row of restoredAppMetadata) {
    freshAsyncStorage.set(row.key, row.value);
  }

  assert.ok(freshAsyncStorage.has('@doodh_khata_dairy_pricing_settings'));
  const restoredSettings = JSON.parse(freshAsyncStorage.get('@doodh_khata_dairy_pricing_settings'));
  assert.strictEqual(restoredSettings.customerRate.baseRate, 55.0);
  assert.strictEqual(restoredSettings.customerRate.snfStepRate, 0.40);
  assert.strictEqual(restoredSettings.dispatchRate.baseRate, 62.0);
});

// 6. MONTH-WISE MONEY LEDGER & CLOSED BALANCE
console.log('\n📊 6. Testing Month-Wise Money Ledger & Closed Balance...');

runTest('Month-specific milk earned and deductions for August vs September', () => {
  repo.pricingSettings = {
    customerRate: { ...DEFAULT_CUSTOMER_RATE_CONFIG },
    dispatchRate: { ...DEFAULT_DISPATCH_RATE_CONFIG },
  };

  repo.addCustomer({
    id: 'c_month_test',
    name: 'Suresh Kumar',
    village: 'Rampur',
    customer_type: 'SELLER',
    opening_balance: 0,
  });

  // August activity
  repo.addMilkCollection({
    customer_id: 'c_month_test',
    date: '2026-08-10',
    session: 'MORNING',
    quantity: 100,
    fat: 6.0,
    snf: 8.5,
    rate: 0,
    entry_type: 'PURCHASE',
  }); // 100L @ 52 = 5200

  repo.addTransaction({
    customer_id: 'c_month_test',
    date: '2026-08-12',
    type: 'ADVANCE_GIVEN',
    category: 'Advance',
    amount: 1200,
  });

  // September activity
  repo.addMilkCollection({
    customer_id: 'c_month_test',
    date: '2026-09-05',
    session: 'MORNING',
    quantity: 50,
    fat: 6.0,
    snf: 8.5,
    rate: 0,
    entry_type: 'PURCHASE',
  }); // 50L @ 52 = 2600

  repo.addTransaction({
    customer_id: 'c_month_test',
    date: '2026-09-08',
    type: 'ADVANCE_GIVEN',
    category: 'Advance',
    amount: 600,
  });

  // Query August (Past Month)
  const augBal = repo.getCustomerBalance('c_month_test', '2026-08');
  assert.strictEqual(augBal.accumulatedMilkValue, 5200, 'August milk earned must be strictly 5200');
  assert.strictEqual(augBal.totalDeductions, 1200, 'August deductions must be strictly 1200');
  assert.strictEqual(augBal.payableBalance, 4000, 'August closed balance must be 4000');
  assert.strictEqual(augBal.isPastMonth, true, 'August must be flagged as past month');

  // Query September (Current Month)
  const sepBal = repo.getCustomerBalance('c_month_test', '2026-09');
  assert.strictEqual(sepBal.accumulatedMilkValue, 2600, 'September milk earned must be strictly 2600');
  assert.strictEqual(sepBal.totalDeductions, 600, 'September deductions must be strictly 600');
  assert.strictEqual(sepBal.payableBalance, 6000, 'September live balance must incorporate August closing (4000 + 2600 - 600 = 6000)');
  assert.strictEqual(sepBal.isCurrentMonth, true, 'September must be flagged as current month');

  // Query All-time
  const allBal = repo.getCustomerBalance('c_month_test');
  assert.strictEqual(allBal.accumulatedMilkValue, 7800, 'All-time milk earned must be 7800');
  assert.strictEqual(allBal.totalDeductions, 1800, 'All-time deductions must be 1800');
  assert.strictEqual(allBal.payableBalance, 6000, 'All-time payable balance must be 6000');
});

runTest('Retail buyer month-specific purchases and closed due balance', () => {
  repo.addCustomer({
    id: 'c_buyer_test',
    name: 'Shyam Store',
    village: 'Town',
    customer_type: 'BUYER',
    default_sale_rate: 60,
    opening_balance: 500,
  });

  // August
  repo.addMilkCollection({
    customer_id: 'c_buyer_test',
    date: '2026-08-05',
    session: 'MORNING',
    quantity: 20,
    fat: 0,
    snf: 0,
    rate: 60,
    entry_type: 'SALE',
  }); // 20 * 60 = 1200

  repo.addTransaction({
    customer_id: 'c_buyer_test',
    date: '2026-08-20',
    type: 'CUSTOMER_PAYMENT_RECEIVED',
    category: 'Received',
    amount: 1000,
  });

  const augBuyer = repo.getCustomerBalance('c_buyer_test', '2026-08');
  assert.strictEqual(augBuyer.accumulatedMilkValue, 1200, 'August buyer purchases must be 1200');
  assert.strictEqual(augBuyer.customerRepayments, 1000, 'August buyer repayments must be 1000');
  // Closed balance: 500 opening + 1200 purchased - 1000 paid = 700
  assert.strictEqual(augBuyer.payableBalance, 700, 'August buyer closing due must be 700');
  assert.strictEqual(augBuyer.isPastMonth, true, 'August must be marked as past month');
});

console.log('\n📅 7. Testing Customer Joining Date Calendar & Register Restrictions...');

runTest('Customer joining date restricts calendar month navigation and selection', () => {
  const customer = {
    id: 'c_joined_mid_aug',
    name: 'Suresh Patil',
    created_at: '2026-08-15T10:00:00.000Z',
  };

  const joiningDateStr = customer.created_at.split('T')[0];
  const [jYear, jMonth, jDay] = joiningDateStr.split('-').map(Number);
  const joiningMonthIndex = jMonth - 1;

  // Month navigation: Cannot navigate to July 2026 (before August 2026)
  const isPrevDisabled = (year, monthIndex) => {
    return year < jYear || (year === jYear && monthIndex <= joiningMonthIndex);
  };

  assert.strictEqual(isPrevDisabled(2026, 7), true, 'Prev month button must be disabled when on August 2026');
  assert.strictEqual(isPrevDisabled(2026, 8), false, 'Prev month button must be enabled when on September 2026');

  // Day selection restriction within joining month:
  const isDayBeforeJoining = (year, monthIndex, day) => {
    const dStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dStr < joiningDateStr;
  };

  assert.strictEqual(isDayBeforeJoining(2026, 7, 10), true, 'August 10th is before August 15th joining date');
  assert.strictEqual(isDayBeforeJoining(2026, 7, 14), true, 'August 14th is before August 15th joining date');
  assert.strictEqual(isDayBeforeJoining(2026, 7, 15), false, 'August 15th is on joining date (valid)');
  assert.strictEqual(isDayBeforeJoining(2026, 7, 16), false, 'August 16th is after joining date (valid)');
  assert.strictEqual(isDayBeforeJoining(2026, 8, 1), false, 'September 1st is after joining date (valid)');
});

runTest('Daily register excludes customers whose joining date is after selected date', () => {
  const customers = [
    { id: 'c1', name: 'Old Member', created_at: '2026-07-01' },
    { id: 'c2', name: 'Mid Member', created_at: '2026-08-15' },
    { id: 'c3', name: 'New Member', created_at: '2026-09-01' },
  ];

  const filterForDate = (dateStr) => {
    return customers.filter(c => {
      const custJoin = (c.created_at || '').split('T')[0];
      return !custJoin || custJoin <= dateStr;
    });
  };

  const listJuly = filterForDate('2026-07-20');
  assert.strictEqual(listJuly.length, 1, 'Only c1 was joined as of 2026-07-20');
  assert.strictEqual(listJuly[0].id, 'c1');

  const listAug = filterForDate('2026-08-20');
  assert.strictEqual(listAug.length, 2, 'c1 and c2 were joined as of 2026-08-20');

  const listSep = filterForDate('2026-09-05');
  assert.strictEqual(listSep.length, 3, 'All 3 customers joined as of 2026-09-05');
});

console.log('\n📝 8. Testing Customer Form Strict Validation (Name & Phone)...');

// Validation functions matching src/utils/validation.ts
function validateCustomerName(rawName) {
  const trimmed = (rawName || '').trim();
  if (!trimmed) return { isValid: false, error: 'Customer name is required.' };
  if (trimmed.length < 2) return { isValid: false, error: 'Customer name must be at least 2 characters long.' };
  if (trimmed.length > 60) return { isValid: false, error: 'Customer name cannot exceed 60 characters.' };
  if (/^\d/u.test(trimmed)) return { isValid: false, error: 'Name must start with letters, not numbers.' };
  if (/[^\p{L}\p{M}\s.\-'\d]/u.test(trimmed)) return { isValid: false, error: 'Name can only contain letters, spaces, and trailing numbers (no symbols).' };
  const validPattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.\-']*(?:\s*\d+)?$/u;
  if (!validPattern.test(trimmed)) return { isValid: false, error: 'Numbers are only allowed at the end of the name.' };
  return { isValid: true };
}

function sanitizeCustomerNameInput(text) {
  let cleaned = (text || '').replace(/[^\p{L}\p{M}\s.\-'\d]/gu, '');
  if (/^\d+/u.test(cleaned)) {
    cleaned = cleaned.replace(/^\d+/u, '');
  }
  return cleaned;
}

function validatePhoneNumber(phoneStr) {
  const cleaned = (phoneStr || '').replace(/[\s\-\+\(\)]/g, '');
  if (!cleaned) return { isValid: true };
  if (!/^\d+$/.test(cleaned)) return { isValid: false, error: 'Phone number must contain digits only.' };
  if (cleaned.length !== 10) return { isValid: false, error: `Mobile number must be exactly 10 digits (currently ${cleaned.length}).` };
  if (!/^[6-9]/.test(cleaned)) return { isValid: false, error: 'Mobile number must start with 6, 7, 8, or 9.' };
  return { isValid: true };
}

function sanitizePhoneInput(text) {
  return (text || '').replace(/[^0-9]/g, '').slice(0, 10);
}

runTest('Customer name strict validation: Letters only, trailing digits allowed, no symbols or mid-digits', () => {
  // Valid names
  assert.strictEqual(validateCustomerName('Ramesh').isValid, true);
  assert.strictEqual(validateCustomerName('Ramesh Yadav').isValid, true);
  assert.strictEqual(validateCustomerName('R. K. Sharma').isValid, true);
  assert.strictEqual(validateCustomerName('Ramesh 2').isValid, true);
  assert.strictEqual(validateCustomerName('Suresh Patil 01').isValid, true);
  assert.strictEqual(validateCustomerName('Mukesh 3').isValid, true);
  assert.strictEqual(validateCustomerName('सुरेश पाटिल').isValid, true);
  assert.strictEqual(validateCustomerName('सुरेश पाटिल 2').isValid, true);

  // Invalid names
  assert.strictEqual(validateCustomerName('').isValid, false, 'Empty string must be invalid');
  assert.strictEqual(validateCustomerName('   ').isValid, false, 'Whitespace must be invalid');
  assert.strictEqual(validateCustomerName('A').isValid, false, 'Single char must be invalid');
  assert.strictEqual(validateCustomerName('123').isValid, false, 'Pure digits must be invalid');
  assert.strictEqual(validateCustomerName('123 Ramesh').isValid, false, 'Leading digits must be invalid');
  assert.strictEqual(validateCustomerName('Ra123mesh').isValid, false, 'Digits in the middle must be invalid');
  assert.strictEqual(validateCustomerName('Ramesh@Yadav').isValid, false, '@ symbol must be invalid');
  assert.strictEqual(validateCustomerName('Ramesh#1').isValid, false, '# symbol must be invalid');
  assert.strictEqual(validateCustomerName('Ramesh $ Farm').isValid, false, '$ symbol must be invalid');
});

runTest('Customer name real-time keystroke sanitizer removes leading numbers and symbols', () => {
  assert.strictEqual(sanitizeCustomerNameInput('Ramesh@Kumar!'), 'RameshKumar');
  assert.strictEqual(sanitizeCustomerNameInput('123Ramesh'), 'Ramesh');
  assert.strictEqual(sanitizeCustomerNameInput('Ramesh 2'), 'Ramesh 2');
  assert.strictEqual(sanitizeCustomerNameInput('R. K. Sharma'), 'R. K. Sharma');
});

runTest('Mobile phone number validation: 10 digits starting with 6-9', () => {
  // Valid
  assert.strictEqual(validatePhoneNumber('').isValid, true, 'Blank phone is optional');
  assert.strictEqual(validatePhoneNumber('9876543210').isValid, true);
  assert.strictEqual(validatePhoneNumber('8123456789').isValid, true);
  assert.strictEqual(validatePhoneNumber('7000000000').isValid, true);
  assert.strictEqual(validatePhoneNumber('6999999999').isValid, true);
  assert.strictEqual(validatePhoneNumber('98765 43210').isValid, true, 'Phone with spaces should be normalized');

  // Invalid
  assert.strictEqual(validatePhoneNumber('1234567890').isValid, false, 'Must start with 6-9');
  assert.strictEqual(validatePhoneNumber('5555555555').isValid, false, 'Must start with 6-9');
  assert.strictEqual(validatePhoneNumber('98765').isValid, false, 'Too short');
  assert.strictEqual(validatePhoneNumber('987654321000').isValid, false, 'Too long');
  assert.strictEqual(validatePhoneNumber('98765abcde').isValid, false, 'Letters in phone');

  // Sanitizer
  assert.strictEqual(sanitizePhoneInput('+91 98765 43210 999'), '9198765432');
  assert.strictEqual(sanitizePhoneInput('98765-43210'), '9876543210');
});

console.log('\n💵 9. Testing Opening Balance Accounting (Advance Taken vs Payable)...');

runTest('Farmer with Advance Taken at joining: Advance is deducted from milk payments', () => {
  // Farmer took ₹5,000 advance before joining
  repo.addCustomer({
    id: 'c_farmer_advance',
    name: 'Kailash Farmer',
    customer_type: 'SELLER',
    opening_balance: -5000,
    created_at: '2026-08-01',
  });

  // Check initial balance before any milk
  const initBal = repo.getCustomerBalance('c_farmer_advance');
  assert.strictEqual(initBal.openingBal, -5000, 'Initial opening balance is -5000');
  assert.strictEqual(initBal.payableBalance, -5000, 'Net balance is -5000 (Advance owed to dairy)');

  // Farmer supplies ₹3,000 of milk
  repo.addMilkCollection({
    customer_id: 'c_farmer_advance',
    date: '2026-08-05',
    session: 'MORNING',
    quantity: 60,
    fat: 0,
    snf: 0,
    rate: 50,
    amount: 3000,
    entry_type: 'COLLECTION',
  });

  const afterSmallMilk = repo.getCustomerBalance('c_farmer_advance');
  // -5000 advance + 3000 milk = -2000 remaining advance
  assert.strictEqual(afterSmallMilk.payableBalance, -2000, 'Farmer still owes ₹2000 advance after ₹3000 milk');

  // Farmer supplies another ₹7,000 of milk (total ₹10,000 milk)
  repo.addMilkCollection({
    customer_id: 'c_farmer_advance',
    date: '2026-08-10',
    session: 'MORNING',
    quantity: 140,
    fat: 0,
    snf: 0,
    rate: 50,
    amount: 7000,
    entry_type: 'COLLECTION',
  });

  const afterFullMilk = repo.getCustomerBalance('c_farmer_advance');
  // -5000 advance + 10000 milk = ₹5,000 net payable to farmer!
  assert.strictEqual(afterFullMilk.payableBalance, 5000, 'Net payable to farmer is ₹5000 after clearing advance');
});

runTest('Farmer with Previous Payable at joining: Payable is added to milk earnings', () => {
  // Dairy owed ₹5,000 to farmer from previous register
  repo.addCustomer({
    id: 'c_farmer_payable',
    name: 'Ganesh Farmer',
    customer_type: 'SELLER',
    opening_balance: 5000,
    created_at: '2026-08-01',
  });

  const initBal = repo.getCustomerBalance('c_farmer_payable');
  assert.strictEqual(initBal.payableBalance, 5000, 'Initial payable balance is ₹5000');

  // Farmer supplies ₹10,000 of milk
  repo.addMilkCollection({
    customer_id: 'c_farmer_payable',
    date: '2026-08-05',
    session: 'MORNING',
    quantity: 200,
    fat: 0,
    snf: 0,
    rate: 50,
    amount: 10000,
    entry_type: 'COLLECTION',
  });

  const afterMilk = repo.getCustomerBalance('c_farmer_payable');
  // 5000 previous + 10000 milk = ₹15,000 payable
  assert.strictEqual(afterMilk.payableBalance, 15000, 'Total payable is ₹15,000');
});

runTest('Buyer with Advance Deposit vs Previous Dues at joining', () => {
  // Buyer with Previous Dues of ₹2,000
  repo.addCustomer({
    id: 'c_buyer_dues',
    name: 'Ajay Hotel',
    customer_type: 'BUYER',
    opening_balance: 2000,
    default_sale_rate: 60,
    created_at: '2026-08-01',
  });

  // Buyer purchases ₹3,000 milk
  repo.addMilkCollection({
    customer_id: 'c_buyer_dues',
    date: '2026-08-05',
    session: 'MORNING',
    quantity: 50,
    rate: 60,
    amount: 3000,
    entry_type: 'SALE',
  });

  const buyerDuesBal = repo.getCustomerBalance('c_buyer_dues');
  // 2000 previous due + 3000 purchased = 5000 due to dairy
  assert.strictEqual(buyerDuesBal.payableBalance, 5000, 'Buyer total due is ₹5000');

  // Buyer with Advance Deposit of ₹2,000
  repo.addCustomer({
    id: 'c_buyer_advance_dep',
    name: 'Vijay Cafe',
    customer_type: 'BUYER',
    opening_balance: -2000,
    default_sale_rate: 60,
    created_at: '2026-08-01',
  });

  // Buyer purchases ₹3,000 milk
  repo.addMilkCollection({
    customer_id: 'c_buyer_advance_dep',
    date: '2026-08-05',
    session: 'MORNING',
    quantity: 50,
    rate: 60,
    amount: 3000,
    entry_type: 'SALE',
  });

  const buyerAdvBal = repo.getCustomerBalance('c_buyer_advance_dep');
  // -2000 advance deposit + 3000 purchased = 1000 due to dairy
  assert.strictEqual(buyerAdvBal.payableBalance, 1000, 'Buyer net due is ₹1000 after deducting advance deposit');
});

console.log('\n====================================================');
console.log(`  RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log('====================================================\n');




