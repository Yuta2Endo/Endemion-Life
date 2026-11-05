import { effectiveStats, isTrackReady, lifespanOf } from "../character/derived.js";
import { livingWith, roleName } from "../character/npcs.js";
import { isKin, selfSpouse } from "../family/kin.js";
import { TEMPERAMENTS } from "../character/temperaments.js";
import { t, type LocalizedText } from "../i18n.js";
import type { Condition, NpcRef } from "../narrative/types.js";
import { educationTier, findProfession, findSkill } from "../rpg/skills.js";
import { findTalent, findWeakness } from "../rpg/talents.js";
import { STAT_INFO } from "../stats.js";
import { getUniverse } from "../universes/registry.js";
import type { UniverseDefinition } from "../universes/types.js";
import type { GameState } from "../types.js";

function inRange(value: number, min?: number, max?: number): boolean {
  return (min === undefined || value >= min) && (max === undefined || value <= max);
}

function anyOf(list: readonly string[], ids: readonly string[]): boolean {
  return ids.length === 0 ? list.length > 0 : ids.some((id) => list.includes(id));
}

export function checkCondition(state: GameState, condition: Condition): boolean {
  const c = state.character;
  switch (condition.type) {
    case "stat":
      return inRange(effectiveStats(c)[condition.stat], condition.min, condition.max);
    case "flag":
      return state.flags.includes(condition.flag) === condition.has;
    case "karma":
      return inRange(c.karma, condition.min, condition.max);
    case "reputation":
      return inRange(c.reputation, condition.min, condition.max);
    case "wealth":
      return inRange(c.wealth, condition.min, condition.max);
    case "hardship":
      return inRange(state.economy.hardship, condition.min, condition.max);
    case "cycle":
      return condition.ids.includes(state.economy.cycle);
    case "strain":
      return inRange(state.region.strain, condition.min, condition.max);
    case "prosperity":
      return inRange(state.region.prosperity, condition.min, condition.max);
    case "deed":
      return (condition.done ? state.adventure.done : state.adventure.failed).includes(condition.id);
    case "deedAny":
      return state.adventure.done.length > 0;
    case "achievement":
      return state.lineage.achievements.some((item) => item.id === condition.id);
    case "level":
      return c.level >= condition.min;
    case "rank":
      return inRange(c.track.rank, condition.min, condition.max);
    case "trackReady":
      return isTrackReady(c);
    case "origin":
      return condition.ids.includes(c.originId);
    case "race":
      return condition.ids.includes(c.raceId);
    case "temperament":
      return condition.ids.includes(c.temperamentId);
    case "ability":
      return c.abilities.includes(condition.id) === condition.has;
    case "skill":
      return (c.skills[condition.id] ?? 0) >= condition.min;
    case "talent":
      return anyOf(c.talents, condition.ids) === condition.has;
    case "weakness":
      return anyOf(c.weaknesses, condition.ids) === condition.has;
    case "npc": {
      const age = state.life.age;
      const found = livingWith(state, condition.role).some((npc) => inRange(age - npc.bornAt, condition.minAge, condition.maxAge));
      return found === condition.has;
    }
    case "affinity": {
      const npc = livingWith(state, condition.role)[0];
      return npc !== undefined && inRange(npc.affinity, condition.min, condition.max);
    }
    case "meter": {
      const meter = getUniverse(c.universeId).meters.find((m) => m.id === condition.id);
      return inRange(state.meters[condition.id] ?? meter?.initial ?? 0, condition.min, condition.max);
    }
    case "faction":
      return inRange(c.factions[condition.id] ?? 0, condition.min, condition.max);
    case "socialClass":
      return condition.ids.includes(c.socialClassId);
    case "standing": {
      const standing = getUniverse(c.universeId).socialClasses.find((s) => s.id === c.socialClassId)?.standing ?? 0;
      return inRange(standing, condition.min, condition.max);
    }
    case "profession":
      return (c.professionId !== null && (condition.ids.length === 0 || condition.ids.includes(c.professionId))) === condition.has;
    case "education":
      return inRange(educationTier(getUniverse(c.universeId), c), condition.min, condition.max);
    case "specialization":
      return c.specializationId !== null === condition.has;
    case "dormantTalent":
      return state.hidden.dormantTalents.length > 0 === condition.has;
    case "hidden":
      return inRange(state.hidden[condition.key], condition.min, condition.max);
    case "secret":
      return state.hidden.familySecret !== null && state.hidden.revealed.includes("familySecret") === condition.revealed;
    case "quest":
      return state.quest !== null === condition.active;
    case "yearsLeft":
      return lifespanOf(c) - state.life.age <= condition.max;
    case "generation":
      return inRange(state.lineage.generation, condition.min, condition.max);
    case "renown":
      return inRange(state.lineage.renown, condition.min, condition.max);
    case "thread":
      return state.lineage.threads.some((thread) => thread.id === condition.id) === condition.has;
    case "story":
      return (state.lineage.stories[condition.id] ?? 0) < condition.max;
    case "world":
      return condition.ids.includes(c.universeId);
    case "missingKin":
      return state.npcs.some((npc) => npc.alive && npc.status === "missing" && isKin(npc)) === condition.has;
    case "married":
      return (selfSpouse(state) !== undefined) === condition.has;
  }
}

export function checkAll(state: GameState, conditions: readonly Condition[] | undefined): boolean {
  return (conditions ?? []).every((condition) => checkCondition(state, condition));
}

function rangeText(min?: number, max?: number): LocalizedText {
  if (min !== undefined && max !== undefined) return t(`от ${min} до ${max}`, `${min}–${max}`);
  if (min !== undefined) return t(`не меньше ${min}`, `at least ${min}`);
  return t(`не больше ${max ?? 0}`, `at most ${max ?? 0}`);
}

function join(label: LocalizedText, range: LocalizedText): LocalizedText {
  return t(`${label.ru}: ${range.ru}`, `${label.en}: ${range.en}`);
}

function names(items: readonly (LocalizedText | undefined)[]): LocalizedText {
  const list = items.filter((n) => n !== undefined);
  return t(list.map((n) => n.ru).join(", "), list.map((n) => n.en).join(", "));
}

function refName(role: NpcRef): LocalizedText {
  if (role === "family") return t("Семья", "Family");
  if (role === "parent") return t("Родители", "Parents");
  return roleName(role, "male");
}

/** Понятное игроку описание условия: почему вариант выбора недоступен */
export function describeCondition(condition: Condition, universe: UniverseDefinition): LocalizedText {
  switch (condition.type) {
    case "stat":
      return join(STAT_INFO[condition.stat].name, rangeText(condition.min, condition.max));
    case "karma":
      return join(t("Карма", "Karma"), rangeText(condition.min, condition.max));
    case "reputation":
      return join(t("Репутация", "Reputation"), rangeText(condition.min, condition.max));
    case "wealth":
      return join(t("Золото", "Gold"), rangeText(condition.min, condition.max));
    case "hardship":
      return condition.min !== undefined ? t("Нужна нужда в деньгах", "Requires money troubles") : t("Сейчас не до этого: денег не хватает", "Not now: money is short");
    case "cycle":
      return t("Не то время для хозяйства", "Not the right economic times");
    case "strain":
      return t("Край должен быть на пределе", "The land must be strained");
    case "prosperity":
      return t("Край должен быть благополучен", "The land must be prospering");
    case "deed":
      return t("Сначала нужно покончить с делом", "A deed must be settled first");
    case "deedAny":
      return t("Сначала нужно завершить хоть одно дело", "At least one deed must be completed");
    case "achievement":
      return t("Род ещё не заслужил этого", "The family has not earned this yet");
    case "level":
      return join(t("Уровень", "Level"), rangeText(condition.min));
    case "rank": {
      const min = condition.min !== undefined ? universe.track.ranks[condition.min]?.name : undefined;
      return min ? t(`Ранг: ${min.ru} или выше`, `Rank: ${min.en} or higher`) : t("Ранг пути не подходит", "Wrong path rank");
    }
    case "trackReady":
      return t("Нужно накопить силу для прорыва", "You need enough power for a breakthrough");
    case "flag":
      return condition.has ? t("Нужно особое обстоятельство", "Requires a special circumstance") : t("Путь уже пройден", "Already done");
    case "origin": {
      const n = names(condition.ids.map((id) => universe.origins.find((o) => o.id === id)?.name));
      return t(`Происхождение: ${n.ru}`, `Origin: ${n.en}`);
    }
    case "race": {
      const n = names(condition.ids.map((id) => universe.races.find((r) => r.id === id)?.name));
      return t(`Раса: ${n.ru}`, `Race: ${n.en}`);
    }
    case "temperament": {
      const n = names(condition.ids.map((id) => TEMPERAMENTS.find((x) => x.id === id)?.name));
      return t(`Характер: ${n.ru}`, `Temperament: ${n.en}`);
    }
    case "ability": {
      const ability = universe.abilities.find((a) => a.id === condition.id)?.name;
      if (!ability) return t("Нужна особая способность", "Requires a special ability");
      return condition.has ? t(`Способность: ${ability.ru}`, `Ability: ${ability.en}`) : t(`Без способности ${ability.ru}`, `Without ${ability.en}`);
    }
    case "skill": {
      const skill = findSkill(universe, condition.id)?.name ?? t("Навык", "Skill");
      return join(skill, rangeText(condition.min));
    }
    case "talent": {
      if (condition.ids.length === 0) return condition.has ? t("Нужен талант", "Requires a talent") : t("Без талантов", "Without talents");
      const n = names(condition.ids.map((id) => findTalent(universe, id)?.name));
      return condition.has ? t(`Талант: ${n.ru}`, `Talent: ${n.en}`) : t(`Без таланта: ${n.ru}`, `Without talent: ${n.en}`);
    }
    case "weakness": {
      const n = names(condition.ids.map((id) => findWeakness(universe, id)?.name));
      return condition.has ? t(`Слабость: ${n.ru}`, `Weakness: ${n.en}`) : t(`Мешает слабость: ${n.ru}`, `Blocked by weakness: ${n.en}`);
    }
    case "npc": {
      const n = refName(condition.role);
      return condition.has ? t(`Нужен человек рядом: ${n.ru}`, `Requires someone: ${n.en}`) : t(`Уже есть: ${n.ru}`, `Already have: ${n.en}`);
    }
    case "affinity": {
      const n = refName(condition.role);
      return t(`Отношения (${n.ru}): ${rangeText(condition.min, condition.max).ru}`, `Relationship (${n.en}): ${rangeText(condition.min, condition.max).en}`);
    }
    case "meter": {
      const meter = universe.meters.find((m) => m.id === condition.id)?.name ?? t("Шкала мира", "World meter");
      return join(meter, rangeText(condition.min, condition.max));
    }
    case "faction": {
      const faction = universe.factions.find((f) => f.id === condition.id)?.name ?? t("Фракция", "Faction");
      return join(faction, rangeText(condition.min, condition.max));
    }
    case "socialClass": {
      const n = names(condition.ids.map((id) => universe.socialClasses.find((s) => s.id === id)?.name));
      return t(`Сословие: ${n.ru}`, `Station: ${n.en}`);
    }
    case "standing":
      return condition.min !== undefined ? t("Нужно положение повыше", "Requires a higher station") : t("Слишком высокое положение", "Station is too high");
    case "profession": {
      if (condition.ids.length === 0) return condition.has ? t("Нужно ремесло", "Requires a profession") : t("Ремесло уже выбрано", "A profession is already chosen");
      const n = names(condition.ids.map((id) => findProfession(universe, id)?.name));
      return t(`Ремесло: ${n.ru}`, `Profession: ${n.en}`);
    }
    case "education":
      return condition.min !== undefined ? t("Нужно образование", "Requires education") : t("Образование уже получено", "Already educated");
    case "specialization":
      return condition.has ? t("Нужна специализация", "Requires a specialization") : t("Специализация уже выбрана", "Specialization already chosen");
    case "dormantTalent":
      return t("Нужен скрытый дар", "Requires a hidden gift");
    case "hidden":
      return t("Судьба распорядилась иначе", "Fate decided otherwise");
    case "secret":
      return t("Тайна семьи", "A family secret");
    case "quest":
      return condition.active ? t("Нужно задание Системы", "Requires a System quest") : t("Задание уже идёт", "A quest is already active");
    case "yearsLeft":
      return t("Ещё не время", "Not yet time");
    case "generation":
      return t("Не то поколение рода", "Not this generation of the family");
    case "renown":
      return condition.min !== undefined ? join(t("Слава рода", "Family renown"), rangeText(condition.min)) : t("Род слишком знаменит", "The family is too renowned");
    case "thread":
      return t("Прошлое рода распорядилось иначе", "The family's past decided otherwise");
    case "story":
      return t("Эта история уже случилась в роду", "This story has already happened in the family");
    case "world":
      return t("Не в этом мире", "Not in this world");
    case "missingKin":
      return condition.has ? t("Нужен пропавший родственник", "Requires a missing relative") : t("Кто-то из родни пропал", "A relative is missing");
    case "married":
      return condition.has ? t("Нужно быть в браке", "Requires being married") : t("Уже в браке", "Already married");
  }
}
