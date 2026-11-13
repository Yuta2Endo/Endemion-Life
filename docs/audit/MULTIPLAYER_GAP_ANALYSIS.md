# Multiplayer Gap Analysis — Endemion Life

**Audit date:** 2026-11-13  
**Scope:** What exists today, what is missing, and what must be built for a persistent shared living world. No multiplayer code was implemented in STAGE 00.

---

## 1. Verdict

Endemion Life is **not multiplayer** today. It is a **server-authoritative single-player life simulator** with a small shared metadata layer:

- Every life is an independent `Life.state` JSON document owned by one player.
- There is no shared world state, no presence, no realtime channel, no chat, no player-to-player trade, no guild/organization, and no shared simulation tick.
- `Tie` (friendship/block) and `LiveWindow`/`LivePart` (shared seasonal goals) are the only cross-player tables. Production contains **0 ties and 0 live windows**.
- Production contains **18 players, 43 lives, 0 accounts**. All players are guests; the account system exists but is unused.
- No WebSocket, SSE, socket.io, or `text/event-stream` implementation exists anywhere in the TypeScript source.

The target vision — player families, guilds, player-driven economy, shared persistent world — requires a new server-side domain layer, not a UI feature. It should be added incrementally around the existing deterministic `game-core`, not by rewriting the life simulator.

---

## 2. What already exists

| Capability | Implementation | Maturity | Evidence |
|---|---|---|---|
| Player identity | Guest `Player` row + opaque `el_session` cookie; accounts optional | PARTIAL | `apps/api/src/session/session.service.ts`; `packages/database/prisma/schema.prisma` |
| Account login | Email+scrypt and Endemion ID OIDC | PARTIAL | `apps/api/src/auth/auth.service.ts`; `endemion-id.service.ts` |
| Character ownership | Every life route derives `playerId` from session and scopes queries | COMPLETE for single-player | `apps/api/src/lives/lives.service.ts` |
| Server authority | Client sends intent; server applies `applyAction` and stores result | COMPLETE | `packages/game-core/src/engine/game.ts`; `lives.service.ts` |
| Concurrency safety | `SELECT … FOR UPDATE`, `expectedVersion`, unique `(lifeId, actionId)` | COMPLETE for one life | `lives.service.ts:136-221` |
| Shared social graph | Friend request/accept/block; `Tie` table | PARTIAL, unused in production | `apps/api/src/social/social.service.ts`; `Tie` |
| Shared live goals | Seasonal windows, per-life contribution, one reward per life | PARTIAL; no production data | `apps/api/src/live/live.service.ts`; `LiveWindow`, `LivePart` |
| Aggregate telemetry | Anonymous `Insight` facts and 1–90 day summaries | PARTIAL; ops-token only | `apps/api/src/insights/` |
| External portal identity | Read-only JWT profile endpoint, local/uncommitted | BLOCKED | `apps/api/src/portal/` (untracked) |
| Realtime | None | MISSING | no WebSocket/SSE code |
| Shared world state | None | MISSING | each `Life.state` is independent |
| Player economy | None | MISSING | market is per-life, NPC counterparty only |
| Social organizations | None | MISSING | no guild/order/company table or API |

### 2.1 Important distinction: shared tables are not a shared world

`LiveWindow` is a global campaign definition, and `LivePart` records each life's contribution. But:

- Window progress is an aggregate counter, not a simulated world.
- Contributions grant personal gold/flags; they do not change prices, settlements, politics, or other players' lives.
- There is no presence or notification when another player contributes.
- `LivePart` has **no foreign key to `Life`** and is deleted when a guest player is merged into an account (`ON DELETE CASCADE` on `playerId`), so even this shared record is fragile.

`Tie` is a social address book, not shared gameplay. It does not create a family, guild, chat, or inherited relationship.

---

## 3. Gap Analysis

### 3.1 Single-player → multiplayer transition

**Current:** the authoritative unit is one `Life`. All state needed to play is in one JSON column; `game-core` is pure and synchronous.

**Gap:**
- No concept of a **world instance/shard**, **season**, or **shared clock**.
- No distinction between private life state and public/shared facts.
- Succession resets `world.tick` to 0 (`packages/game-core/src/legacy/succession.ts`), so even the passage of time is private.
- Every player sees their own settlements/factions/economy, not a common reality.

**Required:** introduce `World` (or `Realm`) and `WorldSeason` entities; define which parts of `GameState` become server-owned projections. Keep the solo save path working while a life is marked `solo` or `shared`.

**Risk:** converting the current JSON blob into shared state in place would break save compatibility and determinism. Use additive projection tables and a feature flag.

### 3.2 Authoritative server architecture

**Current:** strong for solo actions; no world authority.

**Gap:**
- No server-side world tick/worker.
- No command bus or domain events for cross-player consequences.
- No idempotency for world-level commands.
- No anti-cheat for client-created seeds/imports (`seed` is client-supplied; import accepts client-authored history within caps).
- No audit trail for shared mutations.

**Required:** a modular monolith with a dedicated worker process: command handlers, domain events, outbox, idempotency keys, world tick, and reconciliation. The existing API stays the only writer; clients never write shared tables.

### 3.3 Player presence

**Current:** none. `Session.lastSeenAt` exists, but there is no online list, heartbeat, or status.

**Gap:** no presence channel, no “who is in this settlement”, no online/offline state for family or guild, no reconnect semantics.

**Required:** Redis-backed presence with TTL heartbeats; WebSocket gateway (or SSE for read-only first) carrying presence and notifications; graceful degradation to polling.

**Dependency:** account adoption. Presence for guests is possible but not meaningful for social features; Stage 05 should require an account for shared-world participation.

### 3.4 Shared world state

**Current:** per-life `world` object (settlements, factions, activities, feed) generated from the life seed. It is a private simulation.

**Gap:** no shared settlements, prices, resource stocks, political control, disasters, festivals, or world history. No write path for one player's actions to affect another's environment.

**Required:** normalized `World`, `Settlement`, `Faction`, `WorldEvent`, `Market` tables plus projections; a tick that advances seasons; event sourcing or at minimum an append-only world log; clear ownership of each field.

**Hard problem:** the existing `game-core` expects a `world` object in the save. The shared projection must be injected at read time or mirrored into the save at action boundaries. The latter risks divergence; the former requires changing the pure engine boundary carefully.

### 3.5 Family interactions

**Current:** family/dynasty is fully local. NPC kin are generated per life; player families do not exist. `Tie` cannot represent kinship. There is no marriage between players, no shared household, no guardian relationship between accounts.

**Gap:** player-to-player marriage/partnership, adoption/guardianship, shared children, family permissions, inheritance across accounts, family property, family reputation visible to others.

**Required:** `Family`, `FamilyMember`, `Household`, `Marriage`, `Guardianship` with explicit consent and server-side validation. Dynasty data must become a shared projection, not a per-life copy. Inheritance across players needs an executor/claim flow and offline/heir rules.

**Risk:** this is the highest-complexity social feature and touches ownership, privacy, and moderation. Do not start before identity, presence, and shared world foundations are stable.

### 3.6 Trading

**Current:** market trades are per-life against NPC stock (`packages/game-core/src/economy/market.ts`). No player inventory object, no item instances, no escrow.

**Gap:** player-to-player offers, escrow, delivery, cancellation, expiry, fraud/duplication prevention, price discovery, and audit.

**Required:** `TradeOffer`, `TradeItem`, `Escrow`, `LedgerEntry`; server-side two-phase commit or transactional swap; idempotency; immutable ledger; anti-dupe tests. Start with direct one-off trades, not an order book.

### 3.7 Persistent economy

**Current:** wealth is a number inside each life; the market has 3 goods per world; region stock is per-life; `ask-help` can mint gold from NPCs; wealth cap 1,000,000,000. No player-to-player money flow.

**Gap:** no shared currency supply, no sinks/faucets accounting, no player businesses, wages, rent, taxes, contracts, or price impact. No ledger, so inflation and duplication cannot be audited.

**Required:** double-entry ledger for every currency/resource mutation; shared market with supply/demand; periodic sinks; caps and anomaly detection; admin correction tools with audit. The ledger must be the source of truth for balances, with projections for fast reads.

**Critical:** the existing live-window claim/restore duplication (S-12/L-1) and guest-transfer live-part loss (S-03) must be fixed before any shared economy is enabled.

### 3.8 World simulation

**Current:** `worldYearly` advances per-life settlements/factions; there is no global tick, population, housing, infrastructure, resources, or NPC role simulation beyond each life's NPCs.

**Gap:** no server-owned population/economy/politics simulation, no season boundaries, no world event calendar, no cross-player consequences, no recovery/replay of the tick.

**Required:** deterministic tick per world season, event queue, idempotent tick IDs, snapshot/replay, observability, and a kill switch. Start with a low-frequency tick (e.g. daily/seasonal) rather than real-time simulation.

---

## 4. Multiplayer readiness scorecard

| Area | Status | Score (0–5) | Why |
|---|---|---:|---|
| Identity/accounts | PARTIAL | 3 | Robust guest/account/OIDC code; 0 accounts in production, no account deletion |
| Server authority (solo) | COMPLETE | 4 | Intent-only actions, locking, idempotency |
| Shared state | MISSING | 0 | No world/settlement/economy tables |
| Presence/realtime | MISSING | 0 | No WebSocket/SSE/presence |
| Social graph | PARTIAL | 2 | Friend/block only; no groups/chat |
| Family across players | MISSING | 0 | Dynasty is per-life |
| Trading | MISSING | 0 | No inventory/escrow/ledger |
| Shared economy | MISSING | 0 | Per-life market only |
| World simulation | MISSING | 0 | Per-life world tick |
| Anti-cheat/audit | PARTIAL | 2 | Good action integrity; weak import/seed provenance |
| Operations | PARTIAL | 2 | Backups/monitoring; 1 vCPU; no shared-world ops |
| **Overall** | **NOT MULTIPLAYER** | **1.5 / 5** | Strong single-player core, absent shared-world foundation |

---

## 5. Recommended build sequence (summary)

1. **Stabilize solo + identity** (STAGE 01): fix data/security/release blockers; make Android reproducible; get accounts actually used.
2. **Shared world read model** (STAGE 04): world/season/settlement projections, world tick, public world feed; still no player-to-player mutation.
3. **Multiplayer foundation** (STAGE 05): presence, realtime notifications, shared world actions, account-gated play, moderation/audit.
4. **Social & economy** (STAGE 06): families, guilds, trade, ledger, businesses, contracts.
5. **Scale and release** (STAGE 07–08): Android, load testing, disaster recovery, anti-cheat review.

Do **not** attempt player families or a player economy before the shared world has an authoritative tick and an auditable ledger. Those features multiply every consistency problem.

---

## 6. Architecture constraints to preserve

- `packages/game-core` must remain pure and deterministic; no DB/network imports.
- Clients send intents, never authoritative state.
- Existing single-player saves and local mode must keep working during the transition.
- Every shared mutation needs an idempotency key and an audit record.
- No microservices until a measured bottleneck proves the modular monolith insufficient.
- The current `Life.state` JSON remains the solo source of truth until a versioned, tested migration exists.

---

## 7. Blocking issues before multiplayer work

| ID | Issue | Why it blocks multiplayer |
|---|---|---|
| S-12 / L-1 | Live claim → restore → claim duplication | Shared rewards/economy would be exploitable |
| S-03 | Guest→account merge deletes live parts | Identity transition loses shared participation |
| S-01 | OIDC offline grace can keep revoked sessions alive | Shared accounts need reliable revocation |
| S-02 | Portal code uncommitted/unwired | Identity integration is not reproducible |
| S-08 | Import trusts client age/history | Shared rankings/economy can be seeded fraudulently |
| S-07 | Alive-life cap race | Resource abuse under concurrency |
| D-01/D-02 | Shallow save validation, sparse fixtures | Shared state cannot rely on loose parsing |
| S-10 | Unencrypted backups | Shared PII/economy data at rest |

Fix these in STAGE 01 before adding any shared writes.
