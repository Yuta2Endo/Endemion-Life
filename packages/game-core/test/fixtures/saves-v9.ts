// Формат 9 (Stage 02.1, SAVE_SCHEMA_VERSION = 9) до Stage 02.2: полей education и career ещё нет.
// Снимки строятся тем же движком и очищаются от новых полей, поэтому форма настоящая, а не выдуманная.
import { newGame } from "../../src/index.js";

function withoutCareer(seed: string, universeId: "dark-fantasy" | "murim" | "hunter"): Record<string, unknown> {
  const state = newGame({ seed, universeId }).state;
  const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  raw.schemaVersion = 9;
  delete raw.education;
  delete raw.career;
  delete raw.household;
  delete raw.business;
  delete raw.location;
  return raw;
}

const alive = withoutCareer("stage02-2-v9-alive", "murim");
const dead = withoutCareer("stage02-2-v9-dead", "dark-fantasy");
dead.life = {
  ...(dead.life as Record<string, unknown>),
  alive: false,
  deathAge: 41,
  deathCause: { ru: "Проверенная причина", en: "A verified cause" }
};

// Взрослый с дипломом и работой: перевод обязан сохранить диплом и вывести карьеру из профессии
const employed = withoutCareer("stage02-2-v9-employed", "hunter");
employed.life = { ...(employed.life as Record<string, unknown>), age: 34, stage: "adult" };
const employedCharacter = employed.character as Record<string, unknown>;
employedCharacter.educationId = "hu-hunter-academy";
employedCharacter.professionId = "raid-hunter";

export const SAVES_V9: Record<string, unknown> = {
  "murim-alive": alive,
  "dark-fantasy-dead": dead,
  "hunter-employed": employed
};
