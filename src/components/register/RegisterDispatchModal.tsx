import React, { RefObject } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { X, Truck, Droplet, FlaskConical, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { sanitizeDecimalInput } from '@/utils/calculator';

interface RegisterDispatchModalProps {
  visible: boolean;
  isShiftClosed: boolean;
  selectedSession: 'MORNING' | 'EVENING';
  selectedDateStr: string;
  currentSessionLitres: number;
  totalSellerLitres: number;
  totalBuyerLitres: number;
  dispatchFatStr: string;
  dispatchSnfStr: string;
  dispatchRateStr?: string;
  setDispatchRateStr?: (val: string) => void;
  autoCalculate?: boolean;
  dispatchFatRef: RefObject<TextInput | null>;
  dispatchSnfRef: RefObject<TextInput | null>;
  onDispatchFatSnfChange: (fat: string, snf: string) => void;
  onClose: () => void;
  onConfirmDispatch: () => void;
}

export const RegisterDispatchModal: React.FC<RegisterDispatchModalProps> = ({
  visible,
  isShiftClosed,
  selectedSession,
  selectedDateStr,
  currentSessionLitres,
  totalSellerLitres,
  totalBuyerLitres,
  dispatchFatStr,
  dispatchSnfStr,
  dispatchRateStr,
  setDispatchRateStr,
  autoCalculate = false,
  dispatchFatRef,
  dispatchSnfRef,
  onDispatchFatSnfChange,
  onClose,
  onConfirmDispatch,
}) => {
  const { isDark, colors } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.dispatchModalCard, { backgroundColor: colors.modalBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.dispatchModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.truckIconCircleModal}>
                  <Truck size={22} color="#2563EB" />
                </View>
                <View>
                  <Text style={[styles.dispatchModalTitle, { color: colors.text }]}>
                    {isShiftClosed ? 'Update Plant Dispatch' : 'Dispatch Milk'}
                  </Text>
                  <Text style={[styles.dispatchModalSub, { color: colors.textMuted }]}>
                    {selectedSession === 'MORNING' ? 'Morning' : 'Evening'} Shift • {selectedDateStr}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.cardSecondary }]}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={true}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Auto Calculated Milk in Cans Card */}
              <View style={[styles.canLitresHighlightBox, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.canLitresHighlightLabel, isDark && { color: colors.textMedium }]}>Net Milk in Cans to Dispatch</Text>
                  <Text style={[styles.canLitresHighlightVal, isDark && { color: colors.text }]}>{currentSessionLitres.toFixed(1)} Litres</Text>
                  <Text style={[styles.canLitresHighlightFormula, isDark && { color: colors.textMuted }]}>
                    (Collected {totalSellerLitres.toFixed(1)} L - Local Sales {totalBuyerLitres.toFixed(1)} L)
                  </Text>
                </View>
              </View>

              {/* Driver Sample Fat & SNF inputs */}
              <Text style={[styles.modalInputLabel, { marginTop: 14, color: colors.text }]}>
                Average Fat and SNF %
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* Bulk Fat */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalInputLabelSub, { color: colors.textMedium }]}>Fat (%) *</Text>
                  <View style={[styles.modalInputCard, isDark && { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Droplet size={16} color="#2563EB" style={{ marginRight: 6 }} />
                    <TextInput
                      ref={dispatchFatRef}
                      style={[styles.modalInputBold, { color: colors.text }]}
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                      enterKeyHint="next"
                      onSubmitEditing={() => dispatchSnfRef.current?.focus()}
                      value={dispatchFatStr}
                      onChangeText={(val) => onDispatchFatSnfChange(val, dispatchSnfStr)}
                      placeholder="0.0"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Bulk SNF */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalInputLabelSub, { color: colors.textMedium }]}>SNF (%) *</Text>
                  <View style={[styles.modalInputCard, isDark && { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <FlaskConical size={16} color="#059669" style={{ marginRight: 6 }} />
                    <TextInput
                      ref={dispatchSnfRef}
                      style={[styles.modalInputBold, { color: colors.text }]}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      enterKeyHint="done"
                      onSubmitEditing={onConfirmDispatch}
                      value={dispatchSnfStr}
                      onChangeText={(val) => onDispatchFatSnfChange(dispatchFatStr, val)}
                      placeholder="0.0"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Plant Dispatch Rate Input (When Auto Rate is Disabled - Optional) */}
              {!autoCalculate && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.modalInputLabelSub, { color: colors.textMedium }]}>Plant Dispatch Rate (₹ / Litre) • Optional</Text>
                  <View style={[styles.modalInputCard, isDark && { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#059669', marginRight: 6 }}>₹</Text>
                    <TextInput
                      style={[styles.modalInputBold, { color: colors.text }]}
                      keyboardType="decimal-pad"
                      placeholder="0.00 (Optional)"
                      placeholderTextColor={colors.textMuted}
                      value={dispatchRateStr}
                      onChangeText={(val) => setDispatchRateStr?.(sanitizeDecimalInput(val))}
                    />
                  </View>
                </View>
              )}

              {/* Warning note */}
              <View style={styles.dispatchWarningBox}>
                <AlertCircle size={15} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={styles.dispatchWarningText}>
                  Dispatched milk records will close this shift. Quality readings update real-time profit and ledger reports.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={[styles.modalActionsRow, { marginTop: 18 }]}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                  onPress={onClose}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textMedium }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dispatchConfirmBtn}
                  onPress={onConfirmDispatch}
                  activeOpacity={0.8}
                >
                  <CheckCircle size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.dispatchConfirmText}>
                    {isShiftClosed ? 'Update Plant Dispatch' : 'Confirm & Close Shift'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  dispatchModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  dispatchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  truckIconCircleModal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dispatchModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  dispatchModalSub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  canLitresHighlightBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  canLitresHighlightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  canLitresHighlightVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E40AF',
    marginTop: 2,
  },
  canLitresHighlightFormula: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.textMuted,
    marginBottom: 4,
  },
  modalInputLabelSub: {
    fontSize: 11,
    fontWeight: '600',
    color: ThemeColors.textMuted,
    marginBottom: 4,
  },
  modalInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  modalInputBold: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  dispatchWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dispatchWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textMedium,
  },
  dispatchConfirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  dispatchConfirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
