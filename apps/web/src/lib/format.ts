// Подписи для изменений персонажа в истории и итогах выбора
import { getUniverse, RESOURCE_INFO, STAT_INFO, type HistoryChange, type Locale, type ResourceKey, type StatKey, type UniverseId } from "@endemion/game-core";
import { msg } from "./messages";

export interface ChangeLabel {
  text: string;
  tone: "good" | "bad" | "gold" | "neutral";
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export function formatChange(change: HistoryChange, universeId: UniverseId, locale: Locale): ChangeLabel | null {
  const universe = getUniverse(universeId);
  const delta = change.delta ?? 0;
  const tone = delta > 0 ? "good" : delta < 0 ? "bad" : "neutral";
  switch (change.kind) {
    case "stat":
      return { text: `${STAT_INFO[change.key as StatKey].short[locale]} ${signed(delta)}`, tone };
    case "resource": {
      const key = change.key as ResourceKey;
      const name = key === "mana" ? universe.manaName : RESOURCE_INFO[key].name;
      return { text: `${name[locale]} ${signed(delta)}`, tone };
    }
    case "reputation":
      return { text: `${msg(locale, "sheet.reputation")} ${signed(delta)}`, tone };
    case "karma":
      return { text: `${msg(locale, "sheet.karma")} ${signed(delta)}`, tone };
    case "wealth":
      return { text: `${msg(locale, "sheet.wealth")} ${signed(delta)}`, tone };
    case "xp":
      return { text: `${msg(locale, "sheet.xp")} ${signed(delta)}`, tone: "neutral" };
    case "track":
      return { text: `${universe.track.pointsName[locale]} ${signed(delta)}`, tone };
    case "level":
      return { text: msg(locale, "change.level", { n: Number(change.value) }), tone: "gold" };
    case "rank": {
      const rank = universe.track.ranks[Number(change.value)];
      return rank ? { text: msg(locale, "change.rank", { name: rank.name[locale] }), tone: "gold" } : null;
    }
    case "ability": {
      const ability = universe.abilities.find((a) => a.id === change.value);
      return ability ? { text: msg(locale, "change.ability", { name: ability.name[locale] }), tone: "gold" } : null;
    }
  }
}

/** Опыт в итогах года не показываем: он копится каждый год и только засоряет хронику */
export function visibleChanges(changes: HistoryChange[], kind: "year" | "other"): HistoryChange[] {
  return kind === "year" ? changes.filter((c) => c.kind !== "xp") : changes;
}

export function ageLabel(age: number, locale: Locale): string {
  if (locale === "en") return `${age} ${age === 1 ? "year" : "years"}`;
  const mod10 = age % 10;
  const mod100 = age % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "год" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "года" : "лет";
  return `${age} ${word}`;
}
