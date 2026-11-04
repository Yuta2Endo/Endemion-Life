import type { GameAction, HistoryEntry } from "@endemion/game-core";
import type { ActionResponse, CreateLifeRequest, HistoryPage, ImportResponse, LifeListItem, LifeView, LineageResponse, SaveView, SuccessionResponse } from "@endemion/shared";
import { apiFetch, ClientError, postJson } from "../api";
import type { ImportPayload } from "./local";
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
  },

  async succeed(id, expectedVersion, heirId, actionId) {
    const send = () => postJson<SuccessionResponse>(`/api/lives/${encodeURIComponent(id)}/succession`, { actionId, expectedVersion, heirId });
    try {
      return await send();
    } catch (error) {
      // Как и для действий: повтор с тем же actionId вернёт ту же новую жизнь, второй не появится
      if (error instanceof ClientError && error.code === "NETWORK") return send();
      throw error;
    }
  },

  async lineage(id) {
    return (await apiFetch<LineageResponse>(`/api/lives/${encodeURIComponent(id)}/lineage`)).lineage;
  }
};

/**
 * Stage 04: перенос жизни из браузера на сервер. Повтор с тем же importId безопасен: сервер вернёт ту же жизнь.
 * При обрыве связи — один повтор, как у действий; дальше ошибка уходит игроку, а запись в браузере не трогается
 */
export async function importToCloud(payload: ImportPayload): Promise<ImportResponse> {
  const send = () => postJson<ImportResponse>("/api/lives/import", payload);
  try {
    return await send();
  } catch (error) {
    if (error instanceof ClientError && error.code === "NETWORK") return send();
    throw error;
  }
}
