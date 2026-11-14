import { profileUpdateSchema } from "@endemion/shared";
import { Body, Controller, Get, Header, Inject, Param, Patch, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ApiError, parseOrThrow } from "../common/api-error.js";
import { SessionService } from "../session/session.service.js";
import { ProfileService } from "./profile.service.js";

const uuid = z.uuid();

const idOf = (value: string): string => {
  if (!uuid.safeParse(value).success) throw new ApiError(404, "NOT_FOUND", "Профиль не найден.");
  return value;
};

@Controller("profile")
export class ProfileController {
  constructor(
    @Inject(ProfileService) private readonly profiles: ProfileService,
    @Inject(SessionService) private readonly sessions: SessionService
  ) {}

  @Get("me")
  @Header("Cache-Control", "no-store")
  async me(@Req() request: Request) {
    const { player } = await this.sessions.requireAccount(request);
    return { profile: await this.profiles.me(player.id) };
  }

  @Patch("me")
  @Header("Cache-Control", "no-store")
  async update(@Req() request: Request, @Body() body: unknown) {
    const { player } = await this.sessions.requireAccount(request);
    const input = parseOrThrow(profileUpdateSchema, body);
    return { profile: await this.profiles.update(player.id, input) };
  }

  @Get(":playerId")
  @Header("Cache-Control", "no-store")
  async one(@Req() request: Request, @Param("playerId") playerId: string) {
    const viewer = await this.sessions.find(request);
    return { profile: await this.profiles.get(viewer?.id ?? null, idOf(playerId)) };
  }
}
