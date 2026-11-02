import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii } from '../../constants/theme';
import Kit360Thumb from './Kit360Thumb';
import Skeleton from './Skeleton';

const GAP = 12;
const COLUMNS = 2;
// Karta surati: kenglikdan 1.15 baravar baland (forma to'liq ko'rinsin)
const PHOTO_RATIO = 1.15;

/**
 * Forma 360° klublari to'ri (katalog va studiyada formani tanlash): haqiqiy forma surati, nomi, ligasi.
 * Karta kengligi o'lchangan to'r kengligidan — foizli kenglik + gap tor ekranlarda sinardi.
 *
 * Props: clubs (toClub), onPress(club), loading, favoriteIds?, onToggleFavorite?(clubId), t
 */
export default function Kit360ClubGrid({ clubs, onPress, loading = false, favoriteIds, onToggleFavorite, t }) {
  const [gridWidth, setGridWidth] = useState(0);
  const cardWidth = gridWidth ? Math.floor((gridWidth - GAP * (COLUMNS - 1)) / COLUMNS) : 0;
  const photoHeight = Math.round(cardWidth * PHOTO_RATIO);
  const onLayout = (e) => setGridWidth(e.nativeEvent.layout.width);

  if (loading && !clubs.length) {
    return (
      <View style={styles.grid} onLayout={onLayout}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={cardWidth || 150} height={(photoHeight || 170) + 52} radius={radii.lg} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid} onLayout={onLayout}>
      {cardWidth
        ? clubs.map((club) => {
            const isFav = favoriteIds?.includes(club.id);
            return (
              <Pressable
                key={club.id}
                style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
                onPress={() => onPress(club)}
                accessibilityRole="button"
                accessibilityLabel={club.name}
              >
                <Kit360Thumb team={club.kit360Id} width={cardWidth} height={photoHeight} />
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="rotate-3d-variant" size={12} color={colors.white} />
                  <Text style={styles.badgeText}>360°</Text>
                </View>
                {onToggleFavorite ? (
                  <Pressable style={styles.fav} hitSlop={8} onPress={() => onToggleFavorite(club.id)} accessibilityLabel={t('favorites')}>
                    <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? colors.accent : colors.white} />
                  </Pressable>
                ) : null}
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {club.name}
                  </Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {club.league || `${club.forms || 1} ${t('kitsWord')}`}
                  </Text>
                </View>
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginBottom: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(8,12,36,0.55)',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  fav: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,12,36,0.45)',
  },
  info: { paddingHorizontal: 10, paddingVertical: 9 },
  name: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 },
  sub: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
