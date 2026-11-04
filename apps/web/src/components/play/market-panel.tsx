"use client";

import type { TradeSide } from "@endemion/game-core";
import type { LifeView } from "@endemion/shared";
import { Button } from "@endemion/ui";
import { useI18n } from "../locale-provider";

/**
 * Stage 04: рынок мира. Клиент отправляет только намерение «купить или продать штуку товара»;
 * цену, остаток золота и запас считает сервер. Цены зависят от состояния хозяйства мира
 */
export function MarketPanel({ life, busy, onTrade }: { life: LifeView; busy: boolean; onTrade: (goodId: string, side: TradeSide, qty: number) => void }) {
  const { l, t } = useI18n();
  const m = life.market;
  const closedText = m.closed === "age" ? t("market.closedAge", { age: m.minAge }) : m.closed === "pending" ? t("market.closedPending") : m.closed === "dead" ? t("market.closedDead") : null;
  return (
    <div data-testid="market" data-open={m.open}>
      <h3 className="mb-1 text-[11px] uppercase tracking-[0.22em] text-gold-400">{t("market.title")}</h3>
      <p className="mb-3 text-xs text-bone-500">{t("market.hint", { max: m.maxStock })}</p>
      {closedText && (
        <p className="mb-3 rounded-md border border-line bg-ink-950/50 px-3 py-2 text-xs text-bone-400" role="status" data-testid="market-closed">
          {closedText}
        </p>
      )}
      <ul className="space-y-2">
        {m.goods.map((good) => (
          <li key={good.id} className="rounded-md border border-line bg-ink-950/50 p-3" data-testid="good" data-good={good.id} data-stock={good.stock}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-bone-100">{l(good.name)}</p>
              <p className="text-xs text-bone-400">
                {t("market.stock", { n: good.stock })} · <span className="text-jade-300">{l(good.effect)}</span>
              </p>
            </div>
            <p className="mt-1 text-xs text-bone-500">{l(good.description)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                onClick={() => onTrade(good.id, "buy", 1)}
                disabled={busy || !good.canBuy}
                aria-label={t("market.buyLabel", { name: l(good.name), price: good.buy })}
                data-testid="good-buy"
                data-price={good.buy}
              >
                {t("market.buy", { price: good.buy })}
              </Button>
              <Button
                variant="quiet"
                onClick={() => onTrade(good.id, "sell", 1)}
                disabled={busy || !good.canSell}
                aria-label={t("market.sellLabel", { name: l(good.name), price: good.sell })}
                data-testid="good-sell"
                data-price={good.sell}
              >
                {t("market.sell", { price: good.sell })}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
