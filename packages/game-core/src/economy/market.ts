// Stage 04, срез 4: рынок. У каждого мира три товара; купить или продать — действие игрока (trade), цену считает сервер.
// Цена покупки при любом состоянии хозяйства выше цены продажи при любом другом: на перепродаже золото не заработать.
// Товары золота не приносят: запас тратится по одной штуке в год на навык, шкалу мира или отношение фракции.
// Генератор случайных чисел рынок не трогает
import type { EngineContext } from "../engine/context.js";
import { applyEffect } from "../engine/effects.js";
import { record } from "../engine/record.js";
import { GameRuleError } from "../errors.js";
import { t, type LocalizedText } from "../i18n.js";
import type { Effect } from "../narrative/types.js";
import { findSkill, SKILL_MAX } from "../rpg/skills.js";
import type { GameState, UniverseId } from "../types.js";
import { getUniverse } from "../universes/registry.js";
import { ADULT_AGE, CYCLE_FACTOR } from "./economy.js";
import { regionStock, stockFactor, tradeRegion } from "./region.js";

/** Рынок открыт с этого возраста: свои деньги — с того же возраста, что и свои расходы */
export const MARKET_AGE = ADULT_AGE;
/** Запас одного товара не больше стольких штук */
export const MAX_STOCK = 20;
/** За одно действие — не больше стольких штук */
export const MAX_TRADE_QTY = 5;
/** Наценка лавки и скидка скупщика. 0.8 × 1.25 = 1: дешевле всего купить в спад ровно по базе, дороже всего продать в подъём — 0.96 базы */
export const BUY_MARKUP = 1.25;
export const SELL_DISCOUNT = 0.8;

export type GoodEffect = Extract<Effect, { type: "skill" | "meter" | "faction" }>;

export interface GoodDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Цена в обычные годы до наценки и скидки */
  base: number;
  /** Что даёт одна штука в год */
  effect: GoodEffect;
}

const good = (id: string, name: LocalizedText, description: LocalizedText, base: number, effect: GoodEffect): GoodDefinition => ({ id, name, description, base, effect });
const skill = (id: string, delta: number): GoodEffect => ({ type: "skill", id, delta });
const meter = (id: string, delta: number): GoodEffect => ({ type: "meter", id, delta });
const faction = (id: string, delta: number): GoodEffect => ({ type: "faction", id, delta });

export const WORLD_GOODS: Readonly<Record<UniverseId, readonly GoodDefinition[]>> = {
  "dark-fantasy": [
    good("chronicle", t("Старые хроники", "Old chronicles"), t("Переписанные монахами летописи падших королевств.", "Annals of the fallen kingdoms, copied by monks."), 12, skill("lore", 3)),
    good("ash-candles", t("Свечи из пепла", "Ash candles"), t("Освящённые Орденом свечи отгоняют шёпот Мглы.", "Candles blessed by the Order keep the Mist's whisper at bay."), 8, meter("corruption", -3)),
    good("order-offering", t("Дар Ордену", "An offering to the Order"), t("Масло для лампад и хлеб для паломников.", "Lamp oil and bread for the pilgrims."), 10, faction("order-of-ash", 3))
  ],
  isekai: [
    good("spell-scroll", t("Свиток заклинаний", "Spell scroll"), t("Учебный свиток из лавки магов: одно заклинание, разобранное по слогам.", "A study scroll from the mages' shop: one spell, broken down syllable by syllable."), 12, skill("spellcraft", 3)),
    good("system-crystal", t("Кристалл Системы", "System crystal"), t("Осколок, который Хор Системы принимает как подношение.", "A shard the System Choir accepts as an offering."), 10, meter("system-favor", 3)),
    good("guild-gift", t("Подарок Гильдии", "A gift for the Guild"), t("Бочонок эля для зала искателей — лучший способ запомниться.", "A cask of ale for the adventurers' hall — the best way to be remembered."), 10, faction("guild", 3))
  ],
  murim: [
    good("martial-manual", t("Трактат о кулачном бое", "A fist-fighting treatise"), t("Пожелтевшие страницы с приёмами забытой школы.", "Yellowed pages with the techniques of a forgotten school."), 12, skill("martial-arts", 3)),
    good("calming-tea", t("Успокаивающий чай", "Calming tea"), t("Горький сбор лекарей: ци течёт ровнее.", "The physicians' bitter blend: qi flows more evenly."), 8, meter("qi-deviation", -3)),
    good("alms", t("Милостыня", "Alms"), t("Рис и медяки для нищих у реки. Секта нищих помнит каждого.", "Rice and coppers for the beggars by the river. The Beggars' Sect remembers everyone."), 6, faction("beggars-sect", 3))
  ],
  xianxia: [
    good("jade-slip", t("Нефритовая табличка", "Jade slip"), t("Запись чужого постижения: вложи дух и прочти.", "A record of another's insight: pour in your spirit and read."), 14, skill("cultivation", 3)),
    good("incense", t("Благовония покоя", "Incense of stillness"), t("Дым помогает сердцу Дао оставаться ясным.", "The smoke helps the Dao heart stay clear."), 10, meter("dao-heart", 3)),
    good("mortal-tribute", t("Дань двору", "Tribute to the court"), t("Шёлк и чай для чиновников смертного императора.", "Silk and tea for the mortal emperor's officials."), 8, faction("mortal-court", 3))
  ],
  hunter: [
    good("training-sim", t("Час на симуляторе", "Simulator hours"), t("Абонемент на тренировочный стенд Ассоциации.", "A pass to the Association's training rig."), 14, skill("dungeon-combat", 3)),
    good("stream-promo", t("Продвижение трансляций", "Stream promotion"), t("Реклама канала: о зачистках узнает больше зрителей.", "Channel ads: more viewers will hear of your raids."), 10, meter("fame", 3)),
    good("association-dues", t("Взнос Ассоциации", "Association dues"), t("Добровольный взнос в фонд пострадавших от Врат.", "A voluntary contribution to the Gate victims' fund."), 10, faction("association", 3))
  ],
  academy: [
    good("grimoire", t("Гримуар", "Grimoire"), t("Конспекты лекций Башни магов в кожаном переплёте.", "Lecture notes from the Magic Tower, bound in leather."), 14, skill("arcana", 3)),
    good("discretion", t("Услуги поверенного", "A solicitor's services"), t("Поверенный следит, чтобы слухи не дошли до газет.", "A solicitor makes sure the rumours never reach the papers."), 12, meter("scandal", -3)),
    good("salon-gift", t("Подарок для салона", "A gift for the salon"), t("Редкие цветы для хозяйки салона Общества Розы.", "Rare flowers for the hostess of a Rose Society salon."), 10, faction("rose-society", 3))
  ]
};

export function goodsOf(universeId: UniverseId): readonly GoodDefinition[] {
  return WORLD_GOODS[universeId];
}

export function findGood(universeId: UniverseId, id: string): GoodDefinition | undefined {
  return WORLD_GOODS[universeId].find((g) => g.id === id);
}

/**
 * Цены сейчас: база товара, состояние хозяйства и склад края.
 * Пустой склад дороже полного, но покупка при любом складе и цикле остаётся дороже продажи:
 * скидка 0.8 и наценка 1.25 шире, чем размах склада (economy/region.ts)
 */
export function pricesOf(state: GameState, good: GoodDefinition): { buy: number; sell: number } {
  const factor = CYCLE_FACTOR[state.economy.cycle] * stockFactor(regionStock(state, good.id));
  return { buy: Math.ceil(good.base * factor * BUY_MARKUP), sell: Math.max(0, Math.floor(good.base * factor * SELL_DISCOUNT)) };
}

/** Даст ли товар что-нибудь в этом году: навык не на пределе, шкала и отношение могут сдвинуться */
function useful(state: GameState, effect: GoodEffect): boolean {
  const c = state.character;
  if (effect.type === "skill") return (c.skills[effect.id] ?? 0) < SKILL_MAX;
  if (effect.type === "faction") {
    const value = c.factions[effect.id] ?? 0;
    return effect.delta > 0 ? value < 100 : value > -100;
  }
  const definition = getUniverse(c.universeId).meters.find((m) => m.id === effect.id);
  if (!definition) return false;
  const value = state.meters[effect.id] ?? definition.initial;
  return effect.delta > 0 ? value < definition.max : value > definition.min;
}

function changeStock(ctx: EngineContext, id: string, delta: number): void {
  const goods = ctx.state.economy.goods;
  const next = (goods[id] ?? 0) + delta;
  if (next > 0) goods[id] = next;
  else delete goods[id];
  record(ctx, { kind: "good", key: id, delta });
}

/** Годовой расход запасов: по одной штуке каждого товара, если она что-то даст. Вызывается из годового цикла после счетов */
export function consumeGoods(ctx: EngineContext): void {
  const state = ctx.state;
  for (const item of goodsOf(state.character.universeId)) {
    if ((state.economy.goods[item.id] ?? 0) <= 0 || !useful(state, item.effect)) continue;
    changeStock(ctx, item.id, -1);
    applyEffect(ctx, item.effect);
  }
}

export interface TradeOutcome {
  title: LocalizedText;
  text: LocalizedText;
}

/**
 * Купить или продать. Клиент называет только товар, сторону и количество: цену, остаток золота и запас считает сервер.
 * Нельзя: при событии без ответа, до MARKET_AGE лет, без денег, сверх запаса, продать больше, чем есть
 */
export function trade(ctx: EngineContext, goodId: string, side: "buy" | "sell", qty: number): TradeOutcome {
  const state = ctx.state;
  if (state.pending) throw new GameRuleError("EVENT_PENDING", "Сначала ответьте на событие");
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_TRADE_QTY) throw new GameRuleError("INVALID_INPUT", `Можно от 1 до ${MAX_TRADE_QTY} штук за раз`);
  const item = findGood(state.character.universeId, goodId);
  if (!item) throw new GameRuleError("INVALID_INPUT", "Такого товара нет на рынке этого мира");
  if (state.life.age < MARKET_AGE) throw new GameRuleError("CHOICE_LOCKED", `Торговать можно с ${MARKET_AGE} лет`);
  const prices = pricesOf(state, item);
  const stock = state.economy.goods[item.id] ?? 0;
  if (side === "buy") {
    const cost = prices.buy * qty;
    if (state.character.wealth < cost) throw new GameRuleError("CHOICE_LOCKED", "Не хватает золота");
    if (stock + qty > MAX_STOCK) throw new GameRuleError("CHOICE_LOCKED", `Больше ${MAX_STOCK} штук не хранится`);
    applyEffect(ctx, { type: "wealth", delta: -cost });
    changeStock(ctx, item.id, qty);
    tradeRegion(state, item.id, "buy", qty);
    return {
      title: t("Рынок", "Market"),
      text: t(`Куплено: ${item.name.ru} × ${qty} за ${cost} золота.`, `Bought: ${item.name.en} × ${qty} for ${cost} gold.`)
    };
  }
  if (stock < qty) throw new GameRuleError("CHOICE_LOCKED", "Столько этого товара нет");
  const income = prices.sell * qty;
  changeStock(ctx, item.id, -qty);
  applyEffect(ctx, { type: "wealth", delta: income });
  tradeRegion(state, item.id, "sell", qty);
  return {
    title: t("Рынок", "Market"),
    text: t(`Продано: ${item.name.ru} × ${qty} за ${income} золота.`, `Sold: ${item.name.en} × ${qty} for ${income} gold.`)
  };
}

// ——— Представление для клиента ———

export interface GoodView {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Что даёт одна штука в год */
  effect: LocalizedText;
  stock: number;
  buy: number;
  sell: number;
  canBuy: boolean;
  canSell: boolean;
}

export interface MarketView {
  /** Можно ли торговать прямо сейчас */
  open: boolean;
  /** Почему закрыто: возраст, конец жизни, событие ждёт ответа */
  closed: "age" | "dead" | "pending" | null;
  minAge: number;
  maxStock: number;
  goods: GoodView[];
}

function effectText(universeId: UniverseId, effect: GoodEffect): LocalizedText {
  const universe = getUniverse(universeId);
  const sign = effect.delta > 0 ? `+${effect.delta}` : String(effect.delta);
  const name =
    effect.type === "skill"
      ? (findSkill(universe, effect.id)?.name ?? t(effect.id, effect.id))
      : effect.type === "meter"
        ? (universe.meters.find((m) => m.id === effect.id)?.name ?? t(effect.id, effect.id))
        : (universe.factions.find((f) => f.id === effect.id)?.name ?? t(effect.id, effect.id));
  return t(`${name.ru} ${sign} в год`, `${name.en} ${sign} a year`);
}

export function presentMarket(state: GameState): MarketView {
  const universeId = state.character.universeId;
  const closed = !state.life.alive ? "dead" : state.life.age < MARKET_AGE ? "age" : state.pending ? "pending" : null;
  return {
    open: closed === null,
    closed,
    minAge: MARKET_AGE,
    maxStock: MAX_STOCK,
    goods: goodsOf(universeId).map((item) => {
      const prices = pricesOf(state, item);
      const stock = state.economy.goods[item.id] ?? 0;
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        effect: effectText(universeId, item.effect),
        stock,
        buy: prices.buy,
        sell: prices.sell,
        canBuy: closed === null && state.character.wealth >= prices.buy && stock < MAX_STOCK,
        canSell: closed === null && stock > 0
      };
    })
  };
}
