// Stage 10: освоение мира и мастерство персонажа.
// Запись лежит в сохранении (state.mastery) и ничего не выдаёт: ни золота, ни статов, ни опыта.
// Она только помнит, какие цели и отметки уже зачтены, чтобы одно и то же не зачлось дважды.
import { adventuresOf, placesOf } from "../adventure/content.js";
import { t, type LocalizedText } from "../i18n.js";
import { pathSkill, SKILL_MAX } from "../rpg/skills.js";
import type { GameState } from "../types.js";
import { getUniverse } from "../universes/registry.js";

/** Навык с этого уровня считается освоенным. Выше SKILL_MAX он и так не растёт */
export const SKILL_MASTERY = 80;

export interface MasteryState {
  /** id зачтённых целей. Каждая — один раз за жизнь */
  objectives: string[];
  /** id навыков, доведённых до мастерства. Каждый — один раз за жизнь */
  skills: string[];
}

export interface MasteryObjective {
  id: string;
  name: LocalizedText;
  text: LocalizedText;
  /** Редкая цель требует нескольких уже пройденных вех сразу */
  rare: boolean;
  check: (state: GameState) => boolean;
}

const placesKnown = (state: GameState) => {
  const places = placesOf(state.character.universeId);
  return places.length > 0 && places.every((place) => state.adventure.discovered.includes(place.id));
};

/** Все дороги мира, не первая попавшаяся. Одной пройденной мало */
const deedDone = (state: GameState) => {
  const adventures = adventuresOf(state.character.universeId);
  return adventures.length > 0 && adventures.every((item) => state.adventure.done.includes(item.id));
};

const handMastered = (state: GameState) => {
  const skill = pathSkill(getUniverse(state.character.universeId));
  return (state.character.skills[skill.id] ?? 0) >= SKILL_MASTERY;
};

export const MASTERY_OBJECTIVES: readonly MasteryObjective[] = [
  {
    id: "roads",
    name: t("Все дороги", "Every road"),
    text: t("Открыть все места своего мира.", "Discover every place in your world."),
    rare: false,
    check: placesKnown
  },
  {
    id: "deed",
    name: t("Пройденный путь", "The road walked"),
    text: t("Завершить все приключения своего мира.", "Complete every adventure in your world."),
    rare: false,
    check: deedDone
  },
  {
    id: "hand",
    name: t("Верная рука", "A sure hand"),
    text: t("Довести навык пути своего мира до мастерства.", "Bring your world's path skill to mastery."),
    rare: false,
    check: handMastered
  },
  {
    id: "crown",
    name: t("Последний ранг", "The last rank"),
    text: t("Достичь высшего ранга пути силы.", "Reach the highest rank of the path of power."),
    rare: false,
    check: (state) => state.character.track.rank >= getUniverse(state.character.universeId).track.ranks.length - 1
  },
  {
    id: "letters",
    name: t("Высшая школа", "The highest school"),
    text: t("Получить высшее образование своего мира.", "Complete your world's highest education."),
    rare: false,
    check: (state) => {
      const universe = getUniverse(state.character.universeId);
      const tier = universe.education.find((item) => item.id === state.character.educationId)?.tier ?? 0;
      return tier >= 3;
    }
  },
  {
    id: "name",
    name: t("Имя рода", "The name of the house"),
    text: t("Собрать восемь достижений рода.", "Gather eight achievements of the house."),
    rare: false,
    check: (state) => state.lineage.achievements.length >= 8
  },
  {
    id: "master-of-world",
    name: t("Хозяин мира", "Master of the world"),
    text: t("Открыть все места, пройти приключение мира и довести навык пути до мастерства.", "Discover every place, complete the world's adventure and master the path skill."),
    rare: true,
    check: (state) => placesKnown(state) && deedDone(state) && handMastered(state)
  }
];

export function newMastery(): MasteryState {
  return { objectives: [], skills: [] };
}

export function findObjective(id: string): MasteryObjective | undefined {
  return MASTERY_OBJECTIVES.find((item) => item.id === id);
}

/**
 * Год жизни: зачитывает цели и отметки навыков.
 * Повтор не пишет вторую запись — id уже в списке. Наград нет
 */
export function masteryYearly(state: GameState): void {
  if (!state.life.alive) return;
  const have = new Set(state.mastery.objectives);
  for (const objective of MASTERY_OBJECTIVES) {
    if (have.has(objective.id) || !objective.check(state)) continue;
    state.mastery.objectives.push(objective.id);
  }
  const universe = getUniverse(state.character.universeId);
  const known = new Set(state.mastery.skills);
  const path = pathSkill(universe);
  for (const skill of [path, ...universe.skills.filter((item) => item.id !== path.id)]) {
    if (known.has(skill.id)) continue;
    const level = state.character.skills[skill.id] ?? 0;
    if (level < SKILL_MASTERY || level > SKILL_MAX) continue;
    state.mastery.skills.push(skill.id);
  }
}

export interface ObjectiveView {
  id: string;
  name: LocalizedText;
  text: LocalizedText;
  rare: boolean;
  done: boolean;
}

export interface SkillMasteryView {
  id: string;
  name: LocalizedText;
  level: number;
  mastered: boolean;
}

export interface MasteryView {
  objectives: ObjectiveView[];
  skills: SkillMasteryView[];
  /** Сколько мест мира открыто и сколько их всего */
  places: number;
  placesTotal: number;
  /** Все приключения мира завершены */
  deed: boolean;
  /** Редкая цель уже зачтена */
  rare: boolean;
}

export function presentMastery(state: GameState): MasteryView {
  const universe = getUniverse(state.character.universeId);
  const done = new Set(state.mastery.objectives);
  const mastered = new Set(state.mastery.skills);
  const shown = universe.skills.slice(0, 3);
  return {
    objectives: MASTERY_OBJECTIVES.map((objective) => ({
      id: objective.id,
      name: objective.name,
      text: objective.text,
      rare: objective.rare,
      done: done.has(objective.id)
    })),
    skills: shown.map((skill) => ({
      id: skill.id,
      name: skill.name,
      level: state.character.skills[skill.id] ?? 0,
      mastered: mastered.has(skill.id)
    })),
    places: placesOf(state.character.universeId).filter((place) => state.adventure.discovered.includes(place.id)).length,
    placesTotal: placesOf(state.character.universeId).length,
    deed: deedDone(state),
    rare: done.has("master-of-world")
  };
}
