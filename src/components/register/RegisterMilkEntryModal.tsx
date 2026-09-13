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
import { X, Droplet, FlaskConical, IndianRupee, CheckCircle2 } from 'lucide-react-native';
import { Customer } from '@/types';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency, sanitizeDecimalInput } from '@/utils/calculator';

interface RegisterMilkEntryModalProps {
  visible: boolean;
  customer: Customer | null;
  selectedDateStr: string;
  selectedSession: 'MORNING' | 'EVENING';
  existingCollId: string | null;
  quantityStr: string;
  setQuantityStr: (val: string) => void;
  fatStr: string;
  snfStr: string;
  rateStr: string;
  notes: string;
  setNotes: (val: string) => void;
  quantityInputRef: RefObject<TextInput | null>;
  fatInputRef: RefObject<TextInput | null>;
  snfInputRef: RefObject<TextInput | null>;
  onFatSnfChange: (fat: string, snf: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export const RegisterMilkEntryModal: React.FC<RegisterMilkEntryModalProps> = ({
  visible,
  customer,
  selectedDateStr,
  selectedSession,
  existingCollId,
  quantityStr,
  setQuantityStr,
  fatStr,
  snfStr,
  rateStr,
  notes,
  setNotes,
  quantityInputRef,
  fatInputRef,
  snfInputRef,
  onFatSnfChange,
  onClose,
  onSave,
}) => {
  const { isDark, colors } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
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
            style={[styles.milkModalCard, { backgroundColor: colors.modalBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                    {customer?.customer_type === 'BUYER' ? 'Record Milk Sale' : 'Record Milk Collection'}
                  </Text>
                  {customer?.customer_type === 'BUYER' && (
                    <View style={{ backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: isDark ? 'rgba(217, 119, 6, 0.35)' : '#FDE68A' }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? '#FBBF24' : '#D97706', textTransform: 'uppercase', letterSpacing: 0.3 }}>Buyer</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {customer?.name} • {selectedDateStr} ({selectedSession})
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.cardSecondary }]}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Form Input Grid */}
            <ScrollView
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={true}
              contentContainerStyle={{ paddingBottom: 60 }}
            >
              {/* Quick Quantity Selection Pills (Buyers Only) */}
              {customer?.customer_type === 'BUYER' && (
                <>
                  <Text style={[styles.modalInputLabel, { color: colors.textMedium }]}>Quick Litres Selection</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {['0.5', '1.0', '1.5', '2.0', '3.0', '5.0'].map((lVal) => (
                      <TouchableOpacity
                        key={lVal}
                        style={[
                          {
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: quantityStr === lVal ? '#FEF3C7' : (isDark ? colors.cardSecondary : '#F1F5F9'),
                            borderWidth: 1,
                            borderColor: quantityStr === lVal ? '#D97706' : colors.border,
                          },
                        ]}
                        onPress={() => setQuantityStr(lVal)}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '800',
                            color: quantityStr === lVal ? '#92400E' : colors.text,
                          }}
                        >
                          +{lVal} L
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Row 1: Quantity (L) | Calculated Rate (₹/L) */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                {/* Quantity */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalInputLabel, { color: colors.textMedium }]}>Quantity (Liters) *</Text>
                  <View style={[styles.modalInputCardHighlight, isDark && { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Droplet size={18} color={customer?.customer_type === 'BUYER' ? '#D97706' : '#2563EB'} style={{ marginRight: 6 }} />
                    <TextInput
                      ref={quantityInputRef}
                      style={[styles.modalInputBold, { color: colors.text }]}
                      keyboardType="decimal-pad"
                      returnKeyType={customer?.customer_type === 'BUYER' ? 'done' : 'next'}
                      enterKeyHint={customer?.customer_type === 'BUYER' ? 'done' : 'next'}
                      blurOnSubmit={customer?.customer_type === 'BUYER'}
                      onSubmitEditing={() => {
                        if (customer?.customer_type === 'BUYER') {
                          onSave();
                        } else {
                          fatInputRef.current?.focus();
                        }
                      }}
                      value={quantityStr}
                      onChangeText={(val) => setQuantityStr(sanitizeDecimalInput(val))}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Calculated Rate (Read-Only from Fat & SNF - Hidden for Milk Buyers) */}
                {customer?.customer_type !== 'BUYER' && (
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalInputLabel, { color: colors.textMedium }]}>Calculated Rate</Text>
                    <View style={[styles.modalInputCard, { backgroundColor: isDark ? colors.cardSecondary : '#F8FAFC', borderColor: colors.border }]}>
                      <IndianRupee size={16} color="#059669" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 16, fontWeight: '800', color: parseFloat(rateStr) > 0 ? '#059669' : colors.textMuted }}>
                        {parseFloat(rateStr) > 0 ? `₹${parseFloat(rateStr).toFixed(2)}/L` : '0.00'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Row 2: Fat (%) | SNF (%) - Hidden for Retail Buyers */}
              {customer?.customer_type !== 'BUYER' && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  {/* Fat */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalInputLabel, { color: colors.textMedium }]}>Fat (%) *</Text>
                    <View style={[styles.modalInputCard, isDark && { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                      <FlaskConical size={16} color="#D97706" style={{ marginRight: 6 }} />
                      <TextInput
                        ref={fatInputRef}
                        style={[styles.modalInput, { color: colors.text }]}
                        keyboardType="decimal-pad"
                        returnKeyType="next"
                        enterKeyHint="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => snfInputRef.current?.focus()}
                        value={fatStr}
                        onChangeText={(val) => onFatSnfChange(val, snfStr)}
                        placeholder="0.0"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* SNF */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalInputLabel, { color: colors.textMedium }]}>SNF (%) *</Text>
                    <View style={[styles.modalInputCard, isDark && { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                      <FlaskConical size={16} color="#059669" style={{ marginRight: 6 }} />
                      <TextInput
                        ref={snfInputRef}
                        style={[styles.modalInput, { color: colors.text }]}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        enterKeyHint="done"
                        onSubmitEditing={onSave}
                        value={snfStr}
                        onChangeText={(val) => onFatSnfChange(fatStr, val)}
                        placeholder="0.0"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Notes input */}
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.modalInputLabel, { color: colors.textMedium }]}>Notes (Optional)</Text>
                <View style={[styles.modalInputCard, isDark && { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text }]}
                    placeholder="Notes (Optional)"
                    placeholderTextColor={colors.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Real-time Calculated Total Amount Display Banner */}
              {parseFloat(quantityStr) > 0 && parseFloat(rateStr) > 0 && (
                <View style={[styles.totalValueBanner, isDark && { backgroundColor: '#0F766E20', borderColor: '#115E59' }]}>
                  <View>
                    <Text style={[styles.totalValueLabel, { color: colors.textMuted }]}>Total Amount</Text>
                    <Text style={[styles.totalValueSub, { color: colors.text }]}>
                      {quantityStr} L × ₹{parseFloat(rateStr).toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amountDisplayGreenText, isDark && { color: '#34D399' }]}>
                      {formatCurrency((parseFloat(quantityStr) || 0) * (parseFloat(rateStr) || 0))}
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Buttons: Cancel and Save */}
              <View style={[styles.modalActionsRow, { marginTop: 20 }]}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                  onPress={onClose}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textMedium }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalSaveBtn} onPress={onSave} activeOpacity={0.8}>
                  <CheckCircle2 size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalSaveText}>{existingCollId ? 'Update Entry' : 'Save Entry'}</Text>
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
  milkModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
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
  modalInputCardHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.textDark,
  },
  modalInputBold: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  totalValueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  totalValueLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  totalValueSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  amountDisplayGreenText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#065F46',
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
  modalSaveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: ThemeColors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
