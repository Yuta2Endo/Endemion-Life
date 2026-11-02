import type { GameAction, HistoryEntry } from "@endemion/game-core";
import type { ActionResponse, CreateLifeRequest, HistoryPage, LifeListItem, LifeView, SaveView } from "@endemion/shared";
import { apiFetch, ClientError, postJson } from "../api";
import type { GameStore } from "./types";

/** Облачные сохранения: сервер хранит жизнь, проверяет действия и сам бросает кости */
export const cloudStore: GameStore = {
  kind: "cloud",

  async list() {
    return (await apiFetch<{ lives: LifeListItem[] }>("/api/lives")).lives;
  },

  async create(input: CreateLifeRequest) {
    return (await postJson<{ life: LifeView; entries: HistoryEntry[] }>("/api/lives", input)).life;
  },

  async get(id) {
    return (await apiFetch<{ life: LifeView }>(`/api/lives/${encodeURIComponent(id)}`)).life;
  },

  async act(id, expectedVersion, action: GameAction, actionId) {
    const send = () => postJson<ActionResponse>(`/api/lives/${encodeURIComponent(id)}/actions`, { actionId, expectedVersion, action });
    try {
      return await send();
    } catch (error) {
      // Связь оборвалась: неизвестно, дошло ли действие. Повтор с тем же actionId безопасен — сервер не применит его дважды
      if (error instanceof ClientError && error.code === "NETWORK") return send();
      throw error;
    }
  },

  async history(id, before, limit = 50) {
    const query = new URLSearchParams({ limit: String(limit) });
    if (before !== undefined) query.set("before", String(before));
    return apiFetch<HistoryPage>(`/api/lives/${encodeURIComponent(id)}/history?${query}`);
  },

  async saves(id) {
    return (await apiFetch<{ saves: SaveView[] }>(`/api/lives/${encodeURIComponent(id)}/saves`)).saves;
  },

  async restore(id, version, expectedVersion) {
    return postJson<ActionResponse>(`/api/lives/${encodeURIComponent(id)}/restore`, { version, expectedVersion });
  }
};
