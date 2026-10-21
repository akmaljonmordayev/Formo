export const colors = {
  // Brand & Backgrounds
  background: '#070A24',
  backgroundDark: '#050818',
  surface: '#0E1A3F',
  surfaceRaised: '#121A42',
  surfaceHighlight: '#1B2560',
  border: 'rgba(243, 245, 249, 0.12)',
  borderLight: 'rgba(243, 245, 249, 0.22)',
  borderDark: '#1D2556',

  // Primary & Accents
  primary: '#F2A33A', // Warm Gold
  accent: '#F2A33A',
  gold: '#F2A33A',
  teal: '#19A7A1', // Cyan / Teal
  cyan: '#19A7A1',
  red: '#B8323F',
  danger: '#E8543F',
  success: '#19A7A1',
  info: '#1D2F8C',

  // Typography
  text: '#F3F5F9',
  textSecondary: '#A9B0D0',
  muted: '#8D95BD',
  caption: '#6F77A0',

  // UI elements
  chip: '#121A42',
  chipActive: 'rgba(242, 163, 58, 0.12)',
  tabBar: '#0B1030',
  card: '#0E1A3F',
  white: '#FFFFFF',
  black: '#080C24',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  round: 999,
};

export const typography = {
  h1: 26,
  h2: 20,
  h3: 16,
  body: 14,
  small: 12,
  caption: 10,
};

export const TAB_BAR_HEIGHT = 72;

export const screenStyles = {
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  content: {
    paddingTop: 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: 110,
  },
};
