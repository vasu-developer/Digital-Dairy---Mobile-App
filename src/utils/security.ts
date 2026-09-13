import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_OWNER_PIN = '@doodh_khata_owner_security_pin';

export interface SecurityStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
  securityLevel: LocalAuthentication.SecurityLevel;
  biometricType: 'FINGERPRINT' | 'FACIAL_RECOGNITION' | 'DEVICE_CREDENTIAL' | 'NONE';
  hasInAppPin: boolean;
}

/**
 * Inspects device security capabilities (biometrics, screen lock, in-app PIN).
 */
export async function getDeviceSecurityStatus(): Promise<SecurityStatus> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const savedPin = await AsyncStorage.getItem(STORAGE_KEY_OWNER_PIN);

    let biometricType: 'FINGERPRINT' | 'FACIAL_RECOGNITION' | 'DEVICE_CREDENTIAL' | 'NONE' = 'NONE';

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'FACIAL_RECOGNITION';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'FINGERPRINT';
    } else if (isEnrolled) {
      biometricType = 'DEVICE_CREDENTIAL';
    }

    return {
      hasHardware,
      isEnrolled,
      securityLevel,
      biometricType,
      hasInAppPin: !!savedPin,
    };
  } catch (err) {
    console.warn('Failed to get security status:', err);
    return {
      hasHardware: false,
      isEnrolled: false,
      securityLevel: LocalAuthentication.SecurityLevel.NONE,
      biometricType: 'NONE',
      hasInAppPin: false,
    };
  }
}

/**
 * Triggers phone screen lock authentication (Fingerprint, Face, PIN, Pattern, Password).
 * 
 * Uses disableDeviceFallback: false so that if biometrics are not used,
 * the device screen lock PIN/Pattern/Password automatically serves as fallback.
 */
export async function authenticateDeviceScreenLock(
  promptReason: string = 'Authorize rate changes'
): Promise<{ success: boolean; error?: string; cancelled?: boolean }> {
  try {
    if (Platform.OS === 'web') {
      // Web fallback
      return { success: true };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!isEnrolled) {
      // Device does not have screen lock or biometrics configured
      return {
        success: false,
        error: 'NO_SCREEN_LOCK',
      };
    }

    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: promptReason,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Device PIN / Password',
      disableDeviceFallback: false, // Allows phone PIN, pattern or password
    });

    if (authResult.success) {
      return { success: true };
    }

    const isUserCancelled =
      authResult.error === 'user_cancel' ||
      authResult.error === 'system_cancel' ||
      authResult.error === 'app_cancel';

    return {
      success: false,
      error: authResult.error || 'Authentication failed',
      cancelled: isUserCancelled,
    };
  } catch (err: any) {
    console.warn('Device authentication failed:', err);
    return {
      success: false,
      error: err?.message || 'Authentication error',
    };
  }
}

/**
 * In-app PIN management (fallback when phone has no screen lock enrolled).
 */
export async function getStoredInAppPin(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_OWNER_PIN);
  } catch {
    return null;
  }
}

export async function saveInAppPin(pin: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_OWNER_PIN, pin);
  } catch (err) {
    console.error('Failed to save in-app PIN:', err);
    throw err;
  }
}

export async function verifyInAppPin(enteredPin: string): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_OWNER_PIN);
    return stored === enteredPin;
  } catch {
    return false;
  }
}
