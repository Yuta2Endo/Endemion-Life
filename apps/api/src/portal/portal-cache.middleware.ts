import type { NextFunction, Request, Response } from "express";
import { PORTAL_CACHE_CONTROL } from "./portal.constants.js";

/**
 * Stage 11.2.1: запрет кэширования персонализированных ответов /api/portal/*.
 *
 * Middleware применяется к маршруту до гвардов, поэтому заголовок получают и
 * успешные ответы, и ошибки, которые бросает гвард (401/404/429). Значение
 * `private` запрещает общим кэшам (CDN, прокси) хранить ответ, `no-store` —
 * запрещает запись целиком. Гвард и контроллер выставляют тот же заголовок
 * повторно как защита от изменения порядка middleware.
 */
export function portalNoStore(_request: Request, response: Response, next: NextFunction): void {
  response.setHeader("Cache-Control", PORTAL_CACHE_CONTROL);
  next();
}
