// Stage 03: личные сюжеты значимых NPC. Сюжет — это не мировая новость и не событие игрока,
// а многолетняя линия жизни: три стадии, которые идут по годам и на которые можно повлиять действием.
// Всё детерминировано от seed, возраста и состояния rng; сюжет не запускается дважды и не плодит копии.
import type { EngineContext } from "../engine/context.js";
import { changeNpcAffinity } from "../engine/effects.js";
import { CLOSE_KIN } from "../family/events.js";
import { isPresent } from "../family/kin.js";
import { t, fillText, type LocalizedText } from "../i18n.js";
import { hashSeed, Rng } from "../rng.js";
import { clamp } from "../stats.js";
import { SELF_ID, type GameState, type NpcState, type NpcStoryState } from "../types.js";
import type { Emit } from "../world/rules.js";
import { logRelationship, logStory, MAX_STORY_RECORDS, normalizeSocialState, readSocialState } from "./social.js";
import { npcAge } from "./npcs.js";

export const MAX_ACTIVE_STORIES = 3;
/** Вероятность сдвинуть активный сюжет за год и вероятность начать новый. */
const STORY_ADVANCE_CHANCE = 0.7;
const STORY_START_CHANCE = 0.24;

interface StoryStageText {
  title: LocalizedText;
  text: LocalizedText;
}

interface StoryCompletion {
  outcome: "done" | "failed";
  title: LocalizedText;
  text: LocalizedText;
}

interface StoryDefinition {
  id: string;
  title: LocalizedText;
  stages: readonly StoryStageText[];
  eligible: (ctx: EngineContext, npc: NpcState, age: number) => boolean;
  /** Что меняется в жизни NPC, если линия дошла до конца */
  complete: (ctx: EngineContext, npc: NpcState) => StoryCompletion;
}

function isSignificant(npc: NpcState): boolean {
  return CLOSE_KIN.includes(npc.role) || npc.role === "friend" || npc.role === "rival" || npc.role === "mentor" || npc.role === "partner" || npc.affinity >= 20;
}

export const NPC_STORIES: readonly StoryDefinition[] = [
  {
    id: "craft-ambition",
    title: t("Долгая дорога к мастерству", "The long road to mastery"),
    stages: [
      {
        title: t("Первый заказ", "The first commission"),
        text: t("{npc} берётся за дело, которое раньше казалось не по силам.", "{npc} takes on work that once seemed beyond them.")
      },
      {
        title: t("Цена упорства", "The price of persistence"),
        text: t("{npc} пропадает в мастерской до поздней ночи. Дома это замечают.", "{npc} disappears into the workshop until late. At home, they notice.")
      },
      {
        title: t("Проверка", "The test"),
        text: t("Работа {npc} попадает на глаза тому, чьё слово решает многое.", "{npc}'s work reaches someone whose word carries weight.")
      }
    ],
    eligible: (ctx, npc, age) => npc.professionId !== null && npc.careerRank <= 2 && age >= 16 && age <= 55 && (npc.goal === "mastery" || npc.goal === "rise" || npc.goal === "wealth"),
    complete: (ctx, npc) => {
      npc.careerRank = Math.min(3, npc.careerRank + 1);
      npc.power = clamp(npc.power + 4, 1, 100);
      npc.wealth = Math.min(100_000, npc.wealth + 12);
      if (npc.careerRank === 3 && npc.goal === "mastery") logStory(ctx, npc, "craft-ambition");
      return {
        outcome: "done",
        title: t(`Мастерство: ${npc.name}`, `Mastery: ${npc.name}`),
        text: t(`${npc.name} доводит начатое до конца. Теперь у него есть имя в своём деле.`, `${npc.name} finishes what was started. They have a name in their craft now.`)
      };
    }
  },
  {
    id: "old-rivalry",
    title: t("Старая вражда", "An old grudge"),
    stages: [
      {
        title: t("Стычка", "A clash"),
        text: t("Старая обида снова всплывает: {npc} не может пройти мимо.", "An old insult surfaces again: {npc} cannot let it pass.")
      },
      {
        title: t("Слухи", "Rumours"),
        text: t("О ссоре {npc} говорят там, где его знают. Молва идёт впереди.", "People where {npc} is known talk about the quarrel. Rumour travels ahead.")
      },
      {
        title: t("Развязка", "The reckoning"),
        text: t("Рано или поздно {npc} придётся решить, чем закончится эта вражда.", "Sooner or later {npc} must decide how this feud ends.")
      }
    ],
    eligible: (ctx, npc, age) => age >= 14 && (npc.role === "rival" || npc.affinity < 0),
    complete: (ctx, npc) => {
      changeNpcAffinity(ctx, npc.id, 18);
      logRelationship(ctx, npc, "rival", 18);
      return {
        outcome: "done",
        title: t(`Перемирие: ${npc.name}`, `Truce: ${npc.name}`),
        text: t(`${npc.name} наконец отпускает старую обиду.`, `${npc.name} finally lets the old insult go.`)
      };
    }
  },
  {
    id: "family-crisis",
    title: t("Тяжёлый год семьи", "The family's hard year"),
    stages: [
      {
        title: t("Беда приходит в дом", "Trouble comes home"),
        text: t("У {npc} не задаётся год: счета, болезни, усталость.", "{npc} has a bad year: bills, illness, exhaustion.")
      },
      {
        title: t("Помощь нужна сейчас", "Help is needed now"),
        text: t("{npc} держится из последних сил, но уже не скрывает этого.", "{npc} holds on by a thread and no longer hides it.")
      },
      {
        title: t("Исход", "The outcome"),
        text: t("Семья {npc} ждёт, кто окажется рядом в решающий день.", "{npc}'s family waits to see who stands beside them on the decisive day.")
      }
    ],
    eligible: (ctx, npc, age) => age >= 16 && CLOSE_KIN.includes(npc.role) && (npc.health < 70 || npc.wealth < 15),
    complete: (ctx, npc) => {
      npc.health = clamp(npc.health + 15, 0, 100);
      changeNpcAffinity(ctx, npc.id, 10);
      logRelationship(ctx, npc, "family", 10);
      return {
        outcome: "done",
        title: t(`Семья выстояла: ${npc.name}`, `The family endures: ${npc.name}`),
        text: t(`Год был тяжёлым, но ${npc.name} справился. Дом снова держится.`, `The year was hard, but ${npc.name} made it through. The house holds.`)
      };
    }
  }
];

const STORY_BY_ID = new Map(NPC_STORIES.map((story) => [story.id, story]));

export function findStory(id: string): StoryDefinition | undefined {
  return STORY_BY_ID.get(id);
}

export function storiesOf(state: GameState, npcId: string): NpcStoryState[] {
  return readSocialState(state).stories.filter((story) => story.npcId === npcId);
}

export function activeStoryOf(state: GameState, npcId: string): NpcStoryState | undefined {
  return readSocialState(state).stories.find((story) => story.npcId === npcId && story.status === "active");
}

/** Провал действия игрока может оборвать личную линию: это и есть failure-ветка сюжета. */
export function failStory(ctx: EngineContext, npc: NpcState): LocalizedText | null {
  const social = normalizeSocialState(ctx.state);
  const story = social.stories.find((item) => item.npcId === npc.id && item.status === "active");
  if (!story) return null;
  story.status = "failed";
  story.updatedAt = ctx.state.life.age;
  logStory(ctx, npc, story.storyId);
  if (story.storyId === "family-crisis") {
    npc.health = clamp(npc.health - 5, 0, 100);
    changeNpcAffinity(ctx, npc.id, -4);
    logRelationship(ctx, npc, "family", -4);
  }
  return t(`${npc.name} не выдерживает удара. Личная история обрывается.`, `${npc.name} cannot bear the blow. Their personal story breaks off.`);
}

function stageText(npc: NpcState, story: StoryDefinition, stage: number): StoryStageText {
  const source = story.stages[Math.min(stage, story.stages.length - 1)]!;
  return {
    title: fillText(source.title, { npc: npc.name }),
    text: fillText(source.text, { npc: npc.name })
  };
}

function completeStory(ctx: EngineContext, npc: NpcState, story: NpcStoryState, emit: Emit): void {
  const definition = STORY_BY_ID.get(story.storyId);
  story.status = "done";
  story.stage = definition ? definition.stages.length : story.stage;
  story.updatedAt = ctx.state.life.age;
  if (!definition) return;
  const completion = definition.complete(ctx, npc);
  logStory(ctx, npc, story.storyId);
  emit("people", completion.title, completion.text);
}

/** Продвигает личный сюжетNPC на одну стадию. Возвращает текст, который можно добавить к исходу действия. */
export function advanceStory(ctx: EngineContext, npc: NpcState): LocalizedText | null {
  const social = normalizeSocialState(ctx.state);
  const story = social.stories.find((item) => item.npcId === npc.id && item.status === "active");
  if (!story) return null;
  const definition = STORY_BY_ID.get(story.storyId);
  if (!definition) {
    story.status = "abandoned";
    story.updatedAt = ctx.state.life.age;
    return null;
  }
  story.stage += 1;
  story.updatedAt = ctx.state.life.age;
  if (story.stage >= definition.stages.length) {
    story.status = "done";
    story.stage = definition.stages.length;
    const completion = definition.complete(ctx, npc);
    logStory(ctx, npc, story.storyId);
    return completion.text;
  }
  const stage = stageText(npc, definition, story.stage);
  return stage.text;
}

/** Годовой шаг личных сюжетов: завершение старых линий и запуск новых. */
export function storyTick(ctx: EngineContext, emit: Emit): void {
  const state = ctx.state;
  const social = normalizeSocialState(state);
  const age = state.life.age;
  const rng = new Rng(hashSeed(`${state.seed}::stories::${age}::${ctx.rng.state}`));

  for (const story of social.stories) {
    if (story.status !== "active") continue;
    const npc = state.npcs.find((item) => item.id === story.npcId);
    if (!npc || !isPresent(npc) || npc.id === SELF_ID) {
      story.status = "abandoned";
      story.updatedAt = age;
      continue;
    }
    if (!rng.chance(STORY_ADVANCE_CHANCE)) continue;
    const definition = STORY_BY_ID.get(story.storyId);
    if (!definition) {
      story.status = "abandoned";
      story.updatedAt = age;
      continue;
    }
    story.stage += 1;
    story.updatedAt = age;
    if (story.stage >= definition.stages.length) {
      completeStory(ctx, npc, story, emit);
    } else {
      const stage = stageText(npc, definition, story.stage);
      emit("people", stage.title, stage.text);
    }
  }

  const active = social.stories.filter((story) => story.status === "active");
  if (active.length >= MAX_ACTIVE_STORIES || social.stories.length >= MAX_STORY_RECORDS) return;
  if (!rng.chance(STORY_START_CHANCE)) return;

  const options: { definition: StoryDefinition; npc: NpcState }[] = [];
  for (const npc of state.npcs) {
    if (!isPresent(npc) || npc.id === SELF_ID || !isSignificant(npc)) continue;
    if (social.stories.some((story) => story.npcId === npc.id)) continue;
    const npcYears = npcAge(npc, age);
    for (const definition of NPC_STORIES) {
      if (definition.eligible(ctx, npc, npcYears)) options.push({ definition, npc });
    }
  }
  if (options.length === 0) return;
  options.sort((a, b) => a.npc.id.localeCompare(b.npc.id) || a.definition.id.localeCompare(b.definition.id));
  const picked = rng.pick(options);
  const record: NpcStoryState = {
    id: `story-${social.nextStoryId++}`,
    npcId: picked.npc.id,
    storyId: picked.definition.id,
    stage: 0,
    status: "active",
    since: age,
    updatedAt: age,
    source: "story"
  };
  social.stories.push(record);
  logStory(ctx, picked.npc, picked.definition.id);
  const stage = stageText(picked.npc, picked.definition, 0);
  emit("people", t(`${picked.definition.title.ru}: ${picked.npc.name}`, `${picked.definition.title.en}: ${picked.npc.name}`), stage.text);
}
