import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../../constants/theme';
import { Badge, formatMoney } from './Common';
import Kit360Thumb from './Kit360Thumb';

const AUTOPLAY_MS = 4500;
const GAP = 12;
const STAGE_HEIGHT = 230;

/**
 * Formalar karuseli (Swiper uslubida): kartaga "yopishadi", markaziy karta kattalashadi,
 * nuqtalar sahifani ko'rsatadi, 4.5 soniyada o'zi suriladi (foydalanuvchi surganda to'xtaydi).
 * Hammasi native-driver'da — JS oqimi band bo'lsa ham silliq.
 *
 * Props: items — toProduct() ko'rinishidagi formalar, onPress(item), t
 */
export default function KitCarousel({ items, onPress, t }) {
  const { width: screen } = useWindowDimensions();
  const cardWidth = Math.min(300, Math.round(screen * 0.68));
  const step = cardWidth + GAP;
  // Karusel ekran kengligida (Home: marginHorizontal -lg) — markaziy karta o'rtada turadi
  const sidePad = Math.max(spacing.lg, (screen - cardWidth) / 2);
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const touching = useRef(false);

  useEffect(() => {
    if (items.length < 2) return undefined;
    const timer = setInterval(() => {
      if (touching.current) return;
      setIndex((current) => {
        const next = (current + 1) % items.length;
        listRef.current?.scrollToOffset({ offset: next * step, animated: true });
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [items.length, step]);

  if (!items.length) return null;

  return (
    <View>
      <Animated.FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => String(item.kitId)}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: sidePad }}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          touching.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          touching.current = false;
          setIndex(Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.x / step))));
        }}
        getItemLayout={(_, i) => ({ length: step, offset: step * i, index: i })}
        renderItem={({ item, index: i }) => {
          const range = [(i - 1) * step, i * step, (i + 1) * step];
          const scale = scrollX.interpolate({ inputRange: range, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange: range, outputRange: [0.55, 1, 0.55], extrapolate: 'clamp' });
          return (
            <Animated.View style={{ width: cardWidth, opacity, transform: [{ scale }] }}>
              <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.card, pressed && styles.pressed]} accessibilityRole="button">
                <View style={styles.stage}>
                  <Kit360Thumb team={item.kit360Id} width={cardWidth} height={STAGE_HEIGHT} zoom={1.15} />
                  <View style={styles.badge}>
                    <Badge label={item.badge || t('featured')} variant="teal" />
                  </View>
                </View>
                <View style={styles.info}>
                  <Text style={styles.category} numberOfLines={1}>{item.category || ' '}</Text>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.row}>
                    <Text style={styles.price}>{formatMoney(item.price)}</Text>
                    <View style={styles.cta}>
                      <Text style={styles.ctaText}>{t('viewKit')}</Text>
                      <MaterialCommunityIcons name="arrow-right" size={14} color={colors.accent} />
                    </View>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        }}
      />
      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((item, i) => (
            <View key={item.kitId} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  stage: { height: STAGE_HEIGHT },
  badge: { position: 'absolute', top: 12, left: 12 },
  info: { padding: spacing.md, gap: 2 },
  category: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  name: { color: colors.text, fontSize: 15, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  price: { color: colors.accent, fontSize: 16, fontWeight: '900' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.accent },
});
