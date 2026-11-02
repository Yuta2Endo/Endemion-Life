import type { ApiErrorCode } from "@endemion/shared";
import type { z } from "zod";

/** Ошибка, которую API отдаёт клиенту как есть: статус, код и понятное сообщение */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Проверяет данные от клиента схемой zod. Ошибка — 400 со списком полей */
export function parseOrThrow<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    throw new ApiError(400, "VALIDATION", "Некорректный запрос", details);
  }
  return result.data;
}
