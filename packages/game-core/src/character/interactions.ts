// Личное общение с NPC: поговорить, сделать подарок, учиться, тренироваться, выяснить отношения, попросить помощи.
// С каждым человеком — не чаще раза в год. Исход считает сервер, как и для событий
import { effectiveStats, meanStat } from "../character/derived.js";
import { checkChance } from "../engine/checks.js";
import type { EngineContext } from "../engine/context.js";
import { applyEffect, changeNpcAffinity, changeSkill, gainXp } from "../engine/effects.js";
import { GameRuleError } from "../errors.js";
import { t, type LocalizedText } from "../i18n.js";
import type { StatKey } from "../stats.js";
import type { InteractionId, NpcState } from "../types.js";
import { isFamily, roleName } from "./npcs.js";

export const GIFT_COST = 10;
/** Учиться можно у тех, кто знает навык лучше: не выше силы NPC */
const LEARN_GAIN = 3;

interface InteractionRule {
  name: LocalizedText;
  /** Можно ли так общаться с этим человеком сейчас */
  allowed: (ctx: EngineContext, npc: NpcState) => boolean;
  stats: StatKey[];
  difficulty: number;
  /** Эффекты успеха и провала; возвращают текст исхода */
  success: (ctx: EngineContext, npc: NpcState) => LocalizedText;
  failure: (ctx: EngineContext, npc: NpcState) => LocalizedText;
}

const adultNpc = (ctx: EngineContext, npc: NpcState) => ctx.state.life.age - npc.bornAt >= 14;

export const INTERACTION_RULES: Readonly<Record<InteractionId, InteractionRule>> = {
  talk: {
    name: t("Поговорить по душам", "Have a heart-to-heart"),
    allowed: (ctx) => ctx.state.life.age >= 4,
    stats: ["charisma", "wisdom"],
    difficulty: 8,
    success: (ctx, npc) => {
      changeNpcAffinity(ctx, npc.id, ctx.rng.int(4, 8));
      return t(`Разговор с ${npc.name} затягивается до ночи.`, `The talk with ${npc.name} runs late into the night.`);
    },
    failure: (ctx, npc) => {
      changeNpcAffinity(ctx, npc.id, -2);
      return t("Слова не находятся. Неловкое молчание.", "Words fail. An awkward silence.");
    }
  },
  gift: {
    name: t(`Сделать подарок (${GIFT_COST} золота)`, `Give a gift (${GIFT_COST} gold)`),
    allowed: (ctx) => ctx.state.character.wealth >= GIFT_COST && ctx.state.life.age >= 8,
    stats: ["charisma", "luck"],
    difficulty: 6,
    success: (ctx, npc) => {
      applyEffect(ctx, { type: "wealth", delta: -GIFT_COST });
      changeNpcAffinity(ctx, npc.id, ctx.rng.int(8, 14));
      return t("Подарок попадает в самое сердце.", "The gift touches the heart.");
    },
    failure: (ctx, npc) => {
      applyEffect(ctx, { type: "wealth", delta: -GIFT_COST });
      changeNpcAffinity(ctx, npc.id, 2);
      return t("Подарок принят вежливо, но без радости.", "The gift is accepted politely but without joy.");
    }
  },
  learn: {
    name: t("Попросить научить", "Ask to be taught"),
    allowed: (ctx, npc) => npc.skillId !== null && adultNpc(ctx, npc) && npc.affinity >= 0 && ctx.state.life.age >= 6,
    stats: ["intelligence", "willpower"],
    difficulty: 9,
    success: (ctx, npc) => {
      changeSkill(ctx, npc.skillId ?? "lore", LEARN_GAIN);
      changeNpcAffinity(ctx, npc.id, 3);
      gainXp(ctx, 10);
      return t(`${npc.name} терпеливо показывает, как надо.`, `${npc.name} patiently shows how it is done.`);
    },
    failure: (ctx, npc) => {
      changeSkill(ctx, npc.skillId ?? "lore", 1);
      return t("Урок не идёт впрок, но кое-что запомнилось.", "The lesson doesn't stick, but something remains.");
    }
  },
  spar: {
    name: t("Сойтись в учебном поединке", "Spar"),
    allowed: (ctx, npc) => ctx.state.life.age >= 10 && adultNpc(ctx, npc) && npc.role !== "child" && npc.role !== "grandparent",
    stats: ["strength", "agility"],
    difficulty: 10,
    success: (ctx, npc) => {
      changeSkill(ctx, "melee", 2);
      changeNpcAffinity(ctx, npc.id, npc.role === "rival" ? 4 : 2);
      gainXp(ctx, 15);
      return t(`Победа! ${npc.name} признаёт силу соперника.`, `Victory! ${npc.name} acknowledges your strength.`);
    },
    failure: (ctx, npc) => {
      changeSkill(ctx, "melee", 1);
      applyEffect(ctx, { type: "resource", resource: "health", delta: -8 });
      if (npc.role === "rival") changeNpcAffinity(ctx, npc.id, -3);
      return t("Поражение и синяки. Зато есть чему учиться.", "Defeat and bruises. But there is much to learn.");
    }
  },
  confront: {
    name: t("Выяснить отношения", "Confront"),
    allowed: (ctx, npc) => ctx.state.life.age >= 12 && npc.affinity < 10,
    stats: ["charisma", "willpower"],
    difficulty: 12,
    success: (ctx, npc) => {
      changeNpcAffinity(ctx, npc.id, ctx.rng.int(10, 20));
      return t("Старая обида высказана и отпущена.", "The old grudge is spoken and released.");
    },
    failure: (ctx, npc) => {
      changeNpcAffinity(ctx, npc.id, -ctx.rng.int(6, 12));
      applyEffect(ctx, { type: "reputation", delta: -1 });
      return t("Ссора разгорается сильнее прежнего.", "The quarrel flares worse than before.");
    }
  },
  "ask-help": {
    name: t("Попросить о помощи", "Ask for help"),
    allowed: (ctx, npc) => ctx.state.life.age >= 14 && npc.affinity >= 40 && adultNpc(ctx, npc),
    stats: ["charisma"],
    difficulty: 7,
    success: (ctx, npc) => {
      const gold = isFamily(npc) ? ctx.rng.int(10, 25) : ctx.rng.int(5, 15);
      applyEffect(ctx, { type: "wealth", delta: gold });
      applyEffect(ctx, { type: "resource", resource: "health", delta: 15 });
      changeNpcAffinity(ctx, npc.id, -3);
      return t(`${npc.name} помогает без лишних слов.`, `${npc.name} helps without a word.`);
    },
    failure: (ctx, npc) => {
      changeNpcAffinity(ctx, npc.id, -6);
      return t("Отказ. Видимо, просьба была не ко времени.", "A refusal. Apparently it was the wrong time to ask.");
    }
  }
};

export interface InteractionResult {
  title: LocalizedText;
  choice: LocalizedText;
  outcome: LocalizedText;
  check: { chance: number; success: boolean };
}

export function interactionAvailable(ctx: EngineContext, npc: NpcState, interaction: InteractionId): boolean {
  return npc.alive && npc.interactedAt !== ctx.state.life.age && INTERACTION_RULES[interaction].allowed(ctx, npc);
}

/** Шанс взаимодействия: как у проверки события, плюс тёплое отношение помогает */
export function interactionChance(ctx: EngineContext, npc: NpcState, interaction: InteractionId): number {
  const rule = INTERACTION_RULES[interaction];
  const base = checkChance(ctx.state.character, { stats: rule.stats, difficulty: rule.difficulty }, ctx.state);
  return Math.min(0.95, Math.max(0.05, Math.round((base + npc.affinity / 400) * 100) / 100));
}

export function interact(ctx: EngineContext, npcId: string, interaction: InteractionId): InteractionResult {
  const npc = ctx.state.npcs.find((n) => n.id === npcId);
  if (!npc) throw new GameRuleError("INVALID_INPUT", "Такого человека нет");
  if (!npc.alive) throw new GameRuleError("CHOICE_LOCKED", "Этого человека уже нет в живых");
  const rule = INTERACTION_RULES[interaction] as InteractionRule | undefined;
  if (!rule) throw new GameRuleError("INVALID_INPUT", "Неизвестное действие");
  if (npc.interactedAt === ctx.state.life.age) throw new GameRuleError("CHOICE_LOCKED", "В этом году вы уже общались с этим человеком");
  if (!rule.allowed(ctx, npc)) throw new GameRuleError("CHOICE_LOCKED", "Сейчас так поступить нельзя");
  const chance = interactionChance(ctx, npc, interaction);
  const success = ctx.rng.next() < chance;
  npc.interactedAt = ctx.state.life.age;
  const outcome = success ? rule.success(ctx, npc) : rule.failure(ctx, npc);
  const who = roleName(npc.role, npc.gender);
  return {
    title: t(`${who.ru}: ${npc.name}`, `${who.en}: ${npc.name}`),
    choice: rule.name,
    outcome,
    check: { chance, success }
  };
}

/** Сила NPC против характеристик персонажа: для подсказки в интерфейсе */
export function relativePower(ctx: EngineContext, npc: NpcState): number {
  return Math.round(meanStat(effectiveStats(ctx.state.character), []) * 2 - npc.power);
}
