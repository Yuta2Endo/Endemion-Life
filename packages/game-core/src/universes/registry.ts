import { GameRuleError } from "../errors.js";
import { UNIVERSE_IDS, type UniverseId } from "../types.js";
import { ACADEMY } from "./academy.js";
import { DARK_FANTASY } from "./dark-fantasy.js";
import { HUNTER } from "./hunter.js";
import { ISEKAI } from "./isekai.js";
import { MURIM } from "./murim.js";
import type { UniverseDefinition } from "./types.js";
import { XIANXIA } from "./xianxia.js";

const UNIVERSES: Readonly<Record<UniverseId, UniverseDefinition>> = {
  "dark-fantasy": DARK_FANTASY,
  isekai: ISEKAI,
  murim: MURIM,
  xianxia: XIANXIA,
  hunter: HUNTER,
  academy: ACADEMY
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
