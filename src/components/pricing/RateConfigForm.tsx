import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { IndianRupee, Droplet, FlaskConical, ShieldAlert, Sparkles } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { RateChartConfig } from '@/utils/rate-chart';
import { sanitizeDecimalInput, formatCurrency } from '@/utils/calculator';

interface RateConfigFormProps {
  config: RateChartConfig;
  onChange: (updated: RateChartConfig) => void;
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeColor?: string;
  isEditing?: boolean;
}

export default function RateConfigForm({
  config,
  onChange,
  title,
  subtitle,
  badgeLabel,
  badgeColor = '#0F766E',
  isEditing = false,
}: RateConfigFormProps) {
  const { isDark, colors } = useAppTheme();

  // Local string state to allow natural decimal typing (e.g. "6." or "0.") without stripping the decimal point
  const [baseRateStr, setBaseRateStr] = React.useState<string>(config.baseRate > 0 ? String(config.baseRate) : '');
  const [baseFatStr, setBaseFatStr] = React.useState<string>(config.baseFat > 0 ? String(config.baseFat) : '');
  const [baseSNFStr, setBaseSNFStr] = React.useState<string>(config.baseSNF > 0 ? String(config.baseSNF) : '');
  const [fatStepRateStr, setFatStepRateStr] = React.useState<string>(config.fatStepRate > 0 ? String(config.fatStepRate) : '');
  const [snfStepRateStr, setSnfStepRateStr] = React.useState<string>(config.snfStepRate > 0 ? String(config.snfStepRate) : '');
  const [minRateStr, setMinRateStr] = React.useState<string>(config.minRate > 0 ? String(config.minRate) : '');

  // Reset/sync local strings whenever edit mode toggles or tab title changes
  React.useEffect(() => {
    setBaseRateStr(config.baseRate > 0 ? String(config.baseRate) : '');
    setBaseFatStr(config.baseFat > 0 ? String(config.baseFat) : '');
    setBaseSNFStr(config.baseSNF > 0 ? String(config.baseSNF) : '');
    setFatStepRateStr(config.fatStepRate > 0 ? String(config.fatStepRate) : '');
    setSnfStepRateStr(config.snfStepRate > 0 ? String(config.snfStepRate) : '');
    setMinRateStr(config.minRate > 0 ? String(config.minRate) : '');
  }, [isEditing, title]);

  // Sync from external config changes (e.g. Reset Defaults or Tab Switch) without wiping in-progress typing like "6."
  React.useEffect(() => {
    const curr = parseFloat(baseRateStr);
    if ((isNaN(curr) ? 0 : curr) !== config.baseRate && !baseRateStr.endsWith('.')) {
      setBaseRateStr(config.baseRate > 0 ? String(config.baseRate) : '');
    }
  }, [config.baseRate]);

  React.useEffect(() => {
    const curr = parseFloat(baseFatStr);
    if ((isNaN(curr) ? 0 : curr) !== config.baseFat && !baseFatStr.endsWith('.')) {
      setBaseFatStr(config.baseFat > 0 ? String(config.baseFat) : '');
    }
  }, [config.baseFat]);

  React.useEffect(() => {
    const curr = parseFloat(baseSNFStr);
    if ((isNaN(curr) ? 0 : curr) !== config.baseSNF && !baseSNFStr.endsWith('.')) {
      setBaseSNFStr(config.baseSNF > 0 ? String(config.baseSNF) : '');
    }
  }, [config.baseSNF]);

  React.useEffect(() => {
    const curr = parseFloat(fatStepRateStr);
    if ((isNaN(curr) ? 0 : curr) !== config.fatStepRate && !fatStepRateStr.endsWith('.')) {
      setFatStepRateStr(config.fatStepRate > 0 ? String(config.fatStepRate) : '');
    }
  }, [config.fatStepRate]);

  React.useEffect(() => {
    const curr = parseFloat(snfStepRateStr);
    if ((isNaN(curr) ? 0 : curr) !== config.snfStepRate && !snfStepRateStr.endsWith('.')) {
      setSnfStepRateStr(config.snfStepRate > 0 ? String(config.snfStepRate) : '');
    }
  }, [config.snfStepRate]);

  React.useEffect(() => {
    const curr = parseFloat(minRateStr);
    if ((isNaN(curr) ? 0 : curr) !== config.minRate && !minRateStr.endsWith('.')) {
      setMinRateStr(config.minRate > 0 ? String(config.minRate) : '');
    }
  }, [config.minRate]);

  const handleFieldChange = (field: keyof RateChartConfig, valStr: string, setStr: (s: string) => void) => {
    const cleaned = sanitizeDecimalInput(valStr);
    setStr(cleaned);
    const parsed = parseFloat(cleaned);
    onChange({
      ...config,
      [field]: isNaN(parsed) ? 0 : parsed,
    });
  };

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: badgeColor + '15' }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
            </View>
            <View style={[styles.modePill, isEditing ? styles.modePillEdit : [styles.modePillView, isDark && { backgroundColor: '#334155' }]]}>
              <Text style={[styles.modePillText, isEditing ? styles.modeTextEdit : [styles.modeTextView, isDark && { color: '#94A3B8' }]]}>
                {isEditing ? 'Editing Mode' : 'Read Only'}
              </Text>
            </View>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMedium }]}>{subtitle}</Text>
        </View>
      </View>

      {/* Section 1: Base Quality & Rate */}
      <View style={[styles.sectionBox, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
        <Text style={[styles.sectionHeader, { color: colors.text }]}>BASE QUALITY & RATE</Text>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          Reference quality standards for base milk pricing.
        </Text>

        {isEditing ? (
          /* Editable Inputs */
          <View>
            {/* Row 1: Base Rate (Hero Input) */}
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Base Milk Rate (₹ / Litre)</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <IndianRupee size={16} color={isDark ? '#34D399' : ThemeColors.primary} style={styles.fieldIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  keyboardType="decimal-pad"
                  value={baseRateStr}
                  placeholder="52.0"
                  placeholderTextColor={colors.textMuted}
                  onChangeText={(t) => handleFieldChange('baseRate', t, setBaseRateStr)}
                />
              </View>
            </View>

            {/* Row 2: Base Fat & SNF (2 Spacious Columns) */}
            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Base Fat (%)</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Droplet size={16} color="#D97706" style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    keyboardType="decimal-pad"
                    value={baseFatStr}
                    placeholder="6.0"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={(t) => handleFieldChange('baseFat', t, setBaseFatStr)}
                  />
                </View>
              </View>

              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Base SNF (%)</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <FlaskConical size={16} color="#2563EB" style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    keyboardType="decimal-pad"
                    value={baseSNFStr}
                    placeholder="8.5"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={(t) => handleFieldChange('baseSNF', t, setBaseSNFStr)}
                  />
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* Smart Readable Cards (View Mode) */
          <View>
            {/* Hero Base Rate Card */}
            <View style={[styles.heroCard, isDark && { backgroundColor: '#064E3B', borderColor: '#065F46' }]}>
              <View>
                <View style={styles.viewCardTopRow}>
                  <IndianRupee size={15} color={isDark ? '#34D399' : ThemeColors.primary} />
                  <Text style={[styles.viewCardLabel, { color: isDark ? '#A7F3D0' : '#065F46' }]}>Base Milk Rate</Text>
                </View>
                <Text style={[styles.viewCardSub, isDark && { color: '#6EE7B7' }]}>standard purchase rate</Text>
              </View>
              <Text style={[styles.heroCardLargeVal, { color: isDark ? '#34D399' : '#065F46' }]}>
                {formatCurrency(config.baseRate)} <Text style={{ fontSize: 12, fontWeight: '600' }}>/ L</Text>
              </Text>
            </View>

            {/* Base Fat & SNF Standards (2 Columns) */}
            <View style={styles.row}>
              <View style={[styles.viewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.viewCardTopRow}>
                  <Droplet size={15} color="#D97706" />
                  <Text style={[styles.viewCardLabel, { color: colors.textMedium }]}>Base Fat</Text>
                </View>
                <Text style={[styles.viewCardLargeVal, { color: '#D97706' }]}>{config.baseFat.toFixed(1)}%</Text>
                <Text style={[styles.viewCardSub, { color: colors.textMuted }]}>standard reference</Text>
              </View>

              <View style={[styles.viewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.viewCardTopRow}>
                  <FlaskConical size={15} color="#2563EB" />
                  <Text style={[styles.viewCardLabel, { color: colors.textMedium }]}>Base SNF</Text>
                </View>
                <Text style={[styles.viewCardLargeVal, { color: '#2563EB' }]}>{config.baseSNF.toFixed(1)}%</Text>
                <Text style={[styles.viewCardSub, { color: colors.textMuted }]}>standard reference</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Section 2: Rate Adjustment (Per 0.1%) */}
      <View style={[styles.sectionBox, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
        <Text style={[styles.sectionHeader, { color: colors.text }]}>RATE ADJUSTMENT (PER 0.1%)</Text>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          Rate added or deducted for every 0.1% deviation from base quality.
        </Text>

        {isEditing ? (
          /* Editable Inputs */
          <View>
            {/* Row 1: Fat & SNF Adjustment (2 Clean Columns, NO redundant "per 0.1%" in labels) */}
            <View style={[styles.row, { marginBottom: 10 }]}>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Fat Rate (₹)</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Droplet size={16} color="#D97706" style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    keyboardType="decimal-pad"
                    value={fatStepRateStr}
                    placeholder="0.65"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={(t) => handleFieldChange('fatStepRate', t, setFatStepRateStr)}
                  />
                </View>
              </View>

              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>SNF Rate (₹)</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <FlaskConical size={16} color="#2563EB" style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    keyboardType="decimal-pad"
                    value={snfStepRateStr}
                    placeholder="0.35"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={(t) => handleFieldChange('snfStepRate', t, setSnfStepRateStr)}
                  />
                </View>
              </View>
            </View>

            {/* Row 2: Minimum Floor Rate (Full width, spacious & clear) */}
            <View>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Minimum Floor Rate (₹)</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ShieldAlert size={16} color="#DC2626" style={styles.fieldIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  keyboardType="decimal-pad"
                  value={minRateStr}
                  placeholder="20.0"
                  placeholderTextColor={colors.textMuted}
                  onChangeText={(t) => handleFieldChange('minRate', t, setMinRateStr)}
                />
              </View>
            </View>
          </View>
        ) : (
          /* Smart Readable Cards (View Mode) */
          <View>
            {/* Row 1: Fat & SNF Cards (2 Spacious Columns) */}
            <View style={[styles.row, { marginBottom: 8 }]}>
              <View style={[styles.viewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.viewCardTopRow}>
                  <Droplet size={15} color="#D97706" />
                  <Text style={[styles.viewCardLabel, { color: colors.textMedium }]}>Fat Rate</Text>
                </View>
                <Text style={[styles.viewCardLargeVal, { color: colors.text }]}>+{formatCurrency(config.fatStepRate)}</Text>
                <Text style={[styles.viewCardSub, { color: colors.textMuted }]}>per 0.1% step</Text>
              </View>

              <View style={[styles.viewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.viewCardTopRow}>
                  <FlaskConical size={15} color="#2563EB" />
                  <Text style={[styles.viewCardLabel, { color: colors.textMedium }]}>SNF Rate</Text>
                </View>
                <Text style={[styles.viewCardLargeVal, { color: colors.text }]}>+{formatCurrency(config.snfStepRate)}</Text>
                <Text style={[styles.viewCardSub, { color: colors.textMuted }]}>per 0.1% step</Text>
              </View>
            </View>

            {/* Row 2: Minimum Price Floor Card */}
            <View style={[styles.floorBanner, isDark && { backgroundColor: '#450A0A', borderColor: '#991B1B' }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={styles.viewCardTopRow}>
                  <ShieldAlert size={14} color="#DC2626" />
                  <Text style={[styles.viewCardLabel, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>Minimum Floor Rate</Text>
                </View>
                <Text style={[styles.viewCardSub, isDark && { color: '#F87171' }]}>Guaranteed lowest milk price</Text>
              </View>
              <Text style={[styles.heroCardLargeVal, { color: isDark ? '#F87171' : '#DC2626' }]}>
                {formatCurrency(config.minRate)} <Text style={{ fontSize: 11, fontWeight: '600' }}>/ L</Text>
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
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
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modePillView: {
    backgroundColor: '#F1F5F9',
  },
  modePillEdit: {
    backgroundColor: '#FEF3C7',
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modeTextView: {
    color: '#64748B',
  },
  modeTextEdit: {
    color: '#D97706',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  subtitle: {
    fontSize: 12,
    color: ThemeColors.textMedium,
    marginTop: 2,
  },
  sectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: ThemeColors.textDark,
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 11,
    color: ThemeColors.textMuted,
    marginBottom: 12,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.textDark,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
  },
  fieldIcon: {
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: ThemeColors.textDark,
    paddingVertical: 0,
  },
  microHint: {
    fontSize: 10,
    color: ThemeColors.textMuted,
    marginTop: 3,
  },
  viewCardsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  viewCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewCardHighlight: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  viewCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  viewCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.textMedium,
  },
  viewCardLargeVal: {
    fontSize: 16,
    fontWeight: '900',
    color: ThemeColors.textDark,
  },
  viewCardSub: {
    fontSize: 10,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCardLargeVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#065F46',
  },
  floorBanner: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
