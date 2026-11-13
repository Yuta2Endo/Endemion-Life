// То, что игрок видит о жизни персонажа помимо листа: биография, семья и люди вокруг, шкалы мира, задание Системы.
// Скрытое (спящие таланты, потенциал, судьба, тайна рода) попадает сюда только после раскрытия: клиенту его не отдаём
import { interactionAvailable, interactionBlock, interactionChance, INTERACTION_RULES } from "../character/interactions.js";
import { affinityLabel, isFamily, npcAge, roleName } from "../character/npcs.js";
import { creationUpbringing, type UpbringingView } from "../catalog.js";
import { npcLifeStage, npcSettlementName, otherSide, readSocialState, relationshipName } from "../character/social.js";
import { findStory, storiesOf } from "../character/stories.js";
import { TEMPERAMENTS } from "../character/temperaments.js";
import { findProfession } from "../rpg/skills.js";
import { clamp } from "../stats.js";
import { t, fillText, type LocalizedText } from "../i18n.js";
import { NPC_TRAITS } from "../rpg/common.js";
import { Rng } from "../rng.js";
import { SELF_ID, type GameState, type InteractionId, type NpcGoal, type NpcLogEntry, type NpcLogKind, type NpcRole, type NpcStoryStatus, type RelationshipType } from "../types.js";
import { INTERACTIONS } from "../types.js";
import { getUniverse } from "../universes/registry.js";
import { findQuest } from "../world/quests.js";
import type { EngineContext } from "./context.js";

export interface InteractionView {
  id: InteractionId;
  name: LocalizedText;
  available: boolean;
  /** Шанс успеха. null — сейчас недоступно */
  chance: number | null;
  /** Почему закрыто: год, условия, пропал. Пусто — открыто */
  locked: string;
}

export interface NpcEventView {
  age: number;
  kind: NpcLogKind;
  npcId: string;
  npc: string;
  text: LocalizedText;
}

export interface RelationshipView {
  id: string;
  npcId: string;
  name: string;
  type: LocalizedText;
  strength: number;
  trust: number;
  alive: boolean;
}

export interface NpcStoryView {
  id: string;
  storyId: string;
  title: LocalizedText;
  stage: number;
  stages: number;
  status: NpcStoryStatus;
  text: LocalizedText;
  since: number;
  updatedAt: number;
}

export interface NpcView {
  id: string;
  role: NpcRole;
  roleName: LocalizedText;
  name: string;
  gender: "female" | "male";
  /** Возраст сейчас или в момент смерти */
  age: number;
  alive: boolean;
  diedAt: number | null;
  metAt: number;
  family: boolean;
  affinity: number;
  affinityLabel: LocalizedText;
  trait: LocalizedText;
  temperament: LocalizedText;
  occupation: LocalizedText;
  bio: LocalizedText;
  /** Сила NPC: игрок видит её как ориентир для поединков и учёбы */
  power: number;
  skillId: string | null;
  /** Отношение хоть раз доходило до самого близкого. Повтор не отмечается */
  bond: boolean;
  interactions: InteractionView[];
  /** Stage 03: возрастная стадия, цель жизни, сословие и поселение для досье */
  stage: LocalizedText;
  goal: LocalizedText | null;
  socialClass: LocalizedText;
  settlement: LocalizedText | null;
  relationships: RelationshipView[];
  stories: NpcStoryView[];
  events: NpcEventView[];
}

export interface MeterView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  value: number;
  min: number;
  max: number;
  danger: boolean;
}

export interface QuestView {
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  since: number;
  deadline: number;
}

export interface SecretView {
  name: LocalizedText;
  reveal: LocalizedText;
}

export interface LifeProfile {
  familyName: string;
  birthplace: LocalizedText;
  omen: LocalizedText;
  familyHistory: LocalizedText;
  biography: LocalizedText[];
  /** Stage 02.5: уклад детства, выбранный при рождении. null — случайное рождение */
  upbringing: UpbringingView | null;
  npcs: NpcView[];
  /** Stage 03: важные связи персонажа и последние изменения отношений */
  connections: RelationshipView[];
  recentChanges: NpcEventView[];
  meters: MeterView[];
  quest: QuestView | null;
  questsDone: number;
  /** Сколько отложенных последствий ещё ждут своего часа. Что именно — тайна до их прихода */
  pendingConsequences: number;
  /** Раскрытое из скрытого. null — ещё не узнано */
  potential: number | null;
  destiny: number | null;
  /** Есть ли у семьи тайна, которую персонаж ещё не узнал */
  unknownSecret: boolean;
  secret: SecretView | null;
  /** Спящие таланты: только их число, без названий */
  dormantTalents: number;
}

function interactionsOf(ctx: EngineContext, npcId: string): InteractionView[] {
  const npc = ctx.state.npcs.find((n) => n.id === npcId);
  if (!npc) return [];
  return INTERACTIONS.map((id) => {
    const available = !ctx.state.pending && ctx.state.life.alive && interactionAvailable(ctx, npc, id);
    return { id, name: INTERACTION_RULES[id].name, available, chance: available ? interactionChance(ctx, npc, id) : null, locked: available ? "" : interactionBlock(ctx, npc, id) };
  });
}

const GOAL_NAMES: Readonly<Record<NpcGoal, LocalizedText>> = {
  family: t("семья", "family"),
  mastery: t("мастерство", "mastery"),
  rise: t("положение", "standing"),
  knowledge: t("знание", "knowledge"),
  wealth: t("богатство", "wealth")
};

const LOG_TEXT: Readonly<Partial<Record<NpcLogKind, LocalizedText>>> = {
  married: t("Брак", "Marriage"),
  divorced: t("Развод", "Divorce"),
  widowed: t("Вдовство", "Widowhood"),
  child: t("Рождение ребёнка", "A child is born"),
  adopted: t("Приёмный ребёнок", "An adopted child"),
  ill: t("Болезнь", "Illness"),
  missing: t("Пропал(а)", "Missing"),
  returned: t("Возвращение", "Return"),
  goal: t("Цель жизни", "A life goal"),
  estate: t("Имущество", "Estate"),
  bond: t("Узы", "Bond"),
  retired: t("Уход от дел", "Retirement"),
  "job-loss": t("Потеря работы", "Lost a job"),
  "job-change": t("Смена дела", "Changed a trade"),
  education: t("Образование", "Education"),
  mentor: t("Наставничество", "Mentorship")
};

function personName(state: GameState, id: string): string {
  if (id === SELF_ID) return state.character.name;
  return state.npcs.find((npc) => npc.id === id)?.name ?? id;
}

function className(state: GameState, id: string): LocalizedText {
  return getUniverse(state.character.universeId).socialClasses.find((item) => item.id === id)?.name ?? t(id, id);
}

function logText(state: GameState, universe: ReturnType<typeof getUniverse>, entry: NpcLogEntry): LocalizedText {
  const value = entry.value ?? "";
  if (entry.kind === "job" || entry.kind === "job-change" || entry.kind === "job-loss") {
    const profession = findProfession(universe, value);
    if (profession) return profession.name;
  }
  if (entry.kind === "promotion") return t(`Повышение (ступень ${value})`, `Promotion (rank ${value})`);
  if (entry.kind === "education") return universe.education.find((item) => item.id === value)?.name ?? LOG_TEXT.education!;
  if (entry.kind === "class-up") return t(`Сословие: ${className(state, value).ru}`, `Standing: ${className(state, value).en}`);
  if (entry.kind === "class-down") return t(`Сословие: ${className(state, value).ru}`, `Standing: ${className(state, value).en}`);
  if (entry.kind === "child" || entry.kind === "adopted") return t(`${LOG_TEXT[entry.kind]!.ru}: ${personName(state, value)}`, `${LOG_TEXT[entry.kind]!.en}: ${personName(state, value)}`);
  if (entry.kind === "goal") return t(`Цель: ${GOAL_NAMES[value as NpcGoal]?.ru ?? value}`, `Goal: ${GOAL_NAMES[value as NpcGoal]?.en ?? value}`);
  if (entry.kind === "relationship") {
    const [type, rawDelta] = value.split(":");
    const delta = Number(rawDelta);
    const label = relationshipName(type as RelationshipType);
    const sign = Number.isFinite(delta) && delta > 0 ? "+" : "";
    return t(`${label.ru} ${sign}${Number.isFinite(delta) ? delta : 0}`, `${label.en} ${sign}${Number.isFinite(delta) ? delta : 0}`);
  }
  if (entry.kind === "story") {
    const definition = findStory(value);
    return definition ? definition.title : t("Личная история", "A personal story");
  }
  return LOG_TEXT[entry.kind] ?? t(entry.kind, entry.kind);
}

function storyView(state: GameState, npcName: string, story: ReturnType<typeof storiesOf>[number]): NpcStoryView {
  const definition = findStory(story.storyId);
  const stageIndex = definition ? Math.min(story.stage, Math.max(0, definition.stages.length - 1)) : 0;
  const stage = definition?.stages[stageIndex];
  return {
    id: story.id,
    storyId: story.storyId,
    title: definition?.title ?? t(story.storyId, story.storyId),
    stage: story.stage,
    stages: definition?.stages.length ?? 0,
    status: story.status,
    text: stage ? fillText(stage.text, { npc: npcName }) : t("", ""),
    since: story.since,
    updatedAt: story.updatedAt
  };
}

function relationshipsOfNpc(state: GameState, npcId: string): RelationshipView[] {
  return readSocialState(state)
    .relationships.filter((item) => item.a === npcId || item.b === npcId)
    .map((item) => {
      const other = otherSide(item, npcId);
      const npc = state.npcs.find((candidate) => candidate.id === other);
      return {
        id: String(item.id),
        npcId: other,
        name: npc?.name ?? personName(state, other),
        type: relationshipName(item.type),
        strength: item.strength,
        trust: item.trust,
        alive: npc?.alive ?? false
      };
    })
    .sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength) || a.name.localeCompare(b.name));
}

function connectionType(npc: GameState["npcs"][number]): RelationshipType {
  if (isFamily(npc)) return "family";
  if (npc.role === "friend") return "friend";
  if (npc.role === "rival") return "rival";
  if (npc.role === "mentor") return "mentor";
  if (npc.role === "partner" || npc.role === "spouse") return "romantic";
  if (npc.affinity <= -20) return "enemy";
  if (npc.affinity >= 25) return "friend";
  return "acquaintance";
}

function connectionsOf(state: GameState): RelationshipView[] {
  return state.npcs
    .filter((npc) => npc.alive && (isFamily(npc) || ["friend", "rival", "mentor", "partner", "spouse"].includes(npc.role) || npc.affinity >= 25 || npc.affinity <= -25))
    .map((npc) => ({
      id: npc.id,
      npcId: npc.id,
      name: npc.name,
      type: relationshipName(connectionType(npc)),
      strength: npc.affinity,
      trust: clamp(50 + Math.round(npc.affinity / 2), 0, 100),
      alive: npc.alive
    }))
    .sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength) || a.name.localeCompare(b.name));
}

function recentChangesOf(state: GameState, universe: ReturnType<typeof getUniverse>): NpcEventView[] {
  const rows: { view: NpcEventView; order: number }[] = [];
  state.npcs.forEach((npc, npcIndex) => {
    npc.log.forEach((entry, entryIndex) => {
      if (entry.kind !== "relationship" && entry.kind !== "story") return;
      rows.push({
        view: { age: entry.at, kind: entry.kind, npcId: npc.id, npc: npc.name, text: logText(state, universe, entry) },
        order: entry.at * 100_000 + npcIndex * 100 + entryIndex
      });
    });
  });
  rows.sort((a, b) => b.order - a.order);
  return rows.slice(0, 8).map((row) => row.view);
}

export function presentProfile(state: GameState): LifeProfile {
  const universe = getUniverse(state.character.universeId);
  // Представление ничего не меняет и не бросает кости: генератор здесь только для типа контекста
  const ctx: EngineContext = { state, rng: new Rng(0), universe, changes: [] };
  const age = state.life.age;
  const hidden = state.hidden;
  const secret = hidden.familySecret ? universe.familySecrets.find((s) => s.id === hidden.familySecret) : undefined;
  const secretKnown = hidden.revealed.includes("familySecret");
  const quest = state.quest ? findQuest(ctx, state.quest.id) : undefined;

  return {
    familyName: state.background.familyName,
    birthplace: state.background.birthplace,
    omen: state.background.omen,
    familyHistory: state.background.familyHistory,
    biography: state.background.biography,
    upbringing: creationUpbringing(universe, state.character),
    npcs: state.npcs.map((npc) => ({
      id: npc.id,
      role: npc.role,
      roleName: roleName(npc.role, npc.gender),
      name: npc.name,
      gender: npc.gender,
      age: Math.max(0, npcAge(npc, age)),
      alive: npc.alive,
      diedAt: npc.diedAt,
      metAt: npc.metAt,
      family: isFamily(npc),
      affinity: npc.affinity,
      affinityLabel: affinityLabel(npc.affinity),
      trait: NPC_TRAITS.find((x) => x.id === npc.traitId)?.name ?? t("—", "—"),
      temperament: TEMPERAMENTS.find((x) => x.id === npc.temperamentId)?.name ?? t("—", "—"),
      occupation: npc.occupation,
      bio: npc.bio,
      power: npc.power,
      skillId: npc.skillId,
      bond: npc.log.some((entry) => entry.kind === "bond"),
      interactions: npc.alive ? interactionsOf(ctx, npc.id) : [],
      stage: npcLifeStage(universe, npc, Math.max(0, npcAge(npc, age))),
      goal: npc.goal ? GOAL_NAMES[npc.goal] : null,
      socialClass: className(state, npc.socialClassId),
      settlement: npcSettlementName(universe, npc.id),
      relationships: relationshipsOfNpc(state, npc.id),
      stories: storiesOf(state, npc.id).map((story) => storyView(state, npc.name, story)),
      events: npc.log.slice(-6).reverse().map((entry) => ({ age: entry.at, kind: entry.kind, npcId: npc.id, npc: npc.name, text: logText(state, universe, entry) }))
    })),
    connections: connectionsOf(state),
    recentChanges: recentChangesOf(state, universe),
    meters: universe.meters.map((meter) => ({
      id: meter.id,
      name: meter.name,
      description: meter.description,
      value: state.meters[meter.id] ?? meter.initial,
      min: meter.min,
      max: meter.max,
      danger: meter.danger ?? false
    })),
    quest: state.quest && quest ? { id: quest.id, title: quest.title, text: quest.text, since: state.quest.since, deadline: state.quest.since + quest.years } : null,
    questsDone: state.questsDone.length,
    pendingConsequences: state.consequences.length,
    potential: hidden.revealed.includes("potential") ? hidden.potential : null,
    destiny: hidden.revealed.includes("destiny") ? hidden.destiny : null,
    unknownSecret: secret !== undefined && !secretKnown,
    secret: secret && secretKnown ? { name: secret.name, reveal: secret.reveal } : null,
    dormantTalents: hidden.dormantTalents.length
  };
}
