import { AsyncLocalStorage } from "node:async_hooks";
import type { LoggerService } from "@nestjs/common";
import type { LogLevel } from "../config.js";

/** Идентификатор текущего запроса: попадает в каждую строку лога, пока запрос обрабатывается */
export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

const ORDER: Readonly<Record<LogLevel, number>> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Поля с такими именами никогда не попадают в лог: пароли, токены, cookie, коды, ключи */
const SECRET_KEY = /pass(word)?|token|secret|cookie|authorization|session_?id|^code$|dsn|smtp|api_?key/i;

/** Убирает пароли из адресов подключения и значения cookie сессии из строк */
export function scrubText(text: string): string {
  return text
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^:/\s@]+):[^@\s]+@/gi, "$1:***@")
    .replace(/(el_session=)[^;\s]+/g, "$1***");
}

/** Копия значения без секретов. Глубина ограничена: в лог не уйдут огромные объекты */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[…]";
  if (typeof value === "string") return scrubText(value);
  if (value instanceof Error) return { name: value.name, message: scrubText(value.message), stack: value.stack ? scrubText(value.stack) : undefined };
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? "[redacted]" : redact(item, depth + 1)]));
  }
  return value;
}

type Sink = (line: string) => void;

/**
 * Логгер приложения. json — одна строка JSON на событие (для сборщиков логов), pretty — читаемый текст.
 * Принимает и обычные сообщения Nest (строка + контекст), и объекты { msg, ...поля }
 */
export class AppLogger implements LoggerService {
  constructor(
    private readonly options: { level: LogLevel; format: "json" | "pretty" },
    private readonly sink: Sink = (line) => process.stdout.write(`${line}\n`)
  ) {}

  private emit(level: LogLevel, message: unknown, params: unknown[]): void {
    if (ORDER[level] < ORDER[this.options.level]) return;
    // Nest передаёт контекст последним строковым параметром, а для error — ещё и стек перед ним
    const rest = [...params];
    const context = typeof rest.at(-1) === "string" ? (rest.pop() as string) : undefined;
    const stack = level === "error" && typeof rest[0] === "string" ? (rest.shift() as string) : undefined;

    let msg: string;
    let fields: Record<string, unknown> = {};
    if (message instanceof Error) {
      msg = message.message;
      fields.error = message;
    } else if (message !== null && typeof message === "object") {
      const { msg: text, ...other } = message as Record<string, unknown>;
      msg = typeof text === "string" ? text : "event";
      fields = other;
    } else {
      msg = String(message);
    }
    if (stack) fields.stack = stack;
    if (rest.length > 0) fields.details = rest;

    const requestId = requestContext.getStore()?.requestId;
    const record = {
      time: new Date().toISOString(),
      level,
      ...(context ? { context } : {}),
      msg: scrubText(msg),
      ...(requestId && fields.requestId === undefined ? { requestId } : {}),
      ...(redact(fields) as Record<string, unknown>)
    };

    if (this.options.format === "json") {
      this.sink(JSON.stringify(record));
      return;
    }
    const { time, level: lvl, context: ctx, msg: text, ...extra } = record;
    const tail = Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : "";
    this.sink(`${time} ${lvl.toUpperCase().padEnd(5)} ${ctx ? `[${ctx}] ` : ""}${text}${tail}`);
  }

  log(message: unknown, ...params: unknown[]): void {
    this.emit("info", message, params);
  }
  error(message: unknown, ...params: unknown[]): void {
    this.emit("error", message, params);
  }
  warn(message: unknown, ...params: unknown[]): void {
    this.emit("warn", message, params);
  }
  debug(message: unknown, ...params: unknown[]): void {
    this.emit("debug", message, params);
  }
  verbose(message: unknown, ...params: unknown[]): void {
    this.emit("debug", message, params);
  }
  fatal(message: unknown, ...params: unknown[]): void {
    this.emit("error", message, params);
  }
}
