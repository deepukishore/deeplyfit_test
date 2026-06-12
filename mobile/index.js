import 'react-native-gesture-handler';
import React from 'react';
import { registerRootComponent } from 'expo';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors, typography } from './src/utils/theme';

const defaultTextStyle = { fontFamily: typography.fontFamily.regular };
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [defaultTextStyle, Text.defaultProps.style];
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [defaultTextStyle, TextInput.defaultProps.style];
TextInput.defaultProps.placeholderTextColor = TextInput.defaultProps.placeholderTextColor || colors.textMuted;

export default function App() {
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
        <NetworkProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          <Toast />
        </NetworkProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
