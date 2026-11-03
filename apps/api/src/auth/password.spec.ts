import { describe, expect, it } from "vitest";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./password.js";

describe("хеш пароля", () => {
  it("scrypt с солью: один пароль даёт разные хеши, оба проверяются", async () => {
    const a = await hashPassword("correct-horse-battery");
    const b = await hashPassword("correct-horse-battery");
    expect(a).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain("correct-horse-battery");
    expect(await verifyPassword(a, "correct-horse-battery")).toBe(true);
    expect(await verifyPassword(b, "correct-horse-battery")).toBe(true);
  });

  it("неверный пароль и повреждённый хеш не проходят", async () => {
    const hash = await hashPassword("correct-horse-battery");
    expect(await verifyPassword(hash, "correct-horse-batterY")).toBe(false);
    expect(await verifyPassword("plain-text", "plain-text")).toBe(false);
    expect(await verifyPassword("scrypt$1$1$1$x$", "x")).toBe(false);
    expect(await verifyPassword(DUMMY_PASSWORD_HASH, "anything")).toBe(false);
  });

  it("Unicode нормализуется: одинаково выглядящие пароли совпадают", async () => {
    const hash = await hashPassword("Café-пароль-1");
    expect(await verifyPassword(hash, "Café-пароль-1")).toBe(true);
  });
});
