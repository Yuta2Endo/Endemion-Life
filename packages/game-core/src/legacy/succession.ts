// Legacy & Inheritance Engine: после смерти персонажа род продолжается за наследника.
// Новая жизнь — новое состояние: наследник становится персонажем, умерший — записью NPC с теми же связями,
// все времена пересчитываются от рождения наследника, род (хроника, достижения, нити, последствия) переходит целиком.
// Функции чистые: состояние умершего не меняется, возвращается его обновлённая копия и состояние новой жизни
import { lifespanOf, maxResources } from "../character/derived.js";
import { generateCharacter } from "../character/generator.js";
import { baseAffinity, npcAge, roleName } from "../character/npcs.js";
import { TEMPERAMENTS } from "../character/temperaments.js";
import { deepClone } from "../clone.js";
import type { EngineContext } from "../engine/context.js";
import { GameRuleError } from "../errors.js";
import { assignKinRole, chronicle } from "../family/events.js";
import { BLOOD_RELATIONS, isKin, isPresent, KinGraph, type KinRelation } from "../family/kin.js";
import { ageText, t, type LocalizedText } from "../i18n.js";
import { newHealthState } from "../life/health.js";
import { newEducationState } from "../life/education.js";
import { findCareerTrack, maxCareerRank, newCareerState } from "../life/careers.js";
import { newHouseholdState } from "../life/household.js";
import { newBusinessState } from "../life/business.js";
import { stageForAge } from "../life/stages.js";
import { hashSeed, Rng } from "../rng.js";
import { allTalents, allWeaknesses, findTalent, findWeakness } from "../rpg/talents.js";
import { findProfession, pathSkill } from "../rpg/skills.js";
import { BIRTH_STAT_MAX, clamp, KARMA_LIMIT, REPUTATION_LIMIT, STAT_KEYS, STAT_MAX, STAT_MIN, WEALTH_MAX, type StatKey } from "../stats.js";
import { SELF_ID, type GameState, type HistoryChange, type HistoryEntry, type InheritanceRecord, type NpcState, type WorldActivity } from "../types.js";
import { getUniverse } from "../universes/registry.js";
import type { UniverseDefinition } from "../universes/types.js";
import { newAdventure } from "../adventure/adventure.js";
import { newMastery } from "../endgame/mastery.js";
import { newEconomy } from "../economy/economy.js";
import { normalizeWorldState } from "../world/state.js";
import { lawOf, type InheritanceLaw } from "./laws.js";
import { unlockAchievements } from "./achievements.js";
import { lineageYear } from "./chronicle.js";
import { MAX_WORLD_ACTIVITIES } from "../world/state.js";

/** Род не продолжается дальше: защита от бесконечного наследования */
export const MAX_GENERATIONS = 1000;
/** Кого закон рассматривает первыми: чем меньше число, тем ближе родство */
const DEGREE: Readonly<Partial<Record<KinRelation, number>>> = { child: 1, grandchild: 2, sibling: 3, nibling: 4, descendant: 5, pibling: 6, cousin: 7, blood: 8, grandparent: 9, parent: 9, ancestor: 10 };

export interface HeirCandidate {
  npc: NpcState;
  relation: KinRelation;
  age: number;
  available: boolean;
  /** Почему нельзя выбрать */
  locked: LocalizedText | null;
  /** Первый по закону мира */
  primary: boolean;
  /** Сколько золота получит, если выбрать его */
  wealth: number;
  /** Понадобится опекун: младше возраста, с которого закон отдаёт имущество в руки */
  regency: boolean;
  /** Перейдёт ли сословие умершего */
  classInherited: boolean;
  /** Родня по крови, без усыновления на пути. Приёмный наследует имущество и место в роду, но не кровь */
  natural: boolean;
}

/** Супруг, который остался вдовцом после смерти персонажа */
function widowOf(state: GameState): NpcState | undefined {
  return state.npcs.find((npc) => npc.alive && npc.formerSpouses.includes(SELF_ID) && npc.log.some((e) => e.kind === "widowed" && e.value === SELF_ID));
}

function standing(universe: UniverseDefinition, classId: string): number {
  return universe.socialClasses.find((c) => c.id === classId)?.standing ?? 0;
}

/** Порядок наследования: ближе по родству, затем по закону — старший, достойнейший или самый близкий */
function orderHeirs(law: InheritanceLaw, list: HeirCandidate[]): HeirCandidate[] {
  const merit = (c: HeirCandidate) => c.npc.power + c.npc.careerRank * 10 + c.npc.educationTier * 5;
  return [...list].sort((a, b) => {
    const degree = (DEGREE[a.relation] ?? 99) - (DEGREE[b.relation] ?? 99);
    if (degree !== 0) return degree;
    if (a.available !== b.available) return a.available ? -1 : 1;
    if (law.order === "merit" && merit(a) !== merit(b)) return merit(b) - merit(a);
    if (law.order === "chosen" && a.npc.affinity !== b.npc.affinity) return b.npc.affinity - a.npc.affinity;
    return a.npc.bornAt - b.npc.bornAt || a.npc.id.localeCompare(b.npc.id);
  });
}

interface Estate {
  total: number;
  levy: number;
  spouse: number;
  /** Что делят наследники */
  rest: number;
  /** Сонаследники: та же степень родства, что у первого наследника */
  coheirs: HeirCandidate[];
}

function estateOf(state: GameState, law: InheritanceLaw, ordered: HeirCandidate[]): Estate {
  const total = state.character.wealth;
  const levy = Math.round(total * law.levy);
  const spouse = widowOf(state) ? Math.round((total - levy) * law.spouseShare) : 0;
  const first = ordered[0];
  const coheirs = first ? ordered.filter((c) => (DEGREE[c.relation] ?? 99) === (DEGREE[first.relation] ?? 99)) : [];
  return { total, levy, spouse, rest: total - levy - spouse, coheirs };
}

/** Доля наследника heir, если род продолжит именно он */
function shareOf(law: InheritanceLaw, estate: Estate, heir: HeirCandidate, primary: HeirCandidate | undefined): number {
  const among = estate.coheirs.some((c) => c.npc.id === heir.npc.id) ? estate.coheirs : [...estate.coheirs, heir];
  const n = among.length;
  if (n <= 1) return estate.rest;
  if (law.order === "equal") return Math.floor(estate.rest / n);
  // Главная доля — тому, кого ставит первым закон; при завещании — тому, кого выбрал игрок
  const main = Math.round(estate.rest * law.heirShare);
  const isMain = law.order === "chosen" || heir.npc.id === primary?.npc.id;
  return isMain ? main : Math.floor((estate.rest - main) / (n - 1));
}

/** Кандидаты в наследники: живая кровная родня, в том числе приёмные дети. Порядок — по закону мира */
export function heirCandidates(state: GameState): HeirCandidate[] {
  if (state.life.alive) return [];
  const universe = getUniverse(state.character.universeId);
  const law = lawOf(universe.id);
  const graph = new KinGraph(state);
  const age = state.life.age;
  const list: HeirCandidate[] = [];
  for (const npc of state.npcs) {
    if (!npc.alive) continue;
    const relation = graph.bloodRelation(SELF_ID, npc.id);
    if (!relation || !BLOOD_RELATIONS.includes(relation)) continue;
    const years = npcAge(npc, age);
    let locked: LocalizedText | null = null;
    if (npc.status === "missing") locked = t("Пропал(а) без вести", "Missing");
    else if (years < law.controlAge && !law.regency) locked = t(`Слишком молод: закон мира отдаёт наследство с ${law.controlAge} лет`, `Too young: the law of this world grants an inheritance from age ${law.controlAge}`);
    const hereditary = law.hereditary.includes(state.character.socialClassId) && (!npc.adopted || law.adoptedClass);
    const classInherited = hereditary && standing(universe, state.character.socialClassId) > standing(universe, npc.socialClassId);
    const natural = graph.isNatural(SELF_ID, npc.id);
    list.push({ npc, relation, age: years, available: locked === null, locked, primary: false, wealth: 0, regency: locked === null && years < law.controlAge, classInherited, natural });
  }
  const ordered = orderHeirs(law, list);
  const primary = ordered.find((c) => c.available);
  if (primary) primary.primary = true;
  const estate = estateOf(state, law, ordered.filter((c) => c.available));
  for (const candidate of ordered) candidate.wealth = candidate.available ? shareOf(law, estate, candidate, primary) : 0;
  return ordered;
}

/** Происхождение наследника: то, чьё сословие при рождении ближе к его сословию */
function originFor(universe: UniverseDefinition, classId: string, previous: string): string {
  const target = standing(universe, classId);
  const scored = universe.origins.map((origin) => {
    const profile = universe.originProfiles[origin.id];
    const exact = profile?.socialClassId === classId ? 0 : 1;
    const family = profile?.family && profile.family !== "full" ? 1 : 0;
    const diff = Math.abs(standing(universe, profile?.socialClassId ?? "") - target);
    return { id: origin.id, score: exact * 10 + diff * 3 + family + (origin.id === previous ? -0.5 : 0) };
  });
  return scored.sort((a, b) => a.score - b.score)[0]?.id ?? universe.origins[0]!.id;
}

/** Сколько раз за жизнь до этого возраста растут характеристики (в среднем, как в life/aging.ts) */
function expectedGrowth(age: number): number {
  let total = 0;
  for (let year = 1; year <= age; year++) total += year <= 2 ? 0.5 : year <= 17 ? 1.6 : year < 40 ? 0.35 : year < 60 ? 0.15 : 0;
  return total;
}

interface HeirBuild {
  state: GameState;
  record: InheritanceRecord;
  deceasedId: string;
}

/**
 * Состояние новой жизни: наследник становится персонажем. Характеристики не копируются: наследник рождается
 * со своими бросками (поток нового seed), растёт по возрасту, получает навыки от воспитания, образования и ремесла,
 * часть фамильных талантов и слабостей, имущество и сословие по закону мира.
 * salt — случайное значение сервера: без него seed наследника можно было бы вычислить из seed предка
 */
function buildHeir(dead: GameState, candidate: HeirCandidate, all: HeirCandidate[], salt: string): HeirBuild {
  const universe = getUniverse(dead.character.universeId);
  const law = lawOf(universe.id);
  const heir = candidate.npc;
  const prev = dead.character;
  const generation = dead.lineage.generation + 1;
  const seed = `${hashSeed(`${dead.seed}::heir::${heir.id}::${generation}::${salt}`).toString(36)}${hashSeed(`${salt}::${heir.id}::${dead.seed}::${generation}`).toString(36)}`;
  const rng = Rng.fromSeed(seed, "life");
  const legacyRng = Rng.fromSeed(seed, "legacy");

  // Сословие: своё или унаследованное, если оно выше. Происхождение подбирается под сословие
  const socialClassId = candidate.classInherited ? prev.socialClassId : heir.socialClassId;
  const originId = originFor(universe, socialClassId, prev.originId);
  const temperamentId = legacyRng.pick(TEMPERAMENTS).id;
  const generated = generateCharacter({ universeId: universe.id, name: heir.name, gender: heir.gender, raceId: heir.raceId, originId, temperamentId }, rng);
  const c = generated.character;
  c.socialClassId = socialClassId;

  // Рост по годам, воспитание и образование: родительские сильные стороны чуть чаще
  const temperament = TEMPERAMENTS.find((x) => x.id === temperamentId);
  // Кровь передаётся только по природному родству: приёмный наследник не перенимает сильные стороны, таланты, слабости и флаги крови
  const natural = candidate.natural;
  const strongest = natural ? [...STAT_KEYS].sort((a, b) => prev.stats[b] - prev.stats[a]).slice(0, 2) : [];
  const profession = heir.professionId ? findProfession(universe, heir.professionId) : undefined;
  const lean: StatKey[] = [...(temperament?.growth ?? []), ...strongest, ...(profession?.stats ?? [])];
  if (heir.educationTier >= 1) lean.push("intelligence", "wisdom");
  const points = Math.round(expectedGrowth(candidate.age));
  for (let i = 0; i < points; i++) {
    const key = lean.length > 0 && legacyRng.chance(0.6) ? legacyRng.pick(lean) : legacyRng.pick(STAT_KEYS);
    c.stats[key] = clamp(c.stats[key] + 1, STAT_MIN, STAT_MAX);
  }
  // Кровь родителя: заметная сторона умершего немного проявляется в наследнике (прямого копирования нет)
  for (const key of strongest) if (prev.stats[key] > c.stats[key] + 10) c.stats[key] = clamp(c.stats[key] + 1, STAT_MIN, Math.max(BIRTH_STAT_MAX, c.stats[key] + 1));

  // Опыт и уровень по прожитым годам
  for (let year = 5; year <= candidate.age; year++) {
    c.xp += 4 + Math.floor(c.stats.wisdom / 5);
    while (c.xp >= 100 * c.level && c.level < 100) {
      c.xp -= 100 * c.level;
      c.level += 1;
    }
  }

  // Ремесло, образование и навыки
  c.professionId = profession ? profession.id : null;
  const education = universe.education.find((e) => e.tier === heir.educationTier);
  c.educationId = education?.id ?? null;
  const skills = c.skills;
  const add = (id: string, n: number) => {
    skills[id] = clamp((skills[id] ?? 0) + n, 0, 100);
  };
  for (const e of universe.education.filter((x) => x.tier <= heir.educationTier)) for (const id of e.skills) add(id, 10);
  if (profession) add(profession.skill, 5 + heir.careerRank * 10);
  if (heir.skillId) add(heir.skillId, 10);
  const threads = dead.lineage.threads;
  if (threads.some((x) => x.id === "ancient-knowledge")) {
    add("lore", 5);
    add(pathSkill(universe).id, 5);
  }

  // Таланты: свой талант NPC — известен; фамильные таланты могут спать в наследнике и проявиться позже
  const lineageTraits = dead.lineage.traits;
  const known = heir.talentId && findTalent(universe, heir.talentId) ? [heir.talentId] : [];
  const dormant: string[] = [];
  const talentPool = new Set(natural ? [...prev.talents, ...Object.keys(lineageTraits.talents)] : []);
  for (const id of [...talentPool].sort()) {
    if (known.includes(id) || !allTalents(universe).some((x) => x.id === id)) continue;
    const gens = lineageTraits.talents[id] ?? 0;
    if (legacyRng.chance(gens >= 2 ? 0.45 : prev.talents.includes(id) ? 0.3 : 0.15)) dormant.push(id);
    if (dormant.length >= 2) break;
  }
  c.talents = known;
  const weaknesses = heir.weaknessId && findWeakness(universe, heir.weaknessId) ? [heir.weaknessId] : [];
  for (const id of [...new Set(natural ? [...prev.weaknesses, ...Object.keys(lineageTraits.weaknesses)] : [])].sort()) {
    if (weaknesses.includes(id) || !allWeaknesses(universe).some((x) => x.id === id) || weaknesses.length >= 2) continue;
    const gens = lineageTraits.weaknesses[id] ?? 0;
    if (legacyRng.chance(gens >= 2 ? 0.3 : 0.12)) weaknesses.push(id);
  }
  c.weaknesses = weaknesses;

  // Флаги: происхождение, кровь (корень духа, пробуждение, метка Мглы), семья наследника
  const flags = new Set(generated.flags);
  const bloodFlags: string[] = [];
  for (const { flag, chance } of law.bloodFlags) {
    if (natural && dead.flags.includes(flag) && legacyRng.chance(chance)) {
      flags.add(flag);
      bloodFlags.push(flag);
    }
  }
  if (heir.professionId) flags.add("profession");
  if (heir.spouseId) flags.add("married");
  // Путь силы с детства: если кровь его открыла, наследник уже накопил немного силы
  const trackFlag = universe.track.requiresFlag;
  if ((!trackFlag || flags.has(trackFlag)) && candidate.age >= universe.track.minAge) c.track.points = Math.min(universe.track.ranks[1]?.threshold ?? 0, Math.floor(heir.power / 3));

  // Имущество: доля по закону. У младшего наследника её держит опекун до возраста закона
  const regency = candidate.age < law.controlAge;
  const ownWealth = heir.wealth;
  c.wealth = Math.min(WEALTH_MAX, ownWealth + (regency ? 0 : candidate.wealth));
  c.reputation = clamp(Math.round(prev.reputation * 0.3 + dead.lineage.renown / 10), -REPUTATION_LIMIT, REPUTATION_LIMIT);
  c.karma = clamp(Math.round(prev.karma * 0.1) + (temperament?.karma ?? 0), -KARMA_LIMIT, KARMA_LIMIT);
  // Отношение фракций: своё по происхождению и треть того, что заслужил предшественник
  const factions: Record<string, number> = {};
  for (const faction of universe.factions) {
    const value = clamp(Math.round((universe.originProfiles[originId]?.factions?.[faction.id] ?? 0) + (prev.factions[faction.id] ?? 0) * 0.3), -100, 100);
    if (value !== 0) factions[faction.id] = value;
  }
  c.factions = factions;
  c.resources = maxResources(c);

  // Скрытое: потенциал наполовину от родителя, судьба своя, тайна рода остаётся с родом
  const ownPotential = legacyRng.int(1, 5) + legacyRng.int(0, 5);
  const potential = clamp(natural ? Math.round((ownPotential + dead.hidden.potential) / 2) : ownPotential, 1, 10);
  const destiny = clamp(legacyRng.int(1, 5) + legacyRng.int(0, 5), 1, 10);
  const secretKnown = dead.hidden.revealed.includes("familySecret") && (candidate.relation === "child" || heir.affinity >= 40);
  const omens = universe.omens.filter((o) => (o.minDestiny ?? 0) <= destiny);

  const guardian = regency ? (widowOf(dead) ?? all.find((x) => x.npc.id !== heir.id && x.age >= 18)?.npc) : undefined;
  const record: InheritanceRecord = {
    fromGen: dead.lineage.generation,
    fromName: prev.name,
    fromNpcId: "",
    relation: candidate.relation,
    law: law.id,
    wealth: candidate.wealth,
    ownWealth,
    shares: [],
    socialClassId,
    classInherited: candidate.classInherited,
    reputation: c.reputation,
    talents: [],
    weaknesses: weaknesses.filter((id) => id !== heir.weaknessId),
    dormant: dormant.length,
    flags: bloodFlags,
    threads: threads.map((x) => x.id),
    relics: (dead.lineage.relics || []).map((r) => r.id),
    controlAge: law.controlAge,
    guardianName: guardian?.name ?? null,
    held: regency ? candidate.wealth : 0
  };

  const age = candidate.age;
  const meters = Object.fromEntries(
    universe.meters.map((m) => {
      const carry = law.meterCarry[m.id] ?? 0;
      const own = universe.originProfiles[originId]?.meters?.[m.id] ?? m.initial;
      const value = Math.round(own + ((dead.meters[m.id] ?? m.initial) - m.initial) * carry);
      return [m.id, clamp(value, m.min, m.max)];
    })
  );

  const state: GameState = {
    schemaVersion: dead.schemaVersion,
    seed,
    rngState: rng.state,
    version: 1,
    character: c,
    life: { age, stage: stageForAge(age, lifespanOf(c)), alive: true, deathAge: null, deathCause: null },
    health: newHealthState(),
    education: newEducationState(),
    career: (() => {
      const track = findCareerTrack(universe.id, c.professionId);
      if (!track || c.professionId === null) return newCareerState();
      return {
        rank: clamp(heir.careerRank, 0, maxCareerRank(track)),
        since: age,
        tenure: Math.max(0, age - 18),
        employed: true,
        retired: false
      };
    })(),
    // Stage 02.3: наследник начинает со своим жильём и своими делами. Недвижимость предшественника
    // оценивается в его наследство, а не переносится вторым списком поверх новой жизни
    household: newHouseholdState(age),
    business: newBusinessState(),
    flags: [...flags].sort(),
    occurrences: {},
    lastSeen: {},
    pending: null,
    scheduled: [],
    nextSeq: 1,
    background: {
      familyName: heir.familyName || dead.background.familyName,
      birthplace: dead.background.birthplace,
      omen: omens.length > 0 ? legacyRng.pick(omens).text : t("Ночь была тихой.", "The night was quiet."),
      familyHistory: dead.background.familyHistory,
      biography: []
    },
    hidden: {
      potential,
      destiny,
      dormantTalents: dormant,
      familySecret: dead.hidden.familySecret,
      revealed: secretKnown ? ["familySecret"] : []
    },
    npcs: [],
    nextNpcId: dead.nextNpcId,
    meters,
    consequences: [],
    quest: null,
    questsDone: [],
    recentEvents: [],
    lineage: deepClone(dead.lineage),
    memory: [],
    // Хозяйство мира продолжается: спад или подъём не кончаются со смертью; нехватка и счета — свои у наследника
    economy: newEconomy(age, dead.economy.cycle),
    // Открытые места и приключения — личный опыт, наследнику они не переходят
    adventure: newAdventure(),
    // Край переживает человека: наследник застаёт ту же землю, и след приключений предка уже учтён
    region: deepClone(dead.region),
    // Освоение мира — личный опыт, как и приключение. Достижения рода остаются в lineage
    mastery: newMastery(),
    autoMode: "manual",
    milestones: { triggered: [] },
    // Состояние мира общее для рода: новый наследник продолжает жить в том же мире.
    world: (() => {
      const world = normalizeWorldState(dead.world, universe);
      const generation = dead.lineage.generation + 1;
      const entry: WorldActivity = {
        id: `succession.${heir.id}`,
        age: candidate.age,
        kind: "family",
        title: t("Род продолжается", "The dynasty continues"),
        text: t(
          `${heir.name} становится главой рода ${dead.lineage.name} в ${generation}-м поколении.`,
          `${heir.name} becomes head of the ${dead.lineage.name} dynasty in generation ${generation}.`
        ),
      };
      world.activities = [entry, ...world.activities].slice(0, MAX_WORLD_ACTIVITIES);
      return world;
    })(),
  };
  return { state, record, deceasedId: "" };
}

/** Запись NPC умершего персонажа: имя, род, связи и итог жизни. Её id стабилен для всех следующих поколений */
function deceasedRecord(dead: GameState, id: string, heirAffinity: number): NpcState {
  const c = dead.character;
  const universe = getUniverse(c.universeId);
  const profession = c.professionId ? findProfession(universe, c.professionId) : undefined;
  const occupation = profession?.name ?? universe.socialClasses.find((s) => s.id === c.socialClassId)?.occupations[0] ?? roleName("relative", c.gender);
  const formerSpouses = dead.npcs.filter((npc) => npc.spouseId === SELF_ID || npc.formerSpouses.includes(SELF_ID)).map((npc) => npc.id);
  const mean = STAT_KEYS.reduce((sum, key) => sum + c.stats[key], 0) / STAT_KEYS.length;
  const temperament = TEMPERAMENTS.find((x) => x.id === c.temperamentId);
  const life = dead.lineage.lives.find((x) => x.gen === dead.lineage.generation);
  const cause = dead.life.deathCause ?? t("Ушёл из жизни", "Passed away");
  return {
    id,
    role: "relative",
    name: c.name,
    gender: c.gender,
    bornAt: 0,
    temperamentId: c.temperamentId,
    traitId: "wise",
    occupation,
    bio: t(
      `${occupation.ru}. Поколение рода: ${dead.lineage.generation}. ${cause.ru}, ${ageText(dead.life.age).ru}.${temperament ? ` Характер: ${temperament.name.ru.toLowerCase()}.` : ""}`,
      `${occupation.en}. Generation of the family: ${dead.lineage.generation}. ${cause.en}, aged ${dead.life.age}.${temperament ? ` Temperament: ${temperament.name.en.toLowerCase()}.` : ""}`
    ),
    affinity: clamp(heirAffinity, -100, 100),
    alive: false,
    diedAt: dead.life.age,
    metAt: 0,
    power: clamp(Math.round(mean * 2 + c.track.rank * 8), 1, 100),
    skillId: profession?.skill ?? null,
    interactedAt: null,
    familyName: dead.background.familyName,
    status: "deceased",
    cause: "life",
    raceId: c.raceId,
    parents: [...dead.lineage.selfParents],
    spouseId: null,
    formerSpouses,
    adopted: dead.lineage.selfAdopted,
    socialClassId: c.socialClassId,
    professionId: profession?.id ?? null,
    careerRank: profession ? Math.min(3, Math.floor((c.skills[profession.skill] ?? 0) / 25)) : 0,
    educationTier: universe.education.find((e) => e.id === c.educationId)?.tier ?? 0,
    factionId: null,
    goal: null,
    health: 0,
    wealth: 0,
    talentId: c.talents[0] ?? null,
    weaknessId: c.weaknesses[0] ?? null,
    log: [],
    lifeGen: life?.gen ?? dead.lineage.generation
  };
}

/** Замена id во всех связях: персонаж ↔ запись NPC */
function swap(id: string, map: ReadonlyMap<string, string>): string {
  return map.get(id) ?? id;
}

export interface SuccessionResult {
  /** Состояние умершего: род отмечен как продолженный, версия выросла */
  previous: GameState;
  /** Новая жизнь наследника */
  state: GameState;
  entries: HistoryEntry[];
  heir: { npcId: string; name: string };
}

/**
 * Продолжить род за наследника. Проверяет: жизнь закончена, род ещё не продолжен, наследник жив, кровная родня
 * и подходит по закону мира. Тот же salt на том же состоянии даёт тот же результат.
 * Сервер передаёт случайный salt: исход новой жизни нельзя рассчитать заранее
 */
export function succeed(dead: GameState, heirId: string, salt = ""): SuccessionResult {
  if (dead.life.alive) throw new GameRuleError("LIFE_NOT_ENDED", "Жизнь ещё не закончилась");
  if (dead.lineage.continuedBy !== null) throw new GameRuleError("LINEAGE_CONTINUED", "Род уже продолжен");
  if (dead.lineage.generation >= MAX_GENERATIONS) throw new GameRuleError("HEIR_LOCKED", "Род не может продолжаться дальше");
  const candidates = heirCandidates(dead);
  const candidate = candidates.find((c) => c.npc.id === heirId);
  if (!candidate) throw new GameRuleError("HEIR_LOCKED", "Этот человек не может унаследовать род");
  if (!candidate.available) throw new GameRuleError("HEIR_LOCKED", candidate.locked?.ru ?? "Этого наследника выбрать нельзя");

  const universe = getUniverse(dead.character.universeId);
  const law = lawOf(universe.id);
  const build = buildHeir(dead, candidate, candidates, salt);
  const next = build.state;
  const heir = candidate.npc;
  const shift = heir.bornAt;

  // Записи NPC: умерший получает id, наследник становится персонажем
  const deceasedId = `n${next.nextNpcId++}`;
  const map = new Map<string, string>([
    [SELF_ID, deceasedId],
    [heir.id, SELF_ID]
  ]);
  const at = (value: number) => value - shift;
  const npcs: NpcState[] = [deceasedRecord(dead, deceasedId, heir.affinity), ...deepClone(dead.npcs).filter((npc) => npc.id !== heir.id)];
  for (const npc of npcs) {
    npc.parents = npc.parents.map((id) => swap(id, map));
    npc.spouseId = npc.spouseId === null ? null : swap(npc.spouseId, map);
    npc.formerSpouses = npc.formerSpouses.map((id) => swap(id, map)).filter((id) => id !== npc.id);
    npc.bornAt = at(npc.bornAt);
    npc.diedAt = npc.diedAt === null ? null : at(npc.diedAt);
    npc.metAt = Math.max(0, npc.bornAt);
    npc.interactedAt = null;
    for (const entry of npc.log) entry.at = at(entry.at);
  }
  next.npcs = npcs;
  next.lineage.selfParents = heir.parents.map((id) => swap(id, map));
  next.lineage.selfAdopted = heir.adopted;

  // Роли и отношение — от лица наследника. Друзья и враги умершего становятся знакомыми рода; их отношение остывает
  const oldKin = new Set(dead.npcs.filter((npc) => isKin(npc)).map((npc) => npc.id));
  // Остаются родня, сыгранные жизни и те, с кем отношения заметные. Их предки и супруги остаются тоже:
  // иначе у наследника пропал бы родитель (например, бывший супруг умершего)
  const keep = new Set(next.npcs.filter((npc) => npc.id === deceasedId || oldKin.has(npc.id) || npc.lifeGen !== null || (npc.alive && Math.abs(npc.affinity) >= 30)).map((npc) => npc.id));
  for (const id of next.lineage.selfParents) keep.add(id);
  const byId = new Map(next.npcs.map((npc) => [npc.id, npc]));
  for (let changed = true; changed; ) {
    changed = false;
    for (const id of [...keep]) {
      const npc = byId.get(id);
      if (!npc) continue;
      for (const linked of [...npc.parents, ...(npc.spouseId ? [npc.spouseId] : [])]) {
        if (linked !== SELF_ID && byId.has(linked) && !keep.has(linked)) {
          keep.add(linked);
          changed = true;
        }
      }
    }
  }
  next.npcs = next.npcs.filter((npc) => keep.has(npc.id));
  // Бывшие супруги, которых не оставили, остаются только в хронике
  for (const npc of next.npcs) npc.formerSpouses = npc.formerSpouses.filter((id) => id === SELF_ID || keep.has(id));
  const graph = new KinGraph(next);
  for (const npc of next.npcs) {
    const before = npc.role;
    if (npc.id === deceasedId || oldKin.has(npc.id) || npc.lifeGen !== null) {
      assignKinRole(graph, npc);
      if (graph.relation(SELF_ID, npc.id) === null) npc.role = "in-law";
      if (npc.id !== deceasedId) npc.affinity = clamp(Math.round((npc.affinity + baseAffinity(npc.role)) / 2), -100, 100);
    } else {
      npc.role = before === "rival" ? "rival" : "acquaintance";
      npc.affinity = clamp(Math.round(npc.affinity * 0.4), -100, 100);
    }
  }
  // Сонаследники получают свои доли
  const shares: InheritanceRecord["shares"] = [];
  const coheirs = candidates.filter((c) => c.available && c.npc.id !== heir.id && (DEGREE[c.relation] ?? 99) === (DEGREE[candidate.relation] ?? 99));
  const left = Math.max(0, dead.character.wealth - Math.round(dead.character.wealth * law.levy) - (widowOf(dead) ? Math.round((dead.character.wealth - Math.round(dead.character.wealth * law.levy)) * law.spouseShare) : 0) - candidate.wealth);
  const per = coheirs.length > 0 ? Math.floor(left / coheirs.length) : 0;
  for (const c of coheirs) {
    const npc = next.npcs.find((x) => x.id === c.npc.id);
    if (!npc || per <= 0) continue;
    npc.wealth += per;
    shares.push({ npcId: npc.id, name: npc.name, amount: per });
  }
  const widow = widowOf(dead);
  if (widow) {
    const npc = next.npcs.find((x) => x.id === widow.id);
    if (npc) npc.wealth += Math.round((dead.character.wealth - Math.round(dead.character.wealth * law.levy)) * law.spouseShare);
  }

  // Род: поколение, отсчёт лет, хроника, итог прошлой жизни
  const lineage = next.lineage;
  lineage.generation += 1;
  lineage.epoch += shift;
  lineage.startRenown = lineage.renown;
  lineage.continuedBy = null;
  for (const entry of lineage.chronicle) entry.who = entry.who.map((id) => swap(id, map));
  const life = lineage.lives.find((x) => x.gen === dead.lineage.generation);
  if (life) {
    life.npcId = deceasedId;
    life.heirName = heir.name;
  }
  build.record.fromNpcId = deceasedId;
  build.record.shares = shares;
  lineage.inheritance = build.record;

  const ctx: EngineContext = { state: next, rng: Rng.fromSeed(next.seed, "succession"), universe, changes: [] };
  chronicle(ctx, "succession", [deceasedId, SELF_ID], { law: law.id, relation: candidate.relation, sum: candidate.wealth, gen: lineage.generation }, "succession");
  if (candidate.classInherited) chronicle(ctx, "class", [SELF_ID], { cls: build.record.socialClassId, dir: 1, inherited: 1 }, "succession");

  // Биография наследника
  const predecessor = dead.character;
  const who = roleName(graph.relation(SELF_ID, deceasedId) === "parent" ? (predecessor.gender === "female" ? "mother" : "father") : "relative", predecessor.gender);
  const lawName = law.name;
  next.background.biography = [
    t(`${next.character.name} — ${lineage.generation}-е поколение рода ${lineage.name}.`, `${next.character.name} is the ${ordinal(lineage.generation)} generation of the ${lineage.name} family.`),
    t(`${who.ru}: ${predecessor.name}. ${(dead.life.deathCause ?? t("", "")).ru}, ${ageText(dead.life.age).ru}.`, `${who.en}: ${predecessor.name}. ${(dead.life.deathCause ?? t("", "")).en}, aged ${dead.life.age}.`),
    t(
      `По закону «${lawName.ru}» наследнику достаётся ${candidate.wealth} золота${build.record.held > 0 ? ` — до ${law.controlAge} лет им распоряжается опекун` : ""}.`,
      `Under the law of ${lawName.en} the heir receives ${candidate.wealth} gold${build.record.held > 0 ? `, held by a guardian until age ${law.controlAge}` : ""}.`
    )
  ];
  next.background.familyHistory = t(
    `${dead.background.familyHistory.ru} Род продолжается: ${lineage.lives.map((x) => x.name).join(" → ")} → ${next.character.name}.`.trim(),
    `${dead.background.familyHistory.en} The line continues: ${lineage.lives.map((x) => x.name).join(" → ")} → ${next.character.name}.`.trim()
  );

  const changes: HistoryChange[] = unlockAchievements(next).map((a) => ({ kind: "achievement", value: a.id }));
  const entries: HistoryEntry[] = [
    {
      seq: next.nextSeq++,
      age: next.life.age,
      kind: "legacy",
      title: t("Новое поколение", "A new generation"),
      text: t(`${next.character.name} продолжает род ${lineage.name}.`, `${next.character.name} carries on the ${lineage.name} family.`),
      outcome: t(next.background.biography.map((p) => p.ru).join(" "), next.background.biography.map((p) => p.en).join(" ")),
      changes
    }
  ];

  const previous = deepClone(dead);
  previous.lineage.continuedBy = heir.id;
  const record = previous.lineage.lives.find((x) => x.gen === dead.lineage.generation);
  if (record) record.heirName = heir.name;
  previous.version += 1;
  return { previous, state: next, entries, heir: { npcId: heir.id, name: heir.name } };
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** Год рода, в который родился наследник: для интерфейса */
export function heirBirthYear(state: GameState, npc: NpcState): number {
  return lineageYear(state, npc.bornAt);
}

export { isPresent };
