import { Prisma } from "@endemion/database";
import {
  MARKET_AGE,
  MAX_STOCK,
  MAX_TRADE_QTY,
  findGood,
  isUniverseId,
  parseSave,
  type GameState,
  type HistoryEntry,
  type LocalizedText,
  type UniverseId
} from "@endemion/game-core";
import {
  lifeStatus,
  toLifeView,
  type LifeMeta,
  type LifeView
} from "@endemion/shared";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { PrismaService } from "../prisma/prisma.service.js";

type Tx = Prisma.TransactionClient;

export const MAX_ACTIVE_OFFERS = 8;
export const OFFER_TTL_MS = 72 * 60 * 60 * 1000;
export const MARKET_PAGE = 50;
export const MARKET_PRICE_MAX = 1_000_000_000;

export interface MarketOfferView {
  id: string;
  universeId: string;
  goodId: string;
  goodName: LocalizedText;
  qty: number;
  unitPrice: number;
  total: number;
  status: "active" | "sold" | "cancelled" | "expired";
  sellerPlayerId: string;
  sellerName: string;
  sellerLifeId: string;
  sellerLifeName: string;
  mine: boolean;
  createdAt: string;
  expiresAt: string;
  soldAt: string | null;
}

export interface MarketBoardView {
  universeId: string;
  offers: MarketOfferView[];
  mine: MarketOfferView[];
  at: string;
}

export interface MarketTradeView {
  id: string;
  offerId: string;
  goodId: string;
  qty: number;
  unitPrice: number;
  total: number;
  sellerLifeId: string;
  buyerLifeId: string;
  createdAt: string;
}

export interface CreateOfferInput {
  actionId: string;
  lifeId: string;
  goodId: string;
  qty: number;
  unitPrice: number;
  expectedVersion: number;
}

export interface BuyOfferInput {
  actionId: string;
  buyerLifeId: string;
  expectedVersion: number;
}

export interface CancelOfferInput {
  expectedVersion: number;
}

interface LifeRow {
  id: string;
  name: string;
  status: string;
  version: number;
  age: number;
  schemaVersion: number;
  state: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const nameOf = (player: { idUsername: string | null; idDisplayName: string | null }): string =>
  player.idDisplayName?.trim() || player.idUsername?.trim() || "Endemion";

const meta = (row: Pick<LifeRow, "id" | "createdAt" | "updatedAt">): LifeMeta => ({
  id: row.id,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

const json = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const nowIso = (): string => new Date().toISOString();

const totalOf = (qty: number, unitPrice: number): number => qty * unitPrice;

const offerStatus = (value: string): MarketOfferView["status"] =>
  value === "sold" || value === "cancelled" || value === "expired" ? value : "active";

/** Copies the persisted state columns a life write must keep in sync. */
const lifeColumns = (state: GameState) => ({
  name: state.character.name,
  status: lifeStatus(state),
  version: state.version,
  age: state.life.age,
  schemaVersion: state.schemaVersion,
  state: json(state)
});

@Injectable()
export class MarketService {
  private readonly db;

  constructor(@Inject(PrismaService) prisma: PrismaService) {
    this.db = prisma.client;
  }

  async board(universeId: UniverseId, playerId: string | null): Promise<MarketBoardView> {
    await this.expire();
    const rows = await this.db.marketOffer.findMany({
      where: { universeId, status: "active", expiresAt: { gt: new Date() } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MARKET_PAGE,
      include: {
        seller: { select: { id: true, idUsername: true, idDisplayName: true } },
        sellerLife: { select: { id: true, name: true } }
      }
    });
    const mine = playerId
      ? await this.db.marketOffer.findMany({
          where: { sellerPlayerId: playerId, universeId, status: { in: ["active", "sold", "cancelled", "expired"] } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: MARKET_PAGE,
          include: {
            seller: { select: { id: true, idUsername: true, idDisplayName: true } },
            sellerLife: { select: { id: true, name: true } }
          }
        })
      : [];
    return {
      universeId,
      offers: rows.map((row) => this.offerView(row, playerId)),
      mine: mine.map((row) => this.offerView(row, playerId)),
      at: nowIso()
    };
  }

  async create(playerId: string, input: CreateOfferInput): Promise<{ offer: MarketOfferView; replayed: boolean }> {
    return this.db.$transaction(async (tx) => {
      const replay = await tx.marketOffer.findUnique({
        where: { sellerLifeId_actionId: { sellerLifeId: input.lifeId, actionId: input.actionId } },
        include: {
          seller: { select: { id: true, idUsername: true, idDisplayName: true } },
          sellerLife: { select: { id: true, name: true } }
        }
      });
      if (replay) {
        if (replay.sellerPlayerId !== playerId || replay.goodId !== input.goodId || replay.qty !== input.qty || replay.unitPrice !== input.unitPrice) {
          throw new ApiError(409, "ACTION_ID_REUSED", "Этот идентификатор действия уже использован.");
        }
        return { offer: this.offerView(replay, playerId), replayed: true };
      }

      const row = await this.lockLife(tx, playerId, input.lifeId);
      if (row.version !== input.expectedVersion) {
        throw new ApiError(409, "VERSION_CONFLICT", "Состояние жизни изменилось. Обновите страницу.");
      }
      const state = parseSave(row.state);
      if (!state.life.alive) throw new ApiError(409, "LIFE_ENDED", "Жизнь уже завершена.");
      if (state.life.age < MARKET_AGE) throw new ApiError(409, "LIFE_NOT_ADULT", "Торговать можно только совершеннолетним.");
      if (!findGood(state.character.universeId, input.goodId)) {
        throw new ApiError(400, "UNKNOWN_GOOD", "Такого товара нет в этом мире.");
      }
      if (input.qty < 1 || input.qty > MAX_TRADE_QTY) {
        throw new ApiError(400, "VALIDATION", `Партия должна быть от 1 до ${MAX_TRADE_QTY}.`);
      }
      if (input.unitPrice < 1 || input.unitPrice > MARKET_PRICE_MAX) {
        throw new ApiError(400, "VALIDATION", "Некорректная цена.");
      }
      for (const [goodId, stock] of Object.entries(state.economy.goods)) {
        if (!Number.isInteger(stock) || stock < 0) {
          throw new ApiError(409, "INVALID_SAVE", "Некорректный запас товаров.");
        }
        if (goodId === input.goodId && stock < input.qty) {
          throw new ApiError(409, "INSUFFICIENT_GOODS", "На складе недостаточно товара для этой партии.");
        }
      }
      if ((state.economy.goods[input.goodId] ?? 0) < input.qty) {
        throw new ApiError(409, "INSUFFICIENT_GOODS", "На складе недостаточно товара для этой партии.");
      }

      await this.expireIn(tx);
      const active = await tx.marketOffer.count({
        where: { sellerPlayerId: playerId, status: "active", expiresAt: { gt: new Date() } }
      });
      if (active >= MAX_ACTIVE_OFFERS) {
        throw new ApiError(409, "OFFER_LIMIT", `Не больше ${MAX_ACTIVE_OFFERS} активных предложений.`);
      }

      const created = await tx.marketOffer.create({
        data: {
          sellerPlayerId: playerId,
          sellerLifeId: input.lifeId,
          universeId: state.character.universeId,
          goodId: input.goodId,
          qty: input.qty,
          unitPrice: input.unitPrice,
          actionId: input.actionId,
          sellerVersion: row.version,
          expiresAt: new Date(Date.now() + OFFER_TTL_MS)
        },
        include: {
          seller: { select: { id: true, idUsername: true, idDisplayName: true } },
          sellerLife: { select: { id: true, name: true } }
        }
      });
      return { offer: this.offerView(created, playerId), replayed: false };
    });
  }

  async buy(playerId: string, offerId: string, input: BuyOfferInput): Promise<{ trade: MarketTradeView; life: LifeView; offer: MarketOfferView; replayed: boolean }> {
    return this.db.$transaction(async (tx) => {
      const replay = await tx.marketTrade.findUnique({
        where: { buyerLifeId_buyerActionId: { buyerLifeId: input.buyerLifeId, buyerActionId: input.actionId } },
        include: { offer: { include: { seller: true, sellerLife: true } } }
      });
      if (replay) {
        if (replay.buyerPlayerId !== playerId || replay.offerId !== offerId) {
          throw new ApiError(409, "ACTION_ID_REUSED", "Этот идентификатор действия уже использован.");
        }
        const row = await tx.life.findUniqueOrThrow({ where: { id: input.buyerLifeId } });
        const state = parseSave(row.state);
        return {
          trade: this.tradeView(replay),
          life: toLifeView(meta(row), state),
          offer: this.offerView(replay.offer, playerId),
          replayed: true
        };
      }

      const offerRow = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM market_offers WHERE id = ${offerId}::uuid FOR UPDATE
      `;
      if (offerRow.length === 0) throw new ApiError(404, "NOT_FOUND", "Предложение не найдено.");
      await this.expireIn(tx);
      const offer = await tx.marketOffer.findUniqueOrThrow({
        where: { id: offerId },
        include: { seller: true, sellerLife: true }
      });
      if (offer.status !== "active" || offer.expiresAt.getTime() <= Date.now()) {
        throw new ApiError(409, "OFFER_CLOSED", "Предложение больше не действует.");
      }
      if (offer.sellerPlayerId === playerId) throw new ApiError(409, "SELF_TRADE", "Нельзя купить собственное предложение.");

      const firstId = input.buyerLifeId < offer.sellerLifeId ? input.buyerLifeId : offer.sellerLifeId;
      const secondId = input.buyerLifeId < offer.sellerLifeId ? offer.sellerLifeId : input.buyerLifeId;
      await tx.$queryRaw`SELECT id FROM lives WHERE id = ${firstId}::uuid FOR UPDATE`;
      if (firstId !== secondId) await tx.$queryRaw`SELECT id FROM lives WHERE id = ${secondId}::uuid FOR UPDATE`;
      const buyerRow = await tx.life.findUnique({ where: { id: input.buyerLifeId } });
      if (!buyerRow || buyerRow.playerId !== playerId) {
        throw new ApiError(404, "NOT_FOUND", "Жизнь не найдена.");
      }
      const sellerRow = await tx.life.findUniqueOrThrow({ where: { id: offer.sellerLifeId } });

      if (buyerRow.version !== input.expectedVersion) {
        throw new ApiError(409, "VERSION_CONFLICT", "Состояние жизни изменилось. Обновите страницу.");
      }
      if (buyerRow.status !== "alive") throw new ApiError(409, "LIFE_ENDED", "Жизнь уже завершена.");
      if (sellerRow.status !== "alive") throw new ApiError(409, "LIFE_ENDED", "Продавец больше не может торговать.");
      const buyerState = parseSave(buyerRow.state);
      const sellerState = parseSave(sellerRow.state);
      if (buyerState.life.age < MARKET_AGE) throw new ApiError(409, "LIFE_NOT_ADULT", "Торговать можно только совершеннолетним.");
      if (sellerState.character.universeId !== buyerState.character.universeId) {
        throw new ApiError(409, "OFFER_CLOSED", "Продавец и покупатель из разных миров.");
      }
      if (!findGood(buyerState.character.universeId, offer.goodId)) {
        throw new ApiError(409, "UNKNOWN_GOOD", "Товар больше не существует в этом мире.");
      }
      const stock = sellerState.economy.goods[offer.goodId] ?? 0;
      if (stock < offer.qty) throw new ApiError(409, "INSUFFICIENT_GOODS", "У продавца уже нет этого товара.");
      const total = totalOf(offer.qty, offer.unitPrice);
      if (buyerState.character.wealth < total) {
        throw new ApiError(409, "INSUFFICIENT_WEALTH", "Недостаточно золота для покупки.");
      }
      const buyerStock = buyerState.economy.goods[offer.goodId] ?? 0;
      if (buyerStock + offer.qty > MAX_STOCK) {
        throw new ApiError(409, "BUYER_STOCK_FULL", "На вашем складе не хватит места.");
      }

      sellerState.economy.goods[offer.goodId] = stock - offer.qty;
      buyerState.economy.goods[offer.goodId] = buyerStock + offer.qty;
      buyerState.character.wealth -= total;
      sellerState.character.wealth = Math.min(1_000_000_000, sellerState.character.wealth + total);
      buyerState.version += 1;
      sellerState.version += 1;

      await this.alignHistoryHead(tx, input.buyerLifeId, buyerState);
      await this.alignHistoryHead(tx, offer.sellerLifeId, sellerState);
      const tradedAt = new Date();
      const trade = await tx.marketTrade.create({
        data: {
          offerId: offer.id,
          universeId: offer.universeId,
          goodId: offer.goodId,
          qty: offer.qty,
          unitPrice: offer.unitPrice,
          total,
          sellerPlayerId: offer.sellerPlayerId,
          sellerLifeId: offer.sellerLifeId,
          buyerPlayerId: playerId,
          buyerLifeId: input.buyerLifeId,
          buyerActionId: input.actionId,
          sellerVersionAfter: sellerState.version,
          buyerVersionAfter: buyerState.version,
          createdAt: tradedAt
        }
      });

      const buyerEntry = this.entry(
        buyerState,
        this.entryText("Покупка на рынке", "Purchase at the market", `${offer.goodId} × ${offer.qty} за ${total} золота`, `${offer.goodId} × ${offer.qty} for ${total} gold`),
        [{ kind: "wealth", delta: -total }, { kind: "good", key: offer.goodId, delta: offer.qty }]
      );
      const sellerEntry = this.entry(
        sellerState,
        this.entryText("Продажа на рынке", "Sale at the market", `${offer.goodId} × ${offer.qty} за ${total} золота`, `${offer.goodId} × ${offer.qty} for ${total} gold`),
        [{ kind: "wealth", delta: total }, { kind: "good", key: offer.goodId, delta: -offer.qty }]
      );

      await tx.marketOffer.update({
        where: { id: offer.id },
        data: { status: "sold", soldAt: tradedAt }
      });
      const buyerUpdated = await tx.life.update({ where: { id: input.buyerLifeId }, data: lifeColumns(buyerState) });
      await tx.life.update({ where: { id: offer.sellerLifeId }, data: lifeColumns(sellerState) });
      await this.writeEntry(tx, input.buyerLifeId, buyerEntry);
      await this.writeEntry(tx, offer.sellerLifeId, sellerEntry);
      await this.writeSnapshot(tx, input.buyerLifeId, buyerState);
      await this.writeSnapshot(tx, offer.sellerLifeId, sellerState);
      await tx.marketLedger.createMany({
        data: [
          { tradeId: trade.id, playerId, lifeId: input.buyerLifeId, kind: "gold", amount: -total, balanceAfter: buyerState.character.wealth },
          { tradeId: trade.id, playerId, lifeId: input.buyerLifeId, kind: "goods", amount: offer.qty, balanceAfter: buyerState.economy.goods[offer.goodId] ?? 0 },
          { tradeId: trade.id, playerId: offer.sellerPlayerId, lifeId: offer.sellerLifeId, kind: "gold", amount: total, balanceAfter: sellerState.character.wealth },
          { tradeId: trade.id, playerId: offer.sellerPlayerId, lifeId: offer.sellerLifeId, kind: "goods", amount: -offer.qty, balanceAfter: sellerState.economy.goods[offer.goodId] ?? 0 }
        ]
      });

      const soldOffer = await tx.marketOffer.findUniqueOrThrow({
        where: { id: offer.id },
        include: { seller: { select: { id: true, idUsername: true, idDisplayName: true } }, sellerLife: { select: { id: true, name: true } } }
      });
      return {
        trade: this.tradeView(trade),
        life: toLifeView(meta(buyerUpdated), buyerState),
        offer: this.offerView(soldOffer, playerId),
        replayed: false
      };
    });
  }

  async cancel(playerId: string, offerId: string, input: CancelOfferInput): Promise<{ offer: MarketOfferView; replayed: boolean }> {
    return this.db.$transaction(async (tx) => {
      const offer = await tx.marketOffer.findUnique({
        where: { id: offerId },
        include: { seller: { select: { id: true, idUsername: true, idDisplayName: true } }, sellerLife: { select: { id: true, name: true } } }
      });
      if (!offer) throw new ApiError(404, "NOT_FOUND", "Предложение не найдено.");
      if (offer.sellerPlayerId !== playerId) throw new ApiError(403, "FORBIDDEN", "Это не ваше предложение.");
      if (offer.status === "sold") throw new ApiError(409, "OFFER_CLOSED", "Предложение уже продано.");
      if (offer.status === "cancelled" || offer.status === "expired") {
        return { offer: this.offerView(offer, playerId), replayed: true };
      }
      const row = await this.lockLife(tx, playerId, offer.sellerLifeId);
      if (row.version !== input.expectedVersion) {
        throw new ApiError(409, "VERSION_CONFLICT", "Состояние жизни изменилось. Обновите страницу.");
      }
      const updated = await tx.marketOffer.update({
        where: { id: offerId },
        data: { status: "cancelled" },
        include: { seller: { select: { id: true, idUsername: true, idDisplayName: true } }, sellerLife: { select: { id: true, name: true } } }
      });
      return { offer: this.offerView(updated, playerId), replayed: false };
    });
  }

  /** Closes every live offer of a life whose owner died. Called from succession. */
  async cancelOffersForLife(tx: Tx, lifeId: string): Promise<number> {
    const result = await tx.marketOffer.updateMany({
      where: { sellerLifeId: lifeId, status: "active" },
      data: { status: "cancelled" }
    });
    return result.count;
  }

  /** Rejects a restore that would roll back across a completed trade. */
  async assertRestorable(tx: Tx, lifeId: string, targetVersion: number): Promise<void> {
    const trade = await tx.marketTrade.findFirst({
      where: {
        OR: [{ sellerLifeId: lifeId }, { buyerLifeId: lifeId }],
        AND: [{ OR: [{ sellerLifeId: lifeId, sellerVersionAfter: { gt: targetVersion } }, { buyerLifeId: lifeId, buyerVersionAfter: { gt: targetVersion } }] }]
      },
      select: { id: true }
    });
    if (trade) {
      throw new ApiError(409, "MARKET_RESTORE_BLOCKED", "Нельзя откатить жизнь до завершённой сделки на рынке.");
    }
  }

  private async expire(): Promise<void> {
    await this.expireIn(this.db);
  }

  private async expireIn(db: Pick<Tx, "marketOffer">): Promise<void> {
    await db.marketOffer.updateMany({
      where: { status: "active", expiresAt: { lte: new Date() } },
      data: { status: "expired" }
    });
  }

  private async lockLife(tx: Tx, playerId: string, lifeId: string): Promise<LifeRow> {
    const rows = await tx.$queryRaw<LifeRow[]>`
      SELECT id, name, status, version, age, schema_version AS "schemaVersion", state, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM lives WHERE id = ${lifeId}::uuid AND player_id = ${playerId}::uuid FOR UPDATE
    `;
    const row = rows[0];
    if (!row) throw new ApiError(404, "NOT_FOUND", "Жизнь не найдена.");
    return row;
  }

  private async alignHistoryHead(tx: Tx, lifeId: string, state: GameState): Promise<void> {
    const head = await tx.historyEntry.aggregate({ where: { lifeId }, _max: { seq: true } });
    const next = (head._max.seq ?? 0) + 1;
    if (state.nextSeq < next) state.nextSeq = next;
  }

  private async writeEntry(tx: Tx, lifeId: string, entry: HistoryEntry): Promise<void> {
    await tx.historyEntry.create({
      data: { lifeId, seq: entry.seq, age: entry.age, kind: entry.kind, data: json(entry) }
    });
  }

  private async writeSnapshot(tx: Tx, lifeId: string, state: GameState): Promise<void> {
    await tx.lifeSnapshot.create({
      data: { lifeId, version: state.version, age: state.life.age, reason: "action", state: json(state) }
    });
    await tx.lifeSnapshot.deleteMany({
      where: { lifeId, version: { lte: state.version - 50 } }
    });
  }

  private entry(state: GameState, text: { title: LocalizedText; text: LocalizedText }, changes: HistoryEntry["changes"]): HistoryEntry {
    return {
      seq: state.nextSeq++,
      age: state.life.age,
      kind: "market",
      title: text.title,
      text: text.text,
      changes
    };
  }

  private entryText(titleRu: string, titleEn: string, detailRu: string, detailEn: string): { title: LocalizedText; text: LocalizedText } {
    return {
      title: { ru: titleRu, en: titleEn },
      text: { ru: detailRu, en: detailEn }
    };
  }

  private offerView(
    row: {
      id: string;
      universeId: string;
      goodId: string;
      qty: number;
      unitPrice: number;
      status: string;
      sellerPlayerId: string;
      sellerLifeId: string;
      createdAt: Date;
      expiresAt: Date;
      soldAt: Date | null;
      seller: { idUsername: string | null; idDisplayName: string | null };
      sellerLife: { name: string };
    },
    playerId: string | null
  ): MarketOfferView {
    const good = isUniverseId(row.universeId) ? findGood(row.universeId, row.goodId) : null;
    return {
      id: row.id,
      universeId: row.universeId,
      goodId: row.goodId,
      goodName: good?.name ?? { ru: row.goodId, en: row.goodId },
      qty: row.qty,
      unitPrice: row.unitPrice,
      total: totalOf(row.qty, row.unitPrice),
      status: offerStatus(row.status),
      sellerPlayerId: row.sellerPlayerId,
      sellerName: nameOf(row.seller),
      sellerLifeId: row.sellerLifeId,
      sellerLifeName: row.sellerLife.name,
      mine: playerId !== null && row.sellerPlayerId === playerId,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      soldAt: row.soldAt ? row.soldAt.toISOString() : null
    };
  }

  private tradeView(row: {
    id: string;
    offerId: string;
    goodId: string;
    qty: number;
    unitPrice: number;
    total: number;
    sellerLifeId: string;
    buyerLifeId: string;
    createdAt: Date;
  }): MarketTradeView {
    return {
      id: row.id,
      offerId: row.offerId,
      goodId: row.goodId,
      qty: row.qty,
      unitPrice: row.unitPrice,
      total: row.total,
      sellerLifeId: row.sellerLifeId,
      buyerLifeId: row.buyerLifeId,
      createdAt: row.createdAt.toISOString()
    };
  }
}
