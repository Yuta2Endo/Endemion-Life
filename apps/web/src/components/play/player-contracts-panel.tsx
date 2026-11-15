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
}

const copy = {
  ru: { title: "Контракты игроков", lead: "Товар продавца хранится в escrow до принятия или отмены.", good: "Товар", qty: "Кол-во", price: "Цена", create: "Выставить", accept: "Принять", cancel: "Отменить", empty: "Открытых контрактов нет.", seller: "Продавец", failed: "Не удалось выполнить действие." },
  en: { title: "Player contracts", lead: "Seller goods are escrowed until accepted or cancelled.", good: "Good", qty: "Qty", price: "Price", create: "List", accept: "Accept", cancel: "Cancel", empty: "No open contracts.", seller: "Seller", failed: "Could not complete the action." }
} as const;

export function PlayerContractsPanel({ life, onRefresh }: { life: LifeView; onRefresh: () => void | Promise<void> }) {
  const { locale } = useI18n();
  const c = copy[locale as "ru" | "en"];
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [goodId, setGoodId] = useState(life.market.goods[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("10");
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
    const p = Number(price);
    if (!goodId || !Number.isInteger(q) || q < 1 || !Number.isInteger(p) || p < 1) return;
    await run(() => apiFetch("/api/contracts", {
      method: "POST",
      body: JSON.stringify({ actionId: crypto.randomUUID(), lifeId: life.id, goodId, qty: q, price: p, expectedVersion: life.version })
    }));
  }

  async function accept(contract: Contract) {
    await run(() => apiFetch(`/api/contracts/${contract.id}/accept`, {
      method: "POST",
      body: JSON.stringify({ actionId: crypto.randomUUID(), buyerLifeId: life.id, expectedVersion: life.version })
    }));
  }

  async function cancel(contract: Contract) {
    await run(() => apiFetch(`/api/contracts/${contract.id}`, { method: "DELETE", body: "{}" }));
  }

  if (guest) return null;
  return (
    <Panel className="mt-5" data-testid="player-contracts">
      <h3 className="font-display text-xl text-bone-100">{c.title}</h3>
      <p className="mt-1 text-xs text-bone-500">{c.lead}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <select className="min-h-10 rounded-sm border border-line bg-ink-950 px-2 text-sm text-bone-100" value={goodId} onChange={(event) => setGoodId(event.target.value)}>
          {life.market.goods.map((good) => <option key={good.id} value={good.id}>{good.name[locale as "ru" | "en"]}</option>)}
        </select>
        <input className="min-h-10 rounded-sm border border-line bg-ink-950 px-2 text-sm text-bone-100" inputMode="numeric" value={qty} onChange={(event) => setQty(event.target.value.replace(/\D/g, ""))} aria-label={c.qty} />
        <input className="min-h-10 rounded-sm border border-line bg-ink-950 px-2 text-sm text-bone-100" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))} aria-label={c.price} />
        <Button variant="ghost" onClick={() => void create()} disabled={busy}>{c.create}</Button>
      </div>
      {contracts.length === 0 ? <p className="mt-3 text-sm text-bone-400">{c.empty}</p> : (
        <ul className="mt-3 space-y-2">
          {contracts.map((contract) => (
            <li key={contract.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line px-3 py-2">
              <span className="min-w-0 text-sm text-bone-100">
                {contract.goodName[locale as "ru" | "en"]} × {contract.qty} · {contract.total} gold
                <span className="block text-xs text-bone-500">{c.seller}: {contract.sellerName} · {contract.sellerLifeName}</span>
              </span>
              {contract.mine ? (
                <Button variant="quiet" onClick={() => void cancel(contract)} disabled={busy}>{c.cancel}</Button>
              ) : (
                <Button variant="quiet" onClick={() => void accept(contract)} disabled={busy}>{c.accept}</Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {notice && <p className="mt-2 text-sm text-blood-300" role="alert">{notice}</p>}
    </Panel>
  );
}
