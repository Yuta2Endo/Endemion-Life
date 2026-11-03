import { describe, expect, it } from "vitest";
import { loginSchema, normalizeEmail, registerSchema, resetPasswordSchema, revokeSessionSchema, verifyEmailSchema } from "../src/index.js";

describe("контракты аккаунтов", () => {
  it("адрес почты нормализуется: пробелы и регистр не создают второй аккаунт", () => {
    expect(normalizeEmail("  Hero@Example.COM ")).toBe("hero@example.com");
    const parsed = registerSchema.parse({ email: " Hero@Example.com", password: "long-enough-pass" });
    expect(parsed.email).toBe("hero@example.com");
  });

  it("регистрация: корректная почта, пароль от 10 до 128 символов, без лишних полей", () => {
    expect(registerSchema.safeParse({ email: "not-an-email", password: "long-enough-pass" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "a@b.co", password: "x".repeat(129) }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "a@b.co", password: "long-enough-pass", role: "admin" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "hero@example.com", password: "HERO@example.com" }).success).toBe(false);
  });

  it("вход не проверяет минимальную длину пароля, но ограничивает максимальную", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x".repeat(129) }).success).toBe(false);
  });

  it("код подтверждения — ровно 6 цифр", () => {
    expect(verifyEmailSchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(verifyEmailSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(verifyEmailSchema.safeParse({ code: "12345a" }).success).toBe(false);
  });

  it("токен восстановления и идентификатор сессии проверяются по формату", () => {
    expect(resetPasswordSchema.safeParse({ token: "A".repeat(43), password: "long-enough-pass" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: "../../etc", password: "long-enough-pass" }).success).toBe(false);
    expect(revokeSessionSchema.safeParse({ sessionId: "not-a-uuid" }).success).toBe(false);
  });
});
