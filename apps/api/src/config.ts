import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const APP_CONFIG = "APP_CONFIG";
export const APP_VERSION = "0.1.0";

export interface AppConfig {
  nodeEnv: "development" | "production" | "test";
  databaseUrl: string;
  redisUrl: string;
  host: string;
  port: number;
  corsOrigins: string[];
  rateLimitPerMinute: number;
  /** Cookie только по HTTPS. По умолчанию — в рабочей среде; COOKIE_SECURE=false — пока сайт открыт по HTTP */
  secureCookies: boolean;
  /** Каким прокси верить в X-Forwarded-For (настройка Express "trust proxy") */
  trustProxy: string;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "Задайте DATABASE_URL в .env"),
  REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),
  API_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(0).default(120),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  // loopback — прокси на этом же компьютере; в Docker Nginx живёт в соседнем контейнере: loopback, uniquelocal
  TRUST_PROXY: z.string().min(1).default("loopback")
});

/** .env в корне монорепозитория. Переменные окружения процесса важнее файла */
export function loadRootEnv(): void {
  const file = fileURLToPath(new URL("../../../.env", import.meta.url));
  if (!existsSync(file)) return;
  const before = { ...process.env };
  process.loadEnvFile(file);
  Object.assign(process.env, before);
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Некорректные настройки API: ${problems}`);
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    databaseUrl: e.DATABASE_URL,
    redisUrl: e.REDIS_URL,
    host: e.API_HOST,
    port: e.API_PORT,
    corsOrigins: e.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
    rateLimitPerMinute: e.RATE_LIMIT_PER_MINUTE,
    secureCookies: e.COOKIE_SECURE === undefined ? e.NODE_ENV === "production" : e.COOKIE_SECURE === "true",
    trustProxy: e.TRUST_PROXY
  };
}
