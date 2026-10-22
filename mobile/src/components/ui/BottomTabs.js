import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, TAB_BAR_HEIGHT } from '../../constants/theme';

const TABS = [
  { key: 'home', label: 'home', icon: 'home-outline', iconActive: 'home' },
  { key: 'catalog', label: 'catalog', icon: 'view-grid-outline', iconActive: 'view-grid' },
  { key: 'studio', label: 'studio', icon: 'tshirt-crew-outline', iconActive: 'tshirt-crew' },
  { key: 'orders', label: 'orders', icon: 'clipboard-list-outline', iconActive: 'clipboard-list' },
  { key: 'profile', label: 'profile', icon: 'account-outline', iconActive: 'account' },
];

export function BottomTabs({ active, onChange, t }) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  const totalHeight = TAB_BAR_HEIGHT + bottomPadding - 10;

  return (
    <View style={[styles.root, { height: totalHeight, paddingBottom: bottomPadding }]}>
      {TABS.map(({ key, label, icon, iconActive }) => {
        const isActive = active === key;
        const isStudio = key === 'studio';

        if (isStudio) {
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              style={styles.studioItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.studioIconWrap, isActive && styles.studioIconWrapActive]}>
                <MaterialCommunityIcons
                  name={isActive ? iconActive : icon}
                  size={24}
                  color={isActive ? colors.primaryDark : colors.accent}
                />
              </View>
              <Text style={[styles.studioLabel, isActive && styles.activeLabel]}>
                {t(label)}
              </Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <MaterialCommunityIcons
                name={isActive ? iconActive : icon}
                size={22}
                color={isActive ? colors.accent : colors.muted}
              />
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {t(label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
    backgroundColor: colors.tabBar,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  iconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  activeLabel: {
    color: colors.accent,
    fontWeight: '800',
  },
  studioItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -16,
  },
  studioIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  studioIconWrapActive: {
    backgroundColor: colors.accent,
    borderColor: colors.white,
  },
  studioLabel: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
});
