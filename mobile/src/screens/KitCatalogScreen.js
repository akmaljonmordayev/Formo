import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing } from '../constants/theme';
import { EmptyState, Header, Screen } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import KitTile from '../components/ui/KitTile';
import Skeleton from '../components/ui/Skeleton';
import { useCategories } from '../features/products';
import { matchesSearch, useBestSellingKits } from '../features/products/kits';

/**
 * Studio — Forma 360° katalogi: tepada qidiruv, ostida kategoriyalar lentasi (Hammasi, Sevimlilar,
 * Terma jamoalar, Klublar, ligalar), pastda barcha formalar ikki ustunda (eng ko'p sotilgani birinchi).
 * Formani bosish — 360° ko'rish, o'lcham/ism-raqam va savatga qo'shish (Forma 360° ekrani).
 *
 * Props: t, favorites (useFavoriteKits), onOpenKit(kit)
 */
export default function KitCatalogScreen({ t, favorites, onOpenKit }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const { kits, isLoading, error, refetch } = useBestSellingKits();
  const { categories } = useCategories();

  const chips = useMemo(
    () => [
      { key: 'all', label: t('all'), icon: 'view-grid-outline' },
      { key: 'fav', label: t('favorites'), icon: 'heart-outline' },
      { key: 'national', label: t('nationalTeams'), icon: 'flag-outline' },
      { key: 'club', label: t('clubTeams'), icon: 'shield-star-outline' },
      ...categories.map((c) => ({ key: `cat:${c.id}`, label: c.name, icon: 'trophy-outline' })),
    ],
    [categories, t],
  );

  const source = filter === 'fav' ? favorites.items : kits;
  const visible = useMemo(
    () =>
      source.filter((kit) => {
        if (!matchesSearch(kit, search)) return false;
        if (filter === 'national' || filter === 'club') return kit.kind === filter;
        if (filter.startsWith('cat:')) return String(kit.categoryId) === filter.slice(4);
        return true;
      }),
    [source, filter, search],
  );

  const renderGrid = () => {
    if (error && !kits.length) return <ErrorView message={t('loadError')} onRetry={refetch} retryLabel={t('retry')} />;
    if (isLoading && filter !== 'fav') {
      return (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="48%" height={240} radius={radii.lg} />
          ))}
        </View>
      );
    }
    if (!visible.length) {
      return filter === 'fav' && !search ? (
        <EmptyState icon="heart-outline" title={t('favoritesEmpty')} description={t('favoritesEmptySub')} />
      ) : (
        <EmptyState icon="magnify" title={t('noResults')} />
      );
    }
    return (
      <View style={styles.grid}>
        {visible.map((kit) => (
          <KitTile
            key={kit.key}
            kit={kit}
            t={t}
            favorite={favorites.ids.has(kit.kitId)}
            onFavorite={favorites.toggle}
            onPress={onOpenKit}
          />
        ))}
      </View>
    );
  };

  return (
    <Screen contentStyle={styles.content}>
      <Header cart title={t('studio')} subtitle={t('forma360Sub')} />

      <View style={[styles.search, styles.padded]}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('searchClub')}
          placeholderTextColor={colors.dim}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel={t('clear')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {chips.map((chip) => {
          const active = filter === chip.key;
          return (
            <Pressable
              key={chip.key}
              onPress={() => setFilter(chip.key)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <MaterialCommunityIcons
                name={active && chip.key === 'fav' ? 'heart' : chip.icon}
                size={20}
                color={active ? colors.primaryDark : colors.accent}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.padded}>{renderGrid()}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 0 },
  padded: { marginHorizontal: spacing.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, fontFamily: fonts.body, paddingVertical: 0 },
  rail: { paddingHorizontal: spacing.lg, gap: 10, paddingBottom: spacing.lg },
  chip: {
    minWidth: 96,
    height: 70,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    gap: 6,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 12, fontFamily: fonts.bodySemi, maxWidth: 150 },
  chipTextActive: { color: colors.primaryDark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
