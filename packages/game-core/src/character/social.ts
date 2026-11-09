// Stage 03: социальная память жизни. Связи NPC–NPC хранятся отдельно от родства:
// родство отвечает на вопрос "кем он тебе приходится", а связь — "как они относятся друг к другу".
// Связь персонажа с NPC по-прежнему выводится из роли и affinity, чтобы не было двух источников истины.
import type { EngineContext } from "../engine/context.js";
import { isPresent } from "../family/kin.js";
import { logNpc } from "../family/events.js";
import { t, type LocalizedText } from "../i18n.js";
import { hashSeed } from "../rng.js";
import { clamp } from "../stats.js";
import {
  RELATIONSHIP_TYPES,
  SELF_ID,
  type GameState,
  type NpcRelationship,
  type NpcState,
  type NpcStoryState,
  type RelationshipType,
  type SocialState
} from "../types.js";
import { npcLifespan } from "./npcs.js";
import type { UniverseDefinition } from "../universes/types.js";
import { getUniverse } from "../universes/registry.js";
import { settlementSeeds, pushWorldActivity } from "../world/state.js";

export const MAX_RELATIONSHIPS = 120;
export const MAX_STORY_RECORDS = 48;

export const RELATIONSHIP_NAMES: Readonly<Record<RelationshipType, LocalizedText>> = {
  family: t("семья", "family"),
  friend: t("друг", "friend"),
  rival: t("соперник", "rival"),
  romantic: t("возлюбленный", "beloved"),
  mentor: t("наставник", "mentor"),
  colleague: t("товарищ по делу", "colleague"),
  enemy: t("враг", "enemy"),
  acquaintance: t("знакомый", "acquaintance")
};

export const NPC_STAGE_NAMES = {
  child: t("детство", "childhood"),
  teen: t("отрочество", "adolescence"),
  adult: t("взрослая жизнь", "adulthood"),
  mature: t("зрелость", "maturity"),
  elder: t("старость", "old age")
} as const;

export function newSocialState(): SocialState {
  return { relationships: [], stories: [], nextRelationshipId: 1, nextStoryId: 1 };
}

function idsOf(state: GameState): Set<string> {
  const ids = new Set<string>([SELF_ID]);
  for (const npc of state.npcs) ids.add(npc.id);
  return ids;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function validNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRelationshipType(value: unknown): value is RelationshipType {
  return typeof value === "string" && (RELATIONSHIP_TYPES as readonly string[]).includes(value);
}

function readRelationships(value: unknown, ids: ReadonlySet<string>): NpcRelationship[] {
  if (!Array.isArray(value)) return [];
  const seen = new Map<string, NpcRelationship>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Partial<NpcRelationship>;
    if (!validNumber(raw.id) || typeof raw.a !== "string" || typeof raw.b !== "string") continue;
    if (raw.a === raw.b || !ids.has(raw.a) || !ids.has(raw.b)) continue;
    if (!isRelationshipType(raw.type)) continue;
    if (!validNumber(raw.strength) || !validNumber(raw.trust)) continue;
    const record: NpcRelationship = {
      id: Math.max(1, Math.round(raw.id)),
      a: raw.a,
      b: raw.b,
      type: raw.type,
      strength: clamp(Math.round(raw.strength), -100, 100),
      trust: clamp(Math.round(raw.trust), 0, 100),
      since: validNumber(raw.since) ? Math.max(0, Math.round(raw.since)) : 0,
      updatedAt: validNumber(raw.updatedAt) ? Math.max(0, Math.round(raw.updatedAt)) : 0,
      source: typeof raw.source === "string" ? raw.source.slice(0, 64) : "npc"
    };
    const key = pairKey(record.a, record.b);
    const previous = seen.get(key);
    if (!previous || record.updatedAt >= previous.updatedAt) seen.set(key, record);
  }
  return [...seen.values()].sort((a, b) => a.id - b.id).slice(-MAX_RELATIONSHIPS);
}

function readStories(value: unknown, ids: ReadonlySet<string>): NpcStoryState[] {
  if (!Array.isArray(value)) return [];
  const seen = new Map<string, NpcStoryState>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Partial<NpcStoryState>;
    if (typeof raw.npcId !== "string" || !ids.has(raw.npcId)) continue;
    if (typeof raw.storyId !== "string" || raw.storyId.length === 0 || raw.storyId.length > 64) continue;
    if (raw.status !== "active" && raw.status !== "done" && raw.status !== "failed" && raw.status !== "abandoned") continue;
    if (!validNumber(raw.stage) || raw.stage < 0 || raw.stage > 32) continue;
    const record: NpcStoryState = {
      id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id.slice(0, 96) : `${raw.npcId}:${raw.storyId}`,
      npcId: raw.npcId,
      storyId: raw.storyId,
      stage: Math.round(raw.stage),
      status: raw.status,
      since: validNumber(raw.since) ? Math.max(0, Math.round(raw.since)) : 0,
      updatedAt: validNumber(raw.updatedAt) ? Math.max(0, Math.round(raw.updatedAt)) : 0,
      source: typeof raw.source === "string" ? raw.source.slice(0, 64) : "story"
    };
    const key = `${record.npcId}::${record.storyId}`;
    const previous = seen.get(key);
    if (!previous || (record.status === "active" && previous.status !== "active") || record.updatedAt >= previous.updatedAt) seen.set(key, record);
  }
  return [...seen.values()].sort((a, b) => a.updatedAt - b.updatedAt || a.id.localeCompare(b.id)).slice(-MAX_STORY_RECORDS);
}

/**
 * Нормализация социальной памяти на границе действия/презентации.
 * Возвращает чистый объект и не мутирует состояние: презентация должна оставаться readonly.
 */
export function readSocialState(state: GameState): SocialState {
  const ids = idsOf(state);
  const raw = state.social;
  const relationships = readRelationships(raw?.relationships, ids);
  const stories = readStories(raw?.stories, ids);
  const nextRelationshipId = Math.max(
    1,
    ...relationships.map((item) => item.id + 1),
    validNumber(raw?.nextRelationshipId) ? Math.round(raw.nextRelationshipId) : 1
  );
  const nextStoryId = Math.max(1, validNumber(raw?.nextStoryId) ? Math.round(raw.nextStoryId) : 1);
  return { relationships, stories, nextRelationshipId, nextStoryId };
}

/** Нормализует и записывает состояние. Вызывается только из applyAction/advance/import. */
export function normalizeSocialState(state: GameState): SocialState {
  const normalized = readSocialState(state);
  state.social = normalized;
  return normalized;
}

export function relationshipsOf(state: GameState, id: string): NpcRelationship[] {
  return readSocialState(state).relationships.filter((item) => item.a === id || item.b === id);
}

export function relationshipBetween(state: GameState, a: string, b: string): NpcRelationship | undefined {
  if (a === b) return undefined;
  const key = pairKey(a, b);
  return readSocialState(state).relationships.find((item) => pairKey(item.a, item.b) === key);
}

export function otherSide(relationship: NpcRelationship, id: string): string {
  return relationship.a === id ? relationship.b : relationship.a;
}

/** Создаёт или обновляет связь. Новые связи не появляются у несуществующих и мёртвых людей. */
export function setRelationship(
  ctx: EngineContext,
  a: string,
  b: string,
  type: RelationshipType,
  strength: number,
  trust: number,
  source: string
): NpcRelationship | undefined {
  if (a === b) return undefined;
  const social = normalizeSocialState(ctx.state);
  const known = idsOf(ctx.state);
  if (!known.has(a) || !known.has(b)) return undefined;
  const age = ctx.state.life.age;
  const key = pairKey(a, b);
  const existing = social.relationships.find((item) => pairKey(item.a, item.b) === key);
  if (existing) {
    existing.type = type;
    existing.strength = clamp(Math.round(strength), -100, 100);
    existing.trust = clamp(Math.round(trust), 0, 100);
    existing.updatedAt = age;
    existing.source = source;
    return existing;
  }
  if (social.relationships.length >= MAX_RELATIONSHIPS) return undefined;
  const record: NpcRelationship = {
    id: social.nextRelationshipId++,
    a,
    b,
    type,
    strength: clamp(Math.round(strength), -100, 100),
    trust: clamp(Math.round(trust), 0, 100),
    since: age,
    updatedAt: age,
    source
  };
  social.relationships.push(record);
  return record;
}

export function adjustRelationship(
  ctx: EngineContext,
  a: string,
  b: string,
  strengthDelta: number,
  trustDelta: number,
  source: string
): NpcRelationship | undefined {
  const existing = relationshipBetween(ctx.state, a, b);
  if (!existing) return undefined;
  return setRelationship(ctx, existing.a, existing.b, existing.type, existing.strength + strengthDelta, existing.trust + trustDelta, source);
}

/** Логирует изменение отношения в память персонажа, чтобы досье показывало "что изменилось". */
export function logRelationship(ctx: EngineContext, npc: NpcState, type: RelationshipType, delta: number): void {
  logNpc(ctx, npc, "relationship", `${type}:${delta > 0 ? "+" : ""}${delta}`);
}

export function logStory(ctx: EngineContext, npc: NpcState, storyId: string): void {
  logNpc(ctx, npc, "story", storyId);
}

/** Возрастная стадия NPC. Считается от расовой продолжительности жизни, поэтому не ломается в мире с долгожителями. */
export function npcLifeStage(universe: UniverseDefinition, npc: NpcState, age: number): LocalizedText {
  const lifespan = Math.max(20, npcLifespan(universe, npc));
  if (age < 13) return NPC_STAGE_NAMES.child;
  if (age < 18) return NPC_STAGE_NAMES.teen;
  if (age < lifespan * 0.55) return NPC_STAGE_NAMES.adult;
  if (age < lifespan * 0.8) return NPC_STAGE_NAMES.mature;
  return NPC_STAGE_NAMES.elder;
}

/** Поселение NPC выводится детерминированно, чтобы старые сохранения получали его без миграции. */
export function npcSettlementId(universe: UniverseDefinition, npcId: string): string | null {
  const seeds = settlementSeeds(universe);
  if (seeds.length === 0) return null;
  return seeds[hashSeed(`settlement::${npcId}`) % seeds.length]!.id;
}

export function npcSettlementName(universe: UniverseDefinition, npcId: string): LocalizedText | null {
  const seeds = settlementSeeds(universe);
  if (seeds.length === 0) return null;
  return seeds[hashSeed(`settlement::${npcId}`) % seeds.length]!.name;
}

export function settlementFactor(state: GameState, npcId: string, kind: "promotion" | "job-loss" | "illness" | "class-up" | "class-down"): number {
  const universe = getUniverse(state.character.universeId);
  const id = npcSettlementId(universe, npcId);
  if (!id) return 1;
  const settlement = state.world?.settlements.find((item) => item.id === id);
  const prosperity = settlement?.prosperity ?? 50;
  const stability = settlement?.stability ?? 50;
  if (kind === "promotion" || kind === "class-up") return 0.6 + prosperity / 125;
  if (kind === "job-loss" || kind === "illness") return 0.6 + (100 - stability) / 125;
  return 0.6 + (100 - prosperity) / 150;
}

/** Семейные узы NPC–NPC (супруги и родители-дети) попадают в социальную память как family-связи. */
export function ensureKinRelationships(ctx: EngineContext): void {
  const state = ctx.state;
  const known = new Set(state.npcs.map((npc) => npc.id));
  for (const npc of state.npcs) {
    if (npc.spouseId && npc.spouseId !== SELF_ID && known.has(npc.spouseId)) {
      const existing = relationshipBetween(state, npc.id, npc.spouseId);
      if (!existing) setRelationship(ctx, npc.id, npc.spouseId, "family", 60, 70, "kin");
    }
    for (const parentId of npc.parents) {
      if (parentId === SELF_ID || !known.has(parentId)) continue;
      if (!relationshipBetween(state, parentId, npc.id)) setRelationship(ctx, parentId, npc.id, "family", 55, 65, "kin");
    }
  }
}

/**
 * Долгие связи между NPC: сослуживцы по фракции, приятели одного поселения.
 * Детерминировано от seed и id, ограничено 12 людьми, чтобы не раздувать сохранение.
 */
export function ensureSocialTies(ctx: EngineContext): void {
  const state = ctx.state;
  if (state.npcs.length < 2) return;
  ensureKinRelationships(ctx);
  const social = normalizeSocialState(state);
  if (social.relationships.length >= MAX_RELATIONSHIPS) return;
  const people = state.npcs.filter(isPresent).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 12);
  const universe = getUniverse(state.character.universeId);
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i]!;
      const b = people[j]!;
      if (social.relationships.length >= MAX_RELATIONSHIPS) return;
      if (relationshipBetween(state, a.id, b.id)) continue;
      const roll = hashSeed(`${state.seed}::ties::${a.id}::${b.id}`) % 100;
      const sameFaction = a.factionId !== null && a.factionId === b.factionId;
      const sameSettlement = npcSettlementId(universe, a.id) === npcSettlementId(universe, b.id);
      if (sameFaction && roll < 14) setRelationship(ctx, a.id, b.id, "colleague", 20 + (roll % 25), 30 + (roll % 30), "world");
      else if (sameSettlement && roll < 6) setRelationship(ctx, a.id, b.id, "acquaintance", 10 + (roll % 20), 20 + (roll % 25), "world");
      else if (!sameFaction && !sameSettlement && roll < 2) setRelationship(ctx, a.id, b.id, "acquaintance", 5 + (roll % 10), 15, "world");
    }
  }
}

/** NPC-событие становится новостью мира; одинаковые id перезаписываются, поэтому повторов нет. */
export function noteNpcActivity(ctx: EngineContext, npc: NpcState, kind: "settlement" | "crisis" | "discovery", title: LocalizedText, text: LocalizedText): void {
  if (!isPresent(npc)) return;
  pushWorldActivity(ctx, kind, `npc.${kind}.${npc.id}`, title, text);
}

export function relationshipName(type: RelationshipType): LocalizedText {
  return RELATIONSHIP_NAMES[type];
}

/** Связи влияют на поступки: поддержка помогает карьере, вражда повышает риск потерь. */
export function socialInfluence(state: GameState, npcId: string): { support: number; friction: number } {
  let support = 0;
  let friction = 0;
  for (const item of state.social?.relationships ?? []) {
    if (item.a !== npcId && item.b !== npcId) continue;
    if (item.type === "rival" || item.type === "enemy") friction += 1;
    else if (item.trust >= 45 && (item.type === "friend" || item.type === "mentor" || item.type === "colleague" || item.type === "family")) support += 1;
  }
  return { support: Math.min(4, support), friction: Math.min(4, friction) };
}
