import { verify as verifySignature } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG, type AppConfig, type PortalConfig } from "../config.js";
import {
  PORTAL_CLOCK_SKEW_SECONDS,
  PORTAL_JTI_PATTERN,
  PORTAL_KID_PATTERN,
  PORTAL_MAX_LIFETIME_SECONDS,
  PORTAL_MAX_TOKEN_LENGTH,
  PORTAL_SCOPE,
  hashPortalSubject,
  isPortalSubject,
  type PortalIdentity
} from "./portal.constants.js";
import { PortalJwksService, type PortalKeyProvider } from "./portal-jwks.service.js";

/** Ошибка проверки: клиенту уходит только статус и общий код, причина — в журнал. */
export class PortalTokenError extends Error {
  constructor(
    readonly code: "INVALID_TOKEN" | "TOKEN_EXPIRED",
    readonly reason: string,
    readonly audit: { subHash?: string; jti?: string } = {}
  ) {
    super(code === "TOKEN_EXPIRED" ? "Срок действия токена истёк" : "Недействительный токен");
    this.name = "PortalTokenError";
  }
}

function invalid(reason: string): PortalTokenError {
  return new PortalTokenError("INVALID_TOKEN", reason);
}

function decodeJson(segment: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as unknown;
    return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/**
 * Проверка portal-утверждения (JWT) по контракту Stage 11.2.
 *
 * Порядок: структура → alg/typ/kid → ключ по kid из JWKS → подпись ES256 →
 * iss/aud/sub/scope/jti → iat/exp и предельный срок жизни 120 с с допуском часов 30 с.
 * Алгоритм `none` и любой другой alg отвергаются. Детали проверки наружу не уходят.
 */
@Injectable()
export class PortalTokenService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PortalJwksService) private readonly jwks: PortalKeyProvider
  ) {}

  private settings(): PortalConfig {
    if (!this.config.portal) throw invalid("disabled");
    return this.config.portal;
  }

  async verify(token: string): Promise<PortalIdentity> {
    const settings = this.settings();
    if (typeof token !== "string" || token.length === 0 || token.length > PORTAL_MAX_TOKEN_LENGTH) throw invalid("malformed");
    const parts = token.split(".");
    if (parts.length !== 3) throw invalid("malformed");
    const [headerPart, payloadPart, signaturePart] = parts;
    if (!headerPart || !payloadPart || !signaturePart) throw invalid("malformed");
    if (!/^[A-Za-z0-9_-]+$/.test(headerPart) || !/^[A-Za-z0-9_-]+$/.test(payloadPart) || !/^[A-Za-z0-9_-]+$/.test(signaturePart)) {
      throw invalid("malformed");
    }

    const header = decodeJson(headerPart);
    if (!header) throw invalid("malformed_header");
    if (header.alg !== "ES256") throw invalid("algorithm");
    if (header.typ !== "JWT") throw invalid("type");
    const kid = header.kid;
    if (typeof kid !== "string" || !PORTAL_KID_PATTERN.test(kid)) throw invalid("kid");

    const key = await this.jwks.getKey(kid);
    if (!key) throw invalid("unknown_key");

    const signature = Buffer.from(signaturePart, "base64url");
    if (signature.length !== 64) throw invalid("signature");
    let valid = false;
    try {
      valid = verifySignature("sha256", Buffer.from(`${headerPart}.${payloadPart}`), { key, dsaEncoding: "ieee-p1363" }, signature);
    } catch {
      valid = false;
    }
    if (!valid) throw invalid("signature");

    const payload = decodeJson(payloadPart);
    if (!payload) throw invalid("malformed_payload");

    // Дальше подпись уже верна: можно безопасно использовать sub/jti в аудите ошибок
    const sub = payload.sub;
    const jti = payload.jti;
    const audit = {
      ...(isPortalSubject(sub) ? { subHash: hashPortalSubject(sub) } : {}),
      ...(typeof jti === "string" ? { jti } : {})
    };
    const deny = (reason: string): PortalTokenError => new PortalTokenError("INVALID_TOKEN", reason, audit);

    if (payload.iss !== settings.issuer) throw deny("issuer");
    if (payload.aud !== settings.audience) throw deny("audience");
    if (!isPortalSubject(sub)) throw deny("subject");
    if (payload.scope !== PORTAL_SCOPE) throw deny("scope");
    if (typeof jti !== "string" || !PORTAL_JTI_PATTERN.test(jti)) throw deny("jti");
    const iat = payload.iat;
    const exp = payload.exp;
    if (!isInteger(iat) || !isInteger(exp)) throw deny("time");
    if (exp <= iat) throw deny("lifetime");
    if (exp - iat > PORTAL_MAX_LIFETIME_SECONDS) throw deny("lifetime");

    const now = Math.floor(Date.now() / 1000);
    if (iat > now + PORTAL_CLOCK_SKEW_SECONDS) throw deny("issued_in_future");
    if (exp < now - PORTAL_CLOCK_SKEW_SECONDS) {
      throw new PortalTokenError("TOKEN_EXPIRED", "expired", audit);
    }

    return { sub, subHash: hashPortalSubject(sub), jti };
  }
}
