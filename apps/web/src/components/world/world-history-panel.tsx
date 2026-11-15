"use client";

import { Panel, Tag } from "@endemion/ui";
import { useEffect, useState } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface Season {
  season: number;
  checksum: string;
  durationMs: number;
  tickedAt: string;
  eventCount: number;
}

interface Event {
  id: string;
  season: number;
  kind: string;
  title: { ru: string; en: string };
  text: { ru: string; en: string };
  severity: number;
  createdAt: string;
}

const copy = {
  ru: {
    seasons: "Сезоны мира",
    all: "Все",
    events: "Хроника событий",
    empty: "Событий пока нет.",
    failed: "Не удалось загрузить историю мира.",
    retry: "Повторить",
    season: "Сезон {n}",
    eventsCount: "{n} событий",
    duration: "{n} мс"
  },
  en: {
    seasons: "World seasons",
    all: "All",
    events: "Event chronicle",
    empty: "No events yet.",
    failed: "Could not load world history.",
    retry: "Try again",
    season: "Season {n}",
    eventsCount: "{n} events",
    duration: "{n} ms"
  }
} as const;

export function WorldHistoryPanel({ universeId }: { universeId: string }) {
  const { locale } = useI18n();
  const c = copy[locale as "ru" | "en"];
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<{ seasons: Season[] }>(`/api/world/${encodeURIComponent(universeId)}/seasons?limit=12`),
      apiFetch<{ events: Event[] }>(`/api/world/${encodeURIComponent(universeId)}/events?limit=40`)
    ])
      .then(([seasonList, eventList]) => {
        if (!active) return;
        setSeasons(seasonList.seasons);
        setEvents(eventList.events);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ClientError && reason.code === "NETWORK" ? c.failed : c.failed);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [universeId, c.failed]);

  async function chooseSeason(season: number | null) {
    setSelected(season);
    setBusy(true);
    setError(null);
    try {
      const query = season === null ? "limit=40" : `limit=40&season=${season}`;
      setEvents((await apiFetch<{ events: Event[] }>(`/api/world/${encodeURIComponent(universeId)}/events?${query}`)).events);
    } catch {
      setError(c.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="mt-5" data-testid="world-history">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl text-bone-100">{c.seasons}</h3>
        <span className="text-xs text-bone-500">{c.events}</span>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          className={`min-h-10 shrink-0 rounded-sm border px-3 text-xs ${selected === null ? "border-gold-400 bg-gold-500/10 text-gold-100" : "border-line text-bone-300"}`}
          onClick={() => void chooseSeason(null)}
        >
          {c.all}
        </button>
        {seasons.map((item) => (
          <button
            key={item.season}
            type="button"
            className={`min-h-10 shrink-0 rounded-sm border px-3 text-left text-xs ${selected === item.season ? "border-gold-400 bg-gold-500/10 text-gold-100" : "border-line text-bone-300"}`}
            onClick={() => void chooseSeason(item.season)}
            data-testid={`world-season-${item.season}`}
          >
            <span className="block">{c.season.replace("{n}", String(item.season))}</span>
            <span className="block text-[10px] text-bone-500">{item.eventCount} · {Math.round(item.durationMs)} ms</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-3" role="alert">
          <p className="text-sm text-blood-300">{error}</p>
          <button type="button" className="mt-1 text-xs text-gold-300" onClick={() => void chooseSeason(selected)}>
            {c.retry}
          </button>
        </div>
      )}
      {busy && <p className="mt-3 text-sm text-bone-400" role="status">…</p>}
      {!busy && !error && events.length === 0 && <p className="mt-3 text-sm text-bone-400">{c.empty}</p>}
      <ul className="mt-3 space-y-2" data-testid="world-events">
        {events.slice(0, 20).map((event) => (
          <li key={event.id} className="rounded-sm border border-line px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone="gold">{c.season.replace("{n}", String(event.season))}</Tag>
              <span className="text-[11px] uppercase tracking-[0.16em] text-bone-500">{event.kind}</span>
            </div>
            <p className="mt-1 text-sm text-bone-100">{event.title[locale as "ru" | "en"]}</p>
            <p className="mt-1 text-xs leading-relaxed text-bone-400">{event.text[locale as "ru" | "en"]}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
