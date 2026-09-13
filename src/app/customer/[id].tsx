import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Droplet,
  IndianRupee,
  Sun,
  Moon,
  Plus,
  BookOpen,
  Edit3,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { formatCurrency, sanitizeDecimalInput } from '@/utils/calculator';

export default function CustomerDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const { id } = useLocalSearchParams();
  const { getCustomerById, collections, getCustomerBalance } = useRepository();

  const customer = getCustomerById(id as string) || {
    id: id as string,
    name: 'Customer',
    phone: '',
    village: '',
    status: 'ACTIVE' as const,
    created_at: '',
  };

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MONTHLY' | 'LEDGER' | 'HISTORY'>('OVERVIEW');
  const [buyerRateStr, setBuyerRateStr] = useState(
    customer.default_sale_rate ? customer.default_sale_rate.toString() : '60'
  );

  const custCols = collections.filter((c) => c && c.customer_id === customer.id);
  const totalMilk = custCols.reduce((acc, c) => acc + (c.quantity || 0), 0);
  const totalMilkValue = custCols.reduce((acc, c) => acc + (c.amount || 0), 0);

  const currentMonthYearName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const morningMilk = custCols.filter((c) => c.session === 'MORNING').reduce((acc, c) => acc + (c.quantity || 0), 0);
  const eveningMilk = custCols.filter((c) => c.session === 'EVENING').reduce((acc, c) => acc + (c.quantity || 0), 0);

  const balanceInfo = getCustomerBalance(customer.id);
  const isBuyer = customer.customer_type === 'BUYER';
  const buyerRateNum = parseFloat(buyerRateStr) || 0;
  const totalBuyerMilkValue = Math.round(totalMilk * buyerRateNum * 100) / 100;
  const buyerNetDue = totalBuyerMilkValue + balanceInfo.totalDeductions - balanceInfo.customerRepayments - balanceInfo.paymentsMade;

  const initials = customer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: Math.max(insets.top + 8, 16) }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Customer Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Customer Main Info Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.custName, { color: colors.text }]}>{customer.name}</Text>
                  {customer.customer_type === 'BUYER' ? (
                    <View style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#FBBF24' : '#D97706' }}>Milk Buyer</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#34D399' : '#059669' }}>Milk Farmer</Text>
                    </View>
                  )}
                  {customer.status === 'INACTIVE' && (
                    <View style={[styles.activePill, { backgroundColor: isDark ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2' }]}>
                      <Text style={[styles.activePillText, { color: isDark ? '#F87171' : '#DC2626' }]}>Paused</Text>
                    </View>
                  )}
                </View>

                {/* Edit Profile Button directly on card */}
                <TouchableOpacity
                  style={[styles.cardEditBtn, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5', borderColor: isDark ? 'rgba(5, 150, 105, 0.4)' : '#A7F3D0' }]}
                  onPress={() => router.push({ pathname: '/edit-customer/[id]', params: { id: customer.id } })}
                >
                  <Edit3 size={10} color={colors.primary} style={{ marginRight: 2 }} />
                  <Text style={[styles.cardEditText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 4 }}>
                {customer.customer_type === 'BUYER' ? (
                  <View style={styles.infoRow}>
                    <IndianRupee size={12} color="#D97706" />
                    <Text style={[styles.infoText, { color: isDark ? '#FBBF24' : '#B45309', fontWeight: '700' }]}>
                      Fixed Rate: ₹{customer.default_sale_rate || 60} / Litre
                    </Text>
                  </View>
                ) : null}

                {customer.phone ? (
                  <View style={styles.infoRow}>
                    <Phone size={12} color={colors.textMuted} />
                    <Text style={[styles.infoText, { color: colors.textMuted }]}>{customer.phone}</Text>
                  </View>
                ) : null}

                {customer.village ? (
                  <View style={styles.infoRow}>
                    <MapPin size={12} color={colors.textMuted} />
                    <Text style={[styles.infoText, { color: colors.textMuted }]}>{customer.village}</Text>
                  </View>
                ) : null}

                {customer.created_at ? (
                  <View style={styles.infoRow}>
                    <Calendar size={12} color={colors.textMuted} />
                    <Text style={[styles.infoText, { color: colors.textMuted }]}>Joined {customer.created_at}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* Top Action Buttons (Milk Calendar & Money Ledger) */}
        <View style={styles.actionBtnRow}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/customer/calendar/${customer.id}`)}
          >
            <Calendar size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionText}>Milk Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/ledger/${customer.id}`)}
          >
            <BookOpen size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Money Ledger</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Financial Statistics Section */}
        <View style={styles.financialSection}>
          {isBuyer ? (
            <View style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#F59E0B', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#FBBF24' : '#92400E', letterSpacing: 0.5 }}>BUYER SETTLED VALUE TILL DATE</Text>
              </View>

              {/* Row 1: Total Litres Taken & Interactive Selling Rate */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: colors.card, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 11.5, color: isDark ? '#FCD34D' : '#B45309', fontWeight: '600' }}>Milk Litres Taken</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 2 }}>{totalMilk.toFixed(1)} L</Text>
                </View>

                <View style={{ width: 140, backgroundColor: colors.card, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#F59E0B' }}>
                  <Text style={{ fontSize: 11.5, color: isDark ? '#FCD34D' : '#B45309', fontWeight: '600' }}>Rate (₹ / Litre)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ fontWeight: '800', color: '#D97706', marginRight: 4, fontSize: 16 }}>₹</Text>
                    <TextInput
                      style={{ flex: 1, fontSize: 18, fontWeight: '900', color: colors.text, padding: 0 }}
                      keyboardType="numeric"
                      value={buyerRateStr}
                      onChangeText={(val) => setBuyerRateStr(sanitizeDecimalInput(val))}
                      placeholder="60"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Row 2: Bill Summary Breakdown */}
              <View style={{ borderTopWidth: 1, borderTopColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FDE68A', paddingTop: 10, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.textMedium, fontWeight: '600' }}>Total Milk Purchased ({totalMilk.toFixed(1)} L × ₹{buyerRateNum})</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#D97706' }}>{formatCurrency(totalBuyerMilkValue)}</Text>
                </View>

                {balanceInfo.customerRepayments > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: isDark ? '#34D399' : '#047857', fontWeight: '600' }}>Money Paid for Milk by Buyer</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#34D399' : '#059669' }}>-{formatCurrency(balanceInfo.customerRepayments)}</Text>
                  </View>
                )}

                {balanceInfo.totalDeductions > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: isDark ? '#F87171' : '#DC2626', fontWeight: '600' }}>Store Purchases / Advances</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#F87171' : '#DC2626' }}>+{formatCurrency(balanceInfo.totalDeductions)}</Text>
                  </View>
                )}

                {balanceInfo.openingBal !== 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: colors.textMedium, fontWeight: '600' }}>
                      {balanceInfo.openingBal > 0 ? 'Previous Dues at Joining' : 'Advance Deposit at Joining'}
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: balanceInfo.openingBal > 0 ? '#D97706' : (isDark ? '#34D399' : '#059669') }}>
                      {balanceInfo.openingBal > 0 ? '+' : ''}{formatCurrency(balanceInfo.openingBal)}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FDE68A' }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>Net Outstanding Due to Dairy</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#D97706' }}>{formatCurrency(balanceInfo.payableBalance)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.halfAndHalfRow}>
                {/* Left Half: Total Advances & Deductions */}
                <View style={[styles.halfCardDeduction, isDark && { backgroundColor: 'rgba(220, 38, 38, 0.12)', borderColor: 'rgba(220, 38, 38, 0.25)' }]}>
                  <View style={styles.cardHeaderSmall}>
                    <ArrowUpRight size={16} color="#DC2626" />
                    <Text style={[styles.halfCardTitle, { color: colors.textMedium }]}>Advances & Deductions</Text>
                  </View>
                  <Text style={styles.halfCardValRed}>
                    {formatCurrency(balanceInfo.netDeductions)}
                  </Text>
                  <Text style={[styles.halfCardSub, { color: colors.textMuted }]}>
                    {balanceInfo.customerRepayments > 0
                      ? `Net (${formatCurrency(balanceInfo.customerRepayments)} returned)`
                      : 'Advances + Feed / Store'}
                  </Text>
                </View>

                {/* Right Half: Total Milk Value Earned */}
                <View style={[styles.halfCardCredit, isDark && { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderColor: 'rgba(22, 163, 74, 0.25)' }]}>
                  <View style={styles.cardHeaderSmall}>
                    <Droplet size={16} color="#16A34A" />
                    <Text style={[styles.halfCardTitle, { color: colors.textMedium }]}>Milk Value Earned</Text>
                  </View>
                  <Text style={styles.halfCardValGreen}>
                    {formatCurrency(balanceInfo.accumulatedMilkValue)}
                  </Text>
                  <Text style={[styles.halfCardSub, { color: colors.textMuted }]}>Total Milk Deliveries</Text>
                </View>
              </View>

              {/* Settled Net Value Till Date Banner */}
              <View
                style={[
                  styles.settlementBanner,
                  {
                    backgroundColor: balanceInfo.payableBalance >= 0
                      ? (isDark ? 'rgba(22, 163, 74, 0.15)' : '#ECFDF5')
                      : (isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2'),
                    borderColor: balanceInfo.payableBalance >= 0
                      ? (isDark ? 'rgba(22, 163, 74, 0.3)' : '#A7F3D0')
                      : (isDark ? 'rgba(220, 38, 38, 0.3)' : '#FECACA'),
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settlementBannerTitle, { color: colors.textMedium }]}>SETTLED VALUE TILL DATE</Text>
                  <Text
                    style={[
                      styles.settlementBannerVal,
                      { color: balanceInfo.payableBalance >= 0 ? (isDark ? '#4ADE80' : '#15803D') : (isDark ? '#F87171' : '#B91C1C') },
                    ]}
                  >
                    {formatCurrency(Math.abs(balanceInfo.payableBalance))}
                  </Text>
                  <Text
                    style={[
                      styles.settlementBannerSub,
                      { color: balanceInfo.payableBalance >= 0 ? (isDark ? '#86EFAC' : '#166534') : (isDark ? '#FCA5A5' : '#991B1B') },
                    ]}
                  >
                    {balanceInfo.payableBalance >= 0
                      ? '✓ Dairy Payable to Farmer (Milk Collected Value > Advances)'
                      : '⚠️ Farmer Taken Advance (Customer Advance > Milk Value)'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* This Month Milk Summary Box */}
        <View style={[styles.monthCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.monthCardTitle, { color: colors.text }]}>This Month Milk Summary ({currentMonthYearName})</Text>

          <View style={styles.monthStatsGrid}>
            <View style={[styles.monthStatItem, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
              <Droplet size={18} color="#2563EB" style={{ marginBottom: 4 }} />
              <Text style={[styles.monthStatSub, { color: colors.textMuted }]}>Total Milk</Text>
              <Text style={[styles.monthStatVal, { color: colors.text }]}>{totalMilk.toFixed(1)} L</Text>
            </View>

            <View style={[styles.monthStatItem, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
              <IndianRupee size={18} color="#16A34A" style={{ marginBottom: 4 }} />
              <Text style={[styles.monthStatSub, { color: colors.textMuted }]}>Total Milk Value</Text>
              <Text style={[styles.monthStatVal, { color: colors.text }]}>{formatCurrency(totalMilkValue)}</Text>
            </View>
          </View>

          <View style={[styles.shiftSplitRow, { borderTopColor: colors.border }]}>
            <View style={styles.shiftItem}>
              <Sun size={16} color="#F59E0B" />
              <Text style={[styles.shiftLabel, { color: colors.textMedium }]}>Morning: <Text style={[styles.shiftVal, { color: colors.text }]}>{morningMilk.toFixed(1)} L</Text></Text>
            </View>

            <View style={styles.shiftItem}>
              <Moon size={16} color="#6366F1" />
              <Text style={[styles.shiftLabel, { color: colors.textMedium }]}>Evening: <Text style={[styles.shiftVal, { color: colors.text }]}>{eveningMilk.toFixed(1)} L</Text></Text>
            </View>
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  scrollContent: {
    padding: 14,
    paddingTop: 10,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  custName: {
    fontSize: 19,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  infoText: {
    fontSize: 13,
    color: ThemeColors.textMuted,
  },
  metaCardsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metaBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  metaVal: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.textDark,
    marginTop: 4,
  },
  metaSub: {
    fontSize: 11.5,
    color: ThemeColors.textMuted,
  },
  balanceCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  balanceTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#065F46',
    marginVertical: 4,
  },
  financialSection: {
    marginBottom: 16,
  },
  halfAndHalfRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  halfCardDeduction: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  halfCardCredit: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  cardHeaderSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  halfCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textMedium,
  },
  halfCardValRed: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  halfCardValGreen: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16A34A',
  },
  halfCardSub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  settlementBanner: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  settlementBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: ThemeColors.textMedium,
  },
  settlementBannerVal: {
    fontSize: 24,
    fontWeight: '800',
    marginVertical: 2,
  },
  settlementBannerSub: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  monthCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 16,
  },
  monthCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ThemeColors.textDark,
    marginBottom: 12,
  },
  monthStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  monthStatItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  monthStatSub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
  },
  monthStatVal: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
    marginTop: 2,
  },
  shiftSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: ThemeColors.bgMain,
    paddingTop: 10,
  },
  shiftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftLabel: {
    fontSize: 14,
    color: ThemeColors.textMedium,
  },
  shiftVal: {
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  primaryActionBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#059669',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  viewCalendarBtn: {
    height: 46,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewCalendarText: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '700',
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerEditText: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
  cardEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  cardEditText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
});
