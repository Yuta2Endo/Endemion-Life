"use client";

import { getUniverse } from "@endemion/game-core";
import type { LifeListItem } from "@endemion/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Ornament } from "@endemion/ui";
import { ageLabel } from "@/lib/format";
import { cloudStore, detectStoreKind, localStore, LOCAL_ID_PREFIX } from "@/lib/store";
import { useI18n } from "./locale-provider";

/** Жизни игрока: из облака (если сервер доступен) и из этого браузера */
export function LivesList() {
  const { locale, t } = useI18n();
  const [lives, setLives] = useState<LifeListItem[] | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const kind = await detectStoreKind();
      const [cloud, local] = await Promise.all([kind === "cloud" ? cloudStore.list().catch(() => []) : [], localStore.list().catch(() => [])]);
      const all = [...cloud, ...local].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      if (active) setLives(all);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (lives === null || lives.length === 0) return null;

  const ordered = [...lives].sort((a, b) => Number(b.status === "alive") - Number(a.status === "alive") || b.updatedAt.localeCompare(a.updatedAt));
  const shown = more ? ordered : ordered.slice(0, 9);
  return (
    <section className="mt-12">
    <h2 className="font-display text-3xl text-bone-100">{t("home.continue")}</h2>
    <Ornament className="my-5 max-w-xs" />
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="lives-list">
      {shown.map((life) => {
        const universe = getUniverse(life.universeId);
        return (
          <li key={life.id}>
            <Link
              href={`/play/${life.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink-900/70 px-4 py-3 transition hover:border-gold-500/60 focus-visible:outline-2 focus-visible:outline-gold-300"
            >
              <span className="min-w-0">
                <span className="block truncate font-display text-lg text-bone-100">{life.name}</span>
                <span className="block truncate text-xs text-bone-500">
                  {universe.name[locale]} · {ageLabel(life.age, locale)}
                  {life.generation > 1 && ` · ${t("home.generation", { n: life.generation })}`}
                  {life.continued && ` · ${t("home.continued")}`}
                  {life.id.startsWith(LOCAL_ID_PREFIX) && <span className="text-gold-300" data-testid="life-local">{` · ${t("store.inBrowser")}`}</span>}
                </span>
              </span>
              <span className={`shrink-0 text-xs ${life.status === "alive" ? "text-jade-300" : "text-bone-500"}`}>{life.status === "alive" ? "●" : "✝"}</span>
            </Link>
          </li>
        );
      })}
    </ul>
    {!more && ordered.length > 9 && (
      <button type="button" className="mt-3 text-sm text-gold-200 underline decoration-gold-500/40" onClick={() => setMore(true)} data-testid="lives-more">
        {t("home.moreLives")}
      </button>
    )}
    </section>
  );
}
