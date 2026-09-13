import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Calendar, Users, BookOpen, MoreHorizontal } from 'lucide-react-native';
import { ThemeColors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '@/app/index';
import CalendarRegisterScreen from '@/app/calendar';
import CustomersScreen from '@/app/customers';
import LedgerSelectScreen from '@/app/(tabs)/ledger-select';
import MoreScreen from '@/app/(tabs)/more';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  const insets = useSafeAreaInsets();

  const bottomInset = insets.bottom;
  const isButtonNav = bottomInset > 20;

  const tabHeight = isButtonNav ? 60 + bottomInset : (bottomInset > 0 ? 56 + bottomInset : 64);
  const tabPaddingBottom = isButtonNav ? bottomInset + 4 : (bottomInset > 0 ? bottomInset : 10);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ThemeColors.primaryLight,
        tabBarInactiveTintColor: ThemeColors.navInactive,
        tabBarStyle: {
          backgroundColor: ThemeColors.navBg,
          borderTopColor: ThemeColors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: tabPaddingBottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Register"
        component={CalendarRegisterScreen}
        options={{
          tabBarLabel: 'Register',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomersScreen}
        options={{
          tabBarLabel: 'Customers',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Ledger"
        component={LedgerSelectScreen}
        options={{
          tabBarLabel: 'Ledger',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
