import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { formatCurrency } from '@/utils/calculator';

export default function LedgerSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const repo = useRepository();
  const customers = repo?.customers || [];
  const getCustomerBalance = repo?.getCustomerBalance;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top + 8, 16), backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Money Ledger</Text>
        <Text style={[styles.pageSub, { color: colors.textMedium }]}>Select customer to view financial transactions & balance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
        {/* Dedicated Milk Dispatch & Plant Ledger Card */}
        <TouchableOpacity
          style={[styles.dispatchLedgerCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/dispatch/calendar')}
          activeOpacity={0.8}
        >
          <View style={[styles.dispatchIconBox, isDark && { backgroundColor: colors.cardSecondary }]}>
            <Text style={{ fontSize: 20 }}>🚚</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.dispatchCardTitle, { color: colors.text }]}>Milk Dispatch Ledger</Text>
              <View style={styles.supervisorBadge}>
                <Text style={styles.supervisorBadgeText}>Plant / Supervisor</Text>
              </View>
            </View>
            <Text style={[styles.dispatchCardSub, { color: colors.textMedium }]}>Shift dispatches, bulk quality & rate entries</Text>
          </View>
          <ChevronRight size={18} color="#2563EB" />
        </TouchableOpacity>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>Customer Ledgers</Text>

        {customers.map((cust) => {
          if (!cust) return null;
          const balInfo = getCustomerBalance ? getCustomerBalance(cust.id) : { payableBalance: 0 };
          const payableBalance = balInfo?.payableBalance || 0;

          const initials = (cust.name || 'CU')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <TouchableOpacity
              key={cust.id}
              style={[styles.custCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/ledger/${cust.id}`)}
            >
              <View style={[styles.avatarBox, isDark && { backgroundColor: colors.cardSecondary }]}>
                <Text style={[styles.avatarText, { color: colors.text }]}>{initials}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.custName, { color: colors.text }]}>{cust.name}</Text>
                {cust.village ? <Text style={[styles.custSub, { color: colors.textMuted }]}>{cust.village}</Text> : null}
              </View>

              <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                <Text
                  style={[
                    styles.balanceVal,
                    { color: payableBalance >= 0 ? '#16A34A' : '#DC2626' },
                  ]}
                >
                  {formatCurrency(payableBalance)}
                </Text>
                <Text style={[styles.balanceSub, { color: colors.textMuted }]}>Payable Balance</Text>
              </View>

              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  pageSub: {
    fontSize: 12,
    color: ThemeColors.textMedium,
  },
  scrollList: {
    padding: 16,
    paddingBottom: 40,
  },
  custCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 10,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  custName: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  custSub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  balanceVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  balanceSub: {
    fontSize: 10,
    color: ThemeColors.textMuted,
  },
  dispatchLedgerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  dispatchIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dispatchCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E40AF',
  },
  supervisorBadge: {
    backgroundColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  supervisorBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  dispatchCardSub: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: ThemeColors.textMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
});
