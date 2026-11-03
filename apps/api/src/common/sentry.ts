import * as Sentry from "@sentry/node";
import { APP_VERSION, type AppConfig } from "../config.js";
import { redact } from "./logger.js";

let enabled = false;

/**
 * Отправка ошибок в Sentry (или совместимый сервис: GlitchTip, self-hosted Sentry), если задан SENTRY_DSN.
 * Персональные данные не отправляются: без cookie, заголовков, тел запросов и IP
 */
export function initSentry(config: AppConfig): boolean {
  if (!config.sentryDsn) return false;
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    release: `endemion-life-api@${APP_VERSION}`,
    // Sentry 11: сбор данных настраивается по категориям. Всё, что может содержать персональные данные, выключено
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.data;
        delete event.request.query_string;
      }
      if (event.user) delete event.user.ip_address;
      if (event.extra) event.extra = redact(event.extra) as Record<string, unknown>;
      return event;
    }
  });
  enabled = true;
  return true;
}

export function captureError(error: unknown, requestId?: string): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (requestId) scope.setTag("request_id", requestId);
    Sentry.captureException(error);
  });
}

export async function flushSentry(): Promise<void> {
  if (enabled) await Sentry.flush(2000);
}
