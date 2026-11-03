/**
 * Soddagina per-user chastota cheklovi (sliding emas, fixed window). Xavfsizlik devori emas —
 * haqiqiy chegaralar (urinishlar, cooldown, summalar) backend'da; bu faqat bitta Telegram
 * foydalanuvchisi botni va orqasidagi backend'ni ortiqcha so'rov bilan band qilib qo'ymasligi uchun.
 */
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 20;
const MAX_USERS = 10_000;

interface Entry {
  count: number;
  windowStart: number;
  /** Shu oynada foydalanuvchiga "sekinroq" xabari yuborilgan */
  notified?: boolean;
}

export class RateLimiter {
  private readonly map = new Map<string, Entry>();

  constructor(
    private readonly windowMs = WINDOW_MS,
    private readonly max = MAX_PER_WINDOW,
    private readonly now = () => Date.now(),
  ) {}

  /** `true` — ruxsat berildi; `false` — shu oyna uchun limit tugagan (update e'tiborsiz qoldiriladi) */
  allow(userId: string): boolean {
    const now = this.now();
    const e = this.map.get(userId);
    if (!e || now - e.windowStart >= this.windowMs) {
      if (!e && this.map.size >= MAX_USERS) this.prune(now);
      this.map.set(userId, { count: 1, windowStart: now });
      return true;
    }
    if (e.count >= this.max) return false;
    e.count++;
    return true;
  }

  /**
   * Limit tugagan foydalanuvchiga ogohlantirish kerakmi: oynada faqat birinchi marta `true` —
   * aks holda tashlangan kontakt/chek javobsiz yo'qolardi, har biriga javob esa limitning ma'nosini yo'qotardi
   */
  shouldNotify(userId: string): boolean {
    const e = this.map.get(userId);
    if (!e || e.notified) return false;
    e.notified = true;
    return true;
  }

  private prune(now: number) {
    for (const [k, v] of this.map) if (now - v.windowStart >= this.windowMs) this.map.delete(k);
    // Hammasi hali faol bo'lsa ham xotira cheksiz o'smasin
    if (this.map.size >= MAX_USERS) this.map.delete(this.map.keys().next().value as string);
  }
}
