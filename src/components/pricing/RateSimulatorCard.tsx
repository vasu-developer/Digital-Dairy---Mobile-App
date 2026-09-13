import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Calculator, Sparkles, Droplet, FlaskConical, ArrowRight, Plus, Minus } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { RateChartConfig, calculateFatSnfRate } from '@/utils/rate-chart';
import { formatCurrency, sanitizeDecimalInput } from '@/utils/calculator';

interface RateSimulatorCardProps {
  config: RateChartConfig;
  profileName: string; // e.g. "Farmer Purchase" or "Plant Dispatch"
}

export default function RateSimulatorCard({ config, profileName }: RateSimulatorCardProps) {
  const { isDark, colors } = useAppTheme();
  const [testFatStr, setTestFatStr] = useState<string>('6.5');
  const [testSnfStr, setTestSnfStr] = useState<string>('8.8');

  const fatVal = parseFloat(testFatStr) || 0;
  const snfVal = parseFloat(testSnfStr) || 0;

  const calculatedRate = calculateFatSnfRate(fatVal, snfVal, config);

  const fatDiffSteps = (fatVal - config.baseFat) * 10;
  const snfDiffSteps = (snfVal - config.baseSNF) * 10;
  const fatAdjustment = Math.round(fatDiffSteps * config.fatStepRate * 100) / 100;
  const snfAdjustment = Math.round(snfDiffSteps * config.snfStepRate * 100) / 100;

  const stepFat = (delta: number) => {
    const curr = parseFloat(testFatStr) || 0;
    const next = Math.max(1, Math.min(15, Math.round((curr + delta) * 10) / 10));
    setTestFatStr(next.toFixed(1));
  };

  const stepSnf = (delta: number) => {
    const curr = parseFloat(testSnfStr) || 0;
    const next = Math.max(1, Math.min(15, Math.round((curr + delta) * 10) / 10));
    setTestSnfStr(next.toFixed(1));
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, isDark && { backgroundColor: '#064E3B' }]}>
          <Calculator size={18} color={isDark ? '#34D399' : '#059669'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Live Rate Simulator</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Instant rate preview for {profileName}</Text>
        </View>
        <View style={[styles.livePill, isDark && { backgroundColor: '#064E3B' }]}>
          <Sparkles size={12} color={isDark ? '#34D399' : '#059669'} />
          <Text style={[styles.liveText, isDark && { color: '#6EE7B7' }]}>Interactive</Text>
        </View>
      </View>

      {/* Input Row */}
      <View style={styles.inputRow}>
        <View style={styles.inputCol}>
          <Text style={[styles.label, { color: colors.text }]}>Test Fat %</Text>
          <View style={[styles.fieldBox, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <TouchableOpacity style={[styles.stepBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={() => stepFat(-0.1)} activeOpacity={0.7}>
              <Minus size={13} color={colors.text} />
            </TouchableOpacity>
            <Droplet size={14} color="#D97706" style={{ marginHorizontal: 2 }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              keyboardType="decimal-pad"
              value={testFatStr}
              onChangeText={(t) => setTestFatStr(sanitizeDecimalInput(t))}
              placeholder="6.5"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={[styles.stepBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={() => stepFat(0.1)} activeOpacity={0.7}>
              <Plus size={13} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputCol}>
          <Text style={[styles.label, { color: colors.text }]}>Test SNF %</Text>
          <View style={[styles.fieldBox, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <TouchableOpacity style={[styles.stepBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={() => stepSnf(-0.1)} activeOpacity={0.7}>
              <Minus size={13} color={colors.text} />
            </TouchableOpacity>
            <FlaskConical size={14} color="#2563EB" style={{ marginHorizontal: 2 }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              keyboardType="decimal-pad"
              value={testSnfStr}
              onChangeText={(t) => setTestSnfStr(sanitizeDecimalInput(t))}
              placeholder="8.8"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={[styles.stepBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={() => stepSnf(0.1)} activeOpacity={0.7}>
              <Plus size={13} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Live Calculation Result Banner */}
      <View style={[styles.resultBanner, isDark && { backgroundColor: '#064E3B', borderColor: '#065F46' }]}>
        <View style={styles.resultLeft}>
          <Text style={[styles.resultLabel, isDark && { color: '#6EE7B7' }]}>Calculated Milk Rate</Text>
          <Text style={[styles.resultRate, isDark && { color: '#34D399' }]}>{formatCurrency(calculatedRate)} <Text style={[styles.rateUnit, isDark && { color: '#6EE7B7' }]}>/ Litre</Text></Text>
        </View>

        <View style={[styles.divider, isDark && { backgroundColor: '#065F46' }]} />

        <View style={styles.breakdownCol}>
          <Text style={[styles.breakdownLine, { color: colors.textMedium }]}>
            Base: <Text style={[styles.bold, { color: colors.text }]}>{formatCurrency(config.baseRate)}</Text>
          </Text>
          <Text style={[styles.breakdownLine, fatAdjustment >= 0 ? (isDark ? { color: '#34D399' } : styles.plus) : styles.minus]}>
            Fat ({fatDiffSteps >= 0 ? '+' : ''}{(fatDiffSteps / 10).toFixed(1)}%): {fatAdjustment >= 0 ? '+' : ''}{formatCurrency(fatAdjustment)}
          </Text>
          <Text style={[styles.breakdownLine, snfAdjustment >= 0 ? (isDark ? { color: '#34D399' } : styles.plus) : styles.minus]}>
            SNF ({snfDiffSteps >= 0 ? '+' : ''}{(snfDiffSteps / 10).toFixed(1)}%): {snfAdjustment >= 0 ? '+' : ''}{formatCurrency(snfAdjustment)}
          </Text>
        </View>
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  subtitle: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.textDark,
    marginBottom: 4,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 4,
    height: 44,
  },
  stepBtn: {
    width: 26,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: ThemeColors.textDark,
    textAlign: 'center',
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  resultLeft: {
    flex: 1.2,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    textTransform: 'uppercase',
  },
  resultRate: {
    fontSize: 24,
    fontWeight: '900',
    color: '#065F46',
    marginTop: 2,
  },
  rateUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#A7F3D0',
    marginHorizontal: 10,
  },
  breakdownCol: {
    flex: 1,
    gap: 2,
  },
  breakdownLine: {
    fontSize: 11,
    color: ThemeColors.textMedium,
  },
  bold: {
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  plus: {
    color: '#059669',
    fontWeight: '600',
  },
  minus: {
    color: '#DC2626',
    fontWeight: '600',
  },
});
