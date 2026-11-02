"use client";

import { getUniverse, type GameAction, type HistoryEntry } from "@endemion/game-core";
import type { LifeView, SaveView } from "@endemion/shared";
import { Button, Panel } from "@endemion/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClientError } from "@/lib/api";
import { ageLabel } from "@/lib/format";
import { storeForLife } from "@/lib/store";
import { newUuid } from "@/lib/uuid";
import { ChangeChips } from "../change-chips";
import { useI18n } from "../locale-provider";
import { CharacterSheet } from "./character-sheet";
import { EventCard, OutcomeCard } from "./event-card";
import { SavesDialog } from "./saves-dialog";
import { Timeline } from "./timeline";

type Tab = "event" | "character" | "timeline";

/** Новые записи сверху, без повторов: ответ на повтор действия может вернуть уже показанные записи */
function mergeEntries(added: HistoryEntry[], existing: HistoryEntry[]): HistoryEntry[] {
  const seen = new Set<number>();
  return [...[...added].reverse(), ...existing].filter((entry) => {
    if (seen.has(entry.seq)) return false;
    seen.add(entry.seq);
    return true;
  });
}

export function PlayScreen({ lifeId }: { lifeId: string }) {
  const { locale, l, t } = useI18n();
  const store = useMemo(() => storeForLife(lifeId), [lifeId]);
  const [life, setLife] = useState<LifeView | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<HistoryEntry | null>(null);
  const [tab, setTab] = useState<Tab>("event");
  const [savesOpen, setSavesOpen] = useState(false);
  const [saves, setSaves] = useState<SaveView[] | null>(null);
  // actionId неотправленного или оборвавшегося действия: повтор того же действия идёт с тем же id и не применится дважды
  const pendingAction = useRef<{ key: string; actionId: string } | null>(null);

  const fetchLife = useCallback(() => Promise.all([store.get(lifeId), store.history(lifeId)]), [store, lifeId]);

  const apply = useCallback(([view, page]: Awaited<ReturnType<typeof fetchLife>>) => {
    setLife(view);
    setEntries(page.entries);
    setNextBefore(page.nextBefore);
    setStatus("ready");
  }, []);

  const fail = useCallback((error: unknown) => {
    setStatus(error instanceof ClientError && (error.status === 404 || error.status === 401) ? "missing" : "error");
  }, []);

  /** Повторная загрузка: после конфликта версий, отката или ошибки */
  const load = useCallback(() => fetchLife().then(apply, fail), [fetchLife, apply, fail]);

  useEffect(() => {
    let active = true;
    fetchLife().then(
      (data) => {
        if (active) apply(data);
      },
      (error: unknown) => {
        if (active) fail(error);
      }
    );
    return () => {
      active = false;
    };
  }, [fetchLife, apply, fail]);

  function errorText(error: unknown): string {
    if (error instanceof ClientError && error.code === "NETWORK") return t("error.offline");
    if (error instanceof ClientError && error.status > 0 && error.status < 500) return error.message;
    return t("error.generic");
  }

  async function perform(action: GameAction) {
    if (!life || busy) return;
    const key = JSON.stringify([life.version, action]);
    if (pendingAction.current?.key !== key) pendingAction.current = { key, actionId: newUuid() };
    const { actionId } = pendingAction.current;
    setBusy(true);
    setNotice(null);
    try {
      const result = await store.act(life.id, life.version, action, actionId);
      pendingAction.current = null;
      setLife(result.life);
      setEntries((previous) => mergeEntries(result.entries, previous));
      setOutcome(action.type === "choose" ? (result.entries.find((entry) => entry.kind === "event") ?? null) : null);
      if (result.life.pendingEvent || result.life.status === "dead") setTab("event");
    } catch (error) {
      if (error instanceof ClientError && error.code === "VERSION_CONFLICT") {
        pendingAction.current = null;
        setNotice(t("play.conflict"));
        await load();
      } else {
        setNotice(errorText(error));
      }
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (nextBefore === null) return;
    setLoadingMore(true);
    try {
      const page = await store.history(lifeId, nextBefore);
      setEntries((previous) => [...previous, ...page.entries.filter((entry) => !previous.some((p) => p.seq === entry.seq))]);
      setNextBefore(page.nextBefore);
    } catch (error) {
      setNotice(errorText(error));
    } finally {
      setLoadingMore(false);
    }
  }

  async function openSaves() {
    setSavesOpen(true);
    setSaves(null);
    try {
      setSaves(await store.saves(lifeId));
    } catch (error) {
      setSavesOpen(false);
      setNotice(errorText(error));
    }
  }

  async function restore(version: number, age: number) {
    if (!life || !window.confirm(t("play.restoreConfirm", { age: ageLabel(age, locale) }))) return;
    setBusy(true);
    try {
      await store.restore(lifeId, version, life.version);
      setSavesOpen(false);
      setOutcome(null);
      await load();
    } catch (error) {
      setNotice(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return <main className="mx-auto max-w-7xl px-4 py-24 text-center text-bone-500">{t("play.loading")}</main>;
  }
  if (status !== "ready" || !life) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
        <p className="text-bone-300">{status === "missing" ? t("play.notFound") : t("error.generic")}</p>
        <div className="mt-6 flex gap-3">
          {status === "error" && <Button onClick={() => void load()}>{t("play.retry")}</Button>}
          <Link href="/" className="rounded-md border border-line px-4 py-2 text-sm text-bone-100 hover:border-gold-500/60">
            {t("error.toHome")}
          </Link>
        </div>
      </main>
    );
  }

  const universe = getUniverse(life.universeId);
  const dead = life.status === "dead";
  const event = life.pendingEvent;
  const lastYear = entries.find((entry) => entry.kind === "year");
  const canAdvance = !dead && !event && !busy;
  const tabs: { id: Tab; label: string }[] = [
    { id: "event", label: t("play.tabEvent") },
    { id: "character", label: t("play.tabCharacter") },
    { id: "timeline", label: t("play.tabTimeline") }
  ];
  const shown = (id: Tab) => (tab === id ? "block" : "hidden lg:block");

  return (
    <main
      className="mx-auto max-w-7xl px-3 pb-28 pt-6 sm:px-6 lg:pb-10"
      style={{ "--accent": universe.theme.accent, "--accent-glow": universe.theme.glow } as React.CSSProperties}
      data-testid="play-screen"
      data-version={life.version}
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 opacity-70 blur-3xl" style={{ background: `radial-gradient(600px 200px at 50% 0%, ${universe.theme.glow}, transparent)` }} aria-hidden="true" />

      {store.kind === "local" && <p className="relative mb-4 rounded-md border border-gold-500/30 bg-gold-500/5 px-3 py-2 text-xs text-gold-200">{t("store.localHint")}</p>}
      {notice && (
        <p className="relative mb-4 rounded-md border border-blood-500/40 bg-blood-600/10 px-3 py-2 text-sm text-blood-300" role="alert" data-testid="notice">
          {notice}
        </p>
      )}

      <div className="relative grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
        <aside className={shown("character")}>
          <CharacterSheet life={life} />
        </aside>

        <section className={`${shown("event")} space-y-5`}>
          {dead ? (
            <Panel accent className="animate-rise text-center" data-testid="death-card">
              <p className="text-4xl text-blood-400" aria-hidden="true">
                ✝
              </p>
              <h2 className="mt-3 font-display text-4xl text-gilded">{t("play.deathTitle")}</h2>
              {life.life.deathCause && <p className="mt-3 text-bone-300">{l(life.life.deathCause)}</p>}
              <p className="mt-1 text-bone-300">{t("play.deathLived", { name: life.character.name, age: ageLabel(life.life.age, locale) })}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href={`/create/${life.universeId}`} className="rounded-md border border-gold-400/70 bg-gold-500/15 px-5 py-2.5 text-gold-100 transition hover:border-gold-300">
                  {t("play.newLifeSame")}
                </Link>
                <Link href="/worlds" className="rounded-md border border-line px-5 py-2.5 text-bone-100 transition hover:border-gold-500/60">
                  {t("play.otherWorld")}
                </Link>
              </div>
            </Panel>
          ) : event ? (
            <EventCard key={`${event.eventId}-${life.version}`} event={event} busy={busy} onChoose={(choiceId) => void perform({ type: "choose", choiceId })} />
          ) : outcome ? (
            <OutcomeCard entry={outcome} universeId={life.universeId} />
          ) : (
            <Panel data-testid="quiet-card">
              <p className="text-[11px] uppercase tracking-[0.3em] text-gold-400">{ageLabel(life.life.age, locale)}</p>
              <p className="mt-2 font-display text-2xl text-bone-100">{lastYear ? l(lastYear.text) : t("play.quiet")}</p>
              {lastYear && (
                <div className="mt-3">
                  <ChangeChips changes={lastYear.changes.filter((c) => c.kind !== "xp")} universeId={life.universeId} />
                </div>
              )}
            </Panel>
          )}

          {!dead && (
            <Panel className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => void perform({ type: "advance" })} disabled={!canAdvance} data-testid="advance-1">
                  {t("play.advance1")}
                </Button>
                <Button onClick={() => void perform({ type: "advance", years: 5 })} disabled={!canAdvance} data-testid="advance-5">
                  {t("play.advance5")}
                </Button>
                <Button onClick={() => void perform({ type: "advance", years: 10 })} disabled={!canAdvance} data-testid="advance-10">
                  {t("play.advance10")}
                </Button>
              </div>
              <Button variant="quiet" onClick={() => void openSaves()} disabled={busy} data-testid="saves-button">
                {t("play.saves")}
              </Button>
              <p className="w-full text-xs text-bone-500">{t("play.advanceHint")}</p>
            </Panel>
          )}
        </section>

        <aside className={shown("timeline")}>
          <Timeline entries={entries} universeId={life.universeId} canLoadMore={nextBefore !== null} loadingMore={loadingMore} onLoadMore={() => void loadMore()} />
        </aside>
      </div>

      {/* Вкладки для телефона: на большом экране все три колонки видны сразу */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-ink-950/95 backdrop-blur-md lg:hidden" aria-label="Sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={`relative py-3.5 text-xs uppercase tracking-[0.18em] transition ${tab === item.id ? "text-gold-200" : "text-bone-500"}`}
            data-testid={`tab-${item.id}`}
          >
            {item.label}
            {item.id === "event" && event && tab !== "event" && <span className="absolute right-1/4 top-3 h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />}
            {tab === item.id && <span className="absolute inset-x-6 top-0 h-px bg-gold-400" aria-hidden="true" />}
          </button>
        ))}
      </nav>

      <SavesDialog open={savesOpen} saves={saves} currentVersion={life.version} busy={busy} onRestore={(version, age) => void restore(version, age)} onClose={() => setSavesOpen(false)} />
    </main>
  );
}
