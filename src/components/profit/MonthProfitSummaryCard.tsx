import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { TrendingUp, TrendingDown, Users, Truck, Share2, Sparkles, Clock } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { MonthlyProfitReport } from '@/types';
import { formatCurrency } from '@/utils/calculator';

interface MonthProfitSummaryCardProps {
  report: MonthlyProfitReport;
  monthName: string;
}

export default function MonthProfitSummaryCard({ report, monthName }: MonthProfitSummaryCardProps) {
  const { isDark, colors } = useAppTheme();
  const isProfit = report.netProfit >= 0;

  const handleShareSummary = async () => {
    try {
      let msg = `🥛 *DOODH KHATA - MONTHLY SUMMARY* 🥛\n`;
      msg += `📅 *Month*: ${monthName}\n`;
      msg += `--------------------------------\n`;
      msg += `*Customer Milk Total*: ${formatCurrency(report.totalFarmerAmount)} (${report.totalFarmerLitres.toFixed(1)} L)\n`;
      msg += `🏭 *Plant Dispatch Total*: ${formatCurrency(report.totalDispatchedAmount)} (${report.totalDispatchedLitres.toFixed(1)} L)\n`;
      if (report.totalLocalSaleLitres > 0) {
        msg += `*Local Milk Sales*: ${formatCurrency(report.totalLocalSaleAmount)} (${report.totalLocalSaleLitres.toFixed(1)} L)\n`;
      }
      msg += `--------------------------------\n`;
      msg += `💰 *NET PROFIT*: ${isProfit ? '+' : ''}${formatCurrency(report.netProfit)}\n`;
      if (report.profitMarginPerLitre !== 0) {
        msg += `📊 *Average Margin*: ${report.profitMarginPerLitre > 0 ? '+' : ''}${formatCurrency(report.profitMarginPerLitre)} / Litre\n`;
      }
      if (report.pendingDispatchRateCount > 0) {
        msg += `⚠️ *Note*: ${report.pendingDispatchRateCount} shift dispatches have rates pending\n`;
      }
      msg += `--------------------------------\n`;
      msg += `Digital Dairy Register • Simple & Accurate`;

      await Share.share({ message: msg });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <View style={[styles.monthBadge, { backgroundColor: colors.cardSecondary }]}>
              <Text style={[styles.monthBadgeText, { color: colors.text }]}>{monthName}</Text>
            </View>
            {report.pendingDispatchRateCount > 0 && (
              <View style={styles.pendingBadge}>
                <Clock size={10} color="#D97706" />
                <Text style={styles.pendingBadgeText}>{report.pendingDispatchRateCount} Rate Pending</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Dairy Summary</Text>
          <Text style={[styles.cardSub, { color: colors.textMedium }]}>Collection vs Dispatch Overview</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.shareBtn,
            {
              backgroundColor: isDark ? '#1E293B' : '#F0FDFA',
              borderColor: isDark ? '#334155' : '#CCFBF1',
            },
          ]}
          onPress={handleShareSummary}
          activeOpacity={0.7}
        >
          <Share2 size={16} color={isDark ? '#34D399' : ThemeColors.primary} />
        </TouchableOpacity>
      </View>

      {/* Two Essential Metrics Row (Customer Milk Total and Plant Dispatch Total) */}
      <View style={styles.metricsRow}>
        {/* Metric 1: Total Customer Milk */}
        <View style={[styles.metricCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
          <View style={[styles.metricIconCircleGreen, isDark && { backgroundColor: '#064E3B' }]}>
            <Users size={16} color={isDark ? '#34D399' : '#059669'} />
          </View>
          <Text style={[styles.metricLabel, { color: colors.textMedium }]}>Customer Milk Total</Text>
          <Text style={[styles.metricAmount, { color: colors.text }]}>{formatCurrency(report.totalFarmerAmount)}</Text>
          <Text style={[styles.metricLitres, { color: colors.textMuted }]}>{report.totalFarmerLitres.toFixed(1)} L purchased</Text>
        </View>

        {/* Metric 2: Total Plant Dispatch */}
        <View style={[styles.metricCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
          <View style={[styles.metricIconCircleBlue, isDark && { backgroundColor: '#1E3A8A' }]}>
            <Truck size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
          </View>
          <Text style={[styles.metricLabel, { color: colors.textMedium }]}>Plant Dispatch Total</Text>
          <Text style={[styles.metricAmount, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
            {formatCurrency(report.totalDispatchedAmount + report.totalLocalSaleAmount)}
          </Text>
          <Text style={[styles.metricLitres, { color: colors.textMuted }]}>
            {report.totalDispatchedLitres.toFixed(1)} L dispatched
            {report.totalLocalSaleLitres > 0 ? ` (+${report.totalLocalSaleLitres.toFixed(1)}L local)` : ''}
          </Text>
        </View>
      </View>

      {/* Bottom Net Profit Strip */}
      <View
        style={[
          styles.profitStrip,
          isProfit
            ? [styles.profitStripSuccess, isDark && { backgroundColor: '#064E3B', borderColor: '#065F46' }]
            : [styles.profitStripDanger, isDark && { backgroundColor: '#450A0A', borderColor: '#991B1B' }],
        ]}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {isProfit ? (
              <TrendingUp size={14} color={isDark ? '#34D399' : '#059669'} />
            ) : (
              <TrendingDown size={14} color="#DC2626" />
            )}
            <Text style={[styles.profitStripLabel, isProfit ? (isDark ? { color: '#6EE7B7' } : styles.textGreen) : styles.textRed]}>
              NET PROFIT
            </Text>
          </View>
          <Text style={[styles.profitStripAmount, isProfit ? (isDark ? { color: '#34D399' } : styles.textGreen) : styles.textRed]}>
            {isProfit ? '+' : ''}{formatCurrency(report.netProfit)}
          </Text>
        </View>

        {report.profitMarginPerLitre !== 0 && (
          <View style={[styles.marginBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.marginBadgeText, { color: colors.text }]}>
              {report.profitMarginPerLitre > 0 ? '+' : ''}{formatCurrency(report.profitMarginPerLitre)}/L margin
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  monthBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  monthBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  cardSub: {
    fontSize: 12,
    color: ThemeColors.textMedium,
    marginTop: 1,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  metricIconCircleGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricIconCircleBlue: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.textMedium,
    marginBottom: 4,
  },
  metricAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: ThemeColors.textDark,
  },
  metricLitres: {
    fontSize: 10,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  profitStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  profitStripSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  profitStripDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  profitStripLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profitStripAmount: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  textGreen: {
    color: '#065F46',
  },
  textRed: {
    color: '#991B1B',
  },
  marginBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  marginBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
});
