import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

// Backend katalogi (klub -> formalar) ni ekranlar kutgan ko'rinishga keltiradi.
// JerseyPreview/ProductCard `color` + `accent` bilan chizadi.

/** Klub kartasi: { id, name, league, season, code, markColor, category, kitsCount } -> UI */
export function toClub(club) {
  return {
    ...club,
    color: club.markColor || '#242749',
    accent: '#FFFFFF',
    forms: club.kitsCount ?? club.kits?.length ?? 0,
    league: club.league || club.category?.name || '',
  };
}

/** Forma (kit) -> "product": nomi, rangi, narxi, o'lchamlari */
export function toProduct(kit, club) {
  return {
    ...kit,
    kitId: kit.id,
    clubId: club?.id ?? kit.clubId,
    clubName: club?.name ?? '',
    // Forma 360° suratlari to'plami (backend Club.kit360Id) — studiyada 3D o'rniga foto-360°;
    // eski API'da maydon yo'q (undefined) — unda kit360Team nom bo'yicha moslaydi
    kit360Id: club?.kit360Id,
    name: club?.name ? `${club.name} · ${kit.label}` : kit.title,
    color: kit.bgColor,
    accent: kit.textColor,
    badge: kit.label,
    category: club?.league || club?.category?.name || '',
  };
}

/** Umumiy yuklash holati: { data, isLoading, error, refetch } */
function useLoader(load, deps) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  // Eski so'rov javobi yangisini bosib ketmasin (tez yozilgan qidiruv)
  const seq = useRef(0);

  const refetch = useCallback(async () => {
    const id = ++seq.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await loadRef.current();
      if (id === seq.current) setData(result);
    } catch (err) {
      if (id === seq.current) setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (id === seq.current) setIsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refetch(); }, deps);

  return { data, isLoading, error, refetch };
}

/** Katalog filtr chiplari (ligalar) */
export function useCategories() {
  const { data, ...rest } = useLoader(() => api.catalog.categories(), []);
  return { categories: data || [], ...rest };
}

/** Klublar ro'yxati — kategoriya va qidiruv bo'yicha (qidiruv 300 ms kechiktiriladi) */
export function useClubs({ categoryId, search } = {}) {
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, ...rest } = useLoader(
    () => api.catalog.clubs({ categoryId, search: debounced?.trim() || undefined, limit: 100 }),
    [categoryId, debounced],
  );
  return { clubs: (data?.items || []).map(toClub), ...rest };
}

/** "Mashhur klublar" — eng ko'p buyurtma qilinganlar */
export function usePopularClubs(limit = 8) {
  const { data, ...rest } = useLoader(() => api.catalog.popular(limit), [limit]);
  return { clubs: (data || []).map(toClub), ...rest };
}

/**
 * "Mashhur modellar": mashhur klublarning birinchi (uy) formasi.
 * Backendda formalar ro'yxati alohida endpoint emas — klub sahifasidan olinadi.
 */
export function usePopularProducts(limit = 4) {
  const { data, ...rest } = useLoader(async () => {
    const popular = await api.catalog.popular(limit);
    const clubs = await Promise.all(popular.map((club) => api.catalog.club(club.id)));
    return clubs.filter((club) => club.kits?.length).map((club) => toProduct(club.kits[0], club));
  }, [limit]);
  return { products: data || [], ...rest };
}

/** Klub sahifasi: klub + formalari (Uy / Mehmon / Uchinchi) product ko'rinishida */
export function useClub(clubId) {
  const { data, ...rest } = useLoader(async () => {
    if (!clubId) return null;
    const club = await api.catalog.club(clubId);
    return { club: toClub(club), products: club.kits.map((kit) => toProduct(kit, club)) };
  }, [clubId]);
  return { club: data?.club || null, products: data?.products || [], ...rest };
}

/**
 * Sevimli klublar (server). `toggle` optimistik — xato bo'lsa ro'yxat qayta yuklanadi.
 * @returns {{ favorites: object[], ids: number[], isLoading, error, toggle: (clubId) => Promise<void>, refetch }}
 */
export function useFavorites() {
  const { data, refetch, ...rest } = useLoader(() => api.catalog.favorites(), []);
  const [ids, setIds] = useState([]);

  useEffect(() => {
    if (data) setIds(data.map((club) => club.id));
  }, [data]);

  const toggle = useCallback(
    async (clubId) => {
      const isFavorite = ids.includes(clubId);
      setIds((current) => (isFavorite ? current.filter((id) => id !== clubId) : [...current, clubId]));
      try {
        if (isFavorite) await api.catalog.removeFavorite(clubId);
        else await api.catalog.addFavorite(clubId);
      } catch {
        // Server holati quyidagi refetch bilan qaytariladi
      } finally {
        refetch();
      }
    },
    [ids, refetch],
  );

  return { favorites: (data || []).map(toClub), ids, toggle, refetch, ...rest };
}
