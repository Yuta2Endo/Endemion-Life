import { createPublicKey, webcrypto, type JsonWebKey, type KeyObject } from "node:crypto";
import { readConfig, type AppConfig } from "../config.js";

type CryptoKey = webcrypto.CryptoKey;

/** Временный ES256-ключ для тестов. Живёт только в памяти, production-секреты не используются. */
export interface TestPortalKey {
  kid: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicJwk: JsonWebKey & { kid: string; alg: "ES256"; use: "sig" };
  keyObject: KeyObject;
}

/** Конфигурация API для тестов: интеграция включена, база — фиктивная строка подключения. */
export function portalTestConfig(overrides: Record<string, string> = {}): AppConfig {
  return readConfig({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test",
    PORTAL_INTEGRATION_ENABLED: "true",
    PORTAL_JWT_ISSUER: "https://endemion.online",
    PORTAL_JWT_AUDIENCE: "https://life.endemion.online",
    PORTAL_JWKS_URL: "https://endemion.online/.well-known/jwks.json",
    PORTAL_JWKS_CACHE_TTL_SECONDS: "300",
    PORTAL_JWKS_TIMEOUT_MS: "3000",
    PORTAL_JWKS_MIN_REFRESH_MS: "10000",
    PORTAL_SUBJECT_RATE_LIMIT_PER_MINUTE: "60",
    RATE_LIMIT_PER_MINUTE: "0",
    ...overrides
  });
}

export async function generatePortalKey(kid = "portal-test-1"): Promise<TestPortalKey> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return {
    kid,
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    publicJwk: { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y, kid, alg: "ES256", use: "sig" },
    keyObject: createPublicKey({ key: { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y }, format: "jwk" })
  };
}

export interface PortalClaimsOverrides {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  iat?: number;
  exp?: number;
  jti?: unknown;
  scope?: unknown;
}

export interface PortalHeaderOverrides {
  alg?: string;
  typ?: string;
  kid?: string;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/**
 * Подписывает JWT тем же способом, что и портал (Web Crypto ECDSA, raw r||s): это проверяет
 * совместимость форматов, а не только собственную реализацию Life.
 */
export async function signPortalToken(
  key: TestPortalKey,
  claims: PortalClaimsOverrides = {},
  header: PortalHeaderOverrides = {}
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "https://endemion.online",
    aud: "https://life.endemion.online",
    sub: crypto.randomUUID(),
    iat: now,
    exp: now + 120,
    jti: crypto.randomUUID(),
    scope: "portal:read",
    ...claims
  };
  const head = { alg: "ES256", typ: "JWT", kid: key.kid, ...header };
  const signingInput = `${encode(head)}.${encode(payload)}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key.privateKey, new TextEncoder().encode(signingInput));
  return `${signingInput}.${Buffer.from(signature).toString("base64url")}`;
}
