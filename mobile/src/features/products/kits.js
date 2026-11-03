import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api';
import { getCached, setCached } from '../../utils/memCache';
import { KIT360_TEAMS } from '../kit360';

/**
 * Forma kartalari (bosh sahifa, Studio katalogi): backend formasi → UI.
 * Har bir karta — Forma 360° jamoasi (surati) + buyurtma beriladigan aniq forma (kitId).
 */

const norm = (s) => String(s ?? '').toLowerCase().replace(/[‘’ʻʼ`]/g, "'").trim();

/** Backend forma kartasi ({ ...kit, club, soldCount }) → UI */
export function toKitCard(kit) {
  const club = kit.club || {};
  const team = KIT360_TEAMS.find((tm) => tm.id === club.kit360Id);
  const name = club.name || team?.name || kit.title;
  return {
    key: `kit:${kit.id}`,
    kitId: kit.id,
    clubId: club.id ?? kit.clubId,
    name,
    label: kit.label,
    price: kit.price ?? null,
    kit360Id: club.kit360Id ?? null,
    // Terma jamoa yoki klub: Forma 360° ro'yxatidagi turi, bo'lmasa kategoriya nomidan
    kind: team?.kind ?? (/terma|national|сборн/i.test(club.category?.name || '') ? 'national' : 'club'),
    categoryId: club.category?.id ?? null,
    soldCount: kit.soldCount ?? 0,
    search: norm([name, club.code, team?.name, team?.code].filter(Boolean).join(' ')),
  };
}

/** Backend'da hali forma yo'q (bo'sh baza) — Forma 360° jamoalari ko'rinadi, lekin yoqtirib/buyurtma berib bo'lmaydi */
const FALLBACK = KIT360_TEAMS.map((team) => ({
  key: `team:${team.id}`,
  kitId: null,
  clubId: null,
  name: team.name,
  label: null,
  price: null,
  kit360Id: team.id,
  kind: team.kind,
  categoryId: null,
  soldCount: 0,
  search: norm(`${team.name} ${team.code}`),
}));

/** Matn bo'yicha qidiruv: jamoa nomi va kodi (lotin/kirill farqisiz emas — oddiy "o'z ichiga oladi") */
export function matchesSearch(card, text) {
  const q = norm(text);
  return !q || card.search.includes(q);
}

/**
 * GET /catalog/kits/best-selling — eng ko'p sotilgandan kamiga (Forma 360° jamoalari, har klubdan bitta).
 * Javob keshlanadi: bosh sahifa va Studio bitta so'rovni bo'lishadi.
 */
export function useBestSellingKits(limit = 50) {
  const cacheKey = `bestKits:${limit}`;
  const [data, setData] = useState(() => getCached(cacheKey) ?? null);
  const [isLoading, setIsLoading] = useState(() => getCached(cacheKey) === undefined);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const refetch = useCallback(async () => {
    const id = ++seq.current;
    setError(null);
    try {
      const rows = await api.catalog.bestSellingKits(limit);
      if (id === seq.current) setData(setCached(cacheKey, rows));
    } catch (err) {
      if (id === seq.current) setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (id === seq.current) setIsLoading(false);
    }
  }, [limit, cacheKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const kits = useMemo(() => (data?.length ? data.map(toKitCard) : FALLBACK), [data]);
  return { kits, isFallback: !data?.length, isLoading: isLoading && !data, error, refetch };
}

/**
 * Yoqtirilgan formalar (server, forma bo'yicha). AppNavigator'da bir marta yaratiladi — bosh sahifa va
 * Studio bir xil yurakchalarni ko'radi. `toggle` optimistik; xato bo'lsa serverdagi holat qayta yuklanadi.
 *
 * @param {boolean} enabled - faqat kirgan foydalanuvchi uchun
 */
export function useFavoriteKits(enabled) {
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const seq = useRef(0);

  const refetch = useCallback(async () => {
    const id = ++seq.current;
    try {
      const rows = await api.catalog.favoriteKits();
      if (id === seq.current) setItems(rows.map(toKitCard));
    } catch {
      // Tarmoq xatosi — mavjud ro'yxat qoladi
    }
  }, []);

  useEffect(() => {
    if (enabled) refetch();
    else {
      seq.current += 1;
      setItems([]);
    }
  }, [enabled, refetch]);

  const ids = useMemo(() => new Set(items.map((k) => k.kitId)), [items]);

  const toggle = useCallback(
    async (card) => {
      if (!card?.kitId) return;
      const was = itemsRef.current.some((k) => k.kitId === card.kitId);
      seq.current += 1; // optimistik holatni ustidan yozib yuboradigan eski javob qo'llanmasin
      setItems((list) => (was ? list.filter((k) => k.kitId !== card.kitId) : [card, ...list]));
      try {
        if (was) await api.catalog.removeFavoriteKit(card.kitId);
        else await api.catalog.addFavoriteKit(card.kitId);
      } catch {
        refetch();
      }
    },
    [refetch],
  );

  return { items, ids, toggle, refetch };
}
