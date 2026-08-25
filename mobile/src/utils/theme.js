import { StyleSheet } from 'react-native';

export const lightColors = {
  bgPrimary: '#f6f8fa',
  bgCard: 'rgba(255,255,255,0.96)',
  bgElevated: 'rgba(234,238,242,0.94)',
  headerBackground: 'rgba(255,255,255,0.94)',
  inputBackground: 'rgba(242,245,247,0.98)',
  border: 'rgba(38,57,77,0.13)',
  textPrimary: '#18212a',
  textSecondary: '#53606b',
  textMuted: '#7b8791',
  accentLime: '#176b91',
  accentAmber: '#a86400',
  accentBlue: '#2b6f9f',
  accentPurple: '#547aa8',
  accentCoral: '#c8403a',
  textInverse: '#ffffff',
  surfaceHighlight: 'rgba(255,255,255,0.82)',
  glowPurple: 'rgba(84,122,168,0.13)',
  glowBlue: 'rgba(43,111,159,0.11)',
};

export const darkColors = {
  bgPrimary: '#101112',
  bgCard: 'rgba(31,33,35,0.98)',
  bgElevated: 'rgba(43,45,48,0.96)',
  headerBackground: 'rgba(29,30,32,0.98)',
  inputBackground: 'rgba(37,39,42,0.98)',
  border: 'rgba(232,234,237,0.11)',
  textPrimary: '#f1f3f4',
  textSecondary: '#c4c7c5',
  textMuted: '#90979d',
  accentLime: '#8ab4f8',
  accentAmber: '#f6c453',
  accentBlue: '#7fcfff',
  accentPurple: '#a8c7fa',
  accentCoral: '#f28b82',
  textInverse: '#10212d',
  surfaceHighlight: 'rgba(255,255,255,0.065)',
  glowPurple: 'rgba(138,180,248,0.12)',
  glowBlue: 'rgba(127,207,255,0.09)',
};

let activeColors = lightColors;
let activeMode = 'light';
let themeVersion = 0;

export const isDarkModeEnabled = (value) => value === true || value === 1 || value === '1';

export const setThemeMode = (darkMode) => {
  const nextMode = darkMode ? 'dark' : 'light';
  if (nextMode === activeMode) return;
  activeMode = nextMode;
  activeColors = darkMode ? darkColors : lightColors;
  themeVersion += 1;
};

export const getThemeColors = () => activeColors;

// Existing screens can keep using semantic color names while resolving them
// against the currently selected palette at render time.
export const colors = new Proxy({}, {
  get: (_target, property) => activeColors[property],
  ownKeys: () => Reflect.ownKeys(activeColors),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

export const createThemedStyles = (factory) => {
  let cachedVersion = -1;
  let cachedStyles = null;

  return new Proxy({}, {
    get: (_target, property) => {
      if (!cachedStyles || cachedVersion !== themeVersion) {
        cachedStyles = StyleSheet.create(factory());
        cachedVersion = themeVersion;
      }
      return cachedStyles[property];
    },
  });
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    display: 'Inter_800ExtraBold',
  },
  display: { fontFamily: 'Inter_800ExtraBold', fontWeight: '800' },
  body: { fontFamily: 'Inter_400Regular', fontWeight: '400' },
};

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 15,
  xl: 17,
  '2xl': 20,
  '3xl': 22,
  display: 28,
  hero: 40,
};
