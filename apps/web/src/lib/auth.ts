// Запросы к API аккаунтов. Cookie сессии ставит и читает сервер; браузерный код её не видит (HttpOnly)
import type { AccountView, AuthConfigView, LoginResponse, MeResponse, OkResponse, RegisterResponse, SessionView } from "@endemion/shared";
import { apiFetch, postJson } from "./api";

/** Адрес входа через Endemion ID. Это переход браузера, а не fetch: дальше страницы auth.endemion.online */
export function endemionIdLoginUrl(returnTo: string, register = false): string {
  const params = new URLSearchParams({ returnTo });
  if (register) params.set("screen", "register");
  return `/api/auth/oidc/login?${params}`;
}

export const authApi = {
  config: () => apiFetch<AuthConfigView>("/api/auth/config"),
  me: () => apiFetch<MeResponse>("/api/auth/me"),
  register: (email: string, password: string) => postJson<RegisterResponse>("/api/auth/register", { email, password }),
  login: (email: string, password: string) => postJson<LoginResponse>("/api/auth/login", { email, password }),
  /** redirect — страница выхода Endemion ID, если вход был через него */
  logout: () => postJson<OkResponse & { redirect?: string | null }>("/api/auth/logout", {}),
  verifyEmail: (code: string) => postJson<{ account: AccountView }>("/api/auth/verify-email", { code }),
  resendVerification: () => postJson<{ verificationSent: boolean }>("/api/auth/resend-verification", {}),
  forgotPassword: (email: string) => postJson<OkResponse>("/api/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => postJson<OkResponse>("/api/auth/reset-password", { token, password }),
  sessions: async () => (await apiFetch<{ sessions: SessionView[] }>("/api/auth/sessions")).sessions,
  revokeSession: (sessionId: string) => postJson<OkResponse>("/api/auth/sessions/revoke", { sessionId }),
  revokeOthers: () => postJson<{ revoked: number }>("/api/auth/sessions/revoke-others", {})
};
