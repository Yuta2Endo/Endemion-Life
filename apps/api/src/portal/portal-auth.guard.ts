import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Response } from "express";
import { ApiError } from "../common/api-error.js";
import { APP_CONFIG, type AppConfig, type PortalConfig } from "../config.js";
import { RedisService } from "../redis/redis.service.js";
import { PortalAuditService } from "./portal-audit.service.js";
import { PortalTokenService, PortalTokenError } from "./portal-token.service.js";
import { PORTAL_CACHE_CONTROL, type PortalIdentity, type PortalRequest } from "./portal.constants.js";

const BEARER = /^Bearer\s+(\S+)$/i;
const RATE_WINDOW_SECONDS = 60;

/**
 * Гвард portal-маршрутов. Не заменяет существующие сессионные гварды Life:
 * применяется только к контроллеру /api/portal/*, остальные маршруты не меняются.
 *
 * При выключенной интеграции (PORTAL_INTEGRATION_ENABLED=false) маршрут отвечает 404.
 * Rate limit по IP остаётся общим RateLimitGuard; здесь — лимит на sub из проверенного JWT.
 */
@Injectable()
export class PortalAuthGuard implements CanActivate {
  /** Причина текущего периода недоступности Redis: чтобы писать предупреждение один раз, а не на каждый запрос. */
  private rateLimitOutage: "redis_not_ready" | "redis_error" | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PortalTokenService) private readonly tokens: PortalTokenService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(PortalAuditService) private readonly audit: PortalAuditService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const settings = this.config.portal;
    // Ответы этого маршрута персонализированы: заголовок нужен и для ошибок гварда ниже
    context.switchToHttp().getResponse<Response>().setHeader("Cache-Control", PORTAL_CACHE_CONTROL);
    if (!settings) throw new ApiError(404, "NOT_FOUND", "Не найдено");

    const request = context.switchToHttp().getRequest<PortalRequest>();
    const endpoint = request.path;
    const match = BEARER.exec(String(request.headers.authorization ?? ""));
    if (!match?.[1]) {
      this.audit.failed({ endpoint, reason: "missing_authorization" });
      throw new ApiError(401, "UNAUTHORIZED", "Требуется авторизация");
    }

    let identity: PortalIdentity;
    try {
      identity = await this.tokens.verify(match[1]);
    } catch (error) {
      if (error instanceof PortalTokenError) {
        this.audit.failed({ endpoint, reason: error.reason, ...error.audit });
        throw new ApiError(401, error.code, error.message);
      }
      this.audit.failed({ endpoint, reason: "verification_error" });
      throw new ApiError(401, "INVALID_TOKEN", "Недействительный токен");
    }

    await this.enforceSubjectLimit(settings, identity, endpoint);
    request.portal = identity;
    this.audit.success({ subHash: identity.subHash, jti: identity.jti, endpoint });
    return true;
  }

  /**
   * Лимит на sub. Если Redis недоступен, запрос пропускается (fail-open, как и общий
   * RateLimitGuard), но недоступность ожидаемой защиты фиксируется структурированным
   * событием один раз за период сбоя. Лимит 0 означает явно выключенную защиту: события нет.
   */
  private async enforceSubjectLimit(settings: PortalConfig, identity: PortalIdentity, endpoint: string): Promise<void> {
    const limit = settings.subjectRateLimitPerMinute;
    if (limit === 0) return;
    if (!this.redis.ready) {
      this.reportRateLimitUnavailable(endpoint, "redis_not_ready");
      return;
    }
    const window = Math.floor(Date.now() / (RATE_WINDOW_SECONDS * 1000));
    const key = `portal:rl:sub:${identity.subHash}:${window}`;
    let count: number;
    try {
      const result = await this.redis.client.multi().incr(key).expire(key, RATE_WINDOW_SECONDS + 1).exec();
      count = Number(result?.[0]?.[1] ?? 0);
      // Успешная операция закрывает период недоступности: следующий сбой снова попадёт в журнал
      this.rateLimitOutage = null;
    } catch {
      // Redis — вспомогательная защита: ошибка не должна превращаться в 500
      this.reportRateLimitUnavailable(endpoint, "redis_error");
      return;
    }
    if (count > limit) {
      this.audit.rateLimited({ subHash: identity.subHash, jti: identity.jti, endpoint, limit });
      throw new ApiError(429, "RATE_LIMITED", "Слишком много запросов. Подождите минуту");
    }
  }

  /** Одно предупреждение на период сбоя; без JWT, Authorization и сырого sub. */
  private reportRateLimitUnavailable(endpoint: string, reason: "redis_not_ready" | "redis_error"): void {
    if (this.rateLimitOutage === reason) return;
    this.rateLimitOutage = reason;
    this.audit.rateLimitUnavailable({ endpoint, reason });
  }
}
