import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Droplet,
  X,
  Edit2,
  Edit3,
  Plus,
  FlaskConical,
  IndianRupee,
  CheckCircle2,
  Lock,
  MessageCircle,
  Trash2,
} from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { formatCurrency, sanitizeDecimalInput } from '@/utils/calculator';
import { calculateFatSnfRate } from '@/utils/rate-chart';
import { shareWhatsAppMonthlyCustomerStatement, formatIndianWhatsAppNumber } from '@/utils/slip-generator';
import ConfirmationModal from '@/components/ConfirmationModal';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const _now = new Date();
const TODAY_YEAR = _now.getFullYear();
const TODAY_MONTH_INDEX = _now.getMonth();
const TODAY_DAY = _now.getDate();

export default function CustomerMilkCalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const { id } = useLocalSearchParams();
  const {
    getCustomerById,
    collections,
    addMilkCollection,
    deleteMilkCollection,
    getCustomerTransactions,
    getCustomerBalance,
    pricingSettings,
  } = useRepository();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const currentDay = now.getDate();

  const customer = getCustomerById(id as string) || {
    id: id as string,
    name: 'Customer',
    village: '',
    status: 'ACTIVE' as const,
    created_at: '',
  };

  const isBuyer = customer.customer_type === 'BUYER';

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentMonthIndex);
  const [selectedDay, setSelectedDay] = useState(currentDay);

  // Milk Entry Popup Modal state
  const [showMilkModal, setShowMilkModal] = useState<boolean>(false);
  const [modalSession, setModalSession] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [modalQuantityStr, setModalQuantityStr] = useState('');
  const [modalFatStr, setModalFatStr] = useState('');
  const [modalSnfStr, setModalSnfStr] = useState('');
  const [modalRateStr, setModalRateStr] = useState('');
  const [isManualAmount, setIsManualAmount] = useState<boolean>(false);
  const [manualAmountStr, setManualAmountStr] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalExistingCollId, setModalExistingCollId] = useState<string | null>(null);

  // Input refs for auto-focus navigation
  const quantityInputRef = useRef<TextInput>(null);
  const rateInputRef = useRef<TextInput>(null);
  const fatInputRef = useRef<TextInput>(null);
  const snfInputRef = useRef<TextInput>(null);

  // Alert Modal State
  const [modalAlert, setModalAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'warning',
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'info' | 'warning' | 'danger' | 'success' = 'warning'
  ) => {
    setModalAlert({
      visible: true,
      title,
      message,
      type,
    });
  };

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmStyle?: 'primary' | 'destructive' | 'success';
    type?: 'info' | 'warning' | 'danger' | 'success';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmStyle?: 'primary' | 'destructive' | 'success';
    type?: 'info' | 'warning' | 'danger' | 'success';
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      visible: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      confirmStyle: options.confirmStyle || 'primary',
      type: options.type || (options.confirmStyle === 'destructive' ? 'danger' : 'info'),
      onConfirm: options.onConfirm,
    });
  };

  const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const firstDayOfMonth = new Date(selectedYear, selectedMonthIndex, 1).getDay();
  // Mon = 0, Tue = 1, ..., Sun = 6
  const startingDayOffset = (firstDayOfMonth + 6) % 7;

  const monthStr = String(selectedMonthIndex + 1).padStart(2, '0');
  const dayStr = String(Math.min(selectedDay, daysInMonth)).padStart(2, '0');
  const dateStr = `${selectedYear}-${monthStr}-${dayStr}`;
  const monthPrefix = `${selectedYear}-${monthStr}`;

  const monthCollections = collections.filter(
    (c) => c && String(c.customer_id) === String(customer.id) && c.date && c.date.startsWith(monthPrefix)
  );

  let monthLitres = 0;
  let monthValue = 0;
  let fatWeightSum = 0;
  let snfWeightSum = 0;

  monthCollections.forEach((c) => {
    const qty = c.quantity || 0;
    monthLitres += qty;
    monthValue += (c.amount || 0);
    fatWeightSum += (c.fat || 0) * qty;
    snfWeightSum += (c.snf || 0) * qty;
  });

  const avgFat = monthLitres > 0 ? fatWeightSum / monthLitres : 0;
  const avgSnf = monthLitres > 0 ? snfWeightSum / monthLitres : 0;

  // Joining date restriction
  const joiningDateStr = (customer.created_at || '').split('T')[0];
  const joiningParts = joiningDateStr ? joiningDateStr.split('-') : [];
  const joiningYear = parseInt(joiningParts[0], 10) || 1970;
  const joiningMonthIndex = (parseInt(joiningParts[1], 10) || 1) - 1;
  const joiningDay = parseInt(joiningParts[2], 10) || 1;
  const hasValidJoiningDate = Boolean(joiningParts.length === 3 && !isNaN(joiningYear));

  // Clamp date to not go before joining date
  useEffect(() => {
    if (hasValidJoiningDate) {
      if (
        selectedYear < joiningYear ||
        (selectedYear === joiningYear && selectedMonthIndex < joiningMonthIndex)
      ) {
        setSelectedYear(joiningYear);
        setSelectedMonthIndex(joiningMonthIndex);
        setSelectedDay(joiningDay);
      } else if (
        selectedYear === joiningYear &&
        selectedMonthIndex === joiningMonthIndex &&
        selectedDay < joiningDay
      ) {
        setSelectedDay(joiningDay);
      }
    }
  }, [hasValidJoiningDate, joiningYear, joiningMonthIndex, joiningDay, selectedYear, selectedMonthIndex]);

  const isFutureDate =
    selectedYear > currentYear ||
    (selectedYear === currentYear && selectedMonthIndex > currentMonthIndex) ||
    (selectedYear === currentYear && selectedMonthIndex === currentMonthIndex && selectedDay > currentDay);

  const isSelectedDatePast =
    selectedYear < currentYear ||
    (selectedYear === currentYear && selectedMonthIndex < currentMonthIndex) ||
    (selectedYear === currentYear && selectedMonthIndex === currentMonthIndex && selectedDay < currentDay);

  const isSelectedDateBeforeJoining = Boolean(
    hasValidJoiningDate && dateStr < joiningDateStr
  );

  const isPrevDisabled = Boolean(
    hasValidJoiningDate &&
    (selectedYear < joiningYear ||
      (selectedYear === joiningYear && selectedMonthIndex <= joiningMonthIndex))
  );

  const isNextDisabled =
    selectedYear > currentYear || (selectedYear === currentYear && selectedMonthIndex >= currentMonthIndex);

  const handlePrevMonth = () => {
    if (isPrevDisabled) {
      showAlert('Joining Date', `Cannot go beyond customer joining date (${joiningDateStr}).`);
      return;
    }
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextDisabled) {
      showAlert('Future Month', 'Cannot navigate to future months.');
      return;
    }
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonthIndex((m) => m + 1);
    }
  };

  const handleOpenAddModal = (session: 'MORNING' | 'EVENING' = 'MORNING') => {
    if (isFutureDate) {
      showAlert('Future Date', 'Future dates are blocked.');
      return;
    }
    if (isSelectedDateBeforeJoining) {
      showAlert('Before Joining Date', `Customer joined on ${joiningDateStr}. Entries cannot be recorded before joining date.`);
      return;
    }

    setModalSession(session);
    const existing = collections.find(
      (c) => c && String(c.customer_id) === String(customer.id) && c.date === dateStr && c.session === session
    );

    if (existing) {
      setModalExistingCollId(existing.id);
      setModalQuantityStr(existing.quantity ? existing.quantity.toString() : '');
      const fStr = existing.fat ? existing.fat.toString() : '';
      const sStr = existing.snf ? existing.snf.toString() : '';
      setModalFatStr(fStr);
      setModalSnfStr(sStr);

      const f = parseFloat(fStr) || 0;
      const s = parseFloat(sStr) || 0;
      if (!isBuyer && pricingSettings?.autoCalculate === true && f > 0 && s > 0) {
        const autoRate = calculateFatSnfRate(f, s, pricingSettings?.customerRate);
        setModalRateStr(autoRate > 0 ? String(autoRate) : (existing.rate ? existing.rate.toString() : ''));
      } else {
        setModalRateStr(existing.rate ? existing.rate.toString() : (isBuyer && customer.default_sale_rate ? customer.default_sale_rate.toString() : ''));
      }
      setIsManualAmount(false);
      setManualAmountStr(existing.amount ? existing.amount.toString() : '');
      setModalNotes(existing.notes || '');
    } else {
      setModalExistingCollId(null);
      setModalQuantityStr('');
      setModalFatStr('');
      setModalSnfStr('');
      setModalRateStr(isBuyer && customer.default_sale_rate ? customer.default_sale_rate.toString() : '');
      setIsManualAmount(false);
      setManualAmountStr('');
      setModalNotes('');
    }

    setShowMilkModal(true);
    setTimeout(() => {
      quantityInputRef.current?.focus();
    }, 150);
  };

  const handleSessionSwitchInModal = (newSession: 'MORNING' | 'EVENING') => {
    setModalSession(newSession);
    const existing = collections.find(
      (c) => c && String(c.customer_id) === String(customer.id) && c.date === dateStr && c.session === newSession
    );
    if (existing) {
      setModalExistingCollId(existing.id);
      setModalQuantityStr(existing.quantity ? existing.quantity.toString() : '');
      const fStr = existing.fat ? existing.fat.toString() : '';
      const sStr = existing.snf ? existing.snf.toString() : '';
      setModalFatStr(fStr);
      setModalSnfStr(sStr);

      const f = parseFloat(fStr) || 0;
      const s = parseFloat(sStr) || 0;
      if (!isBuyer && pricingSettings?.autoCalculate === true && f > 0 && s > 0) {
        const autoRate = calculateFatSnfRate(f, s, pricingSettings?.customerRate);
        setModalRateStr(autoRate > 0 ? String(autoRate) : (existing.rate ? existing.rate.toString() : ''));
      } else {
        setModalRateStr(existing.rate ? existing.rate.toString() : (isBuyer && customer.default_sale_rate ? customer.default_sale_rate.toString() : ''));
      }
      setIsManualAmount(false);
      setManualAmountStr(existing.amount ? existing.amount.toString() : '');
      setModalNotes(existing.notes || '');
    } else {
      setModalExistingCollId(null);
      setModalQuantityStr('');
      setModalFatStr('');
      setModalSnfStr('');
      setModalRateStr(isBuyer && customer.default_sale_rate ? customer.default_sale_rate.toString() : '');
      setIsManualAmount(false);
      setManualAmountStr('');
      setModalNotes('');
    }
    setTimeout(() => {
      quantityInputRef.current?.focus();
    }, 150);
  };

  const handleModalFatSnfChange = (newFat: string, newSnf: string) => {
    const cleanFat = sanitizeDecimalInput(newFat);
    const cleanSnf = sanitizeDecimalInput(newSnf);
    setModalFatStr(cleanFat);
    setModalSnfStr(cleanSnf);

    if (!isBuyer && pricingSettings?.autoCalculate === true) {
      const f = parseFloat(cleanFat);
      const s = parseFloat(cleanSnf);
      if (!isNaN(f) && f > 0 && !isNaN(s) && s > 0) {
        const autoRate = calculateFatSnfRate(f, s, pricingSettings?.customerRate);
        if (autoRate > 0) {
          setModalRateStr(String(autoRate));
        }
      }
    }
  };

  // Toast message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleSaveModalEntry = () => {
    if (isSelectedDateBeforeJoining) {
      showAlert('Before Joining Date', `Customer joined on ${joiningDateStr}. Entries cannot be saved before joining date.`);
      return;
    }

    const qtyNum = parseFloat(modalQuantityStr) || 0;
    const fatNum = parseFloat(modalFatStr) || 0;
    const snfNum = parseFloat(modalSnfStr) || 0;

    if (qtyNum <= 0) {
      showAlert('Invalid Quantity', 'Please enter milk quantity.');
      return;
    }

    let rateNum = 0;
    if (isBuyer) {
      rateNum = parseFloat(modalRateStr) || customer.default_sale_rate || 60;
    } else if (pricingSettings?.autoCalculate === true) {
      if (fatNum <= 0 || snfNum <= 0) {
        showAlert('Invalid Quality', 'Please enter valid Fat % and SNF % to calculate rate.');
        return;
      }
      rateNum = calculateFatSnfRate(fatNum, snfNum, pricingSettings?.customerRate);
    } else {
      // Manual Rate Entry Mode (Default when autoCalculate is disabled)
      rateNum = parseFloat(modalRateStr);
      if (!rateNum || rateNum <= 0) {
        showAlert('Missing Rate', 'Please enter milk rate (₹/L) for this supplier.');
        return;
      }
    }

    const calculatedAmount = Math.round(qtyNum * rateNum * 100) / 100;

    showConfirm({
      title: modalExistingCollId ? 'Update Record?' : 'Save Record?',
      message: `Save ${qtyNum} L milk for ${customer.name} (₹${calculatedAmount.toFixed(2)})?`,
      confirmText: modalExistingCollId ? 'Update' : 'Save',
      cancelText: 'Cancel',
      confirmStyle: 'primary',
      type: 'info',
      onConfirm: async () => {
        await addMilkCollection({
          customer_id: customer.id,
          customer_name: customer.name,
          village: customer.village,
          date: dateStr,
          session: modalSession,
          entry_type: isBuyer ? 'SALE' : 'PURCHASE',
          quantity: qtyNum,
          fat: fatNum,
          snf: snfNum,
          rate: rateNum,
          amount: calculatedAmount,
          notes: modalNotes,
        });

        setShowMilkModal(false);
        showToast(`✅ Entry saved: ${qtyNum} L for ${customer.name} (${modalSession === 'MORNING' ? 'Morning' : 'Evening'})`);
      },
    });
  };

  const handleDeleteModalEntry = () => {
    if (!modalExistingCollId) return;
    showConfirm({
      title: 'Delete Milk Record?',
      message: `Delete ${customer.name}'s ${selectedDay} ${MONTH_NAMES[selectedMonthIndex]} (${modalSession === 'MORNING' ? 'Morning' : 'Evening'}) entry? This will also update their ledger balance.`,
      confirmText: 'Delete Record',
      confirmStyle: 'destructive',
      onConfirm: async () => {
        try {
          await deleteMilkCollection(modalExistingCollId);
          setShowMilkModal(false);
          showToast(`🗑️ Record deleted`);
        } catch (err: any) {
          showAlert('Error', err?.message || 'Failed to delete entry.', 'danger');
        }
      },
    });
  };

  const dayMorningEntry = collections.find((c) => c && String(c.customer_id) === String(customer.id) && c.date === dateStr && c.session === 'MORNING');
  const dayEveningEntry = collections.find((c) => c && String(c.customer_id) === String(customer.id) && c.date === dateStr && c.session === 'EVENING');

  const calcModalQty = parseFloat(modalQuantityStr) || 0;
  const modalFatNum = parseFloat(modalFatStr) || 0;
  const modalSnfNum = parseFloat(modalSnfStr) || 0;
  const computedSellerRate =
    modalFatNum > 0 && modalSnfNum > 0
      ? calculateFatSnfRate(modalFatNum, modalSnfNum, pricingSettings?.customerRate)
      : parseFloat(modalRateStr) || 0;
  const activeRate = isBuyer
    ? (parseFloat(modalRateStr) || customer.default_sale_rate || 60)
    : (pricingSettings?.autoCalculate === true ? computedSellerRate : (parseFloat(modalRateStr) || 0));
  const calcModalTotal = Math.round(calcModalQty * activeRate * 100) / 100;

  const handleShareMonthlyWhatsApp = async () => {
    if (!customer.phone?.trim()) {
      showAlert('Missing Phone', 'Phone number not provided.');
      return;
    }

    if (!formatIndianWhatsAppNumber(customer.phone)) {
      showAlert('Invalid Phone', '10-digit mobile number required.');
      return;
    }

    if (monthCollections.length === 0) {
      showAlert('No Records', 'No milk entries for this month.');
      return;
    }

    const balanceInfo = getCustomerBalance(customer.id);
    const monthTransactions = getCustomerTransactions ? getCustomerTransactions(customer.id).filter(
      (t) => t && t.date && t.date.startsWith(monthPrefix)
    ) : [];

    const monthDeductions = monthTransactions
      .filter((t) => !t.is_credit && (t.category === 'Advance' || t.category === 'Expense'))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const netPayable = balanceInfo?.payableBalance ?? (monthValue - monthDeductions);

    const result = await shareWhatsAppMonthlyCustomerStatement({
      customerName: customer.name,
      phone: customer.phone,
      monthYear: `${MONTH_NAMES[selectedMonthIndex]} ${selectedYear}`,
      totalLitres: monthLitres,
      avgFat,
      avgSnf,
      totalMilkValue: monthValue,
      totalDeductions: monthDeductions,
      previousBalance: customer.opening_balance || 0,
      netPayable,
      isBuyer,
    });

    if (!result.success) {
      if (result.error === 'INVALID_PHONE') {
        showAlert('Invalid Phone', '10-digit mobile number required.');
      } else {
        showAlert('Share Failed', result.error || 'Failed to send statement.', 'danger');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: Math.max(insets.top + 8, 16) }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{customer.name}</Text>
            {isBuyer ? (
              <View style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? '#FBBF24' : '#D97706' }}>Milk Buyer</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.headerSub, { color: colors.textMedium }]}>{isBuyer ? `Retail Daily Register (Rate: ₹${customer.default_sale_rate || 60}/L)` : 'Milk History Calendar'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.headerShareBtn, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#DCFCE7', borderColor: isDark ? 'rgba(5, 150, 105, 0.4)' : '#86EFAC' }]}
          onPress={handleShareMonthlyWhatsApp}
          activeOpacity={0.8}
        >
          <MessageCircle size={18} color="#059669" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Month Selector */}
        <View style={styles.monthHeaderRow}>
          <TouchableOpacity
            style={[
              styles.arrowBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              isPrevDisabled && { opacity: 0.3 }
            ]}
            onPress={handlePrevMonth}
            disabled={isPrevDisabled}
          >
            <ChevronLeft size={22} color={isPrevDisabled ? colors.textMuted : colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.monthTitleText, { color: colors.text }]}>{MONTH_NAMES[selectedMonthIndex]} {selectedYear}</Text>
            {(selectedYear !== currentYear || selectedMonthIndex !== currentMonthIndex || selectedDay !== currentDay) && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedYear(currentYear);
                  setSelectedMonthIndex(currentMonthIndex);
                  setSelectedDay(currentDay);
                }}
                style={{ marginTop: 2, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF', borderRadius: 6 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Back to Today</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.arrowBtn, { backgroundColor: colors.card, borderColor: colors.border }, isNextDisabled && { opacity: 0.3 }]}
            onPress={handleNextMonth}
            disabled={isNextDisabled}
          >
            <ChevronRight size={22} color={isNextDisabled ? colors.textMuted : colors.text} />
          </TouchableOpacity>
        </View>

        {/* Days Header */}
        <View style={styles.weekDaysRow}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
            <Text key={idx} style={[styles.weekDayText, { color: colors.textMuted }]}>{day}</Text>
          ))}
        </View>

        {/* Calendar Card with Integrated Bottom Legend */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.calendarGrid}>
            {Array.from({ length: startingDayOffset }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.calendarCellWrapper} />
            ))}
            {calendarDays.map((dayNum) => {
              const isSelected = dayNum === selectedDay;
              const cellDateStr = `${selectedYear}-${monthStr}-${String(dayNum).padStart(2, '0')}`;

              const hasMorning = collections.some(
                (c) => c && String(c.customer_id) === String(customer.id) && c.date === cellDateStr && c.session === 'MORNING'
              );
              const hasEvening = collections.some(
                (c) => c && String(c.customer_id) === String(customer.id) && c.date === cellDateStr && c.session === 'EVENING'
              );

              const isCellBeforeJoining = Boolean(hasValidJoiningDate && cellDateStr < joiningDateStr);

              const isCellFuture =
                selectedYear > currentYear ||
                (selectedYear === currentYear && selectedMonthIndex > currentMonthIndex) ||
                (selectedYear === currentYear && selectedMonthIndex === currentMonthIndex && dayNum > currentDay);

              const isCellToday =
                selectedYear === currentYear &&
                selectedMonthIndex === currentMonthIndex &&
                dayNum === currentDay;

              let circleStyle: any = styles.circleRed;
              let textColorStyle: any = styles.textRed;
              let shiftMark = '';

              if (isCellBeforeJoining) {
                circleStyle = [styles.circleFuture, { opacity: 0.35 }];
                textColorStyle = [styles.textFuture, { color: colors.textMuted, opacity: 0.4 }];
                shiftMark = '';
              } else if (isCellFuture) {
                circleStyle = [styles.circleFuture, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: colors.border }];
                textColorStyle = [styles.textFuture, { color: colors.textMuted }];
              } else if (hasMorning && hasEvening) {
                circleStyle = [styles.circleGreen, isDark && { backgroundColor: 'rgba(22, 163, 74, 0.2)', borderColor: 'rgba(34, 197, 94, 0.5)' }];
                textColorStyle = [styles.textGreen, isDark && { color: '#4ADE80' }];
              } else if (hasMorning) {
                circleStyle = [styles.circleYellow, isDark && { backgroundColor: 'rgba(217, 119, 6, 0.2)', borderColor: 'rgba(245, 158, 11, 0.5)' }];
                textColorStyle = [styles.textYellow, isDark && { color: '#FBBF24' }];
                shiftMark = 'M';
              } else if (hasEvening) {
                circleStyle = [styles.circleYellow, isDark && { backgroundColor: 'rgba(217, 119, 6, 0.2)', borderColor: 'rgba(245, 158, 11, 0.5)' }];
                textColorStyle = [styles.textYellow, isDark && { color: '#FBBF24' }];
                shiftMark = 'E';
              } else {
                circleStyle = [styles.circleRed, isDark && { backgroundColor: 'rgba(220, 38, 38, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }];
                textColorStyle = [styles.textRed, isDark && { color: '#F87171' }];
              }

              return (
                <TouchableOpacity
                  key={dayNum}
                  style={[
                    styles.calendarCellWrapper,
                    isSelected && [styles.selectedCellBorder, isDark && { backgroundColor: 'rgba(2, 132, 199, 0.2)' }],
                  ]}
                  disabled={isCellFuture || isCellBeforeJoining}
                  onPress={() => setSelectedDay(dayNum)}
                >
                  <View style={[
                    styles.dateCircle,
                    circleStyle,
                    isCellToday && !isSelected && { borderWidth: 2, borderColor: colors.primary },
                    isSelected && styles.selectedCircleFill
                  ]}>
                    <Text
                      style={[
                        styles.dateTextBase,
                        textColorStyle,
                        isSelected && styles.selectedDayNumText,
                      ]}
                    >
                      {dayNum}
                    </Text>
                    {shiftMark ? (
                      <Text style={[styles.shiftMarkText, isSelected && { color: '#FFF' }]}>{shiftMark}</Text>
                    ) : isCellToday ? (
                      <Text style={[styles.shiftMarkText, { color: isSelected ? '#FFF' : colors.primary, fontSize: 8 }]}>TODAY</Text>
                    ) : isCellBeforeJoining ? (
                      <Text style={[styles.shiftMarkText, { color: colors.textMuted, fontSize: 7, opacity: 0.4 }]}>—</Text>
                    ) : isCellFuture ? (
                      <Lock size={9} color={colors.textMuted} style={{ marginTop: -2 }} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Integrated Calendar Bottom Legend */}
          <View style={[styles.calendarBottomLegend, { backgroundColor: colors.cardSecondary, borderTopColor: colors.border }]}>
            <View style={styles.legendItem}>
              <View style={styles.legendBadgeGreen}>
                <View style={styles.legendDotGreen} />
              </View>
              <Text style={[styles.legendLabel, { color: colors.textMedium }]}>Both Shifts</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={styles.legendBadgeYellow}>
                <Text style={styles.legendBadgeTextYellow}>M</Text>
              </View>
              <Text style={[styles.legendLabel, { color: colors.textMedium }]}>1 Shift</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={styles.legendBadgeRed}>
                <View style={styles.legendDotRed} />
              </View>
              <Text style={[styles.legendLabel, { color: colors.textMedium }]}>No Milk</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendBadgeGray, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Lock size={9} color={colors.textMuted} />
              </View>
              <Text style={[styles.legendLabelMuted, { color: colors.textMuted }]}>Future</Text>
            </View>
          </View>
        </View>

        {/* Selected Date Header + Single Edit Action Button */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{selectedDay} {MONTH_NAMES[selectedMonthIndex]} {selectedYear}</Text>
            {selectedYear === currentYear && selectedMonthIndex === currentMonthIndex && selectedDay === currentDay && (
              <View style={{ backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : '#86EFAC' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#4ADE80' : '#16A34A' }}>Today</Text>
              </View>
            )}
          </View>

          {!isFutureDate && !isSelectedDateBeforeJoining && (
            <TouchableOpacity
              style={[styles.headerEditBtn, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF', borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE' }]}
              onPress={() => {
                const defaultSess = (dayMorningEntry && !dayEveningEntry) ? 'MORNING' : (dayEveningEntry && !dayMorningEntry ? 'EVENING' : 'MORNING');
                handleOpenAddModal(defaultSess);
              }}
              activeOpacity={0.8}
            >
              <Edit3 size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.headerEditText, { color: colors.primary }]}>
                {dayMorningEntry || dayEveningEntry ? 'Edit Entry' : (isBuyer ? 'Add Purchase' : 'Add Entry')}
              </Text>
            </TouchableOpacity>
          )}
          {isSelectedDateBeforeJoining && (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : '#F1F5F9', borderRadius: 8 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700' }}>Before Joining ({joiningDateStr})</Text>
            </View>
          )}
        </View>

        {/* Date-Wise Milk Register Table */}
        <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Table Header Row (Written Once) */}
          <View style={[styles.tableHeaderRow, { backgroundColor: colors.cardSecondary, borderBottomColor: colors.border }]}>
            <View style={styles.colShift}>
              <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>Shift</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>Qty (L)</Text>
            </View>
            {!isBuyer && (
              <>
                <View style={styles.colFat}>
                  <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>Fat</Text>
                </View>
                <View style={styles.colSnf}>
                  <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>SNF</Text>
                </View>
              </>
            )}
            <View style={styles.colRate}>
              <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>Rate</Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>Amount</Text>
            </View>
          </View>

          {/* Morning Shift Row (M) - Unclickable display row */}
          <View
            style={[styles.tableRow, styles.tableRowDivider, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
          >
            <View style={styles.colShift}>
              <View style={[styles.shiftBadgeM, isDark && { backgroundColor: 'rgba(217, 119, 6, 0.2)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
                <Text style={[styles.shiftBadgeTextM, isDark && { color: '#FBBF24' }]}>M</Text>
              </View>
            </View>
            {dayMorningEntry ? (
              <>
                <View style={styles.colQty}>
                  <Text style={[styles.tableCellBold, { color: colors.text }]}>
                    {dayMorningEntry.quantity}
                  </Text>
                </View>
                {!isBuyer && (
                  <>
                    <View style={styles.colFat}>
                      <Text style={[styles.tableCellText, { color: colors.text }]}>
                        {dayMorningEntry.fat}%
                      </Text>
                    </View>
                    <View style={styles.colSnf}>
                      <Text style={[styles.tableCellText, { color: colors.text }]}>
                        {dayMorningEntry.snf}%
                      </Text>
                    </View>
                  </>
                )}
                <View style={styles.colRate}>
                  <Text style={[styles.tableCellText, { color: colors.text }]}>
                    {dayMorningEntry.rate > 0 ? `₹${parseFloat(Number(dayMorningEntry.rate).toFixed(2))}` : (isBuyer ? 'Fixed' : '₹0')}
                  </Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={styles.tableCellGreen}>
                    {dayMorningEntry.amount > 0 ? formatCurrency(dayMorningEntry.amount) : (isBuyer ? 'Month-end' : '₹0')}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.colQty}>
                  <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                </View>
                {!isBuyer && (
                  <>
                    <View style={styles.colFat}>
                      <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                    </View>
                    <View style={styles.colSnf}>
                      <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                    </View>
                  </>
                )}
                <View style={styles.colRate}>
                  <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                </View>
              </>
            )}
          </View>

          {/* Evening Shift Row (E) - Unclickable display row */}
          <View
            style={[styles.tableRow, { backgroundColor: colors.card }]}
          >
            <View style={styles.colShift}>
              <View style={[styles.shiftBadgeE, isDark && { backgroundColor: 'rgba(79, 70, 229, 0.2)', borderColor: 'rgba(99, 102, 241, 0.4)' }]}>
                <Text style={[styles.shiftBadgeTextE, isDark && { color: '#A5B4FC' }]}>E</Text>
              </View>
            </View>
            {dayEveningEntry ? (
              <>
                <View style={styles.colQty}>
                  <Text style={[styles.tableCellBold, { color: colors.text }]}>
                    {dayEveningEntry.quantity}
                  </Text>
                </View>
                {!isBuyer && (
                  <>
                    <View style={styles.colFat}>
                      <Text style={[styles.tableCellText, { color: colors.text }]}>
                        {dayEveningEntry.fat}%
                      </Text>
                    </View>
                    <View style={styles.colSnf}>
                      <Text style={[styles.tableCellText, { color: colors.text }]}>
                        {dayEveningEntry.snf}%
                      </Text>
                    </View>
                  </>
                )}
                <View style={styles.colRate}>
                  <Text style={[styles.tableCellText, { color: colors.text }]}>
                    {dayEveningEntry.rate > 0 ? `₹${parseFloat(Number(dayEveningEntry.rate).toFixed(2))}` : (isBuyer ? 'Fixed' : '₹0')}
                  </Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={styles.tableCellGreen}>
                    {dayEveningEntry.amount > 0 ? formatCurrency(dayEveningEntry.amount) : (isBuyer ? 'Month-end' : '₹0')}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.colQty}>
                  <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                </View>
                {!isBuyer && (
                  <>
                    <View style={styles.colFat}>
                      <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                    </View>
                    <View style={styles.colSnf}>
                      <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                    </View>
                  </>
                )}
                <View style={styles.colRate}>
                  <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                </View>
              </>
            )}
          </View>

          {/* Table Total Summary Row */}
          {(dayMorningEntry || dayEveningEntry) ? (
            <View style={[styles.tableTotalRow, { backgroundColor: colors.cardSecondary, borderTopColor: colors.border }]}>
              <View style={styles.colShift}>
                <Text style={[styles.tableTotalLabel, { color: colors.textMedium }]}>T</Text>
              </View>
              <View style={styles.colQty}>
                <Text style={[styles.tableTotalQty, { color: colors.text }]}>
                  {((dayMorningEntry?.quantity || 0) + (dayEveningEntry?.quantity || 0)).toFixed(1)}
                </Text>
              </View>
              {!isBuyer && (
                <>
                  <View style={styles.colFat}>
                    <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                  </View>
                  <View style={styles.colSnf}>
                    <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
                  </View>
                </>
              )}
              <View style={styles.colRate}>
                <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
              </View>
              <View style={styles.colAmount}>
                <Text style={styles.tableTotalAmount}>
                  {formatCurrency((dayMorningEntry?.amount || 0) + (dayEveningEntry?.amount || 0))}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.emptyTableFooter, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <Text style={[styles.emptyTableText, { color: colors.textMuted }]}>
                {isBuyer ? 'No milk purchases recorded on this date.' : 'No milk entries recorded on this date.'}
              </Text>
            </View>
          )}
        </View>

        {/* Monthly Statement Breakdown & WhatsApp Slip Card */}
        <View style={[styles.monthSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.monthSummaryTitle, { color: colors.text }]}>{MONTH_NAMES[selectedMonthIndex]} {selectedYear} Statement</Text>
              <Text style={[styles.monthSummarySub, { color: colors.textMuted }]}>
                {monthCollections.length} shifts • {monthLitres.toFixed(1)} L {monthLitres > 0 && !isBuyer ? `• Avg Fat ${avgFat.toFixed(1)}%` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.monthSummaryAmount}>{formatCurrency(monthValue)}</Text>
              <Text style={[styles.monthSummarySub, { color: colors.textMuted }]}>{isBuyer ? 'Total Purchase' : 'Gross Value'}</Text>
            </View>
          </View>

          {/* Quick Metrics Breakdown */}
          <View style={[styles.statementBreakdownGrid, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <View style={styles.breakdownBox}>
              <Text style={[styles.breakdownBoxLabel, { color: colors.textMuted }]}>Total Milk</Text>
              <Text style={[styles.breakdownBoxVal, { color: colors.text }]}>{monthLitres.toFixed(1)} L</Text>
            </View>
            {!isBuyer && (
              <View style={styles.breakdownBox}>
                <Text style={[styles.breakdownBoxLabel, { color: colors.textMuted }]}>Avg Quality</Text>
                <Text style={[styles.breakdownBoxVal, { color: colors.text }]}>{avgFat.toFixed(1)} / {avgSnf.toFixed(1)}</Text>
              </View>
            )}
            <View style={styles.breakdownBox}>
              <Text style={[styles.breakdownBoxLabel, { color: colors.textMuted }]}>{isBuyer ? 'Total Sales' : 'Gross Milk'}</Text>
              <Text style={[styles.breakdownBoxVal, { color: '#059669' }]}>{formatCurrency(monthValue)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.whatsAppShareFullBtn, { backgroundColor: isDark ? '#059669' : '#16A34A' }]}
            onPress={handleShareMonthlyWhatsApp}
            activeOpacity={0.8}
          >
            <Text style={styles.whatsAppShareBtnText}>Send Monthly Statement on WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MILK ENTRY POPUP MODAL */}
      <Modal
        visible={showMilkModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMilkModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMilkModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.milkModalCard, { backgroundColor: colors.modalBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                      {isBuyer ? 'Record Buyer Milk (दूध)' : 'Enter Milk Record'}
                    </Text>
                    {isBuyer && (
                      <View style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#FBBF24' : '#D97706' }}>Buyer</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {customer.name} • {selectedDay} {MONTH_NAMES[selectedMonthIndex]} ({modalSession === 'MORNING' ? 'Morning' : 'Evening'})
                  </Text>
                </View>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.cardSecondary }]} onPress={() => setShowMilkModal(false)}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Shift Selection Segmented Tabs */}
              <View style={[styles.modalShiftTabsContainer, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.modalShiftTab,
                    modalSession === 'MORNING' && [styles.modalShiftTabActiveMorning, { backgroundColor: colors.card, borderColor: '#F59E0B' }],
                  ]}
                  onPress={() => handleSessionSwitchInModal('MORNING')}
                  activeOpacity={0.8}
                >
                  <Sun size={17} color={modalSession === 'MORNING' ? '#D97706' : colors.textMuted} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.modalShiftTabText,
                      { color: colors.textMuted },
                      modalSession === 'MORNING' && { color: isDark ? '#FBBF24' : '#B45309', fontWeight: '800' },
                    ]}
                  >
                    Morning Shift
                  </Text>
                  {collections.some((c) => c && String(c.customer_id) === String(customer.id) && c.date === dateStr && c.session === 'MORNING') && (
                    <View style={styles.tabRecordedDot} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalShiftTab,
                    modalSession === 'EVENING' && [styles.modalShiftTabActiveEvening, { backgroundColor: colors.card, borderColor: '#6366F1' }],
                  ]}
                  onPress={() => handleSessionSwitchInModal('EVENING')}
                  activeOpacity={0.8}
                >
                  <Moon size={17} color={modalSession === 'EVENING' ? '#6366F1' : colors.textMuted} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.modalShiftTabText,
                      { color: colors.textMuted },
                      modalSession === 'EVENING' && { color: isDark ? '#A5B4FC' : '#4338CA', fontWeight: '800' },
                    ]}
                  >
                    Evening Shift
                  </Text>
                  {collections.some((c) => c && String(c.customer_id) === String(customer.id) && c.date === dateStr && c.session === 'EVENING') && (
                    <View style={styles.tabRecordedDot} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Form Input Grid */}
              <ScrollView
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                automaticallyAdjustKeyboardInsets={true}
                contentContainerStyle={{ paddingBottom: 60 }}
              >
                {/* Quick Quantity Pills for Fast Entry (Retail Milk Buyers Only) */}
                {isBuyer && (
                  <>
                    <Text style={[styles.gridFieldLabel, { color: colors.textMedium }]}>Select Milk Quantity (Litres)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                      {['0.5', '1.0', '1.5', '2.0', '3.0', '5.0'].map((lVal) => (
                        <TouchableOpacity
                          key={lVal}
                          style={[
                            {
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 10,
                              backgroundColor: modalQuantityStr === lVal ? (isDark ? 'rgba(217, 119, 6, 0.25)' : '#FEF3C7') : colors.cardSecondary,
                              borderWidth: 1.5,
                              borderColor: modalQuantityStr === lVal ? '#D97706' : colors.border,
                            },
                          ]}
                          onPress={() => setModalQuantityStr(lVal)}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '800',
                              color: modalQuantityStr === lVal ? (isDark ? '#FBBF24' : '#92400E') : colors.text,
                            }}
                          >
                            +{lVal} L
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Quantity Input Field (Full width for both Buyers and Sellers) */}
                <View style={styles.gridLineRow}>
                  <View style={[styles.gridColField, { flex: 1 }]}>
                    <Text style={[styles.gridFieldLabel, { color: colors.textMedium }]}>Quantity (Liters) *</Text>
                    <View style={[styles.inputBoxHighlight, { backgroundColor: colors.inputBg, borderColor: colors.primary }, isBuyer && { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FFFBEB', borderColor: '#F59E0B' }]}>
                      <Droplet size={18} color={isBuyer ? '#D97706' : colors.primary} style={{ marginRight: 6 }} />
                      <TextInput
                        ref={quantityInputRef}
                        style={[styles.gridInputTextBold, { color: colors.text }]}
                        keyboardType="decimal-pad"
                        returnKeyType={isBuyer ? 'done' : 'next'}
                        enterKeyHint={isBuyer ? 'done' : 'next'}
                        blurOnSubmit={isBuyer}
                        onSubmitEditing={() => {
                          if (isBuyer) {
                            if (rateInputRef.current) {
                              rateInputRef.current.focus();
                            } else {
                              handleSaveModalEntry();
                            }
                          } else if (pricingSettings?.autoCalculate !== true && rateInputRef.current) {
                            rateInputRef.current.focus();
                          } else {
                            fatInputRef.current?.focus();
                          }
                        }}
                        value={modalQuantityStr}
                        onChangeText={(val) => setModalQuantityStr(sanitizeDecimalInput(val))}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                </View>

                {/* Rate Input for Retail Buyers */}
                {isBuyer && (
                  <View style={[styles.gridLineRow, { marginTop: 12 }]}>
                    <View style={[styles.gridColField, { flex: 1 }]}>
                      <Text style={[styles.gridFieldLabel, { color: colors.textMedium }]}>Rate (₹ / Litre) *</Text>
                      <View style={[styles.inputBoxHighlight, { backgroundColor: isDark ? colors.inputBg : '#ECFDF5', borderColor: '#10B981' }]}>
                        <IndianRupee size={16} color="#059669" style={{ marginRight: 6 }} />
                        <TextInput
                          ref={rateInputRef}
                          style={[styles.gridInputTextBold, { color: colors.text }]}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                          enterKeyHint="done"
                          onSubmitEditing={handleSaveModalEntry}
                          value={modalRateStr}
                          onChangeText={(val) => setModalRateStr(sanitizeDecimalInput(val))}
                          placeholder={String(customer.default_sale_rate || 60)}
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Seller Inputs (Rate, Fat, SNF) */}
                {!isBuyer && (
                  <>
                    {/* Manual Rate Input Field (When Auto Rate is Disabled - Default) */}
                    {pricingSettings?.autoCalculate !== true && (
                      <View style={[styles.gridLineRow, { marginTop: 12 }]}>
                        <View style={[styles.gridColField, { flex: 1 }]}>
                          <Text style={[styles.gridFieldLabel, { color: colors.textMedium }]}>Rate (₹ / Litre) *</Text>
                          <View style={[styles.inputBoxHighlight, { backgroundColor: isDark ? colors.inputBg : '#ECFDF5', borderColor: '#10B981' }]}>
                            <IndianRupee size={16} color="#059669" style={{ marginRight: 6 }} />
                            <TextInput
                              ref={rateInputRef}
                              style={[styles.gridInputTextBold, { color: colors.text }]}
                              keyboardType="decimal-pad"
                              returnKeyType="next"
                              enterKeyHint="next"
                              blurOnSubmit={false}
                              onSubmitEditing={() => fatInputRef.current?.focus()}
                              value={modalRateStr}
                              onChangeText={(val) => setModalRateStr(sanitizeDecimalInput(val))}
                              placeholder="0.00"
                              placeholderTextColor={colors.textMuted}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Quality Inputs: Fat (%) | SNF (%) */}
                    <View style={[styles.gridLineRow, { marginTop: 12 }]}>
                      <View style={[styles.gridColField, { flex: 1 }]}>
                        <Text style={[styles.gridFieldLabel, { color: colors.textMedium }]}>
                          Fat (%) {pricingSettings?.autoCalculate === true ? '*' : ''}
                        </Text>
                        <View style={[styles.inputBoxNormal, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                          <FlaskConical size={16} color="#D97706" style={{ marginRight: 6 }} />
                          <TextInput
                            ref={fatInputRef}
                            style={[styles.gridInputText, { color: colors.text }]}
                            keyboardType="decimal-pad"
                            returnKeyType="next"
                            enterKeyHint="next"
                            blurOnSubmit={false}
                            onSubmitEditing={() => snfInputRef.current?.focus()}
                            value={modalFatStr}
                            onChangeText={(val) => handleModalFatSnfChange(val, modalSnfStr)}
                            placeholder="0.0"
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>
                      </View>

                      <View style={[styles.gridColField, { flex: 1 }]}>
                        <Text style={[styles.gridFieldLabel, { color: colors.textMedium }]}>
                          SNF (%) {pricingSettings?.autoCalculate === true ? '*' : ''}
                        </Text>
                        <View style={[styles.inputBoxNormal, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                          <FlaskConical size={16} color="#059669" style={{ marginRight: 6 }} />
                          <TextInput
                            ref={snfInputRef}
                            style={[styles.gridInputText, { color: colors.text }]}
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                            enterKeyHint="done"
                            onSubmitEditing={handleSaveModalEntry}
                            value={modalSnfStr}
                            onChangeText={(val) => handleModalFatSnfChange(modalFatStr, val)}
                            placeholder="0.0"
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Auto-Calculated Customer Rate Display Card (When Auto Rate is Enabled) */}
                    {pricingSettings?.autoCalculate === true && (
                      <View style={[styles.autoRateCard, isDark && { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderColor: 'rgba(34, 197, 94, 0.3)' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Lock size={13} color={isDark ? '#4ADE80' : '#166534'} />
                            <Text style={[styles.autoRateTitle, isDark && { color: '#4ADE80' }]}>Calculated Rate</Text>
                          </View>
                          <View style={[styles.autoRateBadge, isDark && { backgroundColor: 'rgba(22, 163, 74, 0.25)', borderColor: 'rgba(34, 197, 94, 0.5)' }]}>
                            <Text style={[styles.autoRateBadgeText, isDark && { color: '#4ADE80' }]}>Auto Locked</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
                          <Text style={[styles.autoRateValue, isDark && { color: '#4ADE80' }]}>
                            {computedSellerRate > 0 ? `₹${computedSellerRate.toFixed(2)}` : '—'}
                            <Text style={[styles.autoRateUnit, isDark && { color: '#86EFAC' }]}> / Litre</Text>
                          </Text>
                          <Text style={[styles.autoRateSub, isDark && { color: '#86EFAC' }]}>
                            Base: ₹{pricingSettings?.customerRate.baseRate || 52}/L
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                )}

                {/* Total Calculated Amount Banner */}
                <View style={[styles.totalValueBanner, isDark && { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.3)' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.totalValueLabel, isDark && { color: '#34D399' }]}>
                      {isBuyer ? 'Total Purchase Value (₹)' : 'Total Milk Value (₹)'}
                    </Text>
                    <Text style={[styles.totalValueSub, isDark && { color: '#A7F3D0' }]}>
                      {calcModalQty > 0 && activeRate > 0
                        ? `${calcModalQty.toFixed(1)} L × ₹${activeRate.toFixed(2)}`
                        : (isBuyer ? 'Enter Quantity' : 'Enter Quantity, Fat & SNF')}
                    </Text>
                  </View>
                  <Text style={[styles.amountDisplayGreenText, isDark && { color: '#34D399' }]}>
                    {formatCurrency(calcModalTotal)}
                  </Text>
                </View>

                {/* Row 4: Notes Input (Optional) */}
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.gridFieldLabel, { color: colors.textMedium }]}>Notes (Optional)</Text>
                  <View style={[styles.inputBoxNormal, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <TextInput
                      style={[styles.gridInputText, { width: '100%', color: colors.text }]}
                      placeholder="Notes (Optional)"
                      placeholderTextColor={colors.textMuted}
                      value={modalNotes}
                      onChangeText={setModalNotes}
                    />
                  </View>
                </View>

                {/* Row 5: Action Buttons */}
                <View style={styles.modalActionButtonsRow}>
                  <TouchableOpacity style={[styles.cancelModalBtn, { backgroundColor: colors.cardSecondary }]} onPress={() => setShowMilkModal(false)}>
                    <Text style={[styles.cancelModalBtnText, { color: colors.textMedium }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveModalEntry} activeOpacity={0.8}>
                    <CheckCircle2 size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveModalBtnText}>{modalExistingCollId ? 'Update Entry' : 'Save Entry'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <CheckCircle2 size={18} color="#4ADE80" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Alert Pop up */}
      <ConfirmationModal
        visible={modalAlert.visible}
        title={modalAlert.title}
        message={modalAlert.message}
        type={modalAlert.type || 'warning'}
        singleButton={true}
        confirmText="OK"
        onCancel={() => setModalAlert((prev) => ({ ...prev, visible: false }))}
        onConfirm={() => setModalAlert((prev) => ({ ...prev, visible: false }))}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || (confirmModal.confirmStyle === 'destructive' ? 'danger' : 'info')}
        confirmText={confirmModal.confirmText || 'Confirm'}
        cancelText={confirmModal.cancelText || 'Cancel'}
        confirmStyle={confirmModal.confirmStyle}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
        onConfirm={() => {
          setConfirmModal((prev) => ({ ...prev, visible: false }));
          confirmModal.onConfirm();
        }}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
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
    fontSize: 12,
    color: ThemeColors.textMedium,
  },
  scrollContent: {
    padding: 14,
    paddingTop: 8,
    paddingBottom: 40,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  arrowBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.textMuted,
    width: 36,
    textAlign: 'center',
  },
  calendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  calendarCellWrapper: {
    width: '14.28%',
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCellBorder: {
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
  },
  dateCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTextBase: {
    fontSize: 13,
    fontWeight: '700',
  },
  // 🟢 Both Shifts Received -> Green
  circleGreen: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  textGreen: {
    color: '#15803D',
  },
  // 🟡 Single Shift Received -> Yellow/Amber with (M or E)
  circleYellow: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  textYellow: {
    color: '#B45309',
  },
  shiftMarkText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#B45309',
    marginTop: -3,
  },
  // 🔴 No Milk Received -> Light Red
  circleRed: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  textRed: {
    color: '#DC2626',
  },
  // 🔒 Future Date -> Muted Gray
  circleFuture: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textFuture: {
    color: '#94A3B8',
  },
  selectedCircleFill: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  selectedDayNumText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  calendarBottomLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBadgeGreen: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  legendBadgeYellow: {
    width: 16,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendBadgeTextYellow: {
    fontSize: 8,
    fontWeight: '900',
    color: '#B45309',
  },
  legendBadgeRed: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  legendBadgeGray: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  legendLabelMuted: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  headerShareBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  monthSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    padding: 16,
    marginTop: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  monthSummaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  monthSummarySub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  monthSummaryAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  statementBreakdownGrid: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  breakdownBox: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: ThemeColors.textMuted,
    textTransform: 'uppercase',
  },
  breakdownBoxVal: {
    fontSize: 13,
    fontWeight: '800',
    color: ThemeColors.textDark,
    marginTop: 2,
  },
  whatsAppShareFullBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 10,
    height: 40,
  },
  whatsAppShareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  modalShiftTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalShiftTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  modalShiftTabActiveMorning: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  modalShiftTabActiveEvening: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  modalShiftTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalShiftTabTextActiveMorning: {
    color: '#B45309',
  },
  modalShiftTabTextActiveEvening: {
    color: '#4338CA',
  },
  tabRecordedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginLeft: 6,
  },
  addRecordLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addRecordLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  tableCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: '#FFF',
  },
  tableRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderTopWidth: 1.5,
    borderTopColor: '#E2E8F0',
  },
  // Column sizing
  colShift: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colQty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  colFat: {
    flex: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  colSnf: {
    flex: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  colRate: {
    flex: 1.05,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  colAmount: {
    flex: 1.5,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 4,
  },
  // Shift Badges
  shiftBadgeM: {
    width: 22,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  shiftBadgeTextM: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B45309',
  },
  shiftBadgeE: {
    width: 22,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  shiftBadgeTextE: {
    fontSize: 11,
    fontWeight: '900',
    color: '#4338CA',
  },
  // Cell text styles
  tableCellBold: {
    fontSize: 11.5,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  tableCellText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: ThemeColors.textDark,
  },
  tableCellGreen: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
  },
  tableCellMuted: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  tableTotalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableTotalQty: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  tableTotalAmount: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#059669',
  },
  emptyTableFooter: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 11,
    color: ThemeColors.textMuted,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  milkModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  modalHeaderSub: {
    fontSize: 12.5,
    color: ThemeColors.textMedium,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  shiftTabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  shiftTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  shiftTabBtnActiveMorning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  shiftTabBtnActiveEvening: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  shiftTabText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: ThemeColors.textMedium,
  },
  shiftTabTextActiveMorning: {
    color: '#B45309',
    fontWeight: '800',
  },
  shiftTabTextActiveEvening: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  gridLineRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridColField: {
    justifyContent: 'center',
  },
  gridFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.textMuted,
    marginBottom: 4,
  },
  inputBoxHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputBoxNormal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: ThemeColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  gridInputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.textDark,
  },
  gridInputTextBold: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  autoRateCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  autoRateTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  autoRateBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  autoRateBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  autoRateValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15803D',
  },
  autoRateUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  autoRateSub: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  totalValueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  totalValueLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  totalValueSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  amountDisplayGreenText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#065F46',
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textMedium,
  },
  saveModalBtn: {
    flex: 2,
    flexDirection: 'row',
    height: 46,
    borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginRight: 8,
  },
  deleteModalBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
});
