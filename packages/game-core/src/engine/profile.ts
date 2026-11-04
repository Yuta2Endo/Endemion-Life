// То, что игрок видит о жизни персонажа помимо листа: биография, семья и люди вокруг, шкалы мира, задание Системы.
// Скрытое (спящие таланты, потенциал, судьба, тайна рода) попадает сюда только после раскрытия: клиенту его не отдаём
import { interactionAvailable, interactionChance, INTERACTION_RULES } from "../character/interactions.js";
import { affinityLabel, isFamily, npcAge, roleName } from "../character/npcs.js";
import { TEMPERAMENTS } from "../character/temperaments.js";
import { t, type LocalizedText } from "../i18n.js";
import { NPC_TRAITS } from "../rpg/common.js";
import { Rng } from "../rng.js";
import { INTERACTIONS, type GameState, type InteractionId, type NpcRole } from "../types.js";
import { getUniverse } from "../universes/registry.js";
import { findQuest } from "../world/quests.js";
import type { EngineContext } from "./context.js";

export interface InteractionView {
  id: InteractionId;
  name: LocalizedText;
  available: boolean;
  /** Шанс успеха. null — сейчас недоступно */
  chance: number | null;
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
  interactions: InteractionView[];
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
  npcs: NpcView[];
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
    return { id, name: INTERACTION_RULES[id].name, available, chance: available ? interactionChance(ctx, npc, id) : null };
  });
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
      interactions: npc.alive ? interactionsOf(ctx, npc.id) : []
    })),
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
