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
  SENTRY_DSN: z.string().optional()
});

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
    publicUrl: (e.PUBLIC_URL ?? corsOrigins[0] ?? "http://localhost:3000").replace(/\/+$/, ""),
    mail: { driver, from: e.MAIL_FROM, smtpUrl, outboxDir: e.MAIL_OUTBOX_DIR },
    log: { level: e.LOG_LEVEL, format: e.LOG_FORMAT ?? (production ? "json" : "pretty") },
    sentryDsn: blankToNull(e.SENTRY_DSN)
  };
}
