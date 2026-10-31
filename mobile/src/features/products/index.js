import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api';
import { getCached, setCached } from '../../utils/memCache';

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
    // Forma 360° suratlari to'plami (backend Club.kit360Id) — karta surati va studiyadagi foto-360°;
    // eski API'da maydon yo'q (undefined) — unda kit360Team nom bo'yicha moslaydi
    kit360Id: club?.kit360Id,
    // Uy/Mehmon toifasi ko'rsatilmaydi — 360° suratlar klub bo'yicha bitta
    name: club?.name || kit.title,
    color: kit.bgColor,
    accent: kit.textColor,
    badge: null,
    category: club?.league || club?.category?.name || '',
  };
}

/**
 * Umumiy yuklash holati: { data, isLoading, error, refetch }.
 * `cacheKey` berilsa — oxirgi javob xotirada saqlanadi: ekran qayta ochilganda darhol ko'rinadi,
 * yangisi fonda (spinnersiz) yuklanadi.
 */
function useLoader(load, deps, cacheKey) {
  const [data, setData] = useState(() => getCached(cacheKey) ?? null);
  const [isLoading, setIsLoading] = useState(() => getCached(cacheKey) === undefined);
  const [error, setError] = useState(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  const keyRef = useRef(cacheKey);
  keyRef.current = cacheKey;
  // Eski so'rov javobi yangisini bosib ketmasin (tez yozilgan qidiruv)
  const seq = useRef(0);

  const refetch = useCallback(async () => {
    const id = ++seq.current;
    const key = keyRef.current;
    const hit = getCached(key);
    // Keshdagi ma'lumot darhol; spinner faqat hech narsa bo'lmasa
    if (hit !== undefined) setData(hit);
    setIsLoading(hit === undefined);
    setError(null);
    try {
      const result = await loadRef.current();
      if (id === seq.current) setData(setCached(key, result));
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

/** GET /catalog/clubs/:id — xom javob keshlanadi (bosh sahifa va klub sahifasi bitta so'rovni bo'lishadi) */
async function loadClub(id) {
  return setCached(`clubRaw:${id}`, await api.catalog.club(id));
}

/** Katalog filtr chiplari (ligalar) */
export function useCategories() {
  const { data, ...rest } = useLoader(() => api.catalog.categories(), [], 'categories');
  return { categories: data || [], ...rest };
}

/** Klublar ro'yxati — kategoriya va qidiruv bo'yicha (qidiruv 300 ms kechiktiriladi) */
export function useClubs({ categoryId, search } = {}) {
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = debounced?.trim() || undefined;
  const { data, ...rest } = useLoader(
    () => api.catalog.clubs({ categoryId, search: query, limit: 100 }),
    [categoryId, query],
    `clubs:${categoryId ?? ''}:${query ?? ''}`,
  );
  const clubs = useMemo(() => (data?.items || []).map(toClub), [data]);
  return { clubs, ...rest };
}

/** "Mashhur klublar" — eng ko'p buyurtma qilinganlar */
export function usePopularClubs(limit = 8) {
  const { data, ...rest } = useLoader(() => api.catalog.popular(limit), [limit], `popular:${limit}`);
  const clubs = useMemo(() => (data || []).map(toClub), [data]);
  return { clubs, ...rest };
}

/**
 * "Mashhur modellar": mashhur klublarning birinchi formasi.
 * Backendda formalar ro'yxati alohida endpoint emas — klub sahifasidan olinadi.
 */
export function usePopularProducts(limit = 4) {
  const { data, ...rest } = useLoader(
    async () => {
      const popular = await api.catalog.popular(limit);
      const clubs = await Promise.all(popular.map((club) => loadClub(club.id)));
      return clubs.filter((club) => club.kits?.length).map((club) => toProduct(club.kits[0], club));
    },
    [limit],
    `popularProducts:${limit}`,
  );
  return { products: data || [], ...rest };
}

const clubView = (club) => (club ? { club: toClub(club), products: club.kits.map((kit) => toProduct(kit, club)) } : null);

/** Klub sahifasi: klub + formalari product ko'rinishida (bosh sahifada yuklangan bo'lsa — darhol) */
export function useClub(clubId) {
  const { data, ...rest } = useLoader(
    async () => (clubId ? clubView(await loadClub(clubId)) : null),
    [clubId],
    clubId ? `club:${clubId}` : null,
  );
  const fallback = useMemo(() => (data ? null : clubView(getCached(`clubRaw:${clubId}`))), [data, clubId]);
  const view = data || fallback;
  return { club: view?.club || null, products: view?.products || [], ...rest, isLoading: rest.isLoading && !view };
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

  // Katalog kabi — faqat Forma 360° suratlari bor klublar (admin bog'lanishni uzsa, sevimlilarda ham ko'rinmaydi)
  return { favorites: (data || []).filter((club) => club.kit360Id).map(toClub), ids, toggle, refetch, ...rest };
}
