import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, describe, expect, it } from "vitest";
import type { PortalConfig } from "../config.js";
import { PortalJwksService } from "./portal-jwks.service.js";
import { generatePortalKey, portalTestConfig, type TestPortalKey } from "./portal.test-utils.js";

class TestJwks extends PortalJwksService {
  clock = 1_000_000_000;
  calls = 0;
  data: unknown = { keys: [] };
  failing = false;

  constructor(config = portalTestConfig()) {
    super(config);
  }

  protected override now(): number {
    return this.clock;
  }

  protected override fetchJwks(settings: PortalConfig): Promise<unknown> {
    void settings;
    this.calls += 1;
    if (this.failing) return Promise.reject(new Error("JWKS down"));
    return Promise.resolve(this.data);
  }
}

async function keyAndJwks(kid = "portal-test-1"): Promise<{ key: TestPortalKey; jwks: { keys: TestPortalKey["publicJwk"][] } }> {
  const key = await generatePortalKey(kid);
  return { key, jwks: { keys: [key.publicJwk] } };
}

describe("PortalJwksService: кэш и ротация", () => {
  it("кэширует ключи по kid и не запрашивает JWKS на каждый запрос", async () => {
    const { key, jwks } = await keyAndJwks();
    const service = new TestJwks();
    service.data = jwks;
    await expect(service.getKey(key.kid)).resolves.toBeTruthy();
    await expect(service.getKey(key.kid)).resolves.toBeTruthy();
    expect(service.calls).toBe(1);
  });

  it("планово обновляет кэш по TTL", async () => {
    const { key, jwks } = await keyAndJwks();
    const service = new TestJwks();
    service.data = jwks;
    await service.getKey(key.kid);
    service.clock += 300_001;
    await service.getKey(key.kid);
    expect(service.calls).toBe(2);
  });

  it("неизвестный kid запускает обновление, но повторные запросы ограничены интервалом", async () => {
    const { key, jwks } = await keyAndJwks();
    const service = new TestJwks();
    service.data = jwks;
    await service.getKey(key.kid);
    expect(service.calls).toBe(1);

    service.clock += 10_000;
    await expect(service.getKey("unknown-kid")).resolves.toBeNull();
    expect(service.calls).toBe(2);

    // В пределах минимального интервала новый unknown kid не вызывает ещё один запрос
    service.clock += 1;
    await expect(service.getKey("unknown-kid-2")).resolves.toBeNull();
    expect(service.calls).toBe(2);
  });

  it("при недоступном JWKS использует ранее проверенные ключи", async () => {
    const { key, jwks } = await keyAndJwks();
    const service = new TestJwks();
    service.data = jwks;
    await service.getKey(key.kid);
    service.failing = true;
    service.clock += 300_001;
    await expect(service.getKey(key.kid)).resolves.toBeTruthy();
    expect(service.calls).toBe(2);

    // Совсем неизвестный ключ при сбое не принимается
    service.clock += 10_000;
    await expect(service.getKey("never-seen")).resolves.toBeNull();
  });

  it("неизвестный ключ без кэша отвергается", async () => {
    const { jwks } = await keyAndJwks();
    const service = new TestJwks();
    service.data = jwks;
    await expect(service.getKey("missing")).resolves.toBeNull();
  });

  it("аварийно заблокированный kid отвергается без запроса JWKS", async () => {
    const { key, jwks } = await keyAndJwks();
    const service = new TestJwks(portalTestConfig({ PORTAL_JWKS_BLOCKED_KIDS: key.kid }));
    service.data = jwks;
    await expect(service.getKey(key.kid)).resolves.toBeNull();
    expect(service.calls).toBe(0);
  });

  it("отвергает некорректный JWKS и не кэширует его", async () => {
    const { key, jwks } = await keyAndJwks();
    const service = new TestJwks();
    service.data = { keys: [{ ...jwks.keys[0], x: "bad" }] };
    await expect(service.getKey(key.kid)).resolves.toBeNull();
    expect(service.hasCachedKey(key.kid)).toBe(false);

    service.data = { keys: [{ ...jwks.keys[0], alg: "RS256" }] };
    service.clock += 10_000;
    await expect(service.getKey(key.kid)).resolves.toBeNull();

    service.data = "not-an-object";
    service.clock += 10_000;
    await expect(service.getKey(key.kid)).resolves.toBeNull();
  });
});

describe("PortalJwksService: тайм-аут запроса", () => {
  let server: Server | null = null;

  afterAll(() => {
    server?.close();
  });

  it("не зависает при медленном JWKS и возвращает null без кэша", async () => {
    server = createServer((_request, response) => {
      setTimeout(() => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ keys: [] }));
      }, 250);
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    const service = new PortalJwksService(portalTestConfig({ PORTAL_JWKS_URL: `http://127.0.0.1:${port}/jwks`, PORTAL_JWKS_TIMEOUT_MS: "100" }));

    const started = Date.now();
    await expect(service.getKey("portal-test-1")).resolves.toBeNull();
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
