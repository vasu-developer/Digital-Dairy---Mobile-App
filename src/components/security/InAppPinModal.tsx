import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ShieldCheck, X, Delete, Lock } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { getStoredInAppPin, saveInAppPin } from '@/utils/security';

interface InAppPinModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

export default function InAppPinModal({
  visible,
  onSuccess,
  onCancel,
  title = 'Owner Authorization',
  subtitle = 'Enter 4-digit PIN to modify milk rates',
}: InAppPinModalProps) {
  const { isDark, colors } = useAppTheme();
  const [pin, setPin] = useState<string>('');
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isSettingNewPin, setIsSettingNewPin] = useState<boolean>(false);
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [step, setStep] = useState<'ENTER' | 'SET' | 'CONFIRM'>('ENTER');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setPin('');
      setConfirmPin('');
      setErrorMessage('');
      checkExistingPin();
    }
  }, [visible]);

  const checkExistingPin = async () => {
    const existing = await getStoredInAppPin();
    setStoredPin(existing);
    if (!existing) {
      setIsSettingNewPin(true);
      setStep('SET');
    } else {
      setIsSettingNewPin(false);
      setStep('ENTER');
    }
  };

  const handleKeyPress = async (num: string) => {
    if (errorMessage) setErrorMessage('');
    if (pin.length >= 4) return;

    const newPin = pin + num;
    setPin(newPin);

    if (newPin.length === 4) {
      if (step === 'ENTER') {
        if (newPin === storedPin) {
          setTimeout(() => {
            onSuccess();
          }, 150);
        } else {
          setErrorMessage('Incorrect PIN. Please try again.');
          setPin('');
        }
      } else if (step === 'SET') {
        setConfirmPin(newPin);
        setPin('');
        setStep('CONFIRM');
      } else if (step === 'CONFIRM') {
        if (newPin === confirmPin) {
          await saveInAppPin(newPin);
          setTimeout(() => {
            onSuccess();
          }, 150);
        } else {
          setErrorMessage('PINs do not match. Try again.');
          setPin('');
          setConfirmPin('');
          setStep('SET');
        }
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMessage('');
    }
  };

  const getHeaderInfo = () => {
    if (step === 'SET') {
      return {
        title: 'Create Owner PIN',
        sub: 'Set a 4-digit PIN to secure milk rate settings',
      };
    }
    if (step === 'CONFIRM') {
      return {
        title: 'Confirm Owner PIN',
        sub: 'Re-enter the 4-digit PIN to confirm',
      };
    }
    return {
      title,
      sub: subtitle,
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.cardSecondary, borderRadius: 16 }]} onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconCircle, isDark && { backgroundColor: '#064E3B' }]}>
              <ShieldCheck size={26} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{headerInfo.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMedium }]}>{headerInfo.sub}</Text>
          </View>

          {/* 4 PIN Dots */}
          <View style={styles.pinRow}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.pinDot,
                    isDark && { backgroundColor: '#334155' },
                    isFilled && [styles.pinDotFilled, isDark && { backgroundColor: '#34D399' }],
                    errorMessage ? styles.pinDotError : null,
                  ]}
                />
              );
            })}
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            <View style={{ height: 20 }} />
          )}

          {/* Numeric Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', 'DEL'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keyRow}>
                {row.map((item, cIdx) => {
                  if (item === '') {
                    return <View key={cIdx} style={styles.keyPlaceholder} />;
                  }
                  if (item === 'DEL') {
                    return (
                      <TouchableOpacity
                        key={cIdx}
                        style={[styles.keyBtn, { backgroundColor: colors.cardSecondary }]}
                        onPress={handleDelete}
                        activeOpacity={0.7}
                      >
                        <Delete size={22} color={colors.text} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={cIdx}
                      style={[styles.keyBtn, { backgroundColor: colors.cardSecondary }]}
                      onPress={() => handleKeyPress(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.keyText, { color: colors.text }]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: ThemeColors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 14,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  pinDotFilled: {
    backgroundColor: '#059669',
    borderColor: '#059669',
    transform: [{ scale: 1.15 }],
  },
  pinDotError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
    height: 20,
  },
  keypad: {
    width: '100%',
    marginTop: 8,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  keyBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyPlaceholder: {
    width: 64,
    height: 64,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
});
