// Формат 10 (Stage 02.2, SAVE_SCHEMA_VERSION = 10) до Stage 02.3: полей household и business ещё нет.
// Снимки строятся тем же движком и очищаются от новых полей, поэтому форма настоящая, а не выдуманная.
import { newGame } from "../../src/index.js";

function withoutEstate(seed: string, universeId: "dark-fantasy" | "murim" | "hunter"): Record<string, unknown> {
  const state = newGame({ seed, universeId }).state;
  const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  raw.schemaVersion = 10;
  delete raw.household;
  delete raw.business;
  return raw;
}

const alive = withoutEstate("stage02-3-v10-alive", "murim");
const dead = withoutEstate("stage02-3-v10-dead", "dark-fantasy");
dead.life = {
  ...(dead.life as Record<string, unknown>),
  alive: false,
  deathAge: 44,
  deathCause: { ru: "Проверенная причина", en: "A verified cause" }
};

// Взрослый с дипломом и работой: жильё и дело добавляются, карьера остаётся прежней
const employed = withoutEstate("stage02-3-v10-employed", "hunter");
employed.life = { ...(employed.life as Record<string, unknown>), age: 34, stage: "adult" };
const employedCharacter = employed.character as Record<string, unknown>;
employedCharacter.educationId = "hu-hunter-academy";
employedCharacter.professionId = "raid-hunter";
const employedCareer = employed.career as Record<string, unknown>;
employedCareer.since = 20;
employedCareer.tenure = 8;
employedCareer.employed = true;

export const SAVES_V10: Record<string, unknown> = {
  "murim-alive": alive,
  "dark-fantasy-dead": dead,
  "hunter-employed": employed
};
