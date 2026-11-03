import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { configureApp } from "./bootstrap.js";
import { AppLogger } from "./common/logger.js";
import { flushSentry, initSentry } from "./common/sentry.js";
import { APP_CONFIG, APP_VERSION, loadRootEnv, readConfig, type AppConfig } from "./config.js";

loadRootEnv();
// Настройки читаются до создания приложения: ошибка в .env видна сразу, а логгер знает формат с первой строки
const bootConfig = readConfig();
const logger = new AppLogger(bootConfig.log);
const sentry = initSentry(bootConfig);

const { AppModule } = await import("./app.module.js");
const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false, logger, bufferLogs: true });
configureApp(app);
const config = app.get<AppConfig>(APP_CONFIG);

process.on("unhandledRejection", (reason) => logger.error({ msg: "Необработанный отказ промиса", error: reason }, "Process"));
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    logger.log({ msg: "Остановка по сигналу", signal }, "Process");
    void flushSentry();
  });
}

await app.listen(config.port, config.host);
logger.log(
  { msg: "API запущен", url: `http://${config.host}:${config.port}/api`, version: APP_VERSION, env: config.nodeEnv, mail: config.mail.driver, sentry, httpsOnlySession: config.secureCookies },
  "Endemion Life"
);
