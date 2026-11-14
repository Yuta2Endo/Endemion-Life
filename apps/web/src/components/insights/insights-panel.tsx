"use client";

import { Button, Panel } from "@endemion/ui";
import { useState } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface Note {
  name: string;
  sample: number;
  rate: number;
  kind: "hard" | "quiet" | "thin";
}

interface Summary {
  days: number;
  keptDays: number;
  total: number;
  byName: { name: string; count: number }[];
  byWorld: { world: string; count: number }[];
  notes: Note[];
  thin: boolean;
}

interface Funnel {
  days: number;
  keptDays: number;
  generatedAt: string;
  lives: { created: number; players: number; adults: number; decisions: number; deaths: number; successors: number };
  rates: { adult: number; decision: number; death: number; successor: number };
  guide: Record<string, number>;
  byWorld: { world: string; created: number }[];
}

/** Stage 16: сводка фактов. Токен не сохраняется. Пустой ответ не дорисовывается */
export function InsightsPanel() {
  const { t } = useI18n();
  const [token, setToken] = useState("");
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const guideLabel = (event: string): string => {
    if (event === "view") return t("insights.guide.view");
    if (event === "advance") return t("insights.guide.advance");
    if (event === "event") return t("insights.guide.event");
    if (event === "dossier") return t("insights.guide.dossier");
    if (event === "dismiss") return t("insights.guide.dismiss");
    return event;
  };

  async function load() {
    setBusy(true);
    setNotice(null);
    try {
      const headers = { "x-live-ops": token };
      const [nextSummary, nextFunnel] = await Promise.all([
        apiFetch<Summary>(`/api/insights?days=${days}`, { headers }),
        apiFetch<Funnel>(`/api/insights/funnel?days=${days}`, { headers })
      ]);
      setSummary(nextSummary);
      setFunnel(nextFunnel);
    } catch (error) {
      setSummary(null);
      setFunnel(null);
      setNotice(error instanceof ClientError ? error.message : t("error.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <h2 className="font-display text-2xl text-bone-100">{t("insights.title")}</h2>
      <p className="mt-1 text-xs text-bone-500">{t("insights.lead")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="password"
          autoComplete="off"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder={t("insights.token")}
          className="min-w-40 flex-1 bg-ink-900 px-2 py-1 text-sm text-bone-100"
          data-testid="insights-token"
        />
        <select className="bg-ink-900 px-2 py-1 text-sm text-bone-100" value={days} onChange={(event) => setDays(Number(event.target.value))} data-testid="insights-days">
          <option value={7}>7</option>
          <option value={30}>30</option>
          <option value={90}>90</option>
        </select>
        <Button disabled={busy || token.length < 16} onClick={() => void load()} data-testid="insights-open">
          {t("insights.open")}
        </Button>
      </div>
      {notice && (
        <p className="mt-3 text-sm text-blood-300" role="alert" data-testid="insights-notice">
          {notice}
        </p>
      )}
      {summary && summary.total === 0 && <p className="mt-3 text-xs text-bone-500">{t("insights.empty")}</p>}
      {summary && summary.total > 0 && (
        <div className="mt-4 space-y-2 text-sm text-bone-200" data-testid="insights-summary">
          <p>
            {t("insights.total", { n: summary.total })} · {summary.days} · {t("insights.kept", { n: summary.keptDays })}
          </p>
          {summary.thin && <p className="text-xs text-bone-500">{t("insights.thin")}</p>}
          <ul>
            {summary.byName.map((row) => (
              <li key={row.name}>
                {row.name}: {row.count}
              </li>
            ))}
          </ul>
          <ul className="text-xs text-bone-400">
            {summary.byWorld.map((row) => (
              <li key={row.world}>
                {row.world}: {row.count}
              </li>
            ))}
          </ul>
          {summary.notes
            .filter((note) => note.kind !== "thin")
            .map((note) => (
              <p key={note.name} className="text-xs text-bone-400">
                {note.kind === "hard"
                  ? t("insights.hard", { name: note.name, rate: Math.round(note.rate * 100), n: note.sample })
                  : t("insights.quiet", { name: note.name, n: note.sample })}
              </p>
            ))}
        </div>
      )}
      {funnel && (
        <div className="mt-5 border-t border-line pt-4 text-sm text-bone-200" data-testid="insights-funnel">
          <p className="font-medium text-bone-100">{t("insights.funnelTitle")}</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div><dt className="text-bone-500">{t("insights.funnelCreated")}</dt><dd>{funnel.lives.created}</dd></div>
            <div><dt className="text-bone-500">{t("insights.funnelAdult")}</dt><dd>{funnel.lives.adults} · {Math.round(funnel.rates.adult * 100)}%</dd></div>
            <div><dt className="text-bone-500">{t("insights.funnelDecision")}</dt><dd>{funnel.lives.decisions} · {Math.round(funnel.rates.decision * 100)}%</dd></div>
            <div><dt className="text-bone-500">{t("insights.funnelDeath")}</dt><dd>{funnel.lives.deaths} · {Math.round(funnel.rates.death * 100)}%</dd></div>
            <div><dt className="text-bone-500">{t("insights.funnelSuccessor")}</dt><dd>{funnel.lives.successors} · {Math.round(funnel.rates.successor * 100)}%</dd></div>
            <div><dt className="text-bone-500">{t("insights.funnelPlayers")}</dt><dd>{funnel.lives.players}</dd></div>
          </dl>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-bone-400">
            {Object.entries(funnel.guide).map(([event, count]) => (
              <li key={event}>{guideLabel(event)}: {count}</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
