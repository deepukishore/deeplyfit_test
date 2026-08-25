import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { RefreshProvider } from '../context/RefreshContext';
import { colors, createThemedStyles } from '../utils/theme';
import { AnimatedTabIcon, FloatingView, ScreenTransition } from '../components/Motion';

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
import About from '../pages/About';
import LegalDocument, { LEGAL_DOCUMENTS } from '../pages/LegalDocument';
import CookiePreferences from '../pages/CookiePreferences';
import { HelpCenter, LegalCenter, Support } from '../pages/HelpLegalCenter';
import {
  EmptyState,
  ErrorState,
  Forbidden,
  LoadingState,
  Maintenance,
  NoSearchResultsPage,
  NotFound,
  Offline,
  ServerError,
  SessionExpired,
  SuccessState,
} from '../pages/StatePages';
import {
  CancelSubscription,
  Downgrade,
  PaymentFailed,
  PaymentPending,
  PaymentSuccess,
  Upgrade,
} from '../pages/SubscriptionPages';

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

const withScreenTransition = (Screen) => {
  const AnimatedScreen = (props) => (
    <ScreenTransition>
      <Screen {...props} />
    </ScreenTransition>
  );
  AnimatedScreen.displayName = `Animated${Screen.displayName || Screen.name || 'Screen'}`;
  return AnimatedScreen;
};

const AnimatedHome = withScreenTransition(Home);
const AnimatedDiary = withScreenTransition(Diary);
const AnimatedCommunity = withScreenTransition(Community);
const AnimatedCoach = withScreenTransition(AIAssistant);
const AnimatedProgress = withScreenTransition(Progress);
const AnimatedProfile = withScreenTransition(Profile);
const LEGAL_ROUTES = Object.keys(LEGAL_DOCUMENTS);

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 7);

  return (
    <RefreshProvider>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: [styles.tabBar, { height: 59 + bottomPadding, paddingBottom: bottomPadding }],
          tabBarActiveTintColor: colors.accentLime,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
          tabBarAccessibilityLabel: `${route.name} tab`,
          tabBarAllowFontScaling: true,
          tabBarItemStyle: styles.tabItem,
          tabBarHideOnKeyboard: true,
          lazy: true,
          freezeOnBlur: true,
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              icon={TAB_ICON[route.name]}
              style={styles.tabIcon}
              activeStyle={styles.tabIconActive}
              textStyle={styles.tabIconText}
              indicatorStyle={styles.tabIndicator}
            />
          ),
        })}
      >
        <Tab.Screen name="Home" component={AnimatedHome} />
        <Tab.Screen name="Diary" component={AnimatedDiary} />
        <Tab.Screen name="Community" component={AnimatedCommunity} />
        <Tab.Screen name="Coach" component={AnimatedCoach} />
        <Tab.Screen name="Progress" component={AnimatedProgress} />
        <Tab.Screen name="Profile" component={AnimatedProfile} />
      </Tab.Navigator>
    </RefreshProvider>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <FloatingView distance={7} duration={1900}>
          <Image source={require('../../assets/icon.png')} style={styles.loadingLogo} resizeMode="cover" />
        </FloatingView>
        <ActivityIndicator size="large" color={colors.accentLime} />
        <Text style={styles.loadingText}>Loading Deeply Fit...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom', animationDuration: 280 }}>
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
          <Stack.Screen name="About" component={About} />
          <Stack.Screen name="Upgrade" component={Upgrade} />
          <Stack.Screen name="Downgrade" component={Downgrade} />
          <Stack.Screen name="CancelSubscription" component={CancelSubscription} />
          <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
          <Stack.Screen name="PaymentFailed" component={PaymentFailed} />
          <Stack.Screen name="PaymentPending" component={PaymentPending} />
        </>
      )}
      <Stack.Screen name="HelpCenter" component={HelpCenter} />
      <Stack.Screen name="Support" component={Support} />
      <Stack.Screen name="LegalCenter" component={LegalCenter} />
      <Stack.Screen name="CookiePreferences" component={CookiePreferences} />
      {LEGAL_ROUTES.map((name) => <Stack.Screen key={name} name={name} component={LegalDocument} />)}
      <Stack.Screen name="Maintenance" component={Maintenance} />
      <Stack.Screen name="Offline" component={Offline} />
      <Stack.Screen name="NoSearchResults" component={NoSearchResultsPage} />
      <Stack.Screen name="SessionExpired" component={SessionExpired} />
      <Stack.Screen name="404" component={NotFound} />
      <Stack.Screen name="403" component={Forbidden} />
      <Stack.Screen name="500" component={ServerError} />
      <Stack.Screen name="EmptyState" component={EmptyState} />
      <Stack.Screen name="LoadingState" component={LoadingState} />
      <Stack.Screen name="ErrorState" component={ErrorState} />
      <Stack.Screen name="SuccessState" component={SuccessState} />
    </Stack.Navigator>
  );
};

const styles = createThemedStyles(() => ({
  loading: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  loadingLogo: { width: 76, height: 76, borderRadius: 20, marginBottom: 18 },
  loadingText: { color: colors.textSecondary, marginTop: 14, fontSize: 14 },
  tabBar: { marginHorizontal: 9, marginBottom: 6, paddingTop: 6, backgroundColor: colors.bgCard, borderWidth: 1, borderTopWidth: 1, borderColor: colors.border, borderRadius: 26, shadowColor: '#000000', shadowOpacity: 0.28, shadowRadius: 22, shadowOffset: { width: 0, height: -8 }, elevation: 20, overflow: 'visible' },
  tabItem: { marginHorizontal: 1, borderRadius: 16 },
  tabIcon: { width: 36, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  tabIconActive: { backgroundColor: colors.glowPurple, borderWidth: 1, borderColor: colors.border, shadowColor: colors.accentBlue, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  tabIconText: { fontSize: 19 },
  tabIndicator: { position: 'absolute', width: 13, height: 2.5, borderRadius: 2, bottom: 1, backgroundColor: colors.accentLime },
}));

export default AppNavigator;
