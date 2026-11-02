/**
 * Детерминированный генератор случайных чисел. Состояние — одно 32-битное число, оно хранится в сохранении:
 * одинаковый seed и одинаковые действия всегда дают одинаковую жизнь
 */

/** Хеш строки в 32-битное число (cyrb53): из seed получается начальное состояние генератора */
export function hashSeed(input: string): number {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/** Mulberry32: быстрый генератор с периодом 2^32, состояние можно сохранить и продолжить */
export class Rng {
  #state: number;

  constructor(state: number) {
    this.#state = state >>> 0;
  }

  static fromSeed(seed: string, stream: string): Rng {
    return new Rng(hashSeed(`${seed}::${stream}`));
  }

  get state(): number {
    return this.#state;
  }

  /** Число в [0, 1) */
  next(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let x = this.#state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }

  /** Целое в [min, max] включительно */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Rng.pick: пустой список");
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** Случайный элемент с учётом веса. undefined, если у всех вес 0 */
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T | undefined {
    const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
    if (total <= 0) return undefined;
    let roll = this.next() * total;
    for (const item of items) {
      roll -= Math.max(0, weightOf(item));
      if (roll < 0) return item;
    }
    return items[items.length - 1];
  }

  /** Округление с вероятностью по дробной части: 1.3 даёт 2 в 30% случаев. Мелкие прибавки не теряются */
  round(value: number): number {
    const sign = value < 0 ? -1 : 1;
    const abs = Math.abs(value);
    const base = Math.floor(abs);
    return sign * (base + (this.next() < abs - base ? 1 : 0));
  }
}
