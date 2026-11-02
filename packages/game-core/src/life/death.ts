import { effectiveStats, lifespanOf } from "../character/derived.js";
import { t, type LocalizedText } from "../i18n.js";
import { clamp } from "../stats.js";
import type { CharacterState } from "../types.js";

/** За столько лет до конца срока начинается риск умереть от старости */
const RISK_WINDOW = 8;
/** Больше срока плюс этот запас не живёт никто */
const HARD_LIMIT = 20;

/** Вероятность умереть от старости в этом году. Живучесть и удача отодвигают конец */
export function naturalDeathChance(character: CharacterState, age: number): number {
  const lifespan = lifespanOf(character);
  if (age >= lifespan + HARD_LIMIT) return 1;
  const start = lifespan - RISK_WINDOW;
  if (age < start) return 0;
  const stats = effectiveStats(character);
  const resist = (stats.vitality + stats.luck - 20) * 0.004;
  return clamp(0.03 + (age - start) * 0.03 - resist, 0.01, 0.95);
}

export const DEATH_CAUSES = {
  oldAge: t("Тихо угас от старости", "Passed away peacefully of old age"),
  wounds: t("Раны оказались смертельными", "The wounds proved fatal")
} satisfies Record<string, LocalizedText>;
