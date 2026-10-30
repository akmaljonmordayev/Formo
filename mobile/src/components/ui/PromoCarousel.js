import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing } from '../../constants/theme';

const AUTOPLAY_MS = 5000;
const GAP = 10;

/**
 * Bosh sahifadagi aksiya bannerlari (to'liq kenglikdagi swiper): sahifalab suriladi, o'zi aylanadi
 * (barmoq tekkanda to'xtaydi), nuqtalar joriy sahifani ko'rsatadi.
 *
 * slides: [{ key, overline, title, sub, cta, colors: [from, to], art: ReactNode, onPress }]
 */
export default function PromoCarousel({ slides }) {
  const { width: screen } = useWindowDimensions();
  const cardW = screen - spacing.lg * 2;
  const step = cardW + GAP;
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const touching = useRef(false);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = setInterval(() => {
      if (touching.current) return;
      setIndex((current) => {
        const next = (current + 1) % slides.length;
        listRef.current?.scrollToOffset({ offset: next * step, animated: true });
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [slides.length, step]);

  return (
    <View>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        getItemLayout={(_, i) => ({ length: step, offset: step * i, index: i })}
        onScrollBeginDrag={() => {
          touching.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          touching.current = false;
          setIndex(Math.max(0, Math.min(slides.length - 1, Math.round(e.nativeEvent.contentOffset.x / step))));
        }}
        renderItem={({ item }) => (
          <Pressable onPress={item.onPress} style={({ pressed }) => [{ width: cardW }, pressed && styles.pressed]} accessibilityRole="button">
            <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
              <View style={styles.glow} />
              <View style={styles.copy}>
                {item.overline ? <Text style={styles.overline}>{item.overline}</Text> : null}
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.sub ? (
                  <Text style={styles.sub} numberOfLines={2}>
                    {item.sub}
                  </Text>
                ) : null}
                <View style={styles.cta}>
                  <Text style={styles.ctaText}>{item.cta}</Text>
                  <MaterialCommunityIcons name="arrow-right" size={15} color={colors.primaryDark} />
                </View>
              </View>
              <View style={styles.art} pointerEvents="none">
                {item.art}
              </View>
            </LinearGradient>
          </Pressable>
        )}
      />
      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 186,
    borderRadius: radii.xl,
    overflow: 'hidden',
    padding: spacing.xl,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  glow: { position: 'absolute', right: -50, top: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.08)' },
  copy: { width: '58%', zIndex: 2 },
  overline: { color: colors.accentLight, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 19, lineHeight: 24 },
  sub: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 6 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radii.round,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  ctaText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' },
  art: { position: 'absolute', right: -4, bottom: -18, zIndex: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.accent },
});
