// Ответы API. Представление жизни строится одной функцией и на сервере, и в офлайн-режиме сайта
import {
  presentAdventure,
  presentMastery,
  presentEconomy,
  presentEvent,
  presentLegacy,
  presentMarket,
  presentRegion,
  presentProfile,
  summarizeCharacter,
  type CharacterState,
  type CharacterSummary,
  type AutoMode,
  type MilestoneState,
  type AdventureBoard,
  type EconomyView,
  type EventView,
  type GameErrorCode,
  type GameState,
  type HistoryEntry,
  type ImportAdjustment,
  type LegacyBrief,
  type LifeProfile,
  type LifeState,
  type LineageView,
  type MarketView,
  type MasteryView,
  type RegionView,
  type OptionView,
  type UniverseId,
  type UniverseSummary
} from "@endemion/game-core";

export type LifeStatus = "alive" | "dead";

export interface LifeMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Жизнь глазами игрока. Seed и состояние генератора не передаются: зная их, можно заранее вычислить исход проверок
 */
export interface LifeView extends LifeMeta {
  universeId: UniverseId;
  version: number;
  status: LifeStatus;
  character: CharacterState;
  summary: CharacterSummary;
  life: LifeState;
  pendingEvent: EventView | null;
  /** Stage 02: биография, семья и люди вокруг, шкалы мира, задание Системы. Скрытое — только после раскрытия */
  profile: LifeProfile;
  /** Stage 03: род, наследство, итоги жизни и наследники (когда жизнь закончилась) */
  legacy: LegacyBrief;
  /** Stage 04: хозяйство — состояние экономики мира, доходы и расходы последнего года, нехватка */
  economy: EconomyView;
  /** Stage 04: рынок мира — товары, цены по нынешнему состоянию хозяйства, запас */
  market: MarketView;
  /** Stage 05: места, приключения и текущий шаг */
  adventure: AdventureBoard;
  /** Stage 06: край этой жизни — напряжение, благополучие, склад */
  region: RegionView;
  /** Stage 10: цели освоения и отметки навыков. Наград не показывает — их нет */
  mastery: MasteryView;
  /** Stage 01: режим продвижения, сохраняемый вместе с жизнью */
  autoMode: AutoMode;
  milestones: MilestoneState;
}

export interface LifeListItem extends LifeMeta {
  universeId: UniverseId;
  name: string;
  age: number;
  level: number;
  status: LifeStatus;
  version: number;
  /** Stage 03: поколение рода и его имя */
  generation: number;
  lineageName: string;
  /** Род продолжен наследником: жизнь закрыта для продолжения и отката */
  continued: boolean;
}

/** Ответ на продолжение рода: закрытая жизнь умершего и новая жизнь наследника */
export interface SuccessionResponse {
  previous: LifeView;
  life: LifeView;
  entries: HistoryEntry[];
  replayed: boolean;
}

export interface LineageResponse {
  lineage: LineageView;
}

/**
 * Stage 04: ответ на перенос жизни из браузера. adjustments — что сервер исправил (невозможные значения);
 * при повторе с тем же importId — null: жизнь уже перенесена, исправления записаны в её истории
 */
export interface ImportResponse {
  life: LifeView;
  adjustments: ImportAdjustment[] | null;
  replayed: boolean;
}

export interface ActionResponse {
  life: LifeView;
  /** Записи истории, которые добавило действие */
  entries: HistoryEntry[];
  /** true — это повтор уже принятого действия: ничего не изменилось, вернулся прежний результат */
  replayed: boolean;
}

export interface HistoryPage {
  entries: HistoryEntry[];
  /** Номер для запроса следующей страницы (before). null — история загружена целиком */
  nextBefore: number | null;
}

export interface SaveView {
  version: number;
  age: number;
  reason: SaveReason;
  createdAt: string;
}

export type SaveReason = "create" | "action" | "restore";

export interface CatalogResponse {
  universes: UniverseSummary[];
  temperaments: OptionView[];
}

export interface PlayerView {
  id: string;
  createdAt: string;
}

export type ServiceStatus = "up" | "down";

export interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
  uptimeSeconds: number;
  services: { database: ServiceStatus; redis: ServiceStatus };
}

export type ApiErrorCode =
  | GameErrorCode
  | "VALIDATION"
  | "VERSION_CONFLICT"
  | "ACTION_ID_REUSED"
  | "LIMIT_REACHED"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "INVALID_CODE"
  | "INVALID_TOKEN"
  | "ALREADY_SIGNED_IN"
  | "USE_ENDEMION_ID"
  | "UNAVAILABLE"
  | "INTERNAL";

/** Сколько живых персонажей может быть у одного игрока одновременно */
export const MAX_ALIVE_LIVES = 20;

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}

export function lifeStatus(state: GameState): LifeStatus {
  return state.life.alive ? "alive" : "dead";
}

export function toLifeView(meta: LifeMeta, state: GameState): LifeView {
  return {
    ...meta,
    universeId: state.character.universeId,
    version: state.version,
    status: lifeStatus(state),
    character: state.character,
    summary: summarizeCharacter(state),
    life: state.life,
    pendingEvent: presentEvent(state),
    profile: presentProfile(state),
    legacy: presentLegacy(state),
    economy: presentEconomy(state),
    market: presentMarket(state),
    adventure: presentAdventure(state),
    region: presentRegion(state),
    mastery: presentMastery(state)
    ,autoMode: state.autoMode ?? "manual",
    milestones: state.milestones ?? { triggered: [] }
  };
}

export function toLifeListItem(meta: LifeMeta, state: GameState): LifeListItem {
  return {
    ...meta,
    universeId: state.character.universeId,
    name: state.character.name,
    age: state.life.age,
    level: state.character.level,
    status: lifeStatus(state),
    version: state.version,
    generation: state.lineage.generation,
    lineageName: state.lineage.name,
    continued: state.lineage.continuedBy !== null
  };
}
