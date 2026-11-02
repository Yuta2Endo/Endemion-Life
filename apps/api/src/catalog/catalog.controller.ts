import { getUniverse, isUniverseId, summarizeUniverse, temperamentCatalog, universeCatalog, type UniverseSummary } from "@endemion/game-core";
import type { CatalogResponse } from "@endemion/shared";
import { Controller, Get, Header, Param } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";

/** Каталог миров одинаков для всех и меняется только с выпуском игры: его можно кешировать */
@Controller("universes")
export class CatalogController {
  @Get()
  @Header("Cache-Control", "public, max-age=300")
  list(): CatalogResponse {
    return { universes: universeCatalog(), temperaments: temperamentCatalog() };
  }

  @Get(":id")
  @Header("Cache-Control", "public, max-age=300")
  one(@Param("id") id: string): { universe: UniverseSummary } {
    if (!isUniverseId(id)) throw new ApiError(404, "NOT_FOUND", "Такой вселенной нет");
    return { universe: summarizeUniverse(getUniverse(id)) };
  }
}
