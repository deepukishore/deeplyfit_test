import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { registerRootComponent } from 'expo';
import mobileAds from 'react-native-google-mobile-ads';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors, getThemeColors, isDarkModeEnabled, setThemeMode, typography } from './src/utils/theme';

const defaultTextStyle = { fontFamily: typography.fontFamily.regular };
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [defaultTextStyle, Text.defaultProps.style];
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [defaultTextStyle, TextInput.defaultProps.style];
TextInput.defaultProps.placeholderTextColor = TextInput.defaultProps.placeholderTextColor || colors.textMuted;
TouchableOpacity.defaultProps = TouchableOpacity.defaultProps || {};
TouchableOpacity.defaultProps.activeOpacity = TouchableOpacity.defaultProps.activeOpacity ?? 0.72;

const ThemedApplication = () => {
  const { user } = useAuth();
  const darkMode = isDarkModeEnabled(user?.dark_mode);
  setThemeMode(darkMode);
  const palette = getThemeColors();
  const navigationTheme = {
    dark: darkMode,
    colors: {
      primary: palette.accentLime,
      background: palette.bgPrimary,
      card: palette.bgCard,
      text: palette.textPrimary,
      border: palette.border,
      notification: palette.accentCoral,
    },
  };

  return (
    <NetworkProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style={darkMode ? 'light' : 'dark'} />
        <AppNavigator />
      </NavigationContainer>
      <Toast />
    </NetworkProvider>
  );
};

export default function App() {
  useEffect(() => {
    mobileAds()
      .initialize()
      .then((adapterStatuses) => {
        console.log('✅ AdMob initialized:', adapterStatuses);
      })
      .catch((err) => {
        console.log('❌ AdMob init failed:', err);
      });
  }, []);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgPrimary }}>
          <ActivityIndicator size="large" color={colors.accentLime} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemedApplication />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
