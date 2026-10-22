import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Badge, Button, Card, EmptyState, Header, Screen, SectionTitle } from '../components/ui/Common';
import CartButton from '../components/ui/CartButton';
import ErrorView from '../components/ui/ErrorView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ProductCard } from '../components/ui/ProductCard';
import { useCategories, useClubs, useFavorites, usePopularProducts } from '../features/products';

export default function CatalogScreen({ t, onClub, cartCount = 0, onCart }) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState(null);

  const { categories, isLoading: catLoading } = useCategories();
  const {
    clubs,
    isLoading: clubsLoading,
    error: clubsError,
    refetch: refetchClubs,
  } = useClubs({ categoryId, search: query });
  const { products, isLoading: prodLoading } = usePopularProducts(6);
  const { favorites, ids: favoriteIds, toggle: toggleFavorite } = useFavorites();

  const favoriteClub = favorites[0] || null;
  const chips = [{ id: null, name: t('all') }, ...categories];
  const isFiltering = Boolean(query.trim() || categoryId);

  return (
    <Screen>
      <Header
        title={t('catalog')}
        subtitle={t('catalogSub')}
        right={<CartButton count={cartCount} onPress={onCart} t={t} />}
      />

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
          clearButtonMode="while-editing"
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
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
              {favoriteClub.forms} {t('kitsWord')} · {favoriteClub.season || '2025/2026'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accent} />
        </Pressable>
      ) : null}

      {/* Clubs Grid Section */}
      <SectionTitle
        title={isFiltering ? `${t('allClubs')} (${clubs.length})` : t('allClubs')}
        eyebrow="OFFICIAL CLUBS"
      />

      {clubsError ? (
        <ErrorView message={t('loadError')} onRetry={refetchClubs} retryLabel={t('retry')} />
      ) : clubsLoading && clubs.length === 0 ? (
        <View style={styles.loadingBox}>
          <LoadingSpinner />
        </View>
      ) : clubs.length > 0 ? (
        <View style={styles.clubGrid}>
          {clubs.map((club) => {
            const isFav = favoriteIds.includes(club.id);
            return (
              <Pressable
                key={club.id}
                style={({ pressed }) => [styles.clubCard, pressed && styles.cardPressed]}
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

                <View
                  style={[
                    styles.clubCrest,
                    {
                      backgroundColor: club.color || colors.surfaceRaised,
                      borderColor: club.accent || colors.accent,
                    },
                  ]}
                >
                  <Text style={[styles.clubCrestCode, { color: club.accent || colors.white }]}>
                    {club.code || club.name?.slice(0, 3).toUpperCase()}
                  </Text>
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
              ? 'Qidiruv bo‘yicha hech narsa topilmadi. Boshqa nom yoki filtrni sinab ko‘ring.'
              : t('catalogEmpty')
          }
          actionLabel={isFiltering ? t('all') : undefined}
          onAction={isFiltering ? () => { setQuery(''); setCategoryId(null); } : undefined}
        />
      )}

      {/* Popular Models Grid */}
      {products.length > 0 ? (
        <View style={styles.modelsSection}>
          <SectionTitle title={t('popularModels')} eyebrow="HOT PICKS" />
          <View style={styles.modelsGrid}>
            {products.map((item) => (
              <ProductCard
                key={item.kitId}
                product={item}
                favorite={favoriteIds.includes(item.clubId)}
                onFavorite={() => toggleFavorite(item.clubId)}
                onPress={() => onClub({ id: item.clubId, name: item.clubName }, item.kitId)}
              />
            ))}
          </View>
        </View>
      ) : null}
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
  chip: {
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
    gap: 12,
    marginBottom: spacing.xl,
  },
  clubCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    alignItems: 'center',
    position: 'relative',
  },
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
    fontSize: 11,
    fontWeight: '800',
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
