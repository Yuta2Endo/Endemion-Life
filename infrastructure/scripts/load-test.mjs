#!/usr/bin/env node
// Нагрузочный тест API без сторонних зависимостей (Node 22+).
//   node infrastructure/scripts/load-test.mjs
// Переменные окружения:
//   BASE_URL   — адрес API (по умолчанию http://127.0.0.1:4000)
//   ORIGIN     — заголовок Origin из CORS_ORIGINS (по умолчанию http://localhost:3000)
//   USERS      — одновременных игроков (50)
//   DURATION   — длительность, секунд (60)
//   INSECURE=1 — не проверять сертификат (самоподписанный при локальной проверке)
// Каждый игрок получает свою сессию, создаёт жизнь и играет без пауз: ход, раз в 5 ходов — чтение жизни,
// раз в 10 — история. Закончившаяся жизнь заменяется новой. Не запускайте против рабочего сервера с игроками:
// тест создаёт сотни жизней. Лимит запросов API (RATE_LIMIT_PER_MINUTE) для теста нужно отключить,
// иначе он и будет измерен.
import { randomUUID } from "node:crypto";

const BASE_URL = (process.env.BASE_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const ORIGIN = process.env.ORIGIN ?? "http://localhost:3000";
const USERS = Number(process.env.USERS ?? 50);
const DURATION = Number(process.env.DURATION ?? 60);
const UNIVERSES = ["hunter", "murim", "academy"];
if (process.env.INSECURE === "1") process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const stats = new Map(); // операция -> { times: number[], statuses: Map<code, count> }
function record(op, ms, status) {
  let entry = stats.get(op);
  if (!entry) stats.set(op, (entry = { times: [], statuses: new Map() }));
  entry.times.push(ms);
  entry.statuses.set(status, (entry.statuses.get(status) ?? 0) + 1);
}

async function call(op, cookie, method, path, body) {
  const started = performance.now();
  let status = "network";
  try {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: { Origin: ORIGIN, ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie.value ? { Cookie: cookie.value } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000)
    });
    status = response.status;
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie.value = setCookie.split(";")[0];
    const json = await response.json().catch(() => null);
    return { status, json };
  } catch {
    return { status, json: null };
  } finally {
    record(op, performance.now() - started, status);
  }
}

function nextAction(life) {
  const choice = life.pendingEvent?.choices.find((c) => c.available);
  return choice ? { type: "choose", choiceId: choice.id } : { type: "advance" };
}

async function player(index, deadline) {
  const cookie = { value: "" };
  let life = null;
  let step = 0;
  while (Date.now() < deadline) {
    if (!life || life.status !== "alive") {
      const created = await call("create life", cookie, "POST", "/api/lives", { universeId: UNIVERSES[index % UNIVERSES.length], seed: `load-${index}-${randomUUID()}` });
      if (created.status !== 201) break;
      life = created.json.life;
      continue;
    }
    step++;
    const res = await call("action", cookie, "POST", `/api/lives/${life.id}/actions`, { actionId: randomUUID(), expectedVersion: life.version, action: nextAction(life) });
    if (res.status === 200) life = res.json.life;
    else if (res.json?.error?.code === "LIFE_ENDED") life = null;
    else {
      // Конфликт или сбой: перечитать жизнь и продолжить
      const fresh = await call("get life", cookie, "GET", `/api/lives/${life.id}`);
      if (fresh.status !== 200) break;
      life = fresh.json.life;
    }
    if (step % 5 === 0 && life) await call("get life", cookie, "GET", `/api/lives/${life.id}`);
    if (step % 10 === 0 && life) await call("history", cookie, "GET", `/api/lives/${life.id}/history?limit=50`);
  }
}

function percentile(sorted, p) {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0;
}

const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.json()).catch(() => null);
if (health?.services?.database !== "up") {
  console.error(`API недоступен по ${BASE_URL}/api/health`);
  process.exit(1);
}

console.log(`Нагрузка: ${USERS} игроков, ${DURATION} с, ${BASE_URL}`);
const started = Date.now();
await Promise.all(Array.from({ length: USERS }, (_, i) => player(i, started + DURATION * 1000)));
const seconds = (Date.now() - started) / 1000;

let total = 0;
let failed = 0;
const rows = [];
for (const [op, { times, statuses }] of stats) {
  const sorted = [...times].sort((a, b) => a - b);
  const bad = [...statuses].filter(([code]) => typeof code !== "number" || code >= 500).reduce((sum, [, n]) => sum + n, 0);
  total += times.length;
  failed += bad;
  rows.push({
    операция: op,
    запросов: times.length,
    "в секунду": Math.round(times.length / seconds),
    "p50, мс": +percentile(sorted, 50).toFixed(1),
    "p95, мс": +percentile(sorted, 95).toFixed(1),
    "p99, мс": +percentile(sorted, 99).toFixed(1),
    "макс, мс": +sorted.at(-1).toFixed(1),
    ответы: [...statuses].map(([code, n]) => `${code}×${n}`).join(" ")
  });
}
console.table(rows);
console.log(`Всего: ${total} запросов за ${seconds.toFixed(1)} с (${Math.round(total / seconds)}/с), ошибок сервера и сети: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
