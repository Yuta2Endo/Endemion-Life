"use client";

import { Panel } from "@endemion/ui";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "../locale-provider";

interface PriceGood {
  id: string;
  name: { ru: string; en: string };
  supply: number;
  buy: number;
  sell: number;
  previousBuy: number | null;
  previousSell: number | null;
  change: number;
}

interface PriceEvent {
  id: string;
  kind: string;
  title: { ru: string; en: string };
  text: { ru: string; en: string };
}

interface Prices {
  season: number;
  goods: PriceGood[];
  history: Array<{ season: number; goods: Array<{ id: string; buy: number; sell: number }> }>;
  events: PriceEvent[];
}

const copy = {
  ru: { title: "Цены общего мира", lead: "Средние цены по поселениям. Стрелка — изменение к прошлому сезону.", buy: "Купить", sell: "Продать", supply: "Запас", noEvents: "Событий, влияющих на цены, пока нет." },
  en: { title: "Shared world prices", lead: "Average prices across settlements. Arrow shows change from the previous season.", buy: "Buy", sell: "Sell", supply: "Supply", noEvents: "No price-moving events yet." }
} as const;

export function WorldPricePanel({ universeId }: { universeId: string }) {
  const { locale } = useI18n();
  const c = copy[locale as "ru" | "en"];
  const [data, setData] = useState<Prices | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<Prices>(`/api/world/${encodeURIComponent(universeId)}/prices?seasons=6`)
      .then((value) => active && setData(value))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [universeId]);

  if (!data) return null;
  return (
    <Panel className="mt-5" data-testid="world-prices">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl text-bone-100">{c.title}</h3>
        <span className="text-xs text-bone-500">{c.lead}</span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.12em] text-bone-500">
            <tr>
              <th className="py-1">{locale === "ru" ? "Товар" : "Good"}</th>
              <th className="py-1 text-right">{c.buy}</th>
              <th className="py-1 text-right">{c.sell}</th>
              <th className="py-1 text-right">{c.supply}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.goods.map((good) => (
              <tr key={good.id}>
                <td className="py-2 text-bone-200">{good.name[locale as "ru" | "en"]}</td>
                <td className="py-2 text-right tabular-nums text-bone-100">{good.buy} <span className={good.change > 0 ? "text-blood-300" : good.change < 0 ? "text-jade-300" : "text-bone-500"}>{good.change > 0 ? "↑" : good.change < 0 ? "↓" : "·"}{good.change !== 0 ? `${Math.abs(good.change)}%` : ""}</span></td>
                <td className="py-2 text-right tabular-nums text-bone-100">{good.sell}</td>
                <td className="py-2 text-right tabular-nums text-bone-400">{good.supply}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.events.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-bone-400">
          {data.events.slice(0, 4).map((event) => <li key={event.id}><span className="text-gold-200">{event.title[locale as "ru" | "en"]}</span> · {event.text[locale as "ru" | "en"]}</li>)}
        </ul>
      ) : (
        <p className="mt-3 border-t border-line pt-3 text-xs text-bone-500">{c.noEvents}</p>
      )}
    </Panel>
  );
}
