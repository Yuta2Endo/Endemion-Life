import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { ApiError } from "./api-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Защита от подделки запросов с чужих сайтов. Сессия живёт в cookie, поэтому изменяющие запросы:
 * — принимаются только как application/json (обычная HTML-форма так отправить не может);
 * — отклоняются, если Origin не из списка разрешённых
 */
@Injectable()
export class RequestGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;
    const origin = request.headers.origin;
    if (origin !== undefined && !this.config.corsOrigins.includes(origin)) {
      throw new ApiError(403, "FORBIDDEN", "Запрос с чужого сайта отклонён");
    }
    if (!request.is("application/json")) throw new ApiError(415, "VALIDATION", "Нужен Content-Type: application/json");
    return true;
  }
}
