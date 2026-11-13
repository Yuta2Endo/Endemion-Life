import { createHash } from "node:crypto";
import type { Request } from "express";

/** Контракт Stage 11.2: единственный разрешённый scope для чтения через портал. */
export const PORTAL_SCOPE = "portal:read";
/** Утверждение живёт не больше 120 секунд. */
export const PORTAL_MAX_LIFETIME_SECONDS = 120;
/** Допустимое расхождение часов — не больше 30 секунд (задокументировано). */
export const PORTAL_CLOCK_SKEW_SECONDS = 30;
/** Верхняя граница размера JWT: защита от разбора гигантских заголовков. */
export const PORTAL_MAX_TOKEN_LENGTH = 4096;
/**
 * Stage 11.2.1: ответы /api/portal/* персонализированы и не должны попадать в общие кэши.
 * Заголовок ставится middleware до гвардов, поэтому покрывает и 401/404/429.
 */
export const PORTAL_CACHE_CONTROL = "private, no-store";

export const PORTAL_KID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
export const PORTAL_JTI_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
/** Endemion ID выдаёт sub через randomUUID(); принимаем канонический UUID. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPortalSubject(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** В журнал и Redis попадает только sha256(sub), не сам идентификатор. */
export function hashPortalSubject(sub: string): string {
  return createHash("sha256").update(sub).digest("hex");
}

/** Проверенная идентичность, привязанная гвардом к запросу. */
export interface PortalIdentity {
  sub: string;
  subHash: string;
  jti: string;
}

/** Express-запрос с идентичностью после PortalAuthGuard. */
export interface PortalRequest extends Request {
  portal?: PortalIdentity;
}
