import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { RefreshProvider } from '../context/RefreshContext';
import { colors } from '../utils/theme';

import Login from '../pages/Login';
import Onboarding from '../pages/Onboarding';
import Home from '../pages/Home';
import Diary from '../pages/Diary';
import Progress from '../pages/Progress';
import Community from '../pages/Community';
import Profile from '../pages/Profile';
import AIAssistant from '../pages/AIAssistant';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import PublicProfile from '../pages/PublicProfile';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICON = {
  Home: '\u{1F3E0}',
  Diary: '\u{1F4D4}',
  Community: '\u{1F465}',
  Coach: '\u{1F916}',
  Progress: '\u{1F4C8}',
  Profile: '\u{1F464}',
};

const MainTabs = () => (
  <RefreshProvider>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bgCard, borderTopColor: colors.border, height: 60, paddingBottom: 6 },
        tabBarActiveTintColor: colors.accentLime,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{TAB_ICON[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Diary" component={Diary} />
      <Tab.Screen name="Community" component={Community} />
      <Tab.Screen name="Coach" component={AIAssistant} />
      <Tab.Screen name="Progress" component={Progress} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  </RefreshProvider>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>{'\u26A1'}</Text>
        <ActivityIndicator size="large" color={colors.accentLime} />
        <Text style={styles.loadingText}>Loading Deeply Fit...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          <Stack.Screen name="ResetPassword" component={ResetPassword} />
        </>
      ) : !user.onboarding_complete ? (
        <Stack.Screen name="Onboarding" component={Onboarding} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="PublicProfile" component={PublicProfile} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 14, fontSize: 14 },
});

export default AppNavigator;
