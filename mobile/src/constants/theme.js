export const colors = {
  background: '#070A24',
  surface: '#111636',
  surfaceRaised: '#171E4B',
  border: '#242B58',
  text: '#FFFFFF',
  muted: '#8E97BE',
  primary: '#F5A55E',
  accent: '#F5A55E',
  teal: '#3FD9B7',
  success: '#3FD9B7',
  info: '#5D7CFF',
  chip: '#151A3E',
  tabBar: '#0B0F2C',
  white: '#FFFFFF',
  black: '#070A24',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 36 };
export const radii = { sm: 10, md: 12, lg: 16, xl: 20, round: 999 };
export const typography = { h1: 28, h2: 22, h3: 17, body: 14, small: 12, caption: 10 };

// Pastki tab bar balandligi — pastki bar ostidagi sahifalarda footer shu balandlikka ko'tariladi
export const TAB_BAR_HEIGHT = 74;

export const screenStyles = {
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 16, paddingHorizontal: spacing.xl, paddingBottom: 110 },
};
