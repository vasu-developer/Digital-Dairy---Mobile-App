import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { formatCurrency, sanitizeDecimalInput } from '@/utils/calculator';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthlySettlementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const { id } = useLocalSearchParams();
  const { getCustomerById, settleMonth, collections, getCustomerTransactions } = useRepository();

  const _now = new Date();
  const currentYear = _now.getFullYear();
  const currentMonthIdx = _now.getMonth();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(currentMonthIdx);
  const [isSettled, setIsSettled] = useState(false);

  const customer = getCustomerById(id as string) || {
    id: id as string,
    name: 'Customer',
    village: '',
    status: 'ACTIVE' as const,
    created_at: '',
  };

  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonthIndex((prev) => prev - 1);
    }
    setIsSettled(false);
  };

  const handleNextMonth = () => {
    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonthIndex >= currentMonthIdx)) return;
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonthIndex((prev) => prev + 1);
    }
    setIsSettled(false);
  };

  const monthPrefix = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;

  const monthCols = collections.filter(
    (c) => c && String(c.customer_id) === String(customer.id) && c.date && c.date.startsWith(monthPrefix)
  );
  const isBuyer = customer.customer_type === 'BUYER';
  const totalLiters = monthCols.reduce((acc, c) => acc + (c.quantity || 0), 0);

  const [fixedRateStr, setFixedRateStr] = useState(
    customer.default_sale_rate ? customer.default_sale_rate.toString() : '60'
  );
  const fixedRateNum = parseFloat(fixedRateStr) || 0;

  // Milk value calculated using monthly fixed rate or sum of entries
  const milkValue = isBuyer && fixedRateNum > 0 ? Math.round(totalLiters * fixedRateNum * 100) / 100 : monthCols.reduce((acc, c) => acc + (c.amount || 0), 0);

  const txs = getCustomerTransactions(customer.id);
  const monthTxs = txs.filter((t) => t && t.date && t.date.startsWith(monthPrefix));

  // Compute previous carried balance from earlier months
  const previousCols = collections.filter(
    (c) => c && String(c.customer_id) === String(customer.id) && c.date && c.date < `${monthPrefix}-01`
  );
  const previousTxs = txs.filter((t) => t && t.date && t.date < `${monthPrefix}-01`);

  const prevColsAmount = previousCols.reduce((acc, c) => acc + (c?.amount || 0), 0);
  const prevMilkVal = isBuyer && prevColsAmount === 0
    ? previousCols.reduce((acc, c) => acc + (c?.quantity || 0), 0) * fixedRateNum
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
  const previousCarriedBalance = isBuyer
    ? prevMilkVal + prevDeduct - prevRepay - prevPayments
    : prevMilkVal + prevRepay - prevDeduct - prevPayments;

  const deductions = monthTxs.filter(
    (t) => t && (t.type === 'ADVANCE_GIVEN' || t.type === 'CATTLE_FEED' || t.type === 'GROCERY' || t.type === 'OTHER_DEDUCTION')
  );
  const paymentsMadeTxs = monthTxs.filter((t) => t && t.type === 'PAYMENT_MADE');
  const customerRepaymentsTxs = monthTxs.filter((t) => t && t.type === 'CUSTOMER_PAYMENT_RECEIVED');

  const totalDeductions = deductions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalPaymentsMade = paymentsMadeTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalCustomerRepayments = customerRepaymentsTxs.reduce((acc, t) => acc + (t.amount || 0), 0);

  const currentPayableBalance = isBuyer
    ? previousCarriedBalance + milkValue + totalDeductions - totalCustomerRepayments - totalPaymentsMade
    : previousCarriedBalance + milkValue + totalCustomerRepayments - totalDeductions - totalPaymentsMade;

  const handleSettle = async () => {
    await settleMonth(customer.id, monthPrefix);
    setIsSettled(true);
    Alert.alert(
      'Month Settlement Closed',
      `${MONTHS[selectedMonthIndex]} ${selectedYear} settlement closed for ${customer.name}.\n\nCurrent Balance: ${formatCurrency(currentPayableBalance)}`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const isNextDisabled = selectedYear > currentYear || (selectedYear === currentYear && selectedMonthIndex >= currentMonthIdx);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: Math.max(insets.top + 8, 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Monthly Settlement</Text>
          <Text style={[styles.headerSub, { color: colors.textMedium }]}>{customer.name}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Month Navigation Pill */}
        <View style={[styles.monthHeaderPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.monthNavBtn} onPress={handlePrevMonth}>
            <ChevronLeft size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthPillText, { color: colors.text }]}>{MONTHS[selectedMonthIndex]} {selectedYear}</Text>
          <TouchableOpacity
            style={[styles.monthNavBtn, isNextDisabled && { opacity: 0.3 }]}
            onPress={handleNextMonth}
            disabled={isNextDisabled}
          >
            <ChevronRight size={22} color={isNextDisabled ? colors.textMuted : colors.primary} />
          </TouchableOpacity>
        </View>

        {/* If Customer is a Milk Buyer, show Fixed Rate Month End Calculation Box */}
        {isBuyer && (
          <View style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#F59E0B', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#FBBF24' : '#92400E' }}>BUYER MONTH-END FIXED RATE</Text>
              <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFF' }}>Fixed Price</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: isDark ? '#FCD34D' : '#B45309' }}>Total Litres Purchased</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{totalLiters.toFixed(1)} L</Text>
              </View>

              <View style={{ width: 110 }}>
                <Text style={{ fontSize: 12, color: isDark ? '#FCD34D' : '#B45309' }}>Rate (₹ / L)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 8, height: 38, borderWidth: 1, borderColor: '#F59E0B' }}>
                  <Text style={{ fontWeight: '800', color: '#D97706', marginRight: 4 }}>₹</Text>
                  <TextInput
                    style={{ flex: 1, fontSize: 15, fontWeight: '800', color: colors.text }}
                    keyboardType="numeric"
                    value={fixedRateStr}
                    onChangeText={(val) => setFixedRateStr(sanitizeDecimalInput(val))}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FDE68A', marginTop: 10, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMedium }}>Total Month Bill Amount</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#D97706' }}>{formatCurrency(milkValue)}</Text>
            </View>
          </View>
        )}

        {/* Financial Summary Card */}
        <View
          style={[
            styles.settleSummaryCard,
            {
              backgroundColor: isBuyer
                ? (isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7')
                : (isDark ? 'rgba(22, 163, 74, 0.15)' : '#ECFDF5'),
              borderColor: isBuyer
                ? (isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A')
                : (isDark ? 'rgba(34, 197, 94, 0.3)' : '#A7F3D0'),
            },
          ]}
        >
          <Text style={[styles.cardHeaderTitle, { color: isBuyer ? (isDark ? '#FBBF24' : '#92400E') : (isDark ? '#86EFAC' : '#065F46') }]}>
            {isBuyer ? 'BUYER BILL SUMMARY' : 'FINANCIAL SUMMARY'}
          </Text>
          
          {previousCarriedBalance !== 0 && (
            <View style={styles.rowItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMedium }]}>Previous Balance Carried Over</Text>
              <Text style={previousCarriedBalance >= 0 ? styles.summaryValRed : styles.summaryValGreen}>
                {previousCarriedBalance >= 0 ? '+' : ''}{formatCurrency(previousCarriedBalance)}
              </Text>
            </View>
          )}

          <View style={styles.rowItem}>
            <Text style={[styles.summaryLabel, { color: colors.textMedium }]}>{isBuyer ? "Month's Milk Purchased" : "Month's Milk Value"}</Text>
            <Text style={styles.summaryValGreen}>+{formatCurrency(milkValue)}</Text>
          </View>

          {totalDeductions > 0 && (
            <View style={styles.rowItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMedium }]}>Advances & Charges</Text>
              <Text style={styles.summaryValRed}>+{formatCurrency(totalDeductions)}</Text>
            </View>
          )}

          {totalCustomerRepayments > 0 && (
            <View style={styles.rowItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMedium }]}>Money Paid by Buyer</Text>
              <Text style={styles.summaryValBlue}>-{formatCurrency(totalCustomerRepayments)}</Text>
            </View>
          )}

          {totalPaymentsMade > 0 && (
            <View style={styles.rowItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMedium }]}>Refund / Cash Returned</Text>
              <Text style={styles.summaryValRed}>+{formatCurrency(totalPaymentsMade)}</Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.rowItem}>
            <Text style={[styles.netLabel, { color: colors.text }]}>{isBuyer ? 'TOTAL DUE TO DAIRY' : 'CURRENT BALANCE'}</Text>
            <Text style={[styles.netVal, { color: isBuyer ? '#D97706' : (currentPayableBalance >= 0 ? (isDark ? '#4ADE80' : '#065F46') : (isDark ? '#F87171' : '#DC2626')) }]}>
              {formatCurrency(currentPayableBalance)}
            </Text>
          </View>
        </View>

        {/* Deductions & Purchases Box */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionCardTitle, { color: colors.textMedium }]}>DEDUCTIONS RECORDED THIS MONTH</Text>
          {deductions.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic', paddingVertical: 4 }}>
              No advance or deductions recorded this month.
            </Text>
          ) : (
            deductions.map((d) => (
              <View key={d.id} style={styles.rowItem}>
                <Text style={[styles.labelDark, { color: colors.text }]}>{d.notes || d.category || d.type}</Text>
                <Text style={styles.valRed}>-{formatCurrency(d.amount)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Record Optional Cash Payment Button */}
        <TouchableOpacity
          style={[styles.payCashOptionBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={() => router.push({ pathname: '/add-transaction', params: { customerId: customer.id, defaultCategory: 'Payment' } })}
        >
          <Text style={[styles.payCashOptionText, { color: colors.primary }]}>Record Hisaab Paid</Text>
        </TouchableOpacity>

        {/* Close Month Button */}
        <TouchableOpacity
          style={[styles.settleBtn, isSettled && styles.settledBtn]}
          onPress={handleSettle}
          disabled={isSettled}
        >
          {isSettled ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={20} color="#FFF" />
              <Text style={styles.settleBtnText}>SETTLEMENT CLOSED</Text>
            </View>
          ) : (
            <Text style={styles.settleBtnText}>CLOSE MONTH SETTLEMENT</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.bgMain,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  headerSub: {
    fontSize: 13,
    color: ThemeColors.textMedium,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  monthHeaderPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 16,
    gap: 8,
  },
  monthNavBtn: {
    padding: 4,
  },
  monthPillText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  settleSummaryCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 14,
  },
  sectionCardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: ThemeColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  labelDark: {
    fontSize: 14.5,
    color: ThemeColors.textDark,
    fontWeight: '500',
  },
  valRed: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
  },
  summaryValGreen: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#16A34A',
  },
  summaryValRed: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  summaryValBlue: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  divider: {
    height: 1,
    backgroundColor: '#A7F3D0',
    marginVertical: 10,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  netVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#065F46',
  },
  payCashOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
    marginBottom: 12,
  },
  payCashOptionText: {
    color: '#059669',
    fontSize: 13.5,
    fontWeight: '700',
  },
  settleBtn: {
    height: 48,
    backgroundColor: '#059669',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settledBtn: {
    backgroundColor: '#16A34A',
  },
  settleBtnText: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
