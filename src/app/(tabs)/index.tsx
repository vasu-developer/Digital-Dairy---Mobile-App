import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus,
  Users,
  Calendar,
  Sun,
  Moon,
  ChevronRight,
  Droplet,
  IndianRupee,
  CalendarDays,
  Sparkles,
  BookOpen,
  Sprout,
  Truck,
  CheckCircle2,
} from 'lucide-react-native';
import { ThemeColors, isTablet } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { formatCurrency } from '@/utils/calculator';

const farmDayCrop = require('../../../assets/images/farm-day-crop.png');
const farmNightCrop = require('../../../assets/images/farm-night-crop.jpg');
const farmMeadowCrop = require('../../../assets/images/farm-meadow-crop.png');

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const repo = useRepository();
  const customers = repo?.customers || [];
  const collections = repo?.collections || [];
  const getMonthlySummary = repo?.getMonthlySummary;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const currentMonthStr = `${year}-${month}`;
  const currentHour = now.getHours();

  // Accurate, dynamic greeting and shift badge according to local time
  const getTimePeriodInfo = (hour: number) => {
    if (hour >= 5 && hour < 12) {
      // 5:00 AM to 11:59 AM - Morning milk collection shift
      return {
        greeting: 'Good Morning!',
        badgeText: 'Morning Shift ☀️',
        badgeColor: '#059669',
        isNight: false,
        subtitle: "Here's your morning milk collection overview.",
      };
    } else if (hour >= 12 && hour < 17) {
      // 12:00 PM to 4:59 PM - Afternoon
      return {
        greeting: 'Good Afternoon!',
        badgeText: 'Afternoon Overview ☀️',
        badgeColor: '#D97706',
        isNight: false,
        subtitle: "Here's your midday dairy overview.",
      };
    } else if (hour >= 17 && hour < 22) {
      // 5:00 PM to 9:59 PM - Evening milk collection shift
      return {
        greeting: 'Good Evening!',
        badgeText: 'Evening Shift 🌙',
        badgeColor: '#6366F1',
        isNight: true,
        subtitle: "Here's your evening milk collection overview.",
      };
    } else {
      // 10:00 PM to 4:59 AM - Midnight / Late Night (closed for the day)
      return {
        greeting: 'Good Night!',
        badgeText: 'Night Overview 🌙',
        badgeColor: '#818CF8',
        isNight: true,
        subtitle: "Here's your closed daily dairy summary.",
      };
    }
  };

  const timeInfo = getTimePeriodInfo(currentHour);
  const isNight = timeInfo.isNight;
  const greeting = timeInfo.greeting;

  const morningCols = collections.filter((c) => c && c.date === todayStr && c.session === 'MORNING');
  const eveningCols = collections.filter((c) => c && c.date === todayStr && c.session === 'EVENING');

  const calcNetShift = (cols: typeof morningCols) => {
    let netLitres = 0;
    let netValue = 0;
    for (const c of cols) {
      if (c) {
        const cust = repo.getCustomerById(c.customer_id);
        const isBuyer = cust?.customer_type === 'BUYER';
        if (isBuyer) {
          netLitres -= (c.quantity || 0);
        } else {
          netLitres += (c.quantity || 0);
          netValue += (c.amount || 0);
        }
      }
    }
    return { litres: Math.max(0, netLitres), value: netValue };
  };

  const morningStats = calcNetShift(morningCols);
  const eveningStats = calcNetShift(eveningCols);

  const morningLitres = morningStats.litres;
  const morningMilkValue = morningStats.value;

  const eveningLitres = eveningStats.litres;
  const eveningMilkValue = eveningStats.value;

  const activeCount = customers.filter((c) => c && c.status === 'ACTIVE').length;
  const morningDispatch = repo?.getDispatchByDateSession ? repo.getDispatchByDateSession(todayStr, 'MORNING') : null;
  const eveningDispatch = repo?.getDispatchByDateSession ? repo.getDispatchByDateSession(todayStr, 'EVENING') : null;
  const monthlyStats = getMonthlySummary
    ? getMonthlySummary(currentMonthStr)
    : { totalMilk: 0, totalMilkValue: 0, activeCustomers: activeCount, daysRecorded: 0 };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Bar */}
        <View style={[styles.headerRow, { paddingTop: Math.max(insets.top + 8, 16) }]}>
          <View style={styles.brandGroup}>
            <View style={[styles.logoBadge, isDark && { backgroundColor: '#064E3B', borderColor: '#059669' }]}>
              <Text style={styles.logoEmoji}>🐄</Text>
            </View>
            <View>
              <Text style={[styles.brandTitle, { color: colors.text }]}>Digital Dairy</Text>
              <Text style={[styles.brandTagline, { color: colors.textMedium }]}>Simple. Accurate. Everyday.</Text>
            </View>
          </View>

          {/* Top Right Date & Month Badge (No Year) */}
          <View style={[styles.headerDateBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.dateIconWrapper}>
              <CalendarDays size={16} color="#FFF" />
            </View>
            <View style={styles.dateBadgeTextWrapper}>
              <Text style={[styles.dateBadgeDayNumber, { color: isDark ? colors.primary : '#065F46' }]}>{now.getDate()}</Text>
              <View style={styles.dateBadgeSubCol}>
                <Text style={[styles.dateBadgeMonth, { color: isDark ? colors.text : '#047857' }]}>{now.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</Text>
                <Text style={[styles.dateBadgeWeekday, { color: isDark ? colors.textMuted : '#059669' }]}>{now.toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dynamic Day/Night Hero Farm Banner */}
        <ImageBackground
          source={isNight ? farmNightCrop : farmDayCrop}
          style={[styles.heroBannerBackground, isDark && { borderColor: colors.border }]}
          imageStyle={styles.heroBannerImage}
          resizeMode="cover"
        >
          <View style={isNight ? styles.nightOverlay : (isDark ? styles.nightOverlay : styles.dayOverlay)}>
            <View style={[styles.badgePill, isDark && { backgroundColor: colors.card }]}>
              <Sparkles size={12} color={timeInfo.badgeColor} />
              <Text style={[styles.badgeText, (isNight || isDark) && { color: timeInfo.badgeColor }]}>
                {timeInfo.badgeText}
              </Text>
            </View>
            <Text style={[styles.heroGreetingText, (isNight || isDark) && styles.whiteText]}>{greeting}</Text>
            <Text style={[styles.heroSubtitleText, (isNight || isDark) && styles.lightGrayText]}>
              {timeInfo.subtitle}
            </Text>
          </View>
        </ImageBackground>

        {/* Today's Milk Collection Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Milk Collection</Text>
          <TouchableOpacity style={styles.viewAllRow} onPress={() => router.push('/(tabs)/calendar')}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>Daily Register</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Shift Cards Grid */}
        <View style={[styles.shiftCardsGrid, isTablet && styles.tabletShiftGrid]}>
          {/* Morning Shift Card */}
          <TouchableOpacity
            style={[styles.shiftCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/calendar')}
            activeOpacity={0.8}
          >
            <View style={styles.shiftHeader}>
              <View style={styles.shiftIconBox}>
                <Sun size={20} color="#F59E0B" />
                <Text style={[styles.shiftTitle, { color: colors.text }]}>Morning</Text>
              </View>
              {morningDispatch?.status === 'CLOSED' && (
                <View style={styles.dispatchPillSmall}>
                  <Truck size={11} color="#047857" style={{ marginRight: 3 }} />
                </View>
              )}
            </View>

            <View style={styles.shiftMetricRow}>
              <Droplet size={18} color="#2563EB" />
              <View style={styles.metricTextCol}>
                <Text style={[styles.metricVal, { color: colors.text }]}>{morningLitres.toFixed(1)} L</Text>
                <Text style={[styles.metricSub, { color: colors.textMuted }]}>Total Milk</Text>
              </View>
            </View>

            <View style={styles.shiftMetricRow}>
              <IndianRupee size={18} color="#16A34A" />
              <View style={styles.metricTextCol}>
                <Text style={[styles.metricVal, { color: colors.text }]}>{formatCurrency(morningMilkValue)}</Text>
                <Text style={[styles.metricSub, { color: colors.textMuted }]}>Milk Value</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Evening Shift Card */}
          <TouchableOpacity
            style={[styles.shiftCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/calendar')}
            activeOpacity={0.8}
          >
            <View style={styles.shiftHeader}>
              <View style={styles.shiftIconBox}>
                <Moon size={20} color="#6366F1" />
                <Text style={[styles.shiftTitle, { color: colors.text }]}>Evening</Text>
              </View>
              {eveningDispatch?.status === 'CLOSED' && (
                <View style={styles.dispatchPillSmall}>
                  <Truck size={11} color="#047857" style={{ marginRight: 3 }} />
                </View>
              )}
            </View>

            <View style={styles.shiftMetricRow}>
              <Droplet size={18} color="#2563EB" />
              <View style={styles.metricTextCol}>
                <Text style={[styles.metricVal, { color: colors.text }]}>{eveningLitres.toFixed(1)} L</Text>
                <Text style={[styles.metricSub, { color: colors.textMuted }]}>Total Milk</Text>
              </View>
            </View>

            <View style={styles.shiftMetricRow}>
              <IndianRupee size={18} color="#16A34A" />
              <View style={styles.metricTextCol}>
                <Text style={[styles.metricVal, { color: colors.text }]}>{formatCurrency(eveningMilkValue)}</Text>
                <Text style={[styles.metricSub, { color: colors.textMuted }]}>Milk Value</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Action Grid */}
        <View style={[styles.quickActionsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/calendar')}>
            <View style={[styles.actionIconCircle, { backgroundColor: '#10B981' }]}>
              <Plus size={24} color="#FFF" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Add Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/customers')}>
            <View style={[styles.actionIconCircle, { backgroundColor: '#3B82F6' }]}>
              <Users size={22} color="#FFF" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Customers</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/calendar')}>
            <View style={[styles.actionIconCircle, { backgroundColor: '#8B5CF6' }]}>
              <Calendar size={22} color="#FFF" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Register</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/ledger-select')}>
            <View style={[styles.actionIconCircle, { backgroundColor: '#F59E0B' }]}>
              <BookOpen size={22} color="#FFF" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Ledger</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Stats Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>This Month ({now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})</Text>
          <TouchableOpacity style={styles.viewAllRow} onPress={() => router.push('/(tabs)/calendar')}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>Details</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconBadge, { backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' }]}>
              <Droplet size={18} color={isDark ? '#93C5FD' : '#2563EB'} />
            </View>
            <Text style={[styles.statSubText, { color: colors.textMuted }]}>Total Milk</Text>
            <Text style={[styles.statMainText, { color: colors.text }]}>{monthlyStats.totalMilk.toFixed(1)} L</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconBadge, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
              <IndianRupee size={18} color={isDark ? '#86EFAC' : '#16A34A'} />
            </View>
            <Text style={[styles.statSubText, { color: colors.textMuted }]}>Total Milk Value</Text>
            <Text style={[styles.statMainText, { color: colors.text }]}>{formatCurrency(monthlyStats.totalMilkValue)}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconBadge, { backgroundColor: isDark ? '#312E81' : '#E0E7FF' }]}>
              <Users size={18} color={isDark ? '#A5B4FC' : '#4F46E5'} />
            </View>
            <Text style={[styles.statSubText, { color: colors.textMuted }]}>Active Customers</Text>
            <Text style={[styles.statMainText, { color: colors.text }]}>{monthlyStats.activeCustomers}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconBadge, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
              <CalendarDays size={18} color={isDark ? '#FCD34D' : '#D97706'} />
            </View>
            <Text style={[styles.statSubText, { color: colors.textMuted }]}>Days Recorded</Text>
            <Text style={[styles.statMainText, { color: colors.text }]}>{monthlyStats.daysRecorded} / 30</Text>
          </View>
        </View>

        {/* Full Device Width Bottom Grazing Cow Background Image */}
        <View style={styles.bottomFullWidthBgSection}>
          <Image
            source={farmMeadowCrop}
            style={styles.bottomFullWidthImg}
            resizeMode="cover"
          />
          <View style={[styles.bottomTextOverlay, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.88)' : 'rgba(255, 255, 255, 0.75)' }]}>
            <View style={styles.sproutRow}>
              <Sprout size={16} color={isDark ? colors.primary : '#059669'} />
              <Text style={[styles.motivationalTitle, { color: isDark ? colors.primary : '#047857' }]}>Keep collecting,</Text>
            </View>
            <Text style={[styles.motivationalTitleBold, { color: isDark ? colors.text : '#064E3B' }]}>Keep growing!</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.bgMain,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  logoEmoji: {
    fontSize: 22,
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: ThemeColors.primaryText,
  },
  brandTagline: {
    fontSize: 13,
    color: ThemeColors.textMedium,
  },
  headerDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  dateIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  dateBadgeTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateBadgeDayNumber: {
    fontSize: 21,
    fontWeight: '900',
    color: '#065F46',
  },
  dateBadgeSubCol: {
    justifyContent: 'center',
  },
  dateBadgeMonth: {
    fontSize: 11,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: 0.5,
    lineHeight: 13,
  },
  dateBadgeWeekday: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    lineHeight: 12,
  },
  heroBannerBackground: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heroBannerImage: {
    borderRadius: 20,
  },
  dayOverlay: {
    padding: 16,
    paddingVertical: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    minHeight: 130,
    justifyContent: 'center',
  },
  nightOverlay: {
    padding: 16,
    paddingVertical: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    minHeight: 130,
    justifyContent: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 5,
  },
  nightBadgeText: {
    color: '#D97706',
  },
  heroGreetingText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#064E3B',
  },
  heroSubtitleText: {
    fontSize: 14,
    color: '#047857',
    fontWeight: '600',
    marginTop: 2,
  },
  whiteText: {
    color: '#F8FAFC',
  },
  lightGrayText: {
    color: '#CBD5E1',
  },
  dailyRecordCard: {
    marginBottom: 16,
  },
  dailyRecordBg: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  dailyRecordImg: {
    borderRadius: 18,
  },
  dailyRecordOverlay: {
    padding: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(236, 253, 245, 0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  dailyRecordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  dailyRecordBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  dailyRecordTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#064E3B',
  },
  dailyRecordSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: ThemeColors.primaryLight,
    marginRight: 2,
  },
  shiftCardsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tabletShiftGrid: {
    gap: 20,
  },
  shiftCard: {
    width: (Dimensions.get('window').width - 44) / 2,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dispatchPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  dispatchPillTextSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  shiftIconBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  shiftMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metricTextCol: {
    marginLeft: 8,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  metricSub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 24,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.textDark,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    width: (Dimensions.get('window').width - 44) / 2,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statSubText: {
    fontSize: 13,
    color: ThemeColors.textMuted,
  },
  statMainText: {
    fontSize: 17,
    fontWeight: '800',
    color: ThemeColors.textDark,
    marginTop: 2,
  },
  bottomFullWidthBgSection: {
    marginHorizontal: -16,
    marginBottom: -40,
    marginTop: 16,
    overflow: 'hidden',
    position: 'relative',
    width: Dimensions.get('window').width,
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  bottomFullWidthImg: {
    position: 'absolute',
    bottom: -15,
    left: 0,
    right: 0,
    width: '100%',
    height: 180,
    opacity: 1.0,
  },
  bottomTextOverlay: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    marginHorizontal: 16,
    marginBottom: 44,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  sproutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  motivationalTitle: {
    fontSize: 14,
    color: '#047857',
    fontWeight: '700',
  },
  motivationalTitleBold: {
    fontSize: 19,
    fontWeight: '900',
    color: '#064E3B',
    marginTop: 2,
  },
});
