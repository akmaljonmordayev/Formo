/**
 * Bir xil kalitli vazifalarni ketma-ket, turli kalitlarnikini esa parallel bajaradi.
 * Polling (bitta partiya) va webhook (uzluksiz so'rovlar oqimi) rejimlarida bir xil
 * "bitta foydalanuvchining updatelari tartib bilan" kafolatini ta'minlash uchun umumiy.
 */
export class KeyedQueue {
  private readonly chains = new Map<string, Promise<void>>();

  /** `key` bo'yicha oldingi vazifa tugagach `fn`ni ishga tushiradi; xato `onError`ga beriladi, navbat uzilmaydi. */
  run(key: string, fn: () => Promise<void>, onError: (err: unknown) => void): Promise<void> {
    const prev = this.chains.get(key) ?? Promise.resolve();
    const next = prev.then(fn).catch(onError);
    this.chains.set(key, next);
    next.finally(() => {
      if (this.chains.get(key) === next) this.chains.delete(key);
    });
    return next;
  }
}
