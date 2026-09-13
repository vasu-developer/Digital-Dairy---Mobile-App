import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, ChevronRight, Truck, Users } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { DailyProfitReport } from '@/types';
import { formatCurrency } from '@/utils/calculator';

interface DayProfitCardProps {
  report: DailyProfitReport;
  onPressDispatch?: () => void;
}

export default function DayProfitCard({ report, onPressDispatch }: DayProfitCardProps) {
  const { isDark, colors } = useAppTheme();

  // If there's neither farmer milk nor dispatch on this day, don't clutter the UI
  if (report.totalFarmerLitres === 0 && report.totalDispatchedLitres === 0) {
    return null;
  }

  const isProfit = report.netProfit >= 0;
  const hasPendingRate = report.isRatePending;
  const isPendingDispatch = !report.hasDispatch && report.totalFarmerLitres > 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Daily Profit & Margin</Text>
          <Text style={[styles.headerSub, { color: colors.textMedium }]}>
            {report.date} • {report.totalFarmerLitres.toFixed(1)} L collected
          </Text>
        </View>

        {hasPendingRate ? (
          <View style={[styles.badge, styles.badgeWarning]}>
            <Clock size={12} color="#D97706" />
            <Text style={[styles.badgeText, styles.badgeTextWarning]}>Rate Pending</Text>
          </View>
        ) : isPendingDispatch ? (
          <View style={[styles.badge, styles.badgeBlue]}>
            <Truck size={12} color="#2563EB" />
            <Text style={[styles.badgeText, styles.badgeTextBlue]}>Not Dispatched</Text>
          </View>
        ) : (
          <View style={[styles.badge, isProfit ? styles.badgeSuccess : styles.badgeDanger]}>
            {isProfit ? (
              <TrendingUp size={12} color="#16A34A" />
            ) : (
              <TrendingDown size={12} color="#DC2626" />
            )}
            <Text style={[styles.badgeText, isProfit ? styles.badgeTextSuccess : styles.badgeTextDanger]}>
              {isProfit ? 'Profitable' : 'Deficit'}
            </Text>
          </View>
        )}
      </View>

      {/* Comparison Grid */}
      <View style={[styles.gridRow, { backgroundColor: colors.cardSecondary }]}>
        {/* Customer / Farmer Milk Cost */}
        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Users size={14} color={colors.textMedium} />
            <Text style={[styles.metricLabel, { color: colors.textMedium }]}>Milk Collected</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>{formatCurrency(report.totalFarmerAmount)}</Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>{report.totalFarmerLitres.toFixed(1)} L recorded</Text>
        </View>

        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

        {/* Plant Dispatch & Sales Revenue */}
        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Truck size={14} color="#2563EB" />
            <Text style={[styles.metricLabel, { color: colors.textMedium }]}>Milk Dispatched</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#2563EB' }]}>
            {hasPendingRate ? 'Rate Pending' : formatCurrency(report.totalDispatchedAmount + report.totalLocalSaleAmount)}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            {report.totalDispatchedLitres.toFixed(1)} L sent
            {report.totalLocalSaleLitres > 0 ? ` (+${report.totalLocalSaleLitres.toFixed(1)}L local)` : ''}
          </Text>
        </View>
      </View>

      {/* Net Profit Banner */}
      {!hasPendingRate && !isPendingDispatch && (
        <View
          style={[
            styles.profitBanner,
            isProfit
              ? [styles.profitBannerSuccess, isDark && { backgroundColor: '#064E3B', borderColor: '#065F46' }]
              : [styles.profitBannerDanger, isDark && { backgroundColor: '#450A0A', borderColor: '#991B1B' }],
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.profitLabel, isProfit ? [styles.profitLabelSuccess, isDark && { color: '#6EE7B7' }] : styles.profitLabelDanger]}>
              NET PROFIT
            </Text>
            <Text style={[styles.profitAmount, isProfit ? [styles.profitAmountSuccess, isDark && { color: '#34D399' }] : styles.profitAmountDanger]}>
              {isProfit ? '+' : ''}{formatCurrency(report.netProfit)}
            </Text>
          </View>
          {report.profitMarginPerLitre !== 0 && (
            <View style={[styles.marginPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.marginText, { color: colors.text }]}>
                {report.profitMarginPerLitre > 0 ? '+' : ''}{formatCurrency(report.profitMarginPerLitre)} / L margin
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action prompt if shift not dispatched or rate pending */}
      {(isPendingDispatch || hasPendingRate) && onPressDispatch && (
        <TouchableOpacity
          style={[
            styles.actionPrompt,
            { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' },
          ]}
          onPress={onPressDispatch}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionPromptText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
            {isPendingDispatch ? '🚚 Dispatch milk to view shift profit & margin' : '🧪 Enter tested plant Fat & SNF to finalize profit'}
          </Text>
          <ChevronRight size={14} color={isDark ? '#93C5FD' : '#2563EB'} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  headerSub: {
    fontSize: 11,
    color: ThemeColors.textMedium,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  badgeTextSuccess: {
    color: '#16A34A',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextWarning: {
    color: '#D97706',
  },
  badgeBlue: {
    backgroundColor: '#EFF6FF',
  },
  badgeTextBlue: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeDanger: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextDanger: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  gridRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  metricBox: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: ThemeColors.textMedium,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  profitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  profitBannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  profitBannerDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  profitLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profitLabelSuccess: {
    color: '#065F46',
  },
  profitLabelDanger: {
    color: '#991B1B',
  },
  profitAmount: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 1,
  },
  profitAmountSuccess: {
    color: '#047857',
  },
  profitAmountDanger: {
    color: '#DC2626',
  },
  marginPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  marginText: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  actionPromptText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
});
