// Жизнь NPC год за годом: старение и смерть, отношения остывают без общения.
// Смерть близкого человека попадает в хронику отдельной записью
import type { EngineContext } from "../engine/context.js";
import { npcDies } from "../engine/effects.js";
import { t } from "../i18n.js";
import type { Emit } from "../world/rules.js";
import { isFamily, npcAge, npcLifespan, roleName, shiftAffinity } from "./npcs.js";

/** За столько лет до конца срока NPC начинает рисковать умереть от старости */
const NPC_RISK_WINDOW = 10;

export function npcYearly(ctx: EngineContext, emit: Emit): void {
  const state = ctx.state;
  const age = state.life.age;
  for (const npc of state.npcs) {
    if (!npc.alive) continue;
    const years = npcAge(npc, age);
    const lifespan = npcLifespan(ctx.universe, npc);
    const risk = years >= lifespan + 15 ? 1 : years >= lifespan - NPC_RISK_WINDOW ? 0.02 + (years - lifespan + NPC_RISK_WINDOW) * 0.025 : 0;
    if (risk > 0 && ctx.rng.chance(risk)) {
      npcDies(ctx, npc.id);
      if (isFamily(npc) || npc.affinity >= 40) {
        const who = roleName(npc.role, npc.gender);
        emit("people", t(`Умер(ла): ${npc.name}`, `${npc.name} has died`), t(`${who.ru} уходит в ${years} лет. В доме становится тише.`, `${who.en} passes away at ${years}. The house grows quieter.`));
      }
      continue;
    }
    // Без общения отношения остывают к нейтральным: друзья забываются, вражда слабеет
    if (!isFamily(npc) && npc.interactedAt !== age && ctx.rng.chance(0.4)) {
      if (npc.affinity > 20) shiftAffinity(npc, -1);
      else if (npc.affinity < -20) shiftAffinity(npc, 1);
    }
  }
}
