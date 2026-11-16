// R5.11: семейный совет. Игрок заранее выбирает предпочтительного наследника, опекуна
// для несовершеннолетнего наследника и судьбу родового дома. Совет не тратит год и не бросает кубики:
// решает род, а последствия видны при следующем наследовании.
import { npcAge } from "../character/npcs.js";
import type { EngineContext } from "../engine/context.js";
import { GameRuleError } from "../errors.js";
import { KinGraph, type KinRelation } from "../family/kin.js";
import { t, type LocalizedText } from "../i18n.js";
import { SELF_ID, ESTATE_POLICIES, type CouncilRecord, type EstatePolicy, type GameState, type NpcState } from "../types.js";
import { RELATION_NAMES } from "./present.js";
import { potentialHeirs } from "./succession.js";

export const COUNCIL_MIN_AGE = 16;
export const COUNCIL_COOLDOWN = 5;
export const COUNCIL_HISTORY_LIMIT = 8;

export interface GuardianCandidate {
  npc: NpcState;
  age: number;
  relation: KinRelation | null;
  relationName: LocalizedText;
  affinity: number;
  available: boolean;
  locked: LocalizedText | null;
}

/** Почему совет нельзя собрать сейчас. null — можно */
export function councilBlock(state: GameState): LocalizedText | null {
  if (state.life.age < COUNCIL_MIN_AGE) {
    return t(`Совет собирается с ${COUNCIL_MIN_AGE} лет`, `The council meets from age ${COUNCIL_MIN_AGE}`);
  }
  if (state.pending) return t("Сначала ответьте на событие", "Answer the event first");
  const last = state.lineage.council?.current;
  if (last && last.gen === state.lineage.generation) {
    const wait = COUNCIL_COOLDOWN - (state.life.age - last.age);
    if (wait > 0) return t(`Следующий совет через ${wait} г.`, `The next council in ${wait} years`);
  }
  return null;
}

/**
 * Кого род может позвать в опекуны: живые взрослые рядом с главой, кроме самого наследника.
 * Сначала супруг и родня, затем близкие люди. Пропавшие без вести не могут опекать.
 */
export function guardianCandidates(state: GameState, heirId?: string | null): GuardianCandidate[] {
  const graph = new KinGraph(state);
  const list: GuardianCandidate[] = [];
  for (const npc of state.npcs) {
    if (!npc.alive || npc.status === "missing" || npc.id === heirId) continue;
    const age = npcAge(npc, state.life.age);
    if (age < 18) continue;
    const relation = graph.relation(SELF_ID, npc.id);
    const family = relation !== null && relation !== "in-law";
    if (!family && npc.affinity < 20) continue;
    list.push({
      npc,
      age,
      relation,
      relationName: relation ? (RELATION_NAMES[relation] ?? t("Родственник", "Relative")) : t("Близкий человек", "Close person"),
      affinity: npc.affinity,
      available: true,
      locked: null
    });
  }
  const rank = (candidate: GuardianCandidate) => {
    if (candidate.relation === "spouse") return 0;
    if (candidate.relation !== null) return 1;
    return 2;
  };
  return list.sort((a, b) => rank(a) - rank(b) || b.affinity - a.affinity || a.npc.id.localeCompare(b.npc.id));
}

export interface CouncilDecision {
  title: LocalizedText;
  text: LocalizedText;
  record: CouncilRecord;
}

/** Собрать совет и записать волю рода. Валидирует выборы и не двигает время */
export function holdCouncil(
  ctx: EngineContext,
  input: { heirId?: string | null; guardianId?: string | null; estate?: EstatePolicy }
): CouncilDecision {
  const state = ctx.state;
  if (state.life.age < COUNCIL_MIN_AGE) throw new GameRuleError("COUNCIL_LOCKED", `Совет собирается с ${COUNCIL_MIN_AGE} лет`);
  if (state.pending) throw new GameRuleError("EVENT_PENDING", "Сначала ответьте на событие");
  const last = state.lineage.council?.current;
  if (last && last.gen === state.lineage.generation && state.life.age - last.age < COUNCIL_COOLDOWN) {
    throw new GameRuleError("COUNCIL_COOLDOWN", `Следующий совет через ${COUNCIL_COOLDOWN - (state.life.age - last.age)} лет`);
  }
  const heirs = potentialHeirs(state).filter((candidate) => candidate.available);
  const heirId = input.heirId ?? null;
  const heir = heirId === null ? undefined : heirs.find((candidate) => candidate.npc.id === heirId);
  if (heirId !== null && !heir) throw new GameRuleError("COUNCIL_LOCKED", "Этот человек не может быть наследником");
  const guardianId = input.guardianId ?? null;
  const guardian = guardianId === null ? undefined : guardianCandidates(state, heirId).find((candidate) => candidate.npc.id === guardianId);
  if (guardianId !== null && !guardian) throw new GameRuleError("COUNCIL_LOCKED", "Этот человек не может быть опекуном");
  const estate = input.estate ?? "law";
  if (!ESTATE_POLICIES.includes(estate)) throw new GameRuleError("INVALID_INPUT", "Неизвестное решение о наследстве");

  const record: CouncilRecord = {
    gen: state.lineage.generation,
    age: state.life.age,
    heirId,
    heirName: heir?.npc.name ?? null,
    guardianId,
    guardianName: guardian?.npc.name ?? null,
    estate
  };
  const council = state.lineage.council ?? { current: null, history: [] };
  council.current = record;
  council.history = [record, ...council.history].slice(0, COUNCIL_HISTORY_LIMIT);
  state.lineage.council = council;

  const heirText = record.heirName
    ? t(`Наследником назван ${record.heirName}.`, `${record.heirName} is named heir.`)
    : t("Наследника определит закон мира.", "The law of the world will choose the heir.");
  const guardianText = record.guardianName
    ? t(`Опекуном до совершеннолетия будет ${record.guardianName}.`, `${record.guardianName} will hold the estate until the heir comes of age.`)
    : t("Опекуна выберет закон, если наследник ещё молод.", "The law will choose a guardian if the heir is still young.");
  const estateText =
    estate === "keep"
      ? t("Родовой дом должен остаться в семье.", "The family home must stay with the family.")
      : estate === "sell"
        ? t("Родовой дом будет продан и войдёт в наследство.", "The family home will be sold into the estate.")
        : t("Имущество разделит закон мира.", "The law of the world will divide the estate.");
  return {
    title: t("Семейный совет", "The family council"),
    text: t(`${heirText.ru} ${guardianText.ru} ${estateText.ru}`, `${heirText.en} ${guardianText.en} ${estateText.en}`),
    record
  };
}
