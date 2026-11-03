import { SESSION_COOKIE } from "@endemion/shared";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/bootstrap.js";
import { APP_CONFIG, loadRootEnv, readConfig } from "../src/config.js";
import { MailService } from "../src/mail/mail.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

loadRootEnv();

export const ORIGIN = "http://localhost:3000";

export interface TestApp {
  app: NestExpressApplication;
  prisma: PrismaService;
  mail: MailService;
}

/** Приложение на тестовой базе. Письма копятся в памяти, лимиты отключены (если не заданы явно) */
export async function createTestApp(env: Record<string, string> = {}): Promise<TestApp> {
  const config = readConfig({
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL_TEST,
    RATE_LIMIT_PER_MINUTE: "0",
    AUTH_RATE_LIMIT_PER_MINUTE: "0",
    MAIL_DRIVER: "memory",
    LOG_LEVEL: "error",
    ...env
  });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue(config).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: ["error"] });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), mail: app.get(MailService) };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.client.$executeRawUnsafe(
    "TRUNCATE players, sessions, accounts, auth_tokens, lives, life_snapshots, history_entries, game_actions, oidc_logins CASCADE"
  );
}

/** Значение cookie сессии из ответа, если сервер её выставил */
export function sessionCookieOf(res: request.Response): string | null {
  const header = res.headers["set-cookie"] as unknown as string[] | undefined;
  const line = header?.find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  if (!line) return null;
  const value = line.slice(SESSION_COOKIE.length + 1).split(";")[0] ?? "";
  return value === "" ? null : value;
}

/** Полная строка Set-Cookie сессии: для проверки флагов HttpOnly, SameSite, Secure */
export function sessionCookieLine(res: request.Response): string | null {
  const header = res.headers["set-cookie"] as unknown as string[] | undefined;
  return header?.find((item) => item.startsWith(`${SESSION_COOKIE}=`)) ?? null;
}

/** Последний код подтверждения, отправленный на адрес */
export function lastCode(mail: MailService, email: string): string {
  const message = mail.outbox.filter((m) => m.to === email).at(-1);
  const code = message?.text.match(/\b(\d{6})\b/)?.[1];
  if (!code) throw new Error(`Письма с кодом для ${email} нет`);
  return code;
}

/** Токен из последней ссылки восстановления, отправленной на адрес */
export function lastResetToken(mail: MailService, email: string): string {
  const message = mail.outbox.filter((m) => m.to === email && m.subject.includes("Восстановление")).at(-1);
  const token = message?.text.match(/token=([A-Za-z0-9_-]{43})/)?.[1];
  if (!token) throw new Error(`Письма со ссылкой для ${email} нет`);
  return token;
}
