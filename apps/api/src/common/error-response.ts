import { Prisma } from "@endemion/database";
import { GameRuleError, type GameErrorCode } from "@endemion/game-core";
import type { ApiErrorBody, ApiErrorCode } from "@endemion/shared";
import { HttpException } from "@nestjs/common";
import { ApiError } from "./api-error.js";

const GAME_STATUS: Readonly<Record<GameErrorCode, number>> = {
  INVALID_INPUT: 400,
  UNKNOWN_CHOICE: 400,
  CHOICE_LOCKED: 409,
  LIFE_ENDED: 409,
  EVENT_PENDING: 409,
  NO_PENDING_EVENT: 409,
  INVALID_SAVE: 500,
  LIFE_NOT_ENDED: 409,
  HEIR_LOCKED: 409,
  LINEAGE_CONTINUED: 409,
  ADVENTURE_LOCKED: 409
};

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  return status >= 500 ? "INTERNAL" : "VALIDATION";
}

/** Ошибки разбора тела запроса (body-parser): у них есть числовой status и строковый type */
function isBodyParserError(value: unknown): value is { status: number; type: string } {
  return typeof value === "object" && value !== null && typeof (value as { status?: unknown }).status === "number" && typeof (value as { type?: unknown }).type === "string";
}

/** Коды Prisma «нет связи с базой»: P1001 не достучаться, P1002 тайм-аут, P1017 сервер закрыл соединение, P2024 нет свободного соединения в пуле */
const DATABASE_UNAVAILABLE = new Set(["P1001", "P1002", "P1017", "P2024"]);

/** База данных временно недоступна (перезапуск, сеть) — это не ошибка в коде, клиенту стоит повторить позже */
export function isDatabaseUnavailable(value: unknown): boolean {
  return (
    value instanceof Prisma.PrismaClientInitializationError ||
    (value instanceof Prisma.PrismaClientKnownRequestError && DATABASE_UNAVAILABLE.has(value.code))
  );
}

export interface ErrorResponse {
  status: number;
  body: ApiErrorBody;
}

/** Любая ошибка — в ответ одного формата { error: { code, message } }. Подробности сбоев сервера наружу не уходят */
export function toErrorResponse(exception: unknown): ErrorResponse {
  const reply = (status: number, code: ApiErrorCode, message: string, details?: unknown): ErrorResponse => ({
    status,
    body: { error: details === undefined ? { code, message } : { code, message, details } }
  });

  if (exception instanceof ApiError) return reply(exception.status, exception.code, exception.message, exception.details);
  if (exception instanceof GameRuleError) {
    const status = GAME_STATUS[exception.code];
    return status >= 500 ? reply(500, "INTERNAL", "Ошибка сервера") : reply(status, exception.code, exception.message);
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const message = status === 404 ? "Не найдено" : status >= 500 ? "Ошибка сервера" : exception.message;
    return reply(status, codeForStatus(status), message);
  }
  if (isDatabaseUnavailable(exception)) return reply(503, "UNAVAILABLE", "Сервис временно недоступен, попробуйте через минуту");
  if (isBodyParserError(exception)) {
    if (exception.status === 413) return reply(413, "VALIDATION", "Слишком большой запрос");
    if (exception.status < 500) return reply(400, "VALIDATION", "Тело запроса должно быть корректным JSON");
  }
  return reply(500, "INTERNAL", "Ошибка сервера");
}
