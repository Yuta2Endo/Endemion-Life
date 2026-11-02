import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { configureApp } from "./bootstrap.js";
import { APP_CONFIG, loadRootEnv, type AppConfig } from "./config.js";

loadRootEnv();
const { AppModule } = await import("./app.module.js");

const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
configureApp(app);
const config = app.get<AppConfig>(APP_CONFIG);
await app.listen(config.port, config.host);
new Logger("Endemion Life").log(`API: http://${config.host}:${config.port}/api`);
