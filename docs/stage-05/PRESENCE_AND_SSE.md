# Stage 05 — Presence and Server-Sent Events

**Status:** implemented locally, verified by API e2e, not committed or deployed.
**Scope:** account presence, online roster, SSE notifications for shared-world changes.
**Out of scope:** chat, direct messages, player trading, cross-realm presence, horizontal pub/sub.

## 1. Why SSE

The existing stack is HTTP-only: NestJS REST, Next.js App Router, Nginx, no WebSocket
dependency. Stage 05 needs a one-way stream ("world changed", "presence changed"), not
bidirectional gameplay messages. Server-Sent Events therefore add real-time delivery
without a new dependency, a socket protocol, or a second authorization model.

Client actions remain normal REST requests. SSE is a notification channel, not an
authority. A missed event must not lose state: clients refetch the authoritative world
projection on `world` events and on reconnect.

## 2. Presence model

- Redis sorted set per universe: `presence:world:<universeId>`.
- Member: player id. Score: Unix time in milliseconds of the last heartbeat.
- TTL: **90 seconds** (`PRESENCE_TTL_SECONDS`). Stale members are removed on read.
- Write path: account-only `POST /api/presence/heartbeat` with `{universeId}`.
- Read path: `GET /api/presence/online?universeId=...`, maximum **50** entries.
- Names: `Player.idDisplayName`, then `idUsername`, then a short id fallback.
- Redis failure: reads return `{available:false, players:[]}`; heartbeats succeed but
  presence is unavailable. Presence is not allowed to break solo play or world reads.

The web client sends a heartbeat immediately and every **30 seconds** while the world
panel is open. A closed tab stops heartbeats and disappears from the roster after the
TTL. There is no server-side "leave" event; TTL is the source of truth.

## 3. SSE endpoint

`GET /api/presence/stream?universeId=<id>`

Requirements:

- valid session and an `Account` row (guest receives `403 ACCOUNT_REQUIRED`);
- valid universe id;
- `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`,
  `Connection: keep-alive`, `X-Accel-Buffering: no`.

Sequence on connect:

1. `event: presence` with the current online roster;
2. `event: hello` with `{universeId, connectedAt}`;
3. `event: heartbeat` every 20 seconds (SSE comment/heartbeat, keeps proxies open);
4. `event: world` whenever a contribution commits for the same universe;
5. cleanup of timers/listeners on client disconnect.

Example:

```text
event: presence
data: {"universeId":"hunter","available":true,"players":[{"id":"...","name":"..."}]}

event: hello
data: {"universeId":"hunter","connectedAt":"2026-11-14T05:00:00.000Z"}

event: world
data: {"universeId":"hunter","season":1,"kind":"contribution","actorId":"...","targetKind":"settlement","targetId":"neo-seoul"}
```

The current implementation emits notifications through an **in-process**
`EventEmitter`. This is sufficient for the current single API container. It does not
fan out across multiple API replicas; horizontal scaling requires Redis Pub/Sub or a
stream service (see §7).

## 4. Nginx requirements

`infrastructure/nginx/snippets/app.conf` contains an exact-match location **before**
the general `/api/` proxy:

```nginx
location = /api/presence/stream {
    proxy_buffering off;
    proxy_cache off;
    gzip off;
    proxy_read_timeout 1h;
    proxy_send_timeout 1h;
}
```

Without this, Nginx buffers the stream and the browser receives nothing until the
connection closes. The API also sends `X-Accel-Buffering: no` as a second guard.

## 5. Authentication and authorization

- The stream uses the same HttpOnly `el_session` cookie as REST. No token in the URL,
  so streams do not leak credentials into logs or referrers.
- `SessionService.requireAccount` rejects guest players. Guests keep solo play and can
  read the public shared world; they cannot appear online or contribute.
- Presence exposes only the public display name already used by social search, not
  email, account id, or life data.
- The stream is read-only. It cannot mutate world state.

## 6. Reconnect and failure behavior

- Browser `EventSource` reconnects automatically. The server sends a fresh `presence`
  and `hello` snapshot on every connection.
- The client treats every `world` event as a hint and refetches
  `GET /api/world/:universeId`. No event replay or `Last-Event-ID` cursor is
  implemented.
- Closing or navigating away from `/worlds` closes the stream. Reopening creates a new
  stream.
- Redis outage degrades presence to `available:false`; the SSE endpoint still accepts
  connections and world notifications still work while the API process is alive.
- API restart drops all streams; clients reconnect and resnapshot.

## 7. Limitations and scaling path

| Limitation | Current behavior | Future requirement |
|---|---|---|
| Single API replica | In-process emitter reaches only clients on that replica | Redis Pub/Sub or NATS fan-out keyed by universe |
| No event replay | Missed events are not resent | Ring buffer or per-universe stream with `Last-Event-ID` |
| No chat | Only world-change notifications | Separate moderated chat service, not this endpoint |
| Presence TTL | 90s stale window | Acceptable for roster; do not use for gameplay authority |
| Connection count | No explicit per-account cap | Add per-IP/account stream limits before public launch |
| Proxy timeouts | 1h read/send timeout | Reconnect before edge idle timeout or use edge-supported SSE |

## 8. Verification evidence

`apps/api/test/stage05.e2e-spec.ts` covers:

- guest blocked from heartbeat, online roster, and stream; guest solo life still works;
- account presence visible to a second account;
- stale Redis score expires from the roster;
- stream receives `hello` and a `world` notification after a contribution;
- contribution notification text is localized (RU/EN).

Targeted run: **9/9 passed**. Full API e2e after the final test: **132/132 passed**
(15 files, 75.6s). Full API unit: **74/74**. Web unit: **25/25**. Typecheck and lint
pass; web production build passes.

## 9. Operational checklist before deploy

1. Apply additive migration `20261114130000_stage05_multiplayer`.
2. Confirm Nginx snippet is included in the production server block.
3. Confirm the edge proxy (Caddy) does not buffer `/api/presence/stream`.
4. Verify `GET /api/presence/stream` stays open for at least 60 seconds through the
   public domain.
5. Verify a guest receives `403 ACCOUNT_REQUIRED`, not a broken stream.
