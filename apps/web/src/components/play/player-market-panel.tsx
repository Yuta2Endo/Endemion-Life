"use client";

import type { LifeView } from "@endemion/shared";
import { Button, Panel, Tag } from "@endemion/ui";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ClientError, postJson } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface Offer {
  id: string;
  goodId: string;
  goodName: { ru: string; en: string };
  qty: number;
  unitPrice: number;
  total: number;
  status: "active" | "sold" | "cancelled" | "expired";
  sellerName: string;
  sellerLifeName: string;
  mine: boolean;
  expiresAt: string;
}

interface Board {
  offers: Offer[];
  mine: Offer[];
  at: string;
}

type Me = { account: { id: string } | null };

const ERROR_KEYS: Record<string, string> = {
  ACCOUNT_REQUIRED: "playerMarket.accountRequired",
  INSUFFICIENT_GOODS: "playerMarket.noGoods",
  INSUFFICIENT_WEALTH: "playerMarket.noGold",
  OFFER_CLOSED: "playerMarket.closed",
  OFFER_LIMIT: "playerMarket.limit",
  SELF_TRADE: "playerMarket.self",
  BUYER_STOCK_FULL: "playerMarket.stockFull",
  LIFE_NOT_ADULT: "playerMarket.adult",
  VERSION_CONFLICT: "playerMarket.stale"
};

export function PlayerMarketPanel({ life, onRefresh }: { life: LifeView; onRefresh: () => void | Promise<void> }) {
  const { l, t } = useI18n();
  const [board, setBoard] = useState<Board | null>(null);
  const [account, setAccount] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [goodId, setGoodId] = useState(life.market.goods[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(Math.max(1, life.market.goods[0]?.buy ?? 10));

  const fetchBoard = useCallback(async () => {
    const [me, next] = await Promise.all([
      apiFetch<Me>("/api/auth/me"),
      apiFetch<Board>(`/api/market?universeId=${life.universeId}`)
    ]);
    return { me, next };
  }, [life.universeId]);

  const load = useCallback(async () => {
    try {
      const { me, next } = await fetchBoard();
      setAccount(me.account !== null);
      setBoard(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ClientError ? cause.message : t("playerMarket.unavailable"));
    }
  }, [fetchBoard, t]);

  useEffect(() => {
    let active = true;
    fetchBoard()
      .then(({ me, next }) => {
        if (!active) return;
        setAccount(me.account !== null);
        setBoard(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof ClientError ? cause.message : t("playerMarket.unavailable"));
      });
    return () => {
      active = false;
    };
  }, [fetchBoard, t]);

  const selected = life.market.goods.find((good) => good.id === goodId) ?? life.market.goods[0];
  const maxQty = Math.max(1, Math.min(5, selected?.stock ?? 1));

  const create = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await postJson("/api/market/offers", {
        actionId: crypto.randomUUID(),
        lifeId: life.id,
        goodId: selected?.id,
        qty: Math.min(qty, maxQty),
        unitPrice: Math.max(1, Math.floor(price)),
        expectedVersion: life.version
      });
      setNotice(t("playerMarket.listed"));
      await load();
    } catch (cause) {
      setError(cause instanceof ClientError ? t((ERROR_KEYS[cause.code] ?? "playerMarket.failed") as Parameters<typeof t>[0]) : t("playerMarket.failed"));
    } finally {
      setBusy(false);
    }
  };

  const buy = async (offer: Offer) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await postJson(`/api/market/offers/${offer.id}/buy`, {
        actionId: crypto.randomUUID(),
        buyerLifeId: life.id,
        expectedVersion: life.version
      });
      setNotice(t("playerMarket.bought"));
      await load();
      await onRefresh();
    } catch (cause) {
      setError(cause instanceof ClientError ? t((ERROR_KEYS[cause.code] ?? "playerMarket.failed") as Parameters<typeof t>[0]) : t("playerMarket.failed"));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (offer: Offer) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/market/offers/${offer.id}`, {
        method: "DELETE",
        body: JSON.stringify({ expectedVersion: life.version })
      });
      setNotice(t("playerMarket.cancelled"));
      await load();
    } catch (cause) {
      setError(cause instanceof ClientError ? t((ERROR_KEYS[cause.code] ?? "playerMarket.failed") as Parameters<typeof t>[0]) : t("playerMarket.failed"));
    } finally {
      setBusy(false);
    }
  };

  const activeMine = (board?.mine ?? []).filter((offer) => offer.status === "active");

  return (
    <section id="player-market" className="scroll-mt-24" data-testid="player-market">
      <Panel>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <p className="eyebrow text-gold-400">{t("playerMarket.eyebrow")}</p>
            <h3 className="font-display text-xl text-bone-50">{t("playerMarket.title")}</h3>
          </div>
          <Tag tone="neutral">{t("playerMarket.count", { n: board?.offers.length ?? 0 })}</Tag>
        </div>
        <p className="mb-4 max-w-prose text-sm text-bone-300">{t("playerMarket.lead")}</p>

        {account === false && (
          <div className="border-l-2 border-gold-500/70 pl-3 text-sm text-bone-200">
            <p>{t("playerMarket.accountRequired")}</p>
            <a className="mt-2 inline-flex min-h-11 items-center text-gold-300 underline-offset-4 hover:underline" href="/account">
              {t("playerMarket.accountLink")}
            </a>
          </div>
        )}

        {account && (
          <div className="mb-5 grid gap-2 border border-line bg-ink-950/40 p-3 sm:grid-cols-[minmax(0,1fr)_5rem_6rem_auto]">
            <label className="text-xs text-bone-400">
              {t("playerMarket.good")}
              <select
                name="marketGood"
                className="mt-1 min-h-11 w-full rounded-sm border border-line bg-ink-900 px-2 text-sm text-bone-100"
                value={selected?.id ?? ""}
                onChange={(event) => {
                  setGoodId(event.target.value);
                  const next = life.market.goods.find((good) => good.id === event.target.value);
                  if (next) setPrice(Math.max(1, next.buy));
                }}
              >
                {life.market.goods.map((good) => (
                  <option key={good.id} value={good.id} disabled={good.stock < 1}>
                    {l(good.name)} · {t("playerMarket.stock", { n: good.stock })}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-bone-400">
              {t("playerMarket.qty")}
              <input
                name="marketQty"
                type="number"
                min={1}
                max={maxQty}
                value={qty}
                onChange={(event) => setQty(Math.max(1, Math.min(maxQty, Number(event.target.value) || 1)))}
                className="mt-1 min-h-11 w-full rounded-sm border border-line bg-ink-900 px-2 text-sm text-bone-100"
              />
            </label>
            <label className="text-xs text-bone-400">
              {t("playerMarket.price")}
              <input
                name="marketPrice"
                type="number"
                min={1}
                value={price}
                onChange={(event) => setPrice(Math.max(1, Number(event.target.value) || 1))}
                className="mt-1 min-h-11 w-full rounded-sm border border-line bg-ink-900 px-2 text-sm text-bone-100"
              />
            </label>
            <Button type="button" onClick={() => void create()} disabled={busy || !selected || selected.stock < 1} className="self-end">
              {t("playerMarket.list")}
            </Button>
          </div>
        )}

        {error && <p className="mb-3 border-l-2 border-blood-500 pl-3 text-sm text-blood-300" role="alert">{error}</p>}
        {notice && <p className="mb-3 border-l-2 border-jade-500 pl-3 text-sm text-jade-300" role="status">{notice}</p>}

        <ul className="divide-y divide-line border-y border-line" data-testid="market-offers">
          {(board?.offers ?? []).map((offer) => (
            <li key={offer.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div>
                <p className="text-sm text-bone-100">
                  {l(offer.goodName)} × {offer.qty}
                  <span className="ml-2 text-bone-400">{offer.unitPrice} / {t("playerMarket.unit")}</span>
                </p>
                <p className="text-xs text-bone-500">
                  {offer.sellerLifeName} · {offer.sellerName} · {t("playerMarket.until", { when: new Date(offer.expiresAt).toLocaleString() })}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <strong className="font-display text-lg text-gold-300">{offer.total}</strong>
                {offer.mine ? (
                  <Button type="button" variant="ghost" onClick={() => void cancel(offer)} disabled={busy}>
                    {t("playerMarket.cancel")}
                  </Button>
                ) : (
                  <Button type="button" onClick={() => void buy(offer)} disabled={busy || account !== true}>
                    {t("playerMarket.buy")}
                  </Button>
                )}
              </div>
            </li>
          ))}
          {board && board.offers.length === 0 && (
            <li className="py-6 text-sm text-bone-400">{t("playerMarket.empty")}</li>
          )}
        </ul>

        {activeMine.length > 0 && (
          <p className="mt-3 text-xs text-bone-500">{t("playerMarket.mine", { n: activeMine.length })}</p>
        )}
      </Panel>
    </section>
  );
}
