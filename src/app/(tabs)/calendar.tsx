import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CheckCircle2,
  Lock,
  Edit2,
  Truck,
  FileText,
  CheckCircle,
} from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { formatCurrency, sanitizeDecimalInput, calculateMilkRate } from '@/utils/calculator';
import { getCalculatedRate, calculateFatSnfRate } from '@/utils/rate-chart';
import { shareWhatsAppMilkSlip, isValidIndianPhone } from '@/utils/slip-generator';
import { Customer, MilkCollection, MilkDispatch } from '@/types';
import ConfirmationModal from '@/components/ConfirmationModal';
import {
  RegisterDateHeader,
  RegisterShiftTabs,
  RegisterFilterBar,
  RegisterCustomerCard,
  RegisterCalendarModal,
  RegisterMilkEntryModal,
  RegisterDispatchModal,
  RegisterDispatchReceiptModal,
} from '@/components/register';

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const _now = new Date();
const TODAY_YEAR = _now.getFullYear();
const TODAY_MONTH_INDEX = _now.getMonth();
const TODAY_DAY = _now.getDate();

export default function CalendarRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const {
    customers,
    collections,
    dispatches,
    pricingSettings,
    addMilkCollection,
    addMilkDispatch,
    getDispatchByDateSession,
    getDailyProfit,
  } = useRepository();

  const getAutoSession = (): 'MORNING' | 'EVENING' => {
    return new Date().getHours() >= 15 ? 'EVENING' : 'MORNING';
  };

  const [selectedYear, setSelectedYear] = useState<number>(TODAY_YEAR);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(TODAY_MONTH_INDEX);
  const [selectedDay, setSelectedDay] = useState<number>(TODAY_DAY);
  const [selectedSession, setSelectedSession] = useState<'MORNING' | 'EVENING'>(getAutoSession());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RECORDED'>('ALL');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'SELLER' | 'BUYER'>('ALL');
  const [sentSlipMap, setSentSlipMap] = useState<{ [key: string]: boolean }>({});
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem('@doodh_khata_sent_slips').then((val) => {
      if (val) {
        try {
          setSentSlipMap(JSON.parse(val));
        } catch (e) {
          console.log('Error reading sent slips:', e);
        }
      }
    });
  }, []);

  const markSlipAsSent = async (slipKey: string) => {
    setSentSlipMap((prev) => {
      const next = { ...prev, [slipKey]: true };
      AsyncStorage.setItem('@doodh_khata_sent_slips', JSON.stringify(next)).catch(() => { });
      return next;
    });
  };

  // Milk Entry Modal State
  const [showMilkModal, setShowMilkModal] = useState<boolean>(false);
  const [modalCustomer, setModalCustomer] = useState<Customer | null>(null);
  const [modalQuantityStr, setModalQuantityStr] = useState('');
  const [modalFatStr, setModalFatStr] = useState('');
  const [modalSnfStr, setModalSnfStr] = useState('');
  const [modalRateStr, setModalRateStr] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalExistingCollId, setModalExistingCollId] = useState<string | null>(null);

  // Input refs for auto-focus navigation
  const quantityInputRef = useRef<TextInput>(null);
  const rateInputRef = useRef<TextInput>(null);
  const fatInputRef = useRef<TextInput>(null);
  const snfInputRef = useRef<TextInput>(null);

  // Dispatch Modal & Receipt State
  const [showDispatchModal, setShowDispatchModal] = useState<boolean>(false);
  const [showDispatchReceipt, setShowDispatchReceipt] = useState<boolean>(false);
  const [dispatchFatStr, setDispatchFatStr] = useState('');
  const [dispatchSnfStr, setDispatchSnfStr] = useState('');
  const [dispatchRateStr, setDispatchRateStr] = useState('');
  const dispatchFatRef = useRef<TextInput>(null);
  const dispatchSnfRef = useRef<TextInput>(null);

  // Confirmation & Alert Pop up State
  const [modalAlert, setModalAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
    confirmText?: string;
    cancelText?: string;
    singleButton?: boolean;
    confirmStyle?: 'primary' | 'destructive' | 'success';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'warning') => {
    setModalAlert({
      visible: true,
      title,
      message,
      type,
      singleButton: true,
      confirmText: 'OK',
    });
  };

  const showConfirm = (opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmStyle?: 'primary' | 'destructive' | 'success';
    type?: 'info' | 'warning' | 'danger' | 'success';
    onConfirm: () => void;
  }) => {
    setModalAlert({
      visible: true,
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || 'Confirm',
      cancelText: opts.cancelText || 'Cancel',
      confirmStyle: opts.confirmStyle || 'primary',
      type: opts.type || (opts.confirmStyle === 'destructive' ? 'danger' : 'warning'),
      singleButton: false,
      onConfirm: opts.onConfirm,
    });
  };

  // Custom Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 2800);
  };

  // Selected Date Formatting & Boundaries
  const daysInSelectedMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
  const selectedDayNum = Math.min(selectedDay, daysInSelectedMonth);
  const selectedMonthStr = String(selectedMonthIndex + 1).padStart(2, '0');
  const selectedDayStr = String(selectedDayNum).padStart(2, '0');
  const selectedDateStr = `${selectedYear}-${selectedMonthStr}-${selectedDayStr}`;

  const isToday =
    selectedYear === TODAY_YEAR &&
    selectedMonthIndex === TODAY_MONTH_INDEX &&
    selectedDayNum === TODAY_DAY;

  const isFutureDate =
    selectedYear > TODAY_YEAR ||
    (selectedYear === TODAY_YEAR && selectedMonthIndex > TODAY_MONTH_INDEX) ||
    (selectedYear === TODAY_YEAR && selectedMonthIndex === TODAY_MONTH_INDEX && selectedDayNum > TODAY_DAY);

  const isPastDate = !isToday && !isFutureDate;

  // Active Customers filtering
  const activeCustomers = customers.filter((c) => c && c.status === 'ACTIVE');
  const activeSellers = activeCustomers.filter((c) => c.customer_type !== 'BUYER');
  const activeBuyers = activeCustomers.filter((c) => c.customer_type === 'BUYER');

  // Collections derivation for this date & session
  const dayCollections = collections.filter(
    (c) => c && c.date === selectedDateStr && c.session === selectedSession
  );

  // Filter logic for displayed list
  const filteredCustomers = activeCustomers.filter((cust) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = cust.name.toLowerCase().includes(q);
      const matchVillage = cust.village?.toLowerCase().includes(q);
      if (!matchName && !matchVillage) return false;
    }

    if (customerTypeFilter === 'SELLER' && cust.customer_type === 'BUYER') return false;
    if (customerTypeFilter === 'BUYER' && cust.customer_type !== 'BUYER') return false;

    const hasEntry = dayCollections.some((c) => String(c.customer_id) === String(cust.id));

    // Do not show customers who had not yet joined on this date (unless an entry already exists for them)
    const custJoiningDate = (cust.created_at || '').split('T')[0];
    if (custJoiningDate && custJoiningDate > selectedDateStr && !hasEntry) {
      return false;
    }

    if (statusFilter === 'RECORDED' && !hasEntry) return false;
    if (statusFilter === 'PENDING' && hasEntry) return false;

    return true;
  });

  // Deduplicated calculation for shift summary
  const sessionCollectionsMap = new Map<string, MilkCollection>();
  const morningMap = new Map<string, MilkCollection>();
  const eveningMap = new Map<string, MilkCollection>();

  collections.forEach((c) => {
    if (c && c.date === selectedDateStr) {
      if (c.session === 'MORNING') {
        morningMap.set(String(c.customer_id), c);
      } else if (c.session === 'EVENING') {
        eveningMap.set(String(c.customer_id), c);
      }
      if (c.session === selectedSession) {
        sessionCollectionsMap.set(String(c.customer_id), c);
      }
    }
  });

  let morningLitres = 0;
  morningMap.forEach((c) => {
    const cust = customers.find((cu) => String(cu.id) === String(c.customer_id));
    if (cust?.customer_type !== 'BUYER') {
      morningLitres += (c.quantity || 0);
    }
  });

  let eveningLitres = 0;
  eveningMap.forEach((c) => {
    const cust = customers.find((cu) => String(cu.id) === String(c.customer_id));
    if (cust?.customer_type !== 'BUYER') {
      eveningLitres += (c.quantity || 0);
    }
  });

  const uniqueSessionCollections = Array.from(sessionCollectionsMap.values());

  let sellerRecordedCount = 0;
  let buyerRecordedCount = 0;
  let totalSellerLitres = 0;
  let totalBuyerLitres = 0;
  let currentSessionLitres = 0;
  let currentSessionValue = 0;

  uniqueSessionCollections.forEach((c) => {
    const cust = customers.find((cu) => String(cu.id) === String(c.customer_id));
    const isBuyer = cust?.customer_type === 'BUYER';
    if (isBuyer) {
      buyerRecordedCount += 1;
      totalBuyerLitres += (c.quantity || 0);
    } else {
      sellerRecordedCount += 1;
      totalSellerLitres += (c.quantity || 0);
      currentSessionValue += (c.amount || 0);
    }
  });

  currentSessionLitres = Math.max(0, totalSellerLitres - totalBuyerLitres);
  const recordedPercentage = activeSellers.length > 0 ? Math.round((sellerRecordedCount / activeSellers.length) * 100) : 0;

  const sessionRecordedSet = new Set(
    dayCollections.map((c) => String(c.customer_id))
  );
  const relevantFilteredCustomers = activeCustomers.filter((cust) => {
    const isBuyer = cust.customer_type === 'BUYER';
    if (customerTypeFilter === 'SELLER' && isBuyer) return false;
    if (customerTypeFilter === 'BUYER' && !isBuyer) return false;
    return true;
  });
  const pendingCount = relevantFilteredCustomers.filter((c) => !sessionRecordedSet.has(String(c.id))).length;
  const recordedCount = relevantFilteredCustomers.filter((c) => sessionRecordedSet.has(String(c.id))).length;

  const currentShiftDispatch = getDispatchByDateSession(selectedDateStr, selectedSession);
  const isShiftClosed = !!currentShiftDispatch && currentShiftDispatch.status === 'CLOSED';

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedYear > TODAY_YEAR || (selectedYear === TODAY_YEAR && selectedMonthIndex >= TODAY_MONTH_INDEX)) {
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

  const handlePrevDay = () => {
    if (selectedDayNum > 1) {
      setSelectedDay((prev) => prev - 1);
    } else {
      if (selectedMonthIndex > 0) {
        const prevMonthIndex = selectedMonthIndex - 1;
        const daysInPrev = new Date(selectedYear, prevMonthIndex + 1, 0).getDate();
        setSelectedMonthIndex(prevMonthIndex);
        setSelectedDay(daysInPrev);
      } else {
        const prevYear = selectedYear - 1;
        const daysInPrev = new Date(prevYear, 12, 0).getDate();
        setSelectedYear(prevYear);
        setSelectedMonthIndex(11);
        setSelectedDay(daysInPrev);
      }
    }
  };

  const handleNextDay = () => {
    if (isToday || isFutureDate) {
      showAlert('Future Date', 'Cannot navigate past today.');
      return;
    }
    if (selectedDayNum < daysInSelectedMonth) {
      setSelectedDay((prev) => prev + 1);
    } else {
      if (selectedMonthIndex < 11) {
        setSelectedMonthIndex((prev) => prev + 1);
        setSelectedDay(1);
      } else {
        setSelectedYear((prev) => prev + 1);
        setSelectedMonthIndex(0);
        setSelectedDay(1);
      }
    }
  };

  // Milk Modal Handlers
  const handleOpenAddEntryModal = (cust: Customer) => {
    if (isFutureDate) {
      showAlert('Future Date', 'Milk collections cannot be recorded for future dates.');
      return;
    }

    const existingEntry = dayCollections.find((c) => String(c.customer_id) === String(cust.id));

    // 1. If milk record has already been saved for this customer for this shift, lock editing in daily register
    if (existingEntry) {
      showConfirm({
        title: 'Record Locked',
        message: `Milk collection for ${cust.name} (${selectedSession === 'MORNING' ? 'Morning' : 'Evening'}) has already been recorded and locked.\n\nEditing can only be done from the Customer Milk History Calendar.`,
        confirmText: 'Open Milk Calendar',
        cancelText: 'Close',
        confirmStyle: 'primary',
        type: 'info',
        onConfirm: () => {
          router.push(`/customer/calendar/${cust.id}`);
        },
      });
      return;
    }

    // 2. If on a past date, restrict direct additions from daily register
    if (isPastDate) {
      showConfirm({
        title: 'Past Date Locked',
        message: `Milk entries for past dates can only be recorded or edited from the Customer Milk History Calendar.`,
        confirmText: 'Open Milk Calendar',
        cancelText: 'Close',
        confirmStyle: 'primary',
        type: 'info',
        onConfirm: () => {
          router.push(`/customer/calendar/${cust.id}`);
        },
      });
      return;
    }

    // 3. New entry on current day:
    setModalCustomer(cust);
    setModalNotes('');
    setModalExistingCollId(null);
    setModalQuantityStr('');

    if (cust.customer_type === 'BUYER') {
      const defaultRate = cust.default_sale_rate || pricingSettings?.customerRate?.baseRate || 60;
      setModalFatStr('');
      setModalSnfStr('');
      setModalRateStr(String(defaultRate));
    } else {
      setModalFatStr('');
      setModalSnfStr('');
      setModalRateStr(pricingSettings?.autoCalculate === true ? '0' : '');
    }

    setShowMilkModal(true);
    setTimeout(() => {
      quantityInputRef.current?.focus();
    }, 150);
  };

  const handleFatSnfChange = (newFatStr: string, newSnfStr: string) => {
    const sanitizedFat = sanitizeDecimalInput(newFatStr);
    const sanitizedSnf = sanitizeDecimalInput(newSnfStr);
    setModalFatStr(sanitizedFat);
    setModalSnfStr(sanitizedSnf);

    if (pricingSettings?.autoCalculate === true && modalCustomer?.customer_type !== 'BUYER') {
      const fatNum = parseFloat(sanitizedFat);
      const snfNum = parseFloat(sanitizedSnf);
      if (!isNaN(fatNum) && fatNum > 0 && !isNaN(snfNum) && snfNum > 0) {
        const autoRate = calculateFatSnfRate(fatNum, snfNum, pricingSettings?.customerRate);
        if (autoRate > 0) {
          setModalRateStr(String(autoRate));
        }
      }
    }
  };

  const handleSaveModalEntry = () => {
    if (!modalCustomer) return;

    const custJoiningDate = (modalCustomer.created_at || '').split('T')[0];
    if (custJoiningDate && selectedDateStr < custJoiningDate) {
      showAlert('Before Joining Date', `Cannot record milk for ${modalCustomer.name} before their joining date (${custJoiningDate}).`);
      return;
    }

    const qtyNum = parseFloat(modalQuantityStr);
    if (!qtyNum || qtyNum <= 0) {
      showAlert('Invalid Quantity', 'Please enter a valid milk quantity in liters.');
      return;
    }

    const isBuyer = modalCustomer.customer_type === 'BUYER';
    const isAutoCalculate = pricingSettings?.autoCalculate === true;
    let fatNum = 0;
    let snfNum = 0;
    let rateNum = 0;

    if (isBuyer) {
      rateNum = parseFloat(modalRateStr);
      if (!rateNum || rateNum <= 0) {
        showAlert('Invalid Rate', 'Please enter a valid rate per liter for buyer.');
        return;
      }
    } else if (isAutoCalculate) {
      fatNum = parseFloat(modalFatStr);
      snfNum = parseFloat(modalSnfStr);

      if (!fatNum || fatNum <= 0) {
        showAlert('Missing Fat %', 'Please enter Fat % for this supplier.');
        return;
      }
      if (!snfNum || snfNum <= 0) {
        showAlert('Missing SNF %', 'Please enter SNF % for this supplier.');
        return;
      }

      rateNum = calculateFatSnfRate(fatNum, snfNum, pricingSettings?.customerRate);
      if (!rateNum || rateNum <= 0) {
        showAlert('Calculation Error', 'Could not calculate milk rate from Fat/SNF.');
        return;
      }
    } else {
      // Manual Rate Entry Mode (Default when autoCalculate is disabled)
      rateNum = parseFloat(modalRateStr);
      if (!rateNum || rateNum <= 0) {
        showAlert('Missing Rate', 'Please enter milk rate (₹/L) for this supplier.');
        return;
      }
      fatNum = parseFloat(modalFatStr) || 0;
      snfNum = parseFloat(modalSnfStr) || 0;
    }

    const finalAmount = Math.round(qtyNum * rateNum * 100) / 100;

    showConfirm({
      title: 'Save Milk Record?',
      message: `Save ${qtyNum} L milk for ${modalCustomer.name} (₹${finalAmount.toFixed(2)})?`,
      confirmText: 'Save',
      cancelText: 'Cancel',
      confirmStyle: 'primary',
      type: 'info',
      onConfirm: async () => {
        await addMilkCollection({
          customer_id: modalCustomer.id,
          customer_name: modalCustomer.name,
          village: modalCustomer.village,
          date: selectedDateStr,
          session: selectedSession,
          entry_type: isBuyer ? 'SALE' : 'PURCHASE',
          quantity: qtyNum,
          fat: fatNum,
          snf: snfNum,
          rate: rateNum,
          amount: finalAmount,
          notes: modalNotes,
        });

        setShowMilkModal(false);
        showToast(`✅ Saved: ${qtyNum} L for ${modalCustomer.name}`);
      },
    });
  };

  const handleSendShiftWhatsAppSlip = async (entry: MilkCollection, cust: Customer) => {
    const slipKey = `${entry.id || `${entry.date}_${entry.session}_${entry.customer_id}`}`;
    if (sentSlipMap[slipKey]) {
      showAlert('Already Sent', 'Slip already sent today.', 'info');
      return;
    }

    const phone = cust.phone?.trim();
    if (!phone) {
      showAlert('Missing Phone', 'Phone number not provided.');
      return;
    }
    if (!isValidIndianPhone(phone)) {
      showAlert('Invalid Phone', '10-digit mobile number required.');
      return;
    }

    const res = await shareWhatsAppMilkSlip(entry, phone);
    if (res.success) {
      await markSlipAsSent(slipKey);
      showToast(`WhatsApp slip sent to ${cust.name} 📱`);
    } else {
      showAlert('WhatsApp Error', res.error || 'Failed to open WhatsApp.', 'danger');
    }
  };

  // Dispatch Action Handlers
  const handleOpenDispatchModal = () => {
    if (isShiftClosed && currentShiftDispatch) {
      setDispatchFatStr(currentShiftDispatch.fat > 0 ? String(currentShiftDispatch.fat) : '');
      setDispatchSnfStr(currentShiftDispatch.snf > 0 ? String(currentShiftDispatch.snf) : '');
      setShowDispatchModal(true);
      setTimeout(() => {
        dispatchFatRef.current?.focus();
      }, 150);
      return;
    }

    if (totalSellerLitres === 0) {
      const otherSession: 'MORNING' | 'EVENING' = selectedSession === 'MORNING' ? 'EVENING' : 'MORNING';
      const otherShiftDispatch = getDispatchByDateSession(selectedDateStr, otherSession);
      const otherSessionLitres = otherSession === 'MORNING' ? morningLitres : eveningLitres;

      if (otherSessionLitres > 0 || otherShiftDispatch) {
        setSelectedSession(otherSession);
        if (otherShiftDispatch && otherShiftDispatch.status === 'CLOSED') {
          setDispatchFatStr(otherShiftDispatch.fat > 0 ? String(otherShiftDispatch.fat) : '');
          setDispatchSnfStr(otherShiftDispatch.snf > 0 ? String(otherShiftDispatch.snf) : '');
          setDispatchRateStr((otherShiftDispatch.rate ?? 0) > 0 ? String(otherShiftDispatch.rate) : '');
        } else {
          setDispatchFatStr('');
          setDispatchSnfStr('');
          setDispatchRateStr(pricingSettings?.dispatchRate?.baseRate ? String(pricingSettings.dispatchRate.baseRate) : '');
        }
        setShowDispatchModal(true);
        setTimeout(() => {
          dispatchFatRef.current?.focus();
        }, 150);
        return;
      }

      showAlert('No Milk', 'No milk recorded for this shift.');
      return;
    }

    setDispatchFatStr('');
    setDispatchSnfStr('');
    setDispatchRateStr(pricingSettings?.dispatchRate?.baseRate ? String(pricingSettings.dispatchRate.baseRate) : '');
    setShowDispatchModal(true);
    setTimeout(() => {
      dispatchFatRef.current?.focus();
    }, 150);
  };

  const handleDispatchFatSnfChange = (newFatStr: string, newSnfStr: string) => {
    const sanitizedFat = sanitizeDecimalInput(newFatStr);
    const sanitizedSnf = sanitizeDecimalInput(newSnfStr);
    setDispatchFatStr(sanitizedFat);
    setDispatchSnfStr(sanitizedSnf);
  };

  const handleConfirmDispatch = () => {
    const fatVal = parseFloat(dispatchFatStr) || 0;
    const snfVal = parseFloat(dispatchSnfStr) || 0;
    const isAutoCalculate = pricingSettings?.autoCalculate === true;
    let plantRate = 0;

    if (isAutoCalculate) {
      if (!fatVal || fatVal <= 0) {
        showAlert('Missing Fat %', 'Please enter tested Average Fat % for this dispatch.');
        return;
      }
      if (!snfVal || snfVal <= 0) {
        showAlert('Missing SNF %', 'Please enter tested Average SNF % for this dispatch.');
        return;
      }
      plantRate = calculateFatSnfRate(fatVal, snfVal, pricingSettings?.dispatchRate);
    } else {
      plantRate = parseFloat(dispatchRateStr) || 0;
    }

    if (isShiftClosed && currentShiftDispatch) {
      executeSaveDispatch(fatVal, snfVal, plantRate);
      return;
    }

    const rateSummary = plantRate > 0 ? ` at ₹${plantRate.toFixed(2)}/L` : (fatVal > 0 && snfVal > 0 ? ` (${fatVal}% Fat & ${snfVal}% SNF)` : ' (Rate Pending)');
    showConfirm({
      title: 'Dispatch & Close?',
      message: `Close ${selectedSession === 'MORNING' ? 'Morning' : 'Evening'} shift and dispatch ${currentSessionLitres.toFixed(1)} L${rateSummary}?`,
      confirmText: 'Dispatch & Close',
      confirmStyle: 'primary',
      onConfirm: () => {
        executeSaveDispatch(fatVal, snfVal, plantRate);
      },
    });
  };

  const executeSaveDispatch = async (fatVal: number, snfVal: number, calculatedPlantRate: number) => {
    const totalAmount = calculatedPlantRate > 0 ? Math.round(currentSessionLitres * calculatedPlantRate * 100) / 100 : 0;

    await addMilkDispatch({
      date: selectedDateStr,
      session: selectedSession,
      total_collected_litres: totalSellerLitres,
      local_sales_litres: totalBuyerLitres,
      dispatched_litres: currentSessionLitres,
      fat: fatVal,
      snf: snfVal,
      rate: calculatedPlantRate,
      amount: totalAmount,
      status: 'CLOSED',
    });

    setShowDispatchModal(false);
    showToast(isShiftClosed ? '✅ Plant dispatch quality updated!' : '✅ Shift dispatched & closed successfully!');
  };

  const handleShareDispatchSlipWhatsApp = async () => {
    if (!currentShiftDispatch) return;

    const slipText =
      `🥛 *DOODH KHATA DAIRY DISPATCH VOUCHER*\n` +
      `📅 *Date*: ${currentShiftDispatch.date} (${currentShiftDispatch.session})\n` +
      `🕒 *Dispatched*: ${currentShiftDispatch.dispatched_at ? new Date(currentShiftDispatch.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}\n` +
      `--------------------------------\n` +
      `🥛 *Total Milk Collected*: ${currentShiftDispatch.total_collected_litres.toFixed(1)} L\n` +
      (currentShiftDispatch.local_sales_litres > 0 ? `🛒 *Local Retail Sales*: -${currentShiftDispatch.local_sales_litres.toFixed(1)} L\n` : '') +
      `🚚 *Net Dispatched Milk*: *${currentShiftDispatch.dispatched_litres.toFixed(1)} Litres*\n` +
      `--------------------------------\n` +
      `🧪 *Avg Fat*: ${currentShiftDispatch.fat}%\n` +
      `🧪 *Avg SNF*: ${currentShiftDispatch.snf}%\n` +
      `💰 *Plant Rate*: ₹${currentShiftDispatch.rate != null ? currentShiftDispatch.rate.toFixed(2) : '0.00'} / L\n` +
      `💵 *Total Dispatch Value*: *₹${currentShiftDispatch.amount ? currentShiftDispatch.amount.toFixed(2) : '0.00'}*\n` +
      `--------------------------------\n` +
      `🔒 *Status*: Shift Closed & Verified\n` +
      `Generated by Doodh Khata App`;

    try {
      await Share.share({
        message: slipText,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header with Safe Area Insets */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top + 8, 16), backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Daily Milk Register</Text>
          <Text style={[styles.pageSub, { color: colors.textMedium }]}>Notebook register & shift records</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date Control Header Card */}
        <RegisterDateHeader
          selectedYear={selectedYear}
          selectedMonthIndex={selectedMonthIndex}
          selectedDayNum={selectedDayNum}
          isToday={isToday}
          isFutureDate={isFutureDate}
          monthNamesShort={MONTH_NAMES_SHORT}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onJumpToToday={() => {
            setSelectedYear(TODAY_YEAR);
            setSelectedMonthIndex(TODAY_MONTH_INDEX);
            setSelectedDay(TODAY_DAY);
          }}
          onOpenCalendarModal={() => setShowCalendarModal(true)}
        />

        {/* Compact Shift Toggle Tabs */}
        <RegisterShiftTabs
          selectedSession={selectedSession}
          morningLitres={morningLitres}
          eveningLitres={eveningLitres}
          onSelectSession={setSelectedSession}
        />

        {/* Search & Filter Bar */}
        <RegisterFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          customerTypeFilter={customerTypeFilter}
          setCustomerTypeFilter={setCustomerTypeFilter}
          totalActiveCount={activeCustomers.length}
          totalSellerCount={activeSellers.length}
          totalBuyerCount={activeBuyers.length}
          pendingCount={pendingCount}
          recordedCount={recordedCount}
        />

        {/* Customer Register Rows */}
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 32 }}>🥛</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No farmers found</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>No farmers match your search or filter.</Text>
          </View>
        ) : (
          filteredCustomers.map((cust) => {
            const entry = dayCollections.find((c) => String(c.customer_id) === String(cust.id));
            const isDone = !!entry;
            return (
              <RegisterCustomerCard
                key={cust.id}
                customer={cust}
                entry={entry}
                isDone={isDone}
                isPastDate={isPastDate}
                sentSlipMap={sentSlipMap}
                onPressCard={handleOpenAddEntryModal}
                onSendWhatsAppSlip={handleSendShiftWhatsAppSlip}
              />
            );
          })
        )}

        {/* Register Bottom Summary Card */}
        <View style={[styles.registerTotalCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.totalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>📊</Text>
              <Text style={[styles.totalHeaderTitle, isDark && { color: colors.primary }]}>
                {selectedSession === 'MORNING' ? 'Morning' : 'Evening'} Shift Register Total
              </Text>
            </View>
            <View style={styles.recordedCountBadge}>
              <Text style={styles.recordedCountBadgeText}>
                {sellerRecordedCount}/{activeSellers.length}
              </Text>
            </View>
          </View>

          <View style={styles.totalMetricsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.totalMetricLabel, isDark && { color: colors.textMedium }]}>Total Milk Supplied</Text>
              <Text style={[styles.totalMetricValLitre, isDark && { color: colors.text }]}>{totalSellerLitres.toFixed(1)} L</Text>
            </View>

            <View style={[styles.metricVerticalDivider, isDark && { backgroundColor: colors.border }]} />

            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.totalMetricLabel, isDark && { color: colors.textMedium }]}>Total Milk Value</Text>
              <Text style={styles.totalMetricValMoney}>{formatCurrency(currentSessionValue)}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.totalProgressBarBg, isDark && { backgroundColor: colors.cardSecondary }]}>
            <View style={[styles.totalProgressBarFill, { width: `${recordedPercentage}%` }]} />
          </View>
        </View>

        {/* Supervisor Milk Dispatch & Shift Closing Card */}
        {isShiftClosed && currentShiftDispatch ? (
          <View style={[styles.dispatchClosedCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.dispatchClosedHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.closedBadgeIcon}>
                  <CheckCircle size={18} color="#059669" />
                </View>
                <View>
                  <Text style={[styles.dispatchClosedTitle, { color: colors.text }]}>Shift Dispatched & Closed</Text>
                  <Text style={[styles.dispatchClosedSub, { color: colors.textMedium }]}>
                    {selectedSession === 'MORNING' ? 'Morning' : 'Evening'} • {currentShiftDispatch.dispatched_at ? new Date(currentShiftDispatch.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Closed'}
                  </Text>
                </View>
              </View>
              <View style={styles.closedStatusPill}>
                <Lock size={12} color="#047857" style={{ marginRight: 4 }} />
                <Text style={styles.closedStatusPillText}>CLOSED</Text>
              </View>
            </View>

            {/* Metrics Grid */}
            <View style={styles.dispatchMetricsGrid}>
              <View style={[styles.dispatchMetricBox, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                <Text style={[styles.dispatchMetricLabel, { color: colors.textMuted }]}>Dispatched</Text>
                <Text style={[styles.dispatchMetricVal, { color: colors.text }]}>{currentShiftDispatch.dispatched_litres.toFixed(1)} L</Text>
                <Text style={[styles.dispatchMetricSub, { color: colors.textMuted }]}>Net in Cans</Text>
              </View>

              <View style={[styles.dispatchMetricBox, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                <Text style={[styles.dispatchMetricLabel, { color: colors.textMuted }]}>Avg Fat/SNF</Text>
                <Text style={[styles.dispatchMetricVal, { color: colors.text }]}>{currentShiftDispatch.fat}% / {currentShiftDispatch.snf}%</Text>
                <Text style={[styles.dispatchMetricSub, { color: colors.textMuted }]}>From all cans</Text>
              </View>

              <View style={[styles.dispatchMetricBox, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                <Text style={[styles.dispatchMetricLabel, { color: colors.textMuted }]}>Rate / Litre</Text>
                <Text style={[styles.dispatchMetricVal, !currentShiftDispatch.rate && { color: '#D97706', fontSize: 13 }, currentShiftDispatch.rate ? { color: colors.text } : null]}>
                  {currentShiftDispatch.rate && currentShiftDispatch.rate > 0
                    ? `₹${currentShiftDispatch.rate.toFixed(2)}`
                    : 'Rate Pending ⏳'}
                </Text>
                <Text style={[styles.dispatchMetricSub, { color: colors.textMuted }]}>From Supervisor</Text>
              </View>

              <View style={[styles.dispatchMetricBox, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                <Text style={[styles.dispatchMetricLabel, { color: colors.textMuted }]}>Total Value</Text>
                <Text style={[styles.dispatchMetricVal, { color: currentShiftDispatch.amount ? '#059669' : '#D97706', fontSize: currentShiftDispatch.amount ? 16 : 13 }]}>
                  {currentShiftDispatch.amount && currentShiftDispatch.amount > 0
                    ? formatCurrency(currentShiftDispatch.amount)
                    : 'Pending'}
                </Text>
                <Text style={[styles.dispatchMetricSub, { color: colors.textMuted }]}>Dispatch Amount</Text>
              </View>
            </View>

            {/* Action Buttons: Edit Quality, Open Dispatch Calendar */}
            <View style={styles.dispatchClosedActions}>
              <TouchableOpacity
                style={[styles.editQualityBtn, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                onPress={handleOpenDispatchModal}
                activeOpacity={0.8}
              >
                <Edit2 size={15} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.editQualityBtnText}>Edit Quality</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewSlipBtn, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                onPress={() => router.push('/dispatch/calendar')}
                activeOpacity={0.8}
              >
                <FileText size={16} color="#059669" style={{ marginRight: 6 }} />
                <Text style={styles.viewSlipBtnText}>Calendar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.dispatchPromptCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.truckIconCircle}>
                  <Truck size={20} color="#2563EB" />
                </View>
                <View>
                  <Text style={[styles.dispatchPromptTitle, { color: colors.text }]}>Milk Dispatch & Shift Close</Text>
                  <Text style={[styles.dispatchPromptSub, { color: colors.textMedium }]}>
                    Ready to record plant milk dispatch
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Can Calculation Banner */}
            <View style={[styles.dispatchCanCalcBanner, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dispatchCanCalcLabel, { color: colors.textMuted }]}>Net Milk in Cans to Dispatch</Text>
                <Text style={[styles.dispatchCanCalcValue, { color: colors.text }]}>{currentSessionLitres.toFixed(1)} Litres</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.dispatchCanCalcSub, { color: colors.textMedium }]}>
                  Collected: {totalSellerLitres.toFixed(1)} L
                </Text>
                {totalBuyerLitres > 0 && (
                  <Text style={[styles.dispatchCanCalcSub, { color: '#D97706' }]}>
                    - Local Sales: {totalBuyerLitres.toFixed(1)} L
                  </Text>
                )}
              </View>
            </View>

            {/* Dispatch Button */}
            <TouchableOpacity
              style={[
                styles.dispatchActionBtn,
                totalSellerLitres === 0 && styles.dispatchActionBtnDisabled,
              ]}
              onPress={handleOpenDispatchModal}
              disabled={totalSellerLitres === 0}
              activeOpacity={0.8}
            >
              <Truck size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.dispatchActionBtnText}>
                {totalSellerLitres === 0
                  ? 'Record Milk to Dispatch'
                  : 'Dispatch Milk & Close Shift'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FULL MONTH CALENDAR POPUP MODAL */}
      <RegisterCalendarModal
        visible={showCalendarModal}
        selectedYear={selectedYear}
        selectedMonthIndex={selectedMonthIndex}
        selectedDayNum={selectedDayNum}
        todayYear={TODAY_YEAR}
        todayMonthIndex={TODAY_MONTH_INDEX}
        todayDay={TODAY_DAY}
        monthNamesFull={MONTH_NAMES_FULL}
        collections={collections}
        onClose={() => setShowCalendarModal(false)}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onSelectToday={() => {
          setSelectedYear(TODAY_YEAR);
          setSelectedMonthIndex(TODAY_MONTH_INDEX);
          setSelectedDay(TODAY_DAY);
          setShowCalendarModal(false);
        }}
        onSelectDay={(dayNum) => {
          setSelectedDay(dayNum);
          setShowCalendarModal(false);
        }}
      />

      {/* MILK ENTRY POPUP MODAL */}
      <RegisterMilkEntryModal
        visible={showMilkModal}
        customer={modalCustomer}
        selectedDateStr={selectedDateStr}
        selectedSession={selectedSession}
        existingCollId={modalExistingCollId}
        quantityStr={modalQuantityStr}
        setQuantityStr={setModalQuantityStr}
        fatStr={modalFatStr}
        snfStr={modalSnfStr}
        rateStr={modalRateStr}
        setRateStr={setModalRateStr}
        autoCalculate={pricingSettings?.autoCalculate === true}
        notes={modalNotes}
        setNotes={setModalNotes}
        quantityInputRef={quantityInputRef}
        rateInputRef={rateInputRef}
        fatInputRef={fatInputRef}
        snfInputRef={snfInputRef}
        onFatSnfChange={handleFatSnfChange}
        onClose={() => setShowMilkModal(false)}
        onSave={handleSaveModalEntry}
      />

      {/* SUPERVISOR MILK DISPATCH MODAL */}
      <RegisterDispatchModal
        visible={showDispatchModal}
        isShiftClosed={isShiftClosed}
        selectedSession={selectedSession}
        selectedDateStr={selectedDateStr}
        currentSessionLitres={currentSessionLitres}
        totalSellerLitres={totalSellerLitres}
        totalBuyerLitres={totalBuyerLitres}
        dispatchFatStr={dispatchFatStr}
        dispatchSnfStr={dispatchSnfStr}
        dispatchRateStr={dispatchRateStr}
        setDispatchRateStr={setDispatchRateStr}
        autoCalculate={pricingSettings?.autoCalculate === true}
        dispatchFatRef={dispatchFatRef}
        dispatchSnfRef={dispatchSnfRef}
        onDispatchFatSnfChange={handleDispatchFatSnfChange}
        onClose={() => setShowDispatchModal(false)}
        onConfirmDispatch={handleConfirmDispatch}
      />

      {/* DISPATCH RECEIPT / SLIP MODAL */}
      <RegisterDispatchReceiptModal
        visible={showDispatchReceipt}
        dispatch={currentShiftDispatch || null}
        onClose={() => setShowDispatchReceipt(false)}
        onShareWhatsApp={handleShareDispatchSlipWhatsApp}
      />

      {/* Bottom Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <CheckCircle2 size={18} color="#4ADE80" style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* Alert / Confirmation Modal */}
      <ConfirmationModal
        visible={modalAlert.visible}
        title={modalAlert.title}
        message={modalAlert.message}
        type={modalAlert.type || 'warning'}
        singleButton={modalAlert.singleButton}
        confirmText={modalAlert.confirmText}
        cancelText={modalAlert.cancelText}
        confirmStyle={modalAlert.confirmStyle}
        onCancel={() => setModalAlert((prev) => ({ ...prev, visible: false }))}
        onConfirm={() => {
          setModalAlert((prev) => ({ ...prev, visible: false }));
          if (modalAlert.onConfirm) modalAlert.onConfirm();
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
    paddingBottom: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  pageSub: {
    fontSize: 12,
    color: ThemeColors.textMedium,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  registerTotalCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 14,
    marginBottom: 20,
  },
  totalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  recordedCountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  recordedCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  totalMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  totalMetricValLitre: {
    fontSize: 20,
    fontWeight: '900',
    color: '#065F46',
    marginTop: 2,
  },
  totalMetricValMoney: {
    fontSize: 20,
    fontWeight: '900',
    color: '#16A34A',
    marginTop: 2,
  },
  metricVerticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#A7F3D0',
    marginHorizontal: 12,
  },
  totalProgressBarBg: {
    height: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  totalProgressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  dispatchClosedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  dispatchClosedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closedBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dispatchClosedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#14532D',
  },
  dispatchClosedSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 1,
  },
  closedStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  closedStatusPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#14532D',
    letterSpacing: 0.5,
  },
  dispatchMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  dispatchMetricBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  dispatchMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ThemeColors.textMuted,
  },
  dispatchMetricVal: {
    fontSize: 16,
    fontWeight: '900',
    color: ThemeColors.textDark,
    marginTop: 2,
  },
  dispatchMetricSub: {
    fontSize: 10,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  dispatchClosedActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  viewSlipBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 42,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewSlipBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  editQualityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flex: 1,
  },
  editQualityBtnText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 13,
  },
  dispatchPromptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  truckIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dispatchPromptTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  dispatchPromptSub: {
    fontSize: 11,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  dispatchCanCalcBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  dispatchCanCalcLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  dispatchCanCalcValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0284C7',
    marginTop: 1,
  },
  dispatchCanCalcSub: {
    fontSize: 11,
    fontWeight: '600',
    color: ThemeColors.textMedium,
  },
  dispatchActionBtn: {
    flexDirection: 'row',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dispatchActionBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  dispatchActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
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
});
