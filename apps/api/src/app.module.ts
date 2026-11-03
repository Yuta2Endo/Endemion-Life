import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { AuthThrottle } from "./auth/auth-throttle.js";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { EndemionIdController } from "./auth/endemion-id.controller.js";
import { EndemionIdService } from "./auth/endemion-id.service.js";
import { CatalogController } from "./catalog/catalog.controller.js";
import { ApiExceptionFilter } from "./common/exception.filter.js";
import { RequestGuard } from "./common/request.guard.js";
import { APP_CONFIG, readConfig, type AppConfig } from "./config.js";
import { HealthController } from "./health/health.controller.js";
import { LivesController } from "./lives/lives.controller.js";
import { LivesService } from "./lives/lives.service.js";
import { MailService } from "./mail/mail.service.js";
import { PrismaService } from "./prisma/prisma.service.js";
import { RateLimitGuard } from "./redis/rate-limit.guard.js";
import { RedisService } from "./redis/redis.service.js";
import { SessionController } from "./session/session.controller.js";
import { SessionService } from "./session/session.service.js";

@Module({
  controllers: [HealthController, CatalogController, SessionController, AuthController, EndemionIdController, LivesController],
  providers: [
    { provide: APP_CONFIG, useFactory: (): AppConfig => readConfig() },
    PrismaService,
    RedisService,
    MailService,
    EndemionIdService,
    SessionService,
    AuthThrottle,
    AuthService,
    LivesService,
    // Порядок важен: сначала лимит запросов, потом проверка источника запроса
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: RequestGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter }
  ]
})
export class AppModule {}
