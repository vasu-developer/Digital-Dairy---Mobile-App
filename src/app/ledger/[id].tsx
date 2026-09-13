import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Plus,
  Share2,
  Receipt,
  ShoppingBag,
  CreditCard,
  Droplet,
  IndianRupee,
  Edit2,
  Trash2,
  MessageCircle,
} from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/calculator';
import {
  shareMonthlyStatementPDF,
  shareWhatsAppMoneyLedgerStatement,
} from '@/utils/slip-generator';
import ConfirmationModal from '@/components/ConfirmationModal';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function LedgerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const { id } = useLocalSearchParams();
  const {
    getCustomerById,
    getCustomerTransactions,
    getCustomerBalance,
    deleteTransaction,
    collections,
  } = useRepository();

  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [shareAlert, setShareAlert] = useState<{ visible: boolean; title: string; message: string } | null>(null);

  const handlePromptDelete = (tx: Transaction) => {
    setTxToDelete(tx);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (txToDelete) {
      await deleteTransaction(txToDelete.id);
      setShowDeleteModal(false);
      setTxToDelete(null);
    }
  };

  const customer = getCustomerById(id as string) || {
    id: id as string,
    name: 'Customer',
    village: '',
    status: 'ACTIVE' as const,
    created_at: '',
  };

  const _now = new Date();
  const [selectedYear, setSelectedYear] = useState(_now.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(_now.getMonth());
  const [activeFilter, setActiveFilter] = useState<'All' | 'Advance' | 'Received' | 'Expense' | 'Payment'>('All');

  // Joining date restriction
  const joiningDateStr = (customer.created_at || '').split('T')[0];
  const [jYearStr, jMonthStr] = joiningDateStr ? joiningDateStr.split('-') : [];
  const joiningYear = parseInt(jYearStr, 10) || 1970;
  const joiningMonthIndex = (parseInt(jMonthStr, 10) || 1) - 1;
  const hasValidJoiningDate = Boolean(jYearStr && jMonthStr && !isNaN(joiningYear));

  const isPrevDisabled = Boolean(
    hasValidJoiningDate &&
    (selectedYear < joiningYear ||
      (selectedYear === joiningYear && selectedMonthIndex <= joiningMonthIndex))
  );
  const isNextDisabled =
    selectedYear > _now.getFullYear() ||
    (selectedYear === _now.getFullYear() && selectedMonthIndex >= _now.getMonth());

  useEffect(() => {
    if (hasValidJoiningDate) {
      if (
        selectedYear < joiningYear ||
        (selectedYear === joiningYear && selectedMonthIndex < joiningMonthIndex)
      ) {
        setSelectedYear(joiningYear);
        setSelectedMonthIndex(joiningMonthIndex);
      }
    }
  }, [hasValidJoiningDate, joiningYear, joiningMonthIndex, selectedYear, selectedMonthIndex]);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonthIndex((m) => m + 1);
    }
  };

  const monthStr = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;
  const transactions = getCustomerTransactions(customer.id);
  const balanceInfo = getCustomerBalance(customer.id, monthStr);

  const isBuyer = customer.customer_type === 'BUYER';

  // Exclude daily milk recorded entries from the money ledger transactions list!
  const moneyTransactions = transactions.filter(
    (t) => t && t.type !== 'MILK_VAL_EARNED' && t.category !== 'Milk Value' && !t.milk_collection_id
  );

  const filteredTxs = moneyTransactions.filter((t) => {
    if (!t) return false;
    const matchesMonth = t.date && t.date.startsWith(monthStr);
    if (!matchesMonth && activeFilter !== 'All') return false;
    if (activeFilter === 'All') return matchesMonth;
    return t.category === activeFilter && matchesMonth;
  });

  const handleShareStatement = async () => {
    const monthTransactions = moneyTransactions.filter((t) => t && t.date && t.date.startsWith(monthStr));

    const result = await shareWhatsAppMoneyLedgerStatement({
      customerName: customer.name,
      phone: customer.phone,
      village: customer.village,
      monthYear: `${MONTH_NAMES[selectedMonthIndex]} ${selectedYear}`,
      isBuyer,
      isPastMonth: balanceInfo.isPastMonth,
      accumulatedMilkValue: balanceInfo.accumulatedMilkValue,
      totalDeductions: balanceInfo.totalDeductions,
      paymentsMade: balanceInfo.paymentsMade,
      customerRepayments: balanceInfo.customerRepayments,
      payableBalance: balanceInfo.payableBalance,
      transactions: monthTransactions,
    });

    if (!result.success) {
      setShareAlert({
        visible: true,
        title: 'Share Failed',
        message: result.error || 'Failed to open WhatsApp.',
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: Math.max(insets.top + 8, 16) }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{isBuyer ? 'Buyer Money Ledger' : 'Money Ledger (Bahi-Khata)'}</Text>
            {isBuyer && (
              <View style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? '#FBBF24' : '#D97706' }}>Buyer</Text>
              </View>
            )}
          </View>
          <Text style={[styles.headerSub, { color: colors.textMedium }]}>{customer.name}</Text>
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleShareStatement}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Share2 size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Month Selector Row */}
        <View style={styles.monthSelectorRow}>
          <TouchableOpacity
            style={[styles.iconBtn, isPrevDisabled && { opacity: 0.3 }]}
            onPress={handlePrevMonth}
            disabled={isPrevDisabled}
          >
            <ChevronLeft size={22} color={isPrevDisabled ? colors.textMuted : colors.text} />
          </TouchableOpacity>
          <View style={[styles.monthPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.monthPillText, { color: colors.text }]}>{MONTH_NAMES[selectedMonthIndex]} {selectedYear}</Text>
          </View>
          <TouchableOpacity
            style={[styles.iconBtn, isNextDisabled && { opacity: 0.3 }]}
            onPress={handleNextMonth}
            disabled={isNextDisabled}
          >
            <ChevronRight size={22} color={isNextDisabled ? colors.textMuted : colors.text} />
          </TouchableOpacity>
        </View>

        {/* Month WhatsApp Share Strip */}
        <TouchableOpacity
          style={[styles.monthShareStrip, isDark && { backgroundColor: 'rgba(22, 163, 74, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' }]}
          onPress={handleShareStatement}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MessageCircle size={16} color={isDark ? '#4ADE80' : '#16A34A'} />
            <Text style={[styles.monthShareStripText, isDark && { color: '#4ADE80' }]}>
              Share {MONTH_NAMES[selectedMonthIndex]} {selectedYear} on WhatsApp
            </Text>
          </View>
          <Text style={[styles.monthShareStripAction, isDark && { color: '#34D399' }]}>Send</Text>
        </TouchableOpacity>

        {/* 2 Financial Summary Cards Grid */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sumHeader}>
              <ArrowUpRight size={16} color={isBuyer ? '#D97706' : '#16A34A'} />
              <Text style={[styles.sumSub, { color: colors.textMuted }]}>{isBuyer ? 'Milk Value Purchased' : 'Milk Value Earned'}</Text>
            </View>
            <Text style={[styles.sumVal, { color: isBuyer ? '#D97706' : (isDark ? '#4ADE80' : '#16A34A') }]}>
              {formatCurrency(balanceInfo.accumulatedMilkValue)}
            </Text>
            {balanceInfo.monthMilkLitres !== undefined && balanceInfo.monthMilkLitres > 0 && (
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                {balanceInfo.monthMilkLitres.toFixed(1)} L in {MONTH_NAMES[selectedMonthIndex].slice(0, 3)}
              </Text>
            )}
          </View>

          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sumHeader}>
              <ArrowDownRight size={16} color={isBuyer ? '#059669' : '#DC2626'} />
              <Text style={[styles.sumSub, { color: colors.textMuted }]}>
                {isBuyer ? 'Money Paid by Buyer' : (balanceInfo.customerRepayments > 0 ? 'Net Deductions' : 'Total Deductions')}
              </Text>
            </View>
            <Text style={[styles.sumVal, { color: isBuyer ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626') }]}>
              {isBuyer ? formatCurrency(balanceInfo.customerRepayments) : formatCurrency(balanceInfo.netDeductions)}
            </Text>
            {balanceInfo.paymentsMade > 0 && !isBuyer && (
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                Paid: {formatCurrency(balanceInfo.paymentsMade)}
              </Text>
            )}
          </View>
        </View>

        {/* Starting / Opening Balance Note if present */}
        {customer.opening_balance !== undefined && customer.opening_balance !== null && customer.opening_balance !== 0 && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.card,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 10,
          }}>
            <Text style={{ fontSize: 12, color: colors.textMedium, fontWeight: '600' }}>
              {isBuyer
                ? (customer.opening_balance > 0 ? 'Previous Dues at Joining:' : 'Advance Deposit at Joining:')
                : (customer.opening_balance < 0 ? 'Advance Taken at Joining:' : 'Previous Payable at Joining:')}
            </Text>
            <Text style={{
              fontSize: 13,
              fontWeight: '800',
              color: (isBuyer ? customer.opening_balance > 0 : customer.opening_balance < 0)
                ? '#D97706'
                : (isDark ? '#4ADE80' : '#16A34A'),
            }}>
              {formatCurrency(Math.abs(customer.opening_balance))}
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>
                {isBuyer
                  ? (customer.opening_balance > 0 ? ' (उधार)' : ' (जमा)')
                  : (customer.opening_balance < 0 ? ' (पेशगी उधार)' : ' (जमा)')}
              </Text>
            </Text>
          </View>
        )}

        {/* Net Payable Balance Card (Current or Closed Balance) */}
        <View
          style={[
            styles.netBalanceBox,
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
          <View style={styles.netRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={[
                    styles.netSubLabel,
                    {
                      color: isBuyer
                        ? (isDark ? '#FBBF24' : '#92400E')
                        : (isDark ? '#86EFAC' : '#065F46'),
                    },
                  ]}
                >
                  {balanceInfo.isPastMonth
                    ? (isBuyer ? 'CLOSED DUE TO DAIRY' : 'CLOSED BALANCE')
                    : (isBuyer ? 'CURRENT DUE TO DAIRY' : 'CURRENT BALANCE')}
                </Text>
                {balanceInfo.isPastMonth && (
                  <View style={{ backgroundColor: isDark ? 'rgba(100, 116, 139, 0.3)' : '#E2E8F0', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? '#94A3B8' : '#64748B' }}>Closed</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.netValText,
                  {
                    color: isBuyer
                      ? '#D97706'
                      : (balanceInfo.payableBalance >= 0 ? (isDark ? '#4ADE80' : '#065F46') : (isDark ? '#F87171' : '#DC2626')),
                  },
                ]}
              >
                {formatCurrency(balanceInfo.payableBalance)}
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', marginTop: 3 }}>
                {balanceInfo.isPastMonth
                  ? `Closed balance at end of ${MONTH_NAMES[selectedMonthIndex]} ${selectedYear}`
                  : `Live balance as of today`}
              </Text>
            </View>
          </View>
        </View>

        {/* Filter Pills Bar (Horizontal Scrollable) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {(['All', 'Advance', 'Received', 'Expense', 'Payment'] as const).map((cat) => {
            const isSel = activeFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isSel && [styles.filterPillActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                ]}
                onPress={() => setActiveFilter(cat)}
              >
                <Text style={[styles.filterPillText, { color: colors.textMedium }, isSel && styles.filterPillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Transactions Feed */}
        {filteredTxs.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>📖</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No money transactions</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>No cash advances, repayments, or payments recorded for this month.</Text>
          </View>
        ) : (
          filteredTxs.map((tx) => {
            const isCredit = tx.type === 'CUSTOMER_PAYMENT_RECEIVED' || tx.type === 'PAYMENT_MADE' || tx.is_credit === 1;
            const dateParts = tx.date ? tx.date.split('-') : ['2026', '09', '01'];
            const dayNum = dateParts[2] || '01';
            const monthIdx = parseInt(dateParts[1] || '09', 10) - 1;
            const monthNameShort = MONTH_NAMES[monthIdx]?.slice(0, 3) || 'Sep';

            return (
              <View key={tx.id} style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.txDateCol}>
                  <Text style={[styles.txDateDay, { color: colors.text }]}>{dayNum}</Text>
                  <Text style={[styles.txDateMonth, { color: colors.textMuted }]}>{monthNameShort}</Text>
                </View>

                <View style={[styles.txCategoryIcon, { backgroundColor: isCredit ? (isDark ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7') : (isDark ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2') }]}>
                  {tx.category === 'Advance' && <CreditCard size={18} color="#DC2626" />}
                  {tx.category === 'Received' && <ArrowDownRight size={18} color="#059669" />}
                  {tx.category === 'Expense' && <ShoppingBag size={18} color="#D97706" />}
                  {tx.category === 'Payment' && <Receipt size={18} color="#2563EB" />}
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.txTitleText, { color: colors.text }]}>{tx.notes || tx.category || tx.type}</Text>
                  <Text style={[styles.txCategorySub, { color: colors.textMuted }]}>{tx.category} • {tx.date}</Text>
                </View>

                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text style={[styles.txAmountVal, { color: isCredit ? (isDark ? '#4ADE80' : '#16A34A') : (isDark ? '#F87171' : '#DC2626') }]}>
                    {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                  </Text>

                  <View style={styles.txActionRow}>
                    <TouchableOpacity
                      style={[styles.txActionBtnEdit, isDark && { backgroundColor: 'rgba(37, 99, 235, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}
                      onPress={() =>
                        router.push({
                          pathname: '/add-transaction',
                          params: { transactionId: tx.id, customerId: customer.id },
                        })
                      }
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Edit2 size={11} color="#2563EB" />
                      <Text style={styles.txActionEditText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.txActionBtnDelete, isDark && { backgroundColor: 'rgba(220, 38, 38, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                      onPress={() => handlePromptDelete(tx)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={11} color="#DC2626" />
                      <Text style={styles.txActionDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Bar Actions */}
      <View style={[styles.bottomBar, { backgroundColor: colors.headerBg, borderTopColor: colors.border }]}>
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.addAdvanceBtn}
            onPress={() => router.push({ pathname: '/add-transaction', params: { customerId: customer.id, defaultCategory: 'Advance' } })}
          >
            <Text style={styles.addAdvanceText}>{isBuyer ? 'Credit Given (उधार दिया)' : 'Given Money (दिया)'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.receivedMoneyBtn}
            onPress={() => router.push({ pathname: '/add-transaction', params: { customerId: customer.id, defaultCategory: 'Received' } })}
          >
            <Text style={styles.receivedMoneyText}>{isBuyer ? 'Paid for Milk (दूध का मिला)' : 'Received Money (मिला)'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.payCashBtn}
            onPress={() => router.push({ pathname: '/add-transaction', params: { customerId: customer.id, defaultCategory: 'Payment' } })}
          >
            <Text style={styles.payCashText}>Record Cash Hisaab</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settleBtn, isDark && { backgroundColor: 'rgba(5, 150, 105, 0.2)', borderColor: 'rgba(5, 150, 105, 0.4)' }]}
            onPress={() => router.push(`/settlement/${customer.id}`)}
          >
            <Text style={[styles.settleBtnText, { color: isDark ? '#34D399' : '#059669' }]}>Settlement</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Transaction Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Payment"
        message={
          txToDelete
            ? `Delete this ₹${txToDelete.amount} ${txToDelete.category} entry?`
            : 'Delete this transaction?'
        }
        confirmText="Delete"
        confirmStyle="destructive"
        type="danger"
        onCancel={() => {
          setShowDeleteModal(false);
          setTxToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Share Alert Modal */}
      {shareAlert && (
        <ConfirmationModal
          visible={shareAlert.visible}
          title={shareAlert.title}
          message={shareAlert.message}
          singleButton={true}
          confirmText="OK"
          type="danger"
          onCancel={() => setShareAlert(null)}
          onConfirm={() => setShareAlert(null)}
        />
      )}
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
  whatsAppHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  whatsAppHeaderBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  iconBtn: {
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
    paddingTop: 10,
    paddingBottom: 130,
  },
  monthSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  monthPillText: {
    fontSize: 15,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  monthShareStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  monthShareStripText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803D',
  },
  monthShareStripAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  sumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sumSub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: ThemeColors.textMuted,
  },
  sumVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  netBalanceBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netSubLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  netValText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065F46',
    marginTop: 2,
  },
  paymentsBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentsBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  filterPillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.textMedium,
  },
  filterPillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  emptySub: {
    fontSize: 13,
    color: ThemeColors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 10,
  },
  txDateCol: {
    alignItems: 'center',
    width: 38,
    marginRight: 8,
  },
  txDateDay: {
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  txDateMonth: {
    fontSize: 12,
    color: ThemeColors.textMuted,
  },
  txCategoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  txCategorySub: {
    fontSize: 12.5,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  txAmountVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  txActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  txActionBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  txActionEditText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  txActionBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  txActionDeleteText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: ThemeColors.border,
    gap: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 6,
  },
  addAdvanceBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#D97706',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  addAdvanceText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  receivedMoneyBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#0284C7',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  receivedMoneyText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  payCashBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#059669',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  payCashText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  settleBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleBtnText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
});
