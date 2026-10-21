<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JerseyVisualizer from '../components/ui/JerseyVisualizer';
import { useToast } from '../components/ui/Toast';
import { colors, radii, spacing } from '../constants/theme';
import { api, mapApiClub } from '../services/api';

const LEAGUES = ['Barchasi'];

export default function CatalogScreen({
  store,
  t,
  onOpenClub,
}) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('Barchasi');
  const [leagues, setLeagues] = useState(LEAGUES);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load categories + clubs from backend
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        // Load categories for filter chips
        const cats = await api.catalog.getCategories().catch(() => null);
        if (!cancelled && Array.isArray(cats) && cats.length > 0) {
          setLeagues(['Barchasi', ...cats.map((c) => c.name)]);
        }

        // Load all clubs
        const res = await api.catalog.getClubs({ limit: 100 }).catch(() => null);
        if (!cancelled && res?.items && res.items.length > 0) {
          setClubs(res.items.map(mapApiClub));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleToggleFav = async (clubId) => {
    store.toggleFavorite(clubId);
    try {
      if (store.favorites.includes(clubId)) {
        await api.catalog.removeFavorite(clubId).catch(() => null);
        toast.show('Sevimlilardan olib tashlandi', 'info');
      } else {
        await api.catalog.addFavorite(clubId).catch(() => null);
        toast.show('Sevimlilarga qo‘shildi', 'success');
      }
    } catch {
      // ignore
    }
  };

  // Filter
  const filtered = clubs.filter((c) => {
    const matchesLeague = selectedLeague === 'Barchasi' || c.league === selectedLeague;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    return matchesLeague && matchesSearch;
  });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.container}>
        {/* Search header */}
        <View style={styles.searchHeader}>
          <Text style={styles.pageTitle}>Katalog</Text>
          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Klub yoki liga qidirish..."
              placeholderTextColor={colors.caption}
              style={styles.searchInput}
            />
            {Boolean(search) && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* League filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leaguesRow}
        >
          {leagues.map((l) => {
            const active = selectedLeague === l;
            return (
              <Pressable
                key={l}
                onPress={() => setSelectedLeague(l)}
                style={[styles.leagueChip, active && styles.leagueChipActive]}
              >
                <Text style={[styles.leagueText, active && styles.leagueTextActive]}>{l}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Clubs Grid */}
        <ScrollView
          contentContainerStyle={styles.gridScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="magnify" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>Hech narsa topilmadi</Text>
              <Text style={styles.emptySub}>Boshqa so‘z yoki ligani tanlab ko‘ring</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filtered.map((c) => {
                const isFav = store.favorites.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => onOpenClub?.(c)}
                    style={styles.clubCard}
                  >
                    {/* Favorite star */}
                    <Pressable
                      onPress={() => handleToggleFav(c.id)}
                      hitSlop={10}
                      style={styles.starBtn}
                    >
                      <MaterialCommunityIcons
                        name={isFav ? 'star' : 'star-outline'}
                        size={20}
                        color={isFav ? colors.accent : colors.muted}
                      />
                    </Pressable>

                    {/* Jersey visualizer */}
                    <View style={styles.jerseyPreview}>
                      <JerseyVisualizer
                        color={c.kits[0].color}
                        trim={c.kits[0].trim}
                        ink={c.kits[0].ink}
                        pattern={c.kits[0].pattern || 'none'}
                        crest={c.ini}
                        side="front"
                        size={120}
                      />
                    </View>

                    <Text style={styles.clubName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={styles.clubLeague}>{c.league}</Text>

                    {/* Kits count */}
                    <View style={styles.kitsBadge}>
                      <Text style={styles.kitsBadgeText}>{c.kits.length} ta forma</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
=======
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
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  container: {
    flex: 1,
  },
  searchHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F3F5F9',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1A3F',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F3F5F9',
    fontSize: 14,
  },
  leaguesRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  leagueChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.round,
    backgroundColor: '#0E1A3F',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  leagueChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  leagueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A9B0D0',
  },
  leagueTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  gridScroll: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  clubCard: {
    width: '48%',
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.1)',
    position: 'relative',
  },
  starBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 5,
  },
  jerseyPreview: {
    height: 125,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  clubName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
    textAlign: 'center',
    marginTop: 4,
  },
  clubLeague: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  kitsBadge: {
    backgroundColor: '#121A42',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.round,
    marginTop: 8,
  },
  kitsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F3F5F9',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#8D95BD',
    marginTop: 4,
  },
});
