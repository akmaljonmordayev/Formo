import React, { memo, useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, isLightTheme, themedStyles } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useKeyboard } from './KeyboardAware';

const TABS = [
  { key: 'home', label: 'home', icon: 'home-variant-outline', iconActive: 'home-variant' },
  // "Formalar" — Forma 360° katalogi (ligalar, qishki/yozgi formalar); marshrut kaliti eskicha 'studio'
  { key: 'studio', label: 'formsTab', icon: 'tshirt-crew-outline', iconActive: 'tshirt-crew' },
  { key: 'orders', label: 'orders', icon: 'clipboard-text-outline', iconActive: 'clipboard-text' },
  { key: 'profile', label: 'profile', icon: 'account-circle-outline', iconActive: 'account-circle' },
];

const BAR_HEIGHT = 66;
const SIDE_GAP = 14;

/** Suzuvchi panel pastdan qancha joy egallaydi — ustidagi footer'lar shu balandlikda turadi */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, 12) + 8;
}

/** Faol tabda ikonka biroz kattalashadi va tagida oltin nuqta paydo bo'ladi */
const TabItem = memo(function TabItem({ tab, active, label, onPress }) {
  useTheme(); // memo: mavzu almashganda qayta chizilsin
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: active ? 1 : 0, useNativeDriver: true, friction: 7, tension: 140 }).start();
  }, [active, anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      hitSlop={4}
    >
      <Animated.View style={[styles.iconWrap, active && styles.iconWrapActive, { transform: [{ scale }] }]}>
        <MaterialCommunityIcons name={active ? tab.iconActive : tab.icon} size={22} color={active ? colors.accent : colors.muted} />
      </Animated.View>
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

export const BottomTabs = memo(function BottomTabs({ active, onChange, t }) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboard();
  const { theme } = useTheme();
  // Yozish paytida panel klaviatura ustiga chiqib, inputlarni yopmasin
  if (kb.visible) return null;

  return (
    <View pointerEvents="box-none" style={[styles.root, { bottom: Math.max(insets.bottom, 12) }]}>
      <LinearGradient
        colors={theme === 'light' ? ['rgba(255, 255, 255, 0.98)', 'rgba(246, 248, 252, 0.99)'] : ['rgba(21, 35, 79, 0.97)', 'rgba(7, 13, 38, 0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.bar}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return <TabItem key={tab.key} tab={tab} active={isActive} label={t(tab.label)} onPress={() => onChange(tab.key)} />;
        })}
      </LinearGradient>
    </View>
  );
});

const styles = themedStyles(() => ({
  root: {
    position: 'absolute',
    left: SIDE_GAP,
    right: SIDE_GAP,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: isLightTheme() ? colors.border : 'rgba(242, 163, 58, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isLightTheme() ? 0.14 : 0.45,
    shadowRadius: 18,
    elevation: 16,
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.accentGlow,
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: colors.accent,
    fontWeight: '800',
  },
}));
