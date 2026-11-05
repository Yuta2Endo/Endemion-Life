// Жизнь NPC год за годом. Stage 02: старение, смерть от старости, остывание отношений — из основного генератора, как раньше.
// Stage 03: собственная жизнь — учёба, работа и карьера, сословие, браки, дети, усыновление, болезни, несчастья, бои,
// исчезновение и отставка. Эти броски идут из отдельного потока, производного от состояния генератора года:
// при том же seed и тех же решениях жизнь NPC та же, после отката — другая, а броски персонажа Stage 02 не сдвигаются
import type { EngineContext } from "../engine/context.js";
import { archiveForgotten, canParent, chronicle, CLOSE_KIN, divorce, isKin, logNpc, markDeath, marry, returnHome, setMissing, assignKinRole } from "../family/events.js";
import { isPresent, KinGraph, MIN_MARRIAGE_AGE } from "../family/kin.js";
import { t, type LocalizedText } from "../i18n.js";
import { hashSeed, Rng } from "../rng.js";
import { allProfessions, findProfession } from "../rpg/skills.js";
import { clamp } from "../stats.js";
import { SELF_ID, type DeathCauseId, type NpcLogKind, type NpcRole, type NpcState } from "../types.js";
import type { UniverseDefinition } from "../universes/types.js";
import type { Emit } from "../world/rules.js";
import { regionFactor } from "../economy/region.js";
import { canAddRole, createNpc, isFamily, npcAge, npcLifespan, rollProfession, roleName, shiftAffinity } from "./npcs.js";

/** За столько лет до конца срока NPC начинает рисковать умереть от старости */
const NPC_RISK_WINDOW = 10;
/** Живых NPC не больше стольких: новые семьи у дальней родни не заводятся */
export const MAX_LIVING_NPCS = 40;
/** Всего NPC в сохранении: умершие, о которых никто не помнит, уходят в архив рода */
export const MAX_NPCS = 90;
/** Доля лет, в которые с NPC что-то случается. Остальные годы — обычная жизнь */
const YEAR_EVENT_CHANCE = 0.2;
/** Сколько записей о людях попадает в хронику жизни за год: остальное — только в хронику рода */
const MAX_PEOPLE_ENTRIES = 3;
/** Дети заводятся только у этой родни: дальше родство в сохранении не ведётся */
const FAMILY_MAKERS: readonly NpcRole[] = ["father", "mother", "sibling", "child", "grandchild", "pibling"];
/** Вступать в брак может вся кровная родня персонажа */
const MARRIERS: readonly NpcRole[] = [...FAMILY_MAKERS, "nibling", "cousin", "grandparent"];
const MAX_CHILDREN = 4;

type Say = (title: LocalizedText, text: LocalizedText) => void;

interface Turn {
  ctx: EngineContext;
  rng: Rng;
  npc: NpcState;
  /** Возраст NPC */
  age: number;
  graph: KinGraph;
  say: Say;
  living: () => number;
}

interface Behaviour {
  id: string;
  when: (turn: Turn) => boolean;
  weight: (turn: Turn) => number;
  run: (turn: Turn) => void;
}

function verb(npc: NpcState, male: string, female: string): string {
  return npc.gender === "female" ? female : male;
}

/** Сколько лет прошло с последней записи журнала этих видов. Infinity — не было */
function since(turn: Turn, ...kinds: NpcLogKind[]): number {
  const now = turn.ctx.state.life.age;
  const last = [...turn.npc.log].reverse().find((entry) => kinds.includes(entry.kind));
  return last ? now - last.at : Number.POSITIVE_INFINITY;
}

function standing(universe: UniverseDefinition, classId: string): number {
  return universe.socialClasses.find((c) => c.id === classId)?.standing ?? 0;
}

function classAt(universe: UniverseDefinition, value: number): string | undefined {
  return universe.socialClasses.find((c) => c.standing === value)?.id;
}

function maxStanding(universe: UniverseDefinition): number {
  return Math.max(...universe.socialClasses.map((c) => c.standing));
}

function spouseOf(turn: Turn): NpcState | undefined {
  const id = turn.npc.spouseId;
  return id && id !== SELF_ID ? turn.ctx.state.npcs.find((n) => n.id === id && isPresent(n)) : undefined;
}

function childrenOf(turn: Turn): string[] {
  return turn.graph.childrenOf(turn.npc.id);
}

/** Близкий человек: его свадьба, ребёнок, болезнь и смерть заметны в жизни персонажа */
function isClose(npc: NpcState): boolean {
  return CLOSE_KIN.includes(npc.role) || (npc.alive && npc.affinity >= 40 && !isKin(npc));
}

function hasTrait(npc: NpcState, ...ids: string[]): boolean {
  return ids.includes(npc.traitId);
}

const COMBAT_SKILLS = new Set(["melee", "dungeon-combat"]);

function fights(turn: Turn): boolean {
  const profession = turn.npc.professionId ? findProfession(turn.ctx.universe, turn.npc.professionId) : undefined;
  return profession !== undefined && (COMBAT_SKILLS.has(profession.skill) || profession.skill === turn.ctx.universe.skills[0]?.id);
}

/** Насколько опасен мир для тех, кто держит оружие: бои Девяти Рек и зачистки Врат — чаще всего */
const BATTLE_RISK: Readonly<Record<string, number>> = { murim: 0.16, hunter: 0.12, isekai: 0.08, "dark-fantasy": 0.08, xianxia: 0.06, academy: 0.02 };

const DEATH_TEXT: Readonly<Record<DeathCauseId, LocalizedText>> = {
  "old-age": t("Тихо уходит от старости.", "Passes away quietly of old age."),
  illness: t("Болезнь оказывается сильнее лекарей.", "The illness proves stronger than the healers."),
  accident: t("Нелепый случай обрывает жизнь.", "A senseless accident ends a life."),
  battle: t("Погибает в бою.", "Falls in battle."),
  world: t("Мир забирает ещё одного из своих.", "The world claims one more of its own."),
  event: t("Уходит из жизни.", "Passes away."),
  unknown: t("Весть о смерти приходит издалека.", "Word of the death comes from afar."),
  life: t("Уходит из жизни.", "Passes away.")
};

function die(turn: Turn, cause: DeathCauseId): void {
  const { ctx, npc } = turn;
  markDeath(ctx, npc, cause, turn.graph);
  if (isClose(npc)) {
    const who = roleName(npc.role, npc.gender);
    turn.say(t(`Умер(ла): ${npc.name}`, `${npc.name} has died`), t(`${who.ru}, ${turn.age} лет. ${DEATH_TEXT[cause].ru}`, `${who.en}, aged ${turn.age}. ${DEATH_TEXT[cause].en}`));
  }
}

function professionName(universe: UniverseDefinition, id: string): LocalizedText | undefined {
  return findProfession(universe, id)?.name;
}

function startJob(turn: Turn, id: string, kind: NpcLogKind): void {
  const { npc, ctx } = turn;
  npc.professionId = id;
  const name = professionName(ctx.universe, id);
  if (name) npc.occupation = name;
  logNpc(ctx, npc, kind, id);
}

/** Новый член семьи NPC: супруг из другой семьи или ребёнок. Роль по родству с персонажем */
function newcomer(turn: Turn, options: Parameters<typeof createNpc>[2], parents: string[] = []): NpcState {
  const { ctx, rng, graph } = turn;
  const npc = createNpc({ state: ctx.state, rng, universe: ctx.universe }, "relative", { ...options, parents });
  npc.metAt = ctx.state.life.age;
  graph.add(npc);
  assignKinRole(graph, npc);
  if (npc.role === "relative" && parents.length === 0) npc.role = "in-law";
  npc.affinity = clamp(npc.affinity, -100, 100);
  return npc;
}

const BEHAVIOURS: readonly Behaviour[] = [
  {
    id: "education",
    when: ({ npc, age, ctx }) => npc.educationTier < Math.min(3, ctx.universe.education.length) && age >= [6, 12, 17][npc.educationTier]! && age <= 26,
    weight: (turn) => {
      const { npc, ctx } = turn;
      if (since(turn, "education") < 3) return 0;
      const s = standing(ctx.universe, npc.socialClassId);
      return 1.2 * (1 + s * 0.25) * (npc.goal === "knowledge" ? 2 : 1) * (npc.wealth >= npc.educationTier * 15 ? 1 : 0.4);
    },
    run: (turn) => {
      const { npc, ctx, rng } = turn;
      npc.educationTier += 1;
      npc.power = clamp(npc.power + rng.int(1, 3), 1, 100);
      logNpc(ctx, npc, "education", ctx.universe.education.find((e) => e.tier === npc.educationTier)?.id ?? String(npc.educationTier));
    }
  },
  {
    id: "first-job",
    when: ({ npc, age }) => npc.professionId === null && npc.status === "alive" && age >= 16 && age <= 60,
    weight: (turn) => (since(turn, "job-loss") < 2 ? 0 : 3),
    run: (turn) => {
      const { npc, ctx, rng } = turn;
      const id = rollProfession(rng, ctx.universe, npc.socialClassId, npc.educationTier, npc.goal);
      if (!id) return;
      npc.careerRank = 0;
      startJob(turn, id, "job");
    }
  },
  {
    id: "promotion",
    when: ({ npc, age, ctx }) => npc.professionId !== null && npc.status === "alive" && npc.careerRank < 3 && age < npcLifespan(ctx.universe, npc) * 0.8,
    weight: (turn) => {
      const { npc } = turn;
      if (since(turn, "job", "promotion", "job-change") < 5) return 0;
      const ease = regionFactor("promotion", turn.ctx.state.region.strain, turn.ctx.state.region.prosperity);
      return (npc.goal === "mastery" ? 2 : 1) * (npc.talentId ? 1.4 : 1) * (npc.weaknessId ? 0.7 : 1) * (npc.educationTier >= 2 ? 1.3 : 1) * ease;
    },
    run: (turn) => {
      const { npc, ctx, rng } = turn;
      npc.careerRank += 1;
      npc.power = clamp(npc.power + rng.int(2, 5), 1, 100);
      npc.wealth += 10 * npc.careerRank;
      logNpc(ctx, npc, "promotion", String(npc.careerRank));
      if (npc.careerRank === 3 && npc.goal === "mastery") logNpc(ctx, npc, "goal", "mastery");
      if (npc.careerRank === 3 && isKin(npc)) chronicle(ctx, "career", [npc.id], { profession: npc.professionId ?? "" });
    }
  },
  {
    id: "job-change",
    when: ({ npc, age }) => npc.professionId !== null && npc.status === "alive" && age >= 20 && age <= 55,
    weight: (turn) => (since(turn, "job", "promotion", "job-change") < 6 ? 0 : 0.25 * (hasTrait(turn.npc, "dreamer", "ambitious") ? 2 : 1)),
    run: (turn) => {
      const { npc, ctx, rng } = turn;
      const options = allProfessions(ctx.universe).filter((p) => p.id !== npc.professionId);
      if (options.length === 0) return;
      npc.careerRank = Math.max(0, npc.careerRank - 1);
      startJob(turn, rng.pick(options).id, "job-change");
    }
  },
  {
    id: "job-loss",
    when: ({ npc, age }) => npc.professionId !== null && npc.status === "alive" && age < 60,
    weight: (turn) => {
      if (since(turn, "job", "job-change", "job-loss") < 6) return 0;
      const pressure = regionFactor("job-loss", turn.ctx.state.region.strain, turn.ctx.state.region.prosperity);
      return 0.15 * (hasTrait(turn.npc, "drinker") ? 3 : 1) * (turn.npc.weaknessId ? 1.5 : 1) * (turn.ctx.universe.id === "hunter" ? 1.3 : 1) * pressure;
    },
    run: (turn) => {
      const { npc, ctx } = turn;
      logNpc(ctx, npc, "job-loss", npc.professionId ?? "");
      npc.professionId = null;
      npc.careerRank = 0;
      npc.wealth = Math.floor(npc.wealth * 0.7);
    }
  },
  {
    id: "mentor",
    when: ({ npc, age }) => npc.careerRank >= 2 && age >= 35 && npc.status !== "missing" && !npc.log.some((e) => e.kind === "mentor"),
    weight: ({ npc }) => 0.4 * (npc.goal === "mastery" || npc.goal === "knowledge" ? 1.5 : 1),
    run: ({ npc, ctx, rng }) => {
      const profession = npc.professionId ? findProfession(ctx.universe, npc.professionId) : undefined;
      npc.skillId ??= profession?.skill ?? null;
      npc.power = clamp(npc.power + rng.int(1, 3), 1, 100);
      logNpc(ctx, npc, "mentor", npc.skillId ?? "");
    }
  },
  {
    id: "class-up",
    when: ({ npc, age, ctx }) => age >= 20 && standing(ctx.universe, npc.socialClassId) < maxStanding(ctx.universe) && (npc.careerRank >= 2 || npc.wealth >= 60 || npc.goal === "rise"),
    weight: (turn) => {
      const { npc, ctx } = turn;
      if (since(turn, "class-up", "class-down") < 10) return 0;
      return 0.3 * (npc.goal === "rise" ? 2.5 : 1) * (ctx.universe.id === "academy" ? 1.5 : 1) * (npc.talentId ? 1.2 : 1) * (npc.wealth >= 60 ? 1.5 : 1);
    },
    run: ({ npc, ctx }) => {
      const next = classAt(ctx.universe, standing(ctx.universe, npc.socialClassId) + 1);
      if (!next) return;
      npc.socialClassId = next;
      logNpc(ctx, npc, "class-up", next);
      if (npc.goal === "rise") logNpc(ctx, npc, "goal", "rise");
      if (isKin(npc)) chronicle(ctx, "class", [npc.id], { cls: next, dir: 1 });
    }
  },
  {
    id: "class-down",
    when: ({ npc, age, ctx }) => age >= 20 && npc.wealth < 5 && standing(ctx.universe, npc.socialClassId) > 0,
    weight: (turn) => (since(turn, "class-up", "class-down") < 10 ? 0 : 0.15 * (hasTrait(turn.npc, "drinker") ? 2 : 1)),
    run: ({ npc, ctx }) => {
      const next = classAt(ctx.universe, standing(ctx.universe, npc.socialClassId) - 1);
      if (!next) return;
      npc.socialClassId = next;
      logNpc(ctx, npc, "class-down", next);
      if (isKin(npc)) chronicle(ctx, "class", [npc.id], { cls: next, dir: -1 });
    }
  },
  {
    id: "marry",
    when: (turn) => {
      const { npc, age } = turn;
      return MARRIERS.includes(npc.role) && npc.status !== "missing" && npc.spouseId === null && age >= Math.max(MIN_MARRIAGE_AGE, 18) && age <= 50 && turn.living() < MAX_LIVING_NPCS;
    },
    weight: (turn) => {
      const { npc, age } = turn;
      if (since(turn, "divorced", "widowed") < 2) return 0;
      return (npc.goal === "family" ? 2 : 1) * (hasTrait(npc, "caring") ? 1.3 : hasTrait(npc, "proud") ? 0.7 : 1) * (age > 35 ? 0.5 : 1) * (npc.formerSpouses.length > 0 ? 0.5 : 1);
    },
    run: (turn) => {
      const { npc, rng, ctx } = turn;
      const spouse = newcomer(turn, {
        gender: npc.gender === "female" ? "male" : "female",
        age: Math.max(18, turn.age + rng.int(-5, 5)),
        raceId: rng.chance(0.85) ? npc.raceId : rng.pick(ctx.universe.races).id,
        socialClassId: rng.chance(0.75) ? npc.socialClassId : (classAt(ctx.universe, standing(ctx.universe, npc.socialClassId) + rng.pick([-1, 1])) ?? npc.socialClassId)
      });
      marry(ctx, npc, spouse.id);
      if (isClose(npc)) turn.say(t(`Свадьба: ${npc.name} и ${spouse.name}`, `A wedding: ${npc.name} and ${spouse.name}`), t(`${roleName(npc.role, npc.gender).ru} вступает в брак. Семья становится больше.`, `${roleName(npc.role, npc.gender).en} marries. The family grows.`));
    }
  },
  {
    id: "child",
    when: (turn) => {
      const { npc } = turn;
      const spouse = spouseOf(turn);
      if (!spouse || !FAMILY_MAKERS.includes(npc.role) || turn.living() >= MAX_LIVING_NPCS) return false;
      const mother = npc.gender === "female" ? npc : spouse;
      const motherAge = turn.ctx.state.life.age - mother.bornAt;
      return motherAge >= 17 && motherAge <= 44 && childrenOf(turn).length < MAX_CHILDREN;
    },
    weight: (turn) => {
      if (since(turn, "child", "adopted") < 2) return 0;
      const kids = childrenOf(turn).length;
      return 1.4 * (kids === 0 ? 1.5 : 1 / (kids + 1)) * (turn.npc.goal === "family" ? 1.5 : 1);
    },
    run: (turn) => {
      const { npc, rng, ctx } = turn;
      const spouse = spouseOf(turn)!;
      const parents = npc.gender === "female" ? [npc.id, spouse.id] : [spouse.id, npc.id];
      if (!canParent(ctx, parents, ctx.state.life.age, turn.graph)) return;
      const child = newcomer(turn, { age: 0, familyName: npc.familyName, raceId: npc.raceId, socialClassId: npc.socialClassId, power: rng.int(3, 10), occupation: t("Ребёнок", "Child") }, parents);
      if (!canAddRole(ctx.state, child.role) && child.role !== "relative") {
        // Лимит роли превышен: такой ребёнок всё равно родился, но живёт далеко от персонажа
        child.role = "relative";
      }
      logNpc(ctx, npc, "child", child.id);
      logNpc(ctx, spouse, "child", child.id);
      chronicle(ctx, "birth", [child.id, npc.id, spouse.id]);
      if (isClose(npc) || child.role === "sibling" || child.role === "grandchild") {
        turn.say(
          t(`В семье пополнение: ${child.name}`, `A new member of the family: ${child.name}`),
          t(`У ${npc.name} ${verb(child, "родился сын", "родилась дочь")}. ${roleName(child.role, child.gender).ru} для вас.`, `${npc.name} has a ${child.gender === "female" ? "daughter" : "son"}. To you: ${roleName(child.role, child.gender).en.toLowerCase()}.`)
        );
      }
    }
  },
  {
    id: "adopt",
    when: (turn) => {
      const { npc, age } = turn;
      return spouseOf(turn) !== undefined && FAMILY_MAKERS.includes(npc.role) && age >= 28 && age <= 50 && childrenOf(turn).length === 0 && turn.living() < MAX_LIVING_NPCS;
    },
    weight: (turn) => (since(turn, "adopted") < 5 ? 0 : 0.3 * (hasTrait(turn.npc, "caring") ? 2 : 1) * (turn.npc.goal === "family" ? 1.5 : 1)),
    run: (turn) => {
      const { npc, rng, ctx } = turn;
      const spouse = spouseOf(turn)!;
      const age = rng.int(1, 8);
      const parents = npc.gender === "female" ? [npc.id, spouse.id] : [spouse.id, npc.id];
      if (!canParent(ctx, parents, ctx.state.life.age - age, turn.graph)) return;
      const child = newcomer(turn, { age, familyName: npc.familyName, socialClassId: npc.socialClassId, power: rng.int(3, 12), occupation: t("Приёмный ребёнок", "Adopted child") }, parents);
      child.adopted = true;
      logNpc(ctx, npc, "adopted", child.id);
      logNpc(ctx, spouse, "adopted", child.id);
      chronicle(ctx, "adoption", [child.id, npc.id, spouse.id]);
      if (isClose(npc)) turn.say(t(`Новый человек в семье: ${child.name}`, `A new face in the family: ${child.name}`), t(`${npc.name} и ${spouse.name} берут на воспитание сироту.`, `${npc.name} and ${spouse.name} take in an orphan.`));
    }
  },
  {
    id: "divorce",
    when: (turn) => spouseOf(turn) !== undefined,
    weight: (turn) => (since(turn, "married") < 3 ? 0 : 0.06 * (hasTrait(turn.npc, "hot-tempered", "drinker") ? 3 : 1)),
    run: (turn) => divorce(turn.ctx, turn.npc, spouseOf(turn)!)
  },
  {
    id: "illness",
    when: ({ age }) => age >= 1,
    weight: ({ npc, age, ctx }) => 0.25 * (age > 50 ? 2 : age < 6 ? 1.5 : 1) * (npc.weaknessId === "frail" ? 2 : 1) * (npc.health < 60 ? 1.5 : 1) * regionFactor("illness", ctx.state.region.strain, ctx.state.region.prosperity),
    run: (turn) => {
      const { npc, rng, ctx } = turn;
      npc.health -= rng.int(15, 45);
      logNpc(ctx, npc, "ill");
      if (npc.health <= 0) die(turn, "illness");
    }
  },
  {
    id: "accident",
    when: ({ age }) => age >= 3,
    weight: () => 0.05,
    run: (turn) => {
      if (turn.rng.chance(0.35)) die(turn, "accident");
      else turn.npc.health -= 30;
    }
  },
  {
    id: "battle",
    when: ({ age, npc }) => age >= 16 && age <= 70 && npc.status === "alive",
    weight: (turn) => (BATTLE_RISK[turn.ctx.universe.id] ?? 0.05) * (fights(turn) ? 2.5 : 0.4),
    run: (turn) => {
      const { npc, rng } = turn;
      // Сильный боец выживает чаще
      if (rng.chance(clamp(0.35 - npc.power / 300, 0.05, 0.35))) return die(turn, "battle");
      npc.health -= 20;
      npc.power = clamp(npc.power + rng.int(1, 4), 1, 100);
    }
  },
  {
    id: "training",
    when: ({ age, ctx }) => age >= 12 && (ctx.universe.id === "xianxia" || ctx.universe.id === "murim" || ctx.universe.id === "hunter"),
    weight: ({ npc }) => 0.3 * (npc.goal === "mastery" ? 2 : 1),
    run: ({ npc, rng, ctx }) => {
      const before = npc.power;
      npc.power = clamp(npc.power + rng.int(2, 6), 1, 100);
      // Сила 70 удлиняет жизнь (npcLifespan): это заметное событие
      if (before < 70 && npc.power >= 70) logNpc(ctx, npc, "goal", "power");
    }
  },
  {
    id: "missing",
    when: ({ age, npc }) => age >= 16 && age <= 60 && npc.status === "alive",
    weight: ({ npc }) => 0.03 * (npc.professionId === "wanderer" ? 4 : 1) * (hasTrait(npc, "secretive", "dreamer") ? 1.5 : 1),
    run: (turn) => {
      setMissing(turn.ctx, turn.npc);
      if (isClose(turn.npc)) turn.say(t(`Пропал(а) без вести: ${turn.npc.name}`, `${turn.npc.name} has gone missing`), t("Ни письма, ни вести. Только пустое место за столом.", "No letter, no word. Only an empty place at the table."));
    }
  },
  {
    id: "retire",
    when: ({ npc, age, ctx }) => npc.professionId !== null && npc.status === "alive" && age >= Math.max(55, Math.round(npcLifespan(ctx.universe, npc) * 0.7)),
    weight: () => 2,
    run: ({ npc, ctx }) => {
      npc.status = "retired";
      logNpc(ctx, npc, "retired", npc.professionId ?? "");
    }
  }
];

/** Доход взрослых NPC за год: профессия, ступень в ней и рента сословия */
function earn(ctx: EngineContext, npc: NpcState, age: number): void {
  if (age < 16 || npc.status === "missing") return;
  const profession = npc.professionId && npc.status === "alive" ? findProfession(ctx.universe, npc.professionId) : undefined;
  const income = (profession ? profession.base + npc.careerRank * 2 : 0) + (ctx.universe.socialClasses.find((c) => c.id === npc.socialClassId)?.income ?? 0);
  npc.wealth = Math.min(100_000, npc.wealth + Math.max(0, Math.round(income / 2)));
}

export function npcYearly(ctx: EngineContext, emit: Emit): void {
  const state = ctx.state;
  const age = state.life.age;
  const graph = new KinGraph(state);
  let said = 0;
  const say: Say = (title, text) => {
    if (said >= MAX_PEOPLE_ENTRIES) return;
    said += 1;
    emit("people", title, text);
  };

  // Stage 02: старость и остывание отношений — из основного генератора, в прежнем порядке
  for (const npc of state.npcs) {
    if (!npc.alive) continue;
    const years = npcAge(npc, age);
    const lifespan = npcLifespan(ctx.universe, npc);
    const risk = years >= lifespan + 15 ? 1 : years >= lifespan - NPC_RISK_WINDOW ? 0.02 + (years - lifespan + NPC_RISK_WINDOW) * 0.025 : 0;
    if (risk > 0 && ctx.rng.chance(risk)) {
      const missing = npc.status === "missing";
      markDeath(ctx, npc, missing ? "unknown" : "old-age", graph);
      if (!missing && (isFamily(npc) || npc.affinity >= 40)) {
        const who = roleName(npc.role, npc.gender);
        say(t(`Умер(ла): ${npc.name}`, `${npc.name} has died`), t(`${who.ru} уходит в ${years} лет. В доме становится тише.`, `${who.en} passes away at ${years}. The house grows quieter.`));
      }
      continue;
    }
    // Без общения отношения остывают к нейтральным: друзья забываются, вражда слабеет
    if (!isFamily(npc) && npc.interactedAt !== age && ctx.rng.chance(0.4)) {
      if (npc.affinity > 20) shiftAffinity(npc, -1);
      else if (npc.affinity < -20) shiftAffinity(npc, 1);
    }
  }

  // Stage 03: собственная жизнь — из отдельного потока
  const rng = new Rng(hashSeed(`${state.seed}::npc-life::${ctx.rng.state}`));
  const living = () => state.npcs.filter((n) => n.alive).length;
  const turns = state.npcs.filter(isPresent);
  for (const npc of turns) {
    if (!isPresent(npc)) continue;
    const years = npcAge(npc, age);
    npc.health = Math.min(100, npc.health + 4);
    earn(ctx, npc, years);
    if (!rng.chance(YEAR_EVENT_CHANCE)) continue;
    const turn: Turn = { ctx, rng, npc, age: years, graph, say, living };
    const options = BEHAVIOURS.filter((b) => b.when(turn));
    const pick = rng.weighted(options, (b) => b.weight(turn));
    pick?.run(turn);
  }

  // Пропавшие иногда возвращаются
  for (const npc of state.npcs) {
    if (npc.alive && npc.status === "missing" && rng.chance(0.08)) {
      returnHome(ctx, npc);
      if (isClose(npc)) say(t(`Вернулся(лась): ${npc.name}`, `${npc.name} has returned`), t("На пороге стоит тот, кого уже не ждали.", "On the doorstep stands someone no one expected anymore."));
    }
  }
  archiveForgotten(ctx, MAX_NPCS);
}
