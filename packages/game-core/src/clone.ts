/**
 * Глубокая копия данных игры. Состояние — обычные JSON-данные (объекты, массивы, строки, числа, null),
 * поэтому копия не зависит от structuredClone и одинаково работает в браузере, Node.js и тестах
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item: unknown) => deepClone(item)) as T;
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) copy[key] = deepClone(item);
  return copy as T;
}
