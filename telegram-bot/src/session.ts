import { Lang } from './i18n';

const TTL_MS = 10 * 60_000;
const MAX_USERS = 10_000;

interface Entry {
  lang?: Lang;
  /** Til so'ralganda to'xtatilgan /start payload'i ('' — payloadsiz) — til tanlangach davom etadi */
  pendingStart?: string;
  /** Backend'dan saqlangan til allaqachon so'ralgan (qayta ishga tushgandan keyin bir marta) */
  langLookedUp?: boolean;
  /** "Boshqa summa" bosilgan — keyingi matn summa sifatida o'qiladi (shu vaqtgacha) */
  awaitingAmountUntil?: number;
  touched: number;
}

/**
 * Foydalanuvchi holati (faqat xotirada). Til backend'da ham saqlanadi (ulangan akkaunt uchun),
 * shuning uchun qayta ishga tushganda yo'qolsa — keyingi /balance yoki me() javobidan tiklanadi.
 */
export class UserSessions {
  private readonly map = new Map<string, Entry>();

  constructor(private readonly now = () => Date.now()) {}

  private entry(userId: string) {
    let e = this.map.get(userId);
    if (!e) {
      if (this.map.size >= MAX_USERS) this.prune();
      e = { touched: this.now() };
      this.map.set(userId, e);
    }
    e.touched = this.now();
    return e;
  }

  lang(userId: string): Lang | undefined {
    return this.map.get(userId)?.lang;
  }

  setLang(userId: string, lang: Lang) {
    this.entry(userId).lang = lang;
  }

  /** true — shu chaqiruvda birinchi marta (keyingilari false) */
  markLangLookup(userId: string) {
    const e = this.entry(userId);
    if (e.langLookedUp) return false;
    e.langLookedUp = true;
    return true;
  }

  setPendingStart(userId: string, payload: string) {
    this.entry(userId).pendingStart = payload;
  }

  takePendingStart(userId: string): string | undefined {
    const e = this.map.get(userId);
    const payload = e?.pendingStart;
    if (e) e.pendingStart = undefined;
    return payload;
  }

  awaitAmount(userId: string) {
    this.entry(userId).awaitingAmountUntil = this.now() + TTL_MS;
  }

  isAwaitingAmount(userId: string) {
    const until = this.map.get(userId)?.awaitingAmountUntil;
    return until !== undefined && until > this.now();
  }

  clearAmount(userId: string) {
    const e = this.map.get(userId);
    if (e) e.awaitingAmountUntil = undefined;
  }

  private prune() {
    const cutoff = this.now() - TTL_MS;
    for (const [k, v] of this.map) if (v.touched < cutoff) this.map.delete(k);
    // Hammasi yangi bo'lsa ham xotira cheksiz o'smasin
    if (this.map.size >= MAX_USERS) this.map.delete(this.map.keys().next().value as string);
  }
}
