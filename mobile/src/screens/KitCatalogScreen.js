import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing, themedStyles } from '../constants/theme';
import { EmptyState, Header, Screen } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import KitTile from '../components/ui/KitTile';
import Skeleton from '../components/ui/Skeleton';
import { useCategories } from '../features/products';
import { matchesSearch, useBestSellingKits } from '../features/products/kits';

// Liga logolari (kategoriya slug bo'yicha); ro'yxatda yo'q liga — kubok ikonkasi bilan qoladi
const LEAGUE_LOGOS = {
  laliga: require('../../assets/leagues/laliga.png'),
  'premier-league': require('../../assets/leagues/premier-league.png'),
  'ligue-1': require('../../assets/leagues/ligue-1.png'),
  'serie-a': require('../../assets/leagues/serie-a.png'),
};
// Admin slug/nomni boshqacha yozgan bo'lsa ham topiladi: "La Liga", "Série A", "EPL", "Ligue1" ...
const LEAGUE_ALIASES = { 'la-liga': 'laliga', epl: 'premier-league', 'english-premier-league': 'premier-league', ligue1: 'ligue-1', seriea: 'serie-a' };
const normalizeLeague = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
const leagueLogo = (c) => {
  for (const raw of [c.slug, c.name]) {
    const key = normalizeLeague(raw);
    const logo = LEAGUE_LOGOS[key] || LEAGUE_LOGOS[LEAGUE_ALIASES[key]];
    if (logo) return logo;
  }
  return undefined;
};

const SEASONS = [
  { key: 'all', label: 'seasonAll', icon: 'tshirt-crew-outline' },
  { key: 'LONG', label: 'sleeveLong', icon: 'tshirt-crew' },
  { key: 'SHORT', label: 'sleeveShort', icon: 'tshirt-crew-outline' },
];

/**
 * Formalar: qidiruv yonidagi rang/tartib filtri, ligalar lentasi va yeng turi filtri.
 * Standart tartib eng ko'p sotilgandan boshlanadi; rang filtri API'dagi colorsLabel qiymatlaridan tuziladi.
 * Formani bosish — Forma 360° ekrani (turi, o'lcham, ism-raqam, shortik/shalvar raqami → savat).
 *
 * Props: t, favorites (useFavoriteKits), onOpenKit(kit)
 */
export default function KitCatalogScreen({ t, favorites, onOpenKit }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [season, setSeason] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [sort, setSort] = useState('popular');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { kits, isLoading, error, refetch } = useBestSellingKits();
  const { categories } = useCategories();
  const colorOptions = useMemo(
    () => [...new Set(kits.flatMap((kit) => String(kit.colorsLabel || '').split(/[;,/|·]+/).map((part) => part.trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b)),
    [kits],
  );
  const activeFilterCount = Number(filter !== 'all') + Number(season !== 'all') + Number(colorFilter !== 'all') + Number(sort !== 'popular');

  // Liga chiplari — faqat klublar formasi bor kategoriyalar (terma jamoalar bitta "Terma jamoalar" chipida)
  const chips = useMemo(() => {
    const clubCats = new Set(kits.filter((k) => k.kind === 'club' && k.categoryId != null).map((k) => String(k.categoryId)));
    return [
      // Liga logolari bilan bir xil ko'rinsin — rangli doira ichida ikonka
      { key: 'all', label: t('all'), icon: 'tshirt-crew', badge: { bg: '#2F6BFF', fg: '#FFFFFF' } },
      { key: 'fav', label: t('favorites'), icon: 'heart', badge: { bg: '#FF3B5C', fg: '#FFFFFF' } },
      { key: 'national', label: t('nationalTeams'), icon: 'earth', badge: { bg: '#12B886', fg: '#FFFFFF' } },
      ...categories
        .filter((c) => clubCats.has(String(c.id)))
        .map((c) => ({ key: `cat:${c.id}`, label: c.name, icon: 'trophy-outline', logo: leagueLogo(c) })),
    ];
  }, [categories, kits, t]);

  const source = filter === 'fav' ? favorites.items : kits;
  const visible = useMemo(
    () =>
      source.filter((kit) => {
        if (!matchesSearch(kit, search)) return false;
        if (season !== 'all' && (kit.sleeve || 'SHORT') !== season) return false;
        if (colorFilter !== 'all' && !String(kit.colorsLabel || '').toLocaleLowerCase().includes(colorFilter.toLocaleLowerCase())) return false;
        if (filter === 'national') return kit.kind === 'national';
        if (filter.startsWith('cat:')) return String(kit.categoryId) === filter.slice(4);
        return true;
      }),
    [source, filter, search, season, colorFilter],
  );
  const sortedVisible = useMemo(
    () => [...visible].sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.soldCount - a.soldCount)),
    [visible, sort],
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
    if (!sortedVisible.length) {
      return filter === 'fav' && !search ? (
        <EmptyState icon="heart-outline" title={t('favoritesEmpty')} description={t('favoritesEmptySub')} />
      ) : (
        <EmptyState icon="magnify" title={t('noResults')} />
      );
    }
    // Tartib filtrida tanlangan sotuv yoki nom bo'yicha natijalar.
    return (
      <>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t(season === 'LONG' ? 'sleeveLong' : season === 'SHORT' ? 'sleeveShort' : 'kitsAll')}</Text>
          <Text style={styles.sectionCount}>{sortedVisible.length}</Text>
        </View>
        {grid(sortedVisible)}
      </>
    );
  };

  return (
    <Screen contentStyle={styles.content}>
      <Header cart title={t('formsTab')} subtitle={t('formsSub')} />

      <View style={[styles.searchRow, styles.padded]}>
        <View style={styles.search}>
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
        <Pressable
          onPress={() => setFiltersOpen(true)}
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          accessibilityRole="button"
          accessibilityLabel={t('kitFilter')}
        >
          <MaterialCommunityIcons name="tune-variant" size={20} color={activeFilterCount ? colors.primaryDark : colors.accent} />
          {activeFilterCount > 0 ? <Text style={styles.filterCount}>{activeFilterCount}</Text> : null}
        </Pressable>
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
              {chip.logo ? (
                <View style={[styles.logoBadge, active && styles.logoBadgeActive]}>
                  <Image source={chip.logo} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
                </View>
              ) : chip.badge ? (
                <View style={[styles.logoBadge, { backgroundColor: chip.badge.bg }, active && styles.logoBadgeActive]}>
                  <MaterialCommunityIcons name={chip.icon} size={20} color={chip.badge.fg} />
                </View>
              ) : (
                <MaterialCommunityIcons
                  name={chip.icon}
                  size={20}
                  color={active ? colors.primaryDark : colors.accent}
                />
              )}
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Yeng turi */}
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

      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable style={styles.filterBackdrop} onPress={() => setFiltersOpen(false)}>
          <Pressable style={styles.filterSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>{t('kitFilter')}</Text>
              <Pressable onPress={() => setFiltersOpen(false)} hitSlop={10} accessibilityLabel={t('cancel')}>
                <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={styles.filterSectionTitle}>{t('filterColor')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChoices}>
              {[{ value: 'all', label: t('kitColorAny') }, ...colorOptions.map((value) => ({ value, label: value }))].map((option) => {
                const selected = colorFilter === option.value;
                return (
                  <Pressable key={option.value} onPress={() => setColorFilter(option.value)} style={[styles.filterChoice, selected && styles.filterChoiceActive]}>
                    <Text style={[styles.filterChoiceText, selected && styles.filterChoiceTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.filterSectionTitle}>{t('filterSort')}</Text>
            <View style={styles.sortChoices}>
              {[
                { value: 'popular', label: t('bestSellers'), icon: 'trending-up' },
                { value: 'name', label: t('filterName'), icon: 'sort-alphabetical-ascending' },
              ].map((option) => {
                const selected = sort === option.value;
                return (
                  <Pressable key={option.value} onPress={() => setSort(option.value)} style={[styles.sortChoice, selected && styles.filterChoiceActive]}>
                    <MaterialCommunityIcons name={option.icon} size={18} color={selected ? colors.primaryDark : colors.muted} />
                    <Text style={[styles.filterChoiceText, selected && styles.filterChoiceTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.filterFooter}>
              <Pressable
                onPress={() => {
                  setFilter('all');
                  setSeason('all');
                  setColorFilter('all');
                  setSort('popular');
                }}
                style={styles.clearFiltersButton}
              >
                <Text style={styles.clearFiltersText}>{t('clear')}</Text>
              </Pressable>
              <Pressable onPress={() => setFiltersOpen(false)} style={styles.applyFiltersButton}>
                <Text style={styles.applyFiltersText}>{t('filterApply')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = themedStyles(() => ({
  content: { paddingHorizontal: 0 },
  padded: { marginHorizontal: spacing.lg },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 0,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterCount: { color: colors.primaryDark, fontSize: 11, fontWeight: '900' },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, fontFamily: fonts.body, paddingVertical: 0 },
  rail: { paddingHorizontal: spacing.lg, gap: 10, paddingBottom: spacing.md },
  chip: {
    minWidth: 96,
    height: 80,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    gap: 6,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  // Qora/binafsha logolar qorong'i fonda ham ko'rinsin — oq doira ichida
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  logoBadgeActive: { borderColor: colors.primaryDark, borderWidth: 2 },
  logo: { width: 25, height: 25 },
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
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  sectionTitle: { flex: 1, color: colors.text, fontSize: 16, fontFamily: fonts.bodySemi, fontWeight: '800' },
  sectionCount: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  filterBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  filterSheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '78%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  filterTitle: { color: colors.text, fontSize: 20, fontFamily: fonts.bodySemi, fontWeight: '900' },
  filterSectionTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  filterChoices: { gap: spacing.sm, paddingBottom: spacing.lg },
  filterChoice: { paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radii.round, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChoiceActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterChoiceText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  filterChoiceTextActive: { color: colors.primaryDark, fontWeight: '900' },
  sortChoices: { flexDirection: 'row', gap: spacing.sm },
  sortChoice: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterFooter: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  clearFiltersButton: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  clearFiltersText: { color: colors.textSecondary, fontSize: 14, fontWeight: '800' },
  applyFiltersButton: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accent },
  applyFiltersText: { color: colors.primaryDark, fontSize: 14, fontWeight: '900' },
}));
