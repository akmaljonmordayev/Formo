import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../../constants/theme';
import Kit360Thumb from './Kit360Thumb';

const AUTO_HIDE_MS = 5000;
const FLY_MS = 760;
const SPARKS = [0, 60, 120, 180, 240, 300];

/**
 * "Savatga qo'shildi" lahzasi (savat sarlavhada ko'rinmasligi ham mumkin — shuning uchun ikki qismli):
 *  1) forma surati tugmadan yuqori o'ng burchakdagi savatga yoy bo'ylab "uchadi" (savat nishoni sakraydi);
 *  2) pastdan karta chiqadi: yashil belgi + uchqunlar, nima qo'shilgani va "Savatga o'tish" tugmasi.
 *
 * Props: event ({ key, team, summary } | null — har yangi key animatsiyani qayta boshlaydi), t,
 *        bottom (karta pastdan qancha balandda turadi), onOpenCart, onDismiss
 */
export default function AddedToCart({ event, t, bottom = 0, onOpenCart, onDismiss }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fly = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const key = event?.key;

  // Uchish: boshlanish — "Savatga" tugmasi atrofi, oxiri — sarlavhadagi savat tugmasi
  const start = { x: width - 130, y: height - bottom - 120 };
  const end = { x: width - spacing.lg - 34, y: insets.top + 14 };

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(sheet, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(
      ({ finished }) => finished && onDismiss && onDismiss(),
    );
  };

  useEffect(() => {
    if (!key) return undefined;
    fly.setValue(0);
    sheet.setValue(0);
    pop.setValue(0);
    Animated.parallel([
      Animated.timing(fly, { toValue: 1, duration: FLY_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(FLY_MS * 0.45),
        Animated.spring(sheet, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(FLY_MS * 0.7),
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      ]),
    ]).start();
    timer.current = setTimeout(hide, AUTO_HIDE_MS);
    return () => timer.current && clearTimeout(timer.current);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!event) return null;

  // Yoy: X chiziqli, Y avval biroz pastga "irg'iydi", so'ng tez yuqoriga
  const flyX = fly.interpolate({ inputRange: [0, 1], outputRange: [start.x, end.x] });
  const flyY = fly.interpolate({ inputRange: [0, 0.25, 1], outputRange: [start.y, start.y - 70, end.y] });
  const flyScale = fly.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.05, 0.25] });
  const flyRotate = fly.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '22deg'] });
  const flyOpacity = fly.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] });

  const sheetY = sheet.interpolate({ inputRange: [0, 1], outputRange: [160, 0] });
  const checkScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.flyer,
          { opacity: flyOpacity, transform: [{ translateX: flyX }, { translateY: flyY }, { scale: flyScale }, { rotate: flyRotate }] },
        ]}
      >
        <Kit360Thumb team={event.team} width={64} height={80} zoom={1.5} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { bottom: bottom + spacing.md, opacity: sheet, transform: [{ translateY: sheetY }] }]}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.checkWrap}>
          {SPARKS.map((deg) => {
            const dist = pop.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });
            const rad = (deg * Math.PI) / 180;
            return (
              <Animated.View
                key={deg}
                style={[
                  styles.spark,
                  {
                    opacity: pop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0] }),
                    transform: [
                      { translateX: Animated.multiply(dist, Math.cos(rad)) },
                      { translateY: Animated.multiply(dist, Math.sin(rad)) },
                    ],
                  },
                ]}
              />
            );
          })}
          <Animated.View style={[styles.check, { transform: [{ scale: checkScale }] }]}>
            <MaterialCommunityIcons name="check-bold" size={22} color={colors.primaryDark} />
          </Animated.View>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{t('addedTitle')}</Text>
          {event.summary ? (
            <Text style={styles.sub} numberOfLines={1}>
              {event.summary}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            hide();
            if (onOpenCart) onOpenCart();
          }}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="cart-arrow-right" size={18} color={colors.primaryDark} />
          <Text style={styles.ctaText}>{t('goToCart')}</Text>
        </Pressable>
        <Pressable onPress={hide} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel={t('keepShopping')}>
          <MaterialCommunityIcons name="close" size={16} color={colors.muted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flyer: {
    position: 'absolute',
    left: 0,
    top: 0,
    marginLeft: -32,
    marginTop: -40,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 12,
  },
  sheet: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    paddingRight: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(63, 217, 138, 0.45)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  checkWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3FD98A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  sub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.round,
    backgroundColor: colors.accent,
  },
  ctaPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  ctaText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' },
  close: { position: 'absolute', top: 6, right: 6, padding: 2 },
});
