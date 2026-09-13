import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { X, ChevronLeft, ChevronRight, RotateCcw, Lock } from 'lucide-react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { MilkCollection } from '@/types';

interface RegisterCalendarModalProps {
  visible: boolean;
  selectedYear: number;
  selectedMonthIndex: number;
  selectedDayNum: number;
  todayYear: number;
  todayMonthIndex: number;
  todayDay: number;
  monthNamesFull: string[];
  collections: MilkCollection[];
  onClose: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectToday: () => void;
  onSelectDay: (dayNum: number) => void;
}

export const RegisterCalendarModal: React.FC<RegisterCalendarModalProps> = ({
  visible,
  selectedYear,
  selectedMonthIndex,
  selectedDayNum,
  todayYear,
  todayMonthIndex,
  todayDay,
  monthNamesFull,
  collections,
  onClose,
  onPrevMonth,
  onNextMonth,
  onSelectToday,
  onSelectDay,
}) => {
  const { isDark, colors } = useAppTheme();

  const daysInSelectedMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
  const startingDayOffset = (new Date(selectedYear, selectedMonthIndex, 1).getDay() + 6) % 7;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.modalBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          {/* Modal Header: Title, Quick Today & Close Button */}
          <View style={styles.calendarModalTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Date</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>Daily Milk Register</Text>
            </View>
            <TouchableOpacity
              style={[styles.modalTodayQuickBtn, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
              onPress={onSelectToday}
              activeOpacity={0.7}
            >
              <RotateCcw size={11} color={colors.primary} style={{ marginRight: 3 }} />
              <Text style={[styles.modalTodayQuickText, { color: colors.primary }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.cardSecondary }]}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Month Navigation Bar */}
          <View style={[styles.calendarMonthNavBar, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.dateArrowBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={onPrevMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft size={18} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.calendarMonthNavTitle, { color: colors.text }]}>
              {monthNamesFull[selectedMonthIndex]} {selectedYear}
            </Text>

            <TouchableOpacity
              style={[
                styles.dateArrowBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                (selectedYear > todayYear ||
                  (selectedYear === todayYear &&
                    selectedMonthIndex >= todayMonthIndex)) &&
                styles.dateArrowBtnDisabled,
              ]}
              onPress={onNextMonth}
              disabled={
                selectedYear > todayYear ||
                (selectedYear === todayYear &&
                  selectedMonthIndex >= todayMonthIndex)
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronRight size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Week Days Header */}
          <View style={styles.weekDaysRow}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
              <Text key={idx} style={[styles.weekDayText, { color: colors.textMuted }]}>{day}</Text>
            ))}
          </View>

          {/* Month Days Grid */}
          <View style={styles.calendarGrid}>
            {Array.from({ length: startingDayOffset }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.calendarCellWrapper} />
            ))}
            {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((dayNum) => {
              const isSelected = dayNum === selectedDayNum;
              const cellMonthStr = String(selectedMonthIndex + 1).padStart(2, '0');
              const cellDateStr = `${selectedYear}-${cellMonthStr}-${String(dayNum).padStart(2, '0')}`;

              const hasMorning = collections.some((c) => c && c.date === cellDateStr && c.session === 'MORNING');
              const hasEvening = collections.some((c) => c && c.date === cellDateStr && c.session === 'EVENING');

              const isCellFuture =
                selectedYear > todayYear ||
                (selectedYear === todayYear && selectedMonthIndex > todayMonthIndex) ||
                (selectedYear === todayYear && selectedMonthIndex === todayMonthIndex && dayNum > todayDay);

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
                  onPress={() => onSelectDay(dayNum)}
                >
                  <View style={[styles.dateCircle, circleStyle, isSelected && styles.selectedCircleFill]}>
                    <Text
                      style={[
                        styles.dateTextBase,
                        textColorStyle,
                        isSelected && { color: '#FFFFFF', fontWeight: '900' },
                      ]}
                    >
                      {dayNum}
                    </Text>
                    {shiftMark ? (
                      <Text style={[styles.shiftMarkText, isDark && { color: '#FBBF24' }, isSelected && { color: '#FFF' }]}>{shiftMark}</Text>
                    ) : isCellFuture ? (
                      <Lock size={9} color={colors.textMuted} style={{ marginTop: -2 }} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Modal Footer Legend */}
          <View style={[styles.modalFooter, { backgroundColor: colors.cardSecondary, borderTopColor: colors.border }]}>
            <View style={styles.legendGrid}>
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
                <Text style={[styles.legendLabel, { color: colors.textMedium }]}>No Milk</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendBadgeGray, isDark && { backgroundColor: '#334155', borderColor: colors.border }]}>
                  <Lock size={9} color={colors.textMuted} />
                </View>
                <Text style={[styles.legendLabelMuted, { color: colors.textMuted }]}>Future</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  calendarModalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  modalSub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  modalTodayQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginRight: 6,
  },
  modalTodayQuickText: {
    fontSize: 11,
    fontWeight: '800',
    color: ThemeColors.primary,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  calendarMonthNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  dateArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateArrowBtnDisabled: {
    opacity: 0.3,
  },
  calendarMonthNavTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.textMuted,
    width: 38,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarCellWrapper: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  selectedCellBorder: {
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  dateCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  selectedCircleFill: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
    elevation: 3,
  },
  dateTextBase: {
    fontSize: 12,
    fontWeight: '700',
  },
  shiftMarkText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#D97706',
    marginTop: -2,
  },
  circleGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  textGreen: {
    color: '#059669',
  },
  circleYellow: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  textYellow: {
    color: '#D97706',
  },
  circleRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  textRed: {
    color: '#DC2626',
  },
  circleFuture: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  textFuture: {
    color: '#94A3B8',
  },
  modalFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  legendGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendBadgeGreen: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  legendBadgeYellow: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendBadgeTextYellow: {
    fontSize: 8,
    fontWeight: '800',
    color: '#D97706',
  },
  legendBadgeRed: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  legendBadgeGray: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: ThemeColors.textMedium,
  },
  legendLabelMuted: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
  },
});
