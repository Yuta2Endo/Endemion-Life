import { Injectable, Logger } from "@nestjs/common";

/**
 * Структурированные события доступа портала. Пишем через штатный Logger Nest:
 * в рабочей среде это JSON-строки с requestId, секреты вычищаются AppLogger.
 * Сырой JWT, подпись, Authorization и приватные ключи сюда не передаются.
 */
@Injectable()
export class PortalAuditService {
  private readonly logger = new Logger("PortalAuth");

  success(fields: { subHash: string; jti: string; endpoint: string }): void {
    this.logger.log({ msg: "portal.auth.success", result: "ok", ...fields });
  }

  failed(fields: { endpoint: string; reason: string; subHash?: string; jti?: string }): void {
    this.logger.warn({ msg: "portal.auth.failed", result: "denied", ...fields });
  }

  noProfile(fields: { subHash: string; jti: string; endpoint: string }): void {
    this.logger.warn({ msg: "portal.auth.no_profile", result: "no_profile", ...fields });
  }

  dataAccess(fields: { subHash: string; jti: string; endpoint: string; result: string }): void {
    this.logger.log({ msg: "portal.data.access", ...fields });
  }

  rateLimited(fields: { subHash: string; jti: string; endpoint: string; limit: number }): void {
    this.logger.warn({ msg: "portal.rate_limited", result: "rate_limited", ...fields });
  }

  /**
   * Stage 11.2.1: ожидаемая Redis-защита недоступна и запрос пропущен.
   * Событие пишется один раз за период недоступности, без JWT, Authorization и сырого sub.
   */
  rateLimitUnavailable(fields: { endpoint: string; reason: "redis_not_ready" | "redis_error" }): void {
    this.logger.warn({ msg: "portal.rate_limit.unavailable", result: "unavailable", ...fields });
  }
}
