// Stage 04 через API: перенос жизни из браузера на сервер — строгая проверка, новый seed, исправление невозможных
// значений, повтор и одновременные запросы, права доступа, лимиты размера, старые форматы
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { applyAction, newGame, presentEvent, type GameState, type HistoryEntry } from "@endemion/game-core";
import type { ActionResponse, ImportResponse, LifeView } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

const SAVE_V2_YOUNG = JSON.parse(readFileSync(new URL("./fixtures/save-v2-young.json", import.meta.url), "utf8")) as Record<string, unknown>;

let t: TestApp;

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

/** Жизнь, прожитая в браузере: то же ядро, что в локальном режиме сайта */
function browserLife(seed: string, steps = 40): { state: GameState; history: HistoryEntry[] } {
  const born = newGame({ seed, universeId: "murim" });
  let state = born.state;
  const history = [...born.entries];
  for (let i = 0; i < steps && state.life.alive; i++) {
    const choice = presentEvent(state)?.choices.find((c) => c.available);
    const result = applyAction(state, state.pending && choice ? { type: "choose", choiceId: choice.id } : { type: "advance" });
    state = result.state;
    history.push(...result.entries);
  }
  return { state, history };
}

function importLife(client: Agent, body: Record<string, unknown>) {
  return client.post("/api/lives/import").set("Origin", ORIGIN).send(body);
}

function body(life: { state: unknown; history: unknown }, importId: string = randomUUID()) {
  return { importId, state: JSON.parse(JSON.stringify(life.state)) as unknown, history: JSON.parse(JSON.stringify(life.history)) as unknown };
}

beforeAll(async () => {
  t = await createTestApp();
});

afterAll(async () => {
  await t.app.close();
});

beforeEach(async () => {
  await resetDatabase(t.prisma);
});

describe("Stage 04: перенос жизни из браузера", () => {
  it("жизнь переносится: новый seed, отметка local-import, история и запись о переносе, ход продолжается на сервере", async () => {
    const client = agent();
    const local = browserLife("api-import-ok");
    const res = await importLife(client, body(local)).expect(201);
    const reply = res.body as ImportResponse;
    expect(reply.replayed).toBe(false);
    expect(reply.adjustments).toEqual([]);
    expect(reply.life.character.name).toBe(local.state.character.name);
    expect(reply.life.life.age).toBe(local.state.life.age);
    // Ни seed, ни генератора в ответе
    expect(JSON.stringify(reply.life)).not.toMatch(/"(seed|rngState)"\s*:/);

    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: reply.life.id } });
    expect(row.origin).toBe("local-import");
    expect(row.seed).not.toBe(local.state.seed);
    expect((row.state as { rngState: number }).rngState).not.toBe(local.state.rngState);
    const entries = await t.prisma.client.historyEntry.findMany({ where: { lifeId: row.id }, orderBy: { seq: "asc" } });
    expect(entries).toHaveLength(local.history.length + 1);
    expect(entries.at(-1)!.kind).toBe("import");
    expect(await t.prisma.client.lifeSnapshot.count({ where: { lifeId: row.id } })).toBe(1);

    const life = reply.life;
    const choice = life.pendingEvent?.choices.find((c) => c.available);
    const next = await client
      .post(`/api/lives/${life.id}/actions`)
      .set("Origin", ORIGIN)
      .send({ actionId: randomUUID(), expectedVersion: life.version, action: choice ? { type: "choose", choiceId: choice.id } : { type: "advance" } })
      .expect(200);
    expect((next.body as ActionResponse).life.version).toBe(life.version + 1);
    const list = await client.get("/api/lives").expect(200);
    expect((list.body as { lives: LifeView[] }).lives.map((l) => l.id)).toContain(life.id);
  });

  it("повтор с тем же importId возвращает ту же жизнь; одновременные повторы создают одну жизнь", async () => {
    const client = agent();
    await client.get("/api/session").set("Origin", ORIGIN);
    const local = browserLife("api-import-replay");
    const importId = randomUUID();
    const first = (await importLife(client, body(local, importId)).expect(201)).body as ImportResponse;
    const again = (await importLife(client, body(local, importId)).expect(201)).body as ImportResponse;
    expect(again.replayed).toBe(true);
    expect(again.life.id).toBe(first.life.id);
    expect(again.adjustments).toBeNull();

    const parallelId = randomUUID();
    const results = await Promise.all(Array.from({ length: 5 }, () => importLife(client, body(local, parallelId))));
    for (const res of results) expect(res.status).toBe(201);
    const ids = new Set(results.map((res) => (res.body as ImportResponse).life.id));
    expect(ids.size).toBe(1);
    expect(await t.prisma.client.life.count({ where: { importId: parallelId } })).toBe(1);
  });

  it("одинаковый importId у разных игроков — разные жизни; чужую перенесённую жизнь не видно", async () => {
    const a = agent();
    const b = agent();
    const local = browserLife("api-import-owner");
    const importId = randomUUID();
    const mine = (await importLife(a, body(local, importId)).expect(201)).body as ImportResponse;
    const theirs = (await importLife(b, body(local, importId)).expect(201)).body as ImportResponse;
    expect(theirs.life.id).not.toBe(mine.life.id);
    expect(theirs.replayed).toBe(false);
    await b.get(`/api/lives/${mine.life.id}`).expect(404);
  });

  it("невозможные значения исправляются и перечисляются в ответе", async () => {
    const client = agent();
    const local = browserLife("api-import-forged");
    const forged = structuredClone(local.state);
    forged.character.wealth = 99_000_000;
    forged.hidden.potential = 10;
    const reply = (await importLife(client, body({ state: forged, history: local.history })).expect(201)).body as ImportResponse;
    const wealth = reply.adjustments!.find((a) => a.field === "wealth");
    expect(wealth?.from).toBe(99_000_000);
    expect(reply.life.character.wealth).toBe(wealth!.to);
    expect(reply.life.character.wealth).toBeLessThan(99_000_000);
  });

  it("отклоняет: лишнее поле, повреждённое сохранение, историю не по порядку, продолженный род, без Origin-проверки", async () => {
    const client = agent();
    const local = browserLife("api-import-bad");

    const extra = await importLife(client, { ...body(local), wealth: 1_000_000 }).expect(400);
    expect(extra.body.error.code).toBe("VALIDATION");

    const broken = body(local);
    (broken.state as { character: { wealth: number } }).character.wealth = -1;
    expect((await importLife(client, broken).expect(400)).body.error.code).toBe("INVALID_SAVE");
    expect((await importLife(client, { importId: randomUUID(), state: { schemaVersion: 99 }, history: [] }).expect(400)).body.error.code).toBe("INVALID_SAVE");

    const shuffled = body(local);
    (shuffled.history as HistoryEntry[]).reverse();
    expect((await importLife(client, shuffled).expect(400)).body.error.code).toBe("VALIDATION");

    const badEntry = body(local);
    (badEntry.history as Record<string, unknown>[])[0]!.kind = "hacked";
    expect((await importLife(client, badEntry).expect(400)).body.error.code).toBe("VALIDATION");

    const continued = body(local);
    (continued.state as { lineage: { continuedBy: string | null } }).lineage.continuedBy = "n1";
    expect((await importLife(client, continued).expect(409)).body.error.code).toBe("LINEAGE_CONTINUED");

    await client.post("/api/lives/import").set("Origin", "https://evil.example").send(body(local)).expect(403);
    expect(await t.prisma.client.life.count()).toBe(0);
  });

  it("лимиты размера: большая жизнь принимается на маршруте переноса, а действия по-прежнему ограничены 16 КБ", async () => {
    const client = agent();
    const local = browserLife("api-import-size", 300);
    const big = body(local);
    // История до лимита браузера: длинные тексты, как у долгой жизни (~1 МБ)
    const filler = "x".repeat(400);
    (big.history as HistoryEntry[]).forEach((entry) => {
      entry.text = { ru: filler, en: filler };
    });
    expect(Buffer.byteLength(JSON.stringify(big))).toBeGreaterThan(100 * 1024);
    await importLife(client, big).expect(201);

    const huge = { importId: randomUUID(), state: { pad: "y".repeat(3 * 1024 * 1024) }, history: [] };
    expect((await importLife(client, huge).expect(413)).body.error.code).toBe("VALIDATION");

    const life = (await client.post("/api/lives").set("Origin", ORIGIN).send({ universeId: "murim" }).expect(201)).body.life as LifeView;
    await client
      .post(`/api/lives/${life.id}/actions`)
      .set("Origin", ORIGIN)
      .send({ actionId: randomUUID(), expectedVersion: life.version, action: { type: "advance" }, pad: "z".repeat(20 * 1024) })
      .expect(413);
  });

  it("сохранение формата 2 переносится и пишется в текущем формате", async () => {
    const client = agent();
    const reply = (await importLife(client, { importId: randomUUID(), state: SAVE_V2_YOUNG, history: [] }).expect(201)).body as ImportResponse;
    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: reply.life.id } });
    expect(row.schemaVersion).toBeGreaterThan(2);
    expect(row.origin).toBe("local-import");
  });

  it("лимит живых жизней действует и для переноса", async () => {
    const client = agent();
    const local = browserLife("api-import-limit", 2);
    for (let i = 0; i < 20; i++) await importLife(client, body(local)).expect(201);
    expect((await importLife(client, body(local)).expect(409)).body.error.code).toBe("LIMIT_REACHED");
  });
});
