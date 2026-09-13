import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MilkDispatch } from '@/types';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/calculator';

interface RegisterDispatchReceiptModalProps {
  visible: boolean;
  dispatch: MilkDispatch | null;
  onClose: () => void;
  onShareWhatsApp: () => void;
}

export const RegisterDispatchReceiptModal: React.FC<RegisterDispatchReceiptModalProps> = ({
  visible,
  dispatch,
  onClose,
  onShareWhatsApp,
}) => {
  const { isDark, colors } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.receiptModalCard, { backgroundColor: colors.modalBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.receiptHeader}>
            <View style={{ alignItems: 'center', width: '100%' }}>
              <Text style={{ fontSize: 24 }}>🥛</Text>
              <Text style={[styles.receiptDairyName, { color: colors.text }]}>DOODH KHATA DAIRY</Text>
              <Text style={styles.receiptSlipTitle}>MILK DISPATCH VOUCHER (दूध रवानगी पर्ची)</Text>
              <View style={styles.receiptStatusPill}>
                <Text style={styles.receiptStatusText}>CLOSED & VERIFIED</Text>
              </View>
            </View>
          </View>

          {/* Slip Details Table */}
          {dispatch && (
            <ScrollView style={{ maxHeight: 380, marginVertical: 12 }}>
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptRowLabel, { color: colors.textMedium }]}>Date & Shift:</Text>
                <Text style={[styles.receiptRowVal, { color: colors.text }]}>
                  {dispatch.date} • {dispatch.session}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptRowLabel, { color: colors.textMedium }]}>Dispatched At:</Text>
                <Text style={[styles.receiptRowVal, { color: colors.text }]}>
                  {dispatch.dispatched_at
                    ? new Date(dispatch.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'N/A'}
                </Text>
              </View>

              <View style={[styles.receiptDivider, isDark && { backgroundColor: colors.border }]} />

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptRowLabel, { color: colors.textMedium }]}>Total Farmer Milk:</Text>
                <Text style={[styles.receiptRowVal, { color: colors.text }]}>{dispatch.total_collected_litres.toFixed(1)} L</Text>
              </View>

              {dispatch.local_sales_litres > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptRowLabel, { color: colors.textMedium }]}>Local Retail Sales:</Text>
                  <Text style={[styles.receiptRowVal, { color: '#D97706' }]}>
                    -{dispatch.local_sales_litres.toFixed(1)} L
                  </Text>
                </View>
              )}

              <View style={[styles.receiptRow, { backgroundColor: isDark ? colors.cardSecondary : '#F1F5F9', padding: 6, borderRadius: 6 }]}>
                <Text style={[styles.receiptRowLabel, { fontWeight: '800', color: colors.text }]}>
                  Net Dispatched Milk:
                </Text>
                <Text style={[styles.receiptRowVal, { fontWeight: '800', color: '#2563EB', fontSize: 16 }]}>
                  {dispatch.dispatched_litres.toFixed(1)} Litres
                </Text>
              </View>

              <View style={[styles.receiptDivider, isDark && { backgroundColor: colors.border }]} />

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptRowLabel, { color: colors.textMedium }]}>Vehicle Bulk Fat %:</Text>
                <Text style={[styles.receiptRowVal, { color: colors.text }]}>{dispatch.fat}%</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptRowLabel, { color: colors.textMedium }]}>Vehicle Bulk SNF %:</Text>
                <Text style={[styles.receiptRowVal, { color: colors.text }]}>{dispatch.snf}%</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptRowLabel, { color: colors.textMedium }]}>Plant Dispatch Rate:</Text>
                <Text style={[styles.receiptRowVal, { color: colors.text }]}>
                  {dispatch.rate && dispatch.rate > 0
                    ? `₹${dispatch.rate.toFixed(2)} / Litre`
                    : 'Pending'}
                </Text>
              </View>

              <View style={[styles.receiptDivider, isDark && { backgroundColor: colors.border }]} />

              <View style={[styles.receiptRow, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', padding: 8, borderRadius: 8 }]}>
                <Text style={[styles.receiptRowLabel, { fontWeight: '900', color: isDark ? '#34D399' : '#065F46' }]}>
                  Total Dispatch Value:
                </Text>
                <Text style={[styles.receiptRowVal, { fontWeight: '900', color: '#059669', fontSize: 18 }]}>
                  {dispatch.amount && dispatch.amount > 0
                    ? formatCurrency(dispatch.amount)
                    : 'Pending'}
                </Text>
              </View>

              <View style={[styles.receiptDivider, isDark && { backgroundColor: colors.border }]} />

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptRowLabel, { color: colors.textMedium }]}>Number of Cans:</Text>
                <Text style={[styles.receiptRowVal, { color: colors.text }]}>{dispatch.can_count || 'N/A'}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptRowLabel, { color: colors.textMedium }]}>Vehicle Number:</Text>
                <Text style={[styles.receiptRowVal, { color: colors.text }]}>{dispatch.vehicle_number || 'N/A'}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={[styles.receiptRowLabel, { color: colors.textMedium }]}>Driver Name:</Text>
                <Text style={[styles.receiptRowVal, { color: colors.text }]}>{dispatch.driver_name || 'N/A'}</Text>
              </View>
            </ScrollView>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              style={[
                styles.receiptCloseBtn,
                { backgroundColor: colors.cardSecondary, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.receiptCloseText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.receiptWhatsAppBtn}
              onPress={onShareWhatsApp}
              activeOpacity={0.8}
            >
              <Text style={styles.receiptWhatsAppText}>Share WhatsApp 💬</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiptModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  receiptHeader: {
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: ThemeColors.border,
    borderStyle: 'dashed',
    paddingBottom: 10,
  },
  receiptDairyName: {
    fontSize: 16,
    fontWeight: '900',
    color: ThemeColors.textDark,
    letterSpacing: 1,
    marginTop: 4,
  },
  receiptSlipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  receiptStatusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  receiptStatusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  receiptRowLabel: {
    fontSize: 12,
    color: ThemeColors.textMedium,
  },
  receiptRowVal: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  receiptCloseBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: ThemeColors.textMedium,
  },
  receiptWhatsAppBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptWhatsAppText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
