import type { PortalProfileView } from "@endemion/shared";
import { Controller, Get, Header, Inject, Req, UseGuards } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { PortalAuthGuard } from "./portal-auth.guard.js";
import { PORTAL_CACHE_CONTROL, type PortalRequest } from "./portal.constants.js";
import { PortalService } from "./portal.service.js";

/**
 * Stage 11.2: минимальный read-only API для портала Endemion.
 * Идентичность берётся только из проверенного JWT (PortalAuthGuard); playerId из
 * query/body/headers не читается. Никаких мутаций в этом контроллере нет.
 */
@Controller("portal")
@UseGuards(PortalAuthGuard)
export class PortalController {
  constructor(
    @Inject(PortalService) private readonly portal: PortalService
  ) {}

  @Get("profile")
  @Header("Cache-Control", PORTAL_CACHE_CONTROL)
  async profile(@Req() request: PortalRequest): Promise<{ profile: PortalProfileView }> {
    const identity = request.portal;
    if (!identity) throw new ApiError(401, "UNAUTHORIZED", "Требуется авторизация");
    return { profile: await this.portal.profile(identity, request.path) };
  }
}
