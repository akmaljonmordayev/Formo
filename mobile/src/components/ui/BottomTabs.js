import React, { memo, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../constants/theme';
import { useKeyboard } from './KeyboardAware';

const TABS = [
  { key: 'home', label: 'home', icon: 'home-variant-outline', iconActive: 'home-variant' },
  { key: 'catalog', label: 'catalog', icon: 'view-grid-outline', iconActive: 'view-grid' },
  { key: 'studio', label: 'studio', icon: 'tshirt-crew-outline', iconActive: 'tshirt-crew' },
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

/** Markazdagi "Studiya" — ko'tarilgan oltin tugma */
const StudioItem = memo(function StudioItem({ tab, active, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.studioItem, pressed && styles.studioPressed]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <View style={[styles.studioRing, active && styles.studioRingActive]}>
        <LinearGradient
          colors={active ? ['#FFD08A', '#F2A33A'] : ['#F7C27A', '#E08A1E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.studioButton}
        >
          <MaterialCommunityIcons name={active ? tab.iconActive : tab.icon} size={26} color={colors.primaryDark} />
        </LinearGradient>
      </View>
      <Text style={[styles.label, styles.studioLabel, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

export const BottomTabs = memo(function BottomTabs({ active, onChange, t }) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboard();
  // Yozish paytida panel klaviatura ustiga chiqib, inputlarni yopmasin
  if (kb.visible) return null;

  return (
    <View pointerEvents="box-none" style={[styles.root, { bottom: Math.max(insets.bottom, 12) }]}>
      <LinearGradient
        colors={['rgba(21, 35, 79, 0.97)', 'rgba(7, 13, 38, 0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.bar}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          const Item = tab.key === 'studio' ? StudioItem : TabItem;
          return <Item key={tab.key} tab={tab} active={isActive} label={t(tab.label)} onPress={() => onChange(tab.key)} />;
        })}
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: SIDE_GAP,
    right: SIDE_GAP,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
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
    backgroundColor: 'rgba(242, 163, 58, 0.14)',
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
  studioItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingBottom: 9,
  },
  studioPressed: { transform: [{ scale: 0.95 }] },
  studioRing: {
    position: 'absolute',
    top: -22,
    padding: 4,
    borderRadius: 34,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.22)',
  },
  studioRingActive: {
    borderColor: colors.accent,
  },
  studioButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  studioLabel: {
    color: colors.accentLight,
    fontWeight: '800',
  },
});
