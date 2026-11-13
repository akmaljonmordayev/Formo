import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, themedStyles } from '../../constants/theme';

/** { count, open, t } — AppNavigator beradi; Header `cart` bo'lsa shu orqali savatni ochadi */
export const CartContext = createContext(null);

/** Sarlavhadagi savat: kontekst bo'lmasa (masalan, kirish ekranlari) hech narsa chizmaydi */
export function HeaderCart() {
  const cart = useContext(CartContext);
  if (!cart) return null;
  return <CartButton count={cart.count} onPress={cart.open} t={cart.t} />;
}

/** Soni oshganda (savatga qo'shildi) savat "sakraydi", nishon esa kattalashib qaytadi */
function useBump(count) {
  const bump = useRef(new Animated.Value(0)).current;
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current) {
      bump.setValue(0);
      Animated.sequence([
        Animated.timing(bump, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(bump, { toValue: 0, friction: 3, tension: 160, useNativeDriver: true }),
      ]).start();
    }
    prev.current = count;
  }, [count, bump]);
  return bump;
}

export default function CartButton({ count = 0, onPress, t }) {
  const bump = useBump(count);
  const scale = bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const rotate = bump.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-12deg'] });
  const badgeScale = bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t ? t('cart') : 'Cart'}
      hitSlop={6}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Animated.View style={{ transform: [{ scale }, { rotate }] }}>
        <MaterialCommunityIcons name="cart-outline" size={21} color={colors.accent} />
      </Animated.View>
      {count > 0 ? (
        <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

const styles = themedStyles(() => ({
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
}));
