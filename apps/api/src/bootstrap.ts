import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { json } from "body-parser";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { requestLogging } from "./common/request-logging.js";
import { APP_CONFIG, type AppConfig } from "./config.js";

/** Маршрут переноса жизни из браузера и его лимит тела запроса */
export const IMPORT_PATH = "/api/lives/import";
export const IMPORT_BODY_LIMIT = "2mb";

/** Общая настройка приложения: одна и та же для запуска и для тестов API */
export function configureApp(app: NestExpressApplication): INestApplication {
  const config = app.get<AppConfig>(APP_CONFIG);
  app.setGlobalPrefix("api");
  // Запросы приходят через прокси Next.js или Nginx: адрес клиента берётся из X-Forwarded-For только от доверенных прокси
  app.set("trust proxy", config.trustProxy);
  app.disable("x-powered-by");
  // Первым: request id нужен всем остальным обработчикам и строкам лога
  app.use(requestLogging);
  // HSTS ставит краевой прокси по HSTS_MAX_AGE: иначе API включал бы его до проверки HTTPS и дублировал заголовок
  app.use(helmet({ strictTransportSecurity: false }));
  app.use(cookieParser());
  // Stage 04: перенос жизни из браузера — состояние и история целиком (замер: до ~460 КБ у тысячелетней жизни).
  // Больший лимит только на этом маршруте; остальные запросы — намерения, им хватает 16 КБ.
  // Запрос, уже прочитанный здесь, общий парсер ниже пропускает
  app.use(IMPORT_PATH, json({ limit: IMPORT_BODY_LIMIT }));
  app.useBodyParser("json", { limit: "16kb" });
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.enableShutdownHooks();
  return app;
}
