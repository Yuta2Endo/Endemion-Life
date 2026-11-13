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
import { InsightsController } from "./insights/insights.controller.js";
import { InsightsService } from "./insights/insights.service.js";
import { LiveController } from "./live/live.controller.js";
import { LiveService } from "./live/live.service.js";
import { PresenceController } from "./presence/presence.controller.js";
import { PresenceService } from "./presence/presence.service.js";
import { MailService } from "./mail/mail.service.js";
import { PrismaService } from "./prisma/prisma.service.js";
import { RateLimitGuard } from "./redis/rate-limit.guard.js";
import { RedisService } from "./redis/redis.service.js";
import { SessionController } from "./session/session.controller.js";
import { SessionService } from "./session/session.service.js";
import { SocialController } from "./social/social.controller.js";
import { SocialService } from "./social/social.service.js";
import { WorldController } from "./world/world.controller.js";
import { WorldService } from "./world/world.service.js";

@Module({
  controllers: [HealthController, CatalogController, SessionController, AuthController, EndemionIdController, LivesController, SocialController, LiveController, InsightsController, PresenceController, WorldController],
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
    SocialService,
    LiveService,
    InsightsService,
    PresenceService,
    WorldService,
    // Порядок важен: сначала лимит запросов, потом проверка источника запроса
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: RequestGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter }
  ]
})
export class AppModule {}
