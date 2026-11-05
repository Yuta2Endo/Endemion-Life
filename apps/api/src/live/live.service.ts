// Stage 15: живые окна. Срок в базе, не в таймере процесса. Переход и вклад — одна транзакция.
import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@endemion/database";
import {
  canClaim,
  canMove,
  dueStatus,
  isLiveStatus,
  joinBlock,
  LIVE_TEMPLATES,
  parseSave,
  WEALTH_MAX,
  type GameState,
  type LiveStatus
} from "@endemion/game-core";
import { Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/api-error.js";
import { InsightsService } from "../insights/insights.service.js";
import { MAX_SNAPSHOTS } from "../lives/lives.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

type Tx = Prisma.TransactionClient;

const GOLD_CAP = 500;
const TITLE_MAX = 80;
const TEXT_MAX = 400;

export interface LiveInput {
  titleRu: string;
  titleEn: string;
  textRu: string;
  textEn: string;
  worlds: string[];
  minAge: number;
  goal: number;
  perLife: number;
  gold: number;
  startsAt: string;
  endsAt: string;
}

export interface LiveCard {
  id: string;
  templateId: string | null;
  status: LiveStatus;
  title: { ru: string; en: string };
  text: { ru: string; en: string };
  worlds: string[];
  minAge: number;
  goal: number;
  perLife: number;
  gold: number;
  progress: number;
  startsAt: string;
  endsAt: string;
}

export interface LiveMine {
  windowId: string;
  lifeId: string;
  count: number;
  claimed: boolean;
}

interface WindowRow {
  id: string;
  templateId: string | null;
  slotKey: string | null;
  titleRu: string;
  titleEn: string;
  textRu: string;
  textEn: string;
  status: string;
  worlds: string;
  minAge: number;
  goal: number;
  perLife: number;
  gold: number;
  flag: string;
  progress: number;
  startsAt: Date;
  endsAt: Date;
}

function worldsOf(raw: string): string[] {
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

function cardOf(row: WindowRow): LiveCard {
  return {
    id: row.id,
    templateId: row.templateId,
    status: row.status as LiveStatus,
    title: { ru: row.titleRu, en: row.titleEn },
    text: { ru: row.textRu, en: row.textEn },
    worlds: worldsOf(row.worlds),
    minAge: row.minAge,
    goal: row.goal,
    perLife: row.perLife,
    gold: row.gold,
    progress: row.progress,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString()
  };
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class LiveService {
  private readonly db: PrismaClient;

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(InsightsService) private readonly insights: InsightsService
  ) {
    this.db = prisma.client;
  }

  /** Просроченные окна сами открываются и закрываются. Повтор безопасен: переход только из прежнего состояния */
  async sweep(now = new Date()): Promise<number> {
    const rows = await this.db.liveWindow.findMany({
      where: { status: { in: ["scheduled", "active"] } },
      take: 50
    });
    let moved = 0;
    for (const row of rows) {
      if (!isLiveStatus(row.status)) continue;
      const next = dueStatus(row.status, row.startsAt.getTime(), row.endsAt.getTime(), now.getTime());
      if (next === row.status) continue;
      const updated = await this.db.liveWindow.updateMany({ where: { id: row.id, status: row.status }, data: { status: next } });
      if (updated.count === 1) {
        await this.db.liveLog.create({ data: { windowId: row.id, actor: "clock", from: row.status, to: next, note: "срок" } });
        moved += 1;
      }
    }
    return moved;
  }

  async board(playerId: string): Promise<{ windows: LiveCard[]; mine: LiveMine[] }> {
    await this.sweep();
    await this.ensureTemplates();
    const rows = await this.db.liveWindow.findMany({
      where: { status: { in: ["scheduled", "active", "completed"] } },
      orderBy: { startsAt: "desc" },
      take: 20
    });
    const parts = await this.db.livePart.findMany({
      where: { playerId, windowId: { in: rows.map((row) => row.id) } }
    });
    return {
      windows: rows.map(cardOf),
      mine: parts.map((part) => ({ windowId: part.windowId, lifeId: part.lifeId, count: part.count, claimed: part.claimedAt !== null }))
    };
  }

  /** Шаблоны текущего дня и недели. Тот же слот не создаёт вторую строку */
  private async ensureTemplates(now = Date.now()): Promise<void> {
    for (const template of LIVE_TEMPLATES) {
      const slotKey = template.slotKey(now);
      const found = await this.db.liveWindow.findUnique({ where: { slotKey } });
      if (found) continue;
      const span = template.window(now);
      try {
        await this.db.liveWindow.create({
          data: {
            templateId: template.id,
            slotKey,
            titleRu: template.title.ru,
            titleEn: template.title.en,
            textRu: template.text.ru,
            textEn: template.text.en,
            status: "scheduled",
            worlds: template.worlds.join(","),
            minAge: template.minAge,
            goal: template.goal,
            perLife: template.perLife,
            gold: template.gold,
            flag: `live.${template.id}`,
            startsAt: new Date(span.start),
            endsAt: new Date(span.end)
          }
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      }
    }
  }

  async contribute(playerId: string, windowId: string, lifeId: string): Promise<{ progress: number; count: number; counted: boolean }> {
    await this.sweep();
    const result = await this.db.$transaction(async (tx) => {
      const row = await this.lockWindow(tx, windowId);
      const status = this.fresh(row);
      if (status !== "active") throw new ApiError(409, "FORBIDDEN", "Окно сейчас закрыто");
      const life = await this.ownLife(tx, playerId, lifeId);
      const part = await tx.livePart.findUnique({ where: { windowId_lifeId: { windowId, lifeId } } });
      if (part?.lastAge === life.life.age) {
        return { progress: row.progress, count: part.count, counted: false, world: "", age: 0, level: 0 };
      }
      const block = joinBlock(
        {
          minAge: row.minAge,
          goal: row.goal,
          perLife: row.perLife,
          pending: life.pending !== null,
          alive: life.life.alive,
          age: life.life.age,
          universeId: life.character.universeId
        },
        worldsOf(row.worlds),
        part?.count ?? 0
      );
      if (block) throw new ApiError(409, "FORBIDDEN", block);
      const count = (part?.count ?? 0) + 1;
      await tx.livePart.upsert({
        where: { windowId_lifeId: { windowId, lifeId } },
        create: { windowId, playerId, lifeId, count, lastAge: life.life.age },
        update: { count, lastAge: life.life.age }
      });
      const progress = row.progress + 1;
      await tx.liveWindow.update({ where: { id: windowId }, data: { progress } });
      return { progress, count, counted: true, world: life.character.universeId, age: life.life.age, level: life.character.level };
    });
    if (result.counted) {
      await this.insights.note({ name: "live.joined", world: result.world, age: result.age, level: result.level, amount: 1, ref: `${windowId}:${lifeId}` });
    }
    return { progress: result.progress, count: result.count, counted: result.counted };
  }

  /**
   * Награда один раз на жизнь. Повтор возвращает прежний ответ и не пишет золото второй раз.
   * Золото и флаг пишутся в сохранение в той же транзакции, что и отметка выдачи
   */
  async claim(playerId: string, windowId: string, lifeId: string): Promise<{ gold: number; flag: string; replayed: boolean }> {
    await this.sweep();
    const result = await this.db.$transaction(async (tx) => {
      const row = await this.lockWindow(tx, windowId);
      const status = this.fresh(row);
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM lives WHERE id = ${lifeId}::uuid AND player_id = ${playerId}::uuid FOR UPDATE`;
      if (locked.length === 0) throw new ApiError(404, "NOT_FOUND", "Жизнь не найдена");
      const lifeRow = await tx.life.findUniqueOrThrow({ where: { id: lifeId } });
      const state = parseSave(lifeRow.state);
      const part = await tx.livePart.findUnique({ where: { windowId_lifeId: { windowId, lifeId } } });
      if (part?.claimedAt) return { gold: row.gold, flag: row.flag, replayed: true, world: "", age: 0, level: 0 };
      if (!canClaim(status, (part?.count ?? 0) > 0, false)) throw new ApiError(409, "FORBIDDEN", "Награда ещё не доступна");
      if (!state.life.alive) throw new ApiError(409, "FORBIDDEN", "Жизнь уже кончилась");
      if (state.pending) throw new ApiError(409, "FORBIDDEN", "Сначала ответьте на событие");
      this.grant(state, row.gold, row.flag);
      await tx.life.update({
        where: { id: lifeId },
        data: { version: state.version, state: json(state) }
      });
      await tx.lifeSnapshot.create({
        data: { lifeId, version: state.version, age: state.life.age, reason: "action", state: json(state) }
      });
      await tx.lifeSnapshot.deleteMany({ where: { lifeId, version: { lte: state.version - MAX_SNAPSHOTS } } });
      await tx.livePart.update({ where: { windowId_lifeId: { windowId, lifeId } }, data: { claimedAt: new Date() } });
      return { gold: row.gold, flag: row.flag, replayed: false, world: state.character.universeId, age: state.life.age, level: state.character.level };
    });
    if (!result.replayed) {
      await this.insights.note({ name: "live.claimed", world: result.world, age: result.age, level: result.level, amount: result.gold, ref: `${windowId}:${lifeId}` });
    }
    return { gold: result.gold, flag: result.flag, replayed: result.replayed };
  }

  private grant(state: GameState, gold: number, flag: string): void {
    const before = state.character.wealth;
    state.character.wealth = Math.min(WEALTH_MAX, before + gold);
    if (!state.flags.includes(flag)) state.flags.push(flag);
    state.version += 1;
  }

  async create(input: LiveInput): Promise<LiveCard> {
    this.checkInput(input);
    const row = await this.db.liveWindow.create({
      data: {
        titleRu: input.titleRu,
        titleEn: input.titleEn,
        textRu: input.textRu,
        textEn: input.textEn,
        status: "draft",
        worlds: input.worlds.join(","),
        minAge: input.minAge,
        goal: input.goal,
        perLife: input.perLife,
        gold: input.gold,
        flag: `live.${randomUUID().slice(0, 8)}`,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt)
      }
    });
    await this.db.liveLog.create({ data: { windowId: row.id, actor: "ops", from: "draft", to: "draft", note: "создано" } });
    return cardOf(row);
  }

  async move(windowId: string, to: LiveStatus): Promise<LiveCard> {
    return this.db.$transaction(async (tx) => {
      const row = await this.lockWindow(tx, windowId);
      const from = this.fresh(row);
      if (!canMove(from, to)) throw new ApiError(409, "FORBIDDEN", "Такой переход нельзя");
      if (to === "scheduled") this.checkWindow(row);
      let next = to;
      if (to === "scheduled") next = dueStatus("scheduled", row.startsAt.getTime(), row.endsAt.getTime(), Date.now());
      const updated = await tx.liveWindow.update({ where: { id: windowId }, data: { status: next } });
      await tx.liveLog.create({ data: { windowId, actor: "ops", from, to: next, note: next === to ? "" : "срок уже наступил" } });
      return cardOf(updated);
    });
  }

  async history(windowId: string): Promise<{ id: string; actor: string; from: string; to: string; note: string; createdAt: string }[]> {
    const rows = await this.db.liveLog.findMany({ where: { windowId }, orderBy: { createdAt: "asc" }, take: 100 });
    if (rows.length === 0) {
      const exists = await this.db.liveWindow.findUnique({ where: { id: windowId }, select: { id: true } });
      if (!exists) throw new ApiError(404, "NOT_FOUND", "Окно не найдено");
    }
    return rows.map((row) => ({ id: row.id, actor: row.actor, from: row.from, to: row.to, note: row.note, createdAt: row.createdAt.toISOString() }));
  }

  private fresh(row: WindowRow): LiveStatus {
    if (!isLiveStatus(row.status)) throw new ApiError(409, "FORBIDDEN", "Состояние окна битое");
    return dueStatus(row.status, row.startsAt.getTime(), row.endsAt.getTime(), Date.now());
  }

  private checkWindow(row: WindowRow): void {
    if (row.endsAt.getTime() <= row.startsAt.getTime()) throw new ApiError(400, "VALIDATION", "Конец раньше начала");
    if (row.goal < 1) throw new ApiError(400, "VALIDATION", "Цель пустая");
    if (row.gold < 0 || row.gold > GOLD_CAP) throw new ApiError(400, "VALIDATION", "Награда вне предела");
    const worlds = worldsOf(row.worlds);
    const known = new Set(["dark-fantasy", "isekai", "murim", "xianxia", "hunter", "academy"]);
    if (worlds.some((id) => !known.has(id))) throw new ApiError(400, "VALIDATION", "Неизвестный мир");
  }

  private checkInput(input: LiveInput): void {
    if (input.titleRu.length < 1 || input.titleRu.length > TITLE_MAX || input.titleEn.length < 1 || input.titleEn.length > TITLE_MAX) {
      throw new ApiError(400, "VALIDATION", "Название пустое или длинное");
    }
    if (input.textRu.length > TEXT_MAX || input.textEn.length > TEXT_MAX) throw new ApiError(400, "VALIDATION", "Текст длинный");
    const start = Date.parse(input.startsAt);
    const end = Date.parse(input.endsAt);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) throw new ApiError(400, "VALIDATION", "Срок нечитаемый");
    if (input.goal < 1 || input.perLife < 1 || input.minAge < 0) throw new ApiError(400, "VALIDATION", "Числа окна неверны");
    if (input.gold < 0 || input.gold > GOLD_CAP) throw new ApiError(400, "VALIDATION", "Награда вне предела");
  }

  private async lockWindow(tx: Tx, windowId: string): Promise<WindowRow> {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM live_windows WHERE id = ${windowId}::uuid FOR UPDATE`;
    if (locked.length === 0) throw new ApiError(404, "NOT_FOUND", "Окно не найдено");
    return tx.liveWindow.findUniqueOrThrow({ where: { id: windowId } });
  }

  private async ownLife(tx: Tx, playerId: string, lifeId: string): Promise<GameState> {
    const row = await tx.life.findFirst({ where: { id: lifeId, playerId } });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Жизнь не найдена");
    return parseSave(row.state);
  }

}
