export const colors = {
  // Brand foundation
  background: '#070A20',
  backgroundAlt: '#0A0F2C',
  surface: '#0F1638',
  surfaceRaised: '#161F4C',
  surfaceSubtle: '#12193E',
  border: '#212B60',
  borderLight: '#2D3A7A',
  borderActive: '#F2A33A',

  // Typography
  text: '#FFFFFF',
  textSecondary: '#C5CCE8',
  muted: '#838EB8',
  dim: '#57628C',

  // Formo athletic brand accents
  primary: '#F2A33A',
  primaryDark: '#080C24',
  accent: '#F2A33A',
  accentLight: '#F7C27A',
  accentGlow: 'rgba(242, 163, 58, 0.22)',

  // Athletic performance colors
  teal: '#19A7A1',
  tealLight: '#3FD9B7',
  tealGlow: 'rgba(25, 167, 161, 0.22)',
  danger: '#E8543F',
  dangerGlow: 'rgba(232, 84, 63, 0.22)',
  success: '#19A7A1',
  info: '#5D7CFF',
  warning: '#F5A55E',

  // Chrome & Navigation
  chip: '#141C44',
  chipActive: '#1D285E',
  tabBar: '#090E2A',
  tabBarBorder: '#18214F',
  white: '#FFFFFF',
  black: '#070A20',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  round: 999,
};

export const typography = {
  h1: 30,
  h2: 24,
  h3: 18,
  body: 14,
  bodySmall: 13,
  small: 12,
  caption: 11,
};

// Dizayn shriftlari (App.js da yuklanadi). Android'da fontWeight bilan
// birga berilmaydi — har bir vazn alohida oila.
export const fonts = {
  display: 'Unbounded_500Medium',
  body: 'Onest_400Regular',
  bodyMedium: 'Onest_500Medium',
  bodySemi: 'Onest_600SemiBold',
  numeric: 'SairaExtraCondensed_800ExtraBold',
  numericBold: 'SairaExtraCondensed_700Bold',
};

// Base tab bar height (safe area insets will be added dynamically)
export const TAB_BAR_HEIGHT = 72;

export const screenStyles = {
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: 115,
  },
};
