/**
 * Yaqinda ko'rilgan update_id'lar. Telegram webhook javobini olmasa yoki polling qayta
 * ishga tushsa, bir update ikki marta kelishi mumkin — ikkinchisi tashlab yuboriladi.
 * Jarayon qayta ishga tushganda xotira tozalanadi; undan keyingi takrorlar backend'da idempotent.
 */
export class RecentIds {
  private readonly seen = new Set<number>();
  private readonly order: number[] = [];

  constructor(private readonly max = 5000) {}

  /** `true` — yangi id; `false` — allaqachon ko'rilgan */
  add(id: number) {
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    this.order.push(id);
    if (this.order.length > this.max) this.seen.delete(this.order.shift()!);
    return true;
  }
}
