// Формат 13 (Stage 02.5, SAVE_SCHEMA_VERSION = 13) до Stage 03.1: в записи о наследстве ещё нет assets.
// Снимки строятся тем же движком и получают настоящую старую форму, а не выдуманную.
import { newGame } from "../../src/index.js";

function base(seed: string, universeId: "dark-fantasy" | "murim" | "hunter"): Record<string, unknown> {
  const state = newGame({ seed, universeId }).state;
  const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  raw.schemaVersion = 13;
  return raw;
}

const alive = base("stage03-1-v13-alive", "murim");
alive.life = { ...(alive.life as Record<string, unknown>), age: 27, stage: "adult" };

const oldInheritance = base("stage03-1-v13-old-inheritance", "dark-fantasy");
oldInheritance.life = { ...(oldInheritance.life as Record<string, unknown>), age: 31, stage: "adult" };
const character = oldInheritance.character as Record<string, unknown>;
const lineage = oldInheritance.lineage as Record<string, unknown>;
lineage.inheritance = {
  fromGen: 1,
  fromName: "Old Predecessor",
  fromNpcId: "n1",
  relation: "parent",
  law: "ash-primogeniture",
  wealth: 42,
  ownWealth: 3,
  shares: [],
  socialClassId: character.socialClassId,
  classInherited: false,
  reputation: 0,
  talents: [],
  weaknesses: [],
  dormant: 0,
  flags: [],
  threads: [],
  relics: [],
  controlAge: 16,
  guardianName: null,
  held: 0
};

export const SAVES_V13: Record<string, unknown> = {
  "murim-alive": alive,
  "dark-fantasy-old-inheritance": oldInheritance
};
