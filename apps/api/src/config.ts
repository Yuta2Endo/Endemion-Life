import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const APP_CONFIG = "APP_CONFIG";
export const APP_VERSION = "0.1.0";

export type MailDriver = "smtp" | "file" | "memory" | "none";
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface AppConfig {
  nodeEnv: "development" | "production" | "test";
  databaseUrl: string;
  redisUrl: string;
  host: string;
  port: number;
  corsOrigins: string[];
  rateLimitPerMinute: number;
  /** Лимит на вход, регистрацию, коды и восстановление: запросов в минуту с одного адреса. 0 — без лимита */
  authRateLimitPerMinute: number;
  /** Cookie только по HTTPS. По умолчанию — в рабочей среде; COOKIE_SECURE=false — пока сайт открыт по HTTP */
  secureCookies: boolean;
  /** Каким прокси верить в X-Forwarded-For (настройка Express "trust proxy") */
  trustProxy: string;
  /** Адрес сайта для ссылок в письмах, например https://life.endemion.online */
  publicUrl: string;
  mail: {
    driver: MailDriver;
    from: string;
    smtpUrl: string | null;
    outboxDir: string;
  };
  log: {
    level: LogLevel;
    /** json — одна строка JSON на событие (рабочая среда); pretty — читаемый текст (разработка) */
    format: "json" | "pretty";
  };
  sentryDsn: string | null;
  /** Вход через Endemion ID (auth.endemion.online). null — выключен, работает старый вход по почте */
  endemionId: EndemionIdConfig | null;
  /**
   * Stage 15: токен управления окнами. Пустой — маршрутов управления нет.
   * В рабочей среде не задаётся, пока окна не ведут вручную
   */
  liveOpsToken: string | null;
  /**
   * Stage 11.2: проверка утверждений портала Endemion (ES256 + JWKS).
   * null — интеграция выключена, /api/portal/* отвечает 404
   */
  portal: PortalConfig | null;
}

/** Настройки проверки portal-утверждений. Все значения проверяются при старте. */
export interface PortalConfig {
  /** Точный iss. По контракту — https://endemion.online */
  issuer: string;
  /** Точный aud. По контракту — https://life.endemion.online */
  audience: string;
  /** Фиксированный адрес JWKS портала; из заголовка JWT никогда не берётся */
  jwksUrl: string;
  /** Сколько держать ключи в кэше до планового обновления */
  jwksCacheTtlMs: number;
  /** Тайм-аут запроса JWKS */
  jwksTimeoutMs: number;
  /** Минимальный интервал между запросами JWKS: защита от amplification по unknown kid */
  jwksMinRefreshMs: number;
  /** Аварийно заблокированные kid (компрометация ключа) */
  jwksBlockedKids: ReadonlySet<string>;
  /** Лимит запросов в минуту на один sub. 0 — без лимита */
  subjectRateLimitPerMinute: number;
}

export interface EndemionIdConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  /** 32 байта: ключ AES-GCM для refresh token в базе */
  tokenKey: Buffer;
  /** Адрес, на который Endemion ID возвращает код: <PUBLIC_URL>/api/auth/oidc/callback */
  redirectUri: string;
  /** Куда вернуть браузер после выхода в Endemion ID */
  postLogoutRedirectUri: string;
  /** Страница аккаунта Endemion ID: там меняют имя, аватар, почту и пароль */
  accountUrl: string;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "Задайте DATABASE_URL в .env"),
  REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),
  API_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(0).default(120),
  AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(0).default(10),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  // loopback — прокси на этом же компьютере; в Docker Nginx живёт в соседнем контейнере: loopback, uniquelocal
  TRUST_PROXY: z.string().min(1).default("loopback"),
  PUBLIC_URL: z.url().optional(),
  MAIL_DRIVER: z.enum(["smtp", "file", "memory", "none"]).optional(),
  MAIL_FROM: z.string().min(3).default("Endemion Life <no-reply@endemion.online>"),
  SMTP_URL: z.string().optional(),
  MAIL_OUTBOX_DIR: z.string().min(1).default(".mail-outbox"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_FORMAT: z.enum(["json", "pretty"]).optional(),
  SENTRY_DSN: z.string().optional(),
  ENDEMION_ID: z.enum(["true", "false"]).default("false"),
  ENDEMION_ID_ISSUER: z.string().optional(),
  ENDEMION_ID_CLIENT_ID: z.string().optional(),
  ENDEMION_ID_CLIENT_SECRET: z.string().optional(),
  ENDEMION_ID_TOKEN_KEY: z.string().optional(),
  LIVE_OPS_TOKEN: z.string().optional(),
  // Stage 11.2: проверка утверждений портала Endemion
  PORTAL_INTEGRATION_ENABLED: z.enum(["true", "false"]).default("false"),
  PORTAL_JWT_ISSUER: z.string().optional(),
  PORTAL_JWT_AUDIENCE: z.string().optional(),
  PORTAL_JWKS_URL: z.string().optional(),
  PORTAL_JWKS_CACHE_TTL_SECONDS: z.coerce.number().int().min(1).max(3600).default(300),
  PORTAL_JWKS_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(3000),
  PORTAL_JWKS_MIN_REFRESH_MS: z.coerce.number().int().min(0).max(60_000).default(10_000),
  PORTAL_JWKS_BLOCKED_KIDS: z.string().default(""),
  PORTAL_SUBJECT_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(0).max(100_000).default(60)
});

function readEndemionId(e: z.infer<typeof envSchema>, production: boolean, publicUrl: string): EndemionIdConfig | null {
  if (e.ENDEMION_ID !== "true") return null;
  const fail = (message: string): never => {
    throw new Error(`Некорректные настройки API: ${message}`);
  };
  const issuerText = blankToNull(e.ENDEMION_ID_ISSUER);
  const clientId = blankToNull(e.ENDEMION_ID_CLIENT_ID);
  const clientSecret = blankToNull(e.ENDEMION_ID_CLIENT_SECRET);
  const keyText = blankToNull(e.ENDEMION_ID_TOKEN_KEY);
  if (!issuerText || !clientId || !clientSecret || !keyText) {
    fail("ENDEMION_ID=true требует ENDEMION_ID_ISSUER, ENDEMION_ID_CLIENT_ID, ENDEMION_ID_CLIENT_SECRET и ENDEMION_ID_TOKEN_KEY");
  }
  const issuer = new URL(issuerText!);
  if (production && issuer.protocol !== "https:") fail("ENDEMION_ID_ISSUER в рабочей среде должен начинаться с https://");
  if (production && clientSecret!.length < 32) fail("ENDEMION_ID_CLIENT_SECRET короче 32 символов");
  const tokenKey = Buffer.from(keyText!, "base64");
  if (tokenKey.length !== 32) fail("ENDEMION_ID_TOKEN_KEY — 32 случайных байта в base64 (openssl rand -base64 32)");
  return {
    issuer: issuer.origin,
    clientId: clientId!,
    clientSecret: clientSecret!,
    tokenKey,
    redirectUri: `${publicUrl}/api/auth/oidc/callback`,
    postLogoutRedirectUri: `${publicUrl}/`,
    accountUrl: `${issuer.origin}/account`
  };
}

const PORTAL_KID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const PORTAL_ISSUER_DEFAULT = "https://endemion.online";
const PORTAL_AUDIENCE_DEFAULT = "https://life.endemion.online";
const PORTAL_JWKS_DEFAULT = "https://endemion.online/.well-known/jwks.json";

function readPortal(e: z.infer<typeof envSchema>, production: boolean): PortalConfig | null {
  if (e.PORTAL_INTEGRATION_ENABLED !== "true") return null;
  const fail = (message: string): never => {
    throw new Error(`Некорректные настройки API: ${message}`);
  };
  const parseUrl = (name: string, value: string): string => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return fail(`${name} должен быть корректным URL`);
    }
    if (production && url.protocol !== "https:") fail(`${name} в рабочей среде должен начинаться с https://`);
    return url.origin + (url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "")) + (url.search || "");
  };
  const issuer = parseUrl("PORTAL_JWT_ISSUER", blankToNull(e.PORTAL_JWT_ISSUER) ?? PORTAL_ISSUER_DEFAULT);
  const audience = parseUrl("PORTAL_JWT_AUDIENCE", blankToNull(e.PORTAL_JWT_AUDIENCE) ?? PORTAL_AUDIENCE_DEFAULT);
  const jwksUrl = parseUrl("PORTAL_JWKS_URL", blankToNull(e.PORTAL_JWKS_URL) ?? PORTAL_JWKS_DEFAULT);
  // Контракт фиксирует iss/aud: значения по умолчанию совпадают с production-адресами
  const blocked = (blankToNull(e.PORTAL_JWKS_BLOCKED_KIDS) ?? "")
    .split(",")
    .map((kid) => kid.trim())
    .filter(Boolean);
  if (blocked.length > 32) fail("PORTAL_JWKS_BLOCKED_KIDS — не больше 32 значений");
  for (const kid of blocked) {
    if (!PORTAL_KID_PATTERN.test(kid)) fail("PORTAL_JWKS_BLOCKED_KIDS содержит некорректный kid");
  }
  return {
    issuer,
    audience,
    jwksUrl,
    jwksCacheTtlMs: e.PORTAL_JWKS_CACHE_TTL_SECONDS * 1000,
    jwksTimeoutMs: e.PORTAL_JWKS_TIMEOUT_MS,
    jwksMinRefreshMs: e.PORTAL_JWKS_MIN_REFRESH_MS,
    jwksBlockedKids: new Set(blocked),
    subjectRateLimitPerMinute: e.PORTAL_SUBJECT_RATE_LIMIT_PER_MINUTE
  };
}

/** .env в корне монорепозитория. Переменные окружения процесса важнее файла */
export function loadRootEnv(): void {
  const file = fileURLToPath(new URL("../../../.env", import.meta.url));
  if (!existsSync(file)) return;
  const before = { ...process.env };
  process.loadEnvFile(file);
  Object.assign(process.env, before);
}

function blankToNull(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value.trim() : null;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Некорректные настройки API: ${problems}`);
  }
  const e = parsed.data;
  const production = e.NODE_ENV === "production";
  const corsOrigins = e.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
  const smtpUrl = blankToNull(e.SMTP_URL);
  // Без SMTP письма в разработке пишутся в файлы, в рабочей среде не отправляются (и это видно в ответе API)
  const driver: MailDriver = e.MAIL_DRIVER ?? (smtpUrl ? "smtp" : production ? "none" : "file");
  if (driver === "smtp" && !smtpUrl) throw new Error("Некорректные настройки API: MAIL_DRIVER=smtp требует SMTP_URL");
  if (driver === "file" && production) throw new Error("Некорректные настройки API: MAIL_DRIVER=file нельзя использовать в рабочей среде");
  const publicUrl = (e.PUBLIC_URL ?? corsOrigins[0] ?? "http://localhost:3000").replace(/\/+$/, "");

  return {
    nodeEnv: e.NODE_ENV,
    databaseUrl: e.DATABASE_URL,
    redisUrl: e.REDIS_URL,
    host: e.API_HOST,
    port: e.API_PORT,
    corsOrigins,
    rateLimitPerMinute: e.RATE_LIMIT_PER_MINUTE,
    authRateLimitPerMinute: e.AUTH_RATE_LIMIT_PER_MINUTE,
    secureCookies: e.COOKIE_SECURE === undefined ? production : e.COOKIE_SECURE === "true",
    trustProxy: e.TRUST_PROXY,
    publicUrl,
    mail: { driver, from: e.MAIL_FROM, smtpUrl, outboxDir: e.MAIL_OUTBOX_DIR },
    log: { level: e.LOG_LEVEL, format: e.LOG_FORMAT ?? (production ? "json" : "pretty") },
    sentryDsn: blankToNull(e.SENTRY_DSN),
    endemionId: readEndemionId(e, production, publicUrl),
    liveOpsToken: blankToNull(e.LIVE_OPS_TOKEN),
    portal: readPortal(e, production)
  };
}
