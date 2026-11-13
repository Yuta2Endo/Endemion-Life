import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { Prisma, type PrismaClient } from "@endemion/database";
import type { AccountView, LoginRequest, MeResponse, RegisterRequest, ResetPasswordRequest } from "@endemion/shared";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import { ApiError } from "../common/api-error.js";
import { APP_CONFIG, type AppConfig } from "../config.js";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { SessionService } from "../session/session.service.js";
import { EndemionIdService, type IdClaims } from "./endemion-id.service.js";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./password.js";

type Tx = Prisma.TransactionClient;

const VERIFY_TTL_MS = 30 * 60 * 1000;
const VERIFY_MAX_ATTEMPTS = 5;
const RESEND_INTERVAL_MS = 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
/** Сколько писем одного вида можно запросить для аккаунта за час */
const TOKENS_PER_HOUR = 5;
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
const codeHash = (accountId: string, code: string): string => sha256(`${accountId}:${code}`);

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function accountView(account: { email: string; emailVerifiedAt: Date | null; createdAt: Date }): AccountView {
  return { email: account.email, emailVerified: account.emailVerifiedAt !== null, createdAt: account.createdAt.toISOString() };
}

const invalidCredentials = (): ApiError => new ApiError(401, "INVALID_CREDENTIALS", "Неверная почта или пароль");

/**
 * Аккаунты по email. Аккаунт привязан к игроку: жизни принадлежат игроку, поэтому при регистрации
 * гостевые жизни остаются на месте, а при входе в существующий аккаунт переносятся в него —
 * только жизни игрока, чья действующая сессия пришла в этом же запросе
 */
@Injectable()
export class AuthService {
  private readonly db: PrismaClient;
  private readonly logger = new Logger("Auth");

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(EndemionIdService) private readonly endemionId: EndemionIdService
  ) {
    this.db = prisma.client;
  }

  async me(request: Request): Promise<MeResponse> {
    const current = await this.sessions.current(request);
    if (!current) return { player: null, account: null };
    const [account, player] = await Promise.all([
      this.db.account.findUnique({ where: { playerId: current.player.id } }),
      this.db.player.findUniqueOrThrow({ where: { id: current.player.id } })
    ]);
    return {
      player: { id: current.player.id, createdAt: current.player.createdAt.toISOString() },
      account: account ? accountView(account) : null,
      endemionId: player.endemionSub
        ? { id: player.endemionSub, username: player.idUsername, displayName: player.idDisplayName, avatarUrl: player.idAvatarUrl, email: player.idEmail }
        : null
    };
  }

  /**
   * Вход через Endemion ID: игрок для sub. Порядок поиска:
   * 1. игрок уже связан с этим sub;
   * 2. аккаунт Life с той же почтой — только если Endemion ID подтвердил почту (как восстановление доступа по письму);
   * 3. гость этого браузера (игрок без аккаунта и без Endemion ID) — его жизни остаются у него;
   * 4. новый игрок.
   * Если игрок нашёлся в пунктах 1–2, гостевые жизни этого браузера переходят к нему — как при обычном входе.
   * По username ничего не связывается. Неподтверждённая почта, совпавшая с аккаунтом Life, не связывается
   */
  async signInWithEndemionId(request: Request, response: Response, claims: IdClaims, refreshToken: string): Promise<{ transferredLives: number }> {
    const current = await this.sessions.current(request);

    const result = await this.db.$transaction(async (tx) => {
      let playerId: string | null = (await tx.player.findUnique({ where: { endemionSub: claims.sub }, select: { id: true } }))?.id ?? null;
      let linkedExisting = playerId !== null;

      if (!playerId && claims.email) {
        // Блокируем строку аккаунта по почте: два одновременных входа с разными sub
        // не должны оба пройти проверку и связать одного владельца дважды
        await tx.$queryRaw`SELECT player_id FROM accounts WHERE email = ${claims.email} FOR UPDATE`;
        const sameEmail = await tx.account.findUnique({ where: { email: claims.email } });
        if (sameEmail) {
          await tx.$queryRaw`SELECT id FROM players WHERE id = ${sameEmail.playerId}::uuid FOR UPDATE`;
          const owner = await tx.player.findUniqueOrThrow({ where: { id: sameEmail.playerId } });
          if (owner.endemionSub) {
            throw new ApiError(409, "EMAIL_TAKEN", "Аккаунт Life с этой почтой уже связан с другим Endemion ID");
          }
          if (!claims.emailVerified) {
            throw new ApiError(409, "INVALID_TOKEN", "Подтвердите почту в Endemion ID: после этого аккаунт Life свяжется с ним и прогресс сохранится");
          }
          playerId = owner.id;
          linkedExisting = true;
        }
      }

      let guest: { id: string; account: { id: string } | null; endemionSub: string | null } | null = null;
      if (current) {
        // Гость блокируется до проверки и переноса: встречный вход не должен
        // одновременно создать аккаунт и перенести те же жизни второму владельцу
        await tx.$queryRaw`SELECT id FROM players WHERE id = ${current.player.id}::uuid FOR UPDATE`;
        guest = await tx.player.findUnique({
          where: { id: current.player.id },
          select: { id: true, endemionSub: true, account: { select: { id: true } } }
        });
      }
      const isGuest = Boolean(guest && !guest.account && !guest.endemionSub);

      if (!playerId) {
        // Гость становится игроком Endemion ID: его жизни остаются на месте
        playerId = isGuest ? guest!.id : (await tx.player.create({ data: {} })).id;
      }

      await tx.$queryRaw`SELECT id FROM players WHERE id = ${playerId}::uuid FOR UPDATE`;
      const target = await tx.player.findUniqueOrThrow({ where: { id: playerId } });
      if (target.endemionSub && target.endemionSub !== claims.sub) {
        throw new ApiError(409, "IDENTITY_CONFLICT", "Этот игрок уже связан с другим Endemion ID");
      }
      // updateMany с условием: если тот же sub одновременно связался в другом запросе, уникальный индекс не даст второй связи
      await tx.player.updateMany({ where: { id: playerId, endemionSub: null }, data: { endemionSub: claims.sub } });
      const linked = await tx.player.findUniqueOrThrow({ where: { id: playerId }, select: { endemionSub: true } });
      if (linked.endemionSub !== claims.sub) {
        throw new ApiError(409, "IDENTITY_CONFLICT", "Не удалось связать игрока с Endemion ID: попробуйте ещё раз");
      }

      let moved = 0;
      if (current) await this.sessions.revoke(tx, current.sessionId);
      if (linkedExisting && isGuest && guest!.id !== playerId) moved = await this.transferGuestLives(tx, guest!.id, playerId);

      await this.endemionId.applyClaims(tx, playerId, claims);
      // Новый токен сессии: заранее подсунутая cookie после входа не работает (session fixation)
      const session = await this.sessions.create(tx, playerId, request, refreshToken);
      return { token: session.token, moved, playerId };
    });

    this.sessions.setCookie(response, result.token);
    this.logger.log({ msg: "Вход через Endemion ID", playerId: result.playerId, transferredLives: result.moved });
    return { transferredLives: result.moved };
  }

  async register(request: Request, response: Response, input: RegisterRequest) {
    const current = await this.sessions.current(request);
    const passwordHash = await hashPassword(input.password);
    let result: { account: { id: string; email: string; emailVerifiedAt: Date | null; createdAt: Date }; player: { id: string; createdAt: Date }; token: string; code: string };
    try {
      result = await this.db.$transaction(async (tx) => {
        let playerId: string;
        if (current) {
          if (await tx.account.findUnique({ where: { playerId: current.player.id } })) {
            throw new ApiError(409, "ALREADY_SIGNED_IN", "Вы уже вошли в аккаунт. Выйдите, чтобы создать новый");
          }
          // Гость становится владельцем аккаунта: его жизни остаются у того же игрока
          playerId = current.player.id;
          await this.sessions.revoke(tx, current.sessionId);
        } else {
          playerId = (await tx.player.create({ data: {} })).id;
        }
        const account = await tx.account.create({ data: { playerId, email: input.email, passwordHash } });
        // Новый токен сессии после регистрации: старый токен гостя (если его кто-то узнал) больше не действует
        const session = await this.sessions.create(tx, playerId, request);
        const code = await this.issueVerifyCode(tx, account.id);
        const player = await tx.player.findUniqueOrThrow({ where: { id: playerId } });
        return { account, player, token: session.token, code };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Уникальность нарушена: либо адрес занят, либо этот игрок одновременно зарегистрировался в другой вкладке
        const taken = await this.db.account.findUnique({ where: { email: input.email } });
        if (taken) throw new ApiError(409, "EMAIL_TAKEN", "Этот адрес уже зарегистрирован. Войдите или восстановите доступ");
        throw new ApiError(409, "ALREADY_SIGNED_IN", "Вы уже вошли в аккаунт");
      }
      throw error;
    }
    this.sessions.setCookie(response, result.token);
    const verificationSent = await this.sendVerifyCode(result.account.email, result.code);
    this.logger.log({ msg: "Аккаунт создан", accountId: result.account.id, verificationSent });
    return {
      player: { id: result.player.id, createdAt: result.player.createdAt.toISOString() },
      account: accountView(result.account),
      verificationSent
    };
  }

  async login(request: Request, response: Response, input: LoginRequest) {
    const account = await this.db.account.findUnique({ where: { email: input.email } });
    if (!account) {
      // Та же работа, что при проверке настоящего пароля: по времени ответа не понять, есть ли аккаунт
      await verifyPassword(DUMMY_PASSWORD_HASH, input.password);
      throw invalidCredentials();
    }
    if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
      throw new ApiError(429, "RATE_LIMITED", "Слишком много неудачных попыток входа. Попробуйте через 15 минут или восстановите доступ");
    }
    if (!(await verifyPassword(account.passwordHash, input.password))) {
      // Счётчик растёт атомарно в базе: параллельный перебор тоже упирается в порог
      const updated = await this.db.account.update({ where: { id: account.id }, data: { failedLogins: { increment: 1 } } });
      if (updated.failedLogins >= MAX_FAILED_LOGINS) {
        await this.db.account.update({ where: { id: account.id }, data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } });
        this.logger.warn({ msg: "Вход заблокирован после неудачных попыток", accountId: account.id });
      }
      throw invalidCredentials();
    }

    const current = await this.sessions.current(request);
    const { transferred, token } = await this.db.$transaction(async (tx) => {
      await tx.account.update({ where: { id: account.id }, data: { failedLogins: 0, lockedUntil: null } });
      let moved = 0;
      if (current) {
        await this.sessions.revoke(tx, current.sessionId);
        if (current.player.id !== account.playerId) {
          const owner = await tx.account.findUnique({ where: { playerId: current.player.id }, select: { id: true } });
          // Переносятся только жизни гостя (игрока без аккаунта), чья сессия пришла в этом запросе
          if (!owner) moved = await this.transferGuestLives(tx, current.player.id, account.playerId);
        }
      }
      const session = await this.sessions.create(tx, account.playerId, request);
      return { transferred: moved, token: session.token };
    });
    this.sessions.setCookie(response, token);
    if (transferred > 0) this.logger.log({ msg: "Гостевые жизни перенесены в аккаунт", accountId: account.id, lives: transferred });
    const player = await this.db.player.findUniqueOrThrow({ where: { id: account.playerId } });
    return {
      player: { id: player.id, createdAt: player.createdAt.toISOString() },
      account: accountView(account),
      transferredLives: transferred
    };
  }

  /**
   * Перенос жизней гостя к игроку аккаунта в той же транзакции, что и вход.
   * Строка гостя блокируется: два одновременных входа с одной cookie не перенесут жизни дважды,
   * а действие над жизнью, начатое по старой сессии, дождётся конца переноса и получит 404
   */
  private async transferGuestLives(tx: Tx, guestPlayerId: string, targetPlayerId: string): Promise<number> {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM players WHERE id = ${guestPlayerId}::uuid FOR UPDATE`;
    if (locked.length === 0) return 0;
    const moved = await tx.life.updateMany({ where: { playerId: guestPlayerId }, data: { playerId: targetPlayerId } });
    await tx.gameAction.updateMany({ where: { playerId: guestPlayerId }, data: { playerId: targetPlayerId } });
    // Участник живого окна ссылается на игрока отдельно от жизни. Без переноса
    // каскадное удаление гостя уничтожило бы вклад и отметку о награде
    await tx.livePart.updateMany({ where: { playerId: guestPlayerId }, data: { playerId: targetPlayerId } });
    // Пустой игрок гостя больше не нужен. Его сессии удаляются каскадом
    await tx.player.delete({ where: { id: guestPlayerId } });
    return moved.count;
  }

  /** Выход на этом устройстве. Для входа через Endemion ID — адрес выхода там (можно выйти и с endemion.online) */
  async logout(request: Request, response: Response): Promise<{ redirect: string | null }> {
    const current = await this.sessions.current(request);
    let viaEndemionId = false;
    if (current) {
      const session = await this.db.session.findUnique({ where: { id: current.sessionId }, select: { refreshToken: true } });
      viaEndemionId = Boolean(session?.refreshToken);
      await this.sessions.revoke(this.db, current.sessionId);
    }
    this.sessions.clearCookie(response);
    return { redirect: viaEndemionId && this.endemionId.enabled ? await this.endemionId.endSessionUrl() : null };
  }

  private async requireAccount(request: Request) {
    const current = await this.sessions.requireSession(request);
    const account = await this.db.account.findUnique({ where: { playerId: current.player.id } });
    if (!account) throw new ApiError(401, "UNAUTHORIZED", "Сначала войдите в аккаунт");
    return { current, account };
  }

  /** Новый код подтверждения. Прежние коды аннулируются: действует только последний */
  private async issueVerifyCode(tx: Tx, accountId: string): Promise<string> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await tx.authToken.updateMany({ where: { accountId, purpose: "verify_email", usedAt: null }, data: { usedAt: new Date() } });
    await tx.authToken.create({
      data: { accountId, purpose: "verify_email", tokenHash: codeHash(accountId, code), expiresAt: new Date(Date.now() + VERIFY_TTL_MS) }
    });
    return code;
  }

  private sendVerifyCode(email: string, code: string): Promise<boolean> {
    return this.mail.send({
      to: email,
      subject: "Код подтверждения Endemion Life",
      text: `Ваш код подтверждения: ${code}\n\nКод действует 30 минут. Если вы не создавали аккаунт в Endemion Life, просто удалите это письмо.\n\nYour Endemion Life verification code: ${code}`
    });
  }

  async verifyEmail(request: Request, code: string): Promise<AccountView> {
    const { account } = await this.requireAccount(request);
    if (account.emailVerifiedAt) return accountView(account);
    const updated = await this.db.$transaction(async (tx) => {
      const token = await tx.authToken.findFirst({
        where: { accountId: account.id, purpose: "verify_email", usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" }
      });
      if (!token) throw new ApiError(400, "INVALID_CODE", "Код устарел. Запросите новый");
      // Попытка засчитывается до сравнения и только пока лимит не исчерпан: параллельный перебор не обойдёт порог
      const bumped = await tx.authToken.updateMany({ where: { id: token.id, usedAt: null, attempts: { lt: VERIFY_MAX_ATTEMPTS } }, data: { attempts: { increment: 1 } } });
      if (bumped.count === 0) throw new ApiError(400, "INVALID_CODE", "Слишком много попыток. Запросите новый код");
      if (!sameHash(token.tokenHash, codeHash(account.id, code))) return null;
      const used = await tx.authToken.updateMany({ where: { id: token.id, usedAt: null }, data: { usedAt: new Date() } });
      if (used.count === 0) throw new ApiError(400, "INVALID_CODE", "Код уже использован");
      return tx.account.update({ where: { id: account.id }, data: { emailVerifiedAt: new Date() } });
    });
    if (!updated) throw new ApiError(400, "INVALID_CODE", "Неверный код");
    return accountView(updated);
  }

  private async checkTokenQuota(accountId: string, purpose: "verify_email" | "reset_password"): Promise<{ allowed: boolean; tooSoon: boolean }> {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.db.authToken.findMany({ where: { accountId, purpose, createdAt: { gt: hourAgo } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    const last = recent[0];
    return { allowed: recent.length < TOKENS_PER_HOUR, tooSoon: last !== undefined && Date.now() - last.createdAt.getTime() < RESEND_INTERVAL_MS };
  }

  async resendVerification(request: Request): Promise<{ verificationSent: boolean }> {
    const { account } = await this.requireAccount(request);
    if (account.emailVerifiedAt) return { verificationSent: false };
    const quota = await this.checkTokenQuota(account.id, "verify_email");
    if (quota.tooSoon) throw new ApiError(429, "RATE_LIMITED", "Новый код можно запросить через минуту");
    if (!quota.allowed) throw new ApiError(429, "RATE_LIMITED", "Слишком много запросов кода. Попробуйте через час");
    const code = await this.db.$transaction((tx) => this.issueVerifyCode(tx, account.id));
    return { verificationSent: await this.sendVerifyCode(account.email, code) };
  }

  /** Всегда «ок»: ответ не показывает, зарегистрирован ли адрес */
  async forgotPassword(email: string): Promise<void> {
    const account = await this.db.account.findUnique({ where: { email } });
    if (!account) return;
    const quota = await this.checkTokenQuota(account.id, "reset_password");
    if (!quota.allowed || quota.tooSoon) return;
    const token = randomBytes(32).toString("base64url");
    await this.db.$transaction(async (tx) => {
      await tx.authToken.updateMany({ where: { accountId: account.id, purpose: "reset_password", usedAt: null }, data: { usedAt: new Date() } });
      await tx.authToken.create({ data: { accountId: account.id, purpose: "reset_password", tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } });
    });
    const link = `${this.config.publicUrl}/reset-password?token=${token}`;
    await this.mail.send({
      to: account.email,
      subject: "Восстановление доступа к Endemion Life",
      text: `Чтобы задать новый пароль, откройте ссылку (действует 1 час):\n${link}\n\nЕсли вы не запрашивали восстановление, просто удалите это письмо: пароль не изменится.\n\nTo set a new password for Endemion Life, open the link above (valid for 1 hour).`
    });
  }

  /** Новый пароль по ссылке из письма. Ссылка одноразовая; все сессии аккаунта завершаются */
  async resetPassword(input: ResetPasswordRequest): Promise<void> {
    const passwordHash = await hashPassword(input.password);
    await this.db.$transaction(async (tx) => {
      const token = await tx.authToken.findFirst({
        where: { tokenHash: sha256(input.token), purpose: "reset_password", usedAt: null, expiresAt: { gt: new Date() } }
      });
      if (!token) throw new ApiError(400, "INVALID_TOKEN", "Ссылка недействительна или устарела. Запросите новую");
      const used = await tx.authToken.updateMany({ where: { id: token.id, usedAt: null }, data: { usedAt: new Date() } });
      if (used.count === 0) throw new ApiError(400, "INVALID_TOKEN", "Ссылка уже использована");
      const account = await tx.account.findUniqueOrThrow({ where: { id: token.accountId } });
      await tx.account.update({
        where: { id: account.id },
        // Владелец доказал доступ к почте: адрес считается подтверждённым
        data: { passwordHash, failedLogins: 0, lockedUntil: null, emailVerifiedAt: account.emailVerifiedAt ?? new Date() }
      });
      await this.sessions.revokeAll(tx, account.playerId);
      this.logger.log({ msg: "Пароль изменён по ссылке восстановления", accountId: account.id });
    });
  }

  async listSessions(request: Request) {
    const current = await this.sessions.requireSession(request);
    return this.sessions.list(current.player.id, current.sessionId);
  }

  async revokeSession(request: Request, response: Response, sessionId: string): Promise<void> {
    const current = await this.sessions.requireSession(request);
    const result = await this.db.session.updateMany({ where: { id: sessionId, playerId: current.player.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (result.count === 0) throw new ApiError(404, "NOT_FOUND", "Сессия не найдена");
    if (sessionId === current.sessionId) this.sessions.clearCookie(response);
  }

  async revokeOtherSessions(request: Request): Promise<number> {
    const current = await this.sessions.requireSession(request);
    return this.sessions.revokeAll(this.db, current.player.id, current.sessionId);
  }
}
