import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Edit2 } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { MilkDispatch } from '@/types';
import { formatCurrency } from '@/utils/calculator';

interface DispatchTableProps {
  dayMorningDispatch?: MilkDispatch;
  dayEveningDispatch?: MilkDispatch;
  onRowPress: (dispatch: MilkDispatch) => void;
  onAddDispatch?: (session: 'MORNING' | 'EVENING') => void;
}

export default function DispatchTable({
  dayMorningDispatch,
  dayEveningDispatch,
  onRowPress,
  onAddDispatch,
}: DispatchTableProps) {
  const { isDark, colors } = useAppTheme();
  return (
    <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Table Header Row */}
      <View style={[styles.tableHeaderRow, { backgroundColor: colors.tableHeader, borderBottomColor: colors.border }]}>
        <View style={styles.colShift}>
          <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>Shift</Text>
        </View>
        <View style={styles.colQty}>
          <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>Qty (L)</Text>
        </View>
        <View style={styles.colFat}>
          <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>Fat</Text>
        </View>
        <View style={styles.colSnf}>
          <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>SNF</Text>
        </View>
        <View style={styles.colRate}>
          <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>Rate</Text>
        </View>
        <View style={styles.colAmount}>
          <Text style={[styles.tableHeaderText, { color: colors.textMedium }]}>Amount</Text>
        </View>
      </View>

      {/* Morning Shift Row (M) */}
      <View style={[styles.tableRow, styles.tableRowDivider, { backgroundColor: colors.card, borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.colShift}>
          {dayMorningDispatch ? (
            <TouchableOpacity
              style={styles.shiftBadgeEditM}
              onPress={() => onRowPress(dayMorningDispatch)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Edit2 size={13} color="#D97706" />
            </TouchableOpacity>
          ) : (
            <View style={styles.shiftBadgeM}>
              <Text style={styles.shiftBadgeTextM}>M</Text>
            </View>
          )}
        </View>

        {dayMorningDispatch ? (
          <>
            <View style={styles.colQty}>
              <Text style={[styles.tableCellBold, { color: colors.text }]}>
                {dayMorningDispatch.dispatched_litres.toFixed(1)}
              </Text>
            </View>
            <View style={styles.colFat}>
              <Text style={[styles.tableCellText, { color: colors.text }]}>{dayMorningDispatch.fat}%</Text>
            </View>
            <View style={styles.colSnf}>
              <Text style={[styles.tableCellText, { color: colors.text }]}>{dayMorningDispatch.snf}%</Text>
            </View>
            <View style={styles.colRate}>
              {dayMorningDispatch.rate && dayMorningDispatch.rate > 0 ? (
                <Text style={[styles.tableCellText, { color: colors.text }]}>
                  ₹{dayMorningDispatch.rate.toFixed(2)}
                </Text>
              ) : (
                <TouchableOpacity
                  style={styles.enterRateSmallPill}
                  onPress={() => onRowPress(dayMorningDispatch)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.enterRateSmallText}>+ Rate</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.colAmount}>
              <Text
                style={[
                  styles.tableCellGreen,
                  (!dayMorningDispatch.rate || dayMorningDispatch.rate <= 0) &&
                    styles.tableCellPending,
                ]}
              >
                {dayMorningDispatch.amount && dayMorningDispatch.amount > 0
                  ? formatCurrency(dayMorningDispatch.amount)
                  : 'Pending'}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.colQty}>
              <Text style={styles.tableCellMuted}>—</Text>
            </View>
            <View style={styles.colFat}>
              <Text style={styles.tableCellMuted}>—</Text>
            </View>
            <View style={styles.colSnf}>
              <Text style={styles.tableCellMuted}>—</Text>
            </View>
            <View style={styles.colRate}>
              {onAddDispatch ? (
                <TouchableOpacity
                  style={styles.enterRateSmallPill}
                  onPress={() => onAddDispatch('MORNING')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.enterRateSmallText}>+ Add</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.tableCellMuted}>—</Text>
              )}
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.tableCellMuted}>—</Text>
            </View>
          </>
        )}
      </View>

      {/* Evening Shift Row (E) */}
      <View style={[styles.tableRow, { backgroundColor: colors.card }]}>
        <View style={styles.colShift}>
          {dayEveningDispatch ? (
            <TouchableOpacity
              style={styles.shiftBadgeEditE}
              onPress={() => onRowPress(dayEveningDispatch)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Edit2 size={13} color="#2563EB" />
            </TouchableOpacity>
          ) : (
            <View style={styles.shiftBadgeE}>
              <Text style={styles.shiftBadgeTextE}>E</Text>
            </View>
          )}
        </View>

        {dayEveningDispatch ? (
          <>
            <View style={styles.colQty}>
              <Text style={[styles.tableCellBold, { color: colors.text }]}>
                {dayEveningDispatch.dispatched_litres.toFixed(1)}
              </Text>
            </View>
            <View style={styles.colFat}>
              <Text style={[styles.tableCellText, { color: colors.text }]}>{dayEveningDispatch.fat}%</Text>
            </View>
            <View style={styles.colSnf}>
              <Text style={[styles.tableCellText, { color: colors.text }]}>{dayEveningDispatch.snf}%</Text>
            </View>
            <View style={styles.colRate}>
              {dayEveningDispatch.rate && dayEveningDispatch.rate > 0 ? (
                <Text style={[styles.tableCellText, { color: colors.text }]}>
                  ₹{dayEveningDispatch.rate.toFixed(2)}
                </Text>
              ) : (
                <TouchableOpacity
                  style={styles.enterRateSmallPill}
                  onPress={() => onRowPress(dayEveningDispatch)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.enterRateSmallText}>+ Rate</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.colAmount}>
              <Text
                style={[
                  styles.tableCellGreen,
                  (!dayEveningDispatch.rate || dayEveningDispatch.rate <= 0) &&
                    styles.tableCellPending,
                ]}
              >
                {dayEveningDispatch.amount && dayEveningDispatch.amount > 0
                  ? formatCurrency(dayEveningDispatch.amount)
                  : 'Pending'}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.colQty}>
              <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
            </View>
            <View style={styles.colFat}>
              <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
            </View>
            <View style={styles.colSnf}>
              <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
            </View>
            <View style={styles.colRate}>
              {onAddDispatch ? (
                <TouchableOpacity
                  style={styles.enterRateSmallPill}
                  onPress={() => onAddDispatch('EVENING')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.enterRateSmallText}>+ Add</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
              )}
            </View>
            <View style={styles.colAmount}>
              <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
            </View>
          </>
        )}
      </View>

      {/* Table Total Summary Row */}
      <View style={[styles.tableTotalRow, { backgroundColor: colors.tableHeader, borderTopColor: colors.border }]}>
        <View style={styles.colShift}>
          <Text style={[styles.tableTotalLabel, { color: colors.text }]}>T</Text>
        </View>
        <View style={styles.colQty}>
          <Text style={[styles.tableTotalQty, { color: isDark ? '#34D399' : ThemeColors.primary }]}>
            {((dayMorningDispatch?.dispatched_litres || 0) +
              (dayEveningDispatch?.dispatched_litres || 0)).toFixed(1)}
          </Text>
        </View>
        <View style={styles.colFat}>
          <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
        </View>
        <View style={styles.colSnf}>
          <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
        </View>
        <View style={styles.colRate}>
          <Text style={[styles.tableCellMuted, { color: colors.textMuted }]}>—</Text>
        </View>
        <View style={styles.colAmount}>
          <Text style={[styles.tableTotalAmount, { color: isDark ? '#34D399' : ThemeColors.primary }]}>
            {((dayMorningDispatch?.amount || 0) + (dayEveningDispatch?.amount || 0)) > 0
              ? formatCurrency(
                  (dayMorningDispatch?.amount || 0) + (dayEveningDispatch?.amount || 0)
                )
              : dayMorningDispatch || dayEveningDispatch
              ? 'Pending'
              : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  tableRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  colShift: {
    width: 34,
    alignItems: 'center',
  },
  colQty: {
    flex: 1.2,
    alignItems: 'center',
  },
  colFat: {
    flex: 0.9,
    alignItems: 'center',
  },
  colSnf: {
    flex: 0.9,
    alignItems: 'center',
  },
  colRate: {
    flex: 1.4,
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  colAmount: {
    flex: 1.8,
    alignItems: 'flex-end',
  },
  shiftBadgeM: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftBadgeTextM: {
    color: '#D97706',
    fontWeight: '800',
    fontSize: 12,
  },
  shiftBadgeE: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftBadgeTextE: {
    color: '#2563EB',
    fontWeight: '800',
    fontSize: 12,
  },
  tableCellBold: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  tableCellText: {
    fontSize: 13,
    fontWeight: '500',
    color: ThemeColors.textDark,
  },
  tableCellMuted: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  tableCellGreen: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  tableCellPending: {
    color: '#D97706',
    fontSize: 13,
  },
  enterRateSmallPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  enterRateSmallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  tableTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tableTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  tableTotalQty: {
    fontSize: 14,
    fontWeight: '800',
    color: ThemeColors.primary,
  },
  tableTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: ThemeColors.primary,
  },
  shiftBadgeEditM: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftBadgeEditE: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
