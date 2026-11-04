// Задания Системы (Арденвейл): Система выдаёт цель и срок, проверяет её каждый год и награждает или наказывает.
// В других мирах заданий нет: у них quests не задан
import { checkAll } from "../engine/conditions.js";
import type { EngineContext } from "../engine/context.js";
import { applyEffects, changeMeter } from "../engine/effects.js";
import { t } from "../i18n.js";
import type { QuestDefinition } from "../universes/types.js";
import type { Emit } from "./rules.js";

/** Как часто Система выдаёт задание, если сейчас его нет */
const QUEST_CHANCE = 0.35;
const QUEST_MIN_AGE = 10;

export function findQuest(ctx: Pick<EngineContext, "universe">, id: string): QuestDefinition | undefined {
  return ctx.universe.quests?.find((quest) => quest.id === id);
}

export function questYearly(ctx: EngineContext, emit: Emit): void {
  const quests = ctx.universe.quests;
  if (!quests || quests.length === 0) return;
  const state = ctx.state;
  const age = state.life.age;

  if (state.quest) {
    const quest = findQuest(ctx, state.quest.id);
    if (!quest) {
      state.quest = null;
      return;
    }
    if (checkAll(state, quest.goal)) {
      ctx.source = quest.id;
      applyEffects(ctx, quest.reward);
      changeMeter(ctx, "system-favor", 10);
      state.questsDone.push(quest.id);
      state.quest = null;
      emit("quest", t(`Задание выполнено: ${quest.title.ru}`, `Quest complete: ${quest.title.en}`), t("Хор Системы звучит торжественно. Награда начислена.", "The System Choir sounds solemn. The reward is granted."));
    } else if (age - state.quest.since >= quest.years) {
      ctx.source = quest.id;
      applyEffects(ctx, quest.penalty);
      changeMeter(ctx, "system-favor", -12);
      state.quest = null;
      emit("quest", t(`Задание провалено: ${quest.title.ru}`, `Quest failed: ${quest.title.en}`), t("Голос Системы холоден. Штраф наложен.", "The System's voice is cold. A penalty is imposed."));
    }
    return;
  }

  if (age < QUEST_MIN_AGE || !ctx.rng.chance(QUEST_CHANCE)) return;
  const available = quests.filter((quest) => (quest.minAge ?? QUEST_MIN_AGE) <= age && !state.questsDone.includes(quest.id) && !checkAll(state, quest.goal));
  if (available.length === 0) return;
  const quest = ctx.rng.pick(available);
  state.quest = { id: quest.id, since: age };
  emit("quest", t(`Новое задание: ${quest.title.ru}`, `New quest: ${quest.title.en}`), t(`${quest.text.ru} Срок: ${quest.years} г.`, `${quest.text.en} Time limit: ${quest.years} yr.`));
}
