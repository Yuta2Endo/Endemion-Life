import { createPublicKey, type JsonWebKey, type KeyObject } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { APP_CONFIG, type AppConfig, type PortalConfig } from "../config.js";
import { PORTAL_KID_PATTERN } from "./portal.constants.js";

/** Верхняя граница числа ключей в одном JWKS: кэш не должен расти без предела. */
const MAX_JWKS_KEYS = 32;

export interface PortalKeyProvider {
  getKey(kid: string): Promise<KeyObject | null>;
}

interface PublicJwk extends JsonWebKey {
  kid?: string;
}

/** base64url строка длиной ровно 32 байта (координата P-256). */
function isCoordinate(value: unknown): value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
  return Buffer.from(value, "base64url").length === 32;
}

function readJwk(value: unknown): { kid: string; key: KeyObject } | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const jwk = value as PublicJwk;
  if (jwk.kty !== "EC" || jwk.crv !== "P-256") return null;
  // Принимаем только ключи, явно предназначенные для ES256 и подписи
  if (jwk.alg !== "ES256" || jwk.use !== "sig") return null;
  if (typeof jwk.kid !== "string" || !PORTAL_KID_PATTERN.test(jwk.kid)) return null;
  if (!isCoordinate(jwk.x) || !isCoordinate(jwk.y)) return null;
  try {
    const key = createPublicKey({ key: { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y }, format: "jwk" });
    if (key.asymmetricKeyType !== "ec") return null;
    return { kid: jwk.kid, key };
  } catch {
    return null;
  }
}

/**
 * Кэш публичных ключей портала.
 *
 * Поведение:
 *  - ключи кэшируются по kid, плановое обновление раз в PORTAL_JWKS_CACHE_TTL_SECONDS (300 с);
 *  - неизвестный kid запускает обновление, но не чаще PORTAL_JWKS_MIN_REFRESH_MS (10 с) —
 *    защита от amplification повторными запросами с чужим kid;
 *  - при недоступности JWKS остаются ранее проверенные ключи;
 *  - kid из PORTAL_JWKS_BLOCKED_KIDS не принимается и не кэшируется (аварийная блокировка);
 *  - URL берётся только из конфигурации, никогда из заголовка JWT.
 */
@Injectable()
export class PortalJwksService implements PortalKeyProvider {
  private readonly logger = new Logger("PortalJwks");
  private keys = new Map<string, KeyObject>();
  private fetchedAt = 0;
  private lastFetchStartedAt = 0;
  private inFlight: Promise<void> | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private settings(): PortalConfig {
    if (!this.config.portal) throw new Error("Интеграция с порталом выключена");
    return this.config.portal;
  }

  protected now(): number {
    return Date.now();
  }

  /** Отдельный метод, чтобы тесты могли подменить транспорт, не меняя кэш. */
  protected async fetchJwks(settings: PortalConfig): Promise<unknown> {
    const response = await fetch(settings.jwksUrl, {
      signal: AbortSignal.timeout(settings.jwksTimeoutMs),
      headers: { accept: "application/jwk-set+json, application/json" }
    });
    if (!response.ok) throw new Error(`JWKS: ${response.status}`);
    return response.json();
  }

  async getKey(kid: string): Promise<KeyObject | null> {
    const settings = this.settings();
    if (!PORTAL_KID_PATTERN.test(kid) || settings.jwksBlockedKids.has(kid)) return null;

    const now = this.now();
    const cached = this.keys.get(kid);
    const stale = now - this.fetchedAt > settings.jwksCacheTtlMs;
    if ((!cached || stale) && now - this.lastFetchStartedAt >= settings.jwksMinRefreshMs) {
      await this.refresh(settings, now);
    }
    return this.keys.get(kid) ?? null;
  }

  /** true, если ключ был в кэше: нужно только для диагностики/тестов. */
  hasCachedKey(kid: string): boolean {
    return this.keys.has(kid);
  }

  private async refresh(settings: PortalConfig, now: number): Promise<void> {
    if (this.inFlight) {
      await this.inFlight;
      return;
    }
    this.lastFetchStartedAt = now;
    const task = (async () => {
      try {
        const parsed = this.parse(await this.fetchJwks(settings), settings);
        if (!parsed) throw new Error("Пустой или некорректный JWKS");
        this.keys = parsed;
        this.fetchedAt = this.now();
      } catch (error) {
        // Старые валидные ключи остаются: временная недоступность JWKS не ломает проверку
        this.logger.warn({
          msg: "JWKS портала недоступен, используются сохранённые ключи",
          error: error instanceof Error ? error.message : "unknown"
        });
      } finally {
        this.inFlight = null;
      }
    })();
    this.inFlight = task;
    await task;
  }

  private parse(data: unknown, settings: PortalConfig): Map<string, KeyObject> | null {
    if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
    const keys = (data as { keys?: unknown }).keys;
    if (!Array.isArray(keys) || keys.length === 0 || keys.length > MAX_JWKS_KEYS) return null;
    const parsed = new Map<string, KeyObject>();
    for (const value of keys) {
      const entry = readJwk(value);
      if (!entry) continue;
      if (settings.jwksBlockedKids.has(entry.kid)) continue;
      parsed.set(entry.kid, entry.key);
    }
    return parsed.size > 0 ? parsed : null;
  }
}
