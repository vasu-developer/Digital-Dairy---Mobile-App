import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Info,
  Building2,
  Users,
  Lock,
  Fingerprint,
  ShieldCheck,
} from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import {
  RateChartConfig,
  DairyPricingSettings,
  DEFAULT_CUSTOMER_RATE_CONFIG,
  DEFAULT_DISPATCH_RATE_CONFIG,
} from '@/utils/rate-chart';
import { authenticateDeviceScreenLock } from '@/utils/security';
import RateConfigForm from '@/components/pricing/RateConfigForm';
import RateSimulatorCard from '@/components/pricing/RateSimulatorCard';
import ConfirmationModal from '@/components/ConfirmationModal';
import InAppPinModal from '@/components/security/InAppPinModal';

export default function PricingSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const { pricingSettings, updatePricingSettings } = useRepository();

  const [activeTab, setActiveTab] = useState<'CUSTOMER' | 'DISPATCH'>('CUSTOMER');
  const [customerRate, setCustomerRate] = useState<RateChartConfig>(
    pricingSettings?.customerRate || DEFAULT_CUSTOMER_RATE_CONFIG
  );
  const [dispatchRate, setDispatchRate] = useState<RateChartConfig>(
    pricingSettings?.dispatchRate || DEFAULT_DISPATCH_RATE_CONFIG
  );

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<'EDIT' | 'SAVE' | 'RESET' | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
    confirmText?: string;
    confirmStyle?: 'primary' | 'destructive' | 'success';
    cancelText?: string;
    singleButton?: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (pricingSettings) {
      setCustomerRate(pricingSettings.customerRate || DEFAULT_CUSTOMER_RATE_CONFIG);
      setDispatchRate(pricingSettings.dispatchRate || DEFAULT_DISPATCH_RATE_CONFIG);
    }
  }, [pricingSettings]);

  const handleCustomerRateChange = (newCfg: RateChartConfig) => {
    setCustomerRate(newCfg);
    setHasUnsavedChanges(true);
  };

  const handleDispatchRateChange = (newCfg: RateChartConfig) => {
    setDispatchRate(newCfg);
    setHasUnsavedChanges(true);
  };

  const handleStartEdit = async () => {
    const auth = await authenticateDeviceScreenLock('Unlock to edit milk rates');
    if (auth.success) {
      setIsEditing(true);
    } else if (auth.error === 'NO_SCREEN_LOCK') {
      setPendingAction('EDIT');
      setShowPinModal(true);
    } else if (!auth.cancelled) {
      setConfirmModal({
        visible: true,
        title: 'Authorization Failed',
        message: 'Could not verify device owner. Edit access denied.',
        type: 'danger',
        confirmText: 'OK',
        singleButton: true,
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const handleCancelEdit = () => {
    if (pricingSettings) {
      setCustomerRate(pricingSettings.customerRate || DEFAULT_CUSTOMER_RATE_CONFIG);
      setDispatchRate(pricingSettings.dispatchRate || DEFAULT_DISPATCH_RATE_CONFIG);
    }
    setHasUnsavedChanges(false);
    setIsEditing(false);
  };

  const executeSave = async () => {
    try {
      const payload: DairyPricingSettings = {
        customerRate,
        dispatchRate,
      };
      await updatePricingSettings(payload);
      setHasUnsavedChanges(false);
      setIsEditing(false);
      setConfirmModal({
        visible: true,
        title: 'Rates Updated',
        message: 'Farmer and Plant Dispatch rates saved successfully.',
        type: 'success',
        confirmText: 'OK',
        singleButton: true,
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
    } catch (err: any) {
      setConfirmModal({
        visible: true,
        title: 'Save Failed',
        message: err?.message || 'Could not save pricing settings.',
        type: 'danger',
        confirmText: 'OK',
        singleButton: true,
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const executeReset = async () => {
    setCustomerRate(DEFAULT_CUSTOMER_RATE_CONFIG);
    setDispatchRate(DEFAULT_DISPATCH_RATE_CONFIG);
    await updatePricingSettings({
      customerRate: DEFAULT_CUSTOMER_RATE_CONFIG,
      dispatchRate: DEFAULT_DISPATCH_RATE_CONFIG,
    });
    setHasUnsavedChanges(false);
    setIsEditing(false);
    setConfirmModal({
      visible: true,
      title: 'Rates Reset',
      message: 'Rates have been reset to standard baseline defaults.',
      type: 'success',
      confirmText: 'OK',
      singleButton: true,
      onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
    });
  };

  const handleSave = async () => {
    if (customerRate.baseRate <= 0 || dispatchRate.baseRate <= 0) {
      setConfirmModal({
        visible: true,
        title: 'Invalid Base Rate',
        message: 'Base rates must be greater than zero.',
        type: 'danger',
        confirmText: 'OK',
        singleButton: true,
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    await executeSave();
  };

  const handleResetDefaults = () => {
    setConfirmModal({
      visible: true,
      title: 'Reset to Standard Rates?',
      message: 'This will reset both Farmer and Plant Dispatch rates to standard defaults. Screen lock authorization is required.',
      type: 'warning',
      confirmText: 'Authorize & Reset',
      confirmStyle: 'destructive',
      cancelText: 'Cancel',
      singleButton: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        // Trigger Device Screen Lock
        const auth = await authenticateDeviceScreenLock('Unlock to reset milk rates to default');
        if (auth.success) {
          await executeReset();
        } else if (auth.error === 'NO_SCREEN_LOCK') {
          setPendingAction('RESET');
          setShowPinModal(true);
        } else if (!auth.cancelled) {
          setConfirmModal({
            visible: true,
            title: 'Authorization Failed',
            message: 'Could not verify device owner. Rates were not reset.',
            type: 'danger',
            confirmText: 'OK',
            singleButton: true,
            onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
          });
        }
      },
    });
  };

  const handlePinSuccess = async () => {
    setShowPinModal(false);
    if (pendingAction === 'EDIT') {
      setIsEditing(true);
    } else if (pendingAction === 'SAVE') {
      await executeSave();
    } else if (pendingAction === 'RESET') {
      await executeReset();
    }
    setPendingAction(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 4, 12), backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Milk Pricing</Text>
              <View style={styles.securityBadge}>
                <Lock size={10} color="#047857" />
                <Text style={styles.securityBadgeText}>Protected</Text>
              </View>
            </View>
            <Text style={[styles.headerSub, { color: colors.textMedium }]}>Quality-based rate configuration</Text>
          </View>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetDefaults}
            activeOpacity={0.7}
          >
            <RotateCcw size={16} color={colors.textMedium} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Segmented Tab Selector */}
          <View style={[styles.tabContainer, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.tabButton, isDark && { backgroundColor: colors.cardSecondary }, activeTab === 'CUSTOMER' && styles.tabButtonActive]}
              onPress={() => setActiveTab('CUSTOMER')}
              activeOpacity={0.8}
            >
              <Users
                size={16}
                color={activeTab === 'CUSTOMER' ? '#FFFFFF' : colors.textMedium}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  { color: colors.textMedium },
                  activeTab === 'CUSTOMER' && styles.tabButtonTextActive,
                ]}
              >
                Farmer Rate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, isDark && { backgroundColor: colors.cardSecondary }, activeTab === 'DISPATCH' && styles.tabButtonActive]}
              onPress={() => setActiveTab('DISPATCH')}
              activeOpacity={0.8}
            >
              <Building2
                size={16}
                color={activeTab === 'DISPATCH' ? '#FFFFFF' : colors.textMedium}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  { color: colors.textMedium },
                  activeTab === 'DISPATCH' && styles.tabButtonTextActive,
                ]}
              >
                Plant Dispatch Rate
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quality Pricing Banner */}
          <View style={[styles.infoBanner, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <Info size={18} color="#2563EB" style={{ marginTop: 2, marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, isDark && { color: colors.text }]}>Automatic Quality Pricing</Text>
              <Text style={[styles.infoText, isDark && { color: colors.textMedium }]}>
                Milk rates calculate automatically using tested Fat and SNF percentages during collection and plant dispatch.
              </Text>
            </View>
          </View>

          {/* Form & Simulator based on active tab */}
          {activeTab === 'CUSTOMER' ? (
            <>
              <RateConfigForm
                key="CUSTOMER"
                config={customerRate}
                onChange={handleCustomerRateChange}
                title="Farmer Purchase Rate"
                subtitle="Rate applied during daily milk collection"
                badgeLabel="Farmer Rate"
                badgeColor="#0F766E"
                isEditing={isEditing}
              />
              {!isEditing && <RateSimulatorCard config={customerRate} profileName="Farmer" />}
            </>
          ) : (
            <>
              <RateConfigForm
                key="DISPATCH"
                config={dispatchRate}
                onChange={handleDispatchRateChange}
                title="Plant Dispatch Rate"
                subtitle="Rate received from milk processing plant"
                badgeLabel="Plant Dispatch Rate"
                badgeColor="#2563EB"
                isEditing={isEditing}
              />
              {!isEditing && <RateSimulatorCard config={dispatchRate} profileName="Plant Dispatch Rate" />}
            </>
          )}

          {/* Action Area: View Mode (Unlock to Edit) vs Edit Mode (Cancel & Save) */}
          {!isEditing ? (
            <View style={styles.actionContainer}>
              <View style={styles.securityHintRow}>
                <Fingerprint size={13} color="#059669" style={{ marginRight: 5 }} />
                <Text style={styles.securityHintText}>
                  Protected by phone screen lock & biometrics
                </Text>
              </View>
              <TouchableOpacity
                style={styles.unlockEditBtn}
                onPress={handleStartEdit}
                activeOpacity={0.85}
              >
                <Lock size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.unlockEditBtnText}>Unlock & Edit Rates</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.editActionsRow}>
              <TouchableOpacity
                style={[styles.cancelEditBtn, isDark && { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                onPress={handleCancelEdit}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelEditBtnText, { color: colors.textMedium }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveChangesBtn}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveChangesBtnText}>Save Rates</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* In-App PIN Fallback Modal (if device has no screen lock enrolled) */}
        <InAppPinModal
          visible={showPinModal}
          onSuccess={handlePinSuccess}
          onCancel={() => {
            setShowPinModal(false);
            setPendingAction(null);
          }}
          title="Owner Authorization"
          subtitle="Enter 4-digit PIN to modify milk rates"
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          visible={confirmModal.visible}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmText={confirmModal.confirmText}
          confirmStyle={confirmModal.confirmStyle}
          cancelText={confirmModal.cancelText}
          singleButton={confirmModal.singleButton}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  headerSub: {
    fontSize: 12,
    color: ThemeColors.textMedium,
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: ThemeColors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textMedium,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  actionContainer: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 24,
  },
  securityHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  securityHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  unlockEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  unlockEditBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 24,
  },
  cancelEditBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelEditBtnText: {
    color: ThemeColors.textDark,
    fontSize: 15,
    fontWeight: '700',
  },
  saveChangesBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveChangesBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
