import { t, type LocalizedText } from "../i18n.js";
import type { LifeStage } from "../types.js";

export const STAGE_INFO: Readonly<Record<LifeStage, { name: LocalizedText; begins: LocalizedText }>> = {
  infant: { name: t("Младенчество", "Infancy"), begins: t("Начинается жизнь.", "Life begins.") },
  child: { name: t("Детство", "Childhood"), begins: t("Начинается детство.", "Childhood begins.") },
  teen: { name: t("Юность", "Youth"), begins: t("Начинается юность.", "Youth begins.") },
  adult: { name: t("Зрелость", "Adulthood"), begins: t("{name} становится взрослым.", "{name} comes of age.") },
  middle: { name: t("Средние годы", "Middle age"), begins: t("Наступают средние годы.", "Middle age arrives.") },
  elder: { name: t("Старость", "Old age"), begins: t("Приходит старость.", "Old age arrives.") }
};

/**
 * Этап жизни по возрасту. Детство и юность одинаковы для всех, а зрелость и старость зависят от отпущенного срока:
 * у эльфа и бессмертного культиватора старость приходит намного позже
 */
export function stageForAge(age: number, lifespan: number): LifeStage {
  if (age <= 2) return "infant";
  if (age <= 12) return "child";
  if (age <= 17) return "teen";
  if (age < Math.max(40, Math.round(lifespan * 0.55))) return "adult";
  if (age < Math.max(60, Math.round(lifespan * 0.8))) return "middle";
  return "elder";
}
