// Формат 8 (Stage 10, SAVE_SCHEMA_VERSION = 8) до Stage 02.1: поля health ещё нет.
// Снимок строится тем же движком и очищается от health, поэтому форма остаётся настоящей, а не выдуманной.
import { newGame } from "../../src/index.js";

function withoutHealth(seed: string, universeId: "dark-fantasy" | "murim"): Record<string, unknown> {
  const state = newGame({ seed, universeId }).state;
  const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  raw.schemaVersion = 8;
  delete raw.health;
  return raw;
}

const alive = withoutHealth("stage02-v8-alive", "murim");
const dead = withoutHealth("stage02-v8-dead", "dark-fantasy");
dead.life = {
  ...(dead.life as Record<string, unknown>),
  alive: false,
  deathAge: 41,
  deathCause: { ru: "Проверенная причина", en: "A verified cause" }
};

export const SAVES_V8: Record<string, unknown> = {
  "murim-alive": alive,
  "dark-fantasy-dead": dead
};
