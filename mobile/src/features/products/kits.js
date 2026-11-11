import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api';
import { getCached, setCached } from '../../utils/memCache';
import * as storage from '../../utils/storage';
import { KIT360_LONG, KIT360_TEAMS, kit360Variant } from '../kit360';

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
  // Eski API'da maydon yo'q — kalta yeng
  const sleeve = kit.sleeve === 'LONG' ? 'LONG' : 'SHORT';
  return {
    key: `kit:${kit.id}`,
    kitId: kit.id,
    clubId: club.id ?? kit.clubId,
    name,
    label: kit.label,
    price: kit.price ?? null,
    kit360Id: club.kit360Id ?? null,
    // Kalta yeng (yozgi) yoki uzun yeng (qishki); variant — karta surati ('l' — uzun yeng suratlari)
    sleeve,
    variant: kit360Variant(club.kit360Id, sleeve),
    // Terma jamoa yoki klub: Forma 360° ro'yxatidagi turi, bo'lmasa klub turi yoki kategoriya nomidan
    kind:
      team?.kind ??
      (club.type === 'NATIONAL' || /terma|national|сборн/i.test(club.category?.name || '') ? 'national' : 'club'),
    categoryName: club.category?.name ?? null,
    categoryId: club.category?.id ?? null,
    soldCount: kit.soldCount ?? 0,
    search: norm([name, club.code, team?.name, team?.code].filter(Boolean).join(' ')),
  };
}

/** Backend'da hali forma yo'q (bo'sh baza) — Forma 360° jamoalari ko'rinadi, lekin yoqtirib/buyurtma berib bo'lmaydi */
const fallbackCard = (team, sleeve) => ({
  key: sleeve === 'LONG' ? `team:${team.id}:l` : `team:${team.id}`,
  kitId: null,
  clubId: null,
  name: team.name,
  label: null,
  price: null,
  kit360Id: team.id,
  sleeve,
  variant: sleeve === 'LONG' ? 'l' : 'f',
  kind: team.kind,
  categoryId: null,
  categoryName: null,
  soldCount: 0,
  search: norm(`${team.name} ${team.code}`),
});
const FALLBACK = [
  ...KIT360_TEAMS.map((team) => fallbackCard(team, 'SHORT')),
  ...KIT360_TEAMS.filter((team) => KIT360_LONG.includes(team.id)).map((team) => fallbackCard(team, 'LONG')),
];

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

/** Sevimli kalit: jamoa (Forma 360°) bo'yicha — server formasi ham, zaxira karta ham bir xil kalitga tushadi */
export const favKey = (card) => {
  // Uzun yengli forma — alohida yurakcha (kalta yengdagi eski kalit o'zgarmaydi)
  if (card?.kit360Id) return card.sleeve === 'LONG' ? `team:${card.kit360Id}:l` : `team:${card.kit360Id}`;
  return card?.kitId ? `kit:${card.kitId}` : null;
};

const favStorageKey = (userId) => `formo_fav_kits_${userId ?? 'guest'}`;

/** Ro'yxatlarni birlashtiradi (kalit bo'yicha bitta); kitId bor nusxa kitId'sizini to'ldiradi */
export function mergeFavorites(...lists) {
  const out = new Map();
  for (const card of lists.flat()) {
    const key = favKey(card);
    if (!key) continue;
    const prev = out.get(key);
    if (!prev) out.set(key, card);
    else if (!prev.kitId && card.kitId) out.set(key, { ...prev, ...card });
  }
  return [...out.values()];
}

/**
 * Yoqtirilgan formalar. AppNavigator'da bir marta yaratiladi — bosh sahifa va Studio bir xil yurakchalarni ko'radi.
 * Ro'yxat telefonda saqlanadi (foydalanuvchi bo'yicha) va forma serverda bo'lsa (kitId) server bilan sinxronlanadi —
 * yurakcha tarmoq xatosida yoki katalog hali bo'sh bo'lsa ham ishlaydi.
 *
 * @param {boolean} enabled - faqat kirgan foydalanuvchi uchun
 * @param {number|string} [userId] - telefondagi ro'yxat kaliti
 */
export function useFavoriteKits(enabled, userId) {
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const seq = useRef(0);

  const persist = useCallback((list) => storage.setItem(favStorageKey(userId), JSON.stringify(list)), [userId]);

  const refetch = useCallback(async () => {
    const id = ++seq.current;
    let local = [];
    try {
      local = JSON.parse((await storage.getItem(favStorageKey(userId))) || '[]');
    } catch {
      local = [];
    }
    if (id !== seq.current) return;
    setItems(mergeFavorites(local));
    try {
      const rows = (await api.catalog.favoriteKits()).map(toKitCard);
      if (id !== seq.current) return;
      const merged = mergeFavorites(local, rows);
      setItems(merged);
      persist(merged);
      // Telefonda bor, serverda yo'q (oflayn bosilgan) — serverga ham yozamiz
      const onServer = new Set(rows.map(favKey));
      for (const card of merged) {
        if (card.kitId && !onServer.has(favKey(card))) api.catalog.addFavoriteKit(card.kitId).catch(() => {});
      }
    } catch {
      // Tarmoq xatosi — telefondagi ro'yxat qoladi
    }
  }, [userId, persist]);

  useEffect(() => {
    if (enabled) refetch();
    else {
      seq.current += 1;
      setItems([]);
    }
  }, [enabled, refetch]);

  const ids = useMemo(() => new Set(items.map(favKey)), [items]);

  const toggle = useCallback(
    async (card) => {
      const key = favKey(card);
      if (!key) return;
      const existing = itemsRef.current.find((k) => favKey(k) === key);
      const kitId = card.kitId ?? existing?.kitId ?? null;
      seq.current += 1; // optimistik holatni ustidan yozib yuboradigan eski javob qo'llanmasin
      const next = existing ? itemsRef.current.filter((k) => favKey(k) !== key) : [card, ...itemsRef.current];
      itemsRef.current = next;
      setItems(next);
      persist(next);
      if (!kitId) return;
      try {
        if (existing) await api.catalog.removeFavoriteKit(kitId);
        else await api.catalog.addFavoriteKit(kitId);
      } catch {
        // Server xatosi — telefondagi holat qoladi, keyingi yuklashda qayta sinxronlanadi
      }
    },
    [persist],
  );

  /** Karta sevimlimi (bosh sahifa, Studio) */
  const has = useCallback((card) => ids.has(favKey(card)), [ids]);

  return { items, ids, has, toggle, refetch };
}
