import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  confirmStyle?: 'primary' | 'destructive' | 'success';
  singleButton?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  icon?: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'danger';
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  confirmStyle = 'primary',
  singleButton = false,
  onCancel,
  onConfirm,
  icon,
  type = 'info',
}: ConfirmationModalProps) {
  const { isDark, colors } = useAppTheme();

  const renderIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'success':
        return (
          <View style={[styles.iconContainer, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
            <CheckCircle2 size={24} color={isDark ? '#34D399' : '#16A34A'} />
          </View>
        );
      case 'warning':
        return (
          <View style={[styles.iconContainer, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
            <AlertTriangle size={24} color={isDark ? '#FBBF24' : '#D97706'} />
          </View>
        );
      case 'danger':
        return (
          <View style={[styles.iconContainer, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }]}>
            <AlertCircle size={24} color={isDark ? '#F87171' : '#EF4444'} />
          </View>
        );
      case 'info':
      default:
        return (
          <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1E3A8A' : '#E0F2FE' }]}>
            <Info size={24} color={isDark ? '#60A5FA' : '#0284C7'} />
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          {/* Close button */}
          <TouchableOpacity onPress={onCancel} style={[styles.closeBtn, { backgroundColor: colors.cardSecondary }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Central Header with Themed Icon */}
          <View style={styles.headerCentered}>
            {renderIcon()}
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={[styles.message, { color: colors.textMedium }]}>{message}</Text>
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {!singleButton && (
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.cardSecondary, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]} onPress={onCancel} activeOpacity={0.8}>
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                confirmStyle === 'destructive' && styles.confirmBtnDestructive,
                confirmStyle === 'success' && styles.confirmBtnSuccess,
                singleButton && { flex: 1 },
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  headerCentered: {
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: ThemeColors.textDark,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  message: {
    fontSize: 14,
    color: ThemeColors.textMedium,
    lineHeight: 21,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textMedium,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: ThemeColors.primary,
    alignItems: 'center',
    shadowColor: ThemeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnDestructive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  confirmBtnSuccess: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
