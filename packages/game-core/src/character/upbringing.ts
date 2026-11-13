// Stage 02.5: уклад детства и ограниченное распределение очков при рождении.
// Это не новая случайность: выбор только меняет стартовые значения, броски seed остаются прежними.
import { GameRuleError } from "../errors.js";
import { t, type LocalizedText } from "../i18n.js";
import { findSkill, SKILL_MAX } from "../rpg/skills.js";
import { findTalent } from "../rpg/talents.js";
import { clamp, entriesOf, STAT_KEYS, type StatMods, type StatPointAllocation } from "../stats.js";
import { UNIVERSE_IDS, type CharacterState, type UniverseId } from "../types.js";
import type { UniverseDefinition } from "../universes/types.js";

/** Сколько очков можно распределить между характеристиками при рождении */
export const POINT_BUY_TOTAL = 3;
/** Сколько очков можно вложить в одну характеристику */
export const POINT_BUY_PER_STAT = 2;
/** Потолок навыка сразу после рождения: уклад и происхождение не выводят его за пределы игры */
export const BIRTH_SKILL_MAX = 30;

export interface UpbringingDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /**
   * Миры, где уклад существует. Каталог показывает только совместимые варианты,
   * а сервер повторно проверяет навыки и талант по миру.
   */
  worlds: readonly UniverseId[];
  statMods: StatMods;
  /** Прибавка к стартовым навыкам. id навыка должен существовать в мире */
  skills: Readonly<Record<string, number>>;
  /** Талант, который проявляется с рождения вместе со случайными дарами */
  talentId: string;
}

const ALL_WORLDS: readonly UniverseId[] = UNIVERSE_IDS;

/**
 * Уклады детства. Общие варианты доступны во всех шести мирах, особые — только там,
 * где их навыки и таланты действительно есть в каталоге.
 */
export const UPBRINGINGS: readonly UpbringingDefinition[] = [
  {
    id: "common-scholar",
    name: t("Учёные годы", "Years of study"),
    description: t(
      "Книги, наставники и долгие вечера над письмом. Тело слабее, зато ум цепок.",
      "Books, tutors and long evenings over a desk. A weaker body, but a quick and stubborn mind."
    ),
    worlds: ALL_WORLDS,
    statMods: { intelligence: 2, wisdom: 1, strength: -1 },
    skills: { lore: 8, medicine: 4 },
    talentId: "quick-learner"
  },
  {
    id: "common-martial",
    name: t("Воинская выучка", "Martial training"),
    description: t(
      "Стойки, мозоли и окрик наставника с рассвета. Сила и выносливость важнее книг.",
      "Stances, calluses and a master's shout at dawn. Strength and endurance matter more than books."
    ),
    worlds: ALL_WORLDS,
    statMods: { strength: 2, vitality: 1, intelligence: -1 },
    skills: { melee: 8, athletics: 5 },
    talentId: "iron-body"
  },
  {
    id: "common-artisan",
    name: t("Ремесленная семья", "Craft family"),
    description: t(
      "Мастерская вместо детской, инструменты вместо игрушек. Руки умеют, язык торгуется.",
      "A workshop instead of a nursery, tools instead of toys. The hands make, the tongue bargains."
    ),
    worlds: ALL_WORLDS,
    statMods: { agility: 1, intelligence: 1, luck: 1, charisma: -1 },
    skills: { craft: 8, trade: 4 },
    talentId: "golden-hands"
  },
  {
    id: "df-chapel-ward",
    name: t("У врат часовни", "Chapel ward"),
    description: t(
      "Молитвы, ладан и умение отличать тьму от простой ночи. Вера держит крепче оружия.",
      "Prayers, incense and the ability to tell darkness from an ordinary night. Faith holds firmer than a blade."
    ),
    worlds: ["dark-fantasy"],
    statMods: { wisdom: 2, willpower: 1, agility: -1 },
    skills: { "relic-lore": 6, medicine: 5 },
    talentId: "ash-blessed"
  },
  {
    id: "is-guild-runner",
    name: t("У гильдейских ворот", "Guild runner"),
    description: t(
      "Очереди за контрактами, карты подземелий и привычка проверять снаряжение дважды.",
      "Queues for contracts, dungeon maps and the habit of checking gear twice."
    ),
    worlds: ["isekai"],
    statMods: { agility: 2, luck: 1, wisdom: -1 },
    skills: { "guild-craft": 6, survival: 6 },
    talentId: "beast-senses"
  },
  {
    id: "mu-sect-yard",
    name: t("Двор секты", "Sect courtyard"),
    description: t(
      "Поклоны старшим, работа по хозяйству и бесконечные повторы одной и той же формы.",
      "Bows to elders, chores and endless repetitions of the same form."
    ),
    worlds: ["murim"],
    statMods: { agility: 2, willpower: 1, charisma: -1 },
    skills: { "martial-arts": 7, "inner-cultivation": 5 },
    talentId: "sword-heart"
  },
  {
    id: "xx-herb-garden",
    name: t("Сад духовных трав", "Spirit herb garden"),
    description: t(
      "Грядки у горного ручья, запах полыни и осторожность при сборе трав, что шевелятся сами.",
      "Beds by a mountain stream, the smell of wormwood and care when picking herbs that move on their own."
    ),
    worlds: ["xianxia"],
    statMods: { wisdom: 2, intelligence: 1, strength: -1 },
    skills: { alchemy: 7, survival: 5 },
    talentId: "pill-sense"
  },
  {
    id: "hu-gate-drill",
    name: t("Тренировки у Врат", "Gate drills"),
    description: t(
      "Сигналы тревоги вместо колыбельных, эвакуационные маршруты и первый деревянный меч.",
      "Sirens instead of lullabies, evacuation routes and a first wooden sword."
    ),
    worlds: ["hunter"],
    statMods: { agility: 2, vitality: 1, charisma: -1 },
    skills: { "dungeon-combat": 7, athletics: 5 },
    talentId: "gate-born"
  },
  {
    id: "ac-salon-upbringing",
    name: t("Воспитание в салоне", "Salon upbringing"),
    description: t(
      "Поклоны, веера и умение сказать колкость так, чтобы её приняли за комплимент.",
      "Bows, fans and the art of saying a barb so it sounds like a compliment."
    ),
    worlds: ["academy"],
    statMods: { charisma: 2, wisdom: 1, vitality: -1 },
    skills: { etiquette: 7, persuasion: 5 },
    talentId: "courtly-grace"
  }
];

/** Уклады, доступные в этом мире. Каталог и проверка входа используют один список */
export function upbringingsFor(universe: UniverseDefinition): readonly UpbringingDefinition[] {
  return UPBRINGINGS.filter((item) => item.worlds.includes(universe.id));
}

export function findUpbringing(universe: UniverseDefinition, id: string): UpbringingDefinition | undefined {
  return upbringingsFor(universe).find((item) => item.id === id);
}

/** Сумма распределённых очков. Неизвестные ключи сюда не попадают: их отсекает проверка */
export function pointBuyTotal(points: StatPointAllocation | undefined): number {
  return entriesOf(points).reduce((sum, [, value]) => sum + value, 0);
}

/** Убирает нули и служебные поля: в сохранение и представление попадает только реальный выбор */
export function normalizeStatPoints(points: StatPointAllocation | undefined): StatPointAllocation {
  const out: StatPointAllocation = {};
  for (const key of STAT_KEYS) {
    const value = points?.[key];
    if (typeof value === "number" && Number.isInteger(value) && value > 0) out[key] = value;
  }
  return out;
}

/**
 * Проверка распределения до броска костей. Возвращает причину отказа или null:
 * так одна и та же ошибка не зависит от seed и её можно проверить в сохранении.
 */
export function statPointsProblem(points: unknown): string | null {
  if (points === undefined) return null;
  if (typeof points !== "object" || points === null || Array.isArray(points)) return "Очки характеристик должны быть объектом";
  let total = 0;
  for (const [key, value] of Object.entries(points)) {
    if (!(STAT_KEYS as readonly string[]).includes(key)) return `Неизвестная характеристика: ${key}`;
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return `${key}: нужно целое число не меньше 0`;
    if (value > POINT_BUY_PER_STAT) return `${key}: не больше ${POINT_BUY_PER_STAT} очков в одну характеристику`;
    total += value;
  }
  if (total > POINT_BUY_TOTAL) return `Можно распределить не больше ${POINT_BUY_TOTAL} очков`;
  return null;
}

/**
 * Проверяет уклад и очки до броска. Уклад должен существовать именно в этом мире,
 * а его навыки и талант — быть в каталоге мира: клиент не может придумать свой уклад.
 */
export function validateCreationChoices(universe: UniverseDefinition, input: { upbringingId?: string; statPoints?: StatPointAllocation }): void {
  const upbringing = input.upbringingId === undefined ? undefined : findUpbringing(universe, input.upbringingId);
  if (input.upbringingId !== undefined && !upbringing) {
    throw new GameRuleError("INVALID_INPUT", `Неизвестный уклад детства: ${input.upbringingId}`);
  }
  if (upbringing) {
    for (const skillId of Object.keys(upbringing.skills)) {
      if (!findSkill(universe, skillId)) throw new GameRuleError("INVALID_INPUT", `Навык уклада недоступен в этом мире: ${skillId}`);
    }
    if (!findTalent(universe, upbringing.talentId)) throw new GameRuleError("INVALID_INPUT", `Талант уклада недоступен в этом мире: ${upbringing.talentId}`);
  }
  const problem = statPointsProblem(input.statPoints);
  if (problem) throw new GameRuleError("INVALID_INPUT", problem);
}

/**
 * Применяет уклад и очки к уже собранному персонажу. Никаких бросков: тот же seed
 * и те же выборы дают те же характеристики, а состояние rng после рождения не зависит от выбора.
 */
export function applyCreationChoices(
  character: CharacterState,
  universe: UniverseDefinition,
  input: { upbringingId?: string; statPoints?: StatPointAllocation }
): void {
  const upbringing = input.upbringingId === undefined ? undefined : findUpbringing(universe, input.upbringingId);
  if (upbringing) {
    for (const [key, delta] of entriesOf(upbringing.statMods)) character.stats[key] += delta;
    for (const [skillId, amount] of Object.entries(upbringing.skills)) {
      character.skills[skillId] = clamp((character.skills[skillId] ?? 0) + amount, 0, Math.min(SKILL_MAX, BIRTH_SKILL_MAX));
    }
    if (!character.talents.includes(upbringing.talentId)) character.talents.push(upbringing.talentId);
  }
  const points = normalizeStatPoints(input.statPoints);
  for (const [key, value] of entriesOf(points)) character.stats[key] += value;
  if (!upbringing && Object.keys(points).length === 0) return;
  character.creation = {
    ...(upbringing ? { upbringingId: upbringing.id } : {}),
    ...(Object.keys(points).length > 0 ? { statPoints: points } : {})
  };
}
