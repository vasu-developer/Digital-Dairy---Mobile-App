import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Plus,
  ChevronRight,
  Filter,
  Droplet,
  BookOpen,
  Edit3,
  UserCheck,
  UserX,
  PauseCircle,
  RotateCcw,
} from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { formatCurrency } from '@/utils/calculator';
import { Customer } from '@/types';

export default function CustomersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const { customers, getCustomerBalance, updateCustomer } = useRepository();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SELLER' | 'BUYER'>('ALL');

  const activeCustomersList = customers.filter((c) => c.status !== 'INACTIVE');
  const inactiveCustomersList = customers.filter((c) => c.status === 'INACTIVE');
  const currentList = filterType === 'ACTIVE' ? activeCustomersList : inactiveCustomersList;

  const activeCount = activeCustomersList.length;
  const pausedCount = inactiveCustomersList.length;
  const sellersCount = currentList.filter((c) => (c.customer_type || 'SELLER') === 'SELLER').length;
  const buyersCount = currentList.filter((c) => c.customer_type === 'BUYER').length;

  const filteredCustomers = currentList.filter((cust) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      cust.name.toLowerCase().includes(query) ||
      (cust.village && cust.village.toLowerCase().includes(query)) ||
      (cust.phone && cust.phone.includes(query)) ||
      (cust.farmer_code && String(cust.farmer_code).includes(query));
    const matchesRole = roleFilter === 'ALL' || (cust.customer_type || 'SELLER') === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleReactivate = (cust: Customer) => {
    Alert.alert(
      'Reactivate Farmer',
      `Do you want to reactivate ${cust.name}? They will be moved to the Active Farmers register and will appear in daily collection lists.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            try {
              await updateCustomer({ ...cust, status: 'ACTIVE' });
            } catch (e) {
              console.warn('Reactivate error:', e);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top + 8, 16), backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Farmers Register</Text>
          <Text style={[styles.pageSub, { color: colors.textMedium }]}>
            {activeCount} Active • {pausedCount} Inactive
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtnCircle}
          onPress={() => router.push('/add-customer')}
          activeOpacity={0.8}
        >
          <Plus size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentPadding}>
        {/* Status Tab Switcher: Active Farmers vs Inactive Farmers */}
        <View style={[styles.statusSegmentWrap, { backgroundColor: isDark ? colors.cardSecondary : '#F1F5F9' }]}>
          <TouchableOpacity
            style={[
              styles.statusSegmentBtn,
              filterType === 'ACTIVE' && [
                styles.statusSegmentBtnActive,
                { backgroundColor: isDark ? colors.card : '#FFFFFF' },
              ],
            ]}
            onPress={() => setFilterType('ACTIVE')}
            activeOpacity={0.8}
          >
            <UserCheck
              size={15}
              color={filterType === 'ACTIVE' ? (isDark ? '#34D399' : '#059669') : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.statusSegmentText,
                { color: filterType === 'ACTIVE' ? (isDark ? '#34D399' : '#059669') : colors.textMuted },
                filterType === 'ACTIVE' && { fontWeight: '800' },
              ]}
            >
              Active ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusSegmentBtn,
              filterType === 'INACTIVE' && [
                styles.statusSegmentBtnActive,
                { backgroundColor: isDark ? colors.card : '#FFFFFF' },
              ],
            ]}
            onPress={() => setFilterType('INACTIVE')}
            activeOpacity={0.8}
          >
            <UserX
              size={15}
              color={filterType === 'INACTIVE' ? (isDark ? '#F87171' : '#DC2626') : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.statusSegmentText,
                { color: filterType === 'INACTIVE' ? (isDark ? '#F87171' : '#DC2626') : colors.textMuted },
                filterType === 'INACTIVE' && { fontWeight: '800' },
              ]}
            >
              Inactive ({pausedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={filterType === 'ACTIVE' ? 'Search active farmer by name, village or phone...' : 'Search inactive farmer...'}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Filter size={18} color={colors.textMuted} />
        </View>

        {/* Filter Pills: Role Filter */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }, roleFilter === 'ALL' && styles.pillActive]}
            onPress={() => setRoleFilter('ALL')}
          >
            <Text style={[styles.pillText, { color: colors.text }, roleFilter === 'ALL' && styles.pillTextActive]}>
              All ({currentList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }, roleFilter === 'SELLER' && { backgroundColor: '#059669', borderColor: '#059669' }]}
            onPress={() => setRoleFilter(roleFilter === 'SELLER' ? 'ALL' : 'SELLER')}
          >
            <Text style={[styles.pillText, { color: colors.text }, roleFilter === 'SELLER' && { color: '#FFF' }]}>
              Farmers ({sellersCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }, roleFilter === 'BUYER' && { backgroundColor: '#D97706', borderColor: '#D97706' }]}
            onPress={() => setRoleFilter(roleFilter === 'BUYER' ? 'ALL' : 'BUYER')}
          >
            <Text style={[styles.pillText, { color: colors.text }, roleFilter === 'BUYER' && { color: '#FFF' }]}>
              Buyers ({buyersCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Customer List */}
      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            {filterType === 'INACTIVE' ? (
              <>
                <View style={[styles.emptyStateIconCircle, { backgroundColor: isDark ? colors.cardSecondary : '#F1F5F9' }]}>
                  <PauseCircle size={36} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Inactive Farmers</Text>
                <Text style={[styles.emptyStateSub, { color: colors.textMuted }]}>
                  {searchQuery ? `No inactive farmers matching "${searchQuery}".` : 'All registered farmers and buyers are currently active.'}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 36 }}>🐄</Text>
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No active farmers found</Text>
                <Text style={[styles.emptyStateSub, { color: colors.textMuted }]}>
                  {searchQuery ? `No farmer matching "${searchQuery}" in register.` : 'Start by adding your first milk supplier.'}
                </Text>
                <TouchableOpacity
                  style={styles.addEmptyBtn}
                  onPress={() => router.push('/add-customer')}
                >
                  <Plus size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.addEmptyBtnText}>Register New Farmer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          filteredCustomers.map((cust) => {
            const isBuyer = cust.customer_type === 'BUYER';
            const balInfo = getCustomerBalance(cust.id);
            const isInactive = cust.status === 'INACTIVE';

            return (
              <View key={cust.id} style={[styles.customerCard, { backgroundColor: colors.card, borderColor: colors.border }, isInactive && styles.cardInactive]}>
                <TouchableOpacity
                  style={styles.cardHeaderRow}
                  onPress={() => router.push(`/customer/${cust.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {cust.farmer_code && (
                        <View style={{ backgroundColor: isDark ? colors.cardSecondary : '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>#{cust.farmer_code}</Text>
                        </View>
                      )}
                      <Text style={[styles.custName, { color: colors.text }]}>{cust.name}</Text>
                      {isBuyer ? (
                        <View style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: isDark ? 'rgba(217, 119, 6, 0.35)' : '#FDE68A' }}>
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? '#FBBF24' : '#D97706', textTransform: 'uppercase', letterSpacing: 0.3 }}>Buyer</Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0' }}>
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? '#34D399' : '#059669', textTransform: 'uppercase', letterSpacing: 0.3 }}>Farmer</Text>
                        </View>
                      )}
                      {isInactive && (
                        <View style={[styles.inactiveTag, isDark && { backgroundColor: 'rgba(220, 38, 38, 0.2)' }]}>
                          <Text style={[styles.inactiveTagText, isDark && { color: '#F87171' }]}>Paused</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.custVillage, { color: colors.textMuted }]}>
                      {cust.phone ? `${cust.phone} • ` : ''}
                      {cust.village || ""}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
                    <Text
                      style={[
                        styles.balanceVal,
                        { color: isBuyer ? '#D97706' : (balInfo.payableBalance >= 0 ? '#16A34A' : '#DC2626') },
                      ]}
                    >
                      {formatCurrency(balInfo.payableBalance)}
                    </Text>
                    <Text style={[styles.balanceSub, { color: colors.textMuted }]}>{isBuyer ? 'Due / Owes' : 'Payable'}</Text>
                  </View>

                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Card Action Bar */}
                <View style={[styles.cardActionsRow, { borderTopColor: colors.border }]}>
                  {isInactive ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionChipReactivate, isDark && { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.3)' }]}
                        onPress={() => handleReactivate(cust)}
                        activeOpacity={0.7}
                      >
                        <RotateCcw size={13} color="#059669" style={{ marginRight: 4 }} />
                        <Text style={[styles.actionChipReactivateText, { color: isDark ? '#34D399' : '#059669' }]}>Reactivate</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionChipSecondary, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                        onPress={() => router.push(`/ledger/${cust.id}`)}
                      >
                        <BookOpen size={13} color="#2563EB" style={{ marginRight: 4 }} />
                        <Text style={styles.actionChipSecondaryText}>Ledger</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionChipMuted, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                        onPress={() => router.push({ pathname: '/edit-customer/[id]', params: { id: cust.id } })}
                      >
                        <Edit3 size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={[styles.actionChipMutedText, { color: colors.textMuted }]}>Edit</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.actionChipPrimary, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                        onPress={() => router.push(`/customer/calendar/${cust.id}`)}
                      >
                        <Droplet size={14} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.actionChipPrimaryText, { color: colors.primary }]}>Milk Entry</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionChipSecondary, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                        onPress={() => router.push(`/ledger/${cust.id}`)}
                      >
                        <BookOpen size={14} color="#2563EB" style={{ marginRight: 4 }} />
                        <Text style={styles.actionChipSecondaryText}>Ledger</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Active List Bottom Shortcut to Inactive List */}
        {filterType === 'ACTIVE' && pausedCount > 0 && !searchQuery && (
          <TouchableOpacity
            style={[styles.inactiveShortcutBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setFilterType('INACTIVE')}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.inactiveShortcutIcon, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
                <PauseCircle size={16} color="#D97706" />
              </View>
              <View>
                <Text style={[styles.inactiveShortcutTitle, { color: colors.text }]}>
                  {pausedCount} Inactive {pausedCount === 1 ? 'Supplier' : 'Suppliers'}
                </Text>
                <Text style={[styles.inactiveShortcutSub, { color: colors.textMuted }]}>
                  Separated in the Inactive list
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={[styles.inactiveShortcutActionText, { color: colors.primary }]}>View List</Text>
              <ChevronRight size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.bgMain,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  pageTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  pageSub: {
    fontSize: 13,
    color: ThemeColors.textMedium,
  },
  addBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentPadding: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statusSegmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  statusSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  statusSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusSegmentText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: ThemeColors.textMedium,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: ThemeColors.textDark,
    marginHorizontal: 8,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  pillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: ThemeColors.textMedium,
  },
  pillTextActive: {
    color: '#FFF',
  },
  scrollList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  customerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardInactive: {
    opacity: 0.85,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: ThemeColors.primary,
  },
  custName: {
    fontSize: 17,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  custVillage: {
    fontSize: 13,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  inactiveTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inactiveTagText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  balanceVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  balanceSub: {
    fontSize: 11.5,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionChipPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  actionChipPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
  actionChipSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  actionChipSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  actionChipMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  actionChipMutedText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: ThemeColors.textMedium,
  },
  actionChipReactivate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  actionChipReactivateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
    marginTop: 10,
  },
  emptyStateSub: {
    fontSize: 13,
    color: ThemeColors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  addEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  addEmptyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  inactiveShortcutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  inactiveShortcutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveShortcutTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  inactiveShortcutSub: {
    fontSize: 11.5,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  inactiveShortcutActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.primary,
  },
});
