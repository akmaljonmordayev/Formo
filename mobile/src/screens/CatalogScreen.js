import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { Badge, EmptyState, Header, Screen, SectionTitle } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import KitCarousel from '../components/ui/KitCarousel';
import { Shirt } from '../components/ui/Shirt';
import Skeleton from '../components/ui/Skeleton';
import { useCategories, useClubs, useFavorites, usePopularProducts } from '../features/products';

const CLUB_GAP = 10;
const FAVORITES = 'fav';

/**
 * Katalog: qidiruv, ligalar va "Sevimlilar" filtri, tavsiya formalar swiper'i, klublar to'ri.
 * initialCategoryId / focusSearch — bosh sahifadan kelganda (liga plitkasi yoki qidiruv).
 */
export default function CatalogScreen({ t, onClub, initialCategoryId = null, focusSearch = false }) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  useEffect(() => {
    setCategoryId(initialCategoryId);
  }, [initialCategoryId]);
  const favoritesOnly = categoryId === FAVORITES;

  const { categories, isLoading: catLoading } = useCategories();
  const {
    clubs,
    isLoading: clubsLoading,
    error: clubsError,
    refetch: refetchClubs,
  } = useClubs({ categoryId: favoritesOnly ? null : categoryId, search: query });
  const { products } = usePopularProducts(6);
  const { favorites, ids: favoriteIds, toggle: toggleFavorite } = useFavorites();

  const favoriteClub = favorites[0] || null;
  const chips = [
    { id: null, name: t('all') },
    ...(favoriteIds.length ? [{ id: FAVORITES, name: t('favorites'), icon: 'heart' }] : []),
    ...categories,
  ];
  const isFiltering = Boolean(query.trim() || categoryId);
  const shown = favoritesOnly ? clubs.filter((c) => favoriteIds.includes(c.id)) : clubs;
  const resetFilters = () => {
    setQuery('');
    setCategoryId(null);
  };
  // 3 ustunli to'r: karta kengligi o'lchangan to'r kengligidan (gap hisobga olinadi) —
  // foizli kenglik + gap tor ekranlarda 2+1 bo'lib sinardi
  const [gridWidth, setGridWidth] = useState(0);
  const clubCardWidth = gridWidth ? Math.floor((gridWidth - CLUB_GAP * 2) / 3) : undefined;

  return (
    <Screen>
      <Header cart title={t('catalog')} subtitle={t('catalogSub')} />

      {/* Modern Search Bar */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={22} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchClub')}
          placeholderTextColor={colors.dim}
          style={styles.searchInput}
          returnKeyType="search"
          autoFocus={focusSearch}
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.clearSearch}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {/* Categories / League Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {chips.map((chip) => {
          const isActive = categoryId === chip.id;
          return (
            <Pressable
              key={chip.id ?? 'all'}
              onPress={() => setCategoryId(chip.id)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              {chip.icon ? (
                <MaterialCommunityIcons name={chip.icon} size={13} color={isActive ? colors.primaryDark : colors.accent} />
              ) : null}
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Tavsiya formalar — filtrsiz ko'rinishda */}
      {!isFiltering && products.length ? (
        <View style={styles.featured}>
          <SectionTitle title={t('featuredKits')} eyebrow={t('eyebrowModels')} />
          <View style={styles.bleed}>
            <KitCarousel t={t} items={products} onPress={(item) => onClub({ id: item.clubId, name: item.clubName }, item.kitId)} />
          </View>
        </View>
      ) : null}

      {/* Favorite Club Highlight Card */}
      {favoriteClub && !isFiltering ? (
        <Pressable
          style={styles.favCard}
          onPress={() => onClub(favoriteClub)}
          accessibilityRole="button"
        >
          <View
            style={[
              styles.favCrest,
              {
                backgroundColor: favoriteClub.color || colors.surfaceRaised,
                borderColor: favoriteClub.accent || colors.accent,
              },
            ]}
          >
            <Text style={[styles.favCrestCode, { color: favoriteClub.accent || colors.white }]}>
              {favoriteClub.code || favoriteClub.name?.slice(0, 3).toUpperCase()}
            </Text>
          </View>
          <View style={styles.favInfo}>
            <Badge label={t('favoriteClub')} variant="orange" style={styles.favBadge} />
            <Text style={styles.favName} numberOfLines={1}>
              {favoriteClub.name}
            </Text>
            <Text style={styles.favSub}>
              {[`${favoriteClub.forms} ${t('kitsWord')}`, favoriteClub.season].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accent} />
        </Pressable>
      ) : null}

      {/* Clubs Grid Section */}
      <SectionTitle
        title={isFiltering ? `${t('allClubs')} (${shown.length})` : t('allClubs')}
        action={isFiltering ? t('resetFilters') : undefined}
        onAction={isFiltering ? resetFilters : undefined}
        eyebrow={t('eyebrowClubs')}
      />

      {clubsError ? (
        <ErrorView message={t('loadError')} onRetry={refetchClubs} retryLabel={t('retry')} />
      ) : clubsLoading && clubs.length === 0 ? (
        <View style={styles.clubGrid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width={clubCardWidth || 100} height={132} />
          ))}
        </View>
      ) : shown.length > 0 ? (
        <View style={styles.clubGrid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
          {shown.map((club) => {
            const isFav = favoriteIds.includes(club.id);
            return (
              <Pressable
                key={club.id}
                style={({ pressed }) => [styles.clubCard, clubCardWidth && { width: clubCardWidth }, pressed && styles.cardPressed]}
                onPress={() => onClub(club)}
                accessibilityRole="button"
              >
                <Pressable
                  style={styles.favIconBtn}
                  hitSlop={8}
                  onPress={() => toggleFavorite(club.id)}
                >
                  <MaterialCommunityIcons
                    name={isFav ? 'heart' : 'heart-outline'}
                    size={18}
                    color={isFav ? colors.accent : colors.dim}
                  />
                </Pressable>

                {/* Klub rangidagi (markColor) mini forma va gerb kodi */}
                <View style={styles.clubShirt}>
                  <Shirt
                    width={62}
                    color={club.color}
                    ink={club.accent}
                    side="front"
                    crest={club.code || club.name?.slice(0, 3) || ''}
                  />
                </View>

                <Text style={styles.clubName} numberOfLines={1}>
                  {club.name}
                </Text>
                <Text style={styles.clubSub} numberOfLines={1}>
                  {club.league || `${club.forms || 1} ${t('kitsWord')}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon={isFiltering ? 'magnify-close' : 'tshirt-crew-outline'}
          title={isFiltering ? t('noResults') : t('catalogEmpty')}
          description={
            isFiltering
              ? t('noResultsSub')
              : t('catalogEmpty')
          }
          actionLabel={isFiltering ? t('resetFilters') : undefined}
          onAction={isFiltering ? resetFilters : undefined}
        />
      )}

    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    paddingVertical: 0,
  },
  clearSearch: {
    padding: 4,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: spacing.lg,
  },
  featured: { marginBottom: spacing.lg },
  bleed: { marginHorizontal: -spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  favCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  favCrest: {
    width: 48,
    height: 56,
    borderRadius: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  favCrestCode: {
    fontSize: 13,
    fontWeight: '900',
  },
  favInfo: {
    flex: 1,
  },
  favBadge: {
    marginBottom: 4,
  },
  favName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  favSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  clubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CLUB_GAP,
    marginBottom: spacing.xl,
  },
  clubCard: {
    width: '30%', // o'lchov kelguncha (birinchi kadr)
    minHeight: 132,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 10,
    alignItems: 'center',
    position: 'relative',
  },
  clubShirt: { height: 66, justifyContent: 'center', marginBottom: 8 },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  favIconBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
  },
  clubCrest: {
    width: 44,
    height: 52,
    borderRadius: 8,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  clubCrestCode: {
    fontSize: 12,
    fontWeight: '900',
  },
  clubName: {
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },
  clubSub: {
    color: colors.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    width: '100%',
  },
  modelsSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  modelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
