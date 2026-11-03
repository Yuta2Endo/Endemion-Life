import type { AuthConfigView } from "@endemion/shared";
import { Controller, Get, Header, Inject, Logger, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { ApiError } from "../common/api-error.js";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { AuthService } from "./auth.service.js";
import { EndemionIdService, OIDC_COOKIE, OIDC_COOKIE_PATH, safeReturnTo } from "./endemion-id.service.js";

const LOGIN_COOKIE_MS = 10 * 60 * 1000;

/**
 * Вход через Endemion ID. /api/auth/oidc/login уводит браузер на auth.endemion.online,
 * /api/auth/oidc/callback принимает ответ провайдера и создаёт сессию Life.
 * Оба маршрута — переходы браузера (GET), ошибки показываются на странице /account, а не JSON
 */
@Controller("auth")
export class EndemionIdController {
  private readonly logger = new Logger("EndemionId");

  constructor(
    @Inject(EndemionIdService) private readonly endemionId: EndemionIdService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  /** Как входить: сайт показывает кнопку Endemion ID или старую форму */
  @Get("config")
  @Header("Cache-Control", "no-store")
  authConfig(): AuthConfigView {
    const settings = this.config.endemionId;
    return { endemionId: settings ? { enabled: true, accountUrl: settings.accountUrl } : { enabled: false } };
  }

  @Get("oidc/login")
  @Header("Cache-Control", "no-store")
  async login(@Query("returnTo") returnTo: unknown, @Query("screen") screen: unknown, @Res() response: Response): Promise<void> {
    if (!this.endemionId.enabled) throw new ApiError(404, "NOT_FOUND", "Вход через Endemion ID выключен");
    const { url, state } = await this.endemionId.startLogin(safeReturnTo(returnTo), { register: screen === "register" });
    response.cookie(OIDC_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: this.config.secureCookies, path: OIDC_COOKIE_PATH, maxAge: LOGIN_COOKIE_MS });
    response.redirect(302, url);
  }

  @Get("oidc/callback")
  @Header("Cache-Control", "no-store")
  async callback(@Req() request: Request, @Res() response: Response): Promise<void> {
    if (!this.endemionId.enabled) throw new ApiError(404, "NOT_FOUND", "Вход через Endemion ID выключен");
    response.clearCookie(OIDC_COOKIE, { httpOnly: true, sameSite: "lax", secure: this.config.secureCookies, path: OIDC_COOKIE_PATH });
    const fail = (reason: string) => response.redirect(302, `${this.config.publicUrl}/account?idError=${reason}`);

    const cookies = request.cookies as Record<string, unknown> | undefined;
    const login = await this.endemionId.takeLogin(cookies?.[OIDC_COOKIE]);
    if (!login) return fail("expired");
    if (typeof request.query.error === "string") return fail("denied");

    // Адрес ответа собирается из настроек, а не из Host запроса: за прокси Host может быть внутренним
    const callbackUrl = new URL(this.endemionId.settings.redirectUri);
    callbackUrl.search = new URL(request.originalUrl, "http://internal").search;

    let exchanged;
    try {
      exchanged = await this.endemionId.exchange(callbackUrl, login);
    } catch (error) {
      this.logger.warn({ msg: "Обмен кода Endemion ID не удался", error: error instanceof Error ? error.message : String(error) });
      return fail("failed");
    }

    try {
      await this.auth.signInWithEndemionId(request, response, exchanged.claims, exchanged.refreshToken);
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_TOKEN") return fail("unverified");
      if (error instanceof ApiError && error.code === "EMAIL_TAKEN") return fail("linked");
      throw error;
    }
    response.redirect(302, `${this.config.publicUrl}${login.returnTo}`);
  }
}
