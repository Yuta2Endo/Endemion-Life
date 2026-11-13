import type { ApiErrorBody } from "@endemion/shared";

/** Ошибка запроса к API. code NETWORK — сервер недоступен */
export class ClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "ClientError";
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      // Зависший запрос не должен оставлять экран в вечном loading
      signal: init.signal ?? AbortSignal.timeout(15_000),
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers }
    });
  } catch {
    throw new ClientError(0, "NETWORK", "Нет связи с сервером");
  }
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ClientError(response.status, error?.code ?? "INTERNAL", error?.message ?? response.statusText, error?.details);
  }
  return body as T;
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}
