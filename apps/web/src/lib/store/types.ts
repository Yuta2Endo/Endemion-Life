import type { GameAction } from "@endemion/game-core";
import type { ActionResponse, CreateLifeRequest, HistoryPage, LifeListItem, LifeView, SaveView } from "@endemion/shared";

export type StoreKind = "cloud" | "local";

/**
 * Хранилище жизней. Интерфейс один для облака (API) и для браузера (localStorage):
 * экраны игры не знают, где лежит жизнь, и облако заменяет локальное сохранение без переделки интерфейса
 */
export interface GameStore {
  readonly kind: StoreKind;
  list(): Promise<LifeListItem[]>;
  create(input: CreateLifeRequest): Promise<LifeView>;
  get(id: string): Promise<LifeView>;
  /** actionId защищает от двойного применения при повторной отправке */
  act(id: string, expectedVersion: number, action: GameAction, actionId: string): Promise<ActionResponse>;
  history(id: string, before?: number, limit?: number): Promise<HistoryPage>;
  saves(id: string): Promise<SaveView[]>;
  restore(id: string, version: number, expectedVersion: number): Promise<ActionResponse>;
}

/** Жизни из браузера отличаются по id: так страница игры знает, какое хранилище открыть */
export const LOCAL_ID_PREFIX = "local-";
