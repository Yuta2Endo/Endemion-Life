// Stage 03.4: шесть законов наследования. Тесты проверяют не только то, что наследование
// заканчивается успехом, но и то, что каждый мир даёт свой порядок, возраст, доли, дом,
// сословие, шкалы, флаги крови и реликвии — и что всё имущество сходится без потерь.
import { describe, expect, it } from "vitest";
import {
  applyAction,
  businessSaleValue,
  businessesOf,
  clamp,
  deepClone,
  getUniverse,
  heirCandidates,
  INHERITANCE_LAWS,
  newBusinessState,
  newHouseholdState,
  parseSave,
  presentHeirs,
  presentLegacy,
  presentLineage,
  propertiesOf,
  SAVE_SCHEMA_VERSION,
  saleValue,
  SELF_ID,
  stageForAge,
  succeed,
  t,
  UNIVERSE_IDS,
  WEALTH_MAX,
  lifespanOf,
  type GameState,
  type HeirCandidate,
  type HeirOrder,
  type NpcState,
  type UniverseId
} from "../src/index.js";
import { createNpc, type NpcContext } from "../src/character/npcs.js";
import type { EngineContext } from "../src/engine/context.js";
import { finishLife, lineageYearly } from "../src/legacy/lineage.js";
import { findRelic } from "../src/legacy/stories.js";
import { Rng } from "../src/rng.js";
import { choiceIds, start } from "./helpers.js";

interface BloodFlagCase {
  flag: string;
  chance: number;
}

interface LawCase {
  order: HeirOrder;
  controlAge: number;
  regency: boolean;
  levy: number;
  spouseShare: number;
  adoptedClass: boolean;
  /** Дом переходит в натуре только главному взрослому наследнику; у равного раздела — никогда */
  home: "primary" | "never";
  highClass: string;
  lowClass: string;
  nonHereditaryClass: string;
  bloodFlags: readonly BloodFlagCase[];
  meterCarry: Readonly<Record<string, number>>;
  relic: string;
  /** Кого ставит первым один и тот же синтетический род: сильный средний ребёнок и высокое отношение младшего */
  matrixPrimary: number;
}

/**
 * Ожидаемая матрица шести законов. Значения намеренно записаны явно, а не выведены из laws.ts:
 * если закон случайно изменят, тест должен это заметить, а не подстроиться.
 */
const CASE = {
  "dark-fantasy": {
    order: "eldest",
    controlAge: 16,
    regency: true,
    levy: 0.1,
    spouseShare: 0.1,
    adoptedClass: false,
    home: "primary",
    highClass: "nobility",
    lowClass: "townsfolk",
    nonHereditaryClass: "clergy",
    bloodFlags: [{ flag: "mist-mark", chance: 0.3 }],
    meterCarry: { corruption: 0.2, ember: 0.3 },
    relic: "ancestral-blade",
    matrixPrimary: 0
  },
  isekai: {
    order: "equal",
    controlAge: 15,
    regency: false,
    levy: 0.08,
    spouseShare: 0.25,
    adoptedClass: true,
    home: "never",
    highClass: "gentry",
    lowClass: "commoner",
    nonHereditaryClass: "hero",
    bloodFlags: [],
    meterCarry: { "system-favor": 0 },
    relic: "system-crystal",
    matrixPrimary: 0
  },
  murim: {
    order: "merit",
    controlAge: 16,
    regency: false,
    levy: 0.15,
    spouseShare: 0.15,
    adoptedClass: true,
    home: "primary",
    highClass: "clan",
    lowClass: "commoner",
    nonHereditaryClass: "sect-elder",
    bloodFlags: [{ flag: "martial-school", chance: 0.6 }],
    meterCarry: { "qi-deviation": 0 },
    relic: "clan-scroll",
    matrixPrimary: 2
  },
  xianxia: {
    order: "merit",
    controlAge: 12,
    regency: true,
    levy: 0.25,
    spouseShare: 0.1,
    adoptedClass: false,
    home: "primary",
    highClass: "clan-scion",
    lowClass: "mortal",
    nonHereditaryClass: "elder",
    bloodFlags: [{ flag: "spirit-root", chance: 0.55 }],
    meterCarry: { "dao-heart": 0, "karmic-debt": 0.5 },
    relic: "spirit-root-amulet",
    matrixPrimary: 2
  },
  hunter: {
    order: "chosen",
    controlAge: 18,
    regency: false,
    levy: 0.2,
    spouseShare: 0.5,
    adoptedClass: true,
    home: "primary",
    highClass: "hunter-clan",
    lowClass: "underclass",
    nonHereditaryClass: "national-hunter",
    bloodFlags: [{ flag: "awakened", chance: 0.25 }],
    meterCarry: { "gate-threat": 1, fame: 0.1 },
    relic: "gate-hunter-badge",
    matrixPrimary: 1
  },
  academy: {
    order: "eldest",
    controlAge: 16,
    regency: true,
    levy: 0.05,
    spouseShare: 0.1,
    adoptedClass: false,
    home: "primary",
    highClass: "high-noble",
    lowClass: "commoner",
    nonHereditaryClass: "service",
    bloodFlags: [{ flag: "noble-blood", chance: 0.5 }],
    meterCarry: { "court-favor": 0.5, scandal: 0.5 },
    relic: "noble-signet",
    matrixPrimary: 0
  }
} satisfies Record<UniverseId, LawCase>;

interface FamilyOptions {
  ages: readonly number[];
  widow?: boolean;
  deadAge?: number;
  deadClassId?: string;
  childClassId?: string;
  adopted?: readonly boolean[];
  power?: readonly number[];
  affinity?: readonly number[];
  careerRank?: readonly number[];
  educationTier?: readonly number[];
  flags?: readonly string[];
  meters?: Readonly<Record<string, number>>;
  wealth?: number;
}

interface Family {
  dead: GameState;
  children: NpcState[];
  widow?: NpcState;
}

function engineCtx(state: GameState, tag: string): EngineContext {
  return { state, rng: Rng.fromSeed(`stage-03-4-${tag}`, "life"), universe: getUniverse(state.character.universeId), changes: [] };
}

function npcCtx(state: GameState, tag: string): NpcContext {
  return { state, rng: Rng.fromSeed(`stage-03-4-${tag}`, "npc"), universe: getUniverse(state.character.universeId) };
}

function childAt(children: readonly NpcState[], index: number): NpcState {
  const child = children[index];
  if (!child) throw new Error(`фикстура: нет ребёнка ${index}`);
  return child;
}

function candidateById(candidates: readonly HeirCandidate[], id: string): HeirCandidate {
  const candidate = candidates.find((item) => item.npc.id === id);
  if (!candidate) throw new Error(`фикстура: нет наследника ${id}`);
  return candidate;
}

/** Все люди, кроме управляемой семьи, мертвы: так в кандидатах остаются только нужные дети */
function retireOthers(state: GameState, keep: ReadonlySet<string>): void {
  for (const npc of state.npcs) {
    if (keep.has(npc.id)) continue;
    npc.alive = false;
    npc.status = "deceased";
    npc.diedAt = Math.max(0, state.life.age - 1);
    npc.cause = "unknown";
    npc.spouseId = null;
  }
}

/**
 * Детерминированная семья: мёртвый персонаж, дети заданных возрастов и, при желании, вдова.
 * Люди создаются производственным createNpc, а не выдуманными объектами; состояния проходят parseSave.
 */
function family(universeId: UniverseId, options: FamilyOptions): Family {
  const dead = deepClone(start({ seed: `stage-03-4-base-${universeId}`, universeId }));
  if (options.deadClassId) dead.character.socialClassId = options.deadClassId;
  const deadAge = options.deadAge ?? Math.max(55, Math.max(...options.ages) + 20);
  for (const npc of dead.npcs) {
    if (npc.spouseId !== SELF_ID) continue;
    npc.spouseId = null;
    if (!npc.formerSpouses.includes(SELF_ID)) npc.formerSpouses.push(SELF_ID);
  }
  dead.life = {
    age: deadAge,
    stage: stageForAge(deadAge, lifespanOf(dead.character)),
    alive: false,
    deathAge: deadAge,
    deathCause: t("Старость", "Old age")
  };
  dead.household = newHouseholdState(deadAge);
  dead.business = newBusinessState();
  dead.character.wealth = options.wealth ?? 0;
  if (options.meters) dead.meters = { ...dead.meters, ...options.meters };
  if (options.flags) dead.flags = [...dead.flags, ...options.flags];

  const children: NpcState[] = [];
  for (const [index, age] of options.ages.entries()) {
    const child = createNpc(npcCtx(dead, `child-${index}`), "child", {
      age,
      parents: [SELF_ID],
      power: options.power?.[index],
      affinity: options.affinity?.[index],
      socialClassId: options.childClassId
    });
    child.adopted = options.adopted?.[index] ?? false;
    child.wealth = 5;
    const careerRank = options.careerRank?.[index];
    if (careerRank !== undefined) child.careerRank = careerRank;
    const educationTier = options.educationTier?.[index];
    if (educationTier !== undefined) child.educationTier = educationTier;
    children.push(child);
  }

  let widow: NpcState | undefined;
  if (options.widow !== false) {
    widow = createNpc(npcCtx(dead, "widow"), "spouse", { age: Math.max(18, deadAge - 3), affinity: 60 });
    widow.spouseId = null;
    widow.formerSpouses = [SELF_ID];
    widow.log = [{ at: deadAge, kind: "widowed", value: SELF_ID }];
    widow.wealth = 7;
  }

  retireOthers(dead, new Set([...children.map((child) => child.id), ...(widow ? [widow.id] : [])]));
  finishLife(engineCtx(dead, "finish"));
  return { dead, children, widow };
}

/** Хозяйство: золото, родовой дом в хорошем состоянии и до двух дел из каталога мира */
function withEstate(dead: GameState, options: { liquid?: number; home?: boolean; businesses?: number } = {}): void {
  const universeId = dead.character.universeId;
  dead.character.wealth = options.liquid ?? 300;
  if (options.home === false) {
    dead.household = newHouseholdState(dead.life.age);
  } else {
    const house = propertiesOf(universeId).find((property) => property.id.endsWith("home-large"));
    if (!house) throw new Error(`фикстура: нет большого дома в ${universeId}`);
    dead.household = { residence: "own", homeId: house.id, since: 0, condition: 60, arrears: 0 };
  }
  const ventures = businessesOf(universeId).slice(0, options.businesses ?? 0);
  dead.business = {
    ventures: ventures.map((venture) => ({
      id: venture.id,
      foundedAge: 20,
      level: 0,
      capital: venture.capital,
      years: 5,
      losses: 0,
      lastNet: 4
    }))
  };
}

function relicOf(id: string) {
  const definition = findRelic(id);
  if (!definition) throw new Error(`фикстура: нет реликвии ${id}`);
  return { id: definition.id, name: definition.name, description: definition.description, acquiredGen: 1, acquiredAge: 20, source: "stage-03-4" };
}

function sumShares(record: NonNullable<GameState["lineage"]["inheritance"]>): number {
  return record.shares.reduce((sum, share) => sum + share.amount, 0);
}

/** Сохранение остаётся формата 14 и переживает JSON-обход без потери записи о наследстве */
function expectValidSave(state: GameState): GameState {
  expect(state.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
  expect(SAVE_SCHEMA_VERSION).toBe(14);
  const restored = parseSave(deepClone(state));
  expect(restored.schemaVersion).toBe(14);
  expect(restored.lineage.inheritance).toEqual(state.lineage.inheritance);
  return restored;
}

function standing(universeId: UniverseId, classId: string): number {
  return getUniverse(universeId).socialClasses.find((socialClass) => socialClass.id === classId)?.standing ?? 0;
}

describe("Stage 03.4: матрица законов", () => {
  it.each(UNIVERSE_IDS)("%s: закон объявляет ожидаемые порядок, возраст, сбор и опеку", (universeId) => {
    const expected = CASE[universeId];
    const law = INHERITANCE_LAWS[universeId];
    expect(law.order).toBe(expected.order);
    expect(law.controlAge).toBe(expected.controlAge);
    expect(law.regency).toBe(expected.regency);
    expect(law.levy).toBe(expected.levy);
    expect(law.spouseShare).toBe(expected.spouseShare);
    expect(law.adoptedClass).toBe(expected.adoptedClass);
    expect(law.bloodFlags).toEqual(expected.bloodFlags);
    expect(law.meterCarry).toEqual(expected.meterCarry);
    expect(law.hereditary).toContain(expected.highClass);
    expect(law.hereditary).not.toContain(expected.nonHereditaryClass);
    expect(standing(universeId, expected.highClass)).toBeGreaterThan(standing(universeId, expected.lowClass));
    expect(standing(universeId, expected.nonHereditaryClass)).toBeGreaterThan(standing(universeId, expected.lowClass));
  });

  it("шесть законов дают шесть разных правовых профилей, а не один и тот же исход", () => {
    const profiles = UNIVERSE_IDS.map((universeId) => {
      const law = INHERITANCE_LAWS[universeId];
      return JSON.stringify({
        order: law.order,
        controlAge: law.controlAge,
        regency: law.regency,
        levy: law.levy,
        spouseShare: law.spouseShare,
        adoptedClass: law.adoptedClass,
        hereditary: law.hereditary,
        bloodFlags: law.bloodFlags,
        meterCarry: law.meterCarry
      });
    });
    expect(new Set(profiles).size).toBe(UNIVERSE_IDS.length);
    // Два мира могут делить порядок, но не весь профиль: у первородства разные десятины и шкалы,
    // у merit-законов разный возраст и доля секты.
    expect(INHERITANCE_LAWS["dark-fantasy"].order).toBe(INHERITANCE_LAWS.academy.order);
    expect(INHERITANCE_LAWS["dark-fantasy"].levy).not.toBe(INHERITANCE_LAWS.academy.levy);
    expect(INHERITANCE_LAWS.murim.order).toBe(INHERITANCE_LAWS.xianxia.order);
    expect(INHERITANCE_LAWS.murim.controlAge).not.toBe(INHERITANCE_LAWS.xianxia.controlAge);
    expect(INHERITANCE_LAWS.isekai.order).toBe("equal");
    expect(INHERITANCE_LAWS.hunter.order).toBe("chosen");
  });
});

describe("Stage 03.4: порядок наследников", () => {
  it("dark-fantasy и academy: первый — старший взрослый, даже если младший сильнее и образованнее", () => {
    for (const universeId of ["dark-fantasy", "academy"] as const) {
      const { dead, children } = family(universeId, {
        ages: [30, 24, 18],
        power: [5, 50, 95],
        careerRank: [0, 1, 3],
        educationTier: [0, 1, 3]
      });
      const candidates = heirCandidates(dead);
      const primary = candidates.find((candidate) => candidate.primary);
      expect(primary, universeId).toBeDefined();
      expect(primary!.npc.id).toBe(childAt(children, 0).id);
      expect(primary!.age).toBe(30);
      expect(primary!.regency).toBe(false);

      const younger = candidateById(candidates, childAt(children, 2).id);
      expect(younger.available).toBe(true);
      expect(younger.primary).toBe(false);
      const { state } = succeed(dead, younger.npc.id, "order-eldest-alt");
      expect(state.life.age).toBe(18);
      expect(state.lineage.inheritance!.relation).toBe("child");
      expectValidSave(state);
    }
  });

  it("murim и xianxia: первый — сильнейший по merit, даже если он младший", () => {
    for (const universeId of ["murim", "xianxia"] as const) {
      const { dead, children } = family(universeId, {
        ages: [30, 24, 18],
        power: [5, 50, 95],
        careerRank: [0, 1, 3],
        educationTier: [0, 1, 3]
      });
      const candidates = heirCandidates(dead);
      const primary = candidates.find((candidate) => candidate.primary);
      expect(primary, universeId).toBeDefined();
      expect(primary!.npc.id).toBe(childAt(children, 2).id);
      expect(primary!.npc.power).toBe(95);
      expect(primary!.age).toBe(18);

      const weakest = candidateById(candidates, childAt(children, 0).id);
      expect(weakest.primary).toBe(false);
      expect(weakest.available).toBe(true);
      const { state } = succeed(dead, weakest.npc.id, "order-merit-alt");
      expect(state.life.age).toBe(30);
      expect(state.lineage.inheritance!.relation).toBe("child");
      expectValidSave(state);
    }
  });

  it("isekai: первый — старший доступный, а доли всех детей равны в пределах округления", () => {
    const { dead, children } = family("isekai", { ages: [30, 24, 18], power: [95, 5, 50] });
    const candidates = heirCandidates(dead);
    const primary = candidates.find((candidate) => candidate.primary);
    expect(primary).toBeDefined();
    expect(primary!.npc.id).toBe(childAt(children, 0).id);
    const wealths = children.map((child) => candidateById(candidates, child.id).wealth);
    expect(Math.max(...wealths) - Math.min(...wealths)).toBeLessThanOrEqual(1);
    expect(primary!.wealth).toBe(Math.max(...wealths));

    const middle = candidateById(candidates, childAt(children, 1).id);
    expect(middle.primary).toBe(false);
    const { state } = succeed(dead, middle.npc.id, "order-equal-alt");
    const record = state.lineage.inheritance!;
    const total = record.assets!.total;
    const levy = Math.round(total * INHERITANCE_LAWS.isekai.levy);
    const spouse = Math.round((total - levy) * INHERITANCE_LAWS.isekai.spouseShare);
    expect(levy + spouse + record.wealth + sumShares(record)).toBe(total);
    expectValidSave(state);
  });

  it("hunter: первый — самый близкий по отношениям, а не старший и не сильнейший", () => {
    const { dead, children } = family("hunter", {
      ages: [30, 24, 18],
      power: [95, 5, 50],
      affinity: [10, 90, 20]
    });
    const candidates = heirCandidates(dead);
    const primary = candidates.find((candidate) => candidate.primary);
    expect(primary).toBeDefined();
    expect(primary!.npc.id).toBe(childAt(children, 1).id);
    expect(primary!.npc.affinity).toBe(90);
    expect(primary!.age).toBe(24);

    const eldest = candidateById(candidates, childAt(children, 0).id);
    expect(eldest.primary).toBe(false);
    expect(eldest.available).toBe(true);
    const { state } = succeed(dead, eldest.npc.id, "order-chosen-alt");
    expect(state.life.age).toBe(30);
    expect(state.lineage.inheritance!.relation).toBe("child");
    expect(state.lineage.inheritance!.law).toBe(INHERITANCE_LAWS.hunter.id);
    expectValidSave(state);
  });
});

describe("Stage 03.4: возраст, опека и регентство", () => {
  it("isekai, murim и hunter: несовершеннолетний заперт, даже если он сильнее или ближе", () => {
    for (const universeId of ["isekai", "murim", "hunter"] as const) {
      const expected = CASE[universeId];
      const minorAge = expected.controlAge - 2;
      const { dead, children } = family(universeId, {
        ages: [minorAge, 22],
        power: [95, 10],
        affinity: [95, 10]
      });
      const candidates = heirCandidates(dead);
      const minor = candidateById(candidates, childAt(children, 0).id);
      expect(minor.age, universeId).toBe(minorAge);
      expect(minor.available).toBe(false);
      expect(minor.locked).not.toBeNull();
      expect(minor.locked!.ru.length).toBeGreaterThan(0);
      expect(minor.locked!.en.length).toBeGreaterThan(0);
      expect(minor.regency).toBe(false);
      expect(minor.primary).toBe(false);
      expect(() => succeed(dead, minor.npc.id, "locked-minor")).toThrow(expect.objectContaining({ code: "HEIR_LOCKED" }));

      const view = presentHeirs(dead).find((heir) => heir.id === minor.npc.id);
      expect(view).toBeDefined();
      expect(view!.available).toBe(false);
      expect(view!.locked?.ru).toBeTruthy();
      expect(view!.locked?.en).toBeTruthy();

      const primary = candidates.find((candidate) => candidate.primary);
      expect(primary!.npc.id, universeId).toBe(childAt(children, 1).id);
      const { state } = succeed(dead, primary!.npc.id, "adult-only");
      expect(state.life.age).toBe(22);
      expectValidSave(state);
    }
  });

  it("dark-fantasy, xianxia и academy: младший доступен, но золото держит опекун", () => {
    for (const universeId of ["dark-fantasy", "xianxia", "academy"] as const) {
      const expected = CASE[universeId];
      const minorAge = expected.controlAge - 2;
      const { dead, children, widow } = family(universeId, { ages: [minorAge], wealth: 300 });
      withEstate(dead, { liquid: 300, home: true });
      const candidates = heirCandidates(dead);
      const minor = candidateById(candidates, childAt(children, 0).id);
      expect(minor.available, universeId).toBe(true);
      expect(minor.locked).toBeNull();
      expect(minor.regency).toBe(true);
      expect(minor.primary).toBe(true);
      expect(minor.age).toBe(minorAge);

      const claim = minor.wealth;
      const ownWealth = childAt(children, 0).wealth;
      expect(claim).toBeGreaterThan(0);
      const { state } = succeed(dead, minor.npc.id, "regency-minor");
      const record = state.lineage.inheritance!;
      expect(record.controlAge).toBe(expected.controlAge);
      expect(record.guardianName).toBe(widow!.name);
      expect(record.held).toBe(claim);
      expect(record.wealth).toBe(claim);
      expect(record.homeInherited).toBe(false);
      expect(state.household.residence).not.toBe("own");
      expect(state.character.wealth).toBe(ownWealth);
      expect(state.life.age).toBe(minorAge);

      // Всё имущество, включая проданный дом, сходится в долях и опеке
      const total = record.assets!.total;
      const levy = Math.round(total * expected.levy);
      const spouse = Math.round((total - levy) * expected.spouseShare);
      expect(levy + spouse + record.wealth + sumShares(record)).toBe(total);
      expect(record.assets!.home).not.toBeNull();
      expectValidSave(state);

      // Прямой вызов производственного годового правила: опека кончается ровно в controlAge
      const released = deepClone(state);
      released.life.age = expected.controlAge;
      const before = released.character.wealth;
      const held = released.lineage.inheritance!.held;
      lineageYearly(engineCtx(released, "release-direct"), () => {});
      expect(released.lineage.inheritance!.held).toBe(0);
      expect(released.character.wealth).toBe(before + held);
      expect(released.lineage.chronicle.some((entry) => entry.kind === "inheritance" && entry.v.regency === 1)).toBe(true);

      // Обычный ход жизни тоже освобождает опеку. События могут тратить золото,
      // поэтому здесь проверяется именно факт передачи, а не точная сумма.
      let life = state;
      for (let step = 0; step < 30 && life.life.alive && life.life.age < expected.controlAge; step++) {
        life = applyAction(life, life.pending ? { type: "choose", choiceId: choiceIds(life)[0]! } : { type: "advance" }).state;
      }
      expect(life.life.alive, universeId).toBe(true);
      expect(life.life.age).toBeGreaterThanOrEqual(expected.controlAge);
      expect(life.lineage.inheritance!.held).toBe(0);
    }
  });

  it("dark-fantasy и academy: младший не первый, но всё равно выбирается под опекой", () => {
    for (const universeId of ["dark-fantasy", "academy"] as const) {
      const { dead, children } = family(universeId, { ages: [20, 10], wealth: 300 });
      const candidates = heirCandidates(dead);
      const primary = candidates.find((candidate) => candidate.primary);
      expect(primary!.npc.id).toBe(childAt(children, 0).id);
      const minor = candidateById(candidates, childAt(children, 1).id);
      expect(minor.primary).toBe(false);
      expect(minor.available).toBe(true);
      expect(minor.regency).toBe(true);
      const { state } = succeed(dead, minor.npc.id, "regency-not-primary");
      expect(state.life.age).toBe(10);
      expect(state.lineage.inheritance!.held).toBeGreaterThan(0);
      expect(state.lineage.inheritance!.guardianName).toBeTruthy();
      expectValidSave(state);
    }
  });

  it.each(UNIVERSE_IDS)("%s: ровно с controlAge опека уже не нужна", (universeId) => {
    const expected = CASE[universeId];
    const { dead, children } = family(universeId, { ages: [expected.controlAge], wealth: 100 });
    const candidates = heirCandidates(dead);
    const candidate = candidateById(candidates, childAt(children, 0).id);
    expect(candidate.available).toBe(true);
    expect(candidate.regency).toBe(false);
    const { state } = succeed(dead, candidate.npc.id, "adult-age");
    const record = state.lineage.inheritance!;
    expect(record.held).toBe(0);
    expect(record.guardianName).toBeNull();
    expect(state.character.wealth).toBe(childAt(children, 0).wealth + record.wealth);
    expectValidSave(state);
  });
});

describe("Stage 03.4: доли, имущество и дом", () => {
  it.each(UNIVERSE_IDS)("%s: сбор, доля супруга, доля наследника и сонаследников дают всё имущество", (universeId) => {
    const expected = CASE[universeId];
    const { dead, children, widow } = family(universeId, { ages: [30, 24, 18] });
    withEstate(dead, { liquid: 300, home: true, businesses: 2 });
    const candidates = heirCandidates(dead);
    const primary = candidates.find((candidate) => candidate.primary);
    expect(primary, universeId).toBeDefined();
    expect(primary!.age).toBeGreaterThanOrEqual(expected.controlAge);

    const homeValue = saleValue(dead);
    const businessValues = dead.business.ventures.map((venture) => ({ id: venture.id, value: businessSaleValue(dead, venture) }));
    const total = 300 + homeValue + businessValues.reduce((sum, business) => sum + business.value, 0);
    const widowBefore = widow!.wealth;
    const ownWealth = primary!.npc.wealth;
    const otherChildren = children.filter((child) => child.id !== primary!.npc.id).map((child) => child.id).sort();

    const { state } = succeed(dead, primary!.npc.id, "estate-conservation");
    const record = state.lineage.inheritance!;
    expect(record.law).toBe(INHERITANCE_LAWS[universeId].id);
    expect(record.controlAge).toBe(expected.controlAge);
    expect(record.assets).toEqual({
      liquid: 300,
      home: { id: propertiesOf(universeId).find((property) => property.id.endsWith("home-large"))!.id, value: homeValue },
      businesses: businessValues,
      total
    });
    expect(record.assets!.total).toBe(total);

    const levy = Math.round(total * expected.levy);
    const spouse = Math.round((total - levy) * expected.spouseShare);
    const rest = total - levy - spouse;
    const homeInKind = record.homeInherited ? homeValue : 0;
    const selectedGold = record.wealth + homeInKind;
    const coheirGold = sumShares(record);
    expect(levy + spouse + selectedGold + coheirGold).toBe(total);
    expect(selectedGold + coheirGold).toBe(rest);
    expect(record.shares).toHaveLength(2);
    expect(record.shares.every((share) => share.amount > 0)).toBe(true);
    expect(record.shares.map((share) => share.npcId).sort()).toEqual(otherChildren);
    expect(state.npcs.find((npc) => npc.id === widow!.id)!.wealth).toBe(widowBefore + spouse);

    // Дом: только главному взрослому по неэгалитарному закону и только если его доля покрывает стоимость
    expect(record.homeInherited).toBe(expected.home === "primary");
    if (record.homeInherited) {
      expect(state.household).toEqual({
        residence: "own",
        homeId: record.assets!.home!.id,
        since: primary!.age,
        condition: 60,
        arrears: 0
      });
      expect(record.wealth).toBe(selectedGold - homeValue);
    } else {
      expect(state.household.residence).not.toBe("own");
      expect(record.wealth).toBe(selectedGold);
    }
    expect(record.ownWealth).toBe(ownWealth);
    expect(state.character.wealth).toBe(ownWealth + record.wealth);
    expect(state.character.wealth).toBeLessThanOrEqual(WEALTH_MAX);
    expect(record.wealth).toBeLessThanOrEqual(WEALTH_MAX);
    expect(selectedGold).toBeLessThanOrEqual(WEALTH_MAX);
    expect(coheirGold).toBeLessThanOrEqual(WEALTH_MAX);
    expect(primary!.wealth).toBe(selectedGold);
    expectValidSave(state);
    expect(presentLegacy(state).inheritance!.assets!.total).toBe(total);
    expect(presentLegacy(state).inheritance!.homeInherited).toBe(record.homeInherited);
  });

  it("дом продаётся, если главная доля меньше его стоимости", () => {
    const { dead } = family("dark-fantasy", { ages: [30, 24, 18] });
    withEstate(dead, { liquid: 0, home: true, businesses: 0 });
    const candidates = heirCandidates(dead);
    const primary = candidates.find((candidate) => candidate.primary)!;
    const homeValue = saleValue(dead);
    expect(primary.wealth).toBeLessThan(homeValue);

    const { state } = succeed(dead, primary.npc.id, "home-too-expensive");
    const record = state.lineage.inheritance!;
    expect(record.assets!.home).not.toBeNull();
    expect(record.homeInherited).toBe(false);
    expect(state.household.residence).not.toBe("own");
    expect(record.wealth).toBe(primary.wealth);
    const total = record.assets!.total;
    const levy = Math.round(total * CASE["dark-fantasy"].levy);
    const spouse = Math.round((total - levy) * CASE["dark-fantasy"].spouseShare);
    expect(levy + spouse + record.wealth + sumShares(record)).toBe(total);
    expectValidSave(state);
  });

  it("hunter: выбранный первый взрослый сохраняет дом, выбранный другой взрослый — продаёт", () => {
    const { dead, children } = family("hunter", {
      ages: [30, 24, 18],
      power: [95, 5, 50],
      affinity: [10, 90, 20]
    });
    withEstate(dead, { liquid: 300, home: true, businesses: 1 });
    const candidates = heirCandidates(dead);
    const primary = candidates.find((candidate) => candidate.primary)!;
    expect(primary.npc.id).toBe(childAt(children, 1).id);
    const eldest = candidateById(candidates, childAt(children, 0).id);
    expect(eldest.available).toBe(true);
    expect(eldest.primary).toBe(false);

    const kept = succeed(dead, primary.npc.id, "hunter-home-primary").state;
    expect(kept.lineage.inheritance!.homeInherited).toBe(true);
    expect(kept.household.residence).toBe("own");

    const sold = succeed(dead, eldest.npc.id, "hunter-home-alt").state;
    expect(sold.lineage.inheritance!.homeInherited).toBe(false);
    expect(sold.household.residence).not.toBe("own");
    expect(sold.lineage.inheritance!.assets!.home).not.toBeNull();
    const total = sold.lineage.inheritance!.assets!.total;
    const levy = Math.round(total * CASE.hunter.levy);
    const spouse = Math.round((total - levy) * CASE.hunter.spouseShare);
    expect(levy + spouse + sold.lineage.inheritance!.wealth + sumShares(sold.lineage.inheritance!)).toBe(total);
    expectValidSave(kept);
    expectValidSave(sold);
  });

  it("isekai: равный раздел всегда продаёт дом, даже если доля могла бы его покрыть", () => {
    const { dead } = family("isekai", { ages: [30, 24, 18] });
    withEstate(dead, { liquid: 1000, home: true, businesses: 0 });
    const primary = heirCandidates(dead).find((candidate) => candidate.primary)!;
    const homeValue = saleValue(dead);
    expect(primary.wealth).toBeGreaterThan(homeValue);

    const { state } = succeed(dead, primary.npc.id, "isekai-never-home");
    const record = state.lineage.inheritance!;
    expect(record.homeInherited).toBe(false);
    expect(state.household.residence).not.toBe("own");
    expect(record.wealth).toBe(primary.wealth);
    expect(record.assets!.home).not.toBeNull();
    expectValidSave(state);
  });

  it("золото под опекой не исчезает, если наследник умирает до controlAge", () => {
    const { dead, children } = family("dark-fantasy", { ages: [10, 20], wealth: 300 });
    const minor = childAt(children, 0);
    const sibling = childAt(children, 1);

    const first = succeed(dead, minor.id, "held-chain-first").state;
    const held = first.lineage.inheritance!.held;
    expect(held).toBeGreaterThan(0);
    expect(first.character.wealth).toBe(minor.wealth);
    const siblingAfterFirst = first.npcs.find((npc) => npc.id === sibling.id);
    expect(siblingAfterFirst).toBeDefined();

    const afterDeath = deepClone(first);
    afterDeath.life = {
      ...afterDeath.life,
      alive: false,
      deathAge: afterDeath.life.age,
      deathCause: t("Болезнь", "Illness")
    };
    finishLife(engineCtx(afterDeath, "held-chain-finish"));
    expect(afterDeath.lineage.inheritance!.held).toBe(held);

    const second = succeed(afterDeath, sibling.id, "held-chain-second");
    const record = second.state.lineage.inheritance!;
    const expectedLiquid = first.character.wealth + held;
    expect(record.assets!.liquid).toBe(expectedLiquid);
    expect(record.assets!.total).toBe(expectedLiquid);
    expect(second.state.character.wealth).toBe(siblingAfterFirst!.wealth + record.wealth);
    expect(second.state.character.wealth).toBeLessThanOrEqual(WEALTH_MAX);
    expectValidSave(second.state);
  });
});

describe("Stage 03.4: сословие", () => {
  it.each(UNIVERSE_IDS)("%s: родовое сословие переходит, личное — нет, приёмный — по adoptedClass", (universeId) => {
    const expected = CASE[universeId];

    const natural = family(universeId, { ages: [30], deadClassId: expected.highClass, childClassId: expected.lowClass });
    const naturalCandidate = candidateById(heirCandidates(natural.dead), childAt(natural.children, 0).id);
    expect(naturalCandidate.natural).toBe(true);
    expect(naturalCandidate.classInherited).toBe(true);
    const naturalState = succeed(natural.dead, naturalCandidate.npc.id, "class-natural").state;
    expect(naturalState.character.socialClassId).toBe(expected.highClass);
    expect(naturalState.lineage.inheritance!.socialClassId).toBe(expected.highClass);
    expect(naturalState.lineage.inheritance!.classInherited).toBe(true);
    expectValidSave(naturalState);

    const adopted = family(universeId, { ages: [30], deadClassId: expected.highClass, childClassId: expected.lowClass, adopted: [true] });
    const adoptedCandidate = candidateById(heirCandidates(adopted.dead), childAt(adopted.children, 0).id);
    expect(adoptedCandidate.natural).toBe(false);
    expect(adoptedCandidate.classInherited).toBe(expected.adoptedClass);
    const adoptedState = succeed(adopted.dead, adoptedCandidate.npc.id, "class-adopted").state;
    expect(adoptedState.character.socialClassId).toBe(expected.adoptedClass ? expected.highClass : expected.lowClass);
    expect(adoptedState.lineage.inheritance!.classInherited).toBe(expected.adoptedClass);
    expect(adoptedState.lineage.inheritance!.flags).toEqual([]);

    const personal = family(universeId, { ages: [30], deadClassId: expected.nonHereditaryClass, childClassId: expected.lowClass });
    const personalCandidate = candidateById(heirCandidates(personal.dead), childAt(personal.children, 0).id);
    expect(personalCandidate.classInherited).toBe(false);
    const personalState = succeed(personal.dead, personalCandidate.npc.id, "class-personal").state;
    expect(personalState.character.socialClassId).toBe(expected.lowClass);
    expect(personalState.lineage.inheritance!.socialClassId).toBe(expected.lowClass);
    expect(personalState.lineage.inheritance!.classInherited).toBe(false);
    expectValidSave(personalState);
  });
});

describe("Stage 03.4: шкалы мира и кровь", () => {
  it.each(UNIVERSE_IDS)("%s: meterCarry масштабирует отклонение шкалы, а не копирует её", (universeId) => {
    const expected = CASE[universeId];
    const universe = getUniverse(universeId);
    const lowValues = Object.fromEntries(universe.meters.map((meter) => [meter.id, Math.min(meter.max, meter.initial + 20)]));
    const highValues = Object.fromEntries(universe.meters.map((meter) => [meter.id, Math.min(meter.max, meter.initial + 60)]));

    const run = (values: Readonly<Record<string, number>>): GameState => {
      const { dead, children } = family(universeId, { ages: [30], meters: values });
      return succeed(dead, childAt(children, 0).id, `meters-${universeId}`).state;
    };
    const low = run(lowValues);
    const high = run(highValues);
    const carries: Readonly<Record<string, number>> = expected.meterCarry;
    expect(low.character.originId).toBe(high.character.originId);
    for (const meter of universe.meters) {
      const carry = carries[meter.id] ?? 0;
      const own = universe.originProfiles[low.character.originId]?.meters?.[meter.id] ?? meter.initial;
      const expectedLow = clamp(Math.round(own + (lowValues[meter.id]! - meter.initial) * carry), meter.min, meter.max);
      const expectedHigh = clamp(Math.round(own + (highValues[meter.id]! - meter.initial) * carry), meter.min, meter.max);
      expect(low.meters[meter.id], `${universeId}:${meter.id}:low`).toBe(expectedLow);
      expect(high.meters[meter.id], `${universeId}:${meter.id}:high`).toBe(expectedHigh);
      const delta = high.meters[meter.id]! - low.meters[meter.id]!;
      expect(delta, `${universeId}:${meter.id}:delta`).toBe(Math.round((highValues[meter.id]! - lowValues[meter.id]!) * carry));
      if (carry === 0) expect(delta).toBe(0);
      if (carry === 1) expect(delta).toBe(40);
    }
    expectValidSave(low);
    expectValidSave(high);
  });

  it.each(["dark-fantasy", "murim", "xianxia", "hunter", "academy"] as const)(
    "%s: флаг крови передаётся по шансу закона, а не всегда",
    (universeId) => {
      const expected = CASE[universeId];
      const blood = expected.bloodFlags[0]!;
      const { dead, children } = family(universeId, { ages: [30], flags: [blood.flag] });
      const child = childAt(children, 0);
      const outcomes: boolean[] = [];
      for (let salt = 0; salt < 64; salt++) {
        const state = succeed(dead, child.id, `blood-${salt}`).state;
        outcomes.push(state.lineage.inheritance!.flags.includes(blood.flag));
        if (outcomes[salt]) expect(state.flags.includes(blood.flag)).toBe(true);
      }
      const successes = outcomes.filter(Boolean).length;
      expect(successes, `${universeId}: successes`).toBeGreaterThan(0);
      expect(successes, `${universeId}: failures`).toBeLessThan(outcomes.length);
      expect(INHERITANCE_LAWS[universeId].bloodFlags[0]!.chance).toBe(blood.chance);
      expect(INHERITANCE_LAWS[universeId].bloodFlags[0]!.flag).toBe(blood.flag);

      // Один и тот же salt — один и тот же флаг: случайность контролируется seed, а не тестом
      const first = succeed(dead, child.id, "blood-fixed").state;
      const second = succeed(dead, child.id, "blood-fixed").state;
      expect(second.flags).toEqual(first.flags);
      expect(second.lineage.inheritance!.flags).toEqual(first.lineage.inheritance!.flags);

      // Приёмный ребёнок не получает кровь, даже если флаг был у умершего
      const adopted = family(universeId, { ages: [30], flags: [blood.flag], adopted: [true] });
      for (let salt = 0; salt < 16; salt++) {
        const state = succeed(adopted.dead, childAt(adopted.children, 0).id, `blood-adopted-${salt}`).state;
        expect(state.lineage.inheritance!.flags).toEqual([]);
      }

      // Без флага у умершего кровь не появляется
      const clean = family(universeId, { ages: [30] });
      clean.dead.flags = clean.dead.flags.filter((flag) => flag !== blood.flag);
      for (let salt = 0; salt < 8; salt++) {
        const state = succeed(clean.dead, childAt(clean.children, 0).id, `blood-clean-${salt}`).state;
        expect(state.lineage.inheritance!.flags).not.toContain(blood.flag);
      }
    }
  );

  it("isekai: закон не передаёт флаги крови", () => {
    expect(CASE.isekai.bloodFlags).toEqual([]);
    const { dead, children } = family("isekai", { ages: [30], flags: ["mist-mark", "awakened"] });
    for (let salt = 0; salt < 8; salt++) {
      const state = succeed(dead, childAt(children, 0).id, `isekai-blood-${salt}`).state;
      expect(state.lineage.inheritance!.flags).toEqual([]);
    }
  });
});

describe("Stage 03.4: реликвии", () => {
  it.each(UNIVERSE_IDS)("%s: реликвии переживают наследование и не дублируются", (universeId) => {
    const expected = CASE[universeId];
    const fallback = expected.relic === "noble-signet" ? "ancestral-blade" : "noble-signet";
    const { dead } = family(universeId, { ages: [30, 24] });
    dead.lineage.relics = [relicOf(expected.relic), relicOf(fallback)];
    expect(dead.lineage.relics).toHaveLength(2);

    const primary = heirCandidates(dead).find((candidate) => candidate.primary)!;
    const { state } = succeed(dead, primary.npc.id, "relics");
    const expectedIds = [expected.relic, fallback];
    expect(state.lineage.relics.map((relic) => relic.id)).toEqual(expectedIds);
    expect(new Set(state.lineage.relics.map((relic) => relic.id)).size).toBe(2);
    expect(state.lineage.inheritance!.relics).toEqual(expectedIds);
    expect(presentLegacy(state).inheritance!.relics.map((relic) => relic.id)).toEqual(expectedIds);
    expect(presentLineage(state).dynasty.relics.map((relic) => relic.id)).toEqual(expectedIds);
    expect(state.lineage.inheritance!.relics.filter((id) => id === expected.relic)).toHaveLength(1);

    const again = succeed(dead, primary.npc.id, "relics").state;
    expect(again.lineage.relics).toEqual(state.lineage.relics);
    expectValidSave(state);
  });
});

describe("Stage 03.4: шесть исходов на одном роде", () => {
  it("одинаковое хозяйство даёт разные порядок, возраст, дом и шкалы у шести миров", () => {
    const rows = UNIVERSE_IDS.map((universeId) => {
      const expected = CASE[universeId];
      const { dead, children } = family(universeId, {
        ages: [30, 24, 18],
        power: [5, 50, 95],
        affinity: [10, 90, 20],
        flags: expected.bloodFlags.map((blood) => blood.flag)
      });
      withEstate(dead, { liquid: 300, home: true, businesses: 1 });
      dead.lineage.relics = [relicOf(expected.relic)];
      const candidates = heirCandidates(dead);
      const primary = candidates.find((candidate) => candidate.primary)!;
      expect(primary.npc.id, universeId).toBe(childAt(children, expected.matrixPrimary).id);
      const { state } = succeed(dead, primary.npc.id, `matrix-${universeId}`);
      const record = state.lineage.inheritance!;
      const total = record.assets!.total;
      const levy = Math.round(total * expected.levy);
      const spouse = Math.round((total - levy) * expected.spouseShare);
      return {
        world: universeId,
        order: INHERITANCE_LAWS[universeId].order,
        controlAge: record.controlAge,
        regency: INHERITANCE_LAWS[universeId].regency,
        levyShare: expected.levy,
        spouseShare: expected.spouseShare,
        home: record.homeInherited,
        meters: Object.keys(state.meters).sort().join(","),
        relic: record.relics.join(","),
        primaryAge: state.life.age,
        total,
        levy,
        spouse,
        shares: sumShares(record),
        selected: record.wealth + (record.homeInherited ? record.assets!.home!.value : 0)
      };
    });

    expect(rows.map((row) => [row.world, row.order, row.controlAge, row.regency, row.home, row.primaryAge])).toEqual([
      ["dark-fantasy", "eldest", 16, true, true, 30],
      ["isekai", "equal", 15, false, false, 30],
      ["murim", "merit", 16, false, true, 18],
      ["xianxia", "merit", 12, true, true, 18],
      ["hunter", "chosen", 18, false, true, 24],
      ["academy", "eldest", 16, true, true, 30]
    ]);
    for (const row of rows) {
      expect(row.levy + row.spouse + row.selected + row.shares, row.world).toBe(row.total);
      expect(row.meters.length, row.world).toBeGreaterThan(0);
      expect(row.relic.length, row.world).toBeGreaterThan(0);
    }
    const profiles = rows.map((row) => JSON.stringify({ order: row.order, controlAge: row.controlAge, regency: row.regency, levy: row.levyShare, spouse: row.spouseShare, home: row.home, meters: row.meters }));
    expect(new Set(profiles).size).toBe(6);
  });
});

describe("Stage 03.4: сохранение и детерминизм", () => {
  it.each(UNIVERSE_IDS)("%s: новая жизнь — валидное сохранение формата 14 и продолжается", (universeId) => {
    const { dead } = family(universeId, { ages: [30, 24] });
    withEstate(dead, { liquid: 100, home: true, businesses: 1 });
    const primary = heirCandidates(dead).find((candidate) => candidate.primary)!;
    const first = succeed(dead, primary.npc.id, "save-salt");
    const second = succeed(deepClone(dead), primary.npc.id, "save-salt");
    expect(second.state).toEqual(first.state);
    expect(first.state.seed).toBeTruthy();

    const restored = expectValidSave(first.state);
    expect(restored).toEqual(first.state);
    expect(restored.lineage.generation).toBe(dead.lineage.generation + 1);
    expect(restored.lineage.lives.map((life) => life.gen)).toEqual([dead.lineage.generation]);
    expect(restored.npcs.filter((npc) => npc.id === primary.npc.id)).toHaveLength(0);
    const action = restored.pending ? { type: "choose" as const, choiceId: choiceIds(restored)[0]! } : { type: "advance" as const };
    const next = applyAction(deepClone(restored), action).state;
    expect(next.version).toBe(restored.version + 1);
    expect(next.life.alive || next.life.deathAge !== null).toBe(true);
  });
});
