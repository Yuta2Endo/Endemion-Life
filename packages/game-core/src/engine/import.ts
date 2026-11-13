// Stage 04: перенос жизни из браузера на сервер. Сохранению из браузера нельзя доверять: seed, состояние генератора,
// скрытое, золото и исходы событий игрок мог изменить. Поэтому сервер проверяет сохранение так же строго, как своё,
// бросает заново то, чего игрок ещё не видел, выдаёт новый seed и срезает невозможные значения.
// Прошлые исходы доказать нельзя: такая жизнь навсегда помечена как перенесённая (столбец lives.origin)
import { maxResources, MAX_LEVEL, xpForLevel } from "../character/derived.js";
import { GameRuleError } from "../errors.js";
import { t } from "../i18n.js";
import { findEvent } from "../narrative/selection.js";
import { hashSeed, Rng } from "../rng.js";
import { allTalents } from "../rpg/talents.js";
import { RESOURCE_KEYS } from "../stats.js";
import type { GameState, HistoryEntry } from "../types.js";
import { getUniverse } from "../universes/registry.js";
import { parseSave } from "./save.js";

/** Золото NPC больше не растёт выше этого и в собственной жизни (character/npc-life.ts) */
const NPC_WEALTH_MAX = 100_000;
/** Спящих талантов при рождении не больше двух */
const MAX_DORMANT = 2;

/** Что сервер исправил при переносе: поле, было, стало */
export interface ImportAdjustment {
  field: string;
  from: number;
  to: number;
}

export interface ImportResult {
  state: GameState;
  /** Запись истории о переносе: последняя в истории перенесённой жизни */
  entry: HistoryEntry;
  adjustments: ImportAdjustment[];
}

/**
 * Сколько золота правдоподобно для этого возраста. Замер на 360 полных жизнях (6 миров × 60 seed):
 * стартовое золото — до 200, дальше рост не быстрее ~40 в год, у культиватора — 28 391 к тысяче лет.
 * Предел примерно втрое выше максимума: честное сохранение его не задевает, подделку — срезает.
 * Род учитывается по году рождения персонажа в роду (epoch): наследник богатого предка получает долю его золота
 */
export function importWealthCap(state: GameState): number {
  const lineageYears = Math.min(Math.max(0, state.lineage.epoch), state.lineage.generation * 1500);
  return 500 + 100 * (state.life.age + lineageYears);
}

/** Уровень растёт от опыта за годы: замер — не выше 21 у тысячелетнего культиватора, не выше 7 у остальных */
export function importLevelCap(state: GameState): number {
  return Math.min(MAX_LEVEL, 5 + Math.floor(state.life.age / 2));
}

function clampField(adjustments: ImportAdjustment[], field: string, value: number, max: number): number {
  if (value <= max) return value;
  adjustments.push({ field, from: value, to: max });
  return max;
}

/**
 * Готовит сохранение из браузера к жизни на сервере. salt — случайное значение сервера: из него выводится новый seed,
 * поэтому будущие броски нельзя вычислить ни из прежнего seed, ни из присланного состояния генератора.
 * Бросаются заново скрытые потенциал, судьба и спящие таланты, если игрок их ещё не узнал.
 * Ошибка формата — INVALID_SAVE; продолженная жизнь — LINEAGE_CONTINUED (её наследник остался в браузере)
 */
export function prepareImport(raw: unknown, salt: string): ImportResult {
  if (salt.length === 0) throw new GameRuleError("INVALID_INPUT", "Нужна соль сервера");
  const state = parseSave(raw);
  if (state.lineage.continuedBy !== null) throw new GameRuleError("LINEAGE_CONTINUED", "Род уже продолжен в браузере: перенесите жизнь наследника");
  const universe = getUniverse(state.character.universeId);
  const c = state.character;
  const adjustments: ImportAdjustment[] = [];

  // Новый seed и генератор: всё, что игрок знал о будущих бросках, больше не действует
  const seed = `imp-${hashSeed(`${salt}::import::${state.seed}`).toString(36)}${hashSeed(`${state.seed}::${salt}::import`).toString(36)}`;
  state.seed = seed;
  state.rngState = Rng.fromSeed(seed, "life").state;
  const rng = Rng.fromSeed(seed, "import");

  // Скрытое, которого игрок ещё не видел, — заново. Раскрытое остаётся: игрок уже знает его по истории
  const hidden = state.hidden;
  if (!hidden.revealed.includes("potential")) hidden.potential = rng.int(1, 5) + rng.int(0, 5);
  if (!hidden.revealed.includes("destiny")) hidden.destiny = rng.int(1, 5) + rng.int(0, 5);
  const count = Math.min(MAX_DORMANT, hidden.dormantTalents.length);
  const dormant: string[] = [];
  for (let i = 0; i < count; i++) {
    const pool = allTalents(universe).filter((x) => !c.talents.includes(x.id) && !dormant.includes(x.id));
    const talent = rng.weighted(pool, (x) => x.weight ?? 1);
    if (talent) dormant.push(talent.id);
  }
  hidden.dormantTalents = dormant;

  // Невозможные значения: золото и уровень не по возрасту, запасы выше предела, путь силы раньше срока
  c.wealth = clampField(adjustments, "wealth", c.wealth, importWealthCap(state));
  c.level = clampField(adjustments, "level", c.level, importLevelCap(state));
  // Опыт не выше порога уровня: иначе срезанный уровень вырос бы обратно в первый же год
  c.xp = clampField(adjustments, "xp", c.xp, xpForLevel(c.level) - 1);
  const limits = maxResources(c);
  for (const key of RESOURCE_KEYS) c.resources[key] = clampField(adjustments, `resources.${key}`, c.resources[key], limits[key]);
  if (state.life.age < universe.track.minAge) {
    c.track.rank = clampField(adjustments, "track.rank", c.track.rank, 0);
    c.track.points = clampField(adjustments, "track.points", c.track.points, 0);
  }
  const inheritance = state.lineage.inheritance;
  if (inheritance) inheritance.held = clampField(adjustments, "lineage.inheritance.held", inheritance.held, importWealthCap(state));
  for (const npc of state.npcs) npc.wealth = clampField(adjustments, `npc.${npc.id}.wealth`, npc.wealth, NPC_WEALTH_MAX);
  // Stage 02.3: капитал дела — не второе золото, но продажа возвращает его в кошелёк.
  // Поэтому перенос из браузера режет и его по тому же пределу, что и золото
  for (const venture of state.business.ventures) {
    venture.capital = clampField(adjustments, `business.${venture.id}.capital`, venture.capital, importWealthCap(state));
  }

  // Событие, которого нет в игре, не может ждать ответа: иначе жизнь застрянет
  if (state.pending && !findEvent(universe, state.pending.eventId)) state.pending = null;
  state.scheduled = state.scheduled.filter((s) => findEvent(universe, s.eventId) !== undefined);

  const entry: HistoryEntry = {
    seq: state.nextSeq++,
    age: state.life.age,
    kind: "import",
    title: t("Перенос на сервер", "Moved to the server"),
    text: t(
      adjustments.length > 0
        ? `Жизнь перенесена из браузера. Сервер исправил невозможные значения: ${adjustments.length}. Дальше исходы считает сервер.`
        : "Жизнь перенесена из браузера. Дальше исходы считает сервер.",
      adjustments.length > 0
        ? `This life was moved from the browser. The server corrected impossible values: ${adjustments.length}. From now on the server computes outcomes.`
        : "This life was moved from the browser. From now on the server computes outcomes."
    ),
    changes: []
  };
  return { state, entry, adjustments };
}
