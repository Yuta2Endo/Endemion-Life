// Stage 02.1: длительное здоровье персонажа, болезни и раны.
// Модель детерминированная: все броски идут через сохранённый генератор жизни, время не читается.
import { effectiveStats, maxResources } from "../character/derived.js";
import { t, type LocalizedText } from "../i18n.js";
import type { CharacterState, GameState, HealthCondition, HealthConditionKind, HealthState } from "../types.js";
import type { EngineContext } from "../engine/context.js";
import { clamp } from "../stats.js";
import { DEATH_CAUSES } from "./death.js";

export const HEALTH_MAX = 100;
export const HEALTH_MIN = 0;
/** Больше шести активных состояний не бывает: старые вытесняются самой жизнью, новые не добавляются */
export const MAX_HEALTH_CONDITIONS = 6;
export const MAX_CONDITION_YEARS = 20;
export const MAX_CONDITION_DAMAGE = 20;

/** Определение болезни или раны: в сохранении лежит снимок, а здесь — правила появления и имени */
export interface HealthConditionDefinition {
  id: string;
  kind: HealthConditionKind;
  name: LocalizedText;
  description: LocalizedText;
  /** Тяжесть по умолчанию, 1–3 */
  severity: number;
  /** Сколько лет длится без лечения. 0 — хроническое состояние */
  duration: number;
  /** Урон здоровью за год на первой ступени тяжести */
  damage: number;
  /** Может убить, если здоровье на исходе */
  lethal: boolean;
  /** Может пройти само */
  recoverable: boolean;
}

const COMMON_FEVER: HealthConditionDefinition = {
  id: "common-fever",
  kind: "illness",
  name: t("Лихорадка", "Fever"),
  description: t("Жар, слабость и потливость. Обычно проходит за пару лет, если беречь силы.", "Heat, weakness and sweats. It usually passes in a couple of years with rest."),
  severity: 1,
  duration: 2,
  damage: 4,
  lethal: false,
  recoverable: true
};

const COMMON_OLD_WOUND: HealthConditionDefinition = {
  id: "common-old-wound",
  kind: "injury",
  name: t("Старая рана", "Old wound"),
  description: t("Ноющая рана, которая даёт о себе знать в непогоду.", "An aching wound that makes itself known in bad weather."),
  severity: 1,
  duration: 3,
  damage: 3,
  lethal: false,
  recoverable: true
};

const COMMON_WOUND: HealthConditionDefinition = {
  id: "common-wound",
  kind: "wound",
  name: t("Незалеченная рана", "Untreated wound"),
  description: t("Рана, которую перевязали наспех. Без лечения может загноиться.", "A wound bound in haste. Without care it can fester."),
  severity: 2,
  duration: 2,
  damage: 6,
  lethal: false,
  recoverable: true
};

const MIST_ROT: HealthConditionDefinition = {
  id: "df-mist-rot",
  kind: "illness",
  name: t("Мглистая гниль", "Mist rot"),
  description: t("Серая сыпь и холод в костях. Болезнь Мглы не любит соборного огня.", "A grey rash and a cold in the bones. The Mist's sickness fears cathedral fire."),
  severity: 2,
  duration: 4,
  damage: 7,
  lethal: true,
  recoverable: true
};

const MANA_BURN: HealthConditionDefinition = {
  id: "is-mana-burn",
  kind: "injury",
  name: t("Мана-ожог", "Mana burn"),
  description: t("Магия прошла сквозь тело и оставила после себя тонкие ожоги.", "Magic passed through the body and left fine burns behind."),
  severity: 2,
  duration: 3,
  damage: 6,
  lethal: false,
  recoverable: true
};

const QI_DEVIATION: HealthConditionDefinition = {
  id: "mu-qi-deviation",
  kind: "injury",
  name: t("Сорванное дыхание", "Qi deviation"),
  description: t("Меридианы горят, ци идёт не туда. Нужен покой и наставник.", "The meridians burn and qi flows wrong. Rest and a master are needed."),
  severity: 2,
  duration: 3,
  damage: 7,
  lethal: false,
  recoverable: true
};

const SERPENT_VENOM: HealthConditionDefinition = {
  id: "xx-serpent-venom",
  kind: "illness",
  name: t("Змеиный яд", "Serpent venom"),
  description: t("Яд сторожа травы растекается по крови и жжёт изнутри.", "The herb guardian's venom spreads through the blood and burns within."),
  severity: 3,
  duration: 2,
  damage: 8,
  lethal: true,
  recoverable: true
};

const GATE_WOUND: HealthConditionDefinition = {
  id: "hu-gate-wound",
  kind: "wound",
  name: t("Рана Врат", "Gate wound"),
  description: t("Рана от когтей монстра не затягивается: в ней ещё живёт чужая мана.", "A monster's claw wound will not close: foreign mana still lives in it."),
  severity: 2,
  duration: 3,
  damage: 8,
  lethal: true,
  recoverable: true
};

const DUEL_INJURY: HealthConditionDefinition = {
  id: "ac-duel-injury",
  kind: "injury",
  name: t("Дуэльная травма", "Duel injury"),
  description: t("Ушиб или порез после поединка. Без лазарета заживает долго.", "A bruise or cut from a duel. Without the infirmary it heals slowly."),
  severity: 2,
  duration: 2,
  damage: 6,
  lethal: false,
  recoverable: true
};

/** Все болезни и раны, которые может наложить контент. id стабилен: он лежит в сохранении */
export const HEALTH_CONDITIONS: Readonly<Record<string, HealthConditionDefinition>> = {
  [COMMON_FEVER.id]: COMMON_FEVER,
  [COMMON_OLD_WOUND.id]: COMMON_OLD_WOUND,
  [COMMON_WOUND.id]: COMMON_WOUND,
  [MIST_ROT.id]: MIST_ROT,
  [MANA_BURN.id]: MANA_BURN,
  [QI_DEVIATION.id]: QI_DEVIATION,
  [SERPENT_VENOM.id]: SERPENT_VENOM,
  [GATE_WOUND.id]: GATE_WOUND,
  [DUEL_INJURY.id]: DUEL_INJURY
};

export function findHealthCondition(id: string): HealthConditionDefinition | undefined {
  return HEALTH_CONDITIONS[id];
}

export function conditionName(id: string): LocalizedText {
  return HEALTH_CONDITIONS[id]?.name ?? t(id, id);
}

export function newHealthState(value = HEALTH_MAX): HealthState {
  return { value: clamp(Math.round(value), HEALTH_MIN, HEALTH_MAX), conditions: [], deathCause: null };
}

/** Доля запаса здоровья, перенесённая в длительное здоровье 0–100 */
export function healthValueFromResources(character: CharacterState): number {
  const max = maxResources(character).health;
  if (!Number.isFinite(max) || max <= 0) return HEALTH_MAX;
  return clamp(Math.round((character.resources.health / max) * HEALTH_MAX), HEALTH_MIN, HEALTH_MAX);
}

/** Здоровье из старого сохранения или из состояния без поля health */
export function healthFromState(state: GameState): HealthState {
  const health = newHealthState(state.life.alive ? Math.max(1, healthValueFromResources(state.character)) : HEALTH_MIN);
  if (!state.life.alive) health.deathCause = state.life.deathCause;
  return health;
}

/** Нормализация на границе действия: поле могло отсутствовать в старом сохранении */
export function normalizeHealthState(state: GameState): HealthState {
  const health = state.health;
  if (!health || !Array.isArray(health.conditions) || typeof health.value !== "number" || !Number.isFinite(health.value)) {
    return healthFromState(state);
  }
  health.value = clamp(Math.round(health.value), HEALTH_MIN, HEALTH_MAX);
  return health;
}

/** Сколько здоровья отнимает или возвращает год без учёта болезней */
function annualHealthDrift(state: GameState, vitality: number): number {
  const age = state.life.age;
  const vitalityBonus = clamp(Math.floor((vitality - 10) / 20), 0, 2);
  if (age < 14) return 1;
  if (age >= 75) return vitalityBonus - 3;
  if (age >= 60) return vitalityBonus - 2;
  if (age >= 45) return vitalityBonus - 1;
  return vitalityBonus;
}

export function conditionDeathCause(condition: HealthCondition): LocalizedText {
  switch (condition.kind) {
    case "illness":
      return t("Болезнь оказалась смертельной", "The illness proved fatal");
    case "curse":
      return t("Проклятие истощило тело", "The curse drained the body");
    case "injury":
    case "wound":
      return t("Раны оказались смертельными", "The wounds proved fatal");
  }
}

/**
 * Причина смерти от истощения: короткий запас сил даёт раны, длительное здоровье — болезнь.
 * Если ни одного состояния нет, тело просто исчерпало срок.
 */
export function healthFatalCause(state: GameState): LocalizedText {
  const health = state.health ?? healthFromState(state);
  if (health.conditions.length === 0) {
    // Внешний удар или рана без заведённого состояния: тело не исчерпало срок само
    return health.value <= 0 || state.character.resources.health <= 0 ? DEATH_CAUSES.wounds : DEATH_CAUSES.oldAge;
  }
  const condition = health.conditions.find((item) => item.lethal) ?? health.conditions[0];
  return condition ? conditionDeathCause(condition) : DEATH_CAUSES.wounds;
}

/** Наложить болезнь или рану. Повторное наложение усиливает уже существующую, а не дублирует её */
export function addHealthCondition(ctx: EngineContext, id: string, options: { severity?: number; duration?: number } = {}): void {
  const definition = findHealthCondition(id);
  if (!definition) return;
  const health = normalizeHealthState(ctx.state);
  ctx.state.health = health;
  const severity = clamp(Math.round(options.severity ?? definition.severity), 1, 3);
  const duration = clamp(Math.round(options.duration ?? definition.duration), 0, MAX_CONDITION_YEARS);
  const existing = health.conditions.find((condition) => condition.id === id);
  if (existing) {
    existing.severity = clamp(existing.severity + 1, 1, 3);
    existing.damage = clamp(existing.damage + 2, 1, MAX_CONDITION_DAMAGE);
    existing.remaining = Math.max(existing.remaining, duration);
    existing.lethal = existing.lethal || definition.lethal;
    existing.source = ctx.source ?? existing.source;
    health.value = clamp(health.value - existing.severity, HEALTH_MIN, HEALTH_MAX);
    return;
  }
  if (health.conditions.length >= MAX_HEALTH_CONDITIONS) return;
  health.conditions.push({
    id: definition.id,
    kind: definition.kind,
    severity,
    source: ctx.source ?? "event",
    onsetAge: ctx.state.life.age,
    remaining: definition.recoverable ? duration : 0,
    damage: clamp(definition.damage * severity, 1, MAX_CONDITION_DAMAGE),
    recoverable: definition.recoverable,
    lethal: definition.lethal
  });
  // Болезнь сразу отнимает силы: это видно в истории события
  health.value = clamp(health.value - severity * 2, HEALTH_MIN, HEALTH_MAX);
}

/** Лечение убирает состояние целиком. Неизвестное состояние — тихий no-op */
export function cureHealthCondition(ctx: EngineContext, id: string): void {
  const health = normalizeHealthState(ctx.state);
  ctx.state.health = health;
  const index = health.conditions.findIndex((condition) => condition.id === id);
  if (index === -1) return;
  const [removed] = health.conditions.splice(index, 1);
  if (removed) health.value = clamp(health.value + 2 + removed.severity * 2, HEALTH_MIN, HEALTH_MAX);
}

export interface HealthYearResult {
  /** Причина смерти, если год закончился смертью. Решение принимает вызывающий код */
  died: LocalizedText | null;
}

/**
 * Год здоровья: состояния могут усилиться, затянуться или разрешиться, затем они отнимают силы.
 * Возраст и живучесть задают естественный сдвиг. Функция ничего не убивает сама — возвращает причину.
 */
export function healthYear(ctx: EngineContext): HealthYearResult {
  const state = ctx.state;
  const health = normalizeHealthState(state);
  state.health = health;
  if (!state.life.alive) return { died: null };
  const stats = effectiveStats(state.character);

  // 1. Болезни и раны: ухудшение, срок и естественное выздоровление
  for (const condition of [...health.conditions]) {
    if (!health.conditions.includes(condition)) continue;
    if (condition.severity < 3 && condition.recoverable) {
      const chance = clamp(0.05 + condition.severity * 0.04 + Math.max(0, state.life.age - 45) * 0.004 - stats.vitality * 0.0015, 0.01, 0.45);
      if (ctx.rng.chance(chance)) {
        condition.severity += 1;
        condition.damage = clamp(condition.damage + 2, 1, MAX_CONDITION_DAMAGE);
      }
    }
    if (!condition.recoverable || condition.remaining <= 0) continue;
    condition.remaining -= 1;
    if (condition.remaining > 0) continue;
    // Смертельная болезнь на исходе может забрать ослабленного
    if (condition.lethal && health.value <= 10 + condition.severity * 5) {
      const cause = conditionDeathCause(condition);
      health.deathCause = cause;
      return { died: cause };
    }
    const index = health.conditions.indexOf(condition);
    if (index !== -1) health.conditions.splice(index, 1);
    health.value = clamp(health.value + 2 + condition.severity * 2, HEALTH_MIN, HEALTH_MAX);
  }

  // 2. Урон активных состояний и естественный сдвиг возраста
  const damage = health.conditions.reduce((sum, condition) => sum + condition.damage, 0);
  health.value = clamp(health.value + annualHealthDrift(state, stats.vitality) - damage, HEALTH_MIN, HEALTH_MAX);

  // 3. Смертельный кризис: тяжёлая болезнь при почти нулевом здоровье
  const crisis = health.conditions.find((condition) => condition.lethal && condition.severity >= 3 && health.value <= 25);
  if (crisis) {
    const chance = clamp(0.12 + (25 - health.value) / 100 + crisis.damage / 100 - stats.vitality * 0.0015, 0.02, 0.75);
    if (ctx.rng.chance(chance)) {
      const cause = conditionDeathCause(crisis);
      health.deathCause = cause;
      return { died: cause };
    }
  }

  if (health.value > 0) return { died: null };
  const condition = health.conditions.find((item) => item.lethal) ?? health.conditions[0];
  const cause = condition ? conditionDeathCause(condition) : DEATH_CAUSES.oldAge;
  health.deathCause = cause;
  return { died: cause };
}

/** Имена активных состояний для записи смерти и панели здоровья */
export function healthConditionNames(state: GameState): LocalizedText[] {
  return (state.health?.conditions ?? []).map((condition) => conditionName(condition.id));
}

export interface HealthConditionView {
  id: string;
  kind: HealthConditionKind;
  name: LocalizedText;
  description: LocalizedText;
  severity: number;
  source: string;
  onsetAge: number;
  /** Осталось лет до естественного выздоровления. 0 — хроническое состояние */
  remaining: number;
  /** Урон здоровью за год */
  damage: number;
  recoverable: boolean;
  lethal: boolean;
}

export interface HealthView {
  /** Длительное здоровье 0–100 */
  value: number;
  conditions: HealthConditionView[];
  /** Причина смерти, если жизнь закончилась */
  deathCause: LocalizedText | null;
}

/** То, что видит игрок: здоровье, болезни и причину смерти. Скрытых полей здесь нет */
export function presentHealth(state: GameState): HealthView {
  const health = state.health ?? healthFromState(state);
  return {
    value: health.value,
    conditions: health.conditions.map((condition) => {
      const definition = findHealthCondition(condition.id);
      return {
        id: condition.id,
        kind: condition.kind,
        name: definition?.name ?? t(condition.id, condition.id),
        description: definition?.description ?? t("", ""),
        severity: condition.severity,
        source: condition.source,
        onsetAge: condition.onsetAge,
        remaining: condition.remaining,
        damage: condition.damage,
        recoverable: condition.recoverable,
        lethal: condition.lethal
      };
    }),
    deathCause: health.deathCause ?? state.life.deathCause
  };
}
