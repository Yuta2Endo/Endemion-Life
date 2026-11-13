# STAGE 00 — Final Audit Report

**Project:** Endemion Life  
**Repository:** https://github.com/Yuta2Endo/Endemion-Life  
**Production:** https://life.endemion.online (`/opt/endemion-life`)  
**Audit date:** 2026-11-13  
**Mode:** read-only audit; no production change, no deployment, no save-schema change, no dependency change, no commit. Only new audit documentation was created under `docs/audit/`.

---

## A. Executive Summary

Endemion Life is a **real, playable, server-authoritative single-player life simulator** with six distinct worlds, a deterministic event/story engine, a genuine dynasty/succession system, a per-life economy and market, adventures, regional simulation, and a polished Next.js client. It is substantially more than a prototype.

It is **not yet a multiplayer living-world RPG**. Every life is an independent JSON save. The only shared tables are friend/block ties and seasonal live-window definitions; production has **0 ties and 0 live windows**. There is no shared world state, presence, realtime channel, chat, player-to-player trade, guild, player family, or shared simulation tick. Production has **18 players, 43 lives, and 0 accounts** — the account system exists but is unused, and everyone plays as a guest.

The project is at a **stabilization point**, not a greenfield point:

- The core architecture is sound and worth preserving.
- The latest production release (`ca72b8b`) is **not on `origin/main`**; local `main` (`cda9a39`) is 3 commits ahead, and the portal integration is uncommitted.
- A **live-window claim/restore duplication** path exists in deployed code (no live windows in production today, so not yet exploited).
- One game-core test is a **real regression** (dynasty consequence provenance); two others are slow/flaky timeouts.
- Android is a remote WebView shell that **cannot be rebuilt from a clean checkout** (no Capacitor dependencies in the lockfile), has no signing/Play assets, and lacks safe-area handling.
- The desktop play screen has a confirmed **duplicate/misplaced Dossier** layout bug; the mobile homepage overflows horizontally by 58px.

**Bottom line:** preserve the game, fix the P1 data/security/release issues first, then deepen the solo life sim and dynasty, then add a shared-world read model, and only then add multiplayer and a player economy. A rewrite would destroy the project’s main asset: a working deterministic life engine.

---

## B. Project Health

| Area | Score | Assessment |
|---|---:|---|
| Architecture | **7/10** | Clear modular monolith; pure `game-core`; strong server-authority and save model. Weak shared-world layer and no worker/realtime. |
| Gameplay | **6/10** | Deep for a browser life sim; six real world rule sets; dynasty is strong. RPG progression is shallow, one world has quests, relics unreachable, content volume modest. |
| Code quality | **7/10** | Compact, typed, mostly consistent; good zod/Prisma separation. Some large UI components, dead surfaces, shallow validation, and documentation drift. |
| Data integrity | **6/10** | Strong transactions/idempotency/snapshots. Live restore duplication, guest-merge live-part loss, replay semantics, shallow parse gaps, unencrypted backups. |
| Security | **6/10** | No P0 found; good scrypt/OIDC/cookie/CSRF/logging. Two P1s (OIDC offline grace, uncommitted/unwired portal) and several P2s. |
| Performance | **6/10** | Fast at 18 players/43 lives; 42ms TTFB, 147ms DCL. Full-state write amplification, 21.4MB snapshots (44% of DB), full-engine client bundle, 1 vCPU host. |
| Test coverage | **7/10** | 609 game-core tests, 74 API unit, 12 shared, 97 API e2e cases, 25 web e2e tests. One real failure, two slow tests; e2e not run in this audit; save/restore/live gaps. |
| Android readiness | **3/10** | Remote shell runs conceptually; build irreproducible, unsigned, no Play compliance, no safe areas, local-mode risk. |
| Multiplayer readiness | **1.5/10** | Identity/authority foundation only; shared world, presence, trade, guilds, families all missing. |

**Overall:** a strong **single-player foundation** with release-engineering and data-integrity debt; the multiplayer target is a major, multi-stage build.

---

## C. Existing Strengths (preserve)

1. **Pure deterministic game engine.** `packages/game-core` has no DB/network dependencies; `applyAction(state, action)` is replayable and testable. This is the project’s crown jewel.
2. **Server-authoritative action pipeline.** Client sends intent; server applies rules, locks the life row, checks `expectedVersion`, enforces unique `(lifeId, actionId)`, writes history/snapshot/action atomically.
3. **Six real worlds.** Dark fantasy, isekai, murim, xianxia, hunter, academy each have distinct rule sets, meters, factions, events, market goods, adventures, and inheritance law. They are not just reskins.
4. **Genuine dynasty/legacy system.** Kin graph, NPC life simulation, per-world inheritance laws, regency, succession salt, unique predecessor constraint, chronicle, achievements, relics data, world influence.
5. **Narrative DSL.** Conditions, choices, checks, effects, flags, delayed consequences, chains, localization, timeline provenance. 94–102 definitions per world (including shared pool).
6. **Thoughtful auth/security baseline.** HttpOnly/SameSite/Secure cookie, SHA-256 token storage, scrypt, OIDC PKCE, encrypted refresh tokens, generic errors, PII-aware logs, parameterized SQL, CSP-adjacent headers.
7. **Operational maturity beyond its size.** Docker compose, migrations, backups, health checks, Sentry, monitor, CI with Postgres/Redis/e2e, security workflow, deploy workflow with approvals.
8. **Additive schema history.** Save format 8 with migrations 1→8; database migrations are additive; production still carries schema 1/2/5 lives, proving backward compatibility matters and mostly works.
9. **Playable web UX.** Character sheet, events, timeline, dossier, lineage tree, economy, adventure, world panels, saves/restore, auto-life modes, RU/EN.
10. **Production is live and healthy.** API health 200, DB/Redis up, TLS/HSTS/security headers, backup last-success current.

---

## D. Critical Problems (fix before new features)

| # | Problem | Evidence | Impact | Priority |
|---|---|---|---|---:|
| 1 | **Live claim → restore → claim duplication** | `live.service.ts` claim writes gold/flag + snapshot; restore clears `claimedAt` if flag gone; window progress/part counts not reverted; S-12/L-1 | Repeatable currency minting and shared-progress inflation once live windows are used | **P1** |
| 2 | **Production not reproducible from origin** | Production `ca72b8b`; local `main cda9a39`; `origin/main c7951d0`; deploy was manual | Cannot rebuild/rollback from GitHub; audit trail broken | **P1** |
| 3 | **Portal integration uncommitted/unwired** | 4 modified files + 74 untracked Stage 11 reports + `apps/api/src/portal/`; compose passes no `PORTAL_*`; CI builds committed SHA | Feature silently absent in deploy; tests/code can be lost; scope confusion | **P1** |
| 4 | **OIDC offline grace can revive revoked sessions** | `endemion-id.service.ts:195-225`: `refreshedAt` set before provider call; `"ended"` not persisted; next request <5min returns `"ok"` | Revoked/blocked account may retain access during/after provider outage | **P1** |
| 5 | **Android build irreproducible** | No `@capacitor/*` in package/lockfile; orphan `node_modules/.pnpm` path; no CLI; no keystore/AAB | Cannot ship or patch Android; docs overstate readiness | **P1** |
| 6 | **Desktop play layout bug** | `play-screen.tsx:337` 3-column grid; mobile dossier wrapper `max-lg:hidden` visible at `lg`; desktop dossier also rendered; default tab `event` | Duplicate Dossier / timeline wraps on desktop; confusing UI | **P1** |
| 7 | **Android local-mode fallback** | `store/index.ts` selects local prototype when `/api/health` fails; new lives computed client-side | Client-authoritative lives in shell; loss/cheat risk | **P1** |
| 8 | **Dynasty provenance regression** | `legacy/lineage.ts:53-67` clears `ctx.source` before `emit("consequence")`; uses consequence id not `item.src`; failing test | Chronicle loses causal links; test suite red | **P1** |
| 9 | **Guest→account merge loses live parts** | `AuthService` moves lives/actions, deletes guest; `LivePart.playerId` cascades | Lost contributions/rewards; possible re-claim | **P2** |
| 10 | **Docs contradict reality** | `PROJECT_STATUS.md` stale (`c7951d0`, Stage 10 not started, local-only); deployment doc describes schema 5; README links deleted report | Misleads planning and onboarding | **P2** |

Additional P2/P3 issues are in `TECHNICAL_DEBT.md` and `SECURITY_AUDIT.md`.

---

## E. Missing Systems (to reach the target GDD)

1. **Shared persistent world:** world/shard/season, settlements, factions, shared prices/resources, world events, deterministic tick.
2. **Realtime/presence:** WebSocket/SSE, online roster, notifications, chat, reconnect.
3. **Player families:** marriage/partnership, adoption/guardianship, shared household/property, cross-account inheritance, consent.
4. **Player-driven economy:** inventory, ledger, player trade/escrow, shared market, businesses, wages/rent/taxes, sinks/faucets, anomaly detection.
5. **Social organizations:** guilds/orders/associations, roles, projects, reputation, moderation.
6. **RPG depth:** quests in all worlds, level-gated content, equipment/inventory, specialization branches, combat or non-combat challenge variety.
7. **Life-sim depth:** illness/injury, cause of death, education/career choices, property/business, travel, household.
8. **Dynasty completion:** reachable relics, persistent world/social state across succession, family property, guardianship/regency depth.
9. **Android release:** reproducible build, signing, safe areas, offline/network UX, push (optional), Play compliance, account deletion.
10. **Operational hardening:** encrypted backups, account deletion/export, scoped ops auth, CSP, session rotation, staging environment, load/chaos tests.

The GDD blueprint is the only document that specifies player families, guilds, shared projects, and a player economy. No implementation doc or code shows those exist. Do not confuse the blueprint with status.

---

## F. Recommended Architecture

Keep the **modular monolith** and add a **shared-world layer**:

```text
Web / Android
      │ HTTPS, same-origin cookies
   Nginx/Caddy
      │
   NestJS API  ──  World worker (season tick, projections, outbox)
      │                 │
   PostgreSQL  ────────┘        Redis (presence, limits, cache)
      │
   game-core (pure) + shared (contracts) + database (Prisma)
```

**Boundaries**
- `game-core` stays pure; rules only.
- Solo `Life.state` remains schema 8 and the source of truth for private play.
- New modules: `world`, `economy`, `social` (families/guilds/presence), `worker`.
- Clients send intents; server owns all canonical state.
- New shared tables are normalized and append-only where possible (ledger, world log).
- Turn-based life actions stay HTTP; WebSocket/SSE is for presence/notifications/feed, not life correctness.
- World tick is deterministic per season and replayable; no real-time simulation in v1.
- Migration is additive and feature-flagged; a save schema 9 only when required, with dual-read and rollback.

**Scaling:** vertical first (the 1 vCPU/2GB host is the immediate constraint), separate worker, snapshot archival, read replicas, then shard by world only when measured. No microservices/Kafka before measurement.

Full detail: `TARGET_ARCHITECTURE.md`.

---

## G. Prioritized Roadmap

| Stage | Focus | Why now | Complexity |
|---|---|---|---|
| **00** | Audit | Establish truth and sequence | Complete |
| **01** | Core stabilization | Data/security/release blockers; no new gameplay | High |
| **02** | Advanced life simulation | Deepen the solo loop before multiplying state | High |
| **03** | Dynasty & legacy | Strongest differentiator; complete it | High |
| **04** | Living worlds | Shared read model + deterministic tick, no player writes yet | Very High |
| **05** | Multiplayer foundation | Presence, realtime, account-gated shared actions | Very High |
| **06** | Social & economy | Families, guilds, trade, ledger, businesses | Very High |
| **07** | Web & Android | Release engineering, Play compliance, device QA | High |
| **08** | Final QA & release | Load/chaos/DR/security sign-off | Very High |

**Do first:** Stage 01. The live duplication and identity/provenance issues are cheap to fix now and expensive after shared state/economy exist. Android release work can start in parallel after Stage 01 groundwork, but must not ship before the shared APIs stabilize.

**Do not start:** player families, guilds, player trade, or shared economy before presence + ledger + moderation foundations. Do not migrate save schema 8 in a big-bang deploy. Do not rewrite the engine.

Full stage objectives/files/risks: `DEVELOPMENT_ROADMAP.md`; measurable gates: `ACCEPTANCE_CRITERIA.md`.

---

## H. Immediate Next Actions for STAGE 01

Ordered; each should be a small, reviewable change with a regression test.

1. **Freeze and publish provenance.**
   - Decide portal: commit it with tests + compose/env wiring, or remove it from the working tree and record the decision.
   - Commit/push the audited tree; ensure `origin/main` equals the deployed SHA; tag the release.
   - Record deployed SHA, migrations, backup ID, rollback SHA.
2. **Fix live duplication (S-12/L-1).**
   - Make claims irreversible across restore, or atomically reverse window progress/part counts and reward ledger.
   - Add property tests: claim → restore → claim, contribute → restore → contribute.
3. **Fix dynasty provenance.**
   - In `legacy/lineage.ts`, keep `ctx.source` through `emit("consequence")` and use `item.src`; make `stage01-life-upgrade` green.
4. **Fix OIDC revocation (S-01).**
   - Do not advance `refreshedAt` before a successful provider refresh; persist revocation when offline grace expires; add a time-controlled test.
5. **Fix guest merge (S-03).**
   - Preserve/move `LivePart` rows during guest→account transfer; add a Life FK or transactional move; test contribution/claim survival.
6. **Fix desktop play layout (F-01).**
   - Render exactly one Dossier per breakpoint; remove the fourth grid child; screenshot at 1280/1440.
7. **Fix mobile overflow (F-03/F-11).**
   - Add `overflow-x: clip` and contain decorative glows; ensure no overflow at 320–414px; raise primary targets to ≥44px.
8. **Harden Android.**
   - Declare Capacitor deps + lockfile + scripts; regenerate; CI debug build.
   - Add `viewportFit:"cover"`, safe-area padding, `allowBackup=false`, and block local-mode new lives in the shell.
   - Add signing dry-run and account-deletion path.
9. **Security batch.**
   - Fix social block overwrite, OIDC link race, alive-cap TOCTOU, import bounds/400s, CSP, and explicit rate-limit failure policy.
10. **Testing and docs.**
    - Add schema 5–8 fixtures; run API e2e + web Playwright in CI; repair/quarantine the two slow tests.
    - Replace stale `PROJECT_STATUS.md`; reconcile README/deployment/HTTPS/Android docs.

**STAGE 01 exit:** no known duplication/data-loss path; production reproducible; OIDC revocation proven; CI green; Android clean build works; one Dossier on desktop; no horizontal mobile overflow; no new gameplay features.

---

## I. Verification

### I.1 Files inspected (representative, not exhaustive)

**Repository / docs**
- `README.md`, `PROJECT_ARCHITECTURE.md`, `PROJECT_STATUS.md`
- `STAGE_01_REPORT.md`, `STAGE_02_REPORT.md` … `STAGE_14_*`, `STAGE_04_5_4_IMPLEMENTATION_REPORT.md`
- `STAGE_11_0_INTEGRATION_AUDIT_REPORT.md`, `STAGE_11_1_*`, `STAGE_11_2*` (untracked)
- `ANDROID_PORT_AUDIT.md`, `ANDROID_PORT_RISKS.md`, `ANDROID_PORT_ROADMAP.md`
- `docs/architecture.md`, `docs/AUTHENTICATION.md`, `docs/DEPLOYMENT.md`, `docs/DATABASE_BACKUPS.md`, `docs/MONITORING.md`, `docs/ROLLBACK.md`, `docs/PRODUCTION_CHECKLIST.md`, `docs/ENDEMION_ID.md`, `docs/HTTPS_SETUP.md`, `docs/GITHUB_ACTIONS_DEPLOYMENT.md`, `docs/LOAD_TEST_REPORT.md`, `docs/Endemion_Life_Development_Blueprint_RU.docx` (text extracted)

**Game core**
- `packages/game-core/src/engine/save.ts`, `game.ts`, `types.ts`, `import.ts`
- `packages/game-core/src/character/*`, `life/*`, `narrative/*`, `legacy/*`, `economy/*`, `world/*`, `universes/*`
- `packages/game-core/test/*` (42 files; fixtures saves-v1..v4)

**API / data**
- `apps/api/src/main.ts`, `bootstrap.ts`, `app.module.ts`, `config.ts`
- `apps/api/src/lives/*`, `live/*`, `auth/*`, `session/*`, `social/*`, `insights/*`, `portal/*`, `health/*`
- `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/*`
- `packages/shared/src/{schemas,views,auth}.ts`

**Web / Android / infra**
- `apps/web/src/app/*`, `components/play/*`, `components/dossier.tsx`, `lineage.tsx`, `economy-panel.tsx`, `social-panel.tsx`, `insights-panel.tsx`, `lib/{api,store,locale}*`
- `apps/web/next.config.ts`, `playwright.config.ts`, `e2e/*`
- `capacitor.config.ts`, `android/*`, `apps/android/www/*`
- `Dockerfile`, `infrastructure/docker-compose.prod.yml`, `infrastructure/nginx/*`
- `.github/workflows/ci.yml`, `security.yml`, `deploy.yml`

### I.2 Commands executed (safe/read-only)

```text
git status --short
git log --oneline --decorate -n 10
git rev-list --left-right --count origin/main...HEAD
rg / Get-ChildItem / Select-String over source and docs
pnpm --filter @endemion/game-core test
pnpm --filter @endemion/api test
pnpm --filter @endemion/shared test
pnpm --filter @endemion/game-core exec vitest run test/stage01-life-upgrade.test.ts test/stage04-events.test.ts test/stage04-import.test.ts --testTimeout=30000
curl -sS -D - https://life.endemion.online/api/health
ssh <read-only> "cd /opt/endemion-life && git status --short && git rev-parse HEAD"
psql <read-only aggregates>   # counts only; no personal data extracted
browser: mobile viewport navigation/screenshots/console/perf on public pages
```

No migrations, writes, installs, builds, deploys, or production mutations were performed.

### I.3 Test results

| Command | Result | Notes |
|---|---|---|
| `pnpm --filter @endemion/game-core test` | **606 passed, 3 failed / 609** | 1 real provenance failure; 2 tests hit 5s timeout |
| Same 3 files with `--testTimeout=30000` | **2 passed, 1 failed** | Timeouts were slow, not broken; provenance still fails |
| `pnpm --filter @endemion/api test` | **74 passed / 74** (7 files) | Portal JWKS warning logs expected |
| `pnpm --filter @endemion/shared test` | **12 passed / 12** (2 files) | — |
| API e2e | **NOT RUN** | Requires PostgreSQL/Redis test DB; audit avoided mutable state |
| Web Playwright | **NOT RUN** | Requires built app + DB; audit avoided mutable state |
| Android Gradle build | **NOT RUN** | No trustworthy clean build path; see F-02 |
| `pnpm check` / full build | **NOT RUN** | Would write build artifacts; not needed for audit |

### I.4 Production evidence (read-only)

- Branch `main`, HEAD `ca72b8b`; working tree clean; API image built 2026-11-09.
- `/api/health` → 200, `database: up`, `redis: up`.
- Homepage 200; HSTS/nosniff/frame/referrer/permissions headers present; **no CSP**.
- 18 players, 43 lives, 0 accounts, 29 sessions, 5,381 actions, 8,037 history entries, 1,642 snapshots, 0 ties, 0 live windows, 220 insights; DB 48MB.
- Lives: schema 1/2/5/8, 16 schema-8 alive, 22 schema-8 dead; 6 lineages, max generation 4, 10 lives with predecessor; no local-import lives.
- Host: 1 vCPU / 2GB, 999MB used, 826MB available, 2GB swap (11MB used); disk 22G, 15G used, 6.4G free.
- Backup `last-success` current at audit time.
- Mobile Chrome (390×844): TTFB 42ms, DCL 147ms, load 167ms, 471KB compressed JS/CSS, 58px horizontal overflow, no console errors. `/worlds` and `/create/dark-fantasy` fit; all six worlds render.

### I.5 Documentation existence

| Document | Result |
|---|---|
| `STAGE_01_REPORT.md` | **Exists** at repo root (historical, superseded) |
| `STAGE_01_5_FINAL_REPORT.md` | **Absent from working tree**; deleted in `c7951d0`; text exists in git history |
| `V03_STATUS.md` | **Never existed** in any commit/ref; already noted missing by Stage 04/05 docs |
| `STAGE_01_5_REPORT.md`, `STAGE_01_5_AUDIT.md` | Deleted in `c7951d0`, history only |
| All Stage 01–14 reports | Present; historical/superseded; deployment claims conflict |
| Architecture/gameplay/save/deployment docs | Present; several stale or partial (see `PROJECT_AUDIT.md`) |
| Target GDD | `docs/Endemion_Life_Development_Blueprint_RU.docx` (untracked, v1.0) |

### I.6 Items not verified

- API e2e and web Playwright in this audit (not run; CI config exists).
- Full `pnpm check`/production build (not run to avoid writing artifacts).
- Android Gradle build, emulator/device behavior, signing, Play review.
- Staging environment and portal deployment (none exists).
- OIDC flows against the live provider (production has 0 accounts).
- Live-window/claims against production data (none exist).
- Load/soak/chaos and disaster-recovery restore.
- Complete security penetration test; findings are static/code-review based.
- Exact behavior of every event/universe combination; counts are static.

### I.7 Known limitations

- Production is a single 1 vCPU/2GB host; performance conclusions are for current load, not capacity.
- The codebase has uncommitted work; audit preserved it and did not judge unfinished portal code as shipped.
- Some documentation is aspirational or contradictory; statuses here rely on source/tests/production, not doc claims.
- Test counts include unit/e2e definitions; not all were executed in this audit.
- No player PII, secrets, tokens, or credentials are included in this report.

### I.8 Audit integrity

- No production files, database rows, save schemas, dependencies, or deployments were modified.
- No commits were created.
- Pre-existing modified/untracked files were left untouched.
- Only new files under `docs/audit/` were created, plus no changes outside that directory.

**STAGE 00 verdict:** the project is worth continuing and has a strong base, but it is **not ready** for multiplayer, Android release, or a player economy. Complete STAGE 01 stabilization first; then deepen the solo game and dynasty; then add the shared world incrementally.
