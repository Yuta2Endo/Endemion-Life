import {
  emptyBodySchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  revokeSessionSchema,
  verifyEmailSchema,
  type AccountView,
  type LoginResponse,
  type MeResponse,
  type OkResponse,
  type RegisterResponse,
  type SessionView
} from "@endemion/shared";
import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { AuthThrottle, emailKey } from "./auth-throttle.js";
import { AuthService } from "./auth.service.js";

const ipKey = (request: Request): string => `ip:${request.ip ?? "unknown"}`;
const deleteAccountSchema = z.strictObject({ confirm: z.literal("DELETE") });

/**
 * Аккаунты. Все изменяющие запросы — POST с JSON: так их защищает общая проверка Origin и Content-Type (CSRF).
 * Вход, регистрация, коды и восстановление дополнительно ограничены AuthThrottle по адресу клиента и по почте
 */
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthThrottle) private readonly throttle: AuthThrottle,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  /** При ENDEMION_ID=true пароль проверяется только в Endemion ID: старые вход, регистрация и восстановление закрыты */
  private legacyClosed(): void {
    if (this.config.endemionId) throw new ApiError(410, "USE_ENDEMION_ID", "Вход теперь через Endemion ID");
  }

  @Get("me")
  @Header("Cache-Control", "no-store")
  me(@Req() request: Request): Promise<MeResponse> {
    return this.auth.me(request);
  }

  /** Регистрация. Если в браузере есть гостевая сессия, её жизни остаются у владельца нового аккаунта */
  @Post("register")
  @HttpCode(201)
  async register(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown): Promise<RegisterResponse> {
    this.legacyClosed();
    const input = parseOrThrow(registerSchema, body);
    await this.throttle.hit([ipKey(request), emailKey(input.email)]);
    return this.auth.register(request, response, input);
  }

  /** Вход. Гостевые жизни этого браузера переносятся в аккаунт */
  @Post("login")
  @HttpCode(200)
  async login(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown): Promise<LoginResponse> {
    this.legacyClosed();
    const input = parseOrThrow(loginSchema, body);
    await this.throttle.hit([ipKey(request), emailKey(input.email)]);
    return this.auth.login(request, response, input);
  }

  @Post("logout")
  @HttpCode(200)
  /** Выход на этом устройстве. redirect — страница выхода Endemion ID, если вход был через него */
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown): Promise<OkResponse & { redirect: string | null }> {
    parseOrThrow(emptyBodySchema, body ?? {});
    const { redirect } = await this.auth.logout(request, response);
    return { ok: true, redirect };
  }

  @Post("verify-email")
  @HttpCode(200)
  async verifyEmail(@Req() request: Request, @Body() body: unknown): Promise<{ account: AccountView }> {
    this.legacyClosed();
    const input = parseOrThrow(verifyEmailSchema, body);
    await this.throttle.hit([ipKey(request)]);
    return { account: await this.auth.verifyEmail(request, input.code) };
  }

  @Post("resend-verification")
  @HttpCode(200)
  async resend(@Req() request: Request, @Body() body: unknown): Promise<{ verificationSent: boolean }> {
    this.legacyClosed();
    parseOrThrow(emptyBodySchema, body ?? {});
    await this.throttle.hit([ipKey(request)]);
    return this.auth.resendVerification(request);
  }

  /** Письмо со ссылкой восстановления. Ответ одинаковый для любого адреса */
  @Post("forgot-password")
  @HttpCode(200)
  async forgot(@Req() request: Request, @Body() body: unknown): Promise<OkResponse> {
    this.legacyClosed();
    const input = parseOrThrow(forgotPasswordSchema, body);
    await this.throttle.hit([ipKey(request), emailKey(input.email)]);
    await this.auth.forgotPassword(input.email);
    return { ok: true };
  }

  @Post("reset-password")
  @HttpCode(200)
  async reset(@Req() request: Request, @Body() body: unknown): Promise<OkResponse> {
    this.legacyClosed();
    const input = parseOrThrow(resetPasswordSchema, body);
    await this.throttle.hit([ipKey(request)]);
    await this.auth.resetPassword(input);
    return { ok: true };
  }

  @Get("sessions")
  @Header("Cache-Control", "no-store")
  async sessions(@Req() request: Request): Promise<{ sessions: SessionView[] }> {
    return { sessions: await this.auth.listSessions(request) };
  }

  @Post("sessions/revoke")
  @HttpCode(200)
  async revoke(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown): Promise<OkResponse> {
    const input = parseOrThrow(revokeSessionSchema, body);
    await this.auth.revokeSession(request, response, input.sessionId);
    return { ok: true };
  }

  @Post("sessions/revoke-others")
  @HttpCode(200)
  async revokeOthers(@Req() request: Request, @Body() body: unknown): Promise<{ revoked: number }> {
    parseOrThrow(emptyBodySchema, body ?? {});
    return { revoked: await this.auth.revokeOtherSessions(request) };
  }

  @Get("export")
  @Header("Cache-Control", "no-store")
  async exportAccount(@Req() request: Request) {
    return this.auth.exportAccount(request);
  }

  @Delete("account")
  @HttpCode(200)
  async deleteAccount(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Body() body: unknown): Promise<OkResponse> {
    parseOrThrow(deleteAccountSchema, body);
    await this.auth.deleteAccount(request, response);
    return { ok: true };
  }
}
