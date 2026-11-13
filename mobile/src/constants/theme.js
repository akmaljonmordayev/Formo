import { StyleSheet } from 'react-native';

// Brand/semantic rang-tuslar — ikkala mavzuda ham bir xil (doim o'zining fonida: tugma, nishon va h.k.)
const brand = {
  primary: '#F2A33A',
  primaryDark: '#080C24',
  accent: '#F2A33A',
  accentLight: '#F7C27A',
  accentGlow: 'rgba(242, 163, 58, 0.22)',
  teal: '#19A7A1',
  tealLight: '#3FD9B7',
  tealGlow: 'rgba(25, 167, 161, 0.22)',
  danger: '#E8543F',
  dangerGlow: 'rgba(232, 84, 63, 0.22)',
  success: '#19A7A1',
  info: '#5D7CFF',
  warning: '#F5A55E',
  white: '#FFFFFF',
  black: '#070A20',
};

/** Qorong'i mavzu (standart, hozirgi fon) */
export const darkColors = {
  ...brand,
  // Formo palitrasi: fon #050818, sirt #0E1A3F, oltin #F2A33A, firuza #19A7A1
  background: '#050818',
  backgroundAlt: '#08102C',
  surface: '#0E1A3F',
  surfaceRaised: '#15234F',
  surfaceSubtle: '#0B1535',
  border: '#212B60',
  borderLight: '#2D3A7A',
  borderActive: '#F2A33A',
  text: '#FFFFFF',
  textSecondary: '#C5CCE8',
  muted: '#838EB8',
  dim: '#57628C',
  chip: '#141C44',
  chipActive: '#1D285E',
  tabBar: '#070D26',
  tabBarBorder: '#18214F',
  // Qizil fonli ogohlantirish matni; balans/tavsiya kartalari gradienti; Switch o'chiq holati
  dangerText: '#F5A398',
  cardGradient: ['#1D2F8C', '#0E1A3F'],
  switchOff: '#2A3160',
  rowAlt: 'rgba(27, 37, 96, 0.4)',
};

/** Yorug' mavzu — och kulrang-ko'k fon, oq kartalar; urg'u rangi oq fonda o'qilishi uchun biroz to'qroq */
export const lightColors = {
  ...brand,
  primary: '#E58A0C',
  accent: '#E58A0C',
  accentLight: '#B96A00',
  accentGlow: 'rgba(229, 138, 12, 0.14)',
  teal: '#108F89',
  tealLight: '#0E7F7A',
  tealGlow: 'rgba(16, 143, 137, 0.14)',
  danger: '#D9432E',
  dangerGlow: 'rgba(217, 67, 46, 0.12)',
  success: '#108F89',
  background: '#F3F5FA',
  backgroundAlt: '#E9EDF6',
  surface: '#FFFFFF',
  surfaceRaised: '#EDF0F8',
  surfaceSubtle: '#F7F8FC',
  border: '#DCE1EE',
  borderLight: '#C9D0E3',
  borderActive: '#E58A0C',
  text: '#0A1330',
  textSecondary: '#3C4566',
  muted: '#667090',
  dim: '#98A0BC',
  chip: '#EDF0F8',
  chipActive: '#E0E5F3',
  tabBar: '#FFFFFF',
  tabBarBorder: '#DCE1EE',
  dangerText: '#B93322',
  cardGradient: ['#FFFFFF', '#E4EAF8'],
  switchOff: '#C9D0E3',
  rowAlt: '#F3F5FA',
};

// ─── Faol mavzu ───────────────────────────────────────────────────────────────
// Ekranlar `colors` va `themedStyles` orqali doim FAOL mavzu ranglarini o'qiydi: mavzu almashganda
// ThemeProvider `setActiveTheme` ni chaqiradi va butun daraxt qayta chiziladi (App.js useTheme'ga obuna).
const palettes = { dark: darkColors, light: lightColors };
let activeTheme = 'dark';

export const getActiveTheme = () => activeTheme;
export const isLightTheme = () => activeTheme === 'light';
export function setActiveTheme(name) {
  activeTheme = name === 'light' ? 'light' : 'dark';
}

const paletteProxy = (pick) =>
  new Proxy(
    {},
    {
      get: (_, key) => pick()[key],
      has: (_, key) => key in pick(),
      ownKeys: () => Reflect.ownKeys(pick()),
      getOwnPropertyDescriptor: (_, key) =>
        key in pick() ? { value: pick()[key], enumerable: true, configurable: true, writable: false } : undefined,
    },
  );

/** Faol mavzu ranglari. Qiymat o'qilgan paytdagi mavzudan olinadi — modul yuklanganda emas, render paytida o'qing. */
export const colors = paletteProxy(() => palettes[activeTheme]);

/** `dark` va `light` variantli ixtiyoriy rang to'plami uchun (masalan, AuthUi palitrasi) */
export const themedPalette = (variants) => paletteProxy(() => variants[activeTheme] || variants.dark);

/**
 * StyleSheet.create o'rniga: uslublar har mavzu uchun bir marta (birinchi o'qilganda) yaratiladi.
 *   const styles = themedStyles(() => ({ root: { backgroundColor: colors.background } }));
 */
export function themedStyles(factory) {
  const cache = {};
  const sheet = () => cache[activeTheme] || (cache[activeTheme] = StyleSheet.create(factory()));
  return new Proxy(
    {},
    {
      get: (_, key) => sheet()[key],
      has: (_, key) => key in sheet(),
      ownKeys: () => Reflect.ownKeys(sheet()),
      getOwnPropertyDescriptor: (_, key) =>
        key in sheet() ? { value: sheet()[key], enumerable: true, configurable: true, writable: false } : undefined,
    },
  );
}

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

export const screenStyles = themedStyles(() => ({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: 115,
  },
}));
