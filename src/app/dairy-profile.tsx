import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  MapPin,
  FileText,
  Clock,
  Save,
  CheckCircle2,
  Users,
  Milk,
  Wallet,
  ShieldCheck,
} from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { formatCurrency, sanitizeIntegerInput } from '@/utils/calculator';

const STORAGE_KEY = '@doodh_khata_dairy_profile';

export interface DairyProfileData {
  dairyName: string;
  ownerName: string;
  phone: string;
  villageAddress: string;
  fssaiLicense: string;
  morningShift: string;
  eveningShift: string;
}

const DEFAULT_PROFILE: DairyProfileData = {
  dairyName: 'Vasudev Milk Collection Dairy',
  ownerName: 'Vasudev Sharma',
  phone: '98765 43210',
  villageAddress: 'Rampur, District Mainpuri (U.P.)',
  fssaiLicense: 'FSSAI-10022011000456',
  morningShift: '06:00 AM - 09:30 AM',
  eveningShift: '05:00 PM - 08:30 PM',
};

export default function DairyProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const { customers, collections, transactions, pricingSettings } = useRepository();

  const [profile, setProfile] = useState<DairyProfileData>(DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Input refs for auto-focus navigation
  const dairyNameRef = useRef<TextInput>(null);
  const ownerNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const villageRef = useRef<TextInput>(null);
  const fssaiRef = useRef<TextInput>(null);
  const morningShiftRef = useRef<TextInput>(null);
  const eveningShiftRef = useRef<TextInput>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.warn('Failed to load dairy profile:', e);
    }
  };

  const handleSave = async () => {
    if (!profile.dairyName.trim() || !profile.ownerName.trim()) {
      Alert.alert('Validation Error', 'Dairy Name and Owner Name are required.');
      return;
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      Alert.alert('Error', 'Failed to save profile changes.');
    }
  };

  const activeFarmersCount = customers.filter((c) => c.status === 'ACTIVE').length;
  const totalVolumeLiters = Math.max(0, collections.reduce((acc, c) => {
    const cust = customers.find((cust) => String(cust.id) === String(c.customer_id));
    const isBuyer = cust?.customer_type === 'BUYER';
    return isBuyer ? acc - (c.quantity || 0) : acc + (c.quantity || 0);
  }, 0));

  // Total pending payable balance across all customers
  const totalPayableBalance = customers.reduce((acc, cust) => {
    const custCols = collections.filter((col) => col.customer_id === cust.id);
    const custTxs = transactions.filter((tx) => tx.customer_id === cust.id);

    const milkVal = custCols.reduce((sum, col) => sum + (col.amount || 0), 0);
    const deductions = custTxs
      .filter((t) => t.is_credit === 0)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const payments = custTxs
      .filter((t) => t.is_credit === 1 && t.type !== 'MILK_VAL_EARNED')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const bal = milkVal - deductions - payments;
    return acc + (bal > 0 ? bal : 0);
  }, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16), backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Dairy & Owner Profile</Text>
            <Text style={[styles.headerSub, { color: colors.textMedium }]}>Manage your collection center details</Text>
          </View>
          <TouchableOpacity
            style={[styles.editToggleBtn, isDark && !isEditing && { backgroundColor: colors.cardSecondary, borderColor: colors.border }, isEditing && styles.editToggleBtnActive]}
            onPress={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
          >
            {isEditing ? (
              <Save size={16} color="#FFF" />
            ) : (
              <FileText size={16} color={colors.primary} />
            )}
            <Text style={[styles.editToggleText, { color: isEditing ? '#FFF' : colors.primary }]}>
              {isEditing ? 'Save' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={true}
        >
          {saveSuccess && (
            <View style={styles.toastSuccess}>
              <CheckCircle2 size={18} color="#16A34A" style={{ marginRight: 8 }} />
              <Text style={styles.toastText}>Dairy profile updated successfully!</Text>
            </View>
          )}

          {/* Profile Hero Card */}
          <View style={[styles.heroCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, isDark && { color: colors.text }]}>{profile.dairyName}</Text>
              <Text style={[styles.heroSub, isDark && { color: colors.textMedium }]}>Owner: {profile.ownerName}</Text>
              <View style={styles.statusBadge}>
                <ShieldCheck size={14} color="#16A34A" style={{ marginRight: 4 }} />
                <Text style={styles.statusBadgeText}>Verified Local Dairy Register</Text>
              </View>
            </View>
          </View>

          {/* Quick Statistics Banner */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Users size={18} color={ThemeColors.primaryLight} />
              <Text style={[styles.statVal, { color: colors.text }]}>{activeFarmersCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active Farmers</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Milk size={18} color="#2563EB" />
              <Text style={[styles.statVal, { color: colors.text }]}>{totalVolumeLiters.toFixed(1)} L</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Milk Recorded</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Wallet size={18} color="#D97706" />
              <Text style={[styles.statVal, { color: colors.text }]}>{formatCurrency(totalPayableBalance)}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Payable Balance</Text>
            </View>
          </View>

          {/* Section: Dairy Information */}
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>DAIRY INFORMATION</Text>

          <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Dairy Name */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIcon, isDark && { backgroundColor: colors.cardSecondary }]}>
                <Building2 size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Dairy Name</Text>
                {isEditing ? (
                  <TextInput
                    ref={dairyNameRef}
                    style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                    returnKeyType="next"
                    enterKeyHint="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => ownerNameRef.current?.focus()}
                    value={profile.dairyName}
                    onChangeText={(val) => setProfile((prev) => ({ ...prev, dairyName: val }))}
                    placeholder="Enter dairy name"
                    placeholderTextColor={colors.textMuted}
                  />
                ) : (
                  <Text style={[styles.fieldVal, { color: colors.text }]}>{profile.dairyName}</Text>
                )}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Owner Name */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIcon, isDark && { backgroundColor: colors.cardSecondary }]}>
                <User size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Dairy Owner Name</Text>
                {isEditing ? (
                  <TextInput
                    ref={ownerNameRef}
                    style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                    returnKeyType="next"
                    enterKeyHint="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => phoneRef.current?.focus()}
                    value={profile.ownerName}
                    onChangeText={(val) => setProfile((prev) => ({ ...prev, ownerName: val }))}
                    placeholder="Enter owner name"
                    placeholderTextColor={colors.textMuted}
                  />
                ) : (
                  <Text style={[styles.fieldVal, { color: colors.text }]}>{profile.ownerName}</Text>
                )}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Contact Phone */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIcon, isDark && { backgroundColor: colors.cardSecondary }]}>
                <Phone size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Phone / Mobile Number</Text>
                {isEditing ? (
                  <TextInput
                    ref={phoneRef}
                    style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                    returnKeyType="next"
                    enterKeyHint="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => villageRef.current?.focus()}
                    value={profile.phone}
                    onChangeText={(val) => setProfile((prev) => ({ ...prev, phone: sanitizeIntegerInput(val) }))}
                    placeholder="Enter mobile number"
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textMuted}
                  />
                ) : (
                  <Text style={[styles.fieldVal, { color: colors.text }]}>{profile.phone}</Text>
                )}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Village Address */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIcon, isDark && { backgroundColor: colors.cardSecondary }]}>
                <MapPin size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Center Village / Location</Text>
                {isEditing ? (
                  <TextInput
                    ref={villageRef}
                    style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                    returnKeyType="next"
                    enterKeyHint="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => fssaiRef.current?.focus()}
                    value={profile.villageAddress}
                    onChangeText={(val) => setProfile((prev) => ({ ...prev, villageAddress: val }))}
                    placeholder="Enter village address"
                    placeholderTextColor={colors.textMuted}
                  />
                ) : (
                  <Text style={[styles.fieldVal, { color: colors.text }]}>{profile.villageAddress}</Text>
                )}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* FSSAI License */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIcon, isDark && { backgroundColor: colors.cardSecondary }]}>
                <FileText size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>FSSAI / Dairy Registration No.</Text>
                {isEditing ? (
                  <TextInput
                    ref={fssaiRef}
                    style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                    returnKeyType="next"
                    enterKeyHint="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => morningShiftRef.current?.focus()}
                    value={profile.fssaiLicense}
                    onChangeText={(val) => setProfile((prev) => ({ ...prev, fssaiLicense: val }))}
                    placeholder="Enter registration license number"
                    placeholderTextColor={colors.textMuted}
                  />
                ) : (
                  <Text style={[styles.fieldVal, { color: colors.text }]}>{profile.fssaiLicense}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Section: Operational Collection Timings */}
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>COLLECTION SHIFT TIMINGS</Text>

          <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Morning Shift */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIcon, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
                <Clock size={18} color={isDark ? '#FCD34D' : '#D97706'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Morning Collection Hours</Text>
                {isEditing ? (
                  <TextInput
                    ref={morningShiftRef}
                    style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                    returnKeyType="next"
                    enterKeyHint="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => eveningShiftRef.current?.focus()}
                    value={profile.morningShift}
                    onChangeText={(val) => setProfile((prev) => ({ ...prev, morningShift: val }))}
                    placeholder="06:00 AM - 09:30 AM"
                    placeholderTextColor={colors.textMuted}
                  />
                ) : (
                  <Text style={[styles.fieldVal, { color: colors.text }]}>{profile.morningShift}</Text>
                )}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Evening Shift */}
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIcon, { backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' }]}>
                <Clock size={18} color={isDark ? '#93C5FD' : '#2563EB'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Evening Collection Hours</Text>
                {isEditing ? (
                  <TextInput
                    ref={eveningShiftRef}
                    style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                    returnKeyType="done"
                    enterKeyHint="done"
                    onSubmitEditing={handleSave}
                    value={profile.eveningShift}
                    onChangeText={(val) => setProfile((prev) => ({ ...prev, eveningShift: val }))}
                    placeholder="05:00 PM - 08:30 PM"
                    placeholderTextColor={colors.textMuted}
                  />
                ) : (
                  <Text style={[styles.fieldVal, { color: colors.text }]}>{profile.eveningShift}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Section: Milk Pricing & Rates */}
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>MILK PRICING & RATE CHART</Text>
          <TouchableOpacity
            style={[styles.pricingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/pricing-settings' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.pricingHeader}>
              <View style={styles.pricingBadge}>
                <Text style={styles.pricingBadgeText}>QUALITY PRICING</Text>
              </View>
              <Text style={[styles.pricingEditLink, { color: colors.primary }]}>Edit Rates ➔</Text>
            </View>

            <View style={styles.pricingRatesRow}>
              <View style={styles.rateBox}>
                <Text style={[styles.rateLabel, { color: colors.textMuted }]}>Farmer Base Rate</Text>
                <Text style={[styles.rateValue, { color: colors.text }]}>
                  {formatCurrency(pricingSettings?.customerRate?.baseRate || 52)}/L
                </Text>
                <Text style={[styles.rateSub, { color: colors.textMuted }]}>
                  {pricingSettings?.customerRate?.baseFat || 6.0}% Fat • {pricingSettings?.customerRate?.baseSNF || 8.5}% SNF
                </Text>
              </View>

              <View style={[styles.rateDivider, { backgroundColor: colors.border }]} />

              <View style={styles.rateBox}>
                <Text style={[styles.rateLabel, { color: colors.textMuted }]}>Plant Dispatch Rate</Text>
                <Text style={[styles.rateValue, { color: colors.text }]}>
                  {formatCurrency(pricingSettings?.dispatchRate?.baseRate || 58)}/L
                </Text>
                <Text style={[styles.rateSub, { color: colors.textMuted }]}>
                  {pricingSettings?.dispatchRate?.baseFat || 6.0}% Fat • {pricingSettings?.dispatchRate?.baseSNF || 8.5}% SNF
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Save / Edit Action Footer */}
          {isEditing && (
            <TouchableOpacity style={styles.saveMainBtn} onPress={handleSave}>
              <Save size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveMainBtnText}>Save Profile Changes</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.bgMain,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  headerSub: {
    fontSize: 12,
    color: ThemeColors.textMedium,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  editToggleBtnActive: {
    backgroundColor: ThemeColors.primary,
    borderColor: ThemeColors.primary,
  },
  editToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: ThemeColors.primary,
    marginLeft: 3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 150,
  },
  toastSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSub: {
    fontSize: 13,
    color: '#CCFBF1',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    color: ThemeColors.textDark,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ThemeColors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 11.5,
    fontWeight: '800',
    color: ThemeColors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  cardGroup: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    marginBottom: 18,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: ThemeColors.textMuted,
  },
  fieldVal: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textDark,
    marginTop: 2,
  },
  textInput: {
    fontSize: 15,
    fontWeight: '700',
    color: ThemeColors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.primary,
    paddingVertical: 4,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: ThemeColors.border,
    marginVertical: 10,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 8,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pricingBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pricingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  pricingEditLink: {
    fontSize: 12,
    fontWeight: '700',
    color: ThemeColors.primaryLight,
  },
  pricingRatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateBox: {
    flex: 1,
  },
  rateLabel: {
    fontSize: 11,
    color: ThemeColors.textMedium,
    fontWeight: '600',
  },
  rateValue: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
    marginTop: 2,
  },
  rateSub: {
    fontSize: 10,
    color: ThemeColors.textMuted,
    marginTop: 2,
  },
  rateDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  saveMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ThemeColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 10,
  },
  saveMainBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
});
