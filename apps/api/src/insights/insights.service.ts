// Stage 16: факты хода. Ошибка записи не должна ронять игру. Клиент факты не шлёт.
import { Prisma } from "@endemion/database";
import {
  balanceNote,
  factProblem,
  INSIGHT_KEEP_DAYS,
  INSIGHT_NAMES,
  isInsightName,
  type BalanceNote,
  type InsightFact,
  type InsightName
} from "@endemion/game-core";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

const SWEEP_GAP_MS = 60 * 60 * 1000;
const SWEEP_BATCH = 500;

export interface InsightSummary {
  days: number;
  keptDays: number;
  total: number;
  byName: { name: InsightName; count: number }[];
  byWorld: { world: string; count: number }[];
  notes: BalanceNote[];
  /** true — выборка меньше порога, заметки не считать выводом */
  thin: boolean;
}

@Injectable()
export class InsightsService {
  private readonly logger = new Logger("Insights");
  private sweptAt = 0;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async noteMany(facts: InsightFact[]): Promise<void> {
    for (const fact of facts) await this.note(fact);
  }

  /** Пишет факт. Повтор того же имени и ключа — тишина. Любая ошибка — тишина */
  async note(fact: InsightFact): Promise<void> {
    const problem = factProblem(fact);
    if (problem) return;
    try {
      await this.prisma.client.insight.create({
        data: { name: fact.name, world: fact.world, age: fact.age, level: fact.level, amount: fact.amount, ref: fact.ref }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
      this.logger.warn({ msg: "факт не записан" });
    }
  }

  async summary(days: number): Promise<InsightSummary> {
    await this.sweep();
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.client.insight.groupBy({
      by: ["name"],
      where: { createdAt: { gte: since } },
      _count: { _all: true }
    });
    const worlds = await this.prisma.client.insight.groupBy({
      by: ["world"],
      where: { createdAt: { gte: since }, world: { not: "" } },
      _count: { _all: true }
    });
    const byName = INSIGHT_NAMES.map((name) => ({
      name,
      count: rows.find((row) => row.name === name)?._count._all ?? 0
    }));
    const total = byName.reduce((sum, row) => sum + row.count, 0);
    const notes = this.notes(byName);
    return {
      days,
      keptDays: INSIGHT_KEEP_DAYS,
      total,
      byName: byName.filter((row) => row.count > 0),
      byWorld: worlds.map((row) => ({ world: row.world, count: row._count._all })).sort((a, b) => b.count - a.count),
      notes,
      thin: total < 8
    };
  }

  private notes(byName: { name: InsightName; count: number }[]): BalanceNote[] {
    const count = (name: InsightName) => byName.find((row) => row.name === name)?.count ?? 0;
    const pairs: [InsightName, number, number][] = [
      ["adventure.failed", count("adventure.done"), count("adventure.failed")],
      ["quest.failed", count("quest.done"), count("quest.failed")]
    ];
    return pairs.flatMap(([name, done, failed]) => {
      const note = balanceNote(name, done, failed);
      return note ? [note] : [];
    });
  }

  /** Стирает факты старше срока. Не чаще раза в час и не пачкой больше SWEEP_BATCH */
  async sweep(now = Date.now()): Promise<number> {
    if (now - this.sweptAt < SWEEP_GAP_MS) return 0;
    this.sweptAt = now;
    const cutoff = new Date(now - INSIGHT_KEEP_DAYS * 86_400_000);
    try {
      const stale = await this.prisma.client.insight.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true },
        take: SWEEP_BATCH,
        orderBy: { createdAt: "asc" }
      });
      if (stale.length === 0) return 0;
      const dropped = await this.prisma.client.insight.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } });
      return dropped.count;
    } catch {
      this.logger.warn({ msg: "срок хранения не проверен" });
      return 0;
    }
  }

  /** Для теста: сброс паузы между срезами */
  resetSweep(): void {
    this.sweptAt = 0;
  }

  known(name: string): boolean {
    return isInsightName(name);
  }
}
