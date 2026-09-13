import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RepositoryProvider } from '@/db/RepositoryContext';
import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function RootAppContent() {
  const { isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-customer" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="edit-customer/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="add-transaction" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="customer/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="customer/calendar/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ledger/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settlement/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="dairy-profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="pricing-settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="dispatch/calendar" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RepositoryProvider>
          <RootAppContent />
        </RepositoryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
