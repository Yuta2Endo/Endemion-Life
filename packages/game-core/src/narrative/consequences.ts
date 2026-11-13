// Отложенные последствия: решение сейчас — итог через годы. Последствие приходит само, без выбора,
// и записывается в хронику с указанием события, которое его вызвало
import { checkAll } from "../engine/conditions.js";
import type { EngineContext } from "../engine/context.js";
import { applyEffects } from "../engine/effects.js";
import { fillText } from "../i18n.js";
import type { Emit } from "../world/rules.js";

/** Сколько последствий может наступить за один год: остальные ждут следующего */
const PER_YEAR = 2;

export function consequencesYearly(ctx: EngineContext, emit: Emit): void {
  const state = ctx.state;
  const age = state.life.age;
  const due = state.consequences.filter((c) => c.age <= age).sort((a, b) => a.age - b.age || a.id.localeCompare(b.id));
  let fired = 0;
  for (const item of due) {
    if (fired >= PER_YEAR || !state.life.alive) break;
    state.consequences.splice(state.consequences.indexOf(item), 1);
    const definition = ctx.universe.consequences.find((c) => c.id === item.id);
    if (!definition || !checkAll(state, definition.conditions)) continue;
    if (definition.chance !== undefined && !ctx.rng.chance(definition.chance)) continue;
    ctx.source = item.source || item.id;
    applyEffects(ctx, definition.effects);
    const vars = { name: state.character.name };
    emit("consequence", fillText(definition.title, vars), fillText(definition.text, vars), definition.id, item.source || item.id);
    ctx.source = undefined;
    fired += 1;
  }
}
