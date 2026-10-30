import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { EmptyState, Header, Screen, SectionTitle } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import Kit360ClubGrid from '../components/ui/Kit360ClubGrid';
import { useCategories, useClubs, useFavorites } from '../features/products';

const FAVORITES = 'fav';

/**
 * Katalog — Forma 360° jamoalari (admin paneldagi Forma 360° suratlari): qidiruv, ligalar va "Sevimlilar"
 * filtri, haqiqiy forma surati bilan kartalar to'ri. Backend faqat kit360Id bog'langan klublarni beradi.
 * initialCategoryId / focusSearch — bosh sahifadan kelganda (liga plitkasi yoki qidiruv).
 */
export default function CatalogScreen({ t, onClub, initialCategoryId = null, focusSearch = false }) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  useEffect(() => {
    setCategoryId(initialCategoryId);
  }, [initialCategoryId]);
  const favoritesOnly = categoryId === FAVORITES;

  const { categories } = useCategories();
  const {
    clubs,
    isLoading: clubsLoading,
    error: clubsError,
    refetch: refetchClubs,
  } = useClubs({ categoryId: favoritesOnly ? null : categoryId, search: query });
  const { ids: favoriteIds, toggle: toggleFavorite } = useFavorites();

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

  return (
    <Screen>
      <Header cart title={t('catalog')} subtitle={t('catalogSub')} />

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
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
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{chip.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionTitle
        title={isFiltering ? `${t('allClubs')} (${shown.length})` : t('allClubs')}
        action={isFiltering ? t('resetFilters') : undefined}
        onAction={isFiltering ? resetFilters : undefined}
        eyebrow={t('eyebrowClubs')}
      />

      {clubsError ? (
        <ErrorView message={t('loadError')} onRetry={refetchClubs} retryLabel={t('retry')} />
      ) : shown.length > 0 || clubsLoading ? (
        <Kit360ClubGrid
          t={t}
          clubs={shown}
          loading={clubsLoading}
          onPress={(club) => onClub(club)}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
        />
      ) : (
        <EmptyState
          icon={isFiltering ? 'magnify-close' : 'tshirt-crew-outline'}
          title={isFiltering ? t('noResults') : t('catalogEmpty')}
          description={isFiltering ? t('noResultsSub') : t('catalogEmpty')}
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
  clearSearch: { padding: 4 },
  chipsRow: { gap: 8, paddingBottom: spacing.lg },
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
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.primaryDark, fontWeight: '900' },
});
