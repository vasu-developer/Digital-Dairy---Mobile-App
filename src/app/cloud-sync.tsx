import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useRepository } from '@/db/RepositoryContext';
import { authenticate, isSignedIn, signOut, syncData, SyncApiError } from '@/sync/api';
import { getSyncState } from '@/sync/storage';

export default function CloudSyncScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { refreshData } = useRepository();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [signedIn, setSignedIn] = useState(isSignedIn());
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [conflicts, setConflicts] = useState<string[]>([]);
  useEffect(() => { getSyncState().then(s => { if (s) { setPhone(s.phone); setLastSync(s.syncedAt); } }).catch(() => setMessage('Unable to read sync status.')); }, []);
  async function run(resolution?: 'local' | 'server') {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage(''); setConflicts([]);
    try {
      if (!isSignedIn()) {
        await authenticate(phone, password, register);
        setPassword(''); setSignedIn(true);
      }
      const state = await syncData(resolution);
      await refreshData();
      setLastSync(state.syncedAt);
      setMessage('Sync complete. Your dairy data is saved on the server and this device is up to date.');
    } catch (error) {
      await refreshData().catch(() => {});
      setSignedIn(isSignedIn());
      setMessage(error instanceof Error ? error.message : 'Sync failed. Please try again.');
      if (error instanceof SyncApiError) setConflicts(error.conflicts);
    } finally { lock.current = false; setBusy(false); }
  }
  const button = (label: string, onPress: () => void, secondary = false) => (
    <TouchableOpacity disabled={busy} accessibilityRole="button" onPress={onPress} style={[styles.button, { backgroundColor: secondary ? colors.card : '#059669', borderColor: colors.border }]}>
      <Text style={{ color: secondary ? colors.text : '#fff', fontWeight: '700', textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  );
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {button('Back', () => router.back(), true)}
      <Text style={[styles.title, { color: colors.text }]}>Sync to DB</Text>
      <Text style={[styles.copy, { color: colors.textMuted }]}>Save customers, milk records, payments, advances, dispatches, pricing and your dairy profile to your account. Log in with the same mobile number and password on another device to download and sync them.</Text>
      <Text style={[styles.copy, { color: colors.textMuted }]}>The app continues to work offline. Tap Sync to DB on each device whenever you want to send and receive changes.</Text>
      <Text style={[styles.copy, { color: colors.text }]}>{lastSync ? `Last successful sync: ${new Date(lastSync).toLocaleString()}` : 'No successful cloud sync yet'}</Text>
      {!signedIn ? <>
        <Text style={[styles.label, { color: colors.text }]}>{register ? 'Create your dairy account' : 'Log in to your dairy account'}</Text>
        <Text style={{ color: colors.textMuted }}>Mobile number with country code (for example, +919876543210)</Text>
        <TextInput accessibilityLabel="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} />
        <Text style={{ color: colors.textMuted }}>Password (at least 8 characters)</Text>
        <TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={register ? 'new-password' : 'current-password'} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} />
        {button(register ? 'Create account & sync' : 'Log in & sync', () => void run())}
        {button(register ? 'Already registered? Log in' : 'New dairy? Create account', () => setRegister(!register), true)}
        <Text style={[styles.copy, { color: colors.textMuted }]}>Keep your password safe. You will need it to restore data on a new phone. For security, log in again after restarting the app.</Text>
      </> : <>
        <Text style={[styles.label, { color: colors.text }]}>Dairy account: +{phone.replace(/^\+/, '')}</Text>
        {button('Sync to DB', () => void run())}
        {button('Log out', () => { signOut(); setSignedIn(false); setConflicts([]); setMessage('Logged out. Your local records remain available.'); }, true)}
      </>}
      {!!message && <Text accessibilityRole="alert" style={[styles.copy, { color: colors.text }]}>{message}</Text>}
      {conflicts.length > 0 && <View style={[styles.conflict, { borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.text }]}>{conflicts.length} conflicting record(s)</Text>
        <Text style={[styles.copy, { color: colors.textMuted }]}>Both devices changed the same records. Choose the version to keep for these conflicts. Other changes are combined. Cancel to keep both devices unchanged and review your records first.</Text>
        <Text style={[styles.copy, { color: colors.textMuted }]}>{conflicts.slice(0, 8).join('\n')}</Text>
        {button('Keep this device’s conflicting edits', () => void run('local'))}
        {button('Keep server’s conflicting edits', () => void run('server'), true)}
        {button('Cancel', () => { setConflicts([]); setMessage('Sync canceled. No local data was replaced.'); }, true)}
      </View>}
    </ScrollView>
    <Modal visible={busy} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}><View style={[styles.loading, { backgroundColor: colors.card }]}><ActivityIndicator size="large" color="#059669" /><Text style={[styles.copy, { color: colors.text }]}>Syncing dairy data… Please wait.</Text></View></View>
    </Modal>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '800', marginVertical: 12 }, copy: { fontSize: 14, lineHeight: 21, marginVertical: 10 },
  label: { fontSize: 17, fontWeight: '700', marginVertical: 14 }, input: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 6, marginBottom: 16 },
  button: { padding: 15, borderRadius: 12, marginVertical: 5, borderWidth: 1 }, conflict: { padding: 12, borderWidth: 1, borderRadius: 12, marginTop: 12 },
  overlay: { flex: 1, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center', padding: 24 }, loading: { padding: 28, borderRadius: 18, alignItems: 'center' },
});
