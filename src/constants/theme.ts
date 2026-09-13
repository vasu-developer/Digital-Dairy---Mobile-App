import { Dimensions, Platform } from 'react-native';

export const ThemeColors = {
  primary: '#0F766E', // Dark Emerald
  primaryLight: '#059669', // Vibrant Green for action buttons
  primarySubtle: '#D1FAE5', // Soft green pill background
  primaryText: '#065F46',

  // Status & Transaction
  credit: '#16A34A', // Green + Money In
  creditBg: '#DCFCE7',
  debit: '#DC2626', // Red - Money Out
  debitBg: '#FEE2E2',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',

  // Neutrals
  bgMain: '#F8FAFC',
  cardBg: '#FFFFFF',
  textDark: '#0F172A',
  textMedium: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderDark: '#CBD5E1',

  // Nav
  navBg: '#FFFFFF',
  navActive: '#059669',
  navInactive: '#64748B',
};

export const Colors = {
  light: {
    text: '#0F172A',
    textMedium: '#475569',
    textMuted: '#94A3B8',
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardSecondary: '#F8FAFC',
    inputBg: '#FFFFFF',
    inputBorder: '#CBD5E1',
    modalBg: '#FFFFFF',
    headerBg: '#FFFFFF',
    tableHeader: '#F8FAFC',
    badgeBg: '#F1F5F9',
    primary: '#0F766E',
    primaryLight: '#059669',
    primarySubtle: '#D1FAE5',
    border: '#E2E8F0',
    borderSubtle: '#F1F5F9',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    navBg: '#FFFFFF',
    navBorder: '#E2E8F0',
    navActive: '#059669',
    navInactive: '#64748B',
    credit: '#16A34A',
    creditBg: '#DCFCE7',
    debit: '#DC2626',
    debitBg: '#FEE2E2',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
  },
  dark: {
    text: '#F8FAFC',
    textMedium: '#94A3B8',
    textMuted: '#64748B',
    background: '#0B1120',
    card: '#1E293B',
    cardSecondary: '#0F172A',
    inputBg: '#1E293B',
    inputBorder: '#334155',
    modalBg: '#1E293B',
    headerBg: '#0F172A',
    tableHeader: '#0F172A',
    badgeBg: '#1E293B',
    primary: '#10B981',
    primaryLight: '#34D399',
    primarySubtle: '#064E3B',
    border: '#334155',
    borderSubtle: '#1E293B',
    backgroundElement: '#1E293B',
    backgroundSelected: '#334155',
    textSecondary: '#94A3B8',
    navBg: '#0F172A',
    navBorder: '#1E293B',
    navActive: '#10B981',
    navInactive: '#64748B',
    credit: '#22C55E',
    creditBg: '#052E16',
    debit: '#EF4444',
    debitBg: '#450A0A',
    warning: '#FBBF24',
    warningBg: '#451A03',
  },
};

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'Manrope_500Medium',
    bold: 'Manrope_700Bold',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'Manrope_500Medium',
    bold: 'Manrope_700Bold',
    mono: 'monospace',
  },
  default: {
    sans: 'Manrope, sans-serif',
    bold: 'Manrope, sans-serif',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

const { width } = Dimensions.get('window');
export const isTablet = width >= 768;
export const MaxContentWidth = isTablet ? 1024 : 600;
