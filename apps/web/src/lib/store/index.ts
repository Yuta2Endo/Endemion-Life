"use client";

import { useEffect, useState } from "react";
import { cloudStore } from "./cloud";
import { localStore } from "./local";
import { LOCAL_ID_PREFIX, type GameStore, type StoreKind } from "./types";

export { LOCAL_ID_PREFIX, type GameStore, type StoreKind } from "./types";
export { cloudStore, localStore };

let detected: Promise<StoreKind> | null = null;

/** Облако, если API и база доступны. Иначе — сохранение в браузере */
export function detectStoreKind(): Promise<StoreKind> {
  detected ??= fetch("/api/health", { cache: "no-store" })
    .then((response): StoreKind => (response.ok ? "cloud" : "local"))
    .catch((): StoreKind => "local");
  return detected;
}

export function storeOf(kind: StoreKind): GameStore {
  return kind === "cloud" ? cloudStore : localStore;
}

export function storeForLife(id: string): GameStore {
  return id.startsWith(LOCAL_ID_PREFIX) ? localStore : cloudStore;
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
