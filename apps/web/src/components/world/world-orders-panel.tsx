"use client";

import { Button, Panel } from "@endemion/ui";
import { useEffect, useState } from "react";
import { apiFetch, ClientError } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface Order {
  id: string;
  settlementName: { ru: string; en: string };
  goodName: { ru: string; en: string };
  qty: number;
  reward: number;
}

interface Orders {
  season: number;
  orders: Order[];
}

interface Life {
  id: string;
  name: string;
  status: string;
  universeId: string;
}

const copy = {
  ru: { title: "Заказы поселений", lead: "Принесите товар поселению и получите золото.", empty: "Заказов пока нет.", choose: "Жизнь", fulfill: "Выполнить", done: "Заказ выполнен: {n} золота.", error: "Не удалось выполнить заказ." },
  en: { title: "Settlement orders", lead: "Deliver goods to a settlement and earn gold.", empty: "No orders yet.", choose: "Life", fulfill: "Fulfil", done: "Order fulfilled: {n} gold.", error: "Could not fulfil the order." }
} as const;

export function WorldOrdersPanel({ universeId }: { universeId: string }) {
  const { locale } = useI18n();
  const c = copy[locale as "ru" | "en"];
  const [orders, setOrders] = useState<Orders | null>(null);
  const [lives, setLives] = useState<Life[]>([]);
  const [lifeId, setLifeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<Orders>(`/api/world/${encodeURIComponent(universeId)}/orders`),
      apiFetch<{ lives: Life[] }>("/api/lives")
    ])
      .then(([board, list]) => {
        if (!active) return;
        setOrders(board);
        setLives(list.lives.filter((life) => life.status === "alive" && life.universeId === universeId));
      })
      .catch((error: unknown) => {
        if (active && error instanceof ClientError && (error.status === 401 || error.code === "ACCOUNT_REQUIRED")) setHidden(true);
      });
    return () => {
      active = false;
    };
  }, [universeId]);

  async function fulfill(order: Order) {
    if (!lifeId) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await apiFetch<{ reward: number }>(`/api/world/${encodeURIComponent(universeId)}/orders/${order.id}/fulfill`, {
        method: "POST",
        body: JSON.stringify({ actionId: crypto.randomUUID(), lifeId })
      });
      setNotice(c.done.replace("{n}", String(result.reward)));
      setOrders((current) => current ? { ...current, orders: current.orders.filter((item) => item.id !== order.id) } : current);
    } catch {
      setNotice(c.error);
    } finally {
      setBusy(false);
    }
  }

  if (hidden || !orders) return null;
  return (
    <Panel className="mt-5" data-testid="world-orders">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl text-bone-100">{c.title}</h3>
        <span className="text-xs text-bone-500">{c.lead}</span>
      </div>
      {lives.length > 0 && (
        <label className="mt-3 block max-w-sm">
          <span className="mb-1 block text-xs text-bone-400">{c.choose}</span>
          <select className="min-h-11 w-full rounded-sm border border-line bg-ink-950 px-3 text-sm text-bone-100" value={lifeId} onChange={(event) => setLifeId(event.target.value)}>
            <option value="">—</option>
            {lives.map((life) => <option key={life.id} value={life.id}>{life.name}</option>)}
          </select>
        </label>
      )}
      {orders.orders.length === 0 ? <p className="mt-3 text-sm text-bone-400">{c.empty}</p> : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {orders.orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-3 rounded-sm border border-line px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-bone-100">{order.goodName[locale as "ru" | "en"]} × {order.qty}</p>
                <p className="truncate text-xs text-bone-500">{order.settlementName[locale as "ru" | "en"]} · {order.reward} gold</p>
              </div>
              <Button variant="quiet" onClick={() => void fulfill(order)} disabled={busy || !lifeId} data-testid="world-order-fulfill">{c.fulfill}</Button>
            </li>
          ))}
        </ul>
      )}
      {notice && <p className="mt-2 text-sm text-gold-200" role="status">{notice}</p>}
    </Panel>
  );
}
