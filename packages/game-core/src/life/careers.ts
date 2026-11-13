// Stage 02.2: карьера. Одна запись о работе: character.professionId — сама профессия,
// CareerState — ступень, стаж и занятость. Отдельного «jobId» нет, чтобы не держать два источника истины.
// Каталог ступеней и жалованья привязан к профессиям мира; общие ремёсла описаны один раз.
import { findEducation, findProfession } from "../rpg/skills.js";
import type { EngineContext } from "../engine/context.js";
import { record } from "../engine/record.js";
import { t, type LocalizedText } from "../i18n.js";
import { clamp } from "../stats.js";
import type { CareerState, EmploymentStatus, GameState, UniverseId } from "../types.js";
import type { UniverseDefinition } from "../universes/types.js";

export const EMPLOYMENT_STATUS_NAMES: Readonly<Record<EmploymentStatus, LocalizedText>> = {
  employed: t("Работает", "Employed"),
  unemployed: t("Без работы", "Unemployed"),
  retired: t("На покое", "Retired")
};

export interface CareerRankDefinition {
  name: LocalizedText;
  /** Годовое жалованье до поправки на навык и хозяйство мира */
  wage: number;
}

export interface CareerTrackDefinition {
  /** id профессии: работа и карьера ссылаются на один и тот же справочник */
  professionId: string;
  /** Минимальная пройденная ступень образования */
  education: number;
  /** Навык, без которого на работу не берут */
  skill: string;
  skillMin: number;
  /** Возраст, с которого доступен выход на покой */
  retirementAge: number;
  /** Сколько лет нужно продержаться на ступени, чтобы просить повышения */
  promotionYears: number;
  ranks: readonly CareerRankDefinition[];
}

interface RankSeed {
  ru: string;
  en: string;
  wage: number;
}

function track(
  professionId: string,
  education: number,
  skill: string,
  skillMin: number,
  retirementAge: number,
  promotionYears: number,
  ranks: readonly [RankSeed, RankSeed, RankSeed]
): CareerTrackDefinition {
  return {
    professionId,
    education,
    skill,
    skillMin,
    retirementAge,
    promotionYears,
    ranks: ranks.map((rank) => ({ name: t(rank.ru, rank.en), wage: rank.wage }))
  };
}

/** Общие ремёсла: доступны в любом мире, поэтому названия ступеней общие */
const COMMON_TRACKS: readonly CareerTrackDefinition[] = [
  track("guard", 1, "melee", 10, 62, 4, [
    { ru: "Помощник стражи", en: "Watch assistant", wage: 3 },
    { ru: "Стражник", en: "Guard", wage: 5 },
    { ru: "Капитан стражи", en: "Watch captain", wage: 8 }
  ]),
  track("scholar", 2, "lore", 20, 68, 4, [
    { ru: "Переписчик", en: "Copyist", wage: 3 },
    { ru: "Учёный", en: "Scholar", wage: 6 },
    { ru: "Хранитель архива", en: "Keeper of the archive", wage: 10 }
  ]),
  track("merchant", 2, "trade", 15, 65, 4, [
    { ru: "Разносчик", en: "Peddler", wage: 4 },
    { ru: "Торговец", en: "Merchant", wage: 8 },
    { ru: "Купец с караваном", en: "Caravan master", wage: 13 }
  ]),
  track("wanderer", 0, "survival", 5, 70, 5, [
    { ru: "Путник", en: "Traveller", wage: 1 },
    { ru: "Странник", en: "Wanderer", wage: 3 },
    { ru: "Вожатый дорог", en: "Road guide", wage: 6 }
  ]),
  track("laborer", 0, "craft", 0, 66, 5, [
    { ru: "Подручный", en: "Hand", wage: 2 },
    { ru: "Подёнщик", en: "Day labourer", wage: 4 },
    { ru: "Старший артельщик", en: "Work gang leader", wage: 7 }
  ])
];

/** Свои пути каждого мира: названия ступеней говорят о его ремёслах и службах */
const WORLD_TRACKS: Readonly<Record<UniverseId, readonly CareerTrackDefinition[]>> = {
  "dark-fantasy": [
    track("hollow-hunter", 1, "hollow-hunting", 12, 60, 3, [
      { ru: "Наёмник у Мглы", en: "Mist hireling", wage: 4 },
      { ru: "Охотник на полых", en: "Hollow hunter", wage: 8 },
      { ru: "Гроза полых", en: "Bane of the hollow", wage: 13 }
    ]),
    track("lamplighter", 0, "survival", 5, 64, 4, [
      { ru: "Подмастерье фонарщика", en: "Lamplighter's apprentice", wage: 2 },
      { ru: "Фонарщик", en: "Lamplighter", wage: 4 },
      { ru: "Старший фонарщик", en: "Master lamplighter", wage: 6 }
    ]),
    track("relic-dealer", 2, "relic-lore", 15, 62, 4, [
      { ru: "Скупщик святынь", en: "Relic buyer", wage: 4 },
      { ru: "Торговец реликвиями", en: "Relic dealer", wage: 8 },
      { ru: "Хранитель соборной коллекции", en: "Keeper of the cathedral collection", wage: 12 }
    ])
  ],
  isekai: [
    track("adventurer", 1, "guild-craft", 12, 55, 3, [
      { ru: "Новичок Гильдии", en: "Guild novice", wage: 4 },
      { ru: "Искатель приключений", en: "Adventurer", wage: 8 },
      { ru: "Ветеран подземелий", en: "Dungeon veteran", wage: 13 }
    ]),
    track("inventor", 2, "invention", 15, 65, 4, [
      { ru: "Мастеровой", en: "Journeyman", wage: 4 },
      { ru: "Изобретатель", en: "Inventor", wage: 8 },
      { ru: "Королевский механик", en: "Royal mechanist", wage: 13 }
    ]),
    track("court-mage", 3, "spellcraft", 20, 68, 4, [
      { ru: "Ученик при бароне", en: "Baron's apprentice", wage: 5 },
      { ru: "Маг при бароне", en: "Baron's mage", wage: 10 },
      { ru: "Придворный архимаг", en: "Court archmage", wage: 16 }
    ])
  ],
  murim: [
    track("escort", 1, "martial-arts", 12, 58, 3, [
      { ru: "Носильщик каравана", en: "Caravan porter", wage: 4 },
      { ru: "Охрана караванов", en: "Caravan escort", wage: 8 },
      { ru: "Глава охранного бюро", en: "Head of the escort agency", wage: 12 }
    ]),
    track("physician", 2, "medicine", 15, 70, 4, [
      { ru: "Ученик лекаря", en: "Physician's apprentice", wage: 4 },
      { ru: "Лекарь", en: "Physician", wage: 8 },
      { ru: "Придворный лекарь", en: "Court physician", wage: 12 }
    ]),
    track("informant", 0, "stealth", 8, 60, 4, [
      { ru: "Слухач", en: "Listener", wage: 3 },
      { ru: "Осведомитель", en: "Informant", wage: 6 },
      { ru: "Хранитель чужих тайн", en: "Keeper of secrets", wage: 10 }
    ])
  ],
  xianxia: [
    track("alchemist", 2, "alchemy", 15, 80, 4, [
      { ru: "Ученик алхимика", en: "Alchemist's apprentice", wage: 5 },
      { ru: "Алхимик", en: "Alchemist", wage: 10 },
      { ru: "Мудрец пилюль", en: "Pill sage", wage: 16 }
    ]),
    track("talisman-maker", 2, "talismans", 12, 75, 4, [
      { ru: "Переписчик печатей", en: "Seal copyist", wage: 4 },
      { ru: "Мастер талисманов", en: "Talisman maker", wage: 8 },
      { ru: "Хранитель формаций", en: "Formation keeper", wage: 13 }
    ]),
    track("herb-gatherer", 0, "survival", 8, 70, 4, [
      { ru: "Сборщик трав", en: "Herb picker", wage: 3 },
      { ru: "Собиратель духовных трав", en: "Spirit herb gatherer", wage: 6 },
      { ru: "Проводник по духовным жилам", en: "Guide of the spirit veins", wage: 10 }
    ])
  ],
  hunter: [
    track("raid-hunter", 2, "dungeon-combat", 15, 55, 3, [
      { ru: "Охотник ранга E", en: "E-rank hunter", wage: 5 },
      { ru: "Рейдовый охотник", en: "Raid hunter", wage: 10 },
      { ru: "Охотник ранга S", en: "S-rank hunter", wage: 16 }
    ]),
    track("hunter-streamer", 1, "streaming", 12, 50, 3, [
      { ru: "Новичок в сети", en: "Online newcomer", wage: 4 },
      { ru: "Охотник-стример", en: "Hunter streamer", wage: 8 },
      { ru: "Звезда трансляций", en: "Streaming star", wage: 13 }
    ]),
    track("gate-analyst", 3, "lore", 18, 65, 4, [
      { ru: "Стажёр Ассоциации", en: "Association intern", wage: 4 },
      { ru: "Аналитик Врат", en: "Gate analyst", wage: 8 },
      { ru: "Глава отдела прогнозов", en: "Head of forecasting", wage: 13 }
    ])
  ],
  academy: [
    track("court-mage", 3, "arcana", 20, 70, 4, [
      { ru: "Ученик Башни", en: "Tower apprentice", wage: 6 },
      { ru: "Придворный маг", en: "Court mage", wage: 11 },
      { ru: "Архимаг короны", en: "Crown archmage", wage: 17 }
    ]),
    track("diplomat", 3, "etiquette", 18, 70, 4, [
      { ru: "Секретарь посольства", en: "Embassy secretary", wage: 5 },
      { ru: "Дипломат", en: "Diplomat", wage: 10 },
      { ru: "Хранитель печати", en: "Keeper of the seal", wage: 15 }
    ]),
    track("duellist", 1, "duelling", 12, 55, 3, [
      { ru: "Дуэлянт с улицы", en: "Street duellist", wage: 4 },
      { ru: "Наёмный дуэлянт", en: "Hired duellist", wage: 8 },
      { ru: "Мастер клинка", en: "Master of the blade", wage: 13 }
    ])
  ]
};

export function careerTracksOf(universeId: UniverseId): readonly CareerTrackDefinition[] {
  return [...WORLD_TRACKS[universeId], ...COMMON_TRACKS];
}

export function findCareerTrack(universeId: UniverseId, professionId: string | null): CareerTrackDefinition | undefined {
  if (professionId === null) return undefined;
  return careerTracksOf(universeId).find((track) => track.professionId === professionId);
}

export function newCareerState(): CareerState {
  return { rank: 0, since: 0, tenure: 0, employed: false, retired: false };
}

export function maxCareerRank(track: CareerTrackDefinition | undefined): number {
  return track ? Math.max(0, track.ranks.length - 1) : 0;
}

/** Статус занятости — одно место, где он выводится из состояния */
export function employmentStatus(state: GameState): EmploymentStatus {
  if (state.career?.retired) return "retired";
  if (state.career?.employed && state.character.professionId !== null) return "employed";
  return "unemployed";
}

/**
 * Защита на границе действия: старые сохранения и прямые эффекты не должны оставить
 * занятость без профессии, ступень выше лестницы или покой вместе с работой
 */
export function normalizeCareerState(state: GameState): CareerState {
  const job = state.character.professionId;
  const track = findCareerTrack(state.character.universeId, job);
  const raw = state.career;
  if (!raw) {
    return {
      rank: 0,
      since: job ? state.life.age : 0,
      tenure: 0,
      employed: job !== null,
      retired: false
    };
  }
  const retired = raw.retired === true;
  const employed = raw.employed === true && job !== null && !retired;
  const rank = job === null ? 0 : clamp(Math.round(raw.rank), 0, maxCareerRank(track));
  const since = clamp(Math.round(raw.since), 0, state.life.age);
  const tenure = job === null ? 0 : clamp(Math.round(raw.tenure), 0, Math.max(0, state.life.age));
  return { rank, since: job !== null && since === 0 ? state.life.age : since, tenure, employed, retired };
}

/** Можно ли начать эту работу: образование и навык проверяются здесь, а не только в событии */
export function canStartCareer(universe: UniverseDefinition, state: GameState, professionId: string): boolean {
  const profession = findProfession(universe, professionId);
  const track = findCareerTrack(universe.id, professionId);
  if (!profession || !track || !state.life.alive) return false;
  if (state.life.age < 16) return false;
  const education = findEducation(universe, state.character.educationId)?.tier ?? 0;
  if (education < track.education) return false;
  return (state.character.skills[track.skill] ?? 0) >= track.skillMin;
}

/** Поступление на работу. Ступень начинается с нуля: прежний стаж не переходит на новое место.
 * force используется только прямыми сюжетными наградами профессии: событие само подтверждает квалификацию */
export function startCareer(ctx: EngineContext, professionId: string, force = false): boolean {
  const state = ctx.state;
  if (!force && !canStartCareer(ctx.universe, state, professionId)) return false;
  if (!findProfession(ctx.universe, professionId) || !findCareerTrack(state.character.universeId, professionId)) return false;
  if (state.career?.employed && state.character.professionId === professionId) return false;
  state.character.professionId = professionId;
  if (!state.flags.includes("profession")) state.flags.push("profession");
  state.career = { rank: 0, since: state.life.age, tenure: 0, employed: true, retired: false };
  record(ctx, { kind: "profession", value: professionId });
  return true;
}

export function currentTrack(state: GameState): CareerTrackDefinition | undefined {
  return findCareerTrack(state.character.universeId, state.character.professionId);
}

export function currentRank(state: GameState): CareerRankDefinition | undefined {
  const track = currentTrack(state);
  return track?.ranks[clamp(state.career?.rank ?? 0, 0, maxCareerRank(track))];
}

export function nextRank(state: GameState): CareerRankDefinition | undefined {
  const track = currentTrack(state);
  if (!track) return undefined;
  return track.ranks[(state.career?.rank ?? 0) + 1];
}

/** Жалованье за год. Навык добавляет немного, но не больше трёх: ранг остаётся главным */
export function careerWage(state: GameState): number {
  const track = currentTrack(state);
  if (!state.career) {
    // Ненормализованное старое состояние: профессия уже есть, карьеры ещё нет
    return track ? (track.ranks[0]?.wage ?? 0) : 0;
  }
  if (!state.career.employed) return 0;
  const rank = currentRank(state);
  if (!track || !rank) return 0;
  return rank.wage + Math.min(3, Math.floor((state.character.skills[track.skill] ?? 0) / 12));
}

/** Пора просить повышение: на нынешней ступени отработано достаточно лет */
export function promotionReady(state: GameState): boolean {
  if (!state.career?.employed) return false;
  const track = currentTrack(state);
  if (!track || state.career.rank >= maxCareerRank(track)) return false;
  return state.life.age - state.career.since >= track.promotionYears;
}

export function promoteCareer(ctx: EngineContext, delta = 1): boolean {
  const state = ctx.state;
  const track = currentTrack(state);
  if (!state.career?.employed || !track) return false;
  const before = state.career.rank;
  state.career.rank = clamp(before + Math.max(1, Math.round(delta)), 0, maxCareerRank(track));
  if (state.career.rank === before) return false;
  state.career.since = state.life.age;
  record(ctx, { kind: "career", key: state.character.professionId ?? "", value: state.career.rank });
  return true;
}

/** Потеря работы. Профессия остаётся названием последнего места, но жалованья больше нет */
export function loseCareer(ctx: EngineContext): boolean {
  const state = ctx.state;
  if (!state.career?.employed) return false;
  state.career.employed = false;
  state.career.retired = false;
  state.career.since = state.life.age;
  record(ctx, { kind: "career", key: state.character.professionId ?? "", value: "unemployed" });
  return true;
}

/** Выход на покой. Жалованье прекращается в тот же год; сословие и рента остаются */
export function retireCareer(ctx: EngineContext): boolean {
  const state = ctx.state;
  if (!state.career?.employed || state.career.retired) return false;
  state.career.employed = false;
  state.career.retired = true;
  state.career.since = state.life.age;
  record(ctx, { kind: "career", key: state.character.professionId ?? "", value: "retired" });
  return true;
}

export function retirementDue(state: GameState): boolean {
  if (!state.career?.employed) return false;
  const track = currentTrack(state);
  return track !== undefined && state.life.age >= track.retirementAge;
}

/** Жизнь на пенсии: стаж растёт только пока человек работает */
export function careerYear(ctx: EngineContext): { retired: boolean } {
  const state = ctx.state;
  if (!state.life.alive || !state.career?.employed) return { retired: false };
  state.career.tenure = Math.min(state.life.age, state.career.tenure + 1);
  const track = currentTrack(state);
  // Мягкий выход на покой даёт событие; жёсткий срок не даёт работать вечно
  if (track && state.life.age >= track.retirementAge + 3) {
    return { retired: retireCareer(ctx) };
  }
  return { retired: false };
}

export interface CareerView {
  status: EmploymentStatus;
  statusName: LocalizedText;
  /** Нынешняя или последняя профессия. null — человек ещё нигде не работал */
  profession: LocalizedText | null;
  rank: number;
  rankName: LocalizedText | null;
  ranks: number;
  tenure: number;
  /** Годовое жалованье при нынешней занятости. 0 — не работает */
  wage: number;
  nextRankName: LocalizedText | null;
  promotionReady: boolean;
  retirementAge: number | null;
  canRetire: boolean;
}

export function presentCareer(state: GameState, universe: UniverseDefinition): CareerView {
  const normalized: GameState = { ...state, career: normalizeCareerState(state) };
  const profession = normalized.character.professionId ? findProfession(universe, normalized.character.professionId) : undefined;
  const track = currentTrack(normalized);
  const rank = currentRank(normalized);
  const next = nextRank(normalized);
  const status = employmentStatus(normalized);
  return {
    status,
    statusName: profession ? EMPLOYMENT_STATUS_NAMES[status] : t("Ещё не работал", "Not yet worked"),
    profession: profession?.name ?? null,
    rank: normalized.career.rank,
    rankName: rank?.name ?? null,
    ranks: track?.ranks.length ?? 0,
    tenure: normalized.career.tenure,
    wage: careerWage(normalized),
    nextRankName: next?.name ?? null,
    promotionReady: promotionReady(normalized),
    retirementAge: track?.retirementAge ?? null,
    canRetire: retirementDue(normalized)
  };
}
