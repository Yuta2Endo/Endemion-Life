// Stage 02.6: длительный прогон жизни. CI по умолчанию играет 72 жизни (6 миров × 4 уклада × 3 seeds).
// Полный прогон на 1008 жизней включается ENDEMION_FULL_SOAK=1 и нужен для отчёта о балансе, а не для каждого CI.
import { describe, expect, it } from "vitest";
import {
  applyAction,
  deepClone,
  educationTier,
  getUniverse,
  MAX_BUSINESSES,
  MAX_CHRONICLE,
  MAX_ECONOMY_YEARS,
  MAX_HEALTH_CONDITIONS,
  MAX_LOCATION_HISTORY,
  MAX_NPCS,
  MAX_RELATIONSHIPS,
  MAX_STORY_RECORDS,
  MAX_WORLD_ACTIVITIES,
  parseSave,
  SAVE_SCHEMA_VERSION,
  settlementSeeds,
  UNIVERSE_IDS,
  WEALTH_MAX,
  type GameState
} from "../src/index.js";
import { SAVES_V8 } from "./fixtures/saves-v8.js";
import { choiceIds, start } from "./helpers.js";
import { formatSoakMetrics, runStage02Soak, SOAK_MAX_AGE, SOAK_STATE_BYTES_LIMIT } from "./stage02-soak.js";

/** Node есть в рантайме vitest, но tsconfig пакета намеренно не тянет @types/node. */
const fullSoak = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.ENDEMION_FULL_SOAK === "1";
const livesPerUniverse = fullSoak ? 42 : 3;
const testTimeout = fullSoak ? 900_000 : 180_000;
const log = (line: string): void => {
  const output = (globalThis as { console?: { log: (text: string) => void } }).console;
  output?.log(line);
};

function advanceOrChoose(state: GameState, maxSteps: number, stopAge = SOAK_MAX_AGE): GameState {
  let current = state;
  for (let step = 0; step < maxSteps && current.life.alive && current.life.age < stopAge; step++) {
    current = applyAction(current, current.pending ? { type: "choose", choiceId: choiceIds(current)[0]! } : { type: "advance", years: 3 }).state;
  }
  return current;
}

/** Живая жизнь около 20–30 лет: из неё делается реалистичный снимок формата 8. */
function midLife(universeId: (typeof UNIVERSE_IDS)[number]): GameState {
  for (let attempt = 0; attempt < 12; attempt++) {
    const state = advanceOrChoose(start({ seed: `stage02-v8-${universeId}-${attempt}`, universeId }), 48, 22);
    if (state.life.alive && state.life.age >= 20) return state;
  }
  throw new Error(`не удалось получить живую жизнь 20+ лет: ${universeId}`);
}

/** Снимок, каким его мог оставить production формата 8: без полей Stage 02.1–02.5. */
function toSchema8(state: GameState): Record<string, unknown> {
  const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  raw.schemaVersion = 8;
  delete raw.health;
  delete raw.education;
  delete raw.career;
  delete raw.household;
  delete raw.business;
  delete raw.location;
  const character = raw.character;
  if (typeof character === "object" && character !== null && !Array.isArray(character)) delete (character as Record<string, unknown>).creation;
  return raw;
}

describe("Stage 02.6: длительный прогон и баланс", () => {
  it(
    `играет ${livesPerUniverse * UNIVERSE_IDS.length * 4} жизней без нарушения инвариантов`,
    () => {
      const run = runStage02Soak({ livesPerUniverse });
      // Метрики — часть результата прогона: их видно в выводе теста и в отчёте Stage 02.6.
      log(formatSoakMetrics(run));

      expect(run.lifeMetrics).toHaveLength(livesPerUniverse * UNIVERSE_IDS.length * 4);
      expect(new Set(run.lifeMetrics.map((life) => life.universeId))).toEqual(new Set(UNIVERSE_IDS));
      expect(run.aggregate.maxStateBytes).toBeLessThanOrEqual(SOAK_STATE_BYTES_LIMIT);
      expect(run.aggregate.maxima.npcs).toBeLessThanOrEqual(MAX_NPCS);
      expect(run.aggregate.maxima.conditions).toBeLessThanOrEqual(MAX_HEALTH_CONDITIONS);
      expect(run.aggregate.maxima.worldActivities).toBeLessThanOrEqual(MAX_WORLD_ACTIVITIES);
      expect(run.aggregate.maxima.economyYears).toBeLessThanOrEqual(MAX_ECONOMY_YEARS);
      expect(run.aggregate.maxima.locationHistory).toBeLessThanOrEqual(MAX_LOCATION_HISTORY);
      expect(run.aggregate.maxima.socialRelationships).toBeLessThanOrEqual(MAX_RELATIONSHIPS);
      expect(run.aggregate.maxima.socialStories).toBeLessThanOrEqual(MAX_STORY_RECORDS);
      expect(run.aggregate.maxima.chronicle).toBeLessThanOrEqual(MAX_CHRONICLE);

      for (const life of run.lifeMetrics) {
        expect(life.endAge, life.seed).toBeLessThanOrEqual(SOAK_MAX_AGE);
        expect(life.finalWealth, life.seed).toBeGreaterThanOrEqual(0);
        expect(life.finalWealth, life.seed).toBeLessThanOrEqual(WEALTH_MAX);
        expect(life.peakWealth, life.seed).toBeLessThanOrEqual(WEALTH_MAX);
        expect(life.minHealth, life.seed).toBeGreaterThanOrEqual(0);
        expect(life.minHealth, life.seed).toBeLessThanOrEqual(100);
        expect(life.maxConditions, life.seed).toBeLessThanOrEqual(MAX_HEALTH_CONDITIONS);
        expect(life.businessCapitalAtEnd, life.seed).toBeLessThanOrEqual(WEALTH_MAX * MAX_BUSINESSES);
        expect(life.maxBusinessLevel, life.seed).toBeLessThanOrEqual(2);
        expect(life.travelSpend, life.seed).toBeGreaterThanOrEqual(0);
        if (life.everOwned) expect(life.ownHomeAtEnd || life.homeConditionAtEnd >= 0, life.seed).toBe(true);
      }

      // Прогон должен реально задевать все системы Stage 02, а не только «прожить год».
      expect(run.aggregate.everEmployed, "карьера не встретилась").toBeGreaterThan(0);
      expect(run.aggregate.maxWage, "жалованье не встретилось").toBeGreaterThan(0);
      expect(run.aggregate.conditionLives, "болезни и раны не встретились").toBeGreaterThan(0);
      expect(run.aggregate.educationTiers[1]! + run.aggregate.educationTiers[2]! + run.aggregate.educationTiers[3]!, "образование не встретилось").toBeGreaterThan(0);
      expect(run.aggregate.everRented + run.aggregate.everOwned, "жильё не встретилось").toBeGreaterThan(0);
      expect(run.aggregate.businessLives, "своё дело не встретилось").toBeGreaterThan(0);
      expect(run.aggregate.travelLives, "переезды не встретились").toBeGreaterThan(0);

      // Ни одна жизнь не заканчивается «ничем»: смерть до 90 или осознанная остановка на 90.
      for (const life of run.lifeMetrics) {
        if (life.aliveAtEnd) expect(life.endAge).toBe(SOAK_MAX_AGE);
        else expect(life.deathCause, life.seed).not.toBeNull();
      }
    },
    testTimeout
  );

  it("детерминирован: те же seeds, уклады и действия дают те же жизни", () => {
    const options = { livesPerUniverse: 2, universeIds: ["dark-fantasy", "academy"] as const, playbooks: ["scholar", "estate"] as const, maxAge: 70 };
    const first = runStage02Soak(options);
    const second = runStage02Soak(options);
    expect(second.lifeMetrics).toEqual(first.lifeMetrics);
  }, 180_000);
});

describe("Stage 02.6: миграция production-сохранений формата 8", () => {
  it("снимок 8 загружается, доходит до 13, не теряет данные и продолжает жизнь", () => {
    for (const universeId of UNIVERSE_IDS) {
      const before = midLife(universeId);
      const raw = toSchema8(before);
      const original = deepClone(raw);
      const originalBytes = JSON.stringify(raw).length;
      const migrated = parseSave(deepClone(raw));

      expect(migrated.schemaVersion, universeId).toBe(SAVE_SCHEMA_VERSION);
      expect(migrated.seed, universeId).toBe(before.seed);
      expect(migrated.rngState, universeId).toBe(before.rngState);
      expect(migrated.character.name, universeId).toBe(before.character.name);
      expect(migrated.life.age, universeId).toBe(before.life.age);
      expect(migrated.health.value, universeId).toBeGreaterThanOrEqual(0);
      expect(migrated.health.value, universeId).toBeLessThanOrEqual(100);
      expect(migrated.health.conditions, universeId).toEqual([]);
      expect(migrated.education, universeId).toEqual({ currentId: null, startedAt: 0, progress: 0, duration: 0 });
      expect(migrated.household, universeId).toEqual({ residence: "homeless", homeId: null, since: 0, condition: 0, arrears: 0 });
      expect(migrated.business.ventures, universeId).toEqual([]);
      expect(migrated.character.creation, universeId).toBeUndefined();
      expect(settlementSeeds(getUniverse(universeId)).some((seed) => seed.id === migrated.location.settlementId), universeId).toBe(true);

      // Единственное, что добавили миграции, — поля новых систем. Всё прежнее осталось как было.
      const rest = deepClone(migrated) as unknown as Record<string, unknown>;
      delete rest.health;
      delete rest.education;
      delete rest.career;
      delete rest.household;
      delete rest.business;
      delete rest.location;
      delete rest.schemaVersion;
      const originalRest = deepClone(original);
      delete originalRest.schemaVersion;
      expect(rest, universeId).toEqual(originalRest);

      // Состояние не раздувается миграцией и остаётся в том же порядке величины.
      expect(JSON.stringify(migrated).length, universeId).toBeLessThanOrEqual(SOAK_STATE_BYTES_LIMIT);
      expect(JSON.stringify(migrated).length, universeId).toBeLessThan(originalBytes + 8_000);

      // Жизнь продолжается: возраст не идёт назад, версия растёт, сохранение по-прежнему строгое.
      const current = advanceOrChoose(migrated, 16);
      expect(current.version, universeId).toBeGreaterThan(migrated.version);
      expect(current.life.age, universeId).toBeGreaterThanOrEqual(migrated.life.age);
      expect(current.life.age, universeId).toBeLessThanOrEqual(SOAK_MAX_AGE);
      expect(JSON.stringify(current).length, universeId).toBeLessThanOrEqual(SOAK_STATE_BYTES_LIMIT);
      expect(() => parseSave(JSON.parse(JSON.stringify(current))), universeId).not.toThrow();
      if (current.life.alive) expect(educationTier(getUniverse(universeId), current.character), universeId).toBeGreaterThanOrEqual(0);
    }
  }, 120_000);

  it("снимок 8 без мира и social тоже получает поселение и остаётся ограниченным", () => {
    const raw = toSchema8(midLife("xianxia"));
    delete raw.world;
    delete raw.social;
    const migrated = parseSave(deepClone(raw));
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(migrated.location.settlementId).toBe(settlementSeeds(getUniverse("xianxia"))[0]!.id);
    expect(JSON.stringify(migrated).length).toBeLessThanOrEqual(SOAK_STATE_BYTES_LIMIT);
    const next = advanceOrChoose(migrated, 4);
    expect(next.world).toBeDefined();
    expect(() => parseSave(JSON.parse(JSON.stringify(next)))).not.toThrow();
  });

  it("готовые снимки формата 8 читаются, а живые — продолжают год", () => {
    for (const [key, raw] of Object.entries(SAVES_V8)) {
      const migrated = parseSave(deepClone(raw));
      expect(migrated.schemaVersion, key).toBe(SAVE_SCHEMA_VERSION);
      expect(() => parseSave(JSON.parse(JSON.stringify(migrated))), key).not.toThrow();
      if (!migrated.life.alive) continue;
      const next = applyAction(migrated, { type: "advance", years: 1 }).state;
      expect(next.version, key).toBe(migrated.version + 1);
      expect(next.life.age, key).toBeGreaterThanOrEqual(migrated.life.age);
      expect(next.life.age - migrated.life.age, key).toBeLessThanOrEqual(1);
    }
  });

  it("не оставляет формат 8 в сохранении и не принимает будущий формат", () => {
    const state = midLife("hunter");
    const raw = toSchema8(state);
    expect(raw.schemaVersion).toBe(8);
    expect(parseSave(deepClone(raw)).schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(() => parseSave({ ...deepClone(state), schemaVersion: SAVE_SCHEMA_VERSION + 1 })).toThrow();
  });
});
