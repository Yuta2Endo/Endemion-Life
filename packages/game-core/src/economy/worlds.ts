// Stage 04: хозяйство шести миров. Один движок (economy.ts), у мира — только своя конфигурация:
// налог и его название, стоимость жизни, названия спада и подъёма, доход, который даёт сам мир
import { t, type LocalizedText } from "../i18n.js";
import type { EconomyCycle, GameState, UniverseId } from "../types.js";
import { meterValue } from "../world/rules.js";

export interface WorldEconomy {
  /** Доля заработка, которую забирает казна, Орден, гильдия, клан или секта */
  taxRate: number;
  taxName: LocalizedText;
  /** Множитель стоимости жизни: в Нео-Сеуле жизнь дороже, в секте Небесного Предела — дешевле */
  livingFactor: number;
  cycles: Readonly<Record<EconomyCycle, { name: LocalizedText; description: LocalizedText }>>;
  /** Доход, который даёт сам мир. Нео-Сеул: зачистки Врат по рангу и славе (прежде — в world/rules.ts) */
  worldIncome?: (state: GameState) => number;
  worldIncomeName?: LocalizedText;
}

const NORMAL = { name: t("Обычные годы", "Ordinary years"), description: t("Заработок как всегда.", "Earnings as usual.") };

export const WORLD_ECONOMIES: Readonly<Record<UniverseId, WorldEconomy>> = {
  "dark-fantasy": {
    taxRate: 0.1,
    taxName: t("Десятина Ордена", "The Order's tithe"),
    livingFactor: 1,
    cycles: {
      slump: { name: t("Голодные годы", "Hungry years"), description: t("Мгла губит урожай, заработок падает на пятую часть.", "The Mist blights the harvest; earnings fall by a fifth.") },
      normal: NORMAL,
      boom: { name: t("Урожайные годы", "Bountiful years"), description: t("Дороги открыты, заработок выше на пятую часть.", "The roads are open; earnings rise by a fifth.") }
    }
  },
  isekai: {
    taxRate: 0.08,
    taxName: t("Пошлина гильдии", "Guild duty"),
    livingFactor: 1,
    cycles: {
      slump: { name: t("Застой на рынках", "Stagnant markets"), description: t("Караваны стоят, заработок падает на пятую часть.", "Caravans stand idle; earnings fall by a fifth.") },
      normal: NORMAL,
      boom: { name: t("Торговый подъём", "Trade boom"), description: t("Лига купцов скупает всё, заработок выше на пятую часть.", "The Merchant League buys everything; earnings rise by a fifth.") }
    }
  },
  murim: {
    taxRate: 0.1,
    taxName: t("Доля клана", "Clan share"),
    livingFactor: 1,
    cycles: {
      slump: { name: t("Смутные годы", "Troubled years"), description: t("Разбой на реках, заработок падает на пятую часть.", "Banditry on the rivers; earnings fall by a fifth.") },
      normal: NORMAL,
      boom: { name: t("Мирные годы", "Peaceful years"), description: t("Конвои ходят без опаски, заработок выше на пятую часть.", "Convoys travel without fear; earnings rise by a fifth.") }
    }
  },
  xianxia: {
    taxRate: 0.1,
    taxName: t("Подношение секте", "Offering to the sect"),
    livingFactor: 0.5,
    cycles: {
      slump: { name: t("Скудная ци", "Thin qi"), description: t("Духовные жилы слабеют, травы и пилюли в цене, заработок падает на пятую часть.", "Spirit veins weaken; herbs and pills grow dear; earnings fall by a fifth.") },
      normal: NORMAL,
      boom: { name: t("Прилив ци", "Qi tide"), description: t("Духовные жилы полны, заработок выше на пятую часть.", "Spirit veins run full; earnings rise by a fifth.") }
    }
  },
  hunter: {
    taxRate: 0.15,
    taxName: t("Городской налог", "City tax"),
    livingFactor: 1.5,
    cycles: {
      slump: { name: t("Спад на рынке артефактов", "Artifact market slump"), description: t("Корпорации урезают контракты, заработок падает на пятую часть.", "Corporations cut contracts; earnings fall by a fifth.") },
      normal: NORMAL,
      boom: { name: t("Бум зачисток", "Raid boom"), description: t("Ядра монстров в цене, заработок выше на пятую часть.", "Monster cores are in demand; earnings rise by a fifth.") }
    },
    worldIncome: (state) => (state.flags.includes("awakened") && state.life.age >= 16 ? state.character.track.rank * 10 + Math.floor(meterValue(state, "fame") / 5) : 0),
    worldIncomeName: t("Зачистки Врат", "Gate raids")
  },
  academy: {
    taxRate: 0.12,
    taxName: t("Сборы короны", "Crown levies"),
    livingFactor: 1.2,
    cycles: {
      slump: { name: t("Казна пуста", "An empty treasury"), description: t("Двор урезает жалованье, заработок падает на пятую часть.", "The court cuts stipends; earnings fall by a fifth.") },
      normal: NORMAL,
      boom: { name: t("Золотой сезон", "A golden season"), description: t("Балы и заказы двора, заработок выше на пятую часть.", "Balls and court commissions; earnings rise by a fifth.") }
    }
  }
};

export function economyOf(universeId: UniverseId): WorldEconomy {
  return WORLD_ECONOMIES[universeId];
}
