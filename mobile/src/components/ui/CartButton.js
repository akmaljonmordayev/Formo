import React, { createContext, useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../constants/theme';

/** { count, open, t } — AppNavigator beradi; Header `cart` bo'lsa shu orqali savatni ochadi */
export const CartContext = createContext(null);

/** Sarlavhadagi savat: kontekst bo'lmasa (masalan, kirish ekranlari) hech narsa chizmaydi */
export function HeaderCart() {
  const cart = useContext(CartContext);
  if (!cart) return null;
  return <CartButton count={cart.count} onPress={cart.open} t={cart.t} />;
}

export default function CartButton({ count = 0, onPress, t }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t ? t('cart') : 'Cart'}
      hitSlop={6}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name="cart-outline" size={21} color={colors.accent} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
