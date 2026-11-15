import { Controller, Get, HttpCode, Inject, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ApiError } from "../common/api-error.js";
import { NotificationService } from "./notification.service.js";
import { SessionService } from "../session/session.service.js";

const uuid = z.uuid();

@Controller("notifications")
export class NotificationController {
  constructor(
    @Inject(NotificationService) private readonly notifications: NotificationService,
    @Inject(SessionService) private readonly sessions: SessionService
  ) {}

  @Get()
  async list(@Req() request: Request) {
    const { player } = await this.sessions.requireAccount(request);
    return this.notifications.list(player.id);
  }

  @Post("read-all")
  @HttpCode(200)
  async readAll(@Req() request: Request) {
    const { player } = await this.sessions.requireAccount(request);
    return this.notifications.markAllRead(player.id);
  }

  @Post(":id/read")
  @HttpCode(200)
  async read(@Req() request: Request, @Param("id") id: string) {
    const { player } = await this.sessions.requireAccount(request);
    if (!uuid.safeParse(id).success) throw new ApiError(404, "NOT_FOUND", "Уведомление не найдено.");
    return this.notifications.markRead(player.id, id);
  }
}
