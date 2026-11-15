"use client";

import { Button, Panel } from "@endemion/ui";
import { useEffect, useState } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface Rewards {
  universeId: string;
  season: number;
  goalsMet: number;
  rewardPool: number;
  contributed: boolean;
  claimedAt: string | null;
  claimable: number;
}

interface Life {
  id: string;
  name: string;
  status: string;
  universeId: string;
  character: { wealth: number };
}

const copy = {
  ru: {
    title: "Награда за вклад",
    lead: "Вклад в общий мир открывает награду, когда сезонные цели выполнены.",
    season: "Сезон {n}",
    goals: "Целей выполнено: {n}",
    pool: "Награда: {n} золота",
    claimed: "Награда уже получена.",
    noContribution: "Нужен вклад в общий мир этого сезона.",
    noGoals: "В этом сезоне цели ещё не выполнены.",
    choose: "Получатель",
    claim: "Получить награду",
    claimedNow: "Награда получена: {n} золота.",
    error: "Не удалось получить награду.",
    noLives: "Нет живой жизни в этом мире."
  },
  en: {
    title: "Contribution reward",
    lead: "Contributing to the shared world unlocks a reward when the season goals are met.",
    season: "Season {n}",
    goals: "Goals met: {n}",
    pool: "Reward: {n} gold",
    claimed: "Reward already claimed.",
    noContribution: "Contribute to the shared world this season first.",
    noGoals: "Season goals are not met yet.",
    choose: "Recipient",
    claim: "Claim reward",
    claimedNow: "Reward claimed: {n} gold.",
    error: "Could not claim the reward.",
    noLives: "No living life in this world."
  }
} as const;

export function WorldRewardPanel({ universeId }: { universeId: string }) {
  const { locale } = useI18n();
  const c = copy[locale as "ru" | "en"];
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [lives, setLives] = useState<Life[]>([]);
  const [lifeId, setLifeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<Rewards>(`/api/world/${encodeURIComponent(universeId)}/rewards`),
      apiFetch<{ lives: Life[] }>("/api/lives")
    ])
      .then(([reward, list]) => {
        if (!active) return;
        setRewards(reward);
        setLives(list.lives.filter((life) => life.status === "alive" && life.universeId === universeId));
      })
      .catch((error: unknown) => {
        if (active && error instanceof ClientError && (error.status === 401 || error.code === "ACCOUNT_REQUIRED")) setHidden(true);
      });
    return () => {
      active = false;
    };
  }, [universeId]);

  async function claim() {
    if (!rewards || !lifeId) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await apiFetch<{ reward: number }>(`/api/world/${encodeURIComponent(universeId)}/rewards/claim`, {
        method: "POST",
        body: JSON.stringify({ actionId: crypto.randomUUID(), lifeId, expectedSeason: rewards.season })
      });
      setNotice(c.claimedNow.replace("{n}", String(result.reward)));
      setRewards({ ...rewards, claimable: 0, claimedAt: new Date().toISOString() });
      setLives((current) => current.map((life) => life.id === lifeId ? { ...life, character: { ...life.character, wealth: life.character.wealth + result.reward } } : life));
    } catch {
      setNotice(c.error);
    } finally {
      setBusy(false);
    }
  }

  if (hidden || !rewards) return null;
  return (
    <Panel className="mt-5" data-testid="world-rewards">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl text-bone-100">{c.title}</h3>
        <span className="text-xs text-bone-500">{c.season.replace("{n}", String(rewards.season))}</span>
      </div>
      <p className="mt-1 text-xs text-bone-500">{c.lead}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-bone-300">
        <span>{c.goals.replace("{n}", String(rewards.goalsMet))}</span>
        <span>{c.pool.replace("{n}", String(rewards.rewardPool))}</span>
      </div>
      {rewards.claimedAt ? (
        <p className="mt-3 text-sm text-jade-300">{c.claimed}</p>
      ) : !rewards.contributed ? (
        <p className="mt-3 text-sm text-bone-400">{c.noContribution}</p>
      ) : rewards.goalsMet <= 0 ? (
        <p className="mt-3 text-sm text-bone-400">{c.noGoals}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-bone-400">{c.choose}</span>
            <select className="min-h-11 w-full rounded-sm border border-line bg-ink-950 px-3 text-sm text-bone-100" value={lifeId} onChange={(event) => setLifeId(event.target.value)}>
              <option value="">—</option>
              {lives.map((life) => <option key={life.id} value={life.id}>{life.name}</option>)}
            </select>
          </label>
          <Button onClick={() => void claim()} disabled={busy || !lifeId} data-testid="world-reward-claim">{c.claim}</Button>
        </div>
      )}
      {rewards.claimable > 0 && lives.length === 0 && <p className="mt-2 text-xs text-blood-300">{c.noLives}</p>}
      {notice && <p className="mt-2 text-sm text-gold-200" role="status">{notice}</p>}
    </Panel>
  );
}
