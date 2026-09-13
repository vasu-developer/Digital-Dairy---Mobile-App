import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Calendar, Users, BookOpen, MoreHorizontal } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';

export default function TabsLayout() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  // For devices with 3-button navigation, insets.bottom is typically >= 24-48dp.
  // For gesture navigation / non-navigation button devices, insets.bottom is 0 or small.
  const bottomInset = insets.bottom;
  const isButtonNav = bottomInset > 20;

  const tabHeight = isButtonNav ? 60 + bottomInset : (bottomInset > 0 ? 56 + bottomInset : 64);
  const tabPaddingBottom = isButtonNav ? bottomInset + 4 : (bottomInset > 0 ? bottomInset : 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.navInactive,
        tabBarStyle: {
          backgroundColor: colors.navBg,
          borderTopColor: colors.navBorder,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: tabPaddingBottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }: any) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Register',
          tabBarIcon: ({ color, size }: any) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, size }: any) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ledger-select"
        options={{
          title: 'Ledger',
          tabBarIcon: ({ color, size }: any) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }: any) => (
            <MoreHorizontal size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
