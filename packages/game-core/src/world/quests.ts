// Задания Системы (Арденвейл): Система выдаёт цель и срок, проверяет её каждый год и награждает или наказывает.
// R5.7: обеты мира игрок принимает сам из Атласа; они идут по тому же годовому пути, но без случайной выдачи.
import { checkAll } from "../engine/conditions.js";
import type { EngineContext } from "../engine/context.js";
import { applyEffects, changeMeter } from "../engine/effects.js";
import { GameRuleError } from "../errors.js";
import { t, type LocalizedText } from "../i18n.js";
import type { QuestDefinition } from "../universes/types.js";
import type { Emit } from "./rules.js";

/** Как часто Система выдаёт задание, если сейчас его нет */
const QUEST_CHANCE = 0.35;
const QUEST_MIN_AGE = 10;

export function findQuest(ctx: Pick<EngineContext, "universe">, id: string): QuestDefinition | undefined {
  return ctx.universe.quests?.find((quest) => quest.id === id) ?? ctx.universe.oaths?.find((oath) => oath.id === id);
}

function isSystemQuest(ctx: Pick<EngineContext, "universe">, id: string): boolean {
  return ctx.universe.quests?.some((quest) => quest.id === id) ?? false;
}

export interface AcceptedOath {
  title: LocalizedText;
  text: LocalizedText;
}

/** Принять обет мира: без хода времени и без бросков. Проверки — здесь, на сервере */
export function acceptOath(ctx: EngineContext, oathId: string): AcceptedOath {
  const state = ctx.state;
  if (state.pending) throw new GameRuleError("EVENT_PENDING", "Сначала ответьте на событие");
  if (state.quest) throw new GameRuleError("QUEST_ACTIVE", "Сначала завершите текущий обет или задание");
  const oath = ctx.universe.oaths?.find((item) => item.id === oathId);
  if (!oath) throw new GameRuleError("OATH_LOCKED", "Такого обета нет в этом мире");
  if (state.questsDone.includes(oath.id)) throw new GameRuleError("OATH_LOCKED", "Этот обет уже исполнен");
  if (state.life.age < (oath.minAge ?? QUEST_MIN_AGE)) throw new GameRuleError("OATH_LOCKED", "Вы ещё слишком молоды для этого обета");
  const missing = (oath.requires ?? []).filter((id) => !state.questsDone.includes(id));
  if (missing.length > 0) throw new GameRuleError("OATH_LOCKED", "Сначала завершите предыдущий обет");

  state.quest = { id: oath.id, since: state.life.age };
  return {
    title: t(`Обет принят: ${oath.title.ru}`, `Oath accepted: ${oath.title.en}`),
    text: t(`${oath.text.ru} Срок: ${oath.years} г.`, `${oath.text.en} Time limit: ${oath.years} yr.`)
  };
}

export function questYearly(ctx: EngineContext, emit: Emit): void {
  const state = ctx.state;
  const age = state.life.age;

  if (state.quest) {
    const quest = findQuest(ctx, state.quest.id);
    if (!quest) {
      state.quest = null;
      return;
    }
    const system = isSystemQuest(ctx, quest.id);
    if (checkAll(state, quest.goal)) {
      ctx.source = quest.id;
      applyEffects(ctx, quest.reward);
      if (system) changeMeter(ctx, "system-favor", 10);
      state.questsDone.push(quest.id);
      const next = quest.next && !state.questsDone.includes(quest.next) ? findQuest(ctx, quest.next) : undefined;
      if (next) {
        state.quest = { id: next.id, since: age };
      } else {
        state.quest = null;
      }
      emit(
        "quest",
        system
          ? t(`Задание выполнено: ${quest.title.ru}`, `Quest complete: ${quest.title.en}`)
          : t(`Обет исполнен: ${quest.title.ru}`, `Oath fulfilled: ${quest.title.en}`),
        system
          ? t("Хор Системы звучит торжественно. Награда начислена.", "The System Choir sounds solemn. The reward is granted.")
          : t(`${quest.issuer?.ru ?? "Покровитель"} принимает ваш обет. Награда начислена.`, `${quest.issuer?.en ?? "Your patron"} accepts your oath. The reward is granted.`)
      );
      if (next) {
        emit(
          "quest",
          t(`Новый обет: ${next.title.ru}`, `New oath: ${next.title.en}`),
          t(`${next.text.ru} Срок: ${next.years} г.`, `${next.text.en} Time limit: ${next.years} yr.`)
        );
      }
    } else if (age - state.quest.since >= quest.years) {
      ctx.source = quest.id;
      applyEffects(ctx, quest.penalty);
      if (system) changeMeter(ctx, "system-favor", -12);
      state.quest = null;
      emit(
        "quest",
        system
          ? t(`Задание провалено: ${quest.title.ru}`, `Quest failed: ${quest.title.en}`)
          : t(`Обет нарушен: ${quest.title.ru}`, `Oath broken: ${quest.title.en}`),
        system
          ? t("Голос Системы холоден. Штраф наложен.", "The System's voice is cold. A penalty is imposed.")
          : t(`${quest.issuer?.ru ?? "Покровитель"} не прощает нарушенного слова.`, `${quest.issuer?.en ?? "Your patron"} does not forgive a broken word.`)
      );
    }
    return;
  }

  const quests = ctx.universe.quests;
  if (!quests || quests.length === 0) return;
  if (age < QUEST_MIN_AGE || !ctx.rng.chance(QUEST_CHANCE)) return;
  const available = quests.filter((quest) => (quest.minAge ?? QUEST_MIN_AGE) <= age && !state.questsDone.includes(quest.id) && !checkAll(state, quest.goal));
  if (available.length === 0) return;
  const quest = ctx.rng.pick(available);
  state.quest = { id: quest.id, since: age };
  emit("quest", t(`Новое задание: ${quest.title.ru}`, `New quest: ${quest.title.en}`), t(`${quest.text.ru} Срок: ${quest.years} г.`, `${quest.text.en} Time limit: ${quest.years} yr.`));
}
