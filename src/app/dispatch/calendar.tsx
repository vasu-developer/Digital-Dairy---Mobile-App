import React, { useState, useRef } from 'react';
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
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Droplet,
  FlaskConical,
  IndianRupee,
  Edit2,
  CheckCircle2,
  Clock,
  FileText,
  Share2,
  X,
  Lock,
  Calendar as CalendarIcon,
  AlertCircle,
  Plus,
  Truck,
} from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { formatCurrency, sanitizeDecimalInput } from '@/utils/calculator';
import { calculateFatSnfRate } from '@/utils/rate-chart';
import { MilkDispatch } from '@/types';
import DispatchTable from './components/DispatchTable';
import ConfirmationModal from '@/components/ConfirmationModal';
import DayProfitCard from '@/components/profit/DayProfitCard';
import MonthProfitSummaryCard from '@/components/profit/MonthProfitSummaryCard';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const _now = new Date();
const TODAY_YEAR = _now.getFullYear();
const TODAY_MONTH_INDEX = _now.getMonth();
const TODAY_DAY = _now.getDate();

export default function DispatchCalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const {
    dispatches,
    updateMilkDispatch,
    collections,
    addMilkDispatch,
    pricingSettings,
    getDailyProfit,
    getMonthlyProfit,
  } = useRepository();

  const [selectedYear, setSelectedYear] = useState<number>(TODAY_YEAR);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(TODAY_MONTH_INDEX);
  const [selectedDay, setSelectedDay] = useState<number>(TODAY_DAY);
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'STATEMENT'>('CALENDAR');

  // Quality & Pricing Modal State (Fat & SNF edit, Rate auto-calculated)
  const [showRateModal, setShowRateModal] = useState<boolean>(false);
  const [selectedDispatch, setSelectedDispatch] = useState<MilkDispatch | null>(null);
  const [modalFatStr, setModalFatStr] = useState<string>('');
  const [modalSnfStr, setModalSnfStr] = useState<string>('');
  const modalFatInputRef = useRef<TextInput>(null);
  const modalSnfInputRef = useRef<TextInput>(null);

  // Manual Dispatch Modal State
  const [showAddDispatchModal, setShowAddDispatchModal] = useState<boolean>(false);
  const [addDispatchSession, setAddDispatchSession] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [addDispatchQtyStr, setAddDispatchQtyStr] = useState<string>('');
  const [addDispatchFat, setAddDispatchFat] = useState<string>('');
  const [addDispatchSnf, setAddDispatchSnf] = useState<string>('');
  const [addDispatchRate, setAddDispatchRate] = useState<string>('');
  const [addDispatchCollected, setAddDispatchCollected] = useState<number>(0);
  const addQtyRef = useRef<TextInput>(null);
  const addFatRef = useRef<TextInput>(null);
  const addSnfRef = useRef<TextInput>(null);

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
    confirmStyle?: 'primary' | 'destructive';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    confirmStyle?: 'primary' | 'destructive';
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      visible: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      confirmStyle: options.confirmStyle || 'primary',
      onConfirm: options.onConfirm,
    });
  };

  // Month calculations
  const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const firstDayOfMonth = new Date(selectedYear, selectedMonthIndex, 1).getDay();
  // Monday = 0, Sunday = 6
  const startingDayOffset = (firstDayOfMonth + 6) % 7;

  const selectedMonthStr = String(selectedMonthIndex + 1).padStart(2, '0');
  const monthPrefix = `${selectedYear}-${selectedMonthStr}`;
  const clampedSelectedDay = Math.min(selectedDay, daysInMonth);
  const selectedDateStr = `${selectedYear}-${selectedMonthStr}-${String(clampedSelectedDay).padStart(2, '0')}`;

  // Filter dispatches for the selected month
  const monthDispatches = (dispatches || [])
    .filter((d) => d && d.date && d.date.startsWith(monthPrefix))
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.session === 'EVENING' ? -1 : 1;
    });

  // Calculate monthly metrics
  let totalLitres = 0;
  let totalMonthlyMoney = 0;
  let shiftsWithRate = 0;
  let pendingRatesCount = 0;

  monthDispatches.forEach((d) => {
    const qty = d.dispatched_litres || 0;
    totalLitres += qty;

    if (d.rate && d.rate > 0 && d.amount && d.amount > 0) {
      totalMonthlyMoney += d.amount;
      shiftsWithRate += 1;
    } else if (d.rate && d.rate > 0) {
      const calculatedAmt = Math.round(qty * d.rate * 100) / 100;
      totalMonthlyMoney += calculatedAmt;
      shiftsWithRate += 1;
    } else {
      pendingRatesCount += 1;
    }
  });

  // Navigation check
  const isNextDisabled =
    selectedYear > TODAY_YEAR ||
    (selectedYear === TODAY_YEAR && selectedMonthIndex >= TODAY_MONTH_INDEX);

  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonthIndex((m) => m - 1);
    }
    setSelectedDay(1);
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
    setSelectedDay(1);
  };

  const handleResetToToday = () => {
    setSelectedYear(TODAY_YEAR);
    setSelectedMonthIndex(TODAY_MONTH_INDEX);
    setSelectedDay(TODAY_DAY);
  };

  // Dispatches for the selected date
  const dayMorningDispatch = dispatches.find(
    (d) => d && d.date === selectedDateStr && d.session === 'MORNING'
  );
  const dayEveningDispatch = dispatches.find(
    (d) => d && d.date === selectedDateStr && d.session === 'EVENING'
  );

  // Collections for the selected date
  const morningDayCollections = (collections || []).filter(
    (c) => c && c.date === selectedDateStr && c.session === 'MORNING'
  );
  const morningCollectedLitres = morningDayCollections.reduce((sum, c) => sum + (c.quantity || 0), 0);

  const eveningDayCollections = (collections || []).filter(
    (c) => c && c.date === selectedDateStr && c.session === 'EVENING'
  );
  const eveningCollectedLitres = eveningDayCollections.reduce((sum, c) => sum + (c.quantity || 0), 0);

  const isSelectedDateToday =
    selectedYear === TODAY_YEAR &&
    selectedMonthIndex === TODAY_MONTH_INDEX &&
    clampedSelectedDay === TODAY_DAY;

  const isSelectedDateFuture =
    selectedYear > TODAY_YEAR ||
    (selectedYear === TODAY_YEAR && selectedMonthIndex > TODAY_MONTH_INDEX) ||
    (selectedYear === TODAY_YEAR && selectedMonthIndex === TODAY_MONTH_INDEX && clampedSelectedDay > TODAY_DAY);

  // Dynamic calculations for Quality Modal
  const modalFatNum = parseFloat(modalFatStr) || 0;
  const modalSnfNum = parseFloat(modalSnfStr) || 0;
  const modalAutoRate =
    modalFatNum > 0 && modalSnfNum > 0
      ? calculateFatSnfRate(modalFatNum, modalSnfNum, pricingSettings?.dispatchRate)
      : 0;
  const modalTotalAmount = selectedDispatch
    ? Math.round(selectedDispatch.dispatched_litres * modalAutoRate * 100) / 100
    : 0;

  // Rate/Quality Modal Handlers
  const handleOpenRateModal = (dispatch: MilkDispatch) => {
    setSelectedDispatch(dispatch);
    setModalFatStr(dispatch.fat > 0 ? String(dispatch.fat) : '');
    setModalSnfStr(dispatch.snf > 0 ? String(dispatch.snf) : '');
    setShowRateModal(true);
    setTimeout(() => {
      modalFatInputRef.current?.focus();
    }, 150);
  };

  const handleSaveRate = async () => {
    if (!selectedDispatch) return;

    const fatNum = parseFloat(modalFatStr);
    const snfNum = parseFloat(modalSnfStr);
    if (isNaN(fatNum) || fatNum <= 0 || isNaN(snfNum) || snfNum <= 0) {
      showAlert('Invalid Quality', 'Please enter valid Fat % and SNF % values.');
      return;
    }

    const calculatedRate = calculateFatSnfRate(fatNum, snfNum, pricingSettings?.dispatchRate);
    const calculatedAmount = Math.round(selectedDispatch.dispatched_litres * calculatedRate * 100) / 100;

    try {
      await updateMilkDispatch({
        ...selectedDispatch,
        fat: fatNum,
        snf: snfNum,
        rate: calculatedRate,
        amount: calculatedAmount,
      });

      setShowRateModal(false);
      showAlert('Quality & Rate Saved', `Plant rate set to ₹${calculatedRate.toFixed(2)}/L via Fat & SNF formula.`, 'success');
    } catch (err: any) {
      showAlert('Error', err?.message || 'Failed to update rate.', 'danger');
    }
  };

  const handleAddDispatchFatSnfChange = (newFat: string, newSnf: string) => {
    const cleanFat = sanitizeDecimalInput(newFat);
    const cleanSnf = sanitizeDecimalInput(newSnf);
    setAddDispatchFat(cleanFat);
    setAddDispatchSnf(cleanSnf);

    const f = parseFloat(cleanFat);
    const s = parseFloat(cleanSnf);
    if (!isNaN(f) && f > 0 && !isNaN(s) && s > 0) {
      const autoRate = calculateFatSnfRate(f, s, pricingSettings?.dispatchRate);
      setAddDispatchRate(String(autoRate));
    } else {
      setAddDispatchRate('');
    }
  };

  const populateDispatchModalForSession = (session: 'MORNING' | 'EVENING') => {
    setAddDispatchSession(session);

    // Find existing dispatch for this date & session
    const existing = dispatches.find(
      (d) => d && d.date === selectedDateStr && d.session === session
    );

    // Calculate total collected liters for this day and session
    const dayCollections = (collections || []).filter(
      (c) => c && c.date === selectedDateStr && c.session === session
    );
    const totalColl = dayCollections.reduce((sum, c) => sum + (c.quantity || 0), 0);
    setAddDispatchCollected(totalColl);

    if (existing) {
      const q = existing.dispatched_litres > 0 ? existing.dispatched_litres : totalColl;
      setAddDispatchQtyStr(q > 0 ? String(q) : '');
      const fStr = existing.fat > 0 ? String(existing.fat) : '';
      const sStr = existing.snf > 0 ? String(existing.snf) : '';
      setAddDispatchFat(fStr);
      setAddDispatchSnf(sStr);
      const fNum = parseFloat(fStr);
      const sNum = parseFloat(sStr);
      if (!isNaN(fNum) && fNum > 0 && !isNaN(sNum) && sNum > 0) {
        setAddDispatchRate(String(calculateFatSnfRate(fNum, sNum, pricingSettings?.dispatchRate)));
      } else {
        setAddDispatchRate('');
      }
    } else {
      setAddDispatchQtyStr(totalColl > 0 ? String(totalColl) : '');
      // If the user already typed fat & snf in the modal, keep them and recalculate rate
      const fNum = parseFloat(addDispatchFat);
      const sNum = parseFloat(addDispatchSnf);
      if (!isNaN(fNum) && fNum > 0 && !isNaN(sNum) && sNum > 0) {
        setAddDispatchRate(String(calculateFatSnfRate(fNum, sNum, pricingSettings?.dispatchRate)));
      }
    }
  };

  const handleOpenAddDispatch = (session: 'MORNING' | 'EVENING') => {
    populateDispatchModalForSession(session);
    setShowAddDispatchModal(true);
    setTimeout(() => {
      addFatRef.current?.focus();
    }, 150);
  };

  const handleSelectDispatchSession = (session: 'MORNING' | 'EVENING') => {
    populateDispatchModalForSession(session);
  };

  const handleSmartOpenDispatch = () => {
    // 1. If both shifts are already dispatched:
    if (dayMorningDispatch && dayEveningDispatch) {
      if (!dayMorningDispatch.rate || dayMorningDispatch.rate <= 0) {
        handleOpenRateModal(dayMorningDispatch);
        return;
      }
      if (!dayEveningDispatch.rate || dayEveningDispatch.rate <= 0) {
        handleOpenRateModal(dayEveningDispatch);
        return;
      }
      handleOpenRateModal(dayEveningDispatch);
      return;
    }

    // 2. If Morning is already dispatched, but Evening is not:
    if (dayMorningDispatch && !dayEveningDispatch) {
      handleOpenAddDispatch('EVENING');
      return;
    }

    // 3. If Evening is already dispatched, but Morning is not:
    if (!dayMorningDispatch && dayEveningDispatch) {
      handleOpenAddDispatch('MORNING');
      return;
    }

    // 4. If neither shift is dispatched yet:
    if (eveningCollectedLitres > 0 && morningCollectedLitres === 0) {
      handleOpenAddDispatch('EVENING');
      return;
    }
    if (morningCollectedLitres > 0 && eveningCollectedLitres === 0) {
      handleOpenAddDispatch('MORNING');
      return;
    }
    if (isSelectedDateToday && new Date().getHours() >= 14 && eveningCollectedLitres > 0) {
      handleOpenAddDispatch('EVENING');
      return;
    }

    handleOpenAddDispatch('MORNING');
  };

  const handleSaveManualDispatch = async () => {
    const qtyNum = parseFloat(addDispatchQtyStr);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showAlert('Invalid Quantity', 'Please enter valid dispatched litres greater than 0.');
      return;
    }

    const fat = parseFloat(addDispatchFat);
    const snf = parseFloat(addDispatchSnf);

    if (isNaN(fat) || fat <= 0 || isNaN(snf) || snf <= 0) {
      showAlert('Invalid Values', 'Enter valid Fat % and SNF % to calculate plant rate.');
      return;
    }

    const finalRate = calculateFatSnfRate(fat, snf, pricingSettings?.dispatchRate);
    const finalAmount = Math.round(qtyNum * finalRate * 100) / 100;

    try {
      await addMilkDispatch({
        date: selectedDateStr,
        session: addDispatchSession,
        total_collected_litres: addDispatchCollected,
        local_sales_litres: 0,
        dispatched_litres: qtyNum,
        fat,
        snf,
        rate: finalRate,
        amount: finalAmount,
        status: 'CLOSED',
      });
      setShowAddDispatchModal(false);
      showAlert(
        'Dispatch Saved',
        `${addDispatchSession === 'MORNING' ? 'Morning' : 'Evening'} dispatch saved for ${selectedDateStr} with plant rate ₹${finalRate.toFixed(2)}/L (${formatCurrency(finalAmount)}).`,
        'success'
      );
    } catch (err: any) {
      showAlert('Error', err?.message || 'Failed to save dispatch.', 'danger');
    }
  };

  const handleShareStatement = async () => {
    if (monthDispatches.length === 0) {
      showAlert('No Records', 'No dispatches for this month.');
      return;
    }

    const monthLabel = `${MONTH_NAMES[selectedMonthIndex]} ${selectedYear}`;
    let message = `🥛 *DOODH KHATA - MILK DISPATCH STATEMENT* 🥛\n`;
    message += `📅 *Month*: ${monthLabel}\n`;
    message += `--------------------------------\n`;
    message += `📦 *Total Milk Dispatched*: ${totalLitres.toFixed(1)} L\n`;
    message += `💰 *Total Monthly Money*: ${formatCurrency(totalMonthlyMoney)}\n`;
    message += `📊 *Total Shifts*: ${monthDispatches.length} (${shiftsWithRate} rates entered)\n`;
    if (pendingRatesCount > 0) {
      message += `⚠️ *Pending Rates*: ${pendingRatesCount} shifts\n`;
    }
    message += `--------------------------------\n\n`;

    message += `*Daily Shift Breakdown:*\n`;
    monthDispatches.forEach((d) => {
      const shiftIcon = d.session === 'MORNING' ? '☀️ Morning' : '🌙 Evening';
      const rateText = d.rate && d.rate > 0 ? `₹${d.rate.toFixed(2)}/L` : 'Pending Rate';
      const amtText = d.amount && d.amount > 0 ? formatCurrency(d.amount) : '₹0';
      message += `${d.date} (${shiftIcon}): ${d.dispatched_litres.toFixed(1)} L | Fat ${d.fat}% | SNF ${d.snf}% | ${rateText} = ${amtText}\n`;
    });

    message += `\n_Generated by Doodh Khata App_`;

    try {
      await Share.share({ message });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: Math.max(insets.top + 8, 16) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.cardSecondary }]} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Milk Dispatch Register</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Plant dispatch records & rates</Text>
          </View>
        </View>

        {/* Share Action */}
        <TouchableOpacity
          style={[styles.shareHeaderBtn, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}
          onPress={handleShareStatement}
          activeOpacity={0.8}
        >
          <Share2 size={18} color={isDark ? '#34D399' : '#059669'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Month Navigation Card */}
        <View style={[styles.monthNavCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.monthNavBtn, { backgroundColor: colors.cardSecondary }]} onPress={handlePrevMonth}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.monthNavTitle, { color: colors.text }]}>
              {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
            </Text>
            {(selectedYear !== TODAY_YEAR || selectedMonthIndex !== TODAY_MONTH_INDEX || clampedSelectedDay !== TODAY_DAY) ? (
              <TouchableOpacity style={[styles.todayPill, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]} onPress={handleResetToToday}>
                <Text style={[styles.todayPillText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>Back to Today</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.monthNavSub, { color: colors.textMuted }]}>{monthDispatches.length} shifts recorded</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.monthNavBtn, { backgroundColor: colors.cardSecondary }, isNextDisabled && styles.monthNavBtnDisabled]}
            onPress={handleNextMonth}
            disabled={isNextDisabled}
          >
            <ChevronRight
              size={22}
              color={isNextDisabled ? colors.textMuted : colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Monthly Summary 4-Box Grid */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryLabelRow}>
              <Droplet size={14} color="#2563EB" />
              <Text style={[styles.summaryLabel, { color: colors.textMedium }]}>Total Milk</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{totalLitres.toFixed(1)} L</Text>
            <Text style={[styles.summarySub, { color: colors.textMuted }]}>Dispatched to plant</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryLabelRow}>
              <IndianRupee size={14} color={isDark ? '#34D399' : '#059669'} />
              <Text style={[styles.summaryLabel, { color: colors.textMedium }]}>Dispatch Value</Text>
            </View>
            <Text style={[styles.summaryValue, { color: isDark ? '#34D399' : '#059669' }]}>
              {formatCurrency(totalMonthlyMoney)}
            </Text>
            <Text style={[styles.summarySub, { color: colors.textMuted }]}>
              {shiftsWithRate > 0 ? `${shiftsWithRate} shifts priced` : 'Rates pending'}
            </Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryLabelRow}>
              <FileText size={14} color="#D97706" />
              <Text style={[styles.summaryLabel, { color: colors.textMedium }]}>Total Shifts</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{monthDispatches.length}</Text>
            <Text style={[styles.summarySub, { color: colors.textMuted }]}>Dispatches recorded</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryLabelRow}>
              <Clock size={14} color={pendingRatesCount > 0 ? (isDark ? '#F87171' : '#DC2626') : (isDark ? '#34D399' : '#059669')} />
              <Text style={[styles.summaryLabel, { color: colors.textMedium }]}>Rate Status</Text>
            </View>
            <Text
              style={[
                styles.summaryValue,
                { color: pendingRatesCount > 0 ? (isDark ? '#F87171' : '#DC2626') : (isDark ? '#34D399' : '#059669') },
              ]}
            >
              {pendingRatesCount > 0 ? `${pendingRatesCount} Pending` : 'All Updated'}
            </Text>
            <Text style={[styles.summarySub, { color: colors.textMuted }]}>Plant dispatch rates</Text>
          </View>
        </View>

        {/* View Mode Segmented Bar */}
        <View style={[styles.segmentContainer, { backgroundColor: colors.cardSecondary }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'CALENDAR' && [styles.segmentBtnActive, { backgroundColor: colors.card }]]}
            onPress={() => setActiveTab('CALENDAR')}
          >
            <CalendarIcon
              size={15}
              color={activeTab === 'CALENDAR' ? colors.primary : colors.textMedium}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                { color: colors.textMedium },
                activeTab === 'CALENDAR' && [styles.segmentTextActive, { color: colors.primary }],
              ]}
            >
              Calendar View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'STATEMENT' && [styles.segmentBtnActive, { backgroundColor: colors.card }]]}
            onPress={() => setActiveTab('STATEMENT')}
          >
            <FileText
              size={15}
              color={activeTab === 'STATEMENT' ? colors.primary : colors.textMedium}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                { color: colors.textMedium },
                activeTab === 'STATEMENT' && [styles.segmentTextActive, { color: colors.primary }],
              ]}
            >
              Monthly Statement
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'CALENDAR' ? (
          <>
            {/* Days Header */}
            <View style={styles.weekDaysRow}>
              {WEEKDAYS.map((day, idx) => (
                <Text key={idx} style={[styles.weekDayText, { color: colors.textMuted }]}>{day}</Text>
              ))}
            </View>

            {/* Calendar Card with Integrated Bottom Legend */}
            <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.calendarGrid}>
                {/* Offset Padding */}
                {Array.from({ length: startingDayOffset }).map((_, idx) => (
                  <View key={`empty-${idx}`} style={styles.calendarCellWrapper} />
                ))}

                {/* Day Cells */}
                {calendarDays.map((dayNum) => {
                  const isSelected = dayNum === clampedSelectedDay;
                  const cellDateStr = `${selectedYear}-${selectedMonthStr}-${String(dayNum).padStart(2, '0')}`;

                  const morningD = dispatches.find(
                    (d) => d && d.date === cellDateStr && d.session === 'MORNING'
                  );
                  const eveningD = dispatches.find(
                    (d) => d && d.date === cellDateStr && d.session === 'EVENING'
                  );

                  const hasMorning = !!morningD;
                  const hasEvening = !!eveningD;

                  const hasPendingRate =
                    (hasMorning && (!morningD.rate || morningD.rate <= 0)) ||
                    (hasEvening && (!eveningD.rate || eveningD.rate <= 0));

                  const isCellFuture =
                    selectedYear > TODAY_YEAR ||
                    (selectedYear === TODAY_YEAR && selectedMonthIndex > TODAY_MONTH_INDEX) ||
                    (selectedYear === TODAY_YEAR && selectedMonthIndex === TODAY_MONTH_INDEX && dayNum > TODAY_DAY);

                  const isCellToday =
                    selectedYear === TODAY_YEAR &&
                    selectedMonthIndex === TODAY_MONTH_INDEX &&
                    dayNum === TODAY_DAY;

                  let circleStyle: any = styles.circleRed;
                  let textColorStyle: any = styles.textRed;
                  let shiftMark = '';

                  if (isCellFuture) {
                    circleStyle = [styles.circleFuture, isDark && { backgroundColor: '#1E293B', borderColor: colors.border }];
                    textColorStyle = [styles.textFuture, isDark && { color: '#64748B' }];
                  } else if (hasMorning && hasEvening) {
                    circleStyle = [styles.circleGreen, isDark && { backgroundColor: '#064E3B40', borderColor: '#059669' }];
                    textColorStyle = [styles.textGreen, isDark && { color: '#34D399' }];
                  } else if (hasMorning) {
                    circleStyle = [styles.circleYellow, isDark && { backgroundColor: '#78350F40', borderColor: '#D97706' }];
                    textColorStyle = [styles.textYellow, isDark && { color: '#FBBF24' }];
                    shiftMark = 'M';
                  } else if (hasEvening) {
                    circleStyle = [styles.circleYellow, isDark && { backgroundColor: '#78350F40', borderColor: '#D97706' }];
                    textColorStyle = [styles.textYellow, isDark && { color: '#FBBF24' }];
                    shiftMark = 'E';
                  } else {
                    circleStyle = [styles.circleRed, isDark && { backgroundColor: '#7F1D1D40', borderColor: '#DC2626' }];
                    textColorStyle = [styles.textRed, isDark && { color: '#F87171' }];
                  }

                  return (
                    <TouchableOpacity
                      key={dayNum}
                      style={[
                        styles.calendarCellWrapper,
                        isSelected && [styles.selectedCellBorder, isDark && { backgroundColor: 'rgba(56, 189, 248, 0.2)' }],
                      ]}
                      disabled={isCellFuture}
                      onPress={() => setSelectedDay(dayNum)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.dateCircle,
                          circleStyle,
                          isCellToday && !isSelected && { borderWidth: 2, borderColor: colors.primary },
                          isSelected && styles.selectedCircleFill,
                        ]}
                      >
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
                          <Text style={[styles.shiftMarkText, isDark && { color: '#FBBF24' }, isSelected && { color: '#FFF' }]}>{shiftMark}</Text>
                        ) : isCellToday ? (
                          <Text style={[styles.shiftMarkText, { color: isSelected ? '#FFF' : colors.primary, fontSize: 8 }]}>TODAY</Text>
                        ) : isCellFuture ? (
                          <Lock size={9} color={colors.textMuted} style={{ marginTop: -2 }} />
                        ) : null}

                        {/* Red Dot if Rate is Pending */}
                        {hasPendingRate && !isSelected && (
                          <View style={styles.rateAlertDot} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Integrated Calendar Bottom Legend */}
              <View style={[styles.calendarBottomLegend, { backgroundColor: colors.cardSecondary, borderTopColor: colors.border }]}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBadgeGreen, isDark && { backgroundColor: '#064E3B40', borderColor: '#059669' }]}>
                    <View style={styles.legendDotGreen} />
                  </View>
                  <Text style={[styles.legendLabel, { color: colors.textMedium }]}>Both Shifts</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendBadgeYellow, isDark && { backgroundColor: '#78350F40', borderColor: '#D97706' }]}>
                    <Text style={[styles.legendBadgeTextYellow, isDark && { color: '#FBBF24' }]}>M</Text>
                  </View>
                  <Text style={[styles.legendLabel, { color: colors.textMedium }]}>1 Shift</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendBadgeRed, isDark && { backgroundColor: '#7F1D1D40', borderColor: '#DC2626' }]}>
                    <View style={styles.legendDotRed} />
                  </View>
                  <Text style={[styles.legendLabel, { color: colors.textMedium }]}>No Dispatch</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendBadgeGray, isDark && { backgroundColor: '#334155', borderColor: colors.border }]}>
                    <Lock size={9} color={colors.textMuted} />
                  </View>
                  <Text style={[styles.legendLabelMuted, { color: colors.textMuted }]}>Future</Text>
                </View>
              </View>
            </View>

            {/* Selected Day Dairy Profit Card */}
            <DayProfitCard
              report={getDailyProfit(selectedDateStr)}
              onPressDispatch={handleSmartOpenDispatch}
            />

            {/* SELECTED DAY SECTION: TABLE VIEW LIKE CUSTOMER MILK CALENDAR */}
            <View style={styles.selectedDaySection}>
              <View style={styles.selectedDayHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.selectedDayTitle, { color: colors.text }]}>
                    {clampedSelectedDay} {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
                  </Text>
                  {isSelectedDateToday && (
                    <View style={[styles.todayBadge, isDark && { backgroundColor: '#064E3B40', borderColor: '#059669' }]}>
                      <Text style={[styles.todayBadgeText, isDark && { color: '#34D399' }]}>Today</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Date-Wise Milk Register Table */}
              <DispatchTable
                dayMorningDispatch={dayMorningDispatch}
                dayEveningDispatch={dayEveningDispatch}
                onRowPress={handleOpenRateModal}
                onAddDispatch={handleOpenAddDispatch}
              />
            </View>
          </>
        ) : (
          /* MONTHLY SUMMARY VIEW (FOCUSED ONLY ON TOTALS AS REQUESTED) */
          <View style={styles.statementContainer}>
            <MonthProfitSummaryCard
              report={getMonthlyProfit(`${selectedYear}-${selectedMonthStr}`)}
              monthName={`${MONTH_NAMES[selectedMonthIndex]} ${selectedYear}`}
            />
          </View>
        )}
      </ScrollView>

      {/* UPDATE / ENTER SUPERVISOR QUALITY & AUTO RATE MODAL */}
      <Modal
        visible={showRateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRateModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.rateModalCard, { backgroundColor: colors.modalBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Plant Dispatch Quality</Text>
                  <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                    {selectedDispatch?.session === 'MORNING' ? 'Morning Shift' : 'Evening Shift'} • Enter Fat & SNF
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={() => setShowRateModal(false)}
                >
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Selected Dispatch Summary Banner */}
              {selectedDispatch && (
                <View style={[styles.dispatchSummaryBanner, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[styles.dispatchBannerDate, { color: colors.text }]}>
                      {selectedDispatch.date} (
                      {selectedDispatch.session === 'MORNING' ? 'Morning ☀️' : 'Evening 🌙'})
                    </Text>
                    <Text style={[styles.dispatchBannerQty, { color: colors.primary }]}>
                      {selectedDispatch.dispatched_litres.toFixed(1)} L Dispatched
                    </Text>
                  </View>
                  <Text style={[styles.dispatchBannerQuality, { color: colors.textMedium }]}>
                    Current: Fat {selectedDispatch.fat}% • SNF {selectedDispatch.snf}%
                    {(selectedDispatch.rate ?? 0) > 0 ? ` • ₹${(selectedDispatch.rate ?? 0).toFixed(2)}/L` : ''}
                  </Text>
                </View>
              )}

              {/* Quality Inputs (Fat % & SNF %) */}
              <View style={styles.modalInputRow}>
                <View style={styles.modalInputCol}>
                  <Text style={[styles.modalInputLabel, { color: colors.textMedium }]}>Tested Bulk Fat (%) *</Text>
                  <TextInput
                    ref={modalFatInputRef}
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    keyboardType="numeric"
                    placeholder="0.0"
                    placeholderTextColor={colors.textMuted}
                    value={modalFatStr}
                    onChangeText={(val) => setModalFatStr(sanitizeDecimalInput(val))}
                    returnKeyType="next"
                    onSubmitEditing={() => modalSnfInputRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>

                <View style={styles.modalInputCol}>
                  <Text style={[styles.modalInputLabel, { color: colors.textMedium }]}>Tested Bulk SNF (%) *</Text>
                  <TextInput
                    ref={modalSnfInputRef}
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    keyboardType="numeric"
                    placeholder="0.0"
                    placeholderTextColor={colors.textMuted}
                    value={modalSnfStr}
                    onChangeText={(val) => setModalSnfStr(sanitizeDecimalInput(val))}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveRate}
                  />
                </View>
              </View>

              {/* Auto Calculated Plant Dispatch Rate Card */}
              <View style={[styles.autoRateCard, isDark && { backgroundColor: '#064E3B20', borderColor: '#065F46' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Lock size={13} color={isDark ? '#34D399' : '#166534'} />
                    <Text style={[styles.autoRateTitle, isDark && { color: '#34D399' }]}>Plant Dispatch Rate</Text>
                  </View>
                  <View style={[styles.autoRateBadge, isDark && { backgroundColor: '#064E3B50', borderColor: '#059669' }]}>
                    <Text style={[styles.autoRateBadgeText, isDark && { color: '#34D399' }]}>Auto Calculated</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
                  <Text style={[styles.autoRateValue, isDark && { color: '#34D399' }]}>
                    {modalAutoRate > 0 ? `₹${modalAutoRate.toFixed(2)}` : '—'}
                    <Text style={[styles.autoRateUnit, isDark && { color: '#6EE7B7' }]}> / Litre</Text>
                  </Text>
                  <Text style={[styles.autoRateSub, isDark && { color: '#6EE7B7' }]}>
                    Base: ₹{pricingSettings?.dispatchRate.baseRate || 50}/L
                  </Text>
                </View>
              </View>

              {/* Real-time Calculated Total Amount */}
              <View style={[styles.calcResultBanner, isDark && { backgroundColor: '#0F766E20', borderColor: '#115E59' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.calcResultLabel, { color: colors.textMuted }]}>Total Dispatch Value</Text>
                  <Text style={[styles.calcResultSub, { color: colors.text }]}>
                    {selectedDispatch?.dispatched_litres.toFixed(1) || '0'} L × ₹
                    {modalAutoRate > 0 ? modalAutoRate.toFixed(2) : '0.00'}
                  </Text>
                </View>
                <Text style={[styles.calcResultAmount, isDark && { color: '#34D399' }]}>
                  {formatCurrency(modalTotalAmount)}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={() => setShowRateModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textMedium }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveRate}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalSaveText}>Save Quality</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Manual Dispatch Modal */}
      <Modal visible={showAddDispatchModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddDispatchModal(false)}>
            <TouchableOpacity style={[styles.rateModalCard, { backgroundColor: colors.modalBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]} activeOpacity={1}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleGroup}>
                  <View style={[styles.modalIconContainer, { backgroundColor: isDark ? '#0284C730' : '#E0F2FE' }]}>
                    <Truck size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Plant Milk Dispatch</Text>
                    <Text style={[styles.modalSubTitle, { color: colors.textMuted }]}>
                      {clampedSelectedDay} {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.cardSecondary }]} onPress={() => setShowAddDispatchModal(false)}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {/* Interactive Shift Switcher (Morning / Evening) */}
                <View style={[styles.modalShiftToggleContainer, { backgroundColor: colors.cardSecondary }]}>
                  <TouchableOpacity
                    style={[styles.modalShiftBtn, addDispatchSession === 'MORNING' && [styles.modalShiftBtnActive, { backgroundColor: colors.primary }]]}
                    onPress={() => handleSelectDispatchSession('MORNING')}
                    activeOpacity={0.8}
                  >
                    <Sun size={15} color={addDispatchSession === 'MORNING' ? '#FFFFFF' : '#D97706'} />
                    <Text style={[styles.modalShiftText, { color: addDispatchSession === 'MORNING' ? '#FFFFFF' : colors.text }]}>
                      Morning
                    </Text>
                    <View style={[styles.modalShiftPill, addDispatchSession === 'MORNING' ? styles.modalShiftPillActive : [styles.modalShiftPillInactive, { backgroundColor: colors.background }]]}>
                      <Text style={[styles.modalShiftPillText, addDispatchSession === 'MORNING' ? styles.modalShiftPillTextActive : [styles.modalShiftPillTextInactive, { color: colors.textMedium }]]}>
                        {morningCollectedLitres.toFixed(1)} L
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalShiftBtn, addDispatchSession === 'EVENING' && [styles.modalShiftBtnActive, { backgroundColor: colors.primary }]]}
                    onPress={() => handleSelectDispatchSession('EVENING')}
                    activeOpacity={0.8}
                  >
                    <Moon size={15} color={addDispatchSession === 'EVENING' ? '#FFFFFF' : (isDark ? '#818CF8' : '#4F46E5')} />
                    <Text style={[styles.modalShiftText, { color: addDispatchSession === 'EVENING' ? '#FFFFFF' : colors.text }]}>
                      Evening
                    </Text>
                    <View style={[styles.modalShiftPill, addDispatchSession === 'EVENING' ? styles.modalShiftPillActive : [styles.modalShiftPillInactive, { backgroundColor: colors.background }]]}>
                      <Text style={[styles.modalShiftPillText, addDispatchSession === 'EVENING' ? styles.modalShiftPillTextActive : [styles.modalShiftPillTextInactive, { color: colors.textMedium }]]}>
                        {eveningCollectedLitres.toFixed(1)} L
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Status Notice */}
                {dispatches.find((d) => d && d.date === selectedDateStr && d.session === addDispatchSession) ? (
                  <View style={[styles.modalExistingAlert, isDark && { backgroundColor: '#78350F30', borderColor: '#D97706' }]}>
                    <AlertCircle size={15} color={isDark ? '#FBBF24' : '#D97706'} />
                    <Text style={[styles.modalExistingAlertText, isDark && { color: '#FDE68A' }]}>
                      {addDispatchSession === 'MORNING' ? 'Morning' : 'Evening'} dispatch already recorded (
                      {(dispatches.find((d) => d && d.date === selectedDateStr && d.session === addDispatchSession)?.dispatched_litres || 0).toFixed(1)} L). Saving will update this record.
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.modalInfoBox, isDark && { backgroundColor: '#0C4A6E30', borderColor: '#075985' }]}>
                    <AlertCircle size={15} color={isDark ? '#38BDF8' : '#0284C7'} />
                    <Text style={[styles.modalInfoText, isDark && { color: '#7DD3FC' }]}>
                      {addDispatchSession === 'MORNING' ? 'Morning' : 'Evening'} shift collected milk: <Text style={{ fontWeight: '700' }}>{addDispatchCollected.toFixed(1)} L</Text>
                    </Text>
                  </View>
                )}

                {/* Dispatched Litres Input */}
                <View style={styles.modalInputColFull}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[styles.modalInputLabel, { color: colors.textMedium }]}>Dispatched Litres (L) *</Text>
                    {addDispatchCollected > 0 && (
                      <TouchableOpacity
                        onPress={() => setAddDispatchQtyStr(String(addDispatchCollected))}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.useCollectedText, { color: colors.primary }]}>Use Collected ({addDispatchCollected.toFixed(1)} L)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    ref={addQtyRef}
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    keyboardType="numeric"
                    placeholder="0.0"
                    placeholderTextColor={colors.textMuted}
                    value={addDispatchQtyStr}
                    onChangeText={(v) => setAddDispatchQtyStr(sanitizeDecimalInput(v))}
                    returnKeyType="next"
                    onSubmitEditing={() => addFatRef.current?.focus()}
                  />
                </View>

                {/* Average Fat & Average SNF Inputs Row */}
                <View style={styles.modalInputRow}>
                  {/* Fat Input */}
                  <View style={styles.modalInputCol}>
                    <Text style={[styles.modalInputLabel, { color: colors.textMedium }]}>Average Fat (%) *</Text>
                    <TextInput
                      ref={addFatRef}
                      style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      keyboardType="numeric"
                      placeholder="0.0"
                      placeholderTextColor={colors.textMuted}
                      value={addDispatchFat}
                      onChangeText={(v) => handleAddDispatchFatSnfChange(v, addDispatchSnf)}
                      returnKeyType="next"
                      onSubmitEditing={() => addSnfRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>

                  {/* SNF Input */}
                  <View style={styles.modalInputCol}>
                    <Text style={[styles.modalInputLabel, { color: colors.textMedium }]}>Average SNF (%) *</Text>
                    <TextInput
                      ref={addSnfRef}
                      style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      keyboardType="numeric"
                      placeholder="0.0"
                      placeholderTextColor={colors.textMuted}
                      value={addDispatchSnf}
                      onChangeText={(v) => handleAddDispatchFatSnfChange(addDispatchFat, v)}
                      returnKeyType="done"
                      onSubmitEditing={handleSaveManualDispatch}
                    />
                  </View>
                </View>

                {/* Auto Calculated Rate Card (Read-only) */}
                <View style={[styles.modalCalcCard, isDark && { backgroundColor: '#064E3B20', borderColor: '#065F46' }]}>
                  <View style={styles.modalCalcRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Lock size={13} color={isDark ? '#34D399' : '#166534'} />
                      <Text style={[styles.modalCalcLabel, isDark && { color: '#34D399' }]}>Plant Dispatch Rate</Text>
                    </View>
                    <View style={[styles.formulaBadge, isDark && { backgroundColor: '#064E3B50', borderColor: '#059669' }]}>
                      <Text style={[styles.formulaBadgeText, isDark && { color: '#34D399' }]}>Auto Calculated</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                    <Text style={[styles.modalCalcRate, isDark && { color: '#34D399' }]}>
                      {parseFloat(addDispatchRate) > 0 ? `₹${parseFloat(addDispatchRate).toFixed(2)} / L` : '—'}
                    </Text>
                    <Text style={[styles.modalCalcAmount, isDark && { color: '#34D399' }]}>
                      {parseFloat(addDispatchRate) > 0 && (parseFloat(addDispatchQtyStr) || 0) > 0
                        ? formatCurrency(Math.round((parseFloat(addDispatchQtyStr) || 0) * parseFloat(addDispatchRate) * 100) / 100)
                        : '₹0'}
                    </Text>
                  </View>
                  <Text style={[styles.modalCalcSub, isDark && { color: '#6EE7B7' }]}>
                    Rate calculated strictly from Fat & SNF settings
                  </Text>
                </View>
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={() => setShowAddDispatchModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textMedium }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveManualDispatch}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalSaveText}>
                    {dispatches.find((d) => d && d.date === selectedDateStr && d.session === addDispatchSession)
                      ? 'Update Dispatch'
                      : 'Save Dispatch'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

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
        type={confirmModal.confirmStyle === 'destructive' ? 'danger' : 'warning'}
        confirmText={confirmModal.confirmText}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconContainer: {
    backgroundColor: ThemeColors.primary + '1A',
    padding: 8,
    borderRadius: 8,
  },
  modalSubTitle: {
    fontSize: 13,
    color: ThemeColors.textMuted,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  modalInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 18,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalInputCol: {
    flex: 1,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.textMedium,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: ThemeColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: ThemeColors.textDark,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  headerSub: {
    fontSize: 11,
    color: ThemeColors.textMuted,
  },
  shareHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  monthNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 12,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  monthNavBtnDisabled: {
    opacity: 0.35,
  },
  monthNavTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  monthNavSub: {
    fontSize: 11,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  todayPill: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  summaryBox: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.textMedium,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '900',
    color: ThemeColors.textDark,
    marginTop: 4,
  },
  summarySub: {
    fontSize: 10,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.textMedium,
  },
  segmentTextActive: {
    color: ThemeColors.primary,
    fontWeight: '800',
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
    backgroundColor: '#FFFFFF',
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
    position: 'relative',
  },
  dateTextBase: {
    fontSize: 13,
    fontWeight: '700',
  },
  // 🟢 Both Shifts Dispatched -> Green
  circleGreen: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  textGreen: {
    color: '#15803D',
  },
  // 🟡 Single Shift Dispatched -> Yellow/Amber with (M or E)
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
  // 🔴 No Dispatch -> Light Red
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
  rateAlertDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#FFFFFF',
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
  selectedDaySection: {
    marginTop: 4,
    marginBottom: 20,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  todayBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  selectedDaySummaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 9,
    paddingHorizontal: 8,
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
    paddingVertical: 11,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
  },
  tableRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1.5,
    borderTopColor: '#E2E8F0',
  },
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
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  colAmount: {
    flex: 1.4,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 4,
  },
  shiftBadgeM: {
    width: 22,
    height: 22,
    borderRadius: 6,
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
    borderRadius: 6,
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
  tableCellBold: {
    fontSize: 12,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  tableCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: ThemeColors.textDark,
  },
  tableCellGreen: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  tableCellPending: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 11,
  },
  tableCellMuted: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  tableTotalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableTotalQty: {
    fontSize: 12,
    fontWeight: '900',
    color: ThemeColors.textDark,
  },
  tableTotalAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  enterRateSmallPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  enterRateSmallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  statementContainer: {
    marginBottom: 20,
  },
  statementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    padding: 16,
    marginBottom: 16,
  },
  statementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statementTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  statementMonthSub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  shareBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareBtnSmallText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statementDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  statementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statementRowLabel: {
    fontSize: 13,
    color: ThemeColors.textMedium,
  },
  statementRowVal: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  statementTotalRow: {
    marginTop: 4,
    marginBottom: 0,
  },
  statementTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  statementTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  statementBreakdownHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: ThemeColors.textDark,
    marginBottom: 10,
  },
  statementShiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  statementShiftBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statementShiftBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  statementDateText: {
    fontSize: 13,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  statementTimeText: {
    fontSize: 10,
    color: ThemeColors.textMuted,
  },
  statementQtyText: {
    fontSize: 13,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  statementQualityText: {
    fontSize: 11,
    color: ThemeColors.textMuted,
  },
  statementAmountVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#059669',
  },
  statementRateSub: {
    fontSize: 11,
    color: ThemeColors.textMuted,
  },
  pendingRatePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingRatePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  fullShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  fullShareBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  rateModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  modalSub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  dispatchSummaryBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 12,
  },
  dispatchBannerDate: {
    fontSize: 13,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  dispatchBannerQty: {
    fontSize: 14,
    fontWeight: '900',
    color: ThemeColors.primary,
  },
  dispatchBannerQuality: {
    fontSize: 12,
    color: ThemeColors.textMedium,
  },
  autoRateCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
  modalCalcCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  modalCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalCalcLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  formulaBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  formulaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  modalCalcRate: {
    fontSize: 20,
    fontWeight: '900',
    color: '#15803D',
  },
  modalCalcAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  modalCalcSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 4,
  },
  calcResultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginTop: 14,
  },
  calcResultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.textMuted,
  },
  calcResultSub: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.primaryText,
    marginTop: 2,
  },
  calcResultAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#059669',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.textMedium,
  },
  modalSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: ThemeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ThemeColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalShiftToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  modalShiftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 9,
    gap: 6,
  },
  modalShiftBtnActive: {
    backgroundColor: ThemeColors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalShiftBtnDisabled: {
    opacity: 0.5,
  },
  modalShiftText: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  modalShiftTextActive: {
    color: '#FFFFFF',
  },
  modalShiftPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalShiftPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  modalShiftPillInactive: {
    backgroundColor: '#E2E8F0',
  },
  modalShiftPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalShiftPillTextActive: {
    color: '#FFFFFF',
  },
  modalShiftPillTextInactive: {
    color: ThemeColors.textMedium,
  },
  modalExistingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  modalExistingAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  modalInputColFull: {
    marginBottom: 12,
  },
  useCollectedText: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
});
