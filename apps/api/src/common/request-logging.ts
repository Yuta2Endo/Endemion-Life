import { randomUUID } from "node:crypto";
import { Logger } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { requestContext } from "./logger.js";

/** X-Request-Id от прокси принимается, только если похож на идентификатор: в лог не попадёт произвольный текст */
const INCOMING_ID = /^[A-Za-z0-9._-]{8,64}$/;

const logger = new Logger("HTTP");

/**
 * Request ID и журнал запросов: метод, путь без строки запроса, статус, время выполнения.
 * Тела запросов, cookie и заголовки авторизации не пишутся.
 * /api/health пишется только при ошибке, чтобы проверки доступности не засоряли журнал
 */
export function requestLogging(request: Request, response: Response, next: NextFunction): void {
  const incoming = request.get("x-request-id");
  const requestId = incoming && INCOMING_ID.test(incoming) ? incoming : randomUUID();
  response.setHeader("X-Request-Id", requestId);
  const started = process.hrtime.bigint();

  response.on("finish", () => {
    const status = response.statusCode;
    const path = request.originalUrl.split("?")[0] ?? request.originalUrl;
    if (path === "/api/health" && status < 500) return;
    const durationMs = Math.round(Number(process.hrtime.bigint() - started) / 1e5) / 10;
    const record = { msg: "request", requestId, method: request.method, path, status, durationMs, ip: request.ip };
    if (status >= 500) logger.error(record);
    else if (status >= 400) logger.warn(record);
    else logger.log(record);
  });

  requestContext.run({ requestId }, next);
}
