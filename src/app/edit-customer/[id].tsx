import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Phone, MapPin, Calendar, Save, CheckCircle2, ShoppingBag, Droplet } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { DatePickerModal } from '@/components/DatePickerModal';
import { CustomerType } from '@/types';
import { sanitizeDecimalInput, sanitizeIntegerInput } from '@/utils/calculator';
import {
  validateCustomerName,
  sanitizeCustomerNameInput,
  validatePhoneNumber,
  sanitizePhoneInput,
  validateFarmerCode,
  validateVillage,
  validateSaleRate,
  validateOpeningBalance,
} from '@/utils/validation';

export default function EditCustomerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const { id } = useLocalSearchParams();
  const { getCustomerById, updateCustomer } = useRepository();

  const customer = getCustomerById(id as string);

  const [farmerCodeStr, setFarmerCodeStr] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('SELLER');
  const [defaultSaleRateStr, setDefaultSaleRateStr] = useState('60');
  const [openingBalStr, setOpeningBalStr] = useState('0');
  // Opening balance type:
  // For SELLER: 'ADVANCE' (Farmer took advance from dairy) | 'PAYABLE' (Dairy owes farmer)
  // For BUYER: 'DUE' (Buyer owes dairy) | 'ADVANCE' (Buyer deposited advance with dairy)
  const [openingBalanceType, setOpeningBalanceType] = useState<'ADVANCE' | 'PAYABLE' | 'DUE'>('ADVANCE');
  const [joiningDate, setJoiningDate] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Field validation errors
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [saleRateError, setSaleRateError] = useState('');
  const [openingBalError, setOpeningBalError] = useState('');

  // Input refs for auto-focus navigation
  const farmerCodeInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const villageInputRef = useRef<TextInput>(null);
  const saleRateInputRef = useRef<TextInput>(null);
  const openingBalInputRef = useRef<TextInput>(null);

  const handleNameChange = (val: string) => {
    const sanitized = sanitizeCustomerNameInput(val);
    setName(sanitized);
    if (sanitized.trim().length > 0) {
      const res = validateCustomerName(sanitized);
      setNameError(res.isValid ? '' : (res.error || ''));
    } else {
      setNameError('');
    }
  };

  const handlePhoneChange = (val: string) => {
    const sanitized = sanitizePhoneInput(val);
    setPhone(sanitized);
    if (sanitized.length > 0) {
      const res = validatePhoneNumber(sanitized);
      setPhoneError(res.isValid ? '' : (res.error || ''));
    } else {
      setPhoneError('');
    }
  };

  const handleCodeChange = (val: string) => {
    const sanitized = sanitizeIntegerInput(val);
    setFarmerCodeStr(sanitized);
    if (sanitized.length > 0) {
      const res = validateFarmerCode(sanitized);
      setCodeError(res.isValid ? '' : (res.error || ''));
    } else {
      setCodeError('');
    }
  };

  const handleSaleRateChange = (val: string) => {
    const sanitized = sanitizeDecimalInput(val);
    setDefaultSaleRateStr(sanitized);
    if (sanitized.length > 0) {
      const res = validateSaleRate(sanitized, customerType === 'BUYER');
      setSaleRateError(res.isValid ? '' : (res.error || ''));
    } else {
      setSaleRateError('');
    }
  };

  const handleOpeningBalChange = (val: string) => {
    const sanitized = sanitizeDecimalInput(val);
    setOpeningBalStr(sanitized);
    if (sanitized.length > 0) {
      const res = validateOpeningBalance(sanitized);
      setOpeningBalError(res.isValid ? '' : (res.error || ''));
    } else {
      setOpeningBalError('');
    }
  };

  useEffect(() => {
    if (customer) {
      setFarmerCodeStr(customer.farmer_code ? customer.farmer_code.toString() : '');
      setName(customer.name);
      setPhone(customer.phone || '');
      setVillage(customer.village || '');
      setCustomerType(customer.customer_type || 'SELLER');
      setDefaultSaleRateStr(customer.default_sale_rate ? customer.default_sale_rate.toString() : '60');
      
      if (customer.opening_balance !== undefined && customer.opening_balance !== null) {
        const rawBal = customer.opening_balance;
        setOpeningBalStr(Math.abs(rawBal).toString());
        if (customer.customer_type === 'BUYER') {
          setOpeningBalanceType(rawBal < 0 ? 'ADVANCE' : 'DUE');
        } else {
          setOpeningBalanceType(rawBal < 0 ? 'ADVANCE' : 'PAYABLE');
        }
      } else {
        setOpeningBalStr('0');
        setOpeningBalanceType(customer.customer_type === 'BUYER' ? 'DUE' : 'ADVANCE');
      }

      setJoiningDate(customer.created_at || new Date().toISOString().split('T')[0]);
      setStatus(customer.status);
    }
  }, [customer]);

  if (!customer) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: 20, paddingTop: insets.top + 20 }}>
          <Text style={{ fontSize: 16, color: colors.text }}>Customer not found.</Text>
          <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    // 1. Strict Name Validation
    const nameVal = validateCustomerName(name);
    if (!nameVal.isValid) {
      setNameError(nameVal.error || '');
      nameInputRef.current?.focus();
      Alert.alert('Invalid Customer Name', nameVal.error || 'Please enter a valid customer name.');
      return;
    }

    // 2. Strict Phone Validation
    const phoneVal = validatePhoneNumber(phone);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.error || '');
      phoneInputRef.current?.focus();
      Alert.alert('Invalid Mobile Number', phoneVal.error || 'Please enter a valid 10-digit mobile number.');
      return;
    }

    // 3. Farmer Code Validation
    const codeVal = validateFarmerCode(farmerCodeStr);
    if (!codeVal.isValid) {
      setCodeError(codeVal.error || '');
      farmerCodeInputRef.current?.focus();
      Alert.alert('Invalid Farmer Code', codeVal.error || 'Please enter a valid code number.');
      return;
    }

    // 4. Sale Rate Validation (if Buyer)
    const rateVal = validateSaleRate(defaultSaleRateStr, customerType === 'BUYER');
    if (!rateVal.isValid) {
      setSaleRateError(rateVal.error || '');
      saleRateInputRef.current?.focus();
      Alert.alert('Invalid Sale Rate', rateVal.error || 'Please enter a valid selling rate.');
      return;
    }

    // 5. Opening Balance Validation
    const balVal = validateOpeningBalance(openingBalStr);
    if (!balVal.isValid) {
      setOpeningBalError(balVal.error || '');
      openingBalInputRef.current?.focus();
      Alert.alert('Invalid Opening Balance', balVal.error || 'Please enter a valid balance amount.');
      return;
    }

    // 6. Village Validation
    const villageVal = validateVillage(village);
    if (!villageVal.isValid) {
      villageInputRef.current?.focus();
      Alert.alert('Invalid Village', villageVal.error || 'Please check village name.');
      return;
    }

    const farmerCode = parseInt(farmerCodeStr, 10) || undefined;
    const rawOpeningNum = parseFloat(openingBalStr) || 0;
    const absBal = Math.abs(rawOpeningNum);
    let finalOpeningBal = 0;
    if (absBal > 0) {
      if (customerType === 'SELLER') {
        finalOpeningBal = openingBalanceType === 'ADVANCE' ? -absBal : absBal;
      } else {
        finalOpeningBal = openingBalanceType === 'DUE' ? absBal : -absBal;
      }
    }
    const defaultSaleRate = parseFloat(defaultSaleRateStr) || 60;
    const trimmedPhone = phone.trim();

    await updateCustomer({
      ...customer,
      farmer_code: farmerCode,
      name: name.trim(),
      phone: trimmedPhone,
      village: village.trim(),
      customer_type: customerType,
      default_sale_rate: defaultSaleRate,
      opening_balance: finalOpeningBal,
      created_at: joiningDate.trim() || customer.created_at,
      status: status,
    });

    Alert.alert('Updated', `Customer details for ${name.trim()} updated successfully!`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top Header with Safe Area Insets */}
        <View style={[styles.topHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border, paddingTop: Math.max(insets.top + 8, 16) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Farmer Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={true}
        >
        {/* Farmer Code & Full Name Row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ width: 100 }}>
            <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Code #</Text>
            <View style={[
              styles.inputCard,
              { backgroundColor: colors.inputBg, borderColor: codeError ? '#EF4444' : colors.inputBorder }
            ]}>
              <TextInput
                ref={farmerCodeInputRef}
                style={[styles.textInput, { fontWeight: '800', color: colors.text }]}
                placeholder="Code #"
                keyboardType="numeric"
                maxLength={6}
                returnKeyType="next"
                enterKeyHint="next"
                blurOnSubmit={false}
                onSubmitEditing={() => nameInputRef.current?.focus()}
                placeholderTextColor={colors.textMuted}
                value={farmerCodeStr}
                onChangeText={handleCodeChange}
              />
            </View>
            {codeError ? (
              <Text style={styles.errorText}>⚠️ {codeError}</Text>
            ) : null}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Farmer Full Name *</Text>
            <View style={[
              styles.inputCard,
              { backgroundColor: colors.inputBg, borderColor: nameError ? '#EF4444' : colors.inputBorder }
            ]}>
              <User size={20} color={nameError ? '#EF4444' : colors.textMedium} style={{ marginRight: 10 }} />
              <TextInput
                ref={nameInputRef}
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Customer Name"
                returnKeyType="next"
                enterKeyHint="next"
                maxLength={60}
                blurOnSubmit={false}
                onSubmitEditing={() => phoneInputRef.current?.focus()}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={handleNameChange}
              />
            </View>
            {nameError ? (
              <Text style={styles.errorText}>⚠️ {nameError}</Text>
            ) : null}
          </View>
        </View>

        {/* Customer Role Selector: Seller (milk to dairy) vs Buyer (milk from dairy) */}
        <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Customer Role *</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <TouchableOpacity
              style={[
                styles.roleOptionCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                customerType === 'SELLER' && (isDark ? { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: '#10B981' } : styles.roleOptionCardActiveSeller),
              ]}
              onPress={() => {
                setCustomerType('SELLER');
                setOpeningBalanceType('ADVANCE');
                setSaleRateError('');
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Droplet size={18} color={customerType === 'SELLER' ? '#10B981' : colors.textMedium} />
                <Text style={[styles.roleOptionTitle, { color: colors.text }, customerType === 'SELLER' && { color: isDark ? '#34D399' : '#065F46' }]}>
                  Milk Farmer
                </Text>
              </View>
              <Text style={[styles.roleOptionSub, { color: colors.textMuted }]}>Farmer giving milk to dairy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOptionCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                customerType === 'BUYER' && (isDark ? { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: '#F59E0B' } : styles.roleOptionCardActiveBuyer),
              ]}
              onPress={() => {
                setCustomerType('BUYER');
                setOpeningBalanceType('DUE');
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShoppingBag size={18} color={customerType === 'BUYER' ? '#F59E0B' : colors.textMedium} />
                <Text style={[styles.roleOptionTitle, { color: colors.text }, customerType === 'BUYER' && { color: isDark ? '#FBBF24' : '#92400E' }]}>
                  Milk Buyer
                </Text>
              </View>
              <Text style={[styles.roleOptionSub, { color: colors.textMuted }]}>Customer buying milk daily</Text>
            </TouchableOpacity>
          </View>

          {/* If Buyer selected, show Default Sale Rate */}
          {customerType === 'BUYER' && (
            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Default Selling Price (₹ / Litre) *</Text>
              <View style={[
                styles.inputCard,
                { backgroundColor: colors.inputBg, borderColor: saleRateError ? '#EF4444' : colors.inputBorder }
              ]}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#D97706', marginRight: 6 }}>₹</Text>
                <TextInput
                  ref={saleRateInputRef}
                  style={[styles.textInput, { fontWeight: '700', color: colors.text }]}
                  keyboardType="numeric"
                  returnKeyType="next"
                  enterKeyHint="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => villageInputRef.current?.focus()}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  value={defaultSaleRateStr}
                  onChangeText={handleSaleRateChange}
                />
                <Text style={{ fontSize: 12, color: colors.textMuted }}>per Litre</Text>
              </View>
              {saleRateError ? (
                <Text style={styles.errorText}>⚠️ {saleRateError}</Text>
              ) : null}
            </View>
          )}
          <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Phone / Mobile Number (Optional)</Text>
          <View style={[
            styles.inputCard,
            { backgroundColor: colors.inputBg, borderColor: phoneError ? '#EF4444' : colors.inputBorder }
          ]}>
            <Phone size={20} color={phoneError ? '#EF4444' : colors.textMedium} style={{ marginRight: 10 }} />
            <TextInput
              ref={phoneInputRef}
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Mobile Number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              returnKeyType="next"
              enterKeyHint="next"
              blurOnSubmit={false}
              onSubmitEditing={() => villageInputRef.current?.focus()}
              value={phone}
              onChangeText={handlePhoneChange}
            />
          </View>
          {phoneError ? (
            <Text style={styles.errorText}>⚠️ {phoneError}</Text>
          ) : null}

          {/* Village Address */}
          <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Village / Area Address</Text>
          <View style={[styles.inputCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <MapPin size={20} color={colors.textMedium} style={{ marginRight: 10 }} />
            <TextInput
              ref={villageInputRef}
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Village / Area"
              placeholderTextColor={colors.textMuted}
              maxLength={50}
              returnKeyType="next"
              enterKeyHint="next"
              blurOnSubmit={false}
              onSubmitEditing={() => openingBalInputRef.current?.focus()}
              value={village}
              onChangeText={setVillage}
            />
          </View>

          {/* Opening Balance Section */}
          <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>
            {customerType === 'SELLER' ? 'Starting Balance / Advance (₹)' : 'Starting Balance / Dues (₹)'}
          </Text>

          {/* Balance Type Selector Chips */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TouchableOpacity
              style={[
                styles.balanceTypeChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                openingBalanceType === (customerType === 'SELLER' ? 'ADVANCE' : 'DUE') && {
                  backgroundColor: isDark ? 'rgba(217, 119, 6, 0.18)' : '#FEF3C7',
                  borderColor: '#D97706',
                },
              ]}
              onPress={() => setOpeningBalanceType(customerType === 'SELLER' ? 'ADVANCE' : 'DUE')}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#D97706' }} />
                <Text style={[
                  styles.balanceTypeChipTitle,
                  { color: colors.text },
                  openingBalanceType === (customerType === 'SELLER' ? 'ADVANCE' : 'DUE') && { color: isDark ? '#FBBF24' : '#B45309', fontWeight: '800' },
                ]}>
                  {customerType === 'SELLER' ? 'Advance Taken (उधार)' : 'Previous Dues (उधार)'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.balanceTypeChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                openingBalanceType === (customerType === 'SELLER' ? 'PAYABLE' : 'ADVANCE') && {
                  backgroundColor: isDark ? 'rgba(5, 150, 105, 0.18)' : '#ECFDF5',
                  borderColor: '#059669',
                },
              ]}
              onPress={() => setOpeningBalanceType(customerType === 'SELLER' ? 'PAYABLE' : 'ADVANCE')}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' }} />
                <Text style={[
                  styles.balanceTypeChipTitle,
                  { color: colors.text },
                  openingBalanceType === (customerType === 'SELLER' ? 'PAYABLE' : 'ADVANCE') && { color: isDark ? '#34D399' : '#047857', fontWeight: '800' },
                ]}>
                  {customerType === 'SELLER' ? 'Payable to Farmer (जमा)' : 'Advance Deposit (जमा)'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={[
            styles.inputCard,
            { backgroundColor: colors.inputBg, borderColor: openingBalError ? '#EF4444' : colors.inputBorder }
          ]}>
            <Text style={{
              fontSize: 16,
              fontWeight: '800',
              color: (openingBalanceType === 'ADVANCE' && customerType === 'SELLER') || (openingBalanceType === 'DUE' && customerType === 'BUYER') ? '#D97706' : '#059669',
              marginRight: 6
            }}>₹</Text>
            <TextInput
              ref={openingBalInputRef}
              style={[styles.textInput, { fontWeight: '700', color: colors.text }]}
              keyboardType="numeric"
              returnKeyType="done"
              enterKeyHint="done"
              onSubmitEditing={handleSave}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={openingBalStr}
              onChangeText={handleOpeningBalChange}
            />
          </View>
          {openingBalError ? (
            <Text style={styles.errorText}>⚠️ {openingBalError}</Text>
          ) : null}

        {/* Joining Date */}
        <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Date of Joining *</Text>
        <TouchableOpacity
          style={[styles.inputCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
        >
          <Calendar size={20} color={colors.primary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
              {joiningDate}
            </Text>
          </View>
        </TouchableOpacity>

        <DatePickerModal
          visible={showDatePicker}
          selectedDate={joiningDate}
          onSelectDate={setJoiningDate}
          onClose={() => setShowDatePicker(false)}
          title="Select Joining Date"
        />

        {/* Status Active / Inactive Switch */}
        <Text style={[styles.fieldLabel, { color: colors.textMedium }]}>Account Status</Text>
        <View style={styles.statusRow}>
          <TouchableOpacity
            style={[
              styles.statusChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              status === 'ACTIVE' && (isDark ? { backgroundColor: 'rgba(22, 163, 74, 0.2)', borderColor: '#16A34A' } : styles.statusChipActive),
            ]}
            onPress={() => setStatus('ACTIVE')}
          >
            <CheckCircle2 size={16} color={status === 'ACTIVE' ? '#16A34A' : colors.textMuted} />
            <Text
              style={[
                styles.statusChipText,
                { color: colors.textMedium },
                status === 'ACTIVE' && { color: isDark ? '#4ADE80' : '#16A34A', fontWeight: '800' },
              ]}
            >
              Active Farmer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              status === 'INACTIVE' && (isDark ? { backgroundColor: 'rgba(220, 38, 38, 0.2)', borderColor: '#DC2626' } : styles.statusChipInactive),
            ]}
            onPress={() => setStatus('INACTIVE')}
          >
            <Text
              style={[
                styles.statusChipText,
                { color: colors.textMedium },
                status === 'INACTIVE' && { color: isDark ? '#F87171' : '#DC2626', fontWeight: '800' },
              ]}
            >
              Inactive / Paused
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Save size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.border,
  },
  backBtn: {
    padding: 6,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ThemeColors.textMedium,
    marginBottom: 6,
    marginTop: 12,
  },
  errorText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2,
  },
  fieldHint: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
  roleOptionCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: ThemeColors.border,
  },
  roleOptionCardActiveSeller: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  roleOptionCardActiveBuyer: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  roleOptionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: ThemeColors.textDark,
  },
  roleOptionSub: {
    fontSize: 11,
    color: ThemeColors.textMuted,
    marginTop: 4,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: ThemeColors.textDark,
  },
  pillBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: ThemeColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillBtnActiveBuffalo: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  pillBtnActiveCow: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  pillBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: ThemeColors.textDark,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  statusChipActive: {
    borderColor: '#86EFAC',
    backgroundColor: '#DCFCE7',
  },
  statusChipInactive: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEE2E2',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.textMedium,
    marginLeft: 6,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ThemeColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 28,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  balanceTypeChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceTypeChipTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
});
