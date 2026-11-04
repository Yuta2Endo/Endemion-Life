// Подписи для изменений персонажа в истории и итогах выбора
import {
  findAchievement,
  findEducation,
  findProfession,
  findSkill,
  findTalent,
  findWeakness,
  getUniverse,
  RESOURCE_INFO,
  roleName,
  STAT_INFO,
  THREADS,
  type HistoryChange,
  type Locale,
  type NpcRole,
  type ResourceKey,
  type StatKey,
  type UniverseId
} from "@endemion/game-core";
import { msg } from "./messages";

export interface ChangeLabel {
  text: string;
  tone: "good" | "bad" | "gold" | "neutral";
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** Имена людей по id: изменения отношений хранят только id NPC */
export type PeopleNames = Readonly<Record<string, string>>;

export function formatChange(change: HistoryChange, universeId: UniverseId, locale: Locale, people: PeopleNames = {}): ChangeLabel | null {
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
    case "skill": {
      const skill = findSkill(universe, change.key ?? "");
      return skill ? { text: `${skill.name[locale]} ${signed(delta)}`, tone } : null;
    }
    case "talent": {
      const talent = findTalent(universe, String(change.value));
      return talent ? { text: msg(locale, "change.talent", { name: talent.name[locale] }), tone: "gold" } : null;
    }
    case "weakness": {
      const weakness = findWeakness(universe, change.key ?? "");
      if (!weakness) return null;
      return change.value === "overcome"
        ? { text: msg(locale, "change.weaknessOvercome", { name: weakness.name[locale] }), tone: "good" }
        : { text: msg(locale, "change.weaknessGained", { name: weakness.name[locale] }), tone: "bad" };
    }
    case "relation":
      return { text: msg(locale, "change.relation", { name: people[change.key ?? ""] ?? "?", delta: signed(delta) }), tone };
    case "npc": {
      const name = people[change.key ?? ""] ?? "?";
      if (change.value === "met") return { text: msg(locale, "change.met", { name }), tone: "gold" };
      if (change.value === "died") return { text: msg(locale, "change.died", { name }), tone: "bad" };
      if (change.value === "missing") return { text: msg(locale, "change.missing", { name }), tone: "bad" };
      if (change.value === "returned") return { text: msg(locale, "change.returned", { name }), tone: "good" };
      return { text: msg(locale, "change.role", { name, role: roleName(change.value as NpcRole, "male")[locale].toLowerCase() }), tone: "gold" };
    }
    case "meter": {
      const meter = universe.meters.find((m) => m.id === change.key);
      if (!meter) return null;
      const good = meter.danger ? delta < 0 : delta > 0;
      return { text: `${meter.name[locale]} ${signed(delta)}`, tone: good ? "good" : "bad" };
    }
    case "faction": {
      const faction = universe.factions.find((f) => f.id === change.key);
      return faction ? { text: `${faction.name[locale]} ${signed(delta)}`, tone } : null;
    }
    case "class": {
      const socialClass = universe.socialClasses.find((c) => c.id === change.value);
      return socialClass ? { text: msg(locale, "change.class", { name: socialClass.name[locale] }), tone: "gold" } : null;
    }
    case "profession": {
      const profession = findProfession(universe, String(change.value));
      return profession ? { text: msg(locale, "change.profession", { name: profession.name[locale] }), tone: "gold" } : null;
    }
    case "education": {
      const education = findEducation(universe, String(change.value));
      return education ? { text: msg(locale, "change.education", { name: education.name[locale] }), tone: "gold" } : null;
    }
    case "specialization": {
      const specialization = universe.specializations.find((x) => x.id === change.value);
      return specialization ? { text: msg(locale, "change.specialization", { name: specialization.name[locale] }), tone: "gold" } : null;
    }
    case "hidden": {
      const key = change.value === "potential" || change.value === "destiny" || change.value === "familySecret" ? change.value : null;
      return key ? { text: msg(locale, `change.hidden.${key}`), tone: "gold" } : null;
    }
    case "renown":
      return { text: msg(locale, "change.renown", { delta: signed(delta) }), tone };
    case "achievement": {
      const achievement = findAchievement(String(change.value));
      return achievement ? { text: msg(locale, "change.achievement", { name: achievement.name[locale] }), tone: "gold" } : null;
    }
    case "thread": {
      const thread = THREADS[change.key ?? ""];
      if (!thread) return null;
      return change.value === "closed" ? { text: msg(locale, "change.threadClosed", { name: thread.name[locale] }), tone: "good" } : { text: msg(locale, "change.threadAdded", { name: thread.name[locale] }), tone: "neutral" };
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
