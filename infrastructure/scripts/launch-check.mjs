#!/usr/bin/env node
// R6.1: внешний launch gate. Проверяет production или staging по HTTP без секретов и записей.
//   BASE_URL=https://life.endemion.online pnpm launch:check
//   BASE_URL=http://127.0.0.1:3000 INSECURE=1 pnpm launch:check
// Код выхода 0 — все проверки прошли; 1 — есть провал.
const BASE_URL = (process.env.BASE_URL ?? "https://life.endemion.online").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.LAUNCH_TIMEOUT_MS ?? 15000);
const SLOW_MS = Number(process.env.LAUNCH_SLOW_MS ?? 2000);
if (process.env.INSECURE === "1") process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const results = [];

async function fetchUrl(path, init = {}) {
  const started = performance.now();
  try {
    const response = await fetch(BASE_URL + path, {
      ...init,
      headers: { Accept: "application/json, text/html;q=0.9, */*;q=0.8", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const ms = Math.round(performance.now() - started);
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // HTML or binary as text is fine for status checks
    }
    return { response, ms, text, json };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), ms: Math.round(performance.now() - started) };
  }
}

async function check(name, path, verify, init) {
  const result = await fetchUrl(path, init);
  if (result.error) {
    results.push({ name, path, ok: false, status: "network", ms: result.ms, detail: result.error });
    return;
  }
  let detail = "";
  let ok = true;
  try {
    detail = verify(result) ?? "";
  } catch (error) {
    ok = false;
    detail = error instanceof Error ? error.message : String(error);
  }
  results.push({ name, path, ok, status: result.response.status, ms: result.ms, detail });
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

await check("health", "/api/health", ({ response, json }) => {
  expect(response.status === 200, `HTTP ${response.status}`);
  expect(json?.status === "ok", `status=${json?.status}`);
  expect(json?.services?.database === "up", "database is down");
  expect(json?.services?.redis === "up", "redis is down");
  return "database and redis up";
});

await check("readiness", "/api/ready", ({ response, json }) => {
  expect(response.status === 200, `HTTP ${response.status}`);
  expect(json?.ready === true, `ready=${json?.ready}`);
  return "strict readiness";
});

await check("web home", "/", ({ response, text }) => {
  expect(response.status === 200, `HTTP ${response.status}`);
  expect(text.includes("Endemion"), "home page marker missing");
  return "HTML";
});

await check("worlds page", "/worlds", ({ response }) => {
  expect(response.status === 200, `HTTP ${response.status}`);
  return "HTML";
});

await check("universe catalog", "/api/universes", ({ response, json }) => {
  expect(response.status === 200, `HTTP ${response.status}`);
  expect(Array.isArray(json?.universes) && json.universes.length === 6, `universes=${json?.universes?.length ?? "missing"}`);
  return "6 worlds";
});

await check("shared worlds", "/api/world", ({ response, json }) => {
  expect(response.status === 200, `HTTP ${response.status}`);
  expect(Array.isArray(json?.worlds) && json.worlds.length === 6, `worlds=${json?.worlds?.length ?? "missing"}`);
  return "6 shared worlds";
});

await check("season story", "/api/world/hunter/story", ({ response, json }) => {
  expect(response.status === 200, `HTTP ${response.status}`);
  expect(json?.chapters?.length === 4, `chapters=${json?.chapters?.length ?? "missing"}`);
  expect(json?.season >= 1, "season missing");
  return `season ${json.season}`;
});

await check("contracts", "/api/contracts?universeId=hunter", ({ response, json }) => {
  expect(response.status === 200, `HTTP ${response.status}`);
  expect(Array.isArray(json?.contracts), "contracts missing");
  return "board readable";
});

await check("guest notifications", "/api/notifications", ({ response, json }) => {
  expect(response.status === 401, `HTTP ${response.status}`);
  expect(json?.error?.code, "error envelope missing");
  return "auth guarded";
});

await check("world theme audio", "/audio/worlds/dark-fantasy.ogg", ({ response, text }) => {
  expect(response.status === 200, `HTTP ${response.status}`);
  expect((response.headers.get("content-type") ?? "").includes("audio/ogg"), "content-type is not audio/ogg");
  expect(text.length > 100_000, `body too small (${text.length})`);
  return `${text.length} bytes`;
});

const rows = results.map((item) => ({
  проверка: item.name,
  статус: item.ok ? "OK" : "FAIL",
  HTTP: item.status,
  "мс": item.ms,
  детали: item.detail
}));
console.table(rows);
const failed = results.filter((item) => !item.ok);
const slow = results.filter((item) => item.ok && item.ms > SLOW_MS);
if (slow.length > 0) console.warn(`Медленные проверки (> ${SLOW_MS} мс): ${slow.map((item) => `${item.name} ${item.ms} мс`).join(", ")}`);
if (failed.length > 0) {
  console.error(`Launch gate провален: ${failed.length} из ${results.length} проверок. ${BASE_URL}`);
  process.exit(1);
}
console.log(`Launch gate пройден: ${results.length} проверок, ${BASE_URL}`);
