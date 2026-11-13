/* eslint-disable @typescript-eslint/no-unsafe-member-access -- supertest описывает response.body как any; поля проверяются в expect */
import "reflect-metadata";
import type { Server } from "node:http";
import type { INestApplication, LoggerService, Provider } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { configureApp } from "../bootstrap.js";
import { ApiExceptionFilter } from "../common/exception.filter.js";
import { APP_CONFIG, type AppConfig, type PortalConfig } from "../config.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RateLimitGuard } from "../redis/rate-limit.guard.js";
import { RedisService } from "../redis/redis.service.js";
import { PortalController } from "./portal.controller.js";
import { PortalAuditService } from "./portal-audit.service.js";
import { PortalAuthGuard } from "./portal-auth.guard.js";
import { portalNoStore } from "./portal-cache.middleware.js";
import { PortalJwksService } from "./portal-jwks.service.js";
import { PortalService } from "./portal.service.js";
import { PortalTokenService } from "./portal-token.service.js";
import { generatePortalKey, portalTestConfig, signPortalToken, type TestPortalKey } from "./portal.test-utils.js";

interface FakePlayer {
  id: string;
  idDisplayName: string | null;
}

/**
 * HTTP-проверка Stage 11.2 без PostgreSQL и Redis: Prisma и Redis подменены,
 * проверяется вся цепочка контроллер → гвард → JWT → sub → профиль.
 */
function fakePrisma(players: Map<string, FakePlayer>, lives: Map<string, Array<{ id: string; alive: boolean }>>) {
  const findUnique = vi.fn(({ where }: { where: { endemionSub: string } }) => Promise.resolve(players.get(where.endemionSub) ?? null));
  const count = vi.fn(({ where }: { where: { playerId: string; status?: string } }) => {
    const list = lives.get(where.playerId) ?? [];
    return Promise.resolve(where.status === "alive" ? list.filter((life) => life.alive).length : list.length);
  });
  return {
    client: { player: { findUnique }, life: { count } }
  } as unknown as PrismaService;
}

interface FakeRedisChain {
  incr(key: string): FakeRedisChain;
  expire(key: string, seconds: number): FakeRedisChain;
  exec(): Promise<Array<[null, unknown]>>;
}

interface FakeRedis {
  counters: Map<string, number>;
  ready: boolean;
  failExec: boolean;
  client: { multi(): FakeRedisChain };
}

/**
 * Redis-заменитель. `ready` воспроизводит отсутствие соединения, `failExec` — тайм-аут/сбой
 * команды при живом соединении. Оба режима можно переключать во время теста.
 */
function fakeRedis(options: { ready?: boolean; failExec?: boolean } = {}): FakeRedis {
  const counters = new Map<string, number>();
  const holder = {
    ready: options.ready ?? true,
    failExec: options.failExec ?? false,
    counters,
    client: {
      multi() {
        const operations: Array<() => unknown> = [];
        const chain = {
          incr(key: string) {
            operations.push(() => {
              const value = (counters.get(key) ?? 0) + 1;
              counters.set(key, value);
              return value;
            });
            return chain;
          },
          expire(_key: string, _seconds: number) {
            operations.push(() => 1);
            return chain;
          },
          exec() {
            if (holder.failExec) return Promise.reject(new Error("redis timeout"));
            return Promise.resolve(operations.map((run) => [null, run()] as [null, unknown]));
          }
        };
        return chain;
      }
    }
  };
  return holder;
}

/** Настоящий PortalJwksService с подменённым транспортом: проверяются кэш и блокировка kid. */
class TestJwksProvider extends PortalJwksService {
  constructor(config: AppConfig, private readonly jwks: unknown) {
    super(config);
  }

  protected override fetchJwks(_settings: PortalConfig): Promise<unknown> {
    return Promise.resolve(this.jwks);
  }
}

interface TestContext {
  app: INestApplication;
  key: TestPortalKey;
  audit: PortalAuditService;
  redis: FakeRedis;
  logs: string[];
  subA: string;
  subB: string;
}

const CACHE_CONTROL = "private, no-store";

const SUB_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SUB_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PLAYER_A = { id: "11111111-1111-4111-8111-111111111111", idDisplayName: "Странник" };
const PLAYER_B = { id: "22222222-2222-4222-8222-222222222222", idDisplayName: "Другой" };

interface TestContextOptions {
  players?: Map<string, FakePlayer>;
  /** Зарегистрировать общий RateLimitGuard как APP_GUARD: проверка лимита по IP. */
  globalRateLimit?: boolean;
  /** Применить общую настройку приложения (helmet и т.п.) до init. */
  configureApp?: boolean;
}

async function createTestContext(
  configOverrides: Record<string, string> = {},
  options: TestContextOptions = {}
): Promise<TestContext> {
  const key = await generatePortalKey();
  const config = portalTestConfig(configOverrides);
  const redis = fakeRedis();
  const prisma = fakePrisma(
    options.players ?? new Map([
      [SUB_A, PLAYER_A],
      [SUB_B, PLAYER_B]
    ]),
    new Map([
      [PLAYER_A.id, [{ id: "life-1", alive: true }, { id: "life-2", alive: false }, { id: "life-3", alive: true }]],
      [PLAYER_B.id, [{ id: "life-4", alive: true }]]
    ])
  );

  const logs: string[] = [];
  const testLogger: LoggerService = {
    log: (...args: unknown[]) => logs.push(args.map((value) => JSON.stringify(value)).join(" ")),
    error: (...args: unknown[]) => logs.push(args.map((value) => JSON.stringify(value)).join(" ")),
    warn: (...args: unknown[]) => logs.push(args.map((value) => JSON.stringify(value)).join(" ")),
    debug: (...args: unknown[]) => logs.push(args.map((value) => JSON.stringify(value)).join(" ")),
    verbose: (...args: unknown[]) => logs.push(args.map((value) => JSON.stringify(value)).join(" "))
  };

  const providers: Provider[] = [
    { provide: APP_CONFIG, useValue: config satisfies AppConfig },
    { provide: PrismaService, useValue: prisma },
    { provide: RedisService, useValue: redis },
    // Транспорт JWKS подменён, но кэш, проверка kid и блокировка остаются настоящими
    { provide: PortalJwksService, useValue: new TestJwksProvider(config, { keys: [key.publicJwk] }) },
    PortalAuditService,
    PortalTokenService,
    PortalAuthGuard,
    PortalService,
    { provide: APP_FILTER, useClass: ApiExceptionFilter }
  ];
  if (options.globalRateLimit) providers.push({ provide: APP_GUARD, useClass: RateLimitGuard });

  const builder = Test.createTestingModule({ controllers: [PortalController], providers });
  builder.setLogger(testLogger);
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  if (options.configureApp) configureApp(app);
  app.setGlobalPrefix("api");
  // Как в AppModule: заголовок ставится до гвардов, поэтому попадает и в 429 общего лимита
  app.use("/api/portal", portalNoStore);
  await app.init();
  return { app, key, audit: moduleRef.get(PortalAuditService), redis, logs, subA: SUB_A, subB: SUB_B };
}

function api(context: TestContext) {
  return request(context.app.getHttpServer() as Server);
}

describe("GET /api/portal/profile: HTTP-контракт", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await context.app.close();
  });

  it("валидный JWT возвращает минимальный профиль без playerId и GameState", async () => {
    const token = await signPortalToken(context.key, { sub: SUB_A });
    const response = await api(context)
      .get("/api/portal/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ profile: { exists: true, displayName: "Странник", lives: { total: 3, alive: 2 } } });
    const text = JSON.stringify(response.body);
    expect(text).not.toContain(PLAYER_A.id);
    expect(text).not.toContain("seed");
    expect(text).not.toContain("rngState");
    expect(text).not.toContain("state");
  });

  it("без заголовка Authorization отвечает 401 UNAUTHORIZED", async () => {
    const response = await api(context).get("/api/portal/profile");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("неверная схема авторизации отвергается с 401", async () => {
    const token = await signPortalToken(context.key, { sub: SUB_A });
    const response = await api(context).get("/api/portal/profile").set("Authorization", `Basic ${token}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("подпись чужим ключом отвергается как INVALID_TOKEN", async () => {
    const other = await generatePortalKey();
    const token = await signPortalToken(other, { sub: SUB_A }, { kid: context.key.kid });
    const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_TOKEN");
  });

  it("истёкший токен отвечает TOKEN_EXPIRED", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signPortalToken(context.key, { sub: SUB_A, iat: now - 200, exp: now - 80 });
    const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("TOKEN_EXPIRED");
  });

  it("токен с неверным aud отвергается", async () => {
    const token = await signPortalToken(context.key, { sub: SUB_A, aud: "https://evil.example" });
    const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_TOKEN");
  });

  it("неизвестный sub отвечает 404 NO_LIFE_PROFILE без создания профиля", async () => {
    const token = await signPortalToken(context.key, { sub: crypto.randomUUID() });
    const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NO_LIFE_PROFILE");
  });

  it("playerId в query и теле запроса игнорируется: выбирается только игрок из sub", async () => {
    const token = await signPortalToken(context.key, { sub: SUB_A });
    const withPlayerId = await api(context)
      .get("/api/portal/profile")
      .query({ playerId: PLAYER_B.id, sub: SUB_B })
      .set("Authorization", `Bearer ${token}`);
    const plain = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

    expect(withPlayerId.status).toBe(200);
    expect(withPlayerId.body).toEqual(plain.body);
    expect(withPlayerId.body.profile.displayName).toBe("Странник");
  });

  it("токен одного аккаунта не даёт данные другого", async () => {
    const tokenA = await signPortalToken(context.key, { sub: SUB_A });
    const tokenB = await signPortalToken(context.key, { sub: SUB_B });
    const responseA = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${tokenA}`);
    const responseB = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${tokenB}`);

    expect(responseA.body.profile.displayName).toBe("Странник");
    expect(responseB.body.profile.displayName).toBe("Другой");
    expect(responseB.body.profile.lives).toEqual({ total: 1, alive: 1 });
  });

  it("в журнал не попадают JWT и сырой sub", async () => {
    const token = await signPortalToken(context.key, { sub: SUB_A });
    context.logs.length = 0;
    const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);

    const output = context.logs.join("\n");
    expect(output).not.toContain(token);
    expect(output).not.toContain(SUB_A);
    expect(output).toMatch(/portal\.auth\.success/);
  });
});

describe("GET /api/portal/profile: лимит и выключенная интеграция", () => {
  it("превышение лимита на sub отвечает 429 RATE_LIMITED", async () => {
    const context = await createTestContext({ PORTAL_SUBJECT_RATE_LIMIT_PER_MINUTE: "1" });
    try {
      const token = await signPortalToken(context.key, { sub: SUB_A });
      const first = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
      const second = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
      expect(second.body.error.code).toBe("RATE_LIMITED");
    } finally {
      await context.app.close();
    }
  });

  it("без Redis лимит на sub пропускается, запрос работает", async () => {
    const context = await createTestContext();
    (context.redis as unknown as { ready: boolean }).ready = false;
    try {
      const token = await signPortalToken(context.key, { sub: SUB_A });
      for (let index = 0; index < 3; index += 1) {
        const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(200);
      }
    } finally {
      await context.app.close();
    }
  });

  it("при PORTAL_INTEGRATION_ENABLED=false маршрут отвечает 404 NOT_FOUND", async () => {
    const context = await createTestContext({ PORTAL_INTEGRATION_ENABLED: "false" });
    try {
      const token = await signPortalToken(context.key, { sub: SUB_A });
      const withToken = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
      const withoutToken = await api(context).get("/api/portal/profile");
      expect(withToken.status).toBe(404);
      expect(withToken.body.error.code).toBe("NOT_FOUND");
      expect(withoutToken.status).toBe(404);
    } finally {
      await context.app.close();
    }
  });
});

describe("GET /api/portal/profile: Cache-Control (Stage 11.2.1)", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await context.app.close();
  });

  it("успешный персонализированный профиль помечен private, no-store", async () => {
    const token = await signPortalToken(context.key, { sub: SUB_A });
    const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe(CACHE_CONTROL);
  });

  it("404 NO_LIFE_PROFILE тоже не кэшируется", async () => {
    const token = await signPortalToken(context.key, { sub: crypto.randomUUID() });
    const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.headers["cache-control"]).toBe(CACHE_CONTROL);
  });

  it("401 без Authorization не кэшируется", async () => {
    const response = await api(context).get("/api/portal/profile");

    expect(response.status).toBe(401);
    expect(response.headers["cache-control"]).toBe(CACHE_CONTROL);
  });

  it("401 с недействительным токеном не кэшируется", async () => {
    const response = await api(context).get("/api/portal/profile").set("Authorization", "Bearer not-a-jwt");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_TOKEN");
    expect(response.headers["cache-control"]).toBe(CACHE_CONTROL);
  });

  it("401 TOKEN_EXPIRED не кэшируется", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signPortalToken(context.key, { sub: SUB_A, iat: now - 200, exp: now - 80 });
    const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("TOKEN_EXPIRED");
    expect(response.headers["cache-control"]).toBe(CACHE_CONTROL);
  });

  it("не перетирает защитные заголовки helmet", async () => {
    const secured = await createTestContext({}, { configureApp: true });
    try {
      const token = await signPortalToken(secured.key, { sub: SUB_A });
      const response = await api(secured).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["cache-control"]).toBe(CACHE_CONTROL);
    } finally {
      await secured.app.close();
    }
  });

  it("429 лимита на sub не кэшируется", async () => {
    const limited = await createTestContext({ PORTAL_SUBJECT_RATE_LIMIT_PER_MINUTE: "1" });
    try {
      const token = await signPortalToken(limited.key, { sub: SUB_A });
      await api(limited).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
      const response = await api(limited).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe("RATE_LIMITED");
      expect(response.headers["cache-control"]).toBe(CACHE_CONTROL);
    } finally {
      await limited.app.close();
    }
  });

  it("404 выключенной интеграции не кэшируется", async () => {
    const disabled = await createTestContext({ PORTAL_INTEGRATION_ENABLED: "false" });
    try {
      const response = await api(disabled).get("/api/portal/profile");

      expect(response.status).toBe(404);
      expect(response.headers["cache-control"]).toBe(CACHE_CONTROL);
    } finally {
      await disabled.app.close();
    }
  });
});

describe("JWT: срок действия, допуск часов и заблокированный kid (Stage 11.2.1)", () => {
  it("ранее выпущенный токен принимается, пока не истёк", async () => {
    const context = await createTestContext();
    try {
      const now = Math.floor(Date.now() / 1000);
      // Выпущен 100 секунд назад, действует ещё 20 секунд: сессия портала могла быть завершена,
      // но Life проверяет только подпись и claims уже выпущенного токена.
      const token = await signPortalToken(context.key, { sub: SUB_A, iat: now - 100, exp: now + 20 });
      const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.profile.displayName).toBe("Странник");
    } finally {
      await context.app.close();
    }
  });

  it("токен, истёкший в пределах 30 секунд, ещё принимается", async () => {
    const context = await createTestContext();
    try {
      const now = Math.floor(Date.now() / 1000);
      const token = await signPortalToken(context.key, { sub: SUB_A, iat: now - 140, exp: now - 20 });
      const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    } finally {
      await context.app.close();
    }
  });

  it("токен, истёкший больше 30 секунд назад, отвергается как TOKEN_EXPIRED", async () => {
    const context = await createTestContext();
    try {
      const now = Math.floor(Date.now() / 1000);
      const token = await signPortalToken(context.key, { sub: SUB_A, iat: now - 151, exp: now - 31 });
      const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("TOKEN_EXPIRED");
    } finally {
      await context.app.close();
    }
  });

  it("заблокированный kid отвергается, даже если токен не истёк", async () => {
    const context = await createTestContext({ PORTAL_JWKS_BLOCKED_KIDS: "portal-test-1" });
    try {
      const token = await signPortalToken(context.key, { sub: SUB_A });
      context.logs.length = 0;
      const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
      const output = context.logs.join("\n");
      expect(output).toMatch(/unknown_key/);
      expect(output).not.toMatch(/portal\.auth\.success/);
      expect(output).not.toContain(token);
      expect(output).not.toContain(SUB_A);
    } finally {
      await context.app.close();
    }
  });
});

describe("GET /api/portal/profile: Redis и лимиты (Stage 11.2.1)", () => {
  it("при недоступном Redis запрос проходит и пишется одно событие redis_not_ready", async () => {
    const context = await createTestContext();
    try {
      context.redis.ready = false;
      context.logs.length = 0;
      const token = await signPortalToken(context.key, { sub: SUB_A });
      for (let index = 0; index < 3; index += 1) {
        const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(200);
      }

      const output = context.logs.join("\n");
      expect((output.match(/portal\.rate_limit\.unavailable/g) ?? [])).toHaveLength(1);
      expect(output).toMatch(/redis_not_ready/);
      expect(output).not.toContain(token);
      expect(output).not.toContain(SUB_A);
    } finally {
      await context.app.close();
    }
  });

  it("тайм-аут команды Redis пропускает запрос и пишется одно событие redis_error", async () => {
    const context = await createTestContext();
    try {
      context.redis.failExec = true;
      context.logs.length = 0;
      const token = await signPortalToken(context.key, { sub: SUB_A });
      for (let index = 0; index < 3; index += 1) {
        const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(200);
      }

      const output = context.logs.join("\n");
      expect((output.match(/portal\.rate_limit\.unavailable/g) ?? [])).toHaveLength(1);
      expect(output).toMatch(/redis_error/);
      expect(output).not.toContain(token);
      expect(output).not.toContain(SUB_A);
    } finally {
      await context.app.close();
    }
  });

  it("после восстановления Redis следующий сбой снова попадает в журнал", async () => {
    const context = await createTestContext();
    try {
      const token = await signPortalToken(context.key, { sub: SUB_A });
      context.logs.length = 0;

      context.redis.failExec = true;
      await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
      context.redis.failExec = false;
      const recovered = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
      context.redis.failExec = true;
      await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

      expect(recovered.status).toBe(200);
      expect((context.logs.join("\n").match(/portal\.rate_limit\.unavailable/g) ?? [])).toHaveLength(2);
    } finally {
      await context.app.close();
    }
  });

  it("явно выключенный лимит на sub (0) не пишет предупреждений", async () => {
    const context = await createTestContext({ PORTAL_SUBJECT_RATE_LIMIT_PER_MINUTE: "0" });
    try {
      context.redis.ready = false;
      context.logs.length = 0;
      const token = await signPortalToken(context.key, { sub: SUB_A });
      const response = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(context.logs.join("\n")).not.toMatch(/portal\.rate_limit\.unavailable/);
    } finally {
      await context.app.close();
    }
  });

  it("общий лимит по IP отвечает 429 RATE_LIMITED и сохраняет Cache-Control", async () => {
    const context = await createTestContext({ RATE_LIMIT_PER_MINUTE: "1" }, { globalRateLimit: true });
    try {
      const token = await signPortalToken(context.key, { sub: SUB_A });
      const first = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);
      const second = await api(context).get("/api/portal/profile").set("Authorization", `Bearer ${token}`);

      expect(first.status).toBe(200);
      expect(second.status).toBe(429);
      expect(second.body.error.code).toBe("RATE_LIMITED");
      expect(second.headers["cache-control"]).toBe(CACHE_CONTROL);
    } finally {
      await context.app.close();
    }
  });
});
