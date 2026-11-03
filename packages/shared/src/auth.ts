// Контракты аккаунтов: регистрация, вход, подтверждение почты, восстановление доступа, сессии
import { z } from "zod";
import type { PlayerView } from "./views.js";

export const PASSWORD_MIN_LENGTH = 10;
/** Верхняя граница защищает сервер: хеширование очень длинной строки дорого */
export const PASSWORD_MAX_LENGTH = 128;
export const EMAIL_MAX_LENGTH = 254;
export const VERIFY_CODE_LENGTH = 6;

/** Адрес почты без пробелов и в нижнем регистре: один адрес — один аккаунт */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .trim()
  .max(EMAIL_MAX_LENGTH)
  .pipe(z.email("Некорректный адрес почты"))
  .transform(normalizeEmail);

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Пароль — не короче ${PASSWORD_MIN_LENGTH} символов`)
  .max(PASSWORD_MAX_LENGTH, `Пароль — не длиннее ${PASSWORD_MAX_LENGTH} символов`);

export const registerSchema = z
  .strictObject({ email: emailSchema, password: passwordSchema })
  .refine((value) => value.password.toLowerCase() !== value.email, { path: ["password"], message: "Пароль не должен совпадать с адресом почты" });
export type RegisterRequest = z.infer<typeof registerSchema>;

/** При входе длина пароля не проверяется на минимум: правила могли измениться после регистрации */
export const loginSchema = z.strictObject({ email: emailSchema, password: z.string().min(1).max(PASSWORD_MAX_LENGTH) });
export type LoginRequest = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.strictObject({
  code: z.string().trim().regex(new RegExp(`^\\d{${VERIFY_CODE_LENGTH}}$`), "Код — 6 цифр")
});
export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;

export const forgotPasswordSchema = z.strictObject({ email: emailSchema });
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

/** Токен из ссылки восстановления: 32 случайных байта в base64url */
export const RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const resetPasswordSchema = z.strictObject({
  token: z.string().regex(RESET_TOKEN_PATTERN, "Ссылка восстановления повреждена"),
  password: passwordSchema
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;

export const revokeSessionSchema = z.strictObject({ sessionId: z.uuid() });
export type RevokeSessionRequest = z.infer<typeof revokeSessionSchema>;

/** Тело для запросов без параметров: {} */
export const emptyBodySchema = z.strictObject({});

export interface AccountView {
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

/** Профиль Endemion ID игрока: общий с endemion.online, меняется на auth.endemion.online */
export interface EndemionIdView {
  /** Постоянный идентификатор Endemion ID (sub). Прогресс привязан к нему, а не к имени или почте */
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

/** Как входить: через Endemion ID или старой формой с почтой и паролем */
export interface AuthConfigView {
  endemionId: { enabled: true; accountUrl: string } | { enabled: false };
}

/** Кто сейчас за браузером: гость, игрок с аккаунтом или никто */
export interface MeResponse {
  player: PlayerView | null;
  account: AccountView | null;
  /** Есть, если игрок вошёл через Endemion ID */
  endemionId?: EndemionIdView | null;
}

export interface AuthResponse extends MeResponse {
  player: PlayerView;
  account: AccountView;
}

export interface RegisterResponse extends AuthResponse {
  /** Удалось ли отправить письмо с кодом. false — почта не настроена или сервер почты недоступен */
  verificationSent: boolean;
}

export interface LoginResponse extends AuthResponse {
  /** Сколько гостевых жизней этого браузера перешло в аккаунт */
  transferredLives: number;
}

export interface SessionView {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  userAgent: string | null;
  /** Сессия этого браузера */
  current: boolean;
}

export interface OkResponse {
  ok: true;
}
