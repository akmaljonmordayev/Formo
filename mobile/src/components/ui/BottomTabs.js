import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, TAB_BAR_HEIGHT } from '../../constants/theme';

const TABS = [
  { key: 'home', label: 'Asosiy', icon: 'home-outline', iconActive: 'home' },
  { key: 'catalog', label: 'Katalog', icon: 'view-grid-outline', iconActive: 'view-grid' },
  { key: 'cart', label: 'Savatcha', icon: 'cart-outline', iconActive: 'cart' },
  { key: 'orders', label: 'Buyurtmalar', icon: 'clipboard-list-outline', iconActive: 'clipboard-list' },
  { key: 'profile', label: 'Profil', icon: 'account-outline', iconActive: 'account' },
];

export function BottomTabs({ active, onChange, t, cartCount = 0 }) {
  return (
    <View style={styles.root}>
      {TABS.map(({ key, label, icon, iconActive }) => {
        const isActive = active === key;
        const isCart = key === 'cart';

        return (
          <Pressable key={key} onPress={() => onChange(key)} style={styles.item}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons
                name={isActive ? iconActive : icon}
                size={22}
                color={isActive ? colors.accent : '#7C86AE'}
              />
              {isCart && cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {t ? t(key) || label : label}
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
    height: TAB_BAR_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: '#1C2148',
    backgroundColor: colors.tabBar || '#070A24',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  item: {
    alignItems: 'center',
    width: 66,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: colors.accent,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#080C24',
    fontSize: 10,
    fontWeight: '900',
  },
  label: {
    color: '#7C86AE',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  activeLabel: {
    color: colors.accent,
    fontWeight: '800',
  },
});
