import { GameRuleError } from "../errors.js";
import { WORLD_ECONOMY_EVENTS } from "../narrative/economy-events.js";
import { WORLD_HEALTH_EVENTS } from "../narrative/health-events.js";
import { COMMON_CONSEQUENCES } from "../narrative/people.js";
import { UNIVERSE_IDS, type UniverseId } from "../types.js";
import { ACADEMY } from "./academy.js";
import { ACADEMY_WORLD } from "./academy.world.js";
import { DARK_FANTASY } from "./dark-fantasy.js";
import { DARK_FANTASY_WORLD } from "./dark-fantasy.world.js";
import { HUNTER } from "./hunter.js";
import { HUNTER_WORLD } from "./hunter.world.js";
import { ISEKAI } from "./isekai.js";
import { ISEKAI_WORLD } from "./isekai.world.js";
import { MURIM } from "./murim.js";
import { MURIM_WORLD } from "./murim.world.js";
import type { UniverseBase, UniverseDefinition, WorldDefinition } from "./types.js";
import { XIANXIA } from "./xianxia.js";
import { XIANXIA_WORLD } from "./xianxia.world.js";

/** Мир целиком: описание Stage 01 и расширение Stage 02. Способности и события складываются; Stage 04 добавляет события хозяйства мира */
function compose(base: UniverseBase, world: WorldDefinition): UniverseDefinition {
  const { abilityCategories, abilities, events, ...rest } = world;
  return {
    ...base,
    ...rest,
    consequences: [...COMMON_CONSEQUENCES, ...rest.consequences],
    abilities: [...base.abilities.map((ability) => ({ ...ability, category: ability.category ?? abilityCategories[ability.id] ?? "utility" })), ...abilities],
    events: [...base.events, ...events, ...WORLD_ECONOMY_EVENTS[base.id], ...WORLD_HEALTH_EVENTS[base.id]]
  };
}

const UNIVERSES: Readonly<Record<UniverseId, UniverseDefinition>> = {
  "dark-fantasy": compose(DARK_FANTASY, DARK_FANTASY_WORLD),
  isekai: compose(ISEKAI, ISEKAI_WORLD),
  murim: compose(MURIM, MURIM_WORLD),
  xianxia: compose(XIANXIA, XIANXIA_WORLD),
  hunter: compose(HUNTER, HUNTER_WORLD),
  academy: compose(ACADEMY, ACADEMY_WORLD)
};

export function isUniverseId(value: unknown): value is UniverseId {
  return typeof value === "string" && (UNIVERSE_IDS as readonly string[]).includes(value);
}

export function getUniverse(id: UniverseId): UniverseDefinition {
  const universe = UNIVERSES[id] as UniverseDefinition | undefined;
  if (!universe) throw new GameRuleError("INVALID_INPUT", `Неизвестная вселенная: ${String(id)}`);
  return universe;
}

export function listUniverses(): UniverseDefinition[] {
  return UNIVERSE_IDS.map((id) => UNIVERSES[id]);
}
