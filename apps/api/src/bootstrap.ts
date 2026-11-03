import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { requestLogging } from "./common/request-logging.js";
import { APP_CONFIG, type AppConfig } from "./config.js";

/** Общая настройка приложения: одна и та же для запуска и для тестов API */
export function configureApp(app: NestExpressApplication): INestApplication {
  const config = app.get<AppConfig>(APP_CONFIG);
  app.setGlobalPrefix("api");
  // Запросы приходят через прокси Next.js или Nginx: адрес клиента берётся из X-Forwarded-For только от доверенных прокси
  app.set("trust proxy", config.trustProxy);
  app.disable("x-powered-by");
  // Первым: request id нужен всем остальным обработчикам и строкам лога
  app.use(requestLogging);
  app.use(helmet());
  app.use(cookieParser());
  app.useBodyParser("json", { limit: "16kb" });
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.enableShutdownHooks();
  return app;
}
