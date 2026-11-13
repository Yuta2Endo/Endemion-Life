"use client";

import { SETTLEMENT_KIND_NAMES, type Locale, type LocalizedText, type SharedWorldEventKind, type SharedWorldState, type UniverseId } from "@endemion/game-core";
import { Button, Meter, Panel, Tag } from "@endemion/ui";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import type { MessageKey } from "@/lib/messages";
import { useI18n } from "../locale-provider";
import { WorldParticipation } from "./world-participation";

/** Сводка GET /api/world. Веб описывает только поля, которые рисует: контракт API живёт в apps/api. */
export interface SharedWorldSummary {
  universeId: UniverseId;
  name: LocalizedText;
  version: number;
  season: number;
  checksum: string;
  settlements: number;
  factions: number;
  events: number;
  updatedAt: string;
}

interface SharedWorldCurrent {
  world: SharedWorldState;
  checksum: string;
  updatedAt: string;
}

const NUMBER_FORMAT: Readonly<Record<Locale, Intl.NumberFormat>> = {
  ru: new Intl.NumberFormat("ru-RU"),
  en: new Intl.NumberFormat("en-GB")
};

const PRICE_FORMAT: Readonly<Record<Locale, Intl.NumberFormat>> = {
  ru: new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }),
  en: new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 })
};

const DATE_FORMAT: Readonly<Record<Locale, Intl.DateTimeFormat>> = {
  ru: new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }),
  en: new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" })
};

const EVENT_KIND_KEY: Readonly<Record<SharedWorldEventKind, MessageKey>> = {
  trade: "world.shared.kind.trade",
  politics: "world.shared.kind.politics",
  crisis: "world.shared.kind.crisis",
  discovery: "world.shared.kind.discovery",
  festival: "world.shared.kind.festival",
  unrest: "world.shared.kind.unrest",
  admin: "world.shared.kind.admin"
};

function formatDate(value: string, locale: Locale): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT[locale].format(date);
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function toneFor(value: number): "good" | "bad" | "neutral" {
  return value > 0 ? "good" : value < 0 ? "bad" : "neutral";
}

function Section({ title, count, testId, children }: { title: string; count: number; testId: string; children: ReactNode }) {
  return (
    <section className="mt-6 min-w-0" data-testid={testId}>
      <h4 className="flex items-baseline gap-2 font-display text-lg text-bone-100">
        {title}
        <span className="text-xs font-normal tabular-nums text-bone-500">{count}</span>
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export interface SharedWorldViewProps {
  name: LocalizedText;
  world: SharedWorldState;
  checksum: string;
  updatedAt: string;
}

/**
 * Чистое представление общего мира: без запросов и таймеров.
 * Панель подставляет сюда ответ API, тесты — фикстуру.
 */
export function SharedWorldView({ name, world, checksum, updatedAt }: SharedWorldViewProps) {
  const { t, locale } = useI18n();
  const settlementName = (id: string | undefined): string | undefined =>
    id ? world.settlements.find((settlement) => settlement.id === id)?.name[locale] : undefined;
  const factionName = (id: string | null | undefined): string | undefined =>
    id ? world.factions.find((faction) => faction.id === id)?.name[locale] : undefined;

  return (
    <div className="min-w-0" data-testid="shared-world-detail">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words font-display text-xl text-bone-100">{name[locale]}</h3>
          <p className="mt-1 text-xs text-bone-400">
            {t("world.shared.updatedLabel")}{" "}
            <time dateTime={updatedAt}>{formatDate(updatedAt, locale)}</time>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="gold">{t("world.shared.season", { n: world.season })}</Tag>
          <span className="break-all text-[11px] text-bone-500" title={checksum}>
            {t("world.shared.checksum", { hash: checksum.slice(0, 10) })}
          </span>
        </div>
      </header>

      <Section title={t("world.settlements")} count={world.settlements.length} testId="shared-world-settlements">
        {world.settlements.length === 0 ? (
          <p className="text-sm text-bone-400">{t("world.shared.noSettlements")}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {world.settlements.map((settlement) => {
              const dominant = factionName(settlement.dominantFactionId);
              return (
                <li key={settlement.id} className="min-w-0 rounded-lg border border-line bg-ink-950/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h5 className="min-w-0 break-words font-display text-lg text-bone-100">{settlement.name[locale]}</h5>
                    <Tag>{SETTLEMENT_KIND_NAMES[settlement.kind]?.[locale] ?? settlement.kind}</Tag>
                  </div>
                  <p className="mt-1 text-xs text-bone-400">
                    {t("world.shared.population", { n: NUMBER_FORMAT[locale].format(settlement.population) })}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Meter label={t("world.shared.prosperity")} value={settlement.prosperity} max={100} tone="jade" caption={`${settlement.prosperity} / 100`} />
                    <Meter label={t("world.shared.stability")} value={settlement.stability} max={100} tone="azure" caption={`${settlement.stability} / 100`} />
                  </div>
                  {settlement.dominantFactionId === null ? (
                    <p className="mt-2 text-xs text-bone-500">{t("world.shared.noDominant")}</p>
                  ) : dominant ? (
                    <p className="mt-2 break-words text-xs text-bone-400">{t("world.shared.dominant", { name: dominant })}</p>
                  ) : null}

                  {settlement.goods.length > 0 && (
                    <div className="mt-3 border-t border-line/50 pt-2">
                      <h6 className="text-[11px] uppercase tracking-[0.16em] text-gold-300">{t("world.shared.goods")}</h6>
                      <ul className="mt-2 space-y-2">
                        {settlement.goods.map((good) => (
                          <li key={good.id} className="min-w-0 text-xs">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                              <span className="min-w-0 break-words text-bone-200" title={good.description[locale]}>
                                {good.name[locale]}
                              </span>
                              <span className="flex shrink-0 flex-wrap items-baseline gap-x-1 text-bone-400">
                                <span>{t("world.shared.buy", { n: PRICE_FORMAT[locale].format(good.buy) })}</span>
                                <span aria-hidden="true" className="text-bone-500">·</span>
                                <span>{t("world.shared.sell", { n: PRICE_FORMAT[locale].format(good.sell) })}</span>
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span
                                className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-950 ring-1 ring-line"
                                role="meter"
                                aria-label={t("world.shared.supplyLabel", { name: good.name[locale] })}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={good.supply}
                              >
                                <span
                                  className="block h-full rounded-full bg-gold-500/70"
                                  style={{ width: `${Math.max(0, Math.min(100, good.supply))}%` }}
                                />
                              </span>
                              <span className="shrink-0 text-[11px] tabular-nums text-bone-500">{good.supply}/100</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={t("world.shared.factions")} count={world.factions.length} testId="shared-world-factions">
        {world.factions.length === 0 ? (
          <p className="text-sm text-bone-400">{t("world.shared.noFactions")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {world.factions.map((faction) => (
              <li key={faction.id} className="min-w-0 rounded-lg border border-line bg-ink-950/40 p-4">
                <h5 className="break-words font-display text-lg text-bone-100">{faction.name[locale]}</h5>
                <div className="mt-2">
                  <Meter label={t("world.shared.power")} value={faction.power} max={100} tone="gold" caption={`${faction.power} / 100`} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="min-w-0">
                    <dt className="text-bone-500">{t("world.shared.influence")}</dt>
                    <dd className="mt-1">
                      <Tag tone={toneFor(faction.influence)}>{signed(faction.influence)}</Tag>
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-bone-500">{t("world.shared.standing")}</dt>
                    <dd className="mt-1">
                      <Tag tone={toneFor(faction.standing)}>{signed(faction.standing)}</Tag>
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("world.shared.events")} count={world.events.length} testId="shared-world-events">
        {world.events.length === 0 ? (
          <p className="text-sm text-bone-400">{t("world.shared.noEvents")}</p>
        ) : (
          <ul className="space-y-3">
            {world.events.slice(0, 8).map((event) => {
              const settlement = settlementName(event.settlementId);
              const faction = factionName(event.factionId);
              return (
                <li key={event.id} className="min-w-0 rounded-lg border border-line bg-ink-950/40 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone="gold">{t("world.shared.season", { n: event.season })}</Tag>
                    <Tag>{t(EVENT_KIND_KEY[event.kind] ?? "world.shared.kind.other")}</Tag>
                    <Tag tone={event.severity >= 4 ? "bad" : event.severity >= 3 ? "gold" : "neutral"}>
                      {t("world.shared.severity", { n: event.severity })}
                    </Tag>
                  </div>
                  <p className="mt-2 break-words font-display text-lg text-bone-100">{event.title[locale]}</p>
                  <p className="mt-1 break-words text-sm text-bone-300">{event.text[locale]}</p>
                  {(settlement || faction) && (
                    <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-bone-500">
                      {settlement && <span>{t("world.shared.targetSettlement", { name: settlement })}</span>}
                      {settlement && faction && <span aria-hidden="true">·</span>}
                      {faction && <span>{t("world.shared.targetFaction", { name: faction })}</span>}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

/**
 * Stage 04: общий мир сервера на странице /worlds.
 * Список и детали запрашиваются раздельно: выбор мира не перерисовывает статичные карточки.
 */
export function SharedWorldPanel() {
  const { t, locale } = useI18n();
  const [worlds, setWorlds] = useState<SharedWorldSummary[] | null>(null);
  const [selected, setSelected] = useState<UniverseId | null>(null);
  const [detail, setDetail] = useState<SharedWorldCurrent | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [listBusy, setListBusy] = useState(true);
  const [detailAttempt, setDetailAttempt] = useState(0);

  const loadList = useCallback(async () => {
    setListBusy(true);
    setListError(null);
    try {
      const data = await apiFetch<{ worlds: SharedWorldSummary[] }>("/api/world");
      setWorlds(data.worlds);
      setDetail(null);
      setDetailError(null);
      // dark-fantasy — первый мир каталога; порядок ответа API не должен менять выбор по умолчанию
      const initial =
        data.worlds.find((world) => world.universeId === "dark-fantasy")?.universeId ?? data.worlds[0]?.universeId ?? null;
      setSelected((current) => (current && data.worlds.some((world) => world.universeId === current) ? current : initial));
      setDetailAttempt((attempt) => attempt + 1);
    } catch (error) {
      setWorlds(null);
      setSelected(null);
      setDetail(null);
      setListError(error instanceof ClientError && error.code === "NETWORK" ? t("error.offline") : t("world.shared.loadFailed"));
    } finally {
      setListBusy(false);
    }
  }, [t]);

  useEffect(() => {
    const handle = setTimeout(() => void loadList(), 0);
    return () => clearTimeout(handle);
  }, [loadList]);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    const controller = new AbortController();
    void apiFetch<SharedWorldCurrent>(`/api/world/${encodeURIComponent(selected)}`, { signal: controller.signal })
      .then((data) => {
        if (alive) setDetail(data);
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setDetail(null);
        setDetailError(error instanceof ClientError && error.code === "NETWORK" ? t("error.offline") : t("world.shared.detailFailed"));
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [selected, detailAttempt, t]);

  const activeSummary = worlds?.find((world) => world.universeId === selected) ?? null;
  const activeWorld = detail && detail.world.universeId === selected ? detail : null;

  const refreshDetail = useCallback(() => {
    setDetailAttempt((attempt) => attempt + 1);
  }, []);

  return (
    <Panel as="section" accent aria-labelledby="shared-world-title" className="mt-10 scroll-mt-20" data-testid="shared-world-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="shared-world-title" className="font-display text-2xl text-bone-100">
            {t("world.shared.title")}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-bone-400">{t("world.shared.lead")}</p>
        </div>
        <Tag tone="gold">{t("world.shared.server")}</Tag>
      </div>

      {listError && (
        <div className="mt-4" role="alert" data-testid="shared-world-error">
          <p className="text-sm text-blood-300">{listError}</p>
          <Button className="mt-2 min-h-11" disabled={listBusy} onClick={() => void loadList()} data-testid="shared-world-retry">
            {t("world.shared.retry")}
          </Button>
        </div>
      )}

      {!listError && worlds === null && (
        <p className="mt-4 text-sm text-bone-400" role="status" data-testid="shared-world-loading">
          {t("world.shared.loading")}
        </p>
      )}

      {worlds && worlds.length === 0 && (
        <div className="mt-4" data-testid="shared-world-empty">
          <p className="text-sm text-bone-400">{t("world.shared.empty")}</p>
          <Button className="mt-2 min-h-11" disabled={listBusy} onClick={() => void loadList()}>
            {t("world.shared.retry")}
          </Button>
        </div>
      )}

      {worlds && worlds.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={t("world.shared.select")}>
            {worlds.map((world) => {
              const active = world.universeId === selected;
              return (
                <button
                  key={world.universeId}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (active) return;
                    setSelected(world.universeId);
                    setDetail(null);
                    setDetailError(null);
                  }}
                  className={[
                    "flex min-h-11 min-w-0 flex-col justify-center rounded-md border px-3 py-2 text-left transition",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300",
                    active
                      ? "border-gold-400/70 bg-gold-400/15 text-gold-100"
                      : "border-line bg-ink-950/40 text-bone-200 hover:border-gold-500/50"
                  ].join(" ")}
                  data-testid={`shared-world-select-${world.universeId}`}
                >
                  <span className="break-words text-sm leading-tight">{world.name[locale]}</span>
                  <span className="mt-0.5 text-[11px] tabular-nums text-bone-500">{t("world.shared.season", { n: world.season })}</span>
                </button>
              );
            })}
          </div>

          {activeWorld && selected && (
            <WorldParticipation
              key={selected}
              universeId={selected}
              season={activeWorld.world.season}
              world={activeWorld.world}
              onWorldChanged={refreshDetail}
            />
          )}

          <div className="mt-5" aria-busy={!activeWorld && !detailError}>
            {detailError && (
              <div role="alert" data-testid="shared-world-detail-error">
                <p className="text-sm text-blood-300">{detailError}</p>
                <Button
                  className="mt-2 min-h-11"
                  onClick={() => {
                    setDetailError(null);
                    setDetailAttempt((attempt) => attempt + 1);
                  }}
                  data-testid="shared-world-detail-retry"
                >
                  {t("world.shared.retry")}
                </Button>
              </div>
            )}

            {!detailError && !activeWorld && (
              <p className="text-sm text-bone-400" role="status" data-testid="shared-world-detail-loading">
                {t("world.shared.loading")}
              </p>
            )}

            {!detailError && activeWorld && activeSummary && (
              <SharedWorldView
                name={activeSummary.name}
                world={activeWorld.world}
                checksum={activeWorld.checksum}
                updatedAt={activeWorld.updatedAt}
              />
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
