import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, TAB_BAR_HEIGHT } from '../../constants/theme';

const TABS = [
  { key: 'home',    label: 'home',    icon: 'home-outline',         iconActive: 'home' },
  { key: 'catalog', label: 'catalog', icon: 'view-grid-outline',    iconActive: 'view-grid' },
  { key: 'studio',  label: 'studio',  icon: 'pencil-ruler',         iconActive: 'pencil-ruler' },
  { key: 'orders',  label: 'orders',  icon: 'clipboard-list-outline',iconActive: 'clipboard-list' },
  { key: 'profile', label: 'profile', icon: 'account-outline',      iconActive: 'account' },
];

export function BottomTabs({ active, onChange, t }) {
  return (
    <View style={styles.root}>
      {TABS.map(({ key, label, icon, iconActive }) => {
        const isActive = active === key;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={styles.item}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons
                name={isActive ? iconActive : icon}
                size={22}
                color={isActive ? colors.accent : '#7C86AE'}
              />
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>{t(label)}</Text>
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
    height: TAB_BAR_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: '#1C2148',
    backgroundColor: colors.tabBar,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  item: {
    alignItems: 'center',
    width: 66,
  },
  iconWrap: {
    position: 'relative',
  },
  label: {
    color: '#7C86AE',
    fontSize: 10,
    marginTop: 4,
  },
  activeLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
});
