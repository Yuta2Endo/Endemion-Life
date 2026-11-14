import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
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
import { GuildController } from "./guild/guild.controller.js";
import { GuildService } from "./guild/guild.service.js";
import { LivesController } from "./lives/lives.controller.js";
import { LivesService } from "./lives/lives.service.js";
import { MarketController } from "./market/market.controller.js";
import { MarketService } from "./market/market.service.js";
import { InsightsController } from "./insights/insights.controller.js";
import { InsightsService } from "./insights/insights.service.js";
import { LiveController } from "./live/live.controller.js";
import { LiveService } from "./live/live.service.js";
import { PresenceController } from "./presence/presence.controller.js";
import { PresenceService } from "./presence/presence.service.js";
import { MailService } from "./mail/mail.service.js";
import { PortalAuditService } from "./portal/portal-audit.service.js";
import { PortalAuthGuard } from "./portal/portal-auth.guard.js";
import { portalNoStore } from "./portal/portal-cache.middleware.js";
import { PortalController } from "./portal/portal.controller.js";
import { PortalJwksService } from "./portal/portal-jwks.service.js";
import { PortalService } from "./portal/portal.service.js";
import { PortalTokenService } from "./portal/portal-token.service.js";
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
  controllers: [HealthController, CatalogController, SessionController, AuthController, EndemionIdController, LivesController, MarketController, SocialController, GuildController, LiveController, InsightsController, PortalController, PresenceController, WorldController],
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
    MarketService,
    SocialService,
    GuildService,
    LiveService,
    InsightsService,
    PresenceService,
    WorldService,
    // Stage 11.2: проверка portal-утверждений (только для /api/portal/*)
    PortalAuditService,
    PortalJwksService,
    PortalTokenService,
    PortalAuthGuard,
    PortalService,
    // Порядок важен: сначала лимит запросов, потом проверка источника запроса
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: RequestGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Stage 11.2.1: заголовок кэша ставится до гвардов, чтобы покрыть и 429 общего лимита по IP
    consumer.apply(portalNoStore).forRoutes("portal");
  }
}
