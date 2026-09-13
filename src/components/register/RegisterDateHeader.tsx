import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight, RotateCcw, Calendar as CalendarIcon } from 'lucide-react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';

interface RegisterDateHeaderProps {
  selectedYear: number;
  selectedMonthIndex: number;
  selectedDayNum: number;
  isToday: boolean;
  isFutureDate: boolean;
  monthNamesShort: string[];
  onPrevDay: () => void;
  onNextDay: () => void;
  onJumpToToday: () => void;
  onOpenCalendarModal: () => void;
}

export const RegisterDateHeader: React.FC<RegisterDateHeaderProps> = ({
  selectedYear,
  selectedMonthIndex,
  selectedDayNum,
  isToday,
  isFutureDate,
  monthNamesShort,
  onPrevDay,
  onNextDay,
  onJumpToToday,
  onOpenCalendarModal,
}) => {
  const { isDark, colors } = useAppTheme();

  return (
    <View style={[styles.dateControlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.dateArrowBtn, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
        onPress={onPrevDay}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronLeft size={18} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.dateCenterDisplay}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.dateMainText, { color: colors.text }]}>
            {selectedDayNum} {monthNamesShort[selectedMonthIndex]} {selectedYear}
          </Text>
          {isToday ? (
            <View style={styles.todayTag}>
              <Text style={styles.todayTagText}>Today</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.backToTodayPill, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
              onPress={onJumpToToday}
              activeOpacity={0.7}
            >
              <RotateCcw size={10} color={colors.primary} style={{ marginRight: 3 }} />
              <Text style={[styles.backToTodayPillText, { color: colors.primary }]}>Jump to Today</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.dateArrowBtn,
          { backgroundColor: colors.cardSecondary, borderColor: colors.border },
          (isFutureDate || isToday) && styles.dateArrowBtnDisabled,
        ]}
        onPress={onNextDay}
        disabled={isFutureDate || isToday}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronRight size={18} color={isFutureDate || isToday ? colors.textMuted : colors.text} />
      </TouchableOpacity>

      {/* Full Calendar Popup Trigger Button */}
      <TouchableOpacity
        style={[styles.calendarModalTrigger, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
        onPress={onOpenCalendarModal}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <CalendarIcon size={18} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  dateControlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateArrowBtnDisabled: {
    opacity: 0.35,
  },
  dateCenterDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateMainText: {
    fontSize: 14,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  todayTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  todayTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  backToTodayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  backToTodayPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
  calendarModalTrigger: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
});
