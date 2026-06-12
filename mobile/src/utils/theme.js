// Theme constants replacing CSS variables
export const colors = {
  bgPrimary: '#0a0a0f',
  bgCard: '#13131a',
  bgElevated: '#1a1a24',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#f0f0f5',
  textSecondary: '#9090a8',
  textMuted: '#5a5a72',
  accentLime: '#c8f135',
  accentAmber: '#f5a623',
  accentBlue: '#4facfe',
  accentPurple: '#a855f7',
  accentCoral: '#f87171',
  textInverse: '#0a0a0f',
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

// Shared font size scale — use these instead of raw numbers
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
