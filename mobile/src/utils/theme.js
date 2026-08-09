import { StyleSheet } from 'react-native';

export const lightColors = {
  bgPrimary: '#f8f5ff',
  bgCard: 'rgba(255,255,255,0.9)',
  bgElevated: 'rgba(241,234,252,0.84)',
  headerBackground: 'rgba(255,255,255,0.82)',
  inputBackground: 'rgba(255,255,255,0.78)',
  border: 'rgba(91,57,143,0.17)',
  textPrimary: '#1d1230',
  textSecondary: '#5f5575',
  textMuted: '#817594',
  accentLime: '#7c3aed',
  accentAmber: '#c87d0b',
  accentBlue: '#2563eb',
  accentPurple: '#8b5cf6',
  accentCoral: '#dc2626',
  textInverse: '#ffffff',
  surfaceHighlight: 'rgba(255,255,255,0.76)',
  glowPurple: 'rgba(124,58,237,0.2)',
  glowBlue: 'rgba(37,99,235,0.14)',
};

export const darkColors = {
  bgPrimary: '#0e0918',
  bgCard: 'rgba(27,18,43,0.96)',
  bgElevated: 'rgba(48,33,70,0.9)',
  headerBackground: 'rgba(20,13,33,0.96)',
  inputBackground: 'rgba(39,27,58,0.94)',
  border: 'rgba(196,181,253,0.2)',
  textPrimary: '#f8f4ff',
  textSecondary: '#c9bfd9',
  textMuted: '#9b8dac',
  accentLime: '#9f7aea',
  accentAmber: '#f4b942',
  accentBlue: '#60a5fa',
  accentPurple: '#8b5cf6',
  accentCoral: '#fb7185',
  textInverse: '#ffffff',
  surfaceHighlight: 'rgba(255,255,255,0.08)',
  glowPurple: 'rgba(139,92,246,0.28)',
  glowBlue: 'rgba(96,165,250,0.2)',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
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
