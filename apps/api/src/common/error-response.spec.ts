import { Prisma } from "@endemion/database";
import { GameRuleError } from "@endemion/game-core";
import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { readConfig } from "../config.js";
import { ApiError } from "./api-error.js";
import { toErrorResponse } from "./error-response.js";

describe("ответы с ошибкой", () => {
  it("ошибка API отдаётся как есть", () => {
    expect(toErrorResponse(new ApiError(409, "VERSION_CONFLICT", "Устарело", { currentVersion: 3 }))).toEqual({
      status: 409,
      body: { error: { code: "VERSION_CONFLICT", message: "Устарело", details: { currentVersion: 3 } } }
    });
  });

  it("нарушение правил игры — 400 или 409 с кодом правила", () => {
    expect(toErrorResponse(new GameRuleError("CHOICE_LOCKED", "Недоступно")).status).toBe(409);
    expect(toErrorResponse(new GameRuleError("UNKNOWN_CHOICE", "Нет такого")).body.error.code).toBe("UNKNOWN_CHOICE");
    expect(toErrorResponse(new GameRuleError("INSUFFICIENT_WEALTH", "Мало золота")).status).toBe(409);
  });

  it("повреждённое сохранение и неизвестные сбои не раскрывают подробностей", () => {
    expect(toErrorResponse(new GameRuleError("INVALID_SAVE", "stats"))).toEqual({ status: 500, body: { error: { code: "INTERNAL", message: "Ошибка сервера" } } });
    expect(toErrorResponse(new Error("connection string with password")).body.error.message).toBe("Ошибка сервера");
  });

  it("нет связи с базой — 503 UNAVAILABLE без подробностей; прочие ошибки Prisma — 500", () => {
    const unreachable = new Prisma.PrismaClientKnownRequestError("Can't reach database server at postgres", { code: "P1001", clientVersion: "7" });
    expect(toErrorResponse(unreachable)).toEqual({
      status: 503,
      body: { error: { code: "UNAVAILABLE", message: "Сервис временно недоступен, попробуйте через минуту" } }
    });
    expect(toErrorResponse(new Prisma.PrismaClientKnownRequestError("pool", { code: "P2024", clientVersion: "7" })).status).toBe(503);
    expect(toErrorResponse(new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "7" })).status).toBe(500);
  });

  it("404 Nest и ошибки разбора JSON", () => {
    expect(toErrorResponse(new NotFoundException()).body.error.code).toBe("NOT_FOUND");
    expect(toErrorResponse({ status: 400, type: "entity.parse.failed" }).status).toBe(400);
    expect(toErrorResponse({ status: 413, type: "entity.too.large" }).status).toBe(413);
  });
});

describe("настройки", () => {
  it("значения по умолчанию и список адресов", () => {
    const config = readConfig({ DATABASE_URL: "postgresql://x", CORS_ORIGINS: "http://a, http://b" });
    expect(config.port).toBe(4000);
    expect(config.corsOrigins).toEqual(["http://a", "http://b"]);
    expect(config.secureCookies).toBe(false);
    expect(readConfig({ DATABASE_URL: "postgresql://x", NODE_ENV: "production" }).secureCookies).toBe(true);
    expect(config.trustProxy).toBe("loopback");
  });

  it("COOKIE_SECURE и TRUST_PROXY переопределяют значения по умолчанию", () => {
    const config = readConfig({
      DATABASE_URL: "postgresql://x",
      NODE_ENV: "production",
      COOKIE_SECURE: "false",
      TRUST_PROXY: "loopback, uniquelocal"
    });
    expect(config.secureCookies).toBe(false);
    expect(config.trustProxy).toBe("loopback, uniquelocal");
    expect(() => readConfig({ DATABASE_URL: "postgresql://x", COOKIE_SECURE: "yes" })).toThrow(/COOKIE_SECURE/);
  });

  it("без DATABASE_URL запуск невозможен", () => {
    expect(() => readConfig({})).toThrow(/DATABASE_URL/);
  });

  it("почта: без SMTP в разработке — файлы, в рабочей среде — не отправляется; file в рабочей среде запрещён", () => {
    const base = { DATABASE_URL: "postgresql://x" };
    expect(readConfig(base).mail.driver).toBe("file");
    expect(readConfig({ ...base, NODE_ENV: "production" }).mail.driver).toBe("none");
    expect(readConfig({ ...base, NODE_ENV: "production", SMTP_URL: "smtps://u:p@smtp.example:465" }).mail.driver).toBe("smtp");
    expect(() => readConfig({ ...base, MAIL_DRIVER: "smtp" })).toThrow(/SMTP_URL/);
    expect(() => readConfig({ ...base, NODE_ENV: "production", MAIL_DRIVER: "file" })).toThrow(/MAIL_DRIVER=file/);
  });

  it("логи: в рабочей среде JSON по умолчанию; адрес сайта берётся из PUBLIC_URL или первого CORS_ORIGINS", () => {
    const prod = readConfig({ DATABASE_URL: "postgresql://x", NODE_ENV: "production", CORS_ORIGINS: "https://life.endemion.online" });
    expect(prod.log.format).toBe("json");
    expect(prod.publicUrl).toBe("https://life.endemion.online");
    expect(readConfig({ DATABASE_URL: "postgresql://x", PUBLIC_URL: "https://x.example/" }).publicUrl).toBe("https://x.example");
    expect(readConfig({ DATABASE_URL: "postgresql://x", SENTRY_DSN: "  " }).sentryDsn).toBeNull();
  });
});
