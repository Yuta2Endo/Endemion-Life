// Ответы API. Представление жизни строится одной функцией и на сервере, и в офлайн-режиме сайта
import {
  presentEvent,
  presentProfile,
  summarizeCharacter,
  type CharacterState,
  type CharacterSummary,
  type EventView,
  type GameErrorCode,
  type GameState,
  type HistoryEntry,
  type LifeProfile,
  type LifeState,
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
}

export interface LifeListItem extends LifeMeta {
  universeId: UniverseId;
  name: string;
  age: number;
  level: number;
  status: LifeStatus;
  version: number;
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
    profile: presentProfile(state)
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
    version: state.version
  };
}
