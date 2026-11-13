// Stage 03.5: длинный прогон рода. CI играет 12 родов (6 миров × 2), полный прогон — 60 родов.
// Род идёт только настоящими действиями: newGame → advance/choose → смерть → succeed с главным
// наследником по закону мира. Никаких синтетических наследников: если законных наследников нет,
// род вымирает, и это видно в метриках.
import { describe, expect, it } from "vitest";
import { MAX_BUSINESSES, MAX_CHRONICLE, MAX_NPCS, UNIVERSE_IDS, WEALTH_MAX } from "../src/index.js";
import {
  assertStage03Inflation,
  DYNASTY_POLICIES,
  formatStage03Soak,
  runDynasty,
  runStage03Soak,
  STAGE03_ESTATE_CAP,
  STAGE03_LIQUID_CAP,
  STAGE03_MAX_RELICS,
  STAGE03_STATE_BYTES_LIMIT,
  STAGE03_TARGET_GENERATIONS
} from "./stage03-soak.js";

/** Node есть в рантайме vitest, но tsconfig пакета намеренно не тянет @types/node. */
const fullSoak = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.ENDEMION_FULL_SOAK === "1";
const dynastiesPerUniverse = fullSoak ? 10 : 2;
const testTimeout = fullSoak ? 900_000 : 180_000;
const log = (line: string): void => {
  const output = (globalThis as { console?: { log: (text: string) => void } }).console;
  output?.log(line);
};

function withoutDuration<T extends { durationMs: number }>(value: T): Omit<T, "durationMs"> {
  const { durationMs: _durationMs, ...rest } = value;
  return rest;
}

describe("Stage 03.5: длинная династия", () => {
  it(
    `играет ${dynastiesPerUniverse * UNIVERSE_IDS.length} родов без порчи, дублей и убегающей инфляции`,
    () => {
      const run = runStage03Soak({ dynastiesPerUniverse });
      // Метрики — часть результата: их видно в выводе теста и в отчёте Stage 03.5.
      log(formatStage03Soak(run));
      const a = run.aggregate;

      expect(run.dynasties).toHaveLength(dynastiesPerUniverse * UNIVERSE_IDS.length);
      expect(new Set(run.dynasties.map((dynasty) => dynasty.universeId))).toEqual(new Set(UNIVERSE_IDS));
      expect(new Set(run.dynasties.map((dynasty) => dynasty.policy))).toEqual(new Set(DYNASTY_POLICIES));
      expect(a.dynasties).toBe(dynastiesPerUniverse * UNIVERSE_IDS.length);
      expect(a.endedAtCap).toBe(0);
      expect(a.targetCohort.dynasties).toBe(a.reachedTarget);
      // Длинный род достижим, но не гарантирован: вымирание — настоящий исход, а не ошибка прогона.
      expect(a.reachedTarget, "ни один род не дошёл до пятого поколения").toBeGreaterThan(0);
      expect(a.extinct, "все роды дожили до цели — прогон не проверяет вымирание").toBeGreaterThan(0);
      expect(a.reachedTarget + a.extinct).toBe(a.dynasties);
      expect(a.maxGeneration).toBeGreaterThanOrEqual(STAGE03_TARGET_GENERATIONS);
      expect(a.totalActions).toBeGreaterThan(a.dynasties * 8);
      expect(Object.keys(a.deathCauses).length).toBeGreaterThan(0);
      // Наследование должно реально задевать дом, сонаследников, вдову и казну, а не только золото.
      expect(a.homeInheritedSuccessions, "дом ни разу не перешёл в натуре").toBeGreaterThan(0);
      expect(a.coheirSuccessions, "сонаследники ни разу не получили долю").toBeGreaterThan(0);
      expect(a.widowSuccessions, "вдова ни разу не получила долю").toBeGreaterThan(0);
      expect(a.levyTotal, "казна ни разу не получила десятину").toBeGreaterThan(0);
      if (fullSoak) {
        // Опека редка; полный прогон обязан её задеть, иначе held-ветка остаётся непроверенной.
        expect(a.minorSuccessions, "опека не встретилась в полном прогоне").toBeGreaterThan(0);
        expect(a.heldSuccessions, "золото под опекой не встретилось в полном прогоне").toBeGreaterThan(0);
        expect(a.heldTotal, "сумма золота под опекой").toBeGreaterThan(0);
      }

      for (const dynasty of run.dynasties) {
        expect(dynasty.generations.length, dynasty.seed).toBe(dynasty.maxGeneration);
        expect(dynasty.targetReached, dynasty.seed).toBe(dynasty.maxGeneration >= STAGE03_TARGET_GENERATIONS);
        if (dynasty.extinct) {
          expect(dynasty.extinctionGeneration, dynasty.seed).toBe(dynasty.maxGeneration);
          expect(dynasty.maxGeneration, dynasty.seed).toBeLessThan(STAGE03_TARGET_GENERATIONS);
        }
        expect(dynasty.finalLiquid, dynasty.seed).toBeGreaterThanOrEqual(0);
        expect(dynasty.finalEstate, dynasty.seed).toBeGreaterThanOrEqual(dynasty.finalLiquid);
        for (const [index, row] of dynasty.generations.entries()) {
          expect(row.generation, dynasty.seed).toBe(index + 1);
          expect(row.endAge, dynasty.seed).toBeGreaterThanOrEqual(row.startAge);
          expect(row.liquidAtEnd, dynasty.seed).toBeGreaterThanOrEqual(0);
          expect(row.liquidAtEnd, dynasty.seed).toBeLessThanOrEqual(WEALTH_MAX);
          expect(row.heldAtEnd, dynasty.seed).toBeGreaterThanOrEqual(0);
          expect(row.estateAtEnd, dynasty.seed).toBeGreaterThanOrEqual(row.liquidAtEnd + row.heldAtEnd);
          expect(row.peakLiquid, dynasty.seed).toBeGreaterThanOrEqual(row.liquidAtEnd + row.heldAtEnd);
          expect(row.businessesAtEnd, dynasty.seed).toBeLessThanOrEqual(MAX_BUSINESSES);
          expect(row.businessCapitalAtEnd, dynasty.seed).toBeGreaterThanOrEqual(0);
          expect(row.relicsAtEnd, dynasty.seed).toBeLessThanOrEqual(STAGE03_MAX_RELICS);
          expect(row.chronicleAtEnd, dynasty.seed).toBeLessThanOrEqual(MAX_CHRONICLE);
          expect(row.npcsAtEnd, dynasty.seed).toBeLessThanOrEqual(MAX_NPCS);
          expect(row.stateBytesAtEnd, dynasty.seed).toBeLessThanOrEqual(STAGE03_STATE_BYTES_LIMIT);
          // Обычная игра не упирается в предел золота: иначе сохранение теряло бы имущество.
          expect(row.capLoss, dynasty.seed).toBe(0);
          if (row.generation === 1) continue;
          if (index === dynasty.generations.length - 1) continue; // последняя жизнь рода не продолжается
          expect(row.inheritanceGold, dynasty.seed).toBeGreaterThanOrEqual(0);
          expect(row.inheritanceHeld, dynasty.seed).toBeGreaterThanOrEqual(0);
          expect(row.levy, dynasty.seed).toBeGreaterThanOrEqual(0);
          expect(row.spouseShare, dynasty.seed).toBeGreaterThanOrEqual(0);
          expect(row.coheirShares, dynasty.seed).toBeGreaterThanOrEqual(0);
          expect(row.heirId, dynasty.seed).not.toBeNull();
          expect(row.heirRelation, dynasty.seed).not.toBeNull();
          expect(row.heirAge, dynasty.seed).not.toBeNull();
        }
      }

      assertStage03Inflation(run);
      expect(a.maxStateBytes).toBeLessThanOrEqual(STAGE03_STATE_BYTES_LIMIT);
      expect(a.maxLiquid).toBeLessThanOrEqual(STAGE03_LIQUID_CAP);
      expect(a.maxEstate).toBeLessThanOrEqual(STAGE03_ESTATE_CAP);
      expect(a.maxNpcs).toBeLessThanOrEqual(MAX_NPCS);
      expect(a.maxChronicle).toBeLessThanOrEqual(MAX_CHRONICLE);

      // Полный прогон обязан задеть длинную династию в каждом из шести миров.
      if (fullSoak) {
        for (const universeId of UNIVERSE_IDS) expect(a.byUniverse[universeId].reachedTarget, universeId).toBeGreaterThan(0);
      }
    },
    testTimeout
  );

  it("детерминирован: тот же seed, salt и выбор действий дают те же метрики рода", () => {
    const options = { targetGenerations: 5, maxAge: 1_100 };
    const first = runDynasty("academy", "lineage", 0, options);
    const second = runDynasty("academy", "lineage", 0, options);
    expect(first.targetReached).toBe(true);
    expect(withoutDuration(second)).toEqual(withoutDuration(first));
    expect(second.generations.map((row) => [row.generation, row.liquidAtEnd, row.estateAtEnd, row.heirId])).toEqual(
      first.generations.map((row) => [row.generation, row.liquidAtEnd, row.estateAtEnd, row.heirId])
    );
    expect(second.predecessorIds).toEqual(first.predecessorIds);
  }, 180_000);
});
