import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, Share2 } from 'lucide-react-native';
import { Customer, MilkCollection } from '@/types';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/calculator';
import { isValidIndianPhone } from '@/utils/slip-generator';

interface RegisterCustomerCardProps {
  customer: Customer;
  entry?: MilkCollection;
  isDone: boolean;
  isPastDate?: boolean;
  sentSlipMap: { [key: string]: boolean };
  onPressCard: (customer: Customer) => void;
  onSendWhatsAppSlip: (entry: MilkCollection, customer: Customer) => void;
}

export const RegisterCustomerCard: React.FC<RegisterCustomerCardProps> = ({
  customer,
  entry,
  isDone,
  isPastDate,
  sentSlipMap,
  onPressCard,
  onSendWhatsAppSlip,
}) => {
  const { isDark, colors } = useAppTheme();
  const hasPhone = isValidIndianPhone(customer.phone);
  const isUnclickable = isDone || !!isPastDate;

  return (
    <TouchableOpacity
      style={[
        styles.farmerRowCard,
        isDone ? styles.farmerRowCardDone : styles.farmerRowCardPending,
        isDark && { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => {
        if (!isUnclickable) {
          onPressCard(customer);
        }
      }}
      disabled={isUnclickable}
      activeOpacity={isUnclickable ? 1 : 0.7}
    >
      {/* Left: Avatar Initial */}
      <View style={[styles.customerAvatar, isDone ? styles.avatarDone : styles.avatarPending]}>
        <Text style={[styles.avatarText, isDone ? styles.avatarTextDone : styles.avatarTextPending]}>
          {customer.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Center Content: ONLY Name + Clean Milk Data in a Single Row (fat, snf, qty, rate) */}
      <View style={styles.cardCenterCol}>
        <View style={styles.nameRow}>
          <Text style={[styles.farmerName, { color: colors.text }]} numberOfLines={1}>
            {customer.name}
          </Text>
          {customer.customer_type === 'BUYER' && (
            <View
              style={[
                styles.buyerBadge,
                isDark && { backgroundColor: 'rgba(217, 119, 6, 0.2)', borderColor: 'rgba(217, 119, 6, 0.35)' },
              ]}
            >
              <Text style={[styles.buyerBadgeText, isDark && { color: '#FBBF24' }]}>Buyer</Text>
            </View>
          )}
        </View>

        {/* Milk Data strictly in a single, non-wrapping row */}
        {isDone && entry ? (
          <View style={styles.metricsSingleRow}>
            <View style={[styles.qtyPill, isDark && { backgroundColor: colors.cardSecondary }]}>
              <Text style={[styles.qtyPillText, { color: colors.text }]}>{entry.quantity}L</Text>
            </View>
            {entry.fat > 0 && (
              <View style={[styles.qualityPill, isDark && { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                <Text style={[styles.qualityPillTextFat, { color: isDark ? '#93C5FD' : '#2563EB' }]}>
                  {entry.fat}F
                </Text>
              </View>
            )}
            {entry.snf > 0 && (
              <View style={[styles.qualityPill, isDark && { backgroundColor: 'rgba(5, 150, 105, 0.15)' }]}>
                <Text style={[styles.qualityPillTextSnf, { color: isDark ? '#6EE7B7' : '#059669' }]}>
                  {entry.snf}S
                </Text>
              </View>
            )}
            <Text style={[styles.rateText, { color: colors.textMuted }]}>
              @{Number(entry.rate).toFixed(1)}
            </Text>
          </View>
        ) : (
          <View style={styles.pendingPromptRow}>
            {isPastDate ? (
              <Text style={[styles.pendingPromptText, { color: colors.textMuted }]}>Not recorded</Text>
            ) : (
              <Text style={[styles.pendingPromptText, isDark && { color: '#FBBF24' }]}>Tap to record milk</Text>
            )}
          </View>
        )}
      </View>

      {/* Right Side: Total Amount & Share Icon side by side */}
      <View style={styles.cardRightCol}>
        {isDone && entry ? (
          <View style={styles.rightActionRow}>
            <Text style={styles.doneAmountText}>
              {formatCurrency(entry.amount)}
            </Text>
            {hasPhone && (
              <TouchableOpacity
                style={[
                  styles.shareIconBtn,
                  isDark && { backgroundColor: 'rgba(22, 163, 74, 0.2)', borderColor: 'rgba(34, 197, 94, 0.4)' },
                ]}
                onPress={() => onSendWhatsAppSlip(entry, customer)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Share2 size={13} color={isDark ? '#4ADE80' : '#16A34A'} />
              </TouchableOpacity>
            )}
          </View>
        ) : isPastDate ? (
          <Text style={[styles.emptyCellText, { color: colors.textMuted }]}>—</Text>
        ) : (
          <View style={styles.addBtnPill}>
            <Plus size={12} color="#D97706" />
            <Text style={styles.addBtnPillText}>Add</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  farmerRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  farmerRowCardDone: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  farmerRowCardPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  customerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarDone: {
    backgroundColor: '#ECFDF5',
  },
  avatarPending: {
    backgroundColor: '#FEF3C7',
  },
  avatarText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  avatarTextDone: {
    color: '#059669',
  },
  avatarTextPending: {
    color: '#D97706',
  },
  cardCenterCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  buyerBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FDE68A',
    alignSelf: 'center',
  },
  buyerBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricsSingleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 4,
  },
  qtyPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  qtyPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  qualityPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  qualityPillTextFat: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  qualityPillTextSnf: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  rateText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  pendingPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingPromptText: {
    fontSize: 11.5,
    color: '#D97706',
    fontWeight: '600',
  },
  cardRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  rightActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doneAmountText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#059669',
  },
  shareIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  emptyCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    paddingRight: 6,
  },
  addBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 3,
  },
  addBtnPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#D97706',
  },
});
