// Формат 11 (Stage 02.3, SAVE_SCHEMA_VERSION = 11) до Stage 02.4: поля location ещё нет.
// Снимки строятся тем же движком и очищаются от нового поля, поэтому форма настоящая, а не выдуманная.
import { newGame } from "../../src/index.js";

function withoutLocation(seed: string, universeId: "dark-fantasy" | "murim" | "hunter"): Record<string, unknown> {
  const state = newGame({ seed, universeId }).state;
  const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  raw.schemaVersion = 11;
  delete raw.location;
  return raw;
}

const alive = withoutLocation("stage02-4-v11-alive", "murim");
const dead = withoutLocation("stage02-4-v11-dead", "dark-fantasy");
dead.life = {
  ...(dead.life as Record<string, unknown>),
  alive: false,
  deathAge: 47,
  deathCause: { ru: "Проверенная причина", en: "A verified cause" }
};

const employed = withoutLocation("stage02-4-v11-employed", "hunter");
employed.life = { ...(employed.life as Record<string, unknown>), age: 34, stage: "adult" };
const employedCharacter = employed.character as Record<string, unknown>;
employedCharacter.educationId = "hu-hunter-academy";
employedCharacter.professionId = "raid-hunter";
const employedCareer = employed.career as Record<string, unknown>;
employedCareer.since = 20;
employedCareer.tenure = 8;
employedCareer.employed = true;

export const SAVES_V11: Record<string, unknown> = {
  "murim-alive": alive,
  "dark-fantasy-dead": dead,
  "hunter-employed": employed
};
