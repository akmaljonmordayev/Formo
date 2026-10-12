import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Node 22+ o'zining (fayl berilmasa ishlamaydigan) global localStorage'ini jsdom'nikidan
// ustun qo'yadi. Node versiyasiga bog'liq bo'lmasligi uchun xotiradagi Storage ishlatamiz.
class MemoryStorage {
  #items = new Map();
  get length() {
    return this.#items.size;
  }
  key(index) {
    return [...this.#items.keys()][index] ?? null;
  }
  getItem(key) {
    return this.#items.get(String(key)) ?? null;
  }
  setItem(key, value) {
    this.#items.set(String(key), String(value));
  }
  removeItem(key) {
    this.#items.delete(String(key));
  }
  clear() {
    this.#items.clear();
  }
}

const storage = new MemoryStorage();
for (const target of [globalThis, window]) {
  Object.defineProperty(target, 'localStorage', { value: storage, configurable: true });
}

afterEach(() => {
  cleanup();
  storage.clear();
});
