import React from 'react';
import { Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing, themedStyles } from '../../constants/theme';
import { Badge, formatMoney } from './Common';
import Kit360Thumb from './Kit360Thumb';

export function ProductCard({ product, onPress, favorite, onFavorite, favoriteLabel = 'Favorite', style }) {
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
            style={[styles.heartButton, favorite && styles.heartButtonActive]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(favorite) }}
            accessibilityLabel={favoriteLabel}
          >
            <MaterialCommunityIcons
              name={favorite ? 'heart' : 'heart-outline'}
              size={20}
              color={favorite ? colors.danger : '#ffffff'}
            />
          </Pressable>
        ) : null}

        <Kit360Thumb team={product.kit360Id} variant={product.variant} />
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
          {/* `cta` — narx ko'rsatilmaydigan kartalar (forma narxi o'lchamga bog'liq); narx noma'lum — "0 so'm" chiqmaydi */}
          {product.cta ? (
            <Text style={styles.cta} numberOfLines={1}>{product.cta}</Text>
          ) : (
            <Text style={styles.price}>{product.price != null ? formatMoney(product.price) : ' '}</Text>
          )}
          <View style={styles.arrowIcon}>
            <MaterialCommunityIcons name="arrow-right" size={14} color={colors.accent} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  root: {
    width: '48%',
    marginBottom: spacing.md,
  },
  // Barcha kartalarda bir xil nisbat (4:5) — Forma 360° surati markazda
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
  heartButtonActive: { backgroundColor: 'rgba(255, 255, 255, 0.92)' },
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
  cta: { flex: 1, color: colors.accent, fontFamily: fonts.bodySemi, fontSize: 13 },
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
}));
