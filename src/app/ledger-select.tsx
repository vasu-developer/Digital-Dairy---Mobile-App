import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, BookOpen } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { formatCurrency } from '@/utils/calculator';

export default function LedgerSelectScreen() {
  const router = useRouter();
  const { isDark, colors } = useAppTheme();
  const { customers, getCustomerBalance } = useRepository();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Customer Ledger</Text>
        <Text style={[styles.pageSub, { color: colors.textMedium }]}>Select customer to view Ledger</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
        {customers.map((cust) => {
          const balInfo = getCustomerBalance(cust.id);
          const initials = cust.name
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
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.custName, { color: colors.text }]}>{cust.name}</Text>
                  {cust.customer_type === 'BUYER' ? (
                    <View style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: isDark ? 'rgba(217, 119, 6, 0.35)' : '#FDE68A' }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? '#FBBF24' : '#D97706', textTransform: 'uppercase', letterSpacing: 0.3 }}>Buyer</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0' }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? '#34D399' : '#059669', textTransform: 'uppercase', letterSpacing: 0.3 }}>Farmer</Text>
                    </View>
                  )}
                </View>
                {cust.village ? <Text style={[styles.custSub, { color: colors.textMuted }]}>{cust.village}</Text> : null}
              </View>

              <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                <Text
                  style={[
                    styles.balanceVal,
                    { color: cust.customer_type === 'BUYER' ? (isDark ? '#FBBF24' : '#D97706') : (balInfo.payableBalance >= 0 ? (isDark ? '#34D399' : '#16A34A') : (isDark ? '#F87171' : '#DC2626')) },
                  ]}
                >
                  {formatCurrency(balInfo.payableBalance)}
                </Text>
                <Text style={[styles.balanceSub, { color: colors.textMuted }]}>{cust.customer_type === 'BUYER' ? 'Due / Owes' : 'Payable'}</Text>
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
    fontSize: 12.5,
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
    fontSize: 12.5,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  balanceVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  balanceSub: {
    fontSize: 11,
    color: ThemeColors.textMuted,
  },
});
