import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';

interface RegisterFilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: 'ALL' | 'PENDING' | 'RECORDED';
  setStatusFilter: React.Dispatch<React.SetStateAction<'ALL' | 'PENDING' | 'RECORDED'>>;
  customerTypeFilter: 'ALL' | 'SELLER' | 'BUYER';
  setCustomerTypeFilter: (filter: 'ALL' | 'SELLER' | 'BUYER') => void;
  totalActiveCount: number;
  totalSellerCount: number;
  totalBuyerCount: number;
  pendingCount: number;
  recordedCount: number;
}

export const RegisterFilterBar: React.FC<RegisterFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  customerTypeFilter,
  setCustomerTypeFilter,
  totalActiveCount,
  totalSellerCount,
  totalBuyerCount,
  pendingCount,
  recordedCount,
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.filterBarContainer}>
      {/* Quick Search Box */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={14} color={colors.textMedium} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={14} color={colors.textMedium} />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Scrollable Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterPillsRow}
      >
        {/* Customer Type Pills */}
        <TouchableOpacity
          style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }, customerTypeFilter === 'ALL' && styles.pillActive]}
          onPress={() => setCustomerTypeFilter('ALL')}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, { color: colors.text }, customerTypeFilter === 'ALL' && styles.pillTextActive]}>
            All ({totalActiveCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }, customerTypeFilter === 'SELLER' && styles.pillActiveSeller]}
          onPress={() => setCustomerTypeFilter('SELLER')}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, { color: colors.text }, customerTypeFilter === 'SELLER' && styles.pillTextActiveSeller]}>
            Farmers ({totalSellerCount})
          </Text>
        </TouchableOpacity>

        {totalBuyerCount > 0 && (
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }, customerTypeFilter === 'BUYER' && styles.pillActiveBuyer]}
            onPress={() => setCustomerTypeFilter('BUYER')}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: colors.text }, customerTypeFilter === 'BUYER' && styles.pillTextActiveBuyer]}>
              Buyers ({totalBuyerCount})
            </Text>
          </TouchableOpacity>
        )}

        {/* Subtle Divider */}
        <View style={[styles.pillDivider, { backgroundColor: colors.border }]} />

        {/* Status Filter Pills */}
        <TouchableOpacity
          style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }, statusFilter === 'PENDING' && styles.pillActiveWarning]}
          onPress={() => setStatusFilter((prev) => (prev === 'PENDING' ? 'ALL' : 'PENDING'))}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, { color: colors.text }, statusFilter === 'PENDING' && styles.pillTextActiveWarning]}>
            ⚠️ Pending ({pendingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }, statusFilter === 'RECORDED' && styles.pillActiveSuccess]}
          onPress={() => setStatusFilter((prev) => (prev === 'RECORDED' ? 'ALL' : 'RECORDED'))}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, { color: colors.text }, statusFilter === 'RECORDED' && styles.pillTextActiveSuccess]}>
            ✓ Done ({recordedCount})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  filterBarContainer: {
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: ThemeColors.textDark,
    marginLeft: 6,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  pillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  pillActiveSeller: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  pillActiveBuyer: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  pillActiveWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  pillActiveSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: ThemeColors.textMedium,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextActiveSeller: {
    color: '#FFFFFF',
  },
  pillTextActiveBuyer: {
    color: '#FFFFFF',
  },
  pillTextActiveWarning: {
    color: '#B45309',
  },
  pillTextActiveSuccess: {
    color: '#065F46',
  },
  pillDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 2,
  },
});
