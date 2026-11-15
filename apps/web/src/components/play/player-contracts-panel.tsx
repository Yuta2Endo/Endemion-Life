"use client";

import type { LifeView } from "@endemion/shared";
import { Button, Panel } from "@endemion/ui";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface Contract {
  id: string;
  goodId: string;
  goodName: { ru: string; en: string };
  qty: number;
  price: number;
  total: number;
  sellerName: string;
  sellerLifeName: string;
  mine: boolean;
  kind: "fixed" | "auction";
  minBid: number | null;
  currentBid: number | null;
  auctionEndsAt: string | null;
}

const copy = {
  ru: {
    title: "Контракты игроков",
    lead: "Товар продавца хранится в escrow до принятия, отмены или завершения аукциона.",
    good: "Товар",
    qty: "Кол-во",
    price: "Цена",
    minBid: "Стартовая ставка",
    currentBid: "Текущая ставка",
    noBids: "ставок нет",
    ends: "до",
    hours: "Часы",
    mode: "Тип",
    fixed: "Фикс. цена",
    auction: "Аукцион",
    startBid: "Старт",
    create: "Выставить",
    accept: "Принять",
    bid: "Ставка",
    placeBid: "Поставить",
    settle: "Завершить",
    cancel: "Отменить",
    bidActive: "Есть ставки",
    empty: "Открытых контрактов нет.",
    seller: "Продавец",
    failed: "Не удалось выполнить действие."
  },
  en: {
    title: "Player contracts",
    lead: "Seller goods are escrowed until accepted, cancelled, or the auction settles.",
    good: "Good",
    qty: "Qty",
    price: "Price",
    minBid: "Starting bid",
    currentBid: "Current bid",
    noBids: "no bids",
    ends: "ends",
    hours: "Hours",
    mode: "Type",
    fixed: "Fixed price",
    auction: "Auction",
    startBid: "Start",
    create: "List",
    accept: "Accept",
    bid: "Bid",
    placeBid: "Bid",
    settle: "Settle",
    cancel: "Cancel",
    bidActive: "Bids placed",
    empty: "No open contracts.",
    seller: "Seller",
    failed: "Could not complete the action."
  }
} as const;

export function PlayerContractsPanel({ life, onRefresh }: { life: LifeView; onRefresh: () => void | Promise<void> }) {
  const { locale } = useI18n();
  const c = copy[locale as "ru" | "en"];
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [mode, setMode] = useState<"fixed" | "auction">("fixed");
  const [goodId, setGoodId] = useState(life.market.goods[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("10");
  const [auctionHours, setAuctionHours] = useState("24");
  const [bids, setBids] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ contracts: Contract[] }>(`/api/contracts?universeId=${encodeURIComponent(life.universeId)}`);
      setContracts(data.contracts);
      setGuest(false);
    } catch (error) {
      if (error instanceof ClientError && (error.status === 401 || error.code === "ACCOUNT_REQUIRED")) setGuest(true);
    }
  }, [life.universeId]);

  useEffect(() => {
    const handle = setTimeout(() => void load(), 0);
    return () => clearTimeout(handle);
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await load();
      await onRefresh();
    } catch {
      setNotice(c.failed);
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    const q = Number(qty);
    const auction = mode === "auction";
    const value = Number(price);
    const hours = Number(auctionHours);
    if (!goodId || !Number.isInteger(q) || q < 1 || !Number.isInteger(value) || value < 1) return;
    if (auction && (!Number.isInteger(hours) || hours < 1 || hours > 168)) return;
    await run(() => apiFetch("/api/contracts", {
      method: "POST",
      body: JSON.stringify(auction
        ? { actionId: crypto.randomUUID(), lifeId: life.id, goodId, qty: q, price: value, expectedVersion: life.version, kind: "auction", minBid: value, auctionHours: hours }
        : { actionId: crypto.randomUUID(), lifeId: life.id, goodId, qty: q, price: value, expectedVersion: life.version })
    }));
  }

  async function accept(contract: Contract) {
    await run(() => apiFetch(`/api/contracts/${contract.id}/accept`, {
      method: "POST",
      body: JSON.stringify({ actionId: crypto.randomUUID(), buyerLifeId: life.id, expectedVersion: life.version })
    }));
  }

  async function bid(contract: Contract) {
    const amount = Number(bids[contract.id] ?? "");
    const minimum = contract.currentBid === null ? (contract.minBid ?? 1) : contract.currentBid + 1;
    if (!Number.isInteger(amount) || amount < minimum) return;
    await run(() => apiFetch(`/api/contracts/${contract.id}/bid`, {
      method: "POST",
      body: JSON.stringify({ bidderLifeId: life.id, amount })
    }));
  }

  async function settle(contract: Contract) {
    await run(() => apiFetch(`/api/contracts/${contract.id}/settle`, { method: "POST", body: "{}" }));
  }

  async function cancel(contract: Contract) {
    await run(() => apiFetch(`/api/contracts/${contract.id}`, { method: "DELETE", body: "{}" }));
  }

  const formatEnd = (value: string) => new Date(value).toLocaleString(locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "short", timeStyle: "short" });

  if (guest) return null;
  return (
    <Panel className="mt-5" data-testid="player-contracts">
      <h3 className="font-display text-xl text-bone-100">{c.title}</h3>
      <p className="mt-1 text-xs text-bone-500">{c.lead}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <select className="min-h-10 rounded-sm border border-line bg-ink-950 px-2 text-sm text-bone-100" value={mode} onChange={(event) => setMode(event.target.value === "auction" ? "auction" : "fixed")} aria-label={c.mode}>
          <option value="fixed">{c.fixed}</option>
          <option value="auction">{c.auction}</option>
        </select>
        <select className="min-h-10 rounded-sm border border-line bg-ink-950 px-2 text-sm text-bone-100" value={goodId} onChange={(event) => setGoodId(event.target.value)}>
          {life.market.goods.map((good) => <option key={good.id} value={good.id}>{good.name[locale as "ru" | "en"]}</option>)}
        </select>
        <input className="min-h-10 rounded-sm border border-line bg-ink-950 px-2 text-sm text-bone-100" inputMode="numeric" value={qty} onChange={(event) => setQty(event.target.value.replace(/\D/g, ""))} aria-label={c.qty} />
        <input className="min-h-10 rounded-sm border border-line bg-ink-950 px-2 text-sm text-bone-100" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))} aria-label={mode === "auction" ? c.minBid : c.price} />
        {mode === "auction" && (
          <input className="min-h-10 rounded-sm border border-line bg-ink-950 px-2 text-sm text-bone-100" inputMode="numeric" value={auctionHours} onChange={(event) => setAuctionHours(event.target.value.replace(/\D/g, ""))} aria-label={c.hours} />
        )}
        <Button variant="ghost" className={mode === "auction" ? "sm:col-span-3" : "sm:col-span-4"} onClick={() => void create()} disabled={busy}>{c.create}</Button>
      </div>
      {contracts.length === 0 ? <p className="mt-3 text-sm text-bone-400">{c.empty}</p> : (
        <ul className="mt-3 space-y-2">
          {contracts.map((contract) => {
            const auction = contract.kind === "auction";
            const ended = auction && contract.auctionEndsAt !== null && new Date(contract.auctionEndsAt).getTime() <= Date.now();
            const minimum = contract.currentBid === null ? (contract.minBid ?? 1) : contract.currentBid + 1;
            return (
              <li key={contract.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line px-3 py-2">
                <span className="min-w-0 text-sm text-bone-100">
                  {contract.goodName[locale as "ru" | "en"]} × {contract.qty} · {auction ? `${c.currentBid}: ${contract.currentBid ?? c.noBids}` : `${contract.total} gold`}
                  <span className="block text-xs text-bone-500">{c.seller}: {contract.sellerName} · {contract.sellerLifeName}</span>
                  {auction && contract.auctionEndsAt && (
                    <span className="block text-xs text-bone-500">{c.startBid}: {contract.minBid ?? "—"} · {c.ends}: {formatEnd(contract.auctionEndsAt)}</span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  {!auction ? (
                    contract.mine
                      ? <Button variant="quiet" onClick={() => void cancel(contract)} disabled={busy}>{c.cancel}</Button>
                      : <Button variant="quiet" onClick={() => void accept(contract)} disabled={busy}>{c.accept}</Button>
                  ) : contract.mine ? (
                    ended
                      ? <Button variant="quiet" onClick={() => void settle(contract)} disabled={busy}>{c.settle}</Button>
                      : contract.currentBid === null
                        ? <Button variant="quiet" onClick={() => void cancel(contract)} disabled={busy}>{c.cancel}</Button>
                        : <span className="text-xs text-bone-500">{c.bidActive}</span>
                  ) : (
                    <>
                      <input
                        className="min-h-9 w-24 rounded-sm border border-line bg-ink-950 px-2 text-sm text-bone-100"
                        inputMode="numeric"
                        placeholder={String(minimum)}
                        value={bids[contract.id] ?? ""}
                        onChange={(event) => setBids((current) => ({ ...current, [contract.id]: event.target.value.replace(/\D/g, "") }))}
                        aria-label={c.bid}
                      />
                      <Button variant="quiet" onClick={() => void bid(contract)} disabled={busy}>{c.placeBid}</Button>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {notice && <p className="mt-2 text-sm text-blood-300" role="alert">{notice}</p>}
    </Panel>
  );
}
