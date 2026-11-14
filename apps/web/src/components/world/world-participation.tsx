"use client";

import type { MeResponse } from "@endemion/shared";
import type { SharedWorldState, UniverseId } from "@endemion/game-core";
import { Button, Tag } from "@endemion/ui";
import { useEffect, useState } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface PresenceSnapshot {
  universeId: string;
  available: boolean;
  count: number;
  players: Array<{ id: string; displayName: string }>;
  serverTime: string;
}

interface ContributionResponse {
  world: SharedWorldState;
  season: number;
  replayed: boolean;
}

export interface WorldParticipationProps {
  universeId: UniverseId;
  season: number;
  world: SharedWorldState;
  onWorldChanged: () => void;
}

/**
 * Stage 05: presence + a single server-authoritative contribution per season.
 * The client only chooses a target; rewards and projections are computed server-side.
 */
export function WorldParticipation({ universeId, season, world, onWorldChanged }: WorldParticipationProps) {
  const { t, locale } = useI18n();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [presence, setPresence] = useState<PresenceSnapshot | null>(null);
  const [target, setTarget] = useState("");
  const [contributionBusy, setContributionBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void apiFetch<MeResponse>("/api/auth/me")
      .then((data) => {
        if (alive) setMe(data);
      })
      .catch(() => {
        if (alive) setMe({ player: null, account: null });
      });
    return () => {
      alive = false;
    };
  }, []);

  const signedIn = Boolean(me?.account || me?.endemionId);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    const beat = async (): Promise<void> => {
      try {
        const data = await apiFetch<PresenceSnapshot>("/api/presence/heartbeat", {
          method: "POST",
          body: JSON.stringify({ universeId })
        });
        if (alive) setPresence(data);
      } catch {
        if (alive) setPresence(null);
      }
    };
    void beat();
    const timer = setInterval(() => void beat(), 30_000);

    // EventSource reconnects automatically; the initial frame restores presence.
    const stream = new EventSource(`/api/presence/stream?universeId=${encodeURIComponent(universeId)}`);
    const onPresence = (event: MessageEvent<string>): void => {
      try {
        setPresence(JSON.parse(event.data) as PresenceSnapshot);
      } catch {
        // A malformed frame is ignored; the next heartbeat repairs the view.
      }
    };
    const onWorld = (): void => {
      onWorldChanged();
    };
    stream.addEventListener("presence", onPresence as EventListener);
    stream.addEventListener("world", onWorld);
    return () => {
      alive = false;
      clearInterval(timer);
      stream.close();
    };
  }, [signedIn, universeId, onWorldChanged]);

  const contribute = async (): Promise<void> => {
    if (!target) return;
    const [kind, id] = target.split(":", 2) as ["settlement" | "faction", string];
    setContributionBusy(true);
    setNotice(null);
    setError(null);
    try {
      const result = await apiFetch<ContributionResponse>(`/api/world/${encodeURIComponent(universeId)}/contribute`, {
        method: "POST",
        body: JSON.stringify({
          actionId: crypto.randomUUID(),
          expectedSeason: season,
          targetKind: kind,
          targetId: id
        })
      });
      setNotice(result.replayed ? t("world.contribute.replayed") : t("world.contribute.done"));
      setTarget("");
      onWorldChanged();
    } catch (caught) {
      if (caught instanceof ClientError) {
        if (caught.code === "ALREADY_CONTRIBUTED") setError(t("world.contribute.already"));
        else if (caught.code === "WORLD_CONFLICT") setError(t("world.contribute.conflict"));
        else if (caught.code === "ACCOUNT_REQUIRED") setError(t("world.presence.account"));
        else if (caught.code === "NETWORK") setError(t("error.offline"));
        else setError(t("world.contribute.error"));
      } else {
        setError(t("world.contribute.error"));
      }
    } finally {
      setContributionBusy(false);
    }
  };

  if (me === null) return null;

  return (
    <div className="mt-4 rounded-lg border border-line bg-ink-950/30 p-3" data-testid="world-participation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm text-bone-100">{t("world.presence.title")}</h3>
        <Tag tone={presence?.available ? "good" : "neutral"}>
          {presence?.available
            ? t("world.presence.online", { n: presence.count })
            : t("world.presence.unavailable")}
        </Tag>
      </div>
      {signedIn ? (
        <>
          {presence && presence.count > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="world-presence-list">
              {presence.players.map((player) => (
                <li key={player.id}>
                  <Tag>{player.displayName}</Tag>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-bone-400">{t("world.presence.none")}</p>
          )}
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 text-xs text-bone-400">
              <span className="mb-1 block">{t("world.contribute.target")}</span>
              <select
                className="min-h-11 w-full rounded-md border border-line bg-ink-950 px-2 text-sm text-bone-100"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                disabled={contributionBusy}
                data-testid="world-contribute-target"
              >
                <option value="">{t("world.contribute.choose")}</option>
                <optgroup label={t("world.contribute.settlement")}>
                  {world.settlements.map((settlement) => (
                    <option key={settlement.id} value={`settlement:${settlement.id}`}>
                      {settlement.name[locale]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t("world.contribute.faction")}>
                  {world.factions.map((faction) => (
                    <option key={faction.id} value={`faction:${faction.id}`}>
                      {faction.name[locale]}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <Button
              className="min-h-11"
              disabled={!target || contributionBusy}
              onClick={() => void contribute()}
              data-testid="world-contribute"
            >
              {contributionBusy ? t("world.contribute.busy") : t("world.contribute.action")}
            </Button>
          </div>
          <p className="mt-2 text-xs text-bone-500">{t("world.contribute.hint")}</p>
          {notice && (
            <p className="mt-2 text-xs text-jade-300" role="status" data-testid="world-contribute-notice">
              {notice}
            </p>
          )}
          {error && (
            <p className="mt-2 text-xs text-blood-300" role="alert" data-testid="world-contribute-error">
              {error}
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 text-xs text-bone-400">
          {t("world.presence.account")}{" "}
          <a className="text-gold-300 underline underline-offset-2" href="/account">
            {t("world.presence.accountLink")}
          </a>
        </p>
      )}
    </div>
  );
}
