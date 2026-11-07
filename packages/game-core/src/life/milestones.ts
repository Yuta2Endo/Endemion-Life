import { t, type LocalizedText } from "../i18n.js";
import type { EventDefinition } from "../narrative/types.js";
import type { GameState, UniverseId } from "../types.js";
import { lifespanOf } from "../character/derived.js";
import { getUniverse } from "../universes/registry.js";
import { fx } from "../narrative/dsl.js";

/**
 * Базовая конфигурация рубежей. Мир может переопределить список через milestoneAges,
 * а срок жизни расы дополнительно отсекает недостижимые возраста.
 */
export const DEFAULT_MILESTONE_AGES = [1, 5, 12, 16, 18, 25, 35, 45, 60, 75, 90] as const;

const AGE_COPY: Readonly<Record<number, { title: LocalizedText; text: LocalizedText; choices: EventDefinition["choices"] }>> = {
  1: {
    title: t("Первые шаги", "First steps"),
    text: t("Мир впервые раскрывается перед {name}. Взрослые зовут, но путь уже начинается.", "The world opens before {name} for the first time. Adults call, but the path has already begun."),
    choices: [
      { id: "reach", text: t("Потянуться к миру", "Reach toward the world"), success: { text: t("Любопытство становится первой силой.", "Curiosity becomes the first strength."), effects: [fx.stat("charisma", 1)] } },
      { id: "observe", text: t("Сначала наблюдать", "Observe first"), success: { text: t("Тихое внимание замечает больше, чем кажется.", "Quiet attention notices more than it seems."), effects: [fx.stat("wisdom", 1)] } }
    ]
  },
  5: {
    title: t("Граница двора", "The edge of the yard"),
    text: t("{name} впервые решает, как встретить незнакомое: шагнуть вперёд или остаться у знакомого порога.", "{name} must decide how to meet the unfamiliar: step forward or stay by a known threshold."),
    choices: [
      { id: "bold", text: t("Выйти дальше", "Go farther"), success: { text: t("Новая дорога становится частью характера.", "A new road becomes part of the character."), effects: [fx.stat("agility", 1), fx.xp(5)] } },
      { id: "craft", text: t("Разобраться в одном деле", "Master one small thing"), success: { text: t("Упорство превращает игру в навык.", "Persistence turns play into a skill."), effects: [fx.stat("intelligence", 1), fx.xp(5)] } }
    ]
  },
  12: {
    title: t("Свой вопрос", "A question of one's own"),
    text: t("Впереди учёба и первые серьёзные ответы. {name} выбирает, чему отдавать внимание.", "Study and the first serious answers lie ahead. {name} chooses what deserves attention."),
    choices: [
      { id: "learn", text: t("Искать знания", "Seek knowledge"), success: { text: t("Знание открывает следующие двери.", "Knowledge opens the next doors."), effects: [fx.stat("intelligence", 2), fx.stat("wisdom", 1)] } },
      { id: "practice", text: t("Учиться делом", "Learn by doing"), success: { text: t("Руки запоминают то, что разум ещё ищет.", "The hands remember what the mind is still seeking."), effects: [fx.stat("strength", 1), fx.stat("agility", 1), fx.xp(10)] } }
    ]
  },
  16: {
    title: t("Своя дорога", "A road of one's own"),
    text: t("Детство отступает. Теперь решения {name} начинают менять не только самого персонажа, но и его место среди людей.", "Childhood recedes. {name}'s decisions now change not only the self, but also a place among others."),
    choices: [
      { id: "apprentice", text: t("Принять наставника", "Accept a mentor"), success: { text: t("Опыт старших сокращает путь, но требует дисциплины.", "An elder's experience shortens the road, but demands discipline."), effects: [fx.stat("wisdom", 1), fx.xp(15), fx.rep(1)] } },
      { id: "independent", text: t("Начать самостоятельно", "Start independently"), success: { text: t("Свобода даёт уверенность и цену ошибок.", "Freedom brings confidence and the cost of mistakes."), effects: [fx.stat("willpower", 1), fx.stat("charisma", 1)] } }
    ]
  },
  18: {
    title: t("Порог взрослой жизни", "The threshold of adulthood"),
    text: t("Мир больше не ждёт, пока {name} определится. Нужно выбрать направление, даже если полной уверенности нет.", "The world will not wait for {name} to decide. A direction is needed, even without certainty."),
    choices: [
      { id: "steady", text: t("Выбрать устойчивость", "Choose stability"), success: { text: t("Надёжность редко звучит громко, но держит дом.", "Reliability rarely sounds loud, but it holds a home together."), effects: [fx.stat("vitality", 1), fx.wealth(12), fx.rep(1)] } },
      { id: "risk", text: t("Пойти на риск", "Take the risk"), success: { text: t("Риск открывает возможность, которой не было вчера.", "Risk opens an opportunity that did not exist yesterday."), effects: [fx.stat("luck", 1), fx.xp(20), fx.rep(2)] } }
    ]
  },
  25: {
    title: t("Годы выбора", "The years of choosing"),
    text: t("К двадцати пяти годам последствия ранних решений уже видны. {name} может укрепить достигнутое или изменить курс.", "By twenty-five, the consequences of early choices are visible. {name} can strengthen what was built or change course."),
    choices: [
      { id: "build", text: t("Укрепить своё дело", "Build what is yours"), success: { text: t("Последовательность превращает возможность в путь.", "Consistency turns an opportunity into a path."), effects: [fx.wealth(20), fx.stat("willpower", 1), fx.xp(20)] } },
      { id: "connect", text: t("Вложиться в людей", "Invest in people"), success: { text: t("Связи, которым уделили время, переживают один трудный год.", "Relationships given time survive a difficult year."), effects: [fx.karma(4), fx.rep(2), fx.stat("charisma", 1)] } }
    ]
  },
  35: {
    title: t("Середина пути", "The middle of the road"),
    text: t("Жизнь уже оставила след. В тридцать пять {name} решает, что должно остаться после следующего десятилетия.", "Life has already left a mark. At thirty-five, {name} decides what should remain after the next decade."),
    choices: [
      { id: "family", text: t("Поддержать близких", "Stand by loved ones"), success: { text: t("Забота не всегда видна в хронике, но её помнят люди.", "Care is not always visible in a chronicle, but people remember it."), effects: [fx.karma(5), fx.rep(2)] } },
      { id: "mastery", text: t("Довести мастерство до конца", "Pursue mastery"), success: { text: t("Одна выбранная область становится глубже и точнее.", "One chosen field grows deeper and more precise."), effects: [fx.xp(30), fx.stat("intelligence", 1), fx.stat("willpower", 1)] } }
    ]
  },
  45: {
    title: t("Второй поворот", "A second turning"),
    text: t("В сорок пять перемены пугают меньше, чем жизнь без смысла. Перед {name} снова открывается развилка.", "At forty-five, change is less frightening than a life without meaning. Another fork opens before {name}."),
    choices: [
      { id: "steady", text: t("Сохранить то, что работает", "Keep what works"), success: { text: t("Опыт помогает не тратить силы впустую.", "Experience helps avoid wasting strength."), effects: [fx.stat("wisdom", 2), fx.wealth(15)] } },
      { id: "change", text: t("Начать заново в важном деле", "Begin again where it matters"), success: { text: t("Поздний выбор всё ещё может стать главным.", "A late choice can still become the most important one."), effects: [fx.stat("willpower", 2), fx.xp(25), fx.rep(2)] } }
    ]
  },
  60: {
    title: t("Накопленный опыт", "Experience gathered"),
    text: t("Шесть десятилетий позади. {name} смотрит не только на прожитое, но и на то, чему ещё можно научить других.", "Six decades are behind {name}. The question is not only what was lived, but what can still be taught."),
    choices: [
      { id: "teach", text: t("Передать опыт", "Pass on experience"), success: { text: t("Знание становится частью чужой дороги.", "Knowledge becomes part of another person's road."), effects: [fx.stat("wisdom", 1), fx.karma(5), fx.rep(2)] } },
      { id: "remember", text: t("Собрать воспоминания", "Gather memories"), success: { text: t("Прошлое складывается в историю, которую можно рассказать.", "The past forms a story that can be told."), effects: [fx.xp(30), fx.stat("charisma", 1)] } }
    ]
  },
  75: {
    title: t("Поздний свет", "Late light"),
    text: t("До этого возраста доходят не все. {name} выбирает, чему отдать оставшееся время.", "Few reach this age. {name} chooses what deserves the time that remains."),
    choices: [
      { id: "legacy", text: t("Оставить наставление", "Leave guidance"), success: { text: t("Слова переживают один голос.", "Words outlive a single voice."), effects: [fx.karma(6), fx.rep(3)] } },
      { id: "wonder", text: t("Увидеть ещё одно чудо", "Seek one more wonder"), success: { text: t("Любопытство не знает возраста.", "Curiosity has no age."), effects: [fx.stat("luck", 1), fx.xp(35)] } }
    ]
  },
  90: {
    title: t("Исключительное долголетие", "Exceptional longevity"),
    text: t("Девяносто лет — редкая граница. Мир изменился, но {name} всё ещё может сделать один осмысленный выбор.", "Ninety years is a rare boundary. The world has changed, but {name} can still make one meaningful choice."),
    choices: [
      { id: "bless", text: t("Благословить тех, кто продолжит", "Bless those who continue"), success: { text: t("Жизнь становится памятью и поддержкой для будущих поколений.", "Life becomes memory and support for future generations."), effects: [fx.karma(8), fx.rep(4)] } },
      { id: "quiet", text: t("Принять тишину", "Accept the quiet"), success: { text: t("В тишине нет поражения — только полнота прожитого.", "There is no defeat in quiet, only the fullness of a life lived."), effects: [fx.stat("wisdom", 2)] } }
    ]
  }
};

export function milestoneAges(universeId: UniverseId, lifespan: number): readonly number[] {
  const universe = getUniverse(universeId);
  return (universe.milestoneAges ?? DEFAULT_MILESTONE_AGES).filter((age) => age <= lifespan);
}

export function milestoneId(age: number): string {
  return `milestone.${age}`;
}

export function milestoneEvent(age: number): EventDefinition | undefined {
  const copy = AGE_COPY[age];
  if (!copy) return undefined;
  return { id: milestoneId(age), kind: "age", title: copy.title, text: copy.text, minAge: age, maxAge: age, choices: copy.choices };
}

export function milestoneAt(state: GameState): EventDefinition | undefined {
  const age = state.life.age;
  if ((state.milestones?.triggered ?? []).includes(milestoneId(age))) return undefined;
  if (!milestoneAges(state.character.universeId, lifespanOf(state.character)).includes(age)) return undefined;
  return milestoneEvent(age);
}

export function isMilestoneEvent(eventId: string): boolean {
  return eventId.startsWith("milestone.");
}

export function milestoneEvents(): readonly EventDefinition[] {
  return Object.keys(AGE_COPY).map(Number).map((age) => milestoneEvent(age)!).filter(Boolean);
}
