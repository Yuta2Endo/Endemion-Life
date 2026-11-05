"use client";

import { getUniverse, type GameAction, type HistoryEntry, type InteractionId, type TradeSide } from "@endemion/game-core";
import type { LifeView, SaveView } from "@endemion/shared";
import { Button, Panel } from "@endemion/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClientError } from "@/lib/api";
import { ageLabel } from "@/lib/format";
import { movedTarget, storeForLife } from "@/lib/store";
import { newUuid } from "@/lib/uuid";
import { ChangeChips } from "../change-chips";
import { useI18n } from "../locale-provider";
import { CharacterSheet } from "./character-sheet";
import { Dossier } from "./dossier";
import { NowPanel } from "./now-panel";
import { EventCard, OutcomeCard } from "./event-card";
import { LifeSummary } from "./life-summary";
import { LocalLifeBanner } from "./local-life-banner";
import { SavesDialog } from "./saves-dialog";
import { Timeline } from "./timeline";

type Tab = "event" | "character" | "people" | "timeline";

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
  const router = useRouter();
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
  const [wide, setWide] = useState(false);
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
    const media = window.matchMedia("(min-width: 1024px)");
    const apply = () => setWide(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    // Stage 04: жизнь уже перенесена на сервер (в этой или другой вкладке) — открыть её там
    const moved = store.kind === "local" ? movedTarget(lifeId) : null;
    if (moved) {
      router.replace(`/play/${moved}`);
      return;
    }
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
  }, [fetchLife, apply, fail, store, lifeId, router]);

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
      setOutcome(
        action.type === "choose"
          ? (result.entries.find((entry) => entry.kind === "event") ?? null)
          : action.type === "interact"
            ? (result.entries.find((entry) => entry.kind === "people") ?? null)
            : null
      );
      if (result.life.pendingEvent || result.life.status === "dead") setTab("event");
    } catch (error) {
      if (error instanceof ClientError && error.code === "VERSION_CONFLICT") {
        pendingAction.current = null;
        setNotice(t("play.conflict"));
        await load();
      } else if (error instanceof ClientError && error.code === "MOVED") {
        // Перенесена в другой вкладке: ход в копии браузера дал бы вторую ветку жизни
        const moved = movedTarget(lifeId);
        if (moved) router.replace(`/play/${moved}`);
        else setNotice(errorText(error));
      } else {
        setNotice(errorText(error));
      }
    } finally {
      setBusy(false);
    }
  }

  /** Продолжить род: сервер создаёт жизнь наследника, страница переходит к ней. Повтор после обрыва связи — с тем же actionId */
  async function continueAs(heirId: string) {
    if (!life || busy) return;
    const key = JSON.stringify([life.version, "succeed", heirId]);
    if (pendingAction.current?.key !== key) pendingAction.current = { key, actionId: newUuid() };
    const { actionId } = pendingAction.current;
    setBusy(true);
    setNotice(null);
    try {
      const result = await store.succeed(life.id, life.version, heirId, actionId);
      pendingAction.current = null;
      router.push(`/play/${result.life.id}`);
    } catch (error) {
      if (error instanceof ClientError && (error.code === "VERSION_CONFLICT" || error.code === "LINEAGE_CONTINUED")) {
        pendingAction.current = null;
        setNotice(error.code === "VERSION_CONFLICT" ? t("play.conflict") : errorText(error));
        await load();
      } else {
        setNotice(errorText(error));
      }
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
    const key = JSON.stringify([life.version, "restore", version]);
    if (pendingAction.current?.key !== key) pendingAction.current = { key, actionId: newUuid() };
    const { actionId } = pendingAction.current;
    setBusy(true);
    try {
      await store.restore(lifeId, version, life.version, actionId);
      pendingAction.current = null;
      setSavesOpen(false);
      setOutcome(null);
      await load();
    } catch (error) {
      if (error instanceof ClientError && error.code === "VERSION_CONFLICT") pendingAction.current = null;
      setNotice(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-7xl px-4 py-24 text-center text-bone-500" aria-live="polite">
        {t("play.loading")}
      </main>
    );
  }
  if (status !== "ready" || !life) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
        <p className="text-bone-300" role="alert">
          {status === "missing" ? t("play.notFound") : t("error.generic")}
        </p>
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
    { id: "people", label: t("play.tabPeople") },
    { id: "timeline", label: t("play.tabTimeline") }
  ];
  const people = Object.fromEntries(life.profile.npcs.map((npc) => [npc.id, npc.name]));
  const interact = (npcId: string, interaction: InteractionId) => void perform({ type: "interact", npcId, interaction });
  const tradeGood = (goodId: string, side: TradeSide, qty: number) => void perform({ type: "trade", goodId, side, qty });
  const venture = (action: { adventureId?: string; choiceId?: string; abandon?: boolean }) => {
    if (action.abandon && !window.confirm(t("adventure.abandonConfirm"))) return;
    void perform({ type: "venture", adventureId: action.adventureId, choiceId: action.choiceId });
  };
  const shown = (id: Tab) => (tab === id ? "block" : "max-lg:hidden lg:block");

  return (
    <main
      className="mx-auto max-w-7xl px-3 pb-28 pt-6 sm:px-6 lg:pb-10"
      style={{ "--accent": universe.theme.accent, "--accent-glow": universe.theme.glow } as React.CSSProperties}
      data-testid="play-screen"
      data-version={life.version}
      aria-busy={busy}
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 opacity-70 blur-3xl" style={{ background: `radial-gradient(600px 200px at 50% 0%, ${universe.theme.glow}, transparent)` }} aria-hidden="true" />

      {store.kind === "local" && <LocalLifeBanner lifeId={lifeId} disabled={busy} />}
      <div className="relative mb-4" aria-live="polite">
        {notice && (
          <p className="rounded-md border border-blood-500/40 bg-blood-600/10 px-3 py-2 text-sm text-blood-300" role="alert" data-testid="notice">
            {notice}
          </p>
        )}
        {busy && !notice && <p className="text-xs text-bone-300">{t("play.working")}</p>}
      </div>

      {/* minmax(0,1fr) на телефоне: широкое древо прокручивается в своей рамке и не растягивает страницу */}
      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
        <aside className={shown("character")}>
          <CharacterSheet life={life} />
        </aside>

        <section className={`${shown("event")} space-y-5`}>
          {dead ? (
            <LifeSummary life={life} busy={busy} onSucceed={(heirId) => void continueAs(heirId)} />
          ) : event ? (
            <EventCard key={`${event.eventId}-${life.version}`} event={event} busy={busy} onChoose={(choiceId) => void perform({ type: "choose", choiceId })} />
          ) : outcome ? (
            <OutcomeCard entry={outcome} universeId={life.universeId} people={people} />
          ) : (
            <Panel data-testid="quiet-card">
              <p className="text-[11px] uppercase tracking-[0.3em] text-gold-400">{ageLabel(life.life.age, locale)}</p>
              <p className="mt-2 font-display text-2xl text-bone-100">{lastYear ? l(lastYear.text) : t("play.quiet")}</p>
              {lastYear && (
                <div className="mt-3">
                  <ChangeChips changes={lastYear.changes.filter((c) => c.kind !== "xp")} universeId={life.universeId} people={people} />
                </div>
              )}
            </Panel>
          )}

          <NowPanel life={life} />

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
              <p className="w-full text-xs text-bone-300">
                {event ? t("play.advanceBlockedEvent") : busy ? t("play.advanceBlockedBusy") : t("play.advanceHint")}
              </p>
            </Panel>
          )}

          <div className="hidden lg:block">
            {wide && <Dossier life={life} busy={busy} store={store} onInteract={interact} onTrade={tradeGood} onVenture={venture} />}
          </div>
        </section>

        {/* На телефоне досье — отдельная вкладка */}
        <section className={tab === "people" ? "block lg:hidden" : "max-lg:hidden"}>
          <Dossier life={life} busy={busy} store={store} onInteract={interact} onTrade={tradeGood} onVenture={venture} />
        </section>

        <aside className={shown("timeline")}>
          <Timeline entries={entries} universeId={life.universeId} people={people} canLoadMore={nextBefore !== null} loadingMore={loadingMore} onLoadMore={() => void loadMore()} />
        </aside>
      </div>

      {/* Вкладки для телефона: на большом экране все три колонки видны сразу */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-ink-950/95 backdrop-blur-md lg:hidden" aria-label={t("play.sections")}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={`relative min-h-12 truncate px-1 py-3.5 text-[11px] uppercase tracking-[0.14em] transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold-300 ${tab === item.id ? "text-gold-200" : "text-bone-300"}`}
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
