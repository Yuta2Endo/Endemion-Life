"use client";

import { Button, Panel } from "@endemion/ui";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface SocialPlayer {
  id: string;
  name: string;
}

interface Tie {
  id: string;
  status: "pending" | "accepted" | "blocked";
  askedBy: string;
  player: SocialPlayer;
}

interface Board {
  friends: Tie[];
  incoming: Tie[];
  outgoing: Tie[];
  blocked: Tie[];
}

/** Stage 07: связи игроков. Имена и запросы считает сервер, здесь только кнопки */
export function SocialPanel() {
  const { t } = useI18n();
  const [board, setBoard] = useState<Board | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<SocialPlayer[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setBoard(await apiFetch<Board>("/api/social"));
    } catch (error) {
      setNotice(error instanceof ClientError ? error.message : t("error.generic"));
    }
  }, [t]);

  useEffect(() => {
    // Загрузка после отрисовки: setState прямо в эффекте даёт лишний проход
    const handle = setTimeout(() => void load(), 0);
    return () => clearTimeout(handle);
  }, [load]);

  async function run(action: () => Promise<void>) {
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

  async function search() {
    const name = query.trim();
    if (name.length < 3) return;
    await run(async () => {
      const res = await apiFetch<{ players: SocialPlayer[] }>(`/api/social/players?name=${encodeURIComponent(name)}`);
      setFound(res.players);
      if (res.players.length === 0) setNotice(t("social.nobody"));
    });
  }

  return (
    <div className="space-y-5" data-testid="social">
      {notice && (
        <p className="rounded-md border border-blood-500/40 bg-blood-600/10 px-3 py-2 text-sm text-blood-300" role="alert" data-testid="social-notice">
          {notice}
        </p>
      )}

      <Panel>
        <h2 className="font-display text-2xl text-bone-100">{t("social.find")}</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("social.name")}
            className="w-full rounded-md border border-line bg-ink-950 px-3 py-2 text-sm text-bone-100"
            data-testid="social-search"
          />
          <Button onClick={() => void search()} disabled={busy} data-testid="social-search-go">
            {t("social.search")}
          </Button>
        </div>
        <ul className="mt-3 space-y-2">
          {found.map((player) => (
            <li key={player.id} className="flex items-center justify-between gap-2" data-testid="social-found">
              <span className="text-sm text-bone-100">{player.name}</span>
              <Button onClick={() => void run(() => apiFetch("/api/social/requests", { method: "POST", body: JSON.stringify({ playerId: player.id }) }))} disabled={busy}>
                {t("social.add")}
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl text-bone-100">{t("social.incoming")}</h2>
        {board && board.incoming.length === 0 && <p className="mt-2 text-xs text-bone-500">{t("social.empty")}</p>}
        <ul className="mt-3 space-y-2" data-testid="social-incoming">
          {board?.incoming.map((tie) => (
            <li key={tie.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-bone-100">{tie.player.name}</span>
              <span className="flex gap-2">
                <Button onClick={() => void run(() => apiFetch(`/api/social/requests/${tie.id}/accept`, { method: "POST", body: "{}" }))} disabled={busy} data-testid="social-accept">
                  {t("social.accept")}
                </Button>
                <Button variant="quiet" onClick={() => void run(() => apiFetch(`/api/social/ties/${tie.id}`, { method: "DELETE", body: "{}" }))} disabled={busy}>
                  {t("social.decline")}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h2 className="font-display text-2xl text-bone-100">{t("social.friends")}</h2>
        {board && board.friends.length === 0 && <p className="mt-2 text-xs text-bone-500">{t("social.empty")}</p>}
        <ul className="mt-3 space-y-2" data-testid="social-friends">
          {board?.friends.map((tie) => (
            <li key={tie.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-bone-100">{tie.player.name}</span>
              <span className="flex gap-2">
                <Button variant="quiet" onClick={() => void run(() => apiFetch("/api/social/block", { method: "POST", body: JSON.stringify({ playerId: tie.player.id }) }))} disabled={busy}>
                  {t("social.block")}
                </Button>
                <Button variant="quiet" onClick={() => void run(() => apiFetch(`/api/social/ties/${tie.id}`, { method: "DELETE", body: "{}" }))} disabled={busy}>
                  {t("social.remove")}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
