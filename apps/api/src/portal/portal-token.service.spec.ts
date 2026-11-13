import type { KeyObject } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PortalKeyProvider } from "./portal-jwks.service.js";
import { PortalTokenError, PortalTokenService } from "./portal-token.service.js";
import { generatePortalKey, portalTestConfig, signPortalToken, type TestPortalKey } from "./portal.test-utils.js";

function providerWith(key: TestPortalKey): PortalKeyProvider {
  return { getKey: (kid: string): Promise<KeyObject | null> => Promise.resolve(kid === key.kid ? key.keyObject : null) };
}

async function setup() {
  const key = await generatePortalKey();
  const service = new PortalTokenService(portalTestConfig(), providerWith(key));
  return { key, service };
}

async function expectRejection(promise: Promise<unknown>, code: "INVALID_TOKEN" | "TOKEN_EXPIRED", reason?: string) {
  await expect(promise).rejects.toBeInstanceOf(PortalTokenError);
  await promise.catch((error: PortalTokenError) => {
    expect(error.code).toBe(code);
    if (reason) expect(error.reason).toBe(reason);
  });
}

describe("PortalTokenService", () => {
  it("принимает корректное утверждение и возвращает только sub/хеш/jti", async () => {
    const { key, service } = await setup();
    const token = await signPortalToken(key);
    const identity = await service.verify(token);
    expect(identity.sub).toMatch(/^[0-9a-f-]{36}$/);
    expect(identity.subHash).toMatch(/^[0-9a-f]{64}$/);
    expect(identity.jti).toBeTruthy();
    expect(JSON.stringify(identity)).not.toContain(token);
  });

  it("принимает срок жизни ровно 120 секунд", async () => {
    const { key, service } = await setup();
    const now = Math.floor(Date.now() / 1000);
    await expect(service.verify(await signPortalToken(key, { iat: now, exp: now + 120 }))).resolves.toBeTruthy();
  });

  it("допускает расхождение часов в пределах 30 секунд", async () => {
    const { key, service } = await setup();
    const now = Math.floor(Date.now() / 1000);
    // iat на 30 секунд в будущем ещё допустим; exp = iat + 120
    await expect(service.verify(await signPortalToken(key, { iat: now + 30, exp: now + 150 }))).resolves.toBeTruthy();
  });

  it("отвергает пустой и структурно неверный токен", async () => {
    const { service } = await setup();
    await expectRejection(service.verify(""), "INVALID_TOKEN", "malformed");
    await expectRejection(service.verify("abc.def"), "INVALID_TOKEN", "malformed");
    await expectRejection(service.verify("a.b.c"), "INVALID_TOKEN", "malformed_header");
    await expectRejection(service.verify(`${"a".repeat(5000)}.b.c`), "INVALID_TOKEN", "malformed");
  });

  it("отвергает alg=none и другие алгоритмы", async () => {
    const { key, service } = await setup();
    await expectRejection(service.verify(await signPortalToken(key, {}, { alg: "none" })), "INVALID_TOKEN", "algorithm");
    await expectRejection(service.verify(await signPortalToken(key, {}, { alg: "HS256" })), "INVALID_TOKEN", "algorithm");
    await expectRejection(service.verify(await signPortalToken(key, {}, { alg: "ES384" })), "INVALID_TOKEN", "algorithm");
  });

  it("отвергает неверный typ и неизвестный kid", async () => {
    const { key, service } = await setup();
    await expectRejection(service.verify(await signPortalToken(key, {}, { typ: "JWS" })), "INVALID_TOKEN", "type");
    await expectRejection(service.verify(await signPortalToken(key, {}, { kid: "other-key" })), "INVALID_TOKEN", "unknown_key");
  });

  it("отвергает неверную подпись", async () => {
    const { service } = await setup();
    const other = await generatePortalKey();
    const token = await signPortalToken(other, {}, { kid: "portal-test-1" });
    await expectRejection(service.verify(token), "INVALID_TOKEN", "signature");
  });

  it("отвергает неверные iss и aud", async () => {
    const { key, service } = await setup();
    await expectRejection(service.verify(await signPortalToken(key, { iss: "https://evil.example" })), "INVALID_TOKEN", "issuer");
    await expectRejection(service.verify(await signPortalToken(key, { aud: "https://other.example" })), "INVALID_TOKEN", "audience");
    await expectRejection(service.verify(await signPortalToken(key, { aud: ["https://life.endemion.online"] })), "INVALID_TOKEN", "audience");
  });

  it("требует обязательный scope=portal:read", async () => {
    const { key, service } = await setup();
    const now = Math.floor(Date.now() / 1000);
    await expectRejection(service.verify(await signPortalToken(key, { scope: undefined })), "INVALID_TOKEN", "scope");
    await expectRejection(service.verify(await signPortalToken(key, { scope: "portal:write" })), "INVALID_TOKEN", "scope");
    await expectRejection(service.verify(await signPortalToken(key, { scope: "portal:read portal:write" })), "INVALID_TOKEN", "scope");
    await expect(service.verify(await signPortalToken(key, { iat: now, exp: now + 120 }))).resolves.toBeTruthy();
  });

  it("требует канонический UUID в sub и непустой jti", async () => {
    const { key, service } = await setup();
    await expectRejection(service.verify(await signPortalToken(key, { sub: "not-a-uuid" })), "INVALID_TOKEN", "subject");
    await expectRejection(service.verify(await signPortalToken(key, { sub: 123 })), "INVALID_TOKEN", "subject");
    await expectRejection(service.verify(await signPortalToken(key, { jti: "" })), "INVALID_TOKEN", "jti");
    await expectRejection(service.verify(await signPortalToken(key, { jti: undefined })), "INVALID_TOKEN", "jti");
  });

  it("отвергает истёкший токен как TOKEN_EXPIRED", async () => {
    const { key, service } = await setup();
    const now = Math.floor(Date.now() / 1000);
    await expectRejection(service.verify(await signPortalToken(key, { iat: now - 200, exp: now - 80 })), "TOKEN_EXPIRED", "expired");
  });

  it("отвергает iat в будущем больше допуска", async () => {
    const { key, service } = await setup();
    const now = Math.floor(Date.now() / 1000);
    await expectRejection(service.verify(await signPortalToken(key, { iat: now + 31, exp: now + 151 })), "INVALID_TOKEN", "issued_in_future");
  });

  it("отвергает срок жизни больше 120 секунд", async () => {
    const { key, service } = await setup();
    const now = Math.floor(Date.now() / 1000);
    await expectRejection(service.verify(await signPortalToken(key, { iat: now, exp: now + 121 })), "INVALID_TOKEN", "lifetime");
    await expectRejection(service.verify(await signPortalToken(key, { iat: now, exp: now })), "INVALID_TOKEN", "lifetime");
  });

  it("отвергает нечисловые iat/exp", async () => {
    const { key, service } = await setup();
    await expectRejection(service.verify(await signPortalToken(key, { iat: "now" as unknown as number })), "INVALID_TOKEN", "time");
  });
});
