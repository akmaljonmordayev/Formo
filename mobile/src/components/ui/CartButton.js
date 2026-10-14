import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../constants/theme';

// Savatga tez kirish tugmasi (headerlarda) — soni badge bilan ko'rsatiladi.
export default function CartButton({ count = 0, onPress, t }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t ? t('cart') : 'Cart'}
      hitSlop={6}
      style={styles.btn}
    >
      <MaterialCommunityIcons name="cart-outline" size={22} color={colors.accent} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151B42',
    borderWidth: 1,
    borderColor: '#1E2452',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.black, fontSize: 10, fontWeight: '900' },
});