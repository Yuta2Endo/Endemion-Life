"use client";

import { useEffect, useState } from "react";
import { cloudStore, importToCloud } from "./cloud";
import { importPayload, localStore, markMoved, movedTarget } from "./local";
import { LOCAL_ID_PREFIX, type GameStore, type StoreKind } from "./types";

export { LOCAL_ID_PREFIX, type GameStore, type StoreKind } from "./types";
export { cloudStore, localStore, movedTarget };

/** Удачная проверка запоминается на страницу. Неудачная — нет: кратковременный сбой не должен навсегда уводить жизни в браузер */
let detected: Promise<StoreKind> | null = null;

function probe(): Promise<StoreKind> {
  return fetch("/api/health", { cache: "no-store" })
    .then((response): StoreKind => (response.ok ? "cloud" : "local"))
    .catch((): StoreKind => "local");
}

/** Облако, если API и база доступны. Иначе — сохранение в браузере */
export function detectStoreKind(): Promise<StoreKind> {
  detected ??= probe().then((kind) => {
    if (kind === "local") detected = null;
    return kind;
  });
  return detected;
}

/**
 * Где создать новую жизнь. Если связи нет, проверка повторяется ещё раз перед тем, как согласиться на браузер:
 * случайный сбой не должен превращать жизнь в локальную
 */
export async function storeForNewLife(): Promise<GameStore> {
  const kind = (await detectStoreKind()) === "cloud" ? "cloud" : await detectStoreKind();
  return storeOf(kind);
}

export function storeOf(kind: StoreKind): GameStore {
  return kind === "cloud" ? cloudStore : localStore;
}

export function storeForLife(id: string): GameStore {
  return id.startsWith(LOCAL_ID_PREFIX) ? localStore : cloudStore;
}

/**
 * Stage 04: перенести жизнь из браузера на сервер. Запись в браузере помечается перенесённой только после ответа сервера;
 * при ошибке она остаётся как была, повтор пойдёт с тем же ключом. Возвращает id жизни на сервере
 */
export async function moveToCloud(localId: string): Promise<{ id: string; adjusted: number }> {
  const result = await importToCloud(importPayload(localId));
  markMoved(localId, result.life.id);
  return { id: result.life.id, adjusted: result.adjustments?.length ?? 0 };
}

/** Где будут храниться новые жизни. "checking" — проверка связи ещё идёт */
export function useStoreKind(): StoreKind | "checking" {
  const [kind, setKind] = useState<StoreKind | "checking">("checking");
  useEffect(() => {
    let active = true;
    void detectStoreKind().then((value) => {
      if (active) setKind(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return kind;
}
