import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Check } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
  title?: string;
  maxDate?: string; // YYYY-MM-DD
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
  title = 'Select Joining Date',
  maxDate = new Date().toISOString().split('T')[0],
}) => {
  const { isDark, colors } = useAppTheme();
  // Parse initial selected date or default to current date
  const parseInitialDate = () => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const parts = selectedDate.split('-').map(Number);
      return { year: parts[0], month: parts[1] - 1, day: parts[2] };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
  };

  const initial = parseInitialDate();
  const [currentYear, setCurrentYear] = useState<number>(initial.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initial.month); // 0-indexed

  useEffect(() => {
    if (visible && selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const parts = selectedDate.split('-').map(Number);
      setCurrentYear(parts[0]);
      setCurrentMonth(parts[1] - 1);
    }
  }, [visible, selectedDate]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Get total days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Get starting day index (0 = Mon, 6 = Sun)
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

  const handleDaySelect = (dayNum: number) => {
    const formattedMonth = (currentMonth + 1).toString().padStart(2, '0');
    const formattedDay = dayNum.toString().padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

    if (maxDate && dateStr > maxDate) {
      return; // Disabled for future dates
    }

    onSelectDate(dateStr);
    onClose();
  };

  const handleSelectToday = () => {
    const today = maxDate || new Date().toISOString().split('T')[0];
    onSelectDate(today);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CalendarIcon size={20} color={isDark ? '#34D399' : ThemeColors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.cardSecondary, borderRadius: 16 }]} onPress={onClose}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Month & Year Controls */}
          <View style={[styles.monthHeaderRow, { backgroundColor: colors.cardSecondary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6 }]}>
            <TouchableOpacity style={[styles.arrowBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handlePrevMonth}>
              <ChevronLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthTitleText, { color: colors.text }]}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity style={[styles.arrowBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleNextMonth}>
              <ChevronRight size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Week Days Header */}
          <View style={styles.weekDaysRow}>
            {WEEK_DAYS.map((day, idx) => (
              <Text key={idx} style={[styles.weekDayText, { color: colors.textMuted }]}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {/* Blank offset cells for starting day */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.emptyCell} />
            ))}

            {/* Month Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const formattedMonth = (currentMonth + 1).toString().padStart(2, '0');
              const formattedDay = dayNum.toString().padStart(2, '0');
              const cellDateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

              const isSelected = selectedDate === cellDateStr;
              const isFuture = !!maxDate && cellDateStr > maxDate;

              return (
                <TouchableOpacity
                  key={dayNum}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isFuture && [styles.dayCellDisabled, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }],
                  ]}
                  disabled={isFuture}
                  onPress={() => handleDaySelect(dayNum)}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      { color: colors.text },
                      isSelected && styles.dayCellTextSelected,
                      isFuture && [styles.dayCellTextDisabled, { color: colors.textMuted }],
                    ]}
                  >
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today Button Shortcut */}
          <TouchableOpacity
            style={[
              styles.todayShortcutBtn,
              {
                backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF',
                borderColor: isDark ? '#2563EB' : '#BFDBFE',
              },
            ]}
            onPress={handleSelectToday}
          >
            <Check size={16} color={isDark ? '#93C5FD' : ThemeColors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.todayShortcutText, { color: isDark ? '#93C5FD' : ThemeColors.primary }]}>Set to Today</Text>
          </TouchableOpacity>
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
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  closeBtn: {
    padding: 4,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  arrowBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textMuted,
    width: 36,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emptyCell: {
    width: 40,
    height: 40,
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: ThemeColors.primary,
  },
  dayCellDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.4,
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: ThemeColors.textDark,
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayCellTextDisabled: {
    color: ThemeColors.textMuted,
  },
  todayShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  todayShortcutText: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
});
