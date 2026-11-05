// Что игрок видит о роде: итоги жизни, наследники, наследство, хроника рода, семейное древо, достижения.
// Скрытое (seed, потенциал и судьба наследника, спящие таланты) сюда не попадает
import { lifespanOf } from "../character/derived.js";
import { affinityLabel, roleName } from "../character/npcs.js";
import { isKin, KinGraph, type KinRelation } from "../family/kin.js";
import { fillText, t, type LocalizedText } from "../i18n.js";
import { findAdventure } from "../adventure/content.js";
import { findEvent } from "../narrative/selection.js";
import { findProfession } from "../rpg/skills.js";
import { findTalent, findWeakness } from "../rpg/talents.js";
import { SELF_ID, type ChronicleEntry, type DeathCauseId, type GameState, type NpcState, type NpcStatus } from "../types.js";
import { getUniverse } from "../universes/registry.js";
import type { UniverseDefinition } from "../universes/types.js";
import { ACHIEVEMENTS, type AchievementCategory } from "./achievements.js";
import { lawOf } from "./laws.js";
import { findLineageConsequence, THREADS } from "./stories.js";
import { heirCandidates } from "./succession.js";
import { LIFE_TITLES, SCORE_PARTS, SCORE_PART_NAMES, scoreLife } from "./summary.js";

/** Сколько последних записей хроники рода приходит клиенту. Остальное — по счётчику archived */
const CHRONICLE_VIEW_LIMIT = 300;

export const RELATION_NAMES: Readonly<Record<KinRelation, LocalizedText>> = {
  parent: t("Родитель", "Parent"),
  child: t("Ребёнок", "Child"),
  sibling: t("Брат или сестра", "Sibling"),
  grandparent: t("Бабушка или дедушка", "Grandparent"),
  grandchild: t("Внук или внучка", "Grandchild"),
  ancestor: t("Предок", "Ancestor"),
  descendant: t("Потомок", "Descendant"),
  pibling: t("Дядя или тётя", "Uncle or aunt"),
  nibling: t("Племянник или племянница", "Nephew or niece"),
  cousin: t("Двоюродный брат или сестра", "Cousin"),
  blood: t("Кровный родственник", "Blood relative"),
  spouse: t("Супруг", "Spouse"),
  "former-spouse": t("Бывший супруг", "Former spouse"),
  "in-law": t("Родня по браку", "In-law")
};

export const NPC_STATUS_NAMES: Readonly<Record<NpcStatus, LocalizedText>> = {
  alive: t("Жив(а)", "Alive"),
  deceased: t("Умер(ла)", "Deceased"),
  missing: t("Пропал(а) без вести", "Missing"),
  retired: t("На покое", "Retired")
};

export const DEATH_CAUSE_NAMES: Readonly<Record<DeathCauseId, LocalizedText>> = {
  "old-age": t("от старости", "of old age"),
  illness: t("от болезни", "of illness"),
  accident: t("от несчастного случая", "in an accident"),
  battle: t("в бою", "in battle"),
  world: t("по воле мира", "by the world's will"),
  event: t("по воле судьбы", "by fate's will"),
  unknown: t("при неизвестных обстоятельствах", "in unknown circumstances"),
  life: t("прожив свою жизнь", "having lived their life")
};

export interface AchievementView {
  id: string;
  category: AchievementCategory;
  /** Скрытое неполученное достижение показывается без названия */
  name: LocalizedText;
  description: LocalizedText;
  unlocked: boolean;
  gen: number | null;
  age: number | null;
}

export interface HeirView {
  id: string;
  name: string;
  gender: "female" | "male";
  age: number;
  race: LocalizedText;
  relation: KinRelation;
  relationName: LocalizedText;
  roleName: LocalizedText;
  adopted: boolean;
  available: boolean;
  locked: LocalizedText | null;
  primary: boolean;
  wealth: number;
  regency: boolean;
  classInherited: boolean;
  socialClass: LocalizedText;
  profession: LocalizedText | null;
  education: LocalizedText | null;
  talent: LocalizedText | null;
  weakness: LocalizedText | null;
  power: number;
  affinity: number;
  affinityLabel: LocalizedText;
}

export interface LawView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  controlAge: number;
  levy: number;
  levyName: LocalizedText;
}

export interface DecisionView {
  age: number;
  title: LocalizedText;
  choice: LocalizedText;
  success: boolean | null;
}

export interface LifeSummaryView {
  name: string;
  world: LocalizedText;
  age: number;
  lifespan: number;
  cause: LocalizedText | null;
  profession: LocalizedText | null;
  socialClass: LocalizedText;
  bornClass: LocalizedText;
  score: number;
  parts: { id: string; name: LocalizedText; value: number; max: number }[];
  title: LocalizedText;
  titleText: LocalizedText;
  achievements: AchievementView[];
  family: { spouses: string[]; children: number; grandchildren: number; livingDescendants: number };
  relations: { name: string; roleName: LocalizedText; affinity: number; affinityLabel: LocalizedText; alive: boolean }[];
  decisions: DecisionView[];
  impact: { renown: number; renownDelta: number; reputation: number; karma: number; factions: { name: LocalizedText; value: number }[] };
  threads: LocalizedText[];
  heirs: HeirView[];
  law: LawView;
  /** id NPC наследника, если род уже продолжен */
  continuedBy: string | null;
  /** Имя наследника, если род уже продолжен */
  continuedName: string | null;
}

export interface InheritanceView {
  fromName: string;
  fromGen: number;
  relation: LocalizedText;
  law: LawView;
  wealth: number;
  ownWealth: number;
  held: number;
  shares: { name: string; amount: number }[];
  socialClass: LocalizedText;
  classInherited: boolean;
  reputation: number;
  weaknesses: LocalizedText[];
  dormant: number;
  flags: string[];
  threads: LocalizedText[];
  guardianName: string | null;
}

export interface LegacyBrief {
  lineageName: string;
  generation: number;
  renown: number;
  achievements: number;
  continuedBy: string | null;
  inheritance: InheritanceView | null;
  /** Итоги жизни и наследники: только когда жизнь закончилась */
  summary: LifeSummaryView | null;
}

export interface ChronicleView {
  id: number;
  year: number;
  gen: number;
  kind: ChronicleEntry["kind"];
  text: LocalizedText;
  who: string[];
  src: string;
  link: number | null;
}

export interface TreeNodeView {
  id: string;
  name: string;
  gender: "female" | "male";
  isSelf: boolean;
  alive: boolean;
  status: NpcStatus;
  /** Ряд в древе: 0 — поколение персонажа, -1 — родители, 1 — дети */
  level: number;
  born: number;
  died: number | null;
  age: number;
  parents: string[];
  spouseId: string | null;
  formerSpouses: string[];
  roleName: LocalizedText;
  relation: LocalizedText | null;
  adopted: boolean;
  lifeGen: number | null;
  heir: boolean;
  occupation: LocalizedText;
  socialClass: LocalizedText;
  cause: LocalizedText | null;
  affinity: number;
  bio: LocalizedText;
  log: LocalizedText[];
}

export interface LineageView {
  name: string;
  generation: number;
  renown: number;
  epoch: number;
  lives: { gen: number; name: string; age: number; born: number; score: number; title: LocalizedText; cause: LocalizedText | null; heirName: string | null }[];
  chronicle: ChronicleView[];
  archived: number;
  achievements: AchievementView[];
  traits: { talents: { name: LocalizedText; gens: number }[]; weaknesses: { name: LocalizedText; gens: number }[] };
  threads: { name: LocalizedText; description: LocalizedText; gen: number }[];
  tree: TreeNodeView[];
}

function className(universe: UniverseDefinition, id: string): LocalizedText {
  return universe.socialClasses.find((c) => c.id === id)?.name ?? t("—", "—");
}

function lawView(universe: UniverseDefinition): LawView {
  const law = lawOf(universe.id);
  return { id: law.id, name: law.name, description: law.description, controlAge: law.controlAge, levy: law.levy, levyName: law.levyName };
}

function achievementViews(state: GameState, onlyGen?: number): AchievementView[] {
  const have = new Map(state.lineage.achievements.map((a) => [a.id, a]));
  return ACHIEVEMENTS.filter((a) => !a.world || a.world === state.character.universeId)
    .map((a) => {
      const got = have.get(a.id);
      const hidden = a.category === "hidden" && !got;
      return {
        id: a.id,
        category: a.category,
        name: hidden ? t("Скрытое достижение", "Hidden achievement") : a.name,
        description: hidden ? t("Откроется само, когда придёт время.", "It will reveal itself when the time comes.") : a.description,
        unlocked: got !== undefined,
        gen: got?.gen ?? null,
        age: got?.age ?? null
      };
    })
    .filter((a) => onlyGen === undefined || a.gen === onlyGen);
}

/** Наследник глазами игрока. Сословие — то, которое он получит: своё или унаследованное от умершего */
function heirView(state: GameState, universe: UniverseDefinition, candidate: ReturnType<typeof heirCandidates>[number]): HeirView {
  const npc = candidate.npc;
  const education = universe.education.find((e) => e.tier === npc.educationTier);
  return {
    id: npc.id,
    name: npc.name,
    gender: npc.gender,
    age: candidate.age,
    race: universe.races.find((r) => r.id === npc.raceId)?.name ?? t("—", "—"),
    relation: candidate.relation,
    relationName: RELATION_NAMES[candidate.relation],
    roleName: roleName(npc.role, npc.gender),
    adopted: npc.adopted,
    available: candidate.available,
    locked: candidate.locked,
    primary: candidate.primary,
    wealth: candidate.wealth,
    regency: candidate.regency,
    classInherited: candidate.classInherited,
    socialClass: className(universe, candidate.classInherited ? state.character.socialClassId : npc.socialClassId),
    profession: npc.professionId ? (findProfession(universe, npc.professionId)?.name ?? null) : null,
    education: education?.name ?? null,
    talent: npc.talentId ? (findTalent(universe, npc.talentId)?.name ?? null) : null,
    weakness: npc.weaknessId ? (findWeakness(universe, npc.weaknessId)?.name ?? null) : null,
    power: npc.power,
    affinity: npc.affinity,
    affinityLabel: affinityLabel(npc.affinity)
  };
}

export function presentHeirs(state: GameState): HeirView[] {
  const universe = getUniverse(state.character.universeId);
  return heirCandidates(state).map((candidate) => heirView(state, universe, candidate));
}

function presentSummary(state: GameState): LifeSummaryView {
  const universe = getUniverse(state.character.universeId);
  const c = state.character;
  const score = scoreLife(state);
  const title = LIFE_TITLES[score.titleId] ?? LIFE_TITLES.quiet!;
  const limits: Record<string, number> = { years: 16, family: 18, bonds: 16, deeds: 16, legacy: 16, path: 18 };
  const children = state.npcs.filter((npc) => npc.parents.includes(SELF_ID));
  const childIds = new Set(children.map((npc) => npc.id));
  const grandchildren = state.npcs.filter((npc) => npc.parents.some((id) => childIds.has(id)));
  const graph = new KinGraph(state);
  const descendants = graph.descendants(SELF_ID);
  const relations = state.npcs
    .filter((npc) => npc.diedAt === null || npc.diedAt >= state.life.age - 1 || npc.alive)
    .filter((npc) => Math.abs(npc.affinity) >= 30)
    .sort((a, b) => Math.abs(b.affinity) - Math.abs(a.affinity) || a.id.localeCompare(b.id))
    .slice(0, 6)
    .map((npc) => ({ name: npc.name, roleName: roleName(npc.role, npc.gender), affinity: npc.affinity, affinityLabel: affinityLabel(npc.affinity), alive: npc.alive }));
  const vars = { name: c.name };
  const decisions = [...state.memory]
    .sort((a, b) => a.age - b.age)
    .map((m): DecisionView | null => {
      const event = findEvent(universe, m.eventId);
      const choice = event?.choices.find((x) => x.id === m.choiceId);
      if (!event || !choice) return null;
      return { age: m.age, title: fillText(event.title, vars), choice: fillText(choice.text, vars), success: m.success };
    })
    .filter((d): d is DecisionView => d !== null);
  const bornClass = universe.originProfiles[c.originId]?.socialClassId ?? c.socialClassId;
  const profession = c.professionId ? findProfession(universe, c.professionId) : undefined;
  return {
    name: c.name,
    world: universe.name,
    age: state.life.age,
    lifespan: lifespanOf(c),
    cause: state.life.deathCause,
    profession: profession?.name ?? null,
    socialClass: className(universe, c.socialClassId),
    bornClass: className(universe, bornClass),
    score: score.total,
    parts: SCORE_PARTS.map((id) => ({ id, name: SCORE_PART_NAMES[id], value: score.parts[id], max: limits[id] ?? 16 })),
    title: title.name,
    titleText: title.description,
    achievements: achievementViews(state, state.lineage.generation),
    family: {
      spouses: state.npcs.filter((npc) => npc.spouseId === SELF_ID || npc.formerSpouses.includes(SELF_ID)).map((npc) => npc.name),
      children: children.length,
      grandchildren: grandchildren.length,
      livingDescendants: state.npcs.filter((npc) => npc.alive && descendants.has(npc.id)).length
    },
    relations,
    decisions,
    impact: {
      renown: state.lineage.renown,
      renownDelta: state.lineage.renown - state.lineage.startRenown,
      reputation: c.reputation,
      karma: c.karma,
      factions: universe.factions.filter((f) => (c.factions[f.id] ?? 0) !== 0).map((f) => ({ name: f.name, value: c.factions[f.id] ?? 0 }))
    },
    threads: state.lineage.threads.map((x) => THREADS[x.id]?.name).filter((x): x is LocalizedText => x !== undefined),
    heirs: state.lineage.continuedBy === null ? presentHeirs(state) : [],
    law: lawView(universe),
    continuedBy: state.lineage.continuedBy,
    continuedName: state.lineage.lives.find((life) => life.gen === state.lineage.generation)?.heirName ?? null
  };
}

function presentInheritance(state: GameState): InheritanceView | null {
  const record = state.lineage.inheritance;
  if (!record) return null;
  const universe = getUniverse(state.character.universeId);
  return {
    fromName: record.fromName,
    fromGen: record.fromGen,
    relation: RELATION_NAMES[record.relation as KinRelation] ?? t("Родственник", "Relative"),
    law: lawView(universe),
    wealth: record.wealth,
    ownWealth: record.ownWealth,
    held: record.held,
    shares: record.shares.map((s) => ({ name: s.name, amount: s.amount })),
    socialClass: className(universe, record.socialClassId),
    classInherited: record.classInherited,
    reputation: record.reputation,
    weaknesses: record.weaknesses.map((id) => findWeakness(universe, id)?.name).filter((x): x is LocalizedText => x !== undefined),
    dormant: record.dormant,
    flags: record.flags,
    threads: record.threads.map((id) => THREADS[id]?.name).filter((x): x is LocalizedText => x !== undefined),
    guardianName: record.guardianName
  };
}

/** Краткие сведения о роде для LifeView: приходят с каждым ответом */
export function presentLegacy(state: GameState): LegacyBrief {
  return {
    lineageName: state.lineage.name,
    generation: state.lineage.generation,
    renown: state.lineage.renown,
    achievements: state.lineage.achievements.length,
    continuedBy: state.lineage.continuedBy,
    inheritance: presentInheritance(state),
    summary: state.life.alive ? null : presentSummary(state)
  };
}

const LOG_TEXT: Readonly<Record<string, LocalizedText>> = {
  education: t("учёба: {v}", "studies: {v}"),
  job: t("работа: {v}", "work: {v}"),
  promotion: t("повышение: ступень {v}", "promotion: rank {v}"),
  "job-change": t("новое дело: {v}", "new trade: {v}"),
  "job-loss": t("потеря работы", "lost their work"),
  mentor: t("стал(а) наставником", "became a mentor"),
  "class-up": t("сословие выше: {v}", "rose to: {v}"),
  "class-down": t("сословие ниже: {v}", "fell to: {v}"),
  married: t("брак: {v}", "married: {v}"),
  divorced: t("развод: {v}", "divorced: {v}"),
  widowed: t("вдовство: {v}", "widowed: {v}"),
  child: t("ребёнок: {v}", "child: {v}"),
  adopted: t("приёмный ребёнок: {v}", "adopted: {v}"),
  ill: t("тяжёлая болезнь", "a grave illness"),
  missing: t("пропал(а) без вести", "went missing"),
  returned: t("вернулся(лась)", "returned"),
  retired: t("ушёл(ла) на покой", "retired"),
  goal: t("цель жизни достигнута", "life's goal achieved"),
  estate: t("наследство: {v}", "inheritance: {v}")
};

function logValue(state: GameState, universe: UniverseDefinition, kind: string, value: string | undefined): LocalizedText {
  if (!value) return t("", "");
  if (kind === "job" || kind === "job-change") return findProfession(universe, value)?.name ?? t(value, value);
  if (kind === "education") return universe.education.find((e) => e.id === value)?.name ?? t(value, value);
  if (kind === "class-up" || kind === "class-down") return className(universe, value);
  if (["married", "divorced", "widowed", "child", "adopted"].includes(kind)) {
    const name = value === SELF_ID ? state.character.name : (state.npcs.find((n) => n.id === value)?.name ?? state.lineage.names[value] ?? "?");
    return t(name, name);
  }
  return t(value, value);
}

function treeLevels(graph: KinGraph, ids: readonly string[]): Map<string, number> {
  const levels = new Map<string, number>([[SELF_ID, 0]]);
  const queue = [SELF_ID];
  const included = new Set(ids);
  while (queue.length > 0) {
    const id = queue.shift()!;
    const level = levels.get(id)!;
    const next: [string, number][] = [
      ...graph.parentsOf(id).map((p): [string, number] => [p, level - 1]),
      ...graph.childrenOf(id).map((child): [string, number] => [child, level + 1])
    ];
    const spouse = graph.spouseOf(id);
    if (spouse) next.push([spouse, level]);
    for (const [other, l] of next) {
      if (!included.has(other) || levels.has(other)) continue;
      levels.set(other, l);
      queue.push(other);
    }
  }
  return levels;
}

function presentTree(state: GameState): TreeNodeView[] {
  const universe = getUniverse(state.character.universeId);
  const graph = new KinGraph(state);
  const epoch = state.lineage.epoch;
  const age = state.life.age;
  const heirs = new Set(state.life.alive ? [] : heirCandidates(state).filter((h) => h.available).map((h) => h.npc.id));
  const family = state.npcs.filter((npc) => isKin(npc) || npc.lifeGen !== null || npc.spouseId === SELF_ID || npc.formerSpouses.includes(SELF_ID));
  // Бывшие супруги персонажа — тоже в древе, если от них есть дети или был брак
  const ids = [SELF_ID, ...family.map((npc) => npc.id)];
  const levels = treeLevels(graph, ids);
  const known = new Set(ids);
  const node = (npc: NpcState): TreeNodeView => {
    const relation = graph.relation(SELF_ID, npc.id);
    return {
      id: npc.id,
      name: npc.name,
      gender: npc.gender,
      isSelf: false,
      alive: npc.alive,
      status: npc.status,
      level: levels.get(npc.id) ?? 0,
      born: epoch + npc.bornAt,
      died: npc.diedAt === null ? null : epoch + npc.diedAt,
      age: (npc.diedAt ?? age) - npc.bornAt,
      parents: npc.parents.filter((id) => known.has(id)),
      spouseId: npc.spouseId && known.has(npc.spouseId) ? npc.spouseId : null,
      formerSpouses: npc.formerSpouses.filter((id) => known.has(id)),
      roleName: roleName(npc.role, npc.gender),
      relation: relation ? RELATION_NAMES[relation] : null,
      adopted: npc.adopted,
      lifeGen: npc.lifeGen,
      heir: heirs.has(npc.id),
      occupation: npc.occupation,
      socialClass: className(universe, npc.socialClassId),
      cause: npc.cause ? DEATH_CAUSE_NAMES[npc.cause] : null,
      affinity: npc.affinity,
      bio: npc.bio,
      log: npc.log.slice(-6).map((entry) => {
        const text = LOG_TEXT[entry.kind] ?? t(entry.kind, entry.kind);
        return fillText(text, { v: logValue(state, universe, entry.kind, entry.value) });
      })
    };
  };
  const c = state.character;
  const self: TreeNodeView = {
    id: SELF_ID,
    name: c.name,
    gender: c.gender,
    isSelf: true,
    alive: state.life.alive,
    status: state.life.alive ? "alive" : "deceased",
    level: 0,
    born: epoch,
    died: state.life.alive ? null : epoch + age,
    age,
    parents: state.lineage.selfParents.filter((id) => known.has(id)),
    spouseId: state.npcs.find((npc) => npc.alive && npc.spouseId === SELF_ID)?.id ?? null,
    formerSpouses: state.npcs.filter((npc) => npc.formerSpouses.includes(SELF_ID)).map((npc) => npc.id),
    roleName: t("Вы", "You"),
    relation: null,
    adopted: state.lineage.selfAdopted,
    lifeGen: state.lineage.generation,
    heir: false,
    occupation: c.professionId ? (findProfession(universe, c.professionId)?.name ?? t("—", "—")) : t("—", "—"),
    socialClass: className(universe, c.socialClassId),
    cause: state.life.deathCause,
    affinity: 0,
    bio: t(state.background.biography.map((p) => p.ru).join(" "), state.background.biography.map((p) => p.en).join(" ")),
    log: []
  };
  return [self, ...family.filter((npc) => levels.has(npc.id)).map(node)];
}

/** Имя участника записи хроники: из значений записи, иначе из карточки */
function who(entry: ChronicleEntry, i: number): string {
  return String(entry.v[`n${i}`] ?? "?");
}

function genderWord(entry: ChronicleEntry, i: number, male: string, female: string): string {
  return entry.v[`g${i}`] === "f" ? female : male;
}

function names(universe: UniverseDefinition, entry: ChronicleEntry): LocalizedText {
  const v = entry.v;
  const n0 = who(entry, 0);
  const n1 = who(entry, 1);
  const n2 = entry.v.n2 === undefined ? null : who(entry, 2);
  switch (entry.kind) {
    case "origin": {
      const origin = universe.origins.find((o) => o.id === v.origin)?.name;
      return t(
        `Начало рода ${String(v.family)}: в мире «${universe.name.ru}» рождается ${n0}.${origin ? ` Происхождение: ${origin.ru}.` : ""}`,
        `The ${String(v.family)} line begins: ${n0} is born in ${universe.name.en}.${origin ? ` Origin: ${origin.en}.` : ""}`
      );
    }
    case "birth": {
      const parents = n2 ? `${n1} и ${n2}` : n1;
      const parentsEn = n2 ? `${n1} and ${n2}` : n1;
      return entry.who.length > 1
        ? t(`У ${parents} ${genderWord(entry, 0, "рождается сын", "рождается дочь")}: ${n0}.`, `${parentsEn} welcome a ${entry.v.g0 === "f" ? "daughter" : "son"}: ${n0}.`)
        : t(`Рождается ${n0}.`, `${n0} is born.`);
    }
    case "adoption":
      return t(`${n2 ? `${n1} и ${n2}` : n1} берут на воспитание ${n0}.`, `${n2 ? `${n1} and ${n2}` : n1} take in ${n0}.`);
    case "marriage":
      return t(`${n0} и ${n1} вступают в брак.`, `${n0} and ${n1} are married.`);
    case "divorce":
      return t(`${n0} и ${n1} расходятся.`, `${n0} and ${n1} part ways.`);
    case "death":
    case "tragedy": {
      if (v.cause === "life") {
        const title = LIFE_TITLES[String(v.title)]?.name ?? t("", "");
        return t(`${n0} уходит из жизни в ${String(v.age)} лет. Итог жизни: ${String(v.score)} из 100 — «${title.ru}».`, `${n0} passes away aged ${String(v.age)}. Life's tally: ${String(v.score)} of 100 — "${title.en}".`);
      }
      const cause = DEATH_CAUSE_NAMES[v.cause as DeathCauseId] ?? DEATH_CAUSE_NAMES.unknown;
      return t(`${n0} ${genderWord(entry, 0, "умирает", "умирает")} ${cause.ru}, ${String(v.age)} лет.`, `${n0} dies ${cause.en}, aged ${String(v.age)}.`);
    }
    case "missing":
      return t(`${n0} ${genderWord(entry, 0, "пропадает", "пропадает")} без вести.`, `${n0} goes missing.`);
    case "return":
      return t(`${n0} ${genderWord(entry, 0, "возвращается", "возвращается")} домой.`, `${n0} returns home.`);
    case "career": {
      const profession = findProfession(universe, String(v.profession))?.name ?? t("", "");
      return t(`${n0} становится признанным мастером: ${profession.ru}.`, `${n0} becomes a recognised master: ${profession.en}.`);
    }
    case "class": {
      const cls = className(universe, String(v.cls));
      if (v.inherited) return t(`${n0} наследует сословие: ${cls.ru}.`, `${n0} inherits the station: ${cls.en}.`);
      return Number(v.dir) > 0 ? t(`${n0} поднимается в сословие: ${cls.ru}.`, `${n0} rises to the station: ${cls.en}.`) : t(`${n0} опускается в сословие: ${cls.ru}.`, `${n0} falls to the station: ${cls.en}.`);
    }
    case "succession": {
      const law = lawOf(universe.id).name;
      return t(
        `Род переходит к ${n1} — ${String(v.gen)}-е поколение. Закон: «${law.ru}». Наследство: ${String(v.sum)} золота.`,
        `The family passes to ${n1}, generation ${String(v.gen)}. Law: ${law.en}. Inheritance: ${String(v.sum)} gold.`
      );
    }
    case "inheritance":
      return v.regency
        ? t(`Опека окончена: ${n0} получает наследство, ${String(v.sum)} золота.`, `The guardianship ends: ${n0} receives the inheritance, ${String(v.sum)} gold.`)
        : t(`${n1} получает долю наследства ${n0}: ${String(v.sum)} золота.`, `${n1} receives a share of ${n0}'s estate: ${String(v.sum)} gold.`);
    case "achievement": {
      const achievement = ACHIEVEMENTS.find((a) => a.id === v.achievement);
      return achievement ? t(`${n0}: достижение «${achievement.name.ru}».`, `${n0}: achievement "${achievement.name.en}".`) : t(n0, n0);
    }
    case "deed": {
      const adventure = findAdventure(universe.id, String(v.deed));
      const done = v.outcome === "done";
      if (!adventure) return t(n0, n0);
      return done
        ? t(`${n0} завершает дело: «${adventure.name.ru}».`, `${n0} completes a deed: "${adventure.name.en}".`)
        : t(`${n0} не справляется с делом: «${adventure.name.ru}».`, `${n0} fails a deed: "${adventure.name.en}".`);
    }
    case "story": {
      const id = String(v.story);
      const event = findEvent(universe, id);
      if (event) {
        const choice = event.choices.find((x) => x.id === v.choice);
        const title = fillText(event.title, { name: n0 });
        const chosen = choice ? fillText(choice.text, { name: n0 }) : null;
        return t(`${n0}: ${title.ru}.${chosen ? ` Решение: ${chosen.ru}.` : ""}`, `${n0}: ${title.en}.${chosen ? ` Decision: ${chosen.en}.` : ""}`);
      }
      const consequence = findLineageConsequence(id);
      if (consequence) return fillText(t(`${consequence.title.ru}. ${consequence.text.ru}`, `${consequence.title.en}. ${consequence.text.en}`), { name: n0 });
      return t(n0, n0);
    }
    case "talent":
    case "secret":
      return t(n0, n0);
  }
}

export function renderChronicle(state: GameState, entry: ChronicleEntry): ChronicleView {
  const universe = getUniverse(state.character.universeId);
  return { id: entry.id, year: entry.year, gen: entry.gen, kind: entry.kind, text: names(universe, entry), who: entry.who, src: entry.src, link: entry.link };
}

/** Род целиком: хроника, древо, достижения, фамильные черты. Отдаётся отдельным запросом: в ответы на действия не входит */
export function presentLineage(state: GameState): LineageView {
  const universe = getUniverse(state.character.universeId);
  const lineage = state.lineage;
  const chronicle = lineage.chronicle.slice(-CHRONICLE_VIEW_LIMIT);
  return {
    name: lineage.name,
    generation: lineage.generation,
    renown: lineage.renown,
    epoch: lineage.epoch,
    lives: lineage.lives.map((life) => ({
      gen: life.gen,
      name: life.name,
      age: life.age,
      born: life.born,
      score: life.score,
      title: LIFE_TITLES[life.titleId]?.name ?? t("—", "—"),
      cause: life.cause,
      heirName: life.heirName
    })),
    chronicle: chronicle.map((entry) => renderChronicle(state, entry)).reverse(),
    archived: lineage.archived + Math.max(0, lineage.chronicle.length - chronicle.length),
    achievements: achievementViews(state),
    traits: {
      // Фамильные черты: проявились хотя бы в двух поколениях
      talents: Object.entries(lineage.traits.talents)
        .filter(([, gens]) => gens >= 2)
        .map(([id, gens]) => ({ name: findTalent(universe, id)?.name ?? t(id, id), gens })),
      weaknesses: Object.entries(lineage.traits.weaknesses)
        .filter(([, gens]) => gens >= 2)
        .map(([id, gens]) => ({ name: findWeakness(universe, id)?.name ?? t(id, id), gens }))
    },
    threads: lineage.threads.map((x) => ({ name: THREADS[x.id]?.name ?? t(x.id, x.id), description: THREADS[x.id]?.description ?? t("", ""), gen: x.gen })),
    tree: presentTree(state)
  };
}
