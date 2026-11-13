// Stage 03 через API: смерть персонажа, продолжение рода за наследника, повтор и конфликты, хроника рода,
// авторизация, жизни формата 2 в базе
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { SAVE_SCHEMA_VERSION, type GameState } from "@endemion/game-core";
import type { ActionResponse, LifeListItem, LifeView, LineageResponse, SuccessionResponse } from "@endemion/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers.js";

/** Сохранения формата 2, записанные Stage 02: законченная жизнь с ребёнком и молодая жизнь */
const SAVE_V2_DEAD = JSON.parse(readFileSync(new URL("./fixtures/save-v2-dead.json", import.meta.url), "utf8")) as { version: number; life: { age: number }; character: { name: string } };
const SAVE_V2_YOUNG = JSON.parse(readFileSync(new URL("./fixtures/save-v2-young.json", import.meta.url), "utf8")) as { version: number; life: { age: number }; character: { name: string } };

/** При этой политике (первый доступный вариант, иначе 10 лет) жизнь кончается за ~34 хода и оставляет наследников */
const DEATH_SEED = "e2e-legacy-hunter-244";

let t: TestApp;

function agent() {
  return request.agent(t.app.getHttpServer());
}
type Agent = ReturnType<typeof agent>;

async function createLife(client: Agent, body: Record<string, unknown>): Promise<LifeView> {
  const res = await client.post("/api/lives").set("Origin", ORIGIN).send(body).expect(201);
  return (res.body as { life: LifeView }).life;
}

function act(client: Agent, life: LifeView, action: Record<string, unknown>) {
  return client.post(`/api/lives/${life.id}/actions`).set("Origin", ORIGIN).send({ actionId: randomUUID(), expectedVersion: life.version, action });
}

function succession(client: Agent, life: LifeView, heirId: string, actionId: string = randomUUID(), expectedVersion = life.version) {
  return client.post(`/api/lives/${life.id}/succession`).set("Origin", ORIGIN).send({ actionId, expectedVersion, heirId });
}

/** Проживает жизнь через API до конца: только намерения, исходы считает сервер */
async function liveToDeath(client: Agent, life: LifeView): Promise<LifeView> {
  let current = life;
  for (let i = 0; i < 200 && current.status === "alive"; i++) {
    const action = current.pendingEvent ? { type: "choose", choiceId: current.pendingEvent.choices.find((c) => c.available)!.id } : { type: "advance", years: 10 };
    const res = await act(client, current, action);
    expect(res.status).toBe(200);
    current = (res.body as ActionResponse).life;
  }
  expect(current.status).toBe("dead");
  return current;
}

/** Жизнь в базе подменяется сохранением извне (так в базе лежат жизни прошлых версий игры) */
async function plant(lifeId: string, save: { version: number; life: { age: number }; character: { name: string } }, status: "alive" | "dead"): Promise<void> {
  await t.prisma.client.life.update({ where: { id: lifeId }, data: { state: save, version: save.version, age: save.life.age, name: save.character.name, schemaVersion: 2, status } });
  await t.prisma.client.lifeSnapshot.updateMany({ where: { lifeId }, data: { state: save, version: save.version, age: save.life.age } });
}

beforeAll(async () => {
  t = await createTestApp();
});

beforeEach(async () => {
  await resetDatabase(t.prisma);
});

afterAll(async () => {
  await t?.app.close();
});

describe("Stage 03: смерть персонажа и продолжение рода", () => {
  it("жизнь кончается, сервер показывает итоги и наследников; за наследника начинается новое поколение", async () => {
    const client = agent();
    const dead = await liveToDeath(client, await createLife(client, { universeId: "hunter", seed: DEATH_SEED }));

    // Итоги жизни и наследники — только от сервера, без seed и скрытого
    const summary = dead.legacy.summary!;
    expect(summary.name).toBe(dead.character.name);
    expect(summary.age).toBe(dead.life.age);
    expect(summary.score).toBeGreaterThanOrEqual(0);
    const heirs = summary.heirs.filter((h) => h.available);
    expect(heirs.length).toBeGreaterThan(0);
    expect(JSON.stringify(dead)).not.toContain(DEATH_SEED);
    await act(client, dead, { type: "advance" }).expect(409);

    const heir = heirs.find((h) => h.primary) ?? heirs[0]!;
    const res = await succession(client, dead, heir.id).expect(200);
    const body = res.body as SuccessionResponse;
    expect(body.replayed).toBe(false);
    expect(body.life.id).not.toBe(dead.id);
    expect(body.life.status).toBe("alive");
    expect(body.life.character.name).toBe(heir.name);
    expect(body.life.legacy.generation).toBe(2);
    expect(body.life.legacy.inheritance?.fromName).toBe(dead.character.name);
    expect(body.previous.legacy.continuedBy).toBe(heir.id);
    expect(body.previous.version).toBe(dead.version + 1);
    expect(body.entries[0]?.kind).toBe("legacy");
    expect(JSON.stringify(body.life)).not.toContain(DEATH_SEED);

    // База: поколение, род и предшественник; одна новая жизнь
    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: body.life.id } });
    expect(row.generation).toBe(2);
    expect(row.predecessorId).toBe(dead.id);
    expect(row.lineageId).toBe(dead.id);
    expect(row.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(row.seed).not.toBe(DEATH_SEED);
    expect(await t.prisma.client.lifeSnapshot.count({ where: { lifeId: body.life.id } })).toBe(1);
    expect(await t.prisma.client.historyEntry.count({ where: { lifeId: body.life.id } })).toBe(body.entries.length);

    // Хроника рода сохраняется: начало рода, смерть основателя, наследование
    const lineage = ((await client.get(`/api/lives/${body.life.id}/lineage`).expect(200)).body as LineageResponse).lineage;
    expect(lineage.generation).toBe(2);
    expect(lineage.lives.map((l) => l.name)).toEqual([dead.character.name]);
    const kinds = lineage.chronicle.map((e) => e.kind);
    for (const kind of ["origin", "death", "succession"] as const) expect(kinds).toContain(kind);
    expect(lineage.tree.some((n) => n.isSelf && n.name === heir.name)).toBe(true);
    expect(lineage.tree.some((n) => n.lifeGen === 1 && !n.alive)).toBe(true);
    expect(JSON.stringify(lineage)).not.toContain(DEATH_SEED);

    // В списке — оба поколения
    const list = ((await client.get("/api/lives").expect(200)).body as { lives: LifeListItem[] }).lives;
    expect(list.find((l) => l.id === dead.id)?.continued).toBe(true);
    expect(list.find((l) => l.id === body.life.id)?.generation).toBe(2);

    // Новая жизнь продолжается обычными действиями
    const next = await act(client, body.life, body.life.pendingEvent ? { type: "choose", choiceId: body.life.pendingEvent.choices.find((c) => c.available)!.id } : { type: "advance" }).expect(200);
    expect((next.body as ActionResponse).life.version).toBe(2);
  });

  it("наследство с домом и реликвией: дом переходит в натуре, реликвия — в записи рода", async () => {
    const client = agent();
    const dead = await liveToDeath(client, await createLife(client, { universeId: "hunter", seed: DEATH_SEED }));
    // В базе — как у жизни, прожитой в этом мире: своё жильё и фамильная реликвия
    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: dead.id } });
    const state = row.state as unknown as GameState;
    state.character.wealth = 300;
    state.household = { residence: "own", homeId: "hu-home-small", since: 0, condition: 100, arrears: 0 };
    state.business = { ventures: [] };
    state.lineage.relics = [
      {
        id: "gate-hunter-badge",
        name: { ru: "Знак охотника Врат", en: "Gate Hunter Badge" },
        description: { ru: "Знак тех, кто стоит на страже Врат.", en: "Badge of those who stand guard at the Gates." },
        acquiredGen: 1,
        acquiredAge: 18,
        source: "e2e"
      }
    ];
    await t.prisma.client.life.update({ where: { id: dead.id }, data: { state: state as unknown as Record<string, string> } });

    const fresh = ((await client.get(`/api/lives/${dead.id}`).expect(200)).body as { life: LifeView }).life;
    const heir = fresh.legacy.summary!.heirs.find((h) => h.available && h.primary) ?? fresh.legacy.summary!.heirs.find((h) => h.available)!;
    const body = (await succession(client, fresh, heir.id).expect(200)).body as SuccessionResponse;
    const record = body.life.legacy.inheritance!;

    expect(body.life.household.residence).toBe("own");
    expect(body.life.household.home?.id).toBe("hu-home-small");
    expect(record.homeInherited).toBe(true);
    expect(record.assets?.home?.id).toBe("hu-home-small");
    expect(record.assets?.liquid).toBe(300);
    expect(record.wealth + (record.assets?.home?.value ?? 0)).toBe(heir.wealth);
    expect(record.relics.map((relic) => relic.id)).toEqual(["gate-hunter-badge"]);

    const lineage = ((await client.get(`/api/lives/${body.life.id}/lineage`).expect(200)).body as LineageResponse).lineage;
    expect(lineage.dynasty.relics.map((relic) => relic.id)).toEqual(["gate-hunter-badge"]);
  });

  it("повтор запроса с тем же actionId возвращает ту же новую жизнь и не создаёт второй", async () => {
    const client = agent();
    const dead = await liveToDeath(client, await createLife(client, { universeId: "hunter", seed: DEATH_SEED }));
    const heir = dead.legacy.summary!.heirs.find((h) => h.available)!;
    const actionId = randomUUID();
    const first = (await succession(client, dead, heir.id, actionId).expect(200)).body as SuccessionResponse;
    const again = (await succession(client, dead, heir.id, actionId).expect(200)).body as SuccessionResponse;
    expect(again.replayed).toBe(true);
    expect(again.life.id).toBe(first.life.id);
    expect(again.entries).toEqual(first.entries);
    expect(await t.prisma.client.life.count({ where: { predecessorId: dead.id } })).toBe(1);
    // Тот же actionId для другого наследника — ошибка, а не тихий повтор
    const other = dead.legacy.summary!.heirs.find((h) => h.available && h.id !== heir.id);
    if (other) expect((await succession(client, dead, other.id, actionId).expect(409)).body.error.code).toBe("ACTION_ID_REUSED");
  });

  it("второй наследник невозможен: новый запрос — 409, одновременные запросы — принимается один", async () => {
    const client = agent();
    const dead = await liveToDeath(client, await createLife(client, { universeId: "hunter", seed: DEATH_SEED }));
    const heirs = dead.legacy.summary!.heirs.filter((h) => h.available);
    const results = await Promise.all(heirs.concat(heirs).slice(0, 6).map((h) => succession(client, dead, h.id)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(results.length - 1);
    expect(await t.prisma.client.life.count({ where: { predecessorId: dead.id } })).toBe(1);

    const fresh = ((await client.get(`/api/lives/${dead.id}`).expect(200)).body as { life: LifeView }).life;
    expect((await succession(client, fresh, heirs[0]!.id).expect(409)).body.error.code).toBe("LINEAGE_CONTINUED");
    // Откат продолженной жизни дал бы второй вариант рода — запрещён
    const restore = await client.post(`/api/lives/${dead.id}/restore`).set("Origin", ORIGIN).send({ version: 2, expectedVersion: fresh.version }).expect(409);
    expect(restore.body.error.code).toBe("LINEAGE_CONTINUED");
  });

  it("клиент не может выбрать чужого, умершего или живого персонажа; устаревшая версия — конфликт", async () => {
    const client = agent();
    const alive = await createLife(client, { universeId: "academy", seed: "alive-succession" });
    expect((await succession(client, alive, "n1").expect(409)).body.error.code).toBe("LIFE_NOT_ENDED");

    const dead = await liveToDeath(client, await createLife(client, { universeId: "hunter", seed: DEATH_SEED }));
    const heirIds = new Set(dead.legacy.summary!.heirs.map((h) => h.id));
    const stranger = dead.profile.npcs.find((n) => !heirIds.has(n.id));
    if (stranger) expect((await succession(client, dead, stranger.id).expect(409)).body.error.code).toBe("HEIR_LOCKED");
    expect((await succession(client, dead, "n99999").expect(409)).body.error.code).toBe("HEIR_LOCKED");
    await succession(client, dead, "self").expect(400);
    await client.post(`/api/lives/${dead.id}/succession`).set("Origin", ORIGIN).send({ actionId: randomUUID(), expectedVersion: dead.version, heirId: "n1", wealth: 999999 }).expect(400);
    const heir = dead.legacy.summary!.heirs.find((h) => h.available)!;
    expect((await succession(client, dead, heir.id, randomUUID(), dead.version - 1).expect(409)).body.error.code).toBe("VERSION_CONFLICT");
  });

  it("чужой игрок и гость без сессии не видят род и не могут продолжить чужую жизнь", async () => {
    const owner = agent();
    const dead = await liveToDeath(owner, await createLife(owner, { universeId: "hunter", seed: DEATH_SEED }));
    const heir = dead.legacy.summary!.heirs.find((h) => h.available)!;
    const intruder = agent();
    await createLife(intruder, { universeId: "murim", seed: "intruder" });
    await succession(intruder, dead, heir.id).expect(404);
    await intruder.get(`/api/lives/${dead.id}/lineage`).expect(404);
    const guest = request(t.app.getHttpServer());
    await guest.post(`/api/lives/${dead.id}/succession`).set("Origin", ORIGIN).send({ actionId: randomUUID(), expectedVersion: dead.version, heirId: heir.id }).expect(401);
    await guest.get(`/api/lives/${dead.id}/lineage`).expect(401);
    expect(await t.prisma.client.life.count({ where: { predecessorId: dead.id } })).toBe(0);
  });
});

describe("Stage 03: жизни прошлых форматов в базе", () => {
  it("законченная жизнь формата 2 открывается с итогами и продолжается за наследника", async () => {
    const client = agent();
    const created = await createLife(client, { universeId: "dark-fantasy", seed: "placeholder" });
    await plant(created.id, SAVE_V2_DEAD, "dead");
    const life = ((await client.get(`/api/lives/${created.id}`).expect(200)).body as { life: LifeView }).life;
    expect(life.status).toBe("dead");
    expect(life.version).toBe(SAVE_V2_DEAD.version);
    expect(life.character.name).toBe(SAVE_V2_DEAD.character.name);
    const summary = life.legacy.summary!;
    expect(summary.age).toBe(SAVE_V2_DEAD.life.age);
    const heir = summary.heirs.find((h) => h.available);
    if (heir) {
      const body = (await succession(client, life, heir.id).expect(200)).body as SuccessionResponse;
      expect(body.life.legacy.generation).toBe(2);
      const old = await t.prisma.client.life.findUniqueOrThrow({ where: { id: created.id } });
      expect(old.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    }
  });

  it("жизнь формата 2 продолжается, пишется в формате 3; откат к снимку формата 2 работает", async () => {
    const client = agent();
    const created = await createLife(client, { universeId: "murim", seed: "placeholder" });
    await plant(created.id, SAVE_V2_YOUNG, "alive");
    let life = ((await client.get(`/api/lives/${created.id}`).expect(200)).body as { life: LifeView }).life;
    expect(life.legacy.generation).toBe(1);
    for (let i = 0; i < 3 && life.status === "alive"; i++) {
      const res = life.pendingEvent ? await act(client, life, { type: "choose", choiceId: life.pendingEvent.choices.find((c) => c.available)!.id }) : await act(client, life, { type: "advance" });
      expect(res.status).toBe(200);
      life = (res.body as ActionResponse).life;
    }
    const row = await t.prisma.client.life.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect((row.state as { schemaVersion: number }).schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    const restored = await client.post(`/api/lives/${created.id}/restore`).set("Origin", ORIGIN).send({ version: SAVE_V2_YOUNG.version, expectedVersion: life.version }).expect(200);
    expect((restored.body as ActionResponse).life.life.age).toBe(SAVE_V2_YOUNG.life.age);
    const lineage = ((await client.get(`/api/lives/${created.id}/lineage`).expect(200)).body as LineageResponse).lineage;
    expect(lineage.chronicle.some((e) => e.kind === "origin")).toBe(true);
  });
});
