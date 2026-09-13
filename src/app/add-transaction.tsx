import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  IndianRupee,
  FileText,
  CreditCard,
  ArrowDownRight,
  ShoppingBag,
  Receipt,
  CheckCircle2,
  Trash2,
  Calendar as CalendarIcon,
  Users,
  Search,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { Customer, TransactionCategory, TransactionType } from '@/types';
import { formatCurrency, sanitizeDecimalInput } from '@/utils/calculator';
import ConfirmationModal from '@/components/ConfirmationModal';
import { DatePickerModal } from '@/components/DatePickerModal';

export default function AddTransactionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const params = useLocalSearchParams();
  const {
    customers,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getCustomerBalance,
  } = useRepository();

  const safeCustomers = customers || [];
  const safeTransactions = transactions || [];

  const txId = params.transactionId as string | undefined;
  const existingTx = txId ? safeTransactions.find((t) => String(t.id) === String(txId)) : undefined;
  const isEditing = !!existingTx;

  // Selected customer initialization
  const initialCustomer = existingTx
    ? safeCustomers.find((c) => c && String(c.id) === String(existingTx.customer_id)) || safeCustomers[0]
    : safeCustomers.find((c) => c && String(c.id) === String(params.customerId)) ||
      safeCustomers[0] || {
        id: '',
        name: 'Select Farmer',
        village: '',
        status: 'ACTIVE' as const,
        created_at: '',
      };
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(initialCustomer);

  const todayStr = new Date().toISOString().split('T')[0];
  const [category, setCategory] = useState<TransactionCategory>(
    existingTx
      ? existingTx.category
      : ((params.defaultCategory as TransactionCategory) || 'Advance')
  );
  const [amountStr, setAmountStr] = useState(existingTx ? existingTx.amount.toString() : '');
  const [notes, setNotes] = useState(existingTx ? existingTx.notes || '' : '');
  const [txDate, setTxDate] = useState(
    existingTx ? existingTx.date : ((params.date as string) || todayStr)
  );

  // Modal states
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmStyle?: 'primary' | 'destructive' | 'success';
    singleButton?: boolean;
    type?: 'info' | 'success' | 'warning' | 'danger';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Input refs for auto-focus navigation
  const amountInputRef = useRef<TextInput>(null);
  const notesInputRef = useRef<TextInput>(null);

  const custBalance = selectedCustomer?.id
    ? getCustomerBalance(selectedCustomer.id)
    : {
        openingBal: 0,
        accumulatedMilkValue: 0,
        customerRepayments: 0,
        totalDeductions: 0,
        netDeductions: 0,
        paymentsMade: 0,
        payableBalance: 0,
      };

  const handleQuickAmount = (val: number) => {
    setAmountStr(val.toString());
  };

  const handleSave = async () => {
    const amountNum = parseFloat(amountStr) || 0;
    if (amountNum <= 0) {
      setConfirmModal({
        visible: true,
        title: 'Invalid Amount',
        message: 'Please enter a valid transaction amount.',
        singleButton: true,
        confirmText: 'OK',
        type: 'warning',
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    if (!selectedCustomer?.id) {
      setConfirmModal({
        visible: true,
        title: 'Select Farmer',
        message: 'Please choose a customer account.',
        singleButton: true,
        confirmText: 'OK',
        type: 'warning',
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    let isCredit = 0;
    let txType: TransactionType = 'ADVANCE_GIVEN';

    if (category === 'Advance') {
      txType = 'ADVANCE_GIVEN';
      isCredit = 0;
    } else if (category === 'Received') {
      txType = 'CUSTOMER_PAYMENT_RECEIVED';
      isCredit = 1;
    } else if (category === 'Expense') {
      txType = 'CATTLE_FEED';
      isCredit = 0;
    } else if (category === 'Payment') {
      txType = 'PAYMENT_MADE';
      isCredit = 0;
    }

    if (isEditing && existingTx) {
      await updateTransaction({
        ...existingTx,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        date: txDate,
        type: txType,
        category,
        amount: amountNum,
        is_credit: isCredit,
        notes: notes || `${category} entry`,
      });
      router.back();
    } else {
      await addTransaction({
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        date: txDate,
        type: txType,
        category,
        amount: amountNum,
        is_credit: isCredit,
        notes: notes || `${category} entry`,
      });
      router.back();
    }
  };

  const handleDelete = () => {
    if (!existingTx) return;
    setConfirmModal({
      visible: true,
      title: 'Delete Payment',
      message: `Delete this ₹${existingTx.amount} ${existingTx.category} entry?`,
      confirmText: 'Delete',
      confirmStyle: 'destructive',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        await deleteTransaction(existingTx.id);
        router.back();
      },
    });
  };

  const categoriesConfig: {
    key: TransactionCategory;
    label: string;
    subLabel: string;
    icon: any;
    color: string;
    bgColor: string;
  }[] = [
    {
      key: 'Advance',
      label: 'Given Money',
      subLabel: 'Advance Cash',
      icon: CreditCard,
      color: '#DC2626',
      bgColor: '#FEE2E2',
    },
    {
      key: 'Received',
      label: 'Received Money',
      subLabel: 'Paid Back',
      icon: ArrowDownRight,
      color: '#0284C7',
      bgColor: '#E0F2FE',
    },
    {
      key: 'Expense',
      label: 'Cattle Feed',
      subLabel: 'Store Purchase',
      icon: ShoppingBag,
      color: '#D97706',
      bgColor: '#FEF3C7',
    },
    {
      key: 'Payment',
      label: 'Record Hisaab Paid',
      subLabel: 'Bill Settled',
      icon: Receipt,
      color: '#059669',
      bgColor: '#DCFCE7',
    },
  ];

  const filteredCustomers = safeCustomers.filter((c) => {
    if (!c) return false;
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.village && c.village.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top Header */}
        <View style={[styles.topHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: Math.max(insets.top + 8, 16) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Money Entry' : 'Record Money Entry'}
          </Text>
          {isEditing ? (
            <TouchableOpacity style={styles.headerTrashBtn} onPress={handleDelete}>
              <Trash2 size={20} color="#DC2626" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Customer Header Card (Tappable to reassign/change account) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Farmer Account</Text>
            <TouchableOpacity
              onPress={() => setShowCustomerPicker(true)}
              style={[styles.changeAccountBtn, isDark && { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}
              activeOpacity={0.7}
            >
              <Users size={13} color={colors.primary} />
              <Text style={[styles.changeAccountBtnText, { color: colors.primary }]}>Switch Account</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.custCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowCustomerPicker(true)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.custName, { color: colors.text }]}>{selectedCustomer.name}</Text>
                {selectedCustomer?.customer_type === 'BUYER' ? (
                  <View style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: isDark ? '#FBBF24' : '#D97706' }}>Buyer</Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: isDark ? '#34D399' : '#059669' }}>Farmer</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.custSub, { color: colors.primary }]}>
                {selectedCustomer.village ? `${selectedCustomer.village} • ` : ''}Tap to change if added by mistake
              </Text>
            </View>

            <View style={[styles.balanceBadge, { backgroundColor: colors.cardSecondary }]}>
              <Text style={[styles.balanceBadgeLabel, { color: colors.textMuted }]}>
                {selectedCustomer?.customer_type === 'BUYER' ? 'Due to Dairy' : 'Balance'}
              </Text>
              <Text
                style={[
                  styles.balanceBadgeVal,
                  {
                    color:
                      selectedCustomer?.customer_type === 'BUYER'
                        ? '#D97706'
                        : custBalance.payableBalance >= 0
                        ? (isDark ? '#4ADE80' : '#16A34A')
                        : (isDark ? '#F87171' : '#DC2626'),
                  },
                ]}
              >
                {formatCurrency(custBalance.payableBalance)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Date Selector Row */}
          <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Date</Text>
          <TouchableOpacity
            style={[styles.dateSelectorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CalendarIcon size={18} color={colors.primary} />
              <Text style={[styles.dateSelectorText, { color: colors.text }]}>{txDate}</Text>
            </View>
            <Text style={[styles.dateChangeHint, { color: colors.primary }]}>Change Date</Text>
          </TouchableOpacity>

          {/* Transaction Category Selector Grid (2x2) */}
          <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Money Record Type</Text>
          <View style={styles.categoryGrid}>
            {categoriesConfig.map((item) => {
              const isSel = category === item.key;
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.catCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isSel && { borderColor: item.color, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : item.bgColor },
                  ]}
                  onPress={() => setCategory(item.key)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={[styles.catIconCircle, { backgroundColor: isSel ? (isDark ? colors.cardSecondary : '#FFF') : (isDark ? 'rgba(255, 255, 255, 0.08)' : item.bgColor) }]}>
                      <IconComp size={18} color={item.color} />
                    </View>
                    {isSel && <CheckCircle2 size={16} color={item.color} />}
                  </View>
                  <Text style={[styles.catLabel, { color: colors.text }, isSel && { color: item.color, fontWeight: '800' }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.catSubLabel, { color: colors.textMuted }]}>{item.subLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Amount Field */}
          <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Amount (₹)</Text>
          <View style={[styles.inputCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <IndianRupee size={22} color={colors.primary} style={{ marginRight: 8 }} />
            <TextInput
              ref={amountInputRef}
              style={[styles.largeInput, { color: colors.text }]}
              keyboardType="numeric"
              returnKeyType="next"
              enterKeyHint="next"
              blurOnSubmit={false}
              onSubmitEditing={() => notesInputRef.current?.focus()}
              value={amountStr}
              onChangeText={(val) => setAmountStr(sanitizeDecimalInput(val))}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Quick Amount Chips */}
          <View style={styles.quickAmountRow}>
            {[100, 200, 500, 1000, 2000, 5000].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[styles.quickChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleQuickAmount(amt)}
              >
                <Text style={[styles.quickChipText, { color: colors.primary }]}>₹{amt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description / Notes */}
          <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Note / Item Description (Optional)</Text>
          <View style={[styles.inputCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <FileText size={18} color={colors.textMedium} style={{ marginRight: 8 }} />
            <TextInput
              ref={notesInputRef}
              style={[styles.notesInput, { color: colors.text }]}
              placeholder="Notes (Optional)"
              returnKeyType="done"
              enterKeyHint="done"
              onSubmitEditing={handleSave}
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Save / Update Button */}
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>
              {isEditing ? 'Update Money Entry' : 'Save Money Entry'}
            </Text>
          </TouchableOpacity>

          {/* Delete Button (in Edit Mode) */}
          {isEditing && (
            <TouchableOpacity style={[styles.deleteEntryBtn, isDark && { backgroundColor: 'rgba(220, 38, 38, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]} onPress={handleDelete} activeOpacity={0.8}>
              <Trash2 size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.deleteEntryBtnText}>Delete Transaction</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Customer Picker Modal */}
      <Modal
        visible={showCustomerPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Farmer Account</Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>Switch who this payment belongs to</Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.cardSecondary, borderRadius: 16 }]}
                onPress={() => setShowCustomerPicker(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View style={[styles.searchBarContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name, village, or phone..."
                placeholderTextColor={colors.textMuted}
                value={customerSearchQuery}
                onChangeText={setCustomerSearchQuery}
                autoFocus={false}
              />
              {customerSearchQuery ? (
                <TouchableOpacity onPress={() => setCustomerSearchQuery('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Customer List */}
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredCustomers.length === 0 ? (
                <View style={styles.emptyList}>
                  <Text style={{ fontSize: 14, color: colors.textMuted }}>No farmers found</Text>
                </View>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = cust.id === selectedCustomer?.id;
                  const bal = getCustomerBalance(cust.id);
                  return (
                    <TouchableOpacity
                      key={cust.id}
                      style={[
                        styles.customerPickerItem,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        isSelected && [styles.customerPickerItemActive, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF', borderColor: colors.primary }],
                      ]}
                      onPress={() => {
                        setSelectedCustomer(cust);
                        setShowCustomerPicker(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.pickerCustName, { color: colors.text }, isSelected && { color: colors.primary }]}>
                            {cust.name}
                          </Text>
                          {cust.customer_type === 'BUYER' ? (
                            <View style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? '#FBBF24' : '#D97706' }}>Buyer</Text>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? '#34D399' : '#059669' }}>Farmer</Text>
                            </View>
                          )}
                        </View>
                        {cust.village ? <Text style={[styles.pickerCustVillage, { color: colors.textMuted }]}>{cust.village}</Text> : null}
                      </View>

                      <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                        <Text
                          style={[
                            styles.pickerBalText,
                            { color: bal.payableBalance >= 0 ? (isDark ? '#4ADE80' : '#16A34A') : (isDark ? '#F87171' : '#DC2626') },
                          ]}
                        >
                          {formatCurrency(bal.payableBalance)}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted }}>Balance</Text>
                      </View>

                      {isSelected ? (
                        <CheckCircle2 size={18} color={colors.primary} />
                      ) : (
                        <ChevronRight size={18} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        selectedDate={txDate}
        title="Select Transaction Date"
        onSelectDate={(dateStr) => {
          setTxDate(dateStr);
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Confirmation / Alert Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || 'Confirm'}
        confirmStyle={confirmModal.confirmStyle || 'primary'}
        singleButton={confirmModal.singleButton || false}
        type={confirmModal.type || 'info'}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
        onConfirm={confirmModal.onConfirm}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  backBtn: {
    padding: 6,
  },
  headerTrashBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  changeAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  changeAccountBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
  custCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 16,
  },
  custName: {
    fontSize: 17,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  custSub: {
    fontSize: 12,
    color: ThemeColors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  balanceBadge: {
    alignItems: 'flex-end',
    backgroundColor: ThemeColors.bgMain,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  balanceBadgeLabel: {
    fontSize: 11,
    color: ThemeColors.textMuted,
    fontWeight: '600',
  },
  balanceBadgeVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  dateSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 16,
  },
  dateSelectorText: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  dateChangeHint: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textMedium,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  catCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: ThemeColors.border,
  },
  catIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.textDark,
    marginTop: 8,
  },
  catSubLabel: {
    fontSize: 11.5,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  largeInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  quickAmountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  quickChip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
  notesInput: {
    flex: 1,
    fontSize: 14.5,
    color: ThemeColors.textDark,
  },
  saveBtn: {
    height: 48,
    backgroundColor: '#059669',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  deleteEntryBtn: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteEntryBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  modalSub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.bgMain,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    height: 42,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: ThemeColors.textDark,
  },
  customerPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 8,
  },
  customerPickerItemActive: {
    borderColor: ThemeColors.primary,
    backgroundColor: '#EFF6FF',
  },
  pickerCustName: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  pickerCustVillage: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  pickerBalText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyList: {
    paddingVertical: 30,
    alignItems: 'center',
  },
});
