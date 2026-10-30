import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { Badge, formatMoney } from './Common';
import { JerseyPreview } from './JerseyPreview';

export function ProductCard({ product, onPress, favorite, onFavorite, style }) {
  if (!product) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed, style]}
    >
      <View style={styles.imageBox}>
        {product.badge ? (
          <View style={styles.badgeWrap}>
            <Badge label={product.badge} variant="teal" />
          </View>
        ) : null}

        {onFavorite ? (
          <Pressable
            onPress={onFavorite}
            style={styles.heartButton}
            hitSlop={8}
            accessibilityLabel="Favorite"
          >
            <MaterialCommunityIcons
              name={favorite ? 'heart' : 'heart-outline'}
              size={20}
              color={favorite ? colors.accent : colors.muted}
            />
          </Pressable>
        ) : null}

        <View style={styles.jerseyCenter}>
          <JerseyPreview product={product} compact number="10" />
        </View>

        <View style={styles.shineGlow} />
      </View>

      <View style={styles.info}>
        {/* Kategoriya faqat serverda bo'lsa; balandlik saqlanadi — kartalar bir tekis */}
        <Text style={styles.category} numberOfLines={1}>
          {product.category || ' '}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatMoney(product.price)}</Text>
          <View style={styles.arrowIcon}>
            <MaterialCommunityIcons name="arrow-right" size={14} color={colors.accent} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '48%',
    marginBottom: spacing.md,
  },
  // Barcha kartalarda bir xil nisbat (4:5) — forma markazda, kesilmaydi
  imageBox: {
    aspectRatio: 0.8,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  badgeWrap: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
  },
  heartButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 3,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(7, 10, 32, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    zIndex: 1,
  },
  shineGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    bottom: -20,
    zIndex: 0,
  },
  info: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  category: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
    minHeight: 36,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  price: {
    color: colors.accent,
    fontFamily: fonts.numeric,
    fontSize: 17,
    letterSpacing: 0.3,
  },
  arrowIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
