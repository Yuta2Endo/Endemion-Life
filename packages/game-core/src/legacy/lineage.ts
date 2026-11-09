// Род в годовом цикле: основание, последствия для рода, сюжеты поколений, достижения и итог жизни
import { checkAll } from "../engine/conditions.js";
import type { EngineContext } from "../engine/context.js";
import { applyEffects } from "../engine/effects.js";
import { record, recordDelta } from "../engine/record.js";
import { chronicle } from "../family/events.js";
import { fillText, t } from "../i18n.js";
import type { EventDefinition } from "../narrative/types.js";
import type { LocalizedText } from "../i18n.js";
import { WEALTH_MAX } from "../stats.js";
import { SELF_ID, type HistoryKind } from "../types.js";
import type { Emit } from "../world/rules.js";
import { applyEffect } from "../engine/effects.js";
import { unlockAchievements } from "./achievements.js";
import { lineageYear } from "./chronicle.js";
import { findLineageConsequence } from "./stories.js";
import { scoreLife } from "./summary.js";
import { pushWorldActivity, DYNASTY_RENOWN_RECOGNIZED, DYNASTY_RENOWN_DISGRACED } from "../world/state.js";
import { FACTION_ACTIONS } from "./present.js";

/** Сколько последствий для рода наступает за год */
const LINEAGE_PER_YEAR = 1;

/** Достижения рода,值得 показать в вселенской ленте событий: вехи рода, а не личные награды */
const DYNASTY_FEED_IDS: readonly string[] = ["heir", "dynasty", "great-house", "family-gift", "keepers"];

/** Достижения рода, которые записываются как веха рода в хронике (однажды, при разблокировке) */
export const DYNASTY_MILESTONE_IDS: readonly string[] = ["great-house", "dynasty"];

/** Запись об основании рода: первая в хронике первого поколения */
export function foundLineage(ctx: EngineContext): void {
  const c = ctx.state.character;
  chronicle(ctx, "origin", [SELF_ID], { world: c.universeId, origin: c.originId, race: c.raceId, family: ctx.state.lineage.name }, "birth");
}

/** Последствия для рода, чей год настал. Они переживают персонажа, который их вызвал. Здесь же конец опеки над наследником */
export function lineageYearly(ctx: EngineContext, emit: Emit): void {
  const state = ctx.state;
  const year = lineageYear(state);
  const inheritance = state.lineage.inheritance;
  if (inheritance && inheritance.held > 0 && state.life.age >= inheritance.controlAge) {
    const before = state.character.wealth;
    state.character.wealth = Math.min(WEALTH_MAX, state.character.wealth + inheritance.held);
    recordDelta(ctx, "wealth", before, state.character.wealth);
    chronicle(ctx, "inheritance", [SELF_ID], { sum: inheritance.held, regency: 1 }, "regency");
    emit(
      "legacy",
      t("Конец опеки", "The guardianship ends"),
      t(`Опекун передаёт ${state.character.name} наследство: ${inheritance.held} золота.`, `The guardian hands ${state.character.name} the inheritance: ${inheritance.held} gold.`)
    );
    inheritance.held = 0;
  }
  const due = state.lineage.pending.filter((p) => p.year <= year).sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
  let fired = 0;
  for (const item of due) {
    if (fired >= LINEAGE_PER_YEAR || !state.life.alive) break;
    state.lineage.pending.splice(state.lineage.pending.indexOf(item), 1);
    const definition = findLineageConsequence(item.id);
    if (!definition || !checkAll(state, definition.conditions)) continue;
    if (definition.chance !== undefined && !ctx.rng.chance(definition.chance)) continue;
    ctx.source = item.id;
    applyEffects(ctx, definition.effects);
    ctx.source = undefined;
    chronicle(ctx, "story", [SELF_ID], { story: item.id }, item.src || item.id, item.entry);
    const vars = { name: state.character.name };
    emit("consequence", fillText(definition.title, vars), fillText(definition.text, vars));
    fired += 1;
  }
}

/** Ответ на сюжет рода: запись в хронике рода и счётчик сюжетов. Последствия для рода связываются с этой записью */
export function recordStory(ctx: EngineContext, event: EventDefinition, choiceId: string, success: boolean | null): void {
  if (event.kind !== "legacy") return;
  const lineage = ctx.state.lineage;
  lineage.stories[event.id] = (lineage.stories[event.id] ?? 0) + 1;
  const previous = [...lineage.chronicle].reverse().find((entry) => entry.kind === "story" && entry.v.story === event.id);
  const id = chronicle(ctx, "story", [SELF_ID], { story: event.id, choice: choiceId, ok: success === null ? "" : success ? 1 : 0 }, event.id, previous?.id ?? null);
  for (const pending of lineage.pending) if (pending.src === event.id && pending.entry === null) pending.entry = id;
}

/** Новые достижения рода: запись в хронике жизни и хронике рода */
export function checkAchievements(ctx: EngineContext, push: (kind: HistoryKind, title: LocalizedText, text: LocalizedText) => void): void {
  for (const achievement of unlockAchievements(ctx.state)) {
    record(ctx, { kind: "achievement", value: achievement.id });
    chronicle(ctx, "achievement", [SELF_ID], { achievement: achievement.id }, "achievement");
    push("legacy", t(`Достижение: ${achievement.name.ru}`, `Achievement: ${achievement.name.en}`), achievement.description);
    if (DYNASTY_FEED_IDS.includes(achievement.id)) {
      const title = t(`Достижение рода: ${achievement.name.ru}`, `Family achievement: ${achievement.name.en}`);
      pushWorldActivity(ctx, "family", `dynasty.${achievement.id}`, title, achievement.description);
    }
    // Stage 09: важное достижение рода укрепляет отношения с соответствующими фракциями мира
    const factionActions = FACTION_ACTIONS[ctx.universe.id];
    if (factionActions) {
      for (const [factionId, rule] of Object.entries(factionActions)) {
        if (rule.achievement && rule.achievement.id === achievement.id) {
          applyEffect(ctx, { type: "faction", id: factionId, delta: rule.achievement.bonus });
          const faction = ctx.universe.factions.find((f) => f.id === factionId);
          pushWorldActivity(
            ctx,
            "family",
            `dynasty-favor.${achievement.id}.${factionId}`,
            t("Род укрепляет связи с фракцией", "The dynasty strengthens ties with a faction"),
            t(`Отношения рода ${ctx.state.lineage.name} с ${faction?.name?.ru ?? factionId} становятся теплее.`, `The ${ctx.state.lineage.name} dynasty's ties with ${faction?.name?.ru ?? factionId} grow warmer.`)
          );
        }
      }
    }
    // Хроника рода: важное достижение рода записывается как веха рода (дедупликация — достижение разблокируется один раз)
    if (DYNASTY_MILESTONE_IDS.includes(achievement.id) && !ctx.state.lineage.chronicle.some((e) => e.kind === "milestone" && e.v.achievement === achievement.id)) {
      chronicle(ctx, "milestone", [SELF_ID], { achievement: achievement.id, gen: ctx.state.lineage.generation }, achievement.id);
    }
  }

  // Признание рода миром при пороговой славе: фиксируется один раз за порог, не дублируется
  const world = ctx.state.world;
  if (world && world.activities) {
    const renown = ctx.state.lineage.renown;
    const gen = ctx.state.lineage.generation;
    const alreadyRecognized = world.activities.some((a) => a.id.startsWith("dynasty-recognized."));
    const alreadyDisgraced = world.activities.some((a) => a.id.startsWith("dynasty-disgraced."));
    if (renown >= DYNASTY_RENOWN_RECOGNIZED && !alreadyRecognized) {
      pushWorldActivity(
        ctx,
        "family",
        `dynasty-recognized.${gen}`,
        t("Род стал известен", "The house becomes known"),
        t(`О роде ${ctx.state.lineage.name} уже говорят в поселениях.`, `People in the settlements already speak of the ${ctx.state.lineage.name} house.`)
      );
    }
    if (renown <= DYNASTY_RENOWN_DISGRACED && !alreadyDisgraced) {
      pushWorldActivity(
        ctx,
        "family",
        `dynasty-disgraced.${gen}`,
        t("Род в позоре", "The house is disgraced"),
        t(`Имя рода ${ctx.state.lineage.name} вызывает насторожённость.`, "The name of the ${ctx.state.lineage.name} house raises wariness.")
      );
    }
  }
}

/** Итог жизни в роду: запись сыгранной жизни, фамильные черты, смерть в хронике. Повторный вызов ничего не меняет */
export function finishLife(ctx: EngineContext): void {
  const state = ctx.state;
  const lineage = state.lineage;
  if (state.life.alive || lineage.lives.some((life) => life.gen === lineage.generation)) return;
  const c = state.character;
  const score = scoreLife(state);
  lineage.lives.push({
    gen: lineage.generation,
    name: c.name,
    gender: c.gender,
    raceId: c.raceId,
    originId: c.originId,
    born: lineage.epoch,
    age: state.life.age,
    cause: state.life.deathCause,
    professionId: c.professionId,
    socialClassId: c.socialClassId,
    score: score.total,
    titleId: score.titleId,
    npcId: null,
    heirName: null
  });
  // Таланты и слабости, которые проявились в этой жизни: с двух поколений это фамильные черты
  for (const id of c.talents) lineage.traits.talents[id] = (lineage.traits.talents[id] ?? 0) + 1;
  for (const id of c.weaknesses) lineage.traits.weaknesses[id] = (lineage.traits.weaknesses[id] ?? 0) + 1;
  chronicle(ctx, "death", [SELF_ID], { cause: "life", age: state.life.age, score: score.total, title: score.titleId }, "life");
}
