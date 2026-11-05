"use client";

import { Button, Panel } from "@endemion/ui";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface LiveCard {
  id: string;
  status: "scheduled" | "active" | "completed";
  title: { ru: string; en: string };
  text: { ru: string; en: string };
  goal: number;
  gold: number;
  progress: number;
  endsAt: string;
}

interface Mine {
  windowId: string;
  lifeId: string;
  count: number;
  claimed: boolean;
}

interface LifeItem {
  id: string;
  name: string;
  alive: boolean;
}

/** Stage 15: доска окон. Счёт и награду считает сервер */
export function LiveBoard() {
  const { t, locale } = useI18n();
  const [windows, setWindows] = useState<LiveCard[]>([]);
  const [mine, setMine] = useState<Mine[]>([]);
  const [lives, setLives] = useState<LifeItem[]>([]);
  const [lifeId, setLifeId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const board = await apiFetch<{ windows: LiveCard[]; mine: Mine[] }>("/api/live");
      setWindows(board.windows);
      setMine(board.mine);
      const list = await apiFetch<{ lives: { id: string; name: string; status: string }[] }>("/api/lives");
      const alive = list.lives.filter((item) => item.status === "alive").map((item) => ({ id: item.id, name: item.name, alive: true }));
      setLives(alive);
      setLifeId((current) => current || alive[0]?.id || "");
    } catch (error) {
      setNotice(error instanceof ClientError ? error.message : t("error.generic"));
    } finally {
      setReady(true);
    }
  }, [t]);

  useEffect(() => {
    const handle = setTimeout(() => void load(), 0);
    return () => clearTimeout(handle);
  }, [load]);

  async function run(action: () => Promise<void>) {
    if (!lifeId) return;
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await load();
    } catch (error) {
      setNotice(error instanceof ClientError ? error.message : t("error.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (ready && windows.length === 0 && !notice) return null;
  return (
    <Panel>
      <h2 className="font-display text-2xl text-bone-100">{t("live.title")}</h2>
      <p className="mt-1 text-xs text-bone-500">{t("live.lead")}</p>
      {notice && (
        <p className="mt-3 text-sm text-blood-300" role="alert" data-testid="live-notice">
          {notice}
        </p>
      )}
      {windows.length === 0 && <p className="mt-3 text-xs text-bone-500">{t("live.empty")}</p>}
      {lives.length > 0 && (
        <label className="mt-3 block text-xs text-bone-400">
          <select className="mt-1 w-full bg-ink-900 px-2 py-1 text-bone-100" value={lifeId} onChange={(event) => setLifeId(event.target.value)} data-testid="live-life">
            {lives.map((life) => (
              <option key={life.id} value={life.id}>
                {life.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <ul className="mt-4 space-y-4" data-testid="live-board">
        {windows.map((item) => {
          const part = mine.find((row) => row.windowId === item.id && row.lifeId === lifeId);
          const when = new Date(item.endsAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-GB", { timeZoneName: "short" });
          return (
            <li key={item.id} className="border-t border-line/50 pt-3" data-testid="live-card">
              <p className="text-bone-100">{item.title[locale]}</p>
              <p className="mt-1 text-xs text-bone-400">{item.text[locale]}</p>
              <p className="mt-1 text-xs text-bone-500">
                {t(`live.status.${item.status}`)} · {t("live.progress", { n: item.progress, goal: item.goal })} · {t("live.until", { time: when })}
              </p>
              <div className="mt-2 flex gap-2">
                {item.status === "active" && (
                  <Button
                    disabled={busy || !lifeId}
                    data-testid="live-join"
                    onClick={() => void run(() => apiFetch(`/api/live/${item.id}/contribute`, { method: "POST", body: JSON.stringify({ lifeId }) }))}
                  >
                    {t("live.join")}
                  </Button>
                )}
                {part && part.count > 0 && !part.claimed && item.status !== "scheduled" && (
                  <Button
                    disabled={busy}
                    data-testid="live-claim"
                    onClick={() => void run(() => apiFetch(`/api/live/${item.id}/claim`, { method: "POST", body: JSON.stringify({ lifeId }) }))}
                  >
                    {t("live.claim")}
                  </Button>
                )}
                {part?.claimed && <span className="text-xs text-bone-500">{t("live.claimed")}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
