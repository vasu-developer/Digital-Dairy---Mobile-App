import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRepository } from '@/db/RepositoryContext';
import { exportDatabase, importDatabase, getLastBackupTime } from '@/db/backup';
import ConfirmationModal from '@/components/ConfirmationModal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building2,
  Sliders,
  Database,
  Download,
  Upload,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Palette,
  ShieldCheck,
  Smartphone,
  Calculator,
  Sun,
  Moon,
} from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshData } = useRepository();
  const { themeMode, isDark, colors, setThemeMode } = useAppTheme();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [loadingTitle, setLoadingTitle] = React.useState('Processing...');
  const [loadingMessage, setLoadingMessage] = React.useState('');
  const [lastBackupDate, setLastBackupDate] = React.useState<string | null>(null);
  const [showThemeToggle, setShowThemeToggle] = React.useState(false);

  React.useEffect(() => {
    getLastBackupTime().then((time) => {
      if (time) setLastBackupDate(time);
    });
  }, []);

  const formatLastBackup = (dateIso?: string | null) => {
    if (!dateIso) return null;
    const d = new Date(dateIso);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    const isSameDay = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isSameDay) return `Today, ${time}`;

    const diffMs = today.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return `Yesterday, ${time}`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isBackupRecent = (dateIso?: string | null) => {
    if (!dateIso) return false;
    const d = new Date(dateIso);
    if (isNaN(d.getTime())) return false;
    const diffMs = Date.now() - d.getTime();
    return diffMs < 7 * 24 * 60 * 60 * 1000;
  };

  // Themed Central Dialog State
  const [dialogConfig, setDialogConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'danger';
    confirmText?: string;
    confirmStyle?: 'primary' | 'destructive' | 'success';
    cancelText?: string;
    singleButton?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => { },
    onCancel: () => { },
  });

  const showThemedDialog = (config: {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'danger';
    confirmText?: string;
    confirmStyle?: 'primary' | 'destructive' | 'success';
    cancelText?: string;
    singleButton?: boolean;
    onConfirm?: () => void;
  }) => {
    setDialogConfig({
      visible: true,
      title: config.title,
      message: config.message,
      type: config.type || 'info',
      confirmText: config.confirmText || 'OK',
      confirmStyle:
        config.confirmStyle ||
        (config.type === 'danger'
          ? 'destructive'
          : config.type === 'success'
            ? 'success'
            : 'primary'),
      cancelText: config.cancelText || 'Cancel',
      singleButton: config.singleButton ?? true,
      onConfirm: () => {
        setDialogConfig((prev) => ({ ...prev, visible: false }));
        config.onConfirm?.();
      },
      onCancel: () => {
        setDialogConfig((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const handleBackup = async () => {
    if (isProcessing) return;
    try {
      const result = await exportDatabase({
        onFolderSelected: () => {
          setLoadingTitle('Creating Backup...');
          setLoadingMessage('Writing database backup to your chosen folder...');
          setIsProcessing(true);
        },
      });
      setIsProcessing(false);
      if (!result.canceled && result.fileName) {
        getLastBackupTime().then((time) => {
          if (time) setLastBackupDate(time);
        });
        showThemedDialog({
          title: 'Backup Created',
          message: `Your database backup was saved successfully.\n\n${result.fileName}`,
          type: 'success',
          confirmText: 'OK',
          singleButton: true,
        });
      }
    } catch (error: any) {
      setIsProcessing(false);
      showThemedDialog({
        title: 'Backup Failed',
        message: error?.message || 'Backup could not be created. Please try again.',
        type: 'danger',
        confirmText: 'OK',
        singleButton: true,
      });
    }
  };

  const executeRestore = async () => {
    try {
      const result = await importDatabase({
        onFileSelected: (fileName) => {
          setLoadingTitle('Restoring Database...');
          setLoadingMessage(`Reading ${fileName} and syncing all records...`);
          setIsProcessing(true);
        },
      });

      if (result.canceled) {
        setIsProcessing(false);
        return;
      }

      // Update all calendars, collections, transactions, and customers
      setLoadingTitle('Syncing Data...');
      setLoadingMessage('Updating calendars, customer records, and accounts...');
      await refreshData();

      // Brief pause for state and UI sync
      await new Promise((resolve) => setTimeout(resolve, 600));

      setIsProcessing(false);
      showThemedDialog({
        title: 'Database Restored',
        message: 'All milk records, calendars, and accounts have been restored successfully.',
        type: 'success',
        confirmText: 'OK',
        singleButton: true,
      });
    } catch (error: any) {
      setIsProcessing(false);
      showThemedDialog({
        title: 'Restore Failed',
        message:
          error?.message ||
          'Unable to read the selected backup file.\nPlease select the .db file again.',
        type: 'danger',
        confirmText: 'OK',
        singleButton: true,
      });
    }
  };

  const handleRestore = () => {
    if (isProcessing) return;
    showThemedDialog({
      title: 'Restore Database?',
      message:
        'This will replace the current data in the app with the selected backup. Make sure you have a recent backup before continuing.',
      type: 'warning',
      confirmText: 'Restore',
      confirmStyle: 'destructive',
      cancelText: 'Cancel',
      singleButton: false,
      onConfirm: executeRestore,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topHeader, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Math.max(insets.top + 8, 16) }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>More & Settings</Text>
        <Text style={[styles.pageSub, { color: colors.textMedium }]}>Dairy configuration & data safety</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dairy Profile Shortcut */}
        <TouchableOpacity
          style={[styles.dairyProfileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/dairy-profile')}
          activeOpacity={0.8}
        >
          <View style={[styles.profileIconCircle, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
            <Building2 size={24} color={isDark ? '#34D399' : ThemeColors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dairyTitle, { color: colors.text }]}>Dairy Profile & Info</Text>
            <Text style={[styles.dairySub, { color: colors.textMuted }]}>Center name, owner & contact details</Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Milk Pricing & Rate Chart Shortcut */}
        <TouchableOpacity
          style={[styles.dairyProfileCard, { marginTop: 10, backgroundColor: colors.card, borderColor: isDark ? '#065F46' : '#A7F3D0' }]}
          onPress={() => router.push('/pricing-settings' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.profileIconCircle, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
            <Calculator size={24} color={isDark ? '#34D399' : '#059669'} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.dairyTitle, { color: colors.text }]}>Pricing & Rate Chart</Text>
              <View style={{ backgroundColor: isDark ? '#064E3B' : '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? '#6EE7B7' : '#065F46' }}>FAT & SNF</Text>
              </View>
            </View>
            <Text style={[styles.dairySub, { color: colors.textMuted }]}>Farmer purchase and plant dispatch rates</Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Section: Appearance & Theme */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>APPEARANCE & THEME</Text>
        <View style={[styles.themeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.themeCardHeader, !showThemeToggle && { marginBottom: 0 }]}>
            <View style={styles.themeHeaderLeft}>
              <View style={[styles.themeIconCircle, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                {themeMode === 'dark' ? (
                  <Moon size={20} color="#60A5FA" />
                ) : themeMode === 'light' ? (
                  <Sun size={20} color="#F59E0B" />
                ) : (
                  <Smartphone size={20} color={isDark ? '#34D399' : '#2563EB'} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeCardTitle, { color: colors.text }]}>App Theme</Text>
                <Text style={[styles.themeCardSub, { color: colors.textMuted }]}>
                  {themeMode === 'system'
                    ? `Phone default (${isDark ? 'Dark mode' : 'Light mode'})`
                    : themeMode === 'dark'
                      ? 'Dark theme active'
                      : 'Light theme active'}
                </Text>
              </View>
            </View>

            {/* Change Theme Button (Only clickable element) */}
            <TouchableOpacity
              style={[
                styles.changeThemeBtn,
                {
                  backgroundColor: showThemeToggle
                    ? (isDark ? '#334155' : '#E2E8F0')
                    : (isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5'),
                  borderColor: showThemeToggle
                    ? (isDark ? '#475569' : '#CBD5E1')
                    : (isDark ? '#059669' : '#A7F3D0'),
                },
              ]}
              onPress={() => setShowThemeToggle((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Palette
                size={13}
                color={showThemeToggle ? colors.textMedium : (isDark ? '#34D399' : '#059669')}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.changeThemeBtnText,
                  { color: showThemeToggle ? colors.textMedium : (isDark ? '#34D399' : '#047857') },
                ]}
              >
                {showThemeToggle ? 'Done' : 'Change Theme'}
              </Text>
              {showThemeToggle ? (
                <ChevronUp size={13} color={colors.textMedium} style={{ marginLeft: 3 }} />
              ) : (
                <ChevronDown size={13} color={isDark ? '#34D399' : '#047857'} style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>
          </View>

          {/* 3-Option Segment Selector: Only shown after clicking Change Theme */}
          {showThemeToggle && (
            <View style={[styles.segmentContainer, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: colors.border, marginTop: 12 }]}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  themeMode === 'system' && [styles.segmentBtnActive, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }],
                ]}
                onPress={() => setThemeMode('system')}
                activeOpacity={0.8}
              >
                <Smartphone
                  size={15}
                  color={themeMode === 'system' ? (isDark ? '#34D399' : '#0F766E') : colors.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: themeMode === 'system' ? (isDark ? '#F8FAFC' : '#0F172A') : colors.textMuted },
                    themeMode === 'system' && { fontWeight: '800' },
                  ]}
                >
                  System
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  themeMode === 'light' && [styles.segmentBtnActive, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }],
                ]}
                onPress={() => setThemeMode('light')}
                activeOpacity={0.8}
              >
                <Sun
                  size={15}
                  color={themeMode === 'light' ? '#D97706' : colors.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: themeMode === 'light' ? (isDark ? '#F8FAFC' : '#0F172A') : colors.textMuted },
                    themeMode === 'light' && { fontWeight: '800' },
                  ]}
                >
                  Light
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  themeMode === 'dark' && [styles.segmentBtnActive, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }],
                ]}
                onPress={() => setThemeMode('dark')}
                activeOpacity={0.8}
              >
                <Moon
                  size={15}
                  color={themeMode === 'dark' ? '#60A5FA' : colors.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: themeMode === 'dark' ? (isDark ? '#F8FAFC' : '#0F172A') : colors.textMuted },
                    themeMode === 'dark' && { fontWeight: '800' },
                  ]}
                >
                  Dark
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Section 1: Offline SQLite Backup & Restore */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>DATA BACKUP & RESTORE</Text>

        {/* Backup Status Card */}
        <View style={[styles.backupStatusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <ShieldCheck size={18} color={isBackupRecent(lastBackupDate) ? '#16A34A' : '#D97706'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.backupStatusTitle, { color: colors.text }]}>
                  {lastBackupDate ? `Last Backup: ${formatLastBackup(lastBackupDate)}` : 'No Backup Taken Yet'}
                </Text>
                <Text style={[styles.backupStatusSub, { color: colors.textMuted }]}>
                  {isBackupRecent(lastBackupDate) ? 'Database safely saved to device' : 'Recommended to backup regularly'}
                </Text>
              </View>
            </View>
            <View style={[styles.backupBadge, isBackupRecent(lastBackupDate) ? styles.backupBadgeSuccess : styles.backupBadgeWarning]}>
              <Text style={[styles.backupBadgeText, isBackupRecent(lastBackupDate) ? styles.backupBadgeTextSuccess : styles.backupBadgeTextWarning]}>
                {isBackupRecent(lastBackupDate) ? 'Protected' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleBackup} activeOpacity={0.8}>
          <Download size={20} color="#2563EB" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Backup Data to Phone</Text>
            <Text style={[styles.menuSub, { color: colors.textMuted }]}>Save a .db file to your device file manager</Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleRestore} activeOpacity={0.8}>
          <Upload size={20} color="#16A34A" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Restore Data from File</Text>
            <Text style={[styles.menuSub, { color: colors.textMuted }]}>Import an existing .db file to restore records</Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Section 2: Storage Engine Info */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>STORAGE ENGINE</Text>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.9}>
          <Database size={20} color="#D97706" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>SQLite Database Engine</Text>
            <Text style={[styles.menuSub, { color: colors.textMuted }]}>Local-first storage active</Text>
          </View>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>100% Offline</Text>
          </View>
        </TouchableOpacity>

        {/* Section 3: App Info */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>ABOUT APP</Text>

        <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Smartphone size={20} color={colors.textMedium} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Digital Dairy App</Text>
            <Text style={[styles.menuSub, { color: colors.textMuted }]}>Version 1.0.0 (Phase 1 Local-First)</Text>
          </View>
        </View>

        <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ShieldCheck size={20} color="#16A34A" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Phase 2 Ready</Text>
            <Text style={[styles.menuSub, { color: colors.textMuted }]}>Prepared for cloud backend sync layer</Text>
          </View>
        </View>

        <View style={styles.footerNote}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Developed by Vasudev Verma with love ❤️</Text>
          <TouchableOpacity
            style={[styles.instaButton, isDark && { backgroundColor: '#831843', borderColor: '#9D174D' }]}
            onPress={() => Linking.openURL('https://instagram.com/vasu_developer')}
            activeOpacity={0.7}
          >
            <Text style={[styles.instaText, isDark && { color: '#FBCFE8' }]}>
              Follow us on Instagram <Text style={[styles.instaHandle, isDark && { color: '#F472B6' }]}>vasu_developer</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* THEMED CENTRAL POPUP / CONFIRMATION MODAL */}
      <ConfirmationModal
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText={dialogConfig.confirmText}
        confirmStyle={dialogConfig.confirmStyle}
        cancelText={dialogConfig.cancelText}
        singleButton={dialogConfig.singleButton}
        onCancel={dialogConfig.onCancel}
        onConfirm={dialogConfig.onConfirm}
      />

      {/* FULL-SCREEN SYNC / LOADING MODAL */}
      <Modal
        visible={isProcessing}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: colors.modalBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <ActivityIndicator size="large" color="#16A34A" style={{ marginBottom: 16 }} />
            <Text style={[styles.loadingTitleText, { color: colors.text }]}>{loadingTitle}</Text>
            <Text style={[styles.loadingMessageText, { color: colors.textMuted }]}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  dairyProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 20,
  },
  profileIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dairyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  dairySub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  themeCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  themeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  themeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  changeThemeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeThemeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  themeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  themeCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: ThemeColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  menuSub: {
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  backupStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 8,
  },
  backupStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  backupStatusSub: {
    fontSize: 11,
    color: ThemeColors.textMuted,
    marginTop: 1,
  },
  backupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  backupBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  backupBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  backupBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  backupBadgeTextSuccess: {
    color: '#15803D',
  },
  backupBadgeTextWarning: {
    color: '#B45309',
  },
  footerNote: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.textMuted,
  },
  instaButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FDF2F8',
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  instaText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9D174D',
  },
  instaHandle: {
    fontWeight: '700',
    color: '#BE185D',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  loadingTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingMessageText: {
    fontSize: 13,
    color: ThemeColors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
