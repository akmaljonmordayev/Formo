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

const SEASONS = [
  { key: 'all', label: 'seasonAll', icon: 'calendar-blank-outline' },
  { key: 'LONG', label: 'seasonWinter', icon: 'snowflake' },
  { key: 'SHORT', label: 'seasonSummer', icon: 'white-balance-sunny' },
];

/**
 * Formalar (pastki paneldagi "Formalar" tabi): tepada qidiruv, ostida ligalar lentasi (Barchasi, Sevimlilar,
 * Terma jamoalar, LaLiga, Premier League ...), so'ng mavsum: qishki (uzun yeng + shalvar) va yozgi
 * (kalta yeng + shortik). "Barchasi" tanlansa — ikki bo'lim: avval qishki, keyin yozgi formalar.
 * Formani bosish — Forma 360° ekrani (turi, o'lcham, ism-raqam, shortik/shalvar raqami → savat).
 *
 * Props: t, favorites (useFavoriteKits), onOpenKit(kit)
 */
export default function KitCatalogScreen({ t, favorites, onOpenKit }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [season, setSeason] = useState('all');
  const { kits, isLoading, error, refetch } = useBestSellingKits();
  const { categories } = useCategories();

  // Liga chiplari — faqat klublar formasi bor kategoriyalar (terma jamoalar bitta "Terma jamoalar" chipida)
  const chips = useMemo(() => {
    const clubCats = new Set(kits.filter((k) => k.kind === 'club' && k.categoryId != null).map((k) => String(k.categoryId)));
    return [
      { key: 'all', label: t('all'), icon: 'view-grid-outline' },
      { key: 'fav', label: t('favorites'), icon: 'heart-outline' },
      { key: 'national', label: t('nationalTeams'), icon: 'flag-outline' },
      ...categories
        .filter((c) => clubCats.has(String(c.id)))
        .map((c) => ({ key: `cat:${c.id}`, label: c.name, icon: 'trophy-outline' })),
    ];
  }, [categories, kits, t]);

  const source = filter === 'fav' ? favorites.items : kits;
  const visible = useMemo(
    () =>
      source.filter((kit) => {
        if (!matchesSearch(kit, search)) return false;
        if (season !== 'all' && (kit.sleeve || 'SHORT') !== season) return false;
        if (filter === 'national') return kit.kind === 'national';
        if (filter.startsWith('cat:')) return String(kit.categoryId) === filter.slice(4);
        return true;
      }),
    [source, filter, search, season],
  );

  const grid = (list) => (
    <View style={styles.grid}>
      {list.map((kit) => (
        <KitTile key={kit.key} kit={kit} t={t} favorite={favorites.has(kit)} onFavorite={favorites.toggle} onPress={onOpenKit} />
      ))}
    </View>
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
    if (season !== 'all') return grid(visible);
    // Barcha mavsumlar: qishki va yozgi formalar alohida bo'limda (bo'sh bo'lim ko'rsatilmaydi)
    const sections = [
      { key: 'LONG', title: t('kitsWinter'), icon: 'snowflake' },
      { key: 'SHORT', title: t('kitsSummer'), icon: 'white-balance-sunny' },
    ]
      .map((s) => ({ ...s, list: visible.filter((k) => (k.sleeve || 'SHORT') === s.key) }))
      .filter((s) => s.list.length);
    return sections.map((s) => (
      <View key={s.key} style={styles.section}>
        <View style={styles.sectionHead}>
          <MaterialCommunityIcons name={s.icon} size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>{s.title}</Text>
          <Text style={styles.sectionCount}>{s.list.length}</Text>
        </View>
        {grid(s.list)}
      </View>
    ));
  };

  return (
    <Screen contentStyle={styles.content}>
      <Header cart title={t('formsTab')} subtitle={t('formsSub')} />

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

      {/* Mavsum: qishki (uzun yeng) / yozgi (kalta yeng) */}
      <View style={[styles.seasons, styles.padded]} accessibilityRole="tablist">
        {SEASONS.map((s) => {
          const active = season === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSeason(s.key)}
              style={[styles.season, active && styles.seasonActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <MaterialCommunityIcons name={s.icon} size={16} color={active ? colors.primaryDark : colors.muted} />
              <Text style={[styles.seasonText, active && styles.seasonTextActive]} numberOfLines={1}>
                {t(s.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
  rail: { paddingHorizontal: spacing.lg, gap: 10, paddingBottom: spacing.md },
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
  seasons: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  season: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: radii.round,
  },
  seasonActive: { backgroundColor: colors.accent },
  seasonText: { color: colors.muted, fontSize: 13, fontFamily: fonts.bodySemi },
  seasonTextActive: { color: colors.primaryDark },
  section: { marginBottom: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  sectionTitle: { flex: 1, color: colors.text, fontSize: 16, fontFamily: fonts.bodySemi, fontWeight: '800' },
  sectionCount: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
