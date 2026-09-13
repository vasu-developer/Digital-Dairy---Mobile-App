import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';

interface RegisterShiftTabsProps {
  selectedSession: 'MORNING' | 'EVENING';
  morningLitres: number;
  eveningLitres: number;
  onSelectSession: (session: 'MORNING' | 'EVENING') => void;
}

export const RegisterShiftTabs: React.FC<RegisterShiftTabsProps> = ({
  selectedSession,
  morningLitres,
  eveningLitres,
  onSelectSession,
}) => {
  const { isDark, colors } = useAppTheme();

  return (
    <View style={styles.shiftTabRow}>
      <TouchableOpacity
        style={[
          styles.shiftTabBtn,
          { backgroundColor: colors.card, borderColor: colors.border },
          selectedSession === 'MORNING' && styles.shiftTabBtnActiveMorning,
        ]}
        onPress={() => onSelectSession('MORNING')}
        activeOpacity={0.7}
      >
        <Sun size={15} color={selectedSession === 'MORNING' ? '#D97706' : colors.textMedium} style={{ marginRight: 6 }} />
        <Text style={[styles.shiftTabText, { color: colors.text }, selectedSession === 'MORNING' && styles.shiftTabTextActiveMorning]}>
          Morning
        </Text>
        {morningLitres > 0 && (
          <View
            style={[
              styles.shiftVolumePill,
              selectedSession === 'MORNING'
                ? styles.shiftVolumePillMorningActive
                : isDark
                ? { backgroundColor: colors.cardSecondary }
                : styles.shiftVolumePillInactive,
            ]}
          >
            <Text
              style={[
                styles.shiftVolumePillText,
                selectedSession === 'MORNING' ? styles.shiftVolumePillTextMorningActive : { color: colors.textMuted },
              ]}
            >
              {morningLitres.toFixed(1)} L
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.shiftTabBtn,
          { backgroundColor: colors.card, borderColor: colors.border },
          selectedSession === 'EVENING' && styles.shiftTabBtnActiveEvening,
        ]}
        onPress={() => onSelectSession('EVENING')}
        activeOpacity={0.7}
      >
        <Moon size={15} color={selectedSession === 'EVENING' ? '#2563EB' : colors.textMedium} style={{ marginRight: 6 }} />
        <Text style={[styles.shiftTabText, { color: colors.text }, selectedSession === 'EVENING' && styles.shiftTabTextActiveEvening]}>
          Evening
        </Text>
        {eveningLitres > 0 && (
          <View
            style={[
              styles.shiftVolumePill,
              selectedSession === 'EVENING'
                ? styles.shiftVolumePillEveningActive
                : isDark
                ? { backgroundColor: colors.cardSecondary }
                : styles.shiftVolumePillInactive,
            ]}
          >
            <Text
              style={[
                styles.shiftVolumePillText,
                selectedSession === 'EVENING' ? styles.shiftVolumePillTextEveningActive : { color: colors.textMuted },
              ]}
            >
              {eveningLitres.toFixed(1)} L
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  shiftTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  shiftTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: ThemeColors.border,
    paddingHorizontal: 8,
  },
  shiftTabBtnActiveMorning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  shiftTabBtnActiveEvening: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  shiftTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  shiftTabTextActiveMorning: {
    color: '#D97706',
    fontWeight: '800',
  },
  shiftTabTextActiveEvening: {
    color: '#2563EB',
    fontWeight: '800',
  },
  shiftVolumePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  shiftVolumePillInactive: {
    backgroundColor: '#F1F5F9',
  },
  shiftVolumePillMorningActive: {
    backgroundColor: '#FDE68A',
  },
  shiftVolumePillEveningActive: {
    backgroundColor: '#DBEAFE',
  },
  shiftVolumePillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  shiftVolumePillTextMorningActive: {
    color: '#92400E',
    fontWeight: '800',
  },
  shiftVolumePillTextEveningActive: {
    color: '#1E40AF',
    fontWeight: '800',
  },
});
