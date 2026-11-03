import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Хеш пароля: scrypt (встроен в Node.js, устойчив к перебору на GPU за счёт памяти).
 * Формат строки: scrypt$N$r$p$соль$хеш — параметры хранятся вместе с хешем, их можно усилить позже
 */
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
// scrypt требует 128 * N * r байт памяти: 32 МБ при этих параметрах
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, options: ScryptOptions, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, length, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, { N, r: R, p: P, maxmem: MAX_MEMORY }, KEY_LENGTH);
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/** Сравнение за постоянное время. Повреждённая строка хеша — просто неверный пароль */
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltText, keyText] = parts as [string, string, string, string, string, string];
  const expected = Buffer.from(keyText, "base64url");
  if (expected.length === 0) return false;
  try {
    const key = await derive(password, Buffer.from(saltText, "base64url"), { N: Number(n), r: Number(r), p: Number(p), maxmem: MAX_MEMORY }, expected.length);
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/**
 * Хеш-заглушка: проверяется, когда аккаунта с такой почтой нет.
 * Время ответа одинаково, поэтому по задержке нельзя узнать, зарегистрирован ли адрес
 */
export const DUMMY_PASSWORD_HASH = `scrypt$${N}$${R}$${P}$${Buffer.alloc(SALT_LENGTH, 7).toString("base64url")}$${Buffer.alloc(KEY_LENGTH, 7).toString("base64url")}`;
