import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Header, Screen, SectionTitle } from '../components/ui/Common';
import CartButton from '../components/ui/CartButton';
import ErrorView from '../components/ui/ErrorView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ProductCard } from '../components/ui/ProductCard';
import { useCategories, useClubs, useFavorites, usePopularProducts } from '../features/products';

// Katalog: GET /api/catalog/categories (chiplar), /clubs?categoryId&search (klublar),
// /clubs/popular + /clubs/:id (mashhur modellar), /favorites (sevimli klub).
export default function CatalogScreen({ t, onClub, cartCount = 0, onCart }) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const { categories } = useCategories();
  const { clubs, isLoading: clubsLoading, error: clubsError, refetch: refetchClubs } = useClubs({ categoryId, search: query });
  const { products } = usePopularProducts(4);
  const { favorites, ids: favoriteIds, toggle: toggleFavorite } = useFavorites();

  const favoriteClub = favorites[0] || null;
  const chips = [{ id: null, name: t('all') }, ...categories];

  return (
    <Screen>
      <Header
        title={t('catalog')}
        subtitle={t('catalogSub')}
        right={<CartButton count={cartCount} onPress={onCart} t={t} />}
      />

      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchClub')}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>

      <View style={styles.filters}>
        {chips.map((chip) => (
          <Pressable
            key={chip.id ?? 'all'}
            onPress={() => setCategoryId(chip.id)}
            style={[styles.filter, categoryId === chip.id && styles.activeFilter]}
          >
            <Text style={[styles.filterText, categoryId === chip.id && styles.activeText]}>{chip.name}</Text>
          </Pressable>
        ))}
      </View>

      {favoriteClub ? (
        <Pressable style={styles.favClub} onPress={() => onClub(favoriteClub)}>
          <View style={[styles.favCrest, { backgroundColor: favoriteClub.color, borderColor: favoriteClub.accent }]}>
            <Text style={[styles.favCrestCode, { color: favoriteClub.accent }]}>{favoriteClub.code}</Text>
          </View>
          <View style={styles.favCopy}>
            <Text style={styles.favOverline}>{t('favoriteClub')}</Text>
            <Text style={styles.favName}>{favoriteClub.name}</Text>
            <Text style={styles.favSub}>{favoriteClub.forms} {t('kitsWord')} · {favoriteClub.season}</Text>
          </View>
        </Pressable>
      ) : null}

      <Text style={styles.gridTitle}>{t('allClubs')}</Text>
      {clubsError ? (
        <ErrorView message={t('loadError')} onRetry={refetchClubs} retryLabel={t('retry')} />
      ) : clubsLoading && clubs.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <View style={styles.clubGrid}>
          {clubs.map((club) => (
            <Pressable key={club.id} style={styles.clubCard} onPress={() => onClub(club)}>
              <View style={[styles.clubCrest, { backgroundColor: club.color, borderColor: club.accent }]}>
                <Text style={[styles.clubCrestCode, { color: club.accent }]}>{club.code}</Text>
              </View>
              <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
              <Text style={styles.clubSub} numberOfLines={1}>{club.league} · {club.forms} {t('kitsWord')}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!clubsLoading && !clubsError && clubs.length === 0 ? <Text style={styles.emptyClubs}>{t('noResults')}</Text> : null}

      {products.length > 0 ? (
        <View style={styles.modelsBlock}>
          <SectionTitle title={t('popularModels')} />
          <View style={styles.grid}>
            {products.map((item) => (
              <ProductCard
                key={item.kitId}
                product={item}
                favorite={favoriteIds.includes(item.clubId)}
                onFavorite={() => toggleFavorite(item.clubId)}
                onPress={() => onClub({ id: item.clubId }, item.kitId)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#1E2450',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: { flex: 1, color: colors.text, marginLeft: spacing.sm, fontSize: 14 },  filters: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  filter: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.round,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: '#1D2350',
  },
  activeFilter: { backgroundColor: '#0E1330', borderColor: colors.accent },
  filterText: { color: colors.muted, fontSize: 12 },
  activeText: { color: colors.accent, fontWeight: '800' },
  favClub: {
    backgroundColor: '#141A40',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#2A3160',
    padding: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  favCrest: {
    width: 44,
    height: 52,
    borderRadius: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  favCrestCode: { fontSize: 12, fontWeight: '900' },
  favCopy: { flex: 1 },
  favOverline: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  favName: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 3 },
  favSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  gridTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: spacing.md },
  clubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  clubCard: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#1B2150',
    padding: spacing.md,
  },
  clubCrest: {
    width: 34,
    height: 40,
    borderRadius: 6,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  clubCrestCode: { fontSize: 10, fontWeight: '900' },
  clubName: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: spacing.md },
  clubSub: { color: colors.muted, fontSize: 10, marginTop: 3 },
  emptyClubs: { color: colors.muted, fontSize: 12, textAlign: 'center', paddingVertical: spacing.lg },
  modelsBlock: { marginTop: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.xl },
});
