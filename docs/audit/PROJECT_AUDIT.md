# Endemion Life — Project Audit

**Stage:** STAGE 00 — Complete Project Audit
**Audit date:** 2026-11-13
**Auditor role:** Senior Software Architect / Game Director / Technical Lead / QA Lead
**Repository:** https://github.com/Yuta2Endo/Endemion-Life
**Production:** https://life.endemion.online · `/opt/endemion-life`
**Mode:** Read-only. No gameplay, schema, dependency, deployment or production changes were made.

---

## 1. Executive snapshot

Endemion Life is a working, server-authoritative, single-player life-simulation RPG with six distinct worlds, a deterministic rules engine, generational succession, a per-life economy and a substantial narrative layer. It is deployed and healthy in production. It is **not** currently a multiplayer game, does not have a shared living world, and does not have a player-driven economy or social organizations.

The strongest asset is the pure game engine in `packages/game-core`: it is deterministic, versioned, save-migrated and reasonably well tested. The web shell and NestJS API form a coherent product around it, with a same-origin cookie session and a transactional action pipeline. These are worth preserving.

The main risks are not "the game is broken". They are:

1. **Release reproducibility:** production runs commit `ca72b8b`, but local `main` is `cda9a39` and `origin/main` is still `c7951d0`. The deployed release is not reproducible from GitHub, and 74 portal documents plus the portal API code are untracked.
2. **Android is a demo shell, not a deliverable:** the app is a remote-URL Capacitor WebView, but Capacitor is absent from `package.json`/`pnpm-lock.yaml`, so a clean checkout cannot build it; there is no tracked signing configuration.
3. **Economy/security integrity:** a live-window claim can be restored and re-claimed for repeat gold (`P1`), and OIDC sessions can outlive provider revocation during offline grace (`P1`).
4. **Save/import trust:** `parseSave` is strict at the top level but shallow for newer additive fields; imports accept client-authored age/version/history within caps.
5. **Desktop UI regression:** the play grid renders a fourth, duplicate Dossier at desktop widths (`lg`), wrapping the timeline.
6. **Multiplayer is absent by design, not partially present:** there is no WebSocket/SSE, no shared character state, no presence, no player trade, no guild. Live windows and friendships are the only shared tables, and both have zero production rows.

Production data confirms the gap: **18 players, 43 lives, 0 accounts, 0 ties, 0 live windows**. The deployed game is being used as a guest single-player experience.

---

## 2. Audit basis and method

Evidence was collected from:

- Static inspection of the working tree at HEAD `cda9a39`.
- Git history and branch comparison.
- Existing documentation, including the target blueprint `docs/Endemion_Life_Development_Blueprint_RU.docx`.
- Existing test suites (unit tests run; E2E not run against production).
- Read-only SSH inspection of `/opt/endemion-life` and aggregate SQL queries against production.
- Read-only browser inspection of production at desktop and 390×844 mobile viewport.
- Production HTTP headers, health endpoint, asset payload measurements and DB size aggregates.

No production mutation was performed. No game action, account creation, trade, claim or restore was executed against production. No secret value is reproduced in this audit.

### Status vocabulary

| Status | Meaning |
|---|---|
| **COMPLETE** | Implemented and exercised by tests or production evidence; no known blocker for its current scope. |
| **PARTIAL** | Implemented for a narrower scope than the target; real code exists, not a stub. |
| **MISSING** | No implementation found. |
| **BLOCKED** | Implementation exists or is planned but cannot proceed without an external decision/infrastructure. |
| **NOT VERIFIED** | Code exists, but the audit did not execute the relevant path (build, device, production flow). |

A feature is never marked COMPLETE from documentation alone.

---

## 3. Repository state

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD | `cda9a39f4717d3c1d4890fa6e3be703e349e78ea` — "docs: record production deployment of stage 04.5.4 release ca72b8b" |
| Deployed code commit | `ca72b8b` (living world stages 04.3–04.5.4) |
| Previous release | `1bcf224` |
| `origin/main` | `c7951d0` |
| Local vs origin | 3 commits ahead, not pushed |
| Working tree | 4 tracked modifications, 74 untracked Stage 11.x reports, `apps/api/src/portal/`, and the blueprint `.docx` |
| Node / pnpm | Node >= 24, pnpm 12.16.1 |
| Main stack | NestJS 12, Next.js 16.4.4 / React 19, Prisma 7 / PostgreSQL, Redis, TypeScript 6, Vitest 5, Playwright |
| Production host | 1 vCPU, 2 GB RAM, 22 GB disk (71% used), PostgreSQL + Redis + nginx + Caddy + monitoring containers |

**Uncommitted work that must be preserved:** `.env.example`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`, `packages/shared/src/views.ts`, `apps/api/src/portal/`, all untracked Stage 11.x reports, and the blueprint. This audit did not modify them.

The production tree is clean at `ca72b8b`. It does not contain the local Stage 11.2 portal code or the untracked reports. Therefore local and production are **not the same artifact**.

---

## 4. Product surface

### 4.1 What a player can do today

- Create a life in one of six worlds, choosing name, gender, race, origin and temperament; other traits and stats are rolled deterministically.
- Advance one, five or ten years; resolve events with choices, stat checks and consequences.
- Use manual, automatic or milestone-driven life modes.
- Inspect character stats, resources, skills, talents, weaknesses, profession, education, faction standing and track rank.
- Interact with NPCs, build affinity and read NPC life stories.
- Play adventures (two places and two adventures per world, three steps), trade in a per-life market, observe a regional economy, and pursue world mastery objectives.
- Die, leave an heir, continue the lineage, and inspect a family tree, chronicle, achievements, inheritance and dynasty renown.
- Restore an earlier save snapshot (with limits).
- Create a guest life locally in the browser when the cloud API is unavailable.
- Import a local life into the cloud.
- Manage friendships/blocks on `/social` and view live-world windows (if any exist).

### 4.2 What does not exist

- Real-time or asynchronous multiplayer gameplay.
- Shared player characters in one world.
- Player-to-player trade, mail, guilds, associations, businesses or shared projects.
- Presence, chat, parties, matchmaking or leaderboards.
- A server-side world simulation shared by players.
- A player-driven economy or persistent item/currency market.
- Native push notifications, Android offline play, or a signed Play Store release.
- Account deletion (web or Android).

---

## 5. Documentation audit

### 5.1 Mandatory documents

| Document | Exists? | Location / status | Assessment |
|---|---|---|---|
| `STAGE_01_REPORT.md` | Yes | repository root | Historical; describes the "Life Experience Upgrade" release `1c5bb41`, superseded many times. |
| `STAGE_01_5_FINAL_REPORT.md` | **No longer in tree** | exists in git history; added `3eebf7c`, last present `2812b01`, deleted by `c7951d0` | Historical CI/ops closure; says CI had 0 successful runs of 8 at the time. Not current evidence. |
| `V03_STATUS.md` | **Never existed** | no tree entry in any commit/ref | Must be treated as missing, not as a stale file. Stage 04 and Android docs already record its absence. |
| Stage reports 01–14 | Yes | root | Four different numbering systems collide; see §5.3. |
| Stage 04.1–04.5.4 reports | Yes | root | Current for the deployed gameplay release; 04.5.4 is the latest release evidence. |
| Stage 11.0–11.2.7 integration reports | Yes, untracked | root, 74 files | Portal identity/staging planning. 11.2.2–11.2.7 are planning or blocked; no infrastructure was created. |
| Android audit/risks/roadmap | Yes | root | Useful technical analysis, but based on an older commit and contradicted by code (see ANDROID_READINESS.md). |
| `docs/architecture.md` | Yes | docs | Detailed but stale; predates Stage 11.x/portal and mixes old stage numbering. |
| `docs/AUTHENTICATION.md` | Yes | docs | Covers the legacy password path; production direction is Endemion ID. |
| `docs/DEPLOYMENT.md` | Yes | docs | Stale: describes the 2026-11-04 Stage 03/04 deployment and save format 5. |
| `docs/DATABASE_BACKUPS.md`, `MONITORING.md`, `ROLLBACK.md`, `PRODUCTION_CHECKLIST.md`, `GITHUB_ACTIONS_DEPLOYMENT.md`, `HTTPS_SETUP.md`, `GIT_WORKFLOW.md` | Yes | docs | Operationally useful; not all procedures were re-executed; some claims are stale. |
| `docs/LOAD_TEST_REPORT.md` | Yes | docs | Desktop Docker load test, explicitly not production capacity evidence. |
| `docs/Endemion_Life_Development_Blueprint_RU.docx` | Yes, untracked | docs | Target GDD v1.0 dated 2026-11-13. This is the authoritative **target vision**, not status. |
| Architecture / gameplay / save / deployment / roadmap docs in one current set | **No** | — | There is no single current document that describes the deployed system end-to-end. |

### 5.2 Documentation contradictions found

1. `PROJECT_STATUS.md` claims HEAD `c7951d0`, "deployment only local", and Stage 10 not started. All three are false today: HEAD is `cda9a39`, production is live at `ca72b8b`, and Stage 10–14 plus 04.x are implemented.
2. `STAGE_11_0_INTEGRATION_AUDIT_REPORT.md` calls the working tree clean and production version unknown, while its own reports are untracked and `STAGE_04_5_4` documents production `ca72b8b`.
3. Stage 14 says it deployed `c7951d0`, but the tree at deployment contained uncommitted Stage 12–13 code. `ca72b8b` later committed the whole tree and was deployed. The release history cannot be reconstructed from the stage narrative alone.
4. `README.md` still points to Stage 01 as the current stage and links a report deleted in `c7951d0`.
5. `docs/DEPLOYMENT.md` describes six migrations and save format 5; the code has ten migrations and schema 8.
6. `docs/HTTPS_SETUP.md` says HSTS is disabled; the deleted Stage 01.5 report says enabled; production currently sends HSTS `max-age=63072000`.
7. Android docs claim Stage 02–06 complete, device QA and `infra:qa` scripts; those reports/scripts are absent, mobile safe-area/touch changes are absent, and the native build is not reproducible.
8. `docs/architecture.md` says "there are no shared adventures: one player still enters one save" — accurate for the deployed game, but it conflicts with the blueprint's shared-world target and with marketing-adjacent wording elsewhere.

### 5.3 Four numbering systems

- **Old road, Stages 01–24** (early November): included live windows, insights, region/adventure, and was largely deleted at `c7951d0`.
- **Second road, Stages 01–14**: life experience, living world, NPC social simulation, dynasty, world continuity, balance/QA, dynasty identity, chronicle/factions, consequences, metrics, UI, soak, E2E/deploy.
- **04.1–04.5.4**: personality/goals, world simulation, relics, narrative chains, world–narrative integration, dynasty influence, generational memory, feedback. This is the deployed release.
- **Integration 11.0–11.2.7**: portal JWT read-only profile integration. The "11.x" label collides with the game's own Stage 11 (world metrics) and was explicitly noted in the 11.0 audit.

The absence of a single current status document is itself a project risk: different readers will believe different release states.

---

## 6. Production evidence

Read-only checks on 2026-11-13:

| Check | Result |
|---|---|
| Git in `/opt/endemion-life` | branch `main`, HEAD `ca72b8b`, clean |
| `/api/health` | `200`, database `up`, Redis `up`, uptime ~309,699 s at check time |
| Homepage | HTTP/2 `200`; HSTS, nosniff, frame deny, referrer and permissions policies present; **no CSP observed** |
| Containers | nginx, api, web, postgres, redis, backup, monitor running; API image built 2026-11-09 |
| DB size | 48 MB |
| Players / lives | 18 / 43 |
| Accounts | **0** |
| Sessions / game actions / history / snapshots | 29 / 5,381 / 8,037 / 1,642 |
| Ties / live windows / insights | **0 / 0** / 220 |
| Lives by schema | schema 1: 1 alive; schema 2: 2 dead; schema 5: 2 dead; schema 8: 16 alive + 22 dead |
| Lineages | 6, max generation 4, 10 lives with predecessor |
| Local imports | 0 |
| Backup freshness | `last-success` updated 2026-11-13 03:30 |
| Host capacity | 1 vCPU, 2 GB RAM (999 MB used, 826 MB available), 2 GB swap, disk 71% used |

Interpretation:

- The game has real usage but very small scale.
- Every current player is a guest; no account/login path has production evidence.
- No social or live feature has production usage. Their tables exist but have never been exercised with real data.
- Old-schema lives exist in production. Backward compatibility is not theoretical.
- The host is adequate for the current single-player load but has little headroom for a shared simulation or many concurrent users.

---

## 7. Maturity scorecard

| Area | Rating | Basis |
|---|---|---|
| Game engine | **Good** | 83 source files, 609 tests, deterministic design, migration chain, strong top-level validation. |
| Gameplay breadth | **Moderate** | Six worlds with distinct rules; dynasty, economy, adventures, region, mastery. Content volume per world is modest and mostly single-life. |
| Web frontend | **Moderate–Good** | Coherent RSC shell, complete play surface, bilingual UI. Desktop layout regression, bundle weight, missing loading/error boundaries. |
| Backend | **Good for single-player** | Transactional actions, row locks, idempotency, hashed sessions, scrypt, OIDC PKCE. Some races and operational gaps. |
| Data integrity | **Moderate** | Migrations additive and versioned, but shallow validation in new fields, no v5–v7 fixtures, import trust, restore/live inconsistency. |
| Security | **Moderate** | Strong baseline; OIDC offline grace, live duplication, unencrypted backups and fail-open rate limits are material. No P0 proven. |
| Performance | **Adequate now, weak at scale** | Fast idle responses; full 12 KB state + 13 KB snapshot per action; 44% of DB is snapshots; 1 vCPU. |
| Tests | **Moderate** | 609 game-core, 74 API unit, 12 shared; strong static coverage. 1 real failure, 2 flaky; E2E not run in audit; no Android tests. |
| Android | **Early prototype** | Remote WebView shell; no reproducible dependency graph; unsigned; no store compliance. |
| Multiplayer | **Absent** | No realtime transport, shared characters, trade, guilds or world state. Only ties and live windows. |
| Documentation | **Poor as a system** | Many detailed reports, but stale/duplicated/conflicting, four numbering schemes, missing mandatory docs. |

---

## 8. Core conclusions

1. **Preserve the engine and the action contract.** The pure `applyAction(state, action)` model, deterministic RNG streams, versioned saves and server-side validation are the right foundation.
2. **Do not build multiplayer on the current `Life.state` JSON alone.** A shared world needs separate authoritative entities and a simulation boundary, not just more fields in each player's save.
3. **Fix integrity before adding features.** The live claim/restore duplication and OIDC revocation gap are small fixes with large trust impact.
4. **Make Android reproducible before promising Android.** A remote shell is a valid strategy, but it must be pinned, signed, tested on device, and compliant with Play policy.
5. **Restore release discipline.** Production must be built from a pushed, tagged commit; untracked portal work must not linger indefinitely.
6. **The target GDD is a direction, not a schedule.** Life simulation, dynasty and six worlds are real. Multiplayer, social organizations, a player economy and Android release are not.

Detailed findings are in the other 13 audit documents in this directory. The final consolidated verdict and Stage 01 actions are in `STAGE_00_REPORT.md`.
