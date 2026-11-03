import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import { APP_CONFIG, type AppConfig, type MailDriver } from "../config.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

/**
 * Отправка писем. Драйверы:
 *  smtp   — настоящая отправка (SMTP_URL);
 *  file   — письма пишутся в MAIL_OUTBOX_DIR (разработка без почтового сервера);
 *  memory — письма копятся в outbox (тесты);
 *  none   — письма не отправляются, send() возвращает false.
 * Ошибка отправки не роняет запрос: вызывающий код получает false и сообщает об этом игроку
 */
@Injectable()
export class MailService implements OnModuleDestroy {
  readonly outbox: MailMessage[] = [];
  private readonly logger = new Logger("Mail");
  private readonly transport: Transporter | null;
  private readonly outboxDir: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.transport = config.mail.driver === "smtp" && config.mail.smtpUrl ? nodemailer.createTransport(config.mail.smtpUrl) : null;
    this.outboxDir = isAbsolute(config.mail.outboxDir) ? config.mail.outboxDir : join(REPO_ROOT, config.mail.outboxDir);
  }

  get driver(): MailDriver {
    return this.config.mail.driver;
  }

  async send(message: MailMessage): Promise<boolean> {
    try {
      switch (this.config.mail.driver) {
        case "smtp":
          await this.transport!.sendMail({ from: this.config.mail.from, to: message.to, subject: message.subject, text: message.text });
          break;
        case "file": {
          await mkdir(this.outboxDir, { recursive: true });
          const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}.json`;
          await writeFile(join(this.outboxDir, name), JSON.stringify({ from: this.config.mail.from, ...message }, null, 2), "utf8");
          break;
        }
        case "memory":
          this.outbox.push(message);
          break;
        case "none":
          this.logger.warn({ msg: "Почта не настроена: письмо не отправлено", subject: message.subject });
          return false;
      }
      this.logger.log({ msg: "Письмо отправлено", driver: this.config.mail.driver, subject: message.subject });
      return true;
    } catch (error) {
      // Текст письма (с кодом или ссылкой) в лог не попадает
      this.logger.error({ msg: "Не удалось отправить письмо", driver: this.config.mail.driver, subject: message.subject, reason: (error as Error).message });
      return false;
    }
  }

  onModuleDestroy(): void {
    this.transport?.close();
  }
}
