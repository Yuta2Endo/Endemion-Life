# Acceptance Criteria — Endemion Life

**Purpose:** measurable completion gates for STAGE 00–08. A stage is complete only when every applicable criterion has evidence (test, command output, screenshot, or signed release record). “Feature exists” is not acceptance.

**Legend:** ☐ required · ◐ conditional on scope · **Evidence** names the proof to attach.

---

## Global quality gates (apply to every stage)

| ID | Criterion | Evidence |
|---|---|---|
| G-01 | `pnpm check` passes (build packages, lint, typecheck, unit tests, web build) | CI log / local output |
| G-02 | API e2e passes against PostgreSQL + Redis | CI job log |
| G-03 | Web Playwright passes desktop + mobile projects | CI artifacts |
| G-04 | No new P0/P1 security finding; open findings tracked with owner | `SECURITY_AUDIT.md` delta |
| G-05 | No save-schema change without migration, fixture, rollback plan, and compatibility test | PR + test output |
| G-06 | No production deploy without tagged SHA, backup, migration plan, and rollback target | release record |
| G-07 | All new mutations are server-authoritative, idempotent where retryable, and authorization-scoped | code review + tests |
| G-08 | No secret in client bundle, logs, docs, or git history | gitleaks + bundle scan |
| G-09 | Production observability: health, error rate, latency, DB/Redis, backup age | dashboard/screenshot |
| G-10 | Documentation updated for behavior/config changes; no stale “current” claims | docs diff |

---

## STAGE 00 — Audit

| ID | Criterion | Evidence |
|---|---|---|
| 00-01 | All 14 required documents exist under `docs/audit/` | file list |
| 00-02 | Every status is evidence-based and distinguishes implementation from documentation | document review |
| 00-03 | No production changes, schema changes, dependency changes, or commits made | `git status` comparison |
| 00-04 | Mandatory docs searched: `STAGE_01_REPORT.md`, `STAGE_01_5_FINAL_REPORT.md`, `V03_STATUS.md` | audit inventory |
| 00-05 | Tests recorded with exact commands/results | `STAGE_00_REPORT.md` §Verification |
| 00-06 | Roadmap, target architecture, and acceptance criteria are actionable | review sign-off |

---

## STAGE 01 — Core Stabilization

### Release & provenance
- ☐ 01-R1 `origin/main` contains the exact SHA deployed to production (or a documented, reproducible build from it).
- ☐ 01-R2 Release is tagged; deploy record includes SHA, migration list, backup ID, rollback SHA.
- ☐ 01-R3 Portal code is either committed with tests + env wiring, or removed from the working tree and documented as deferred.
- ☐ 01-R4 `README.md`, `PROJECT_STATUS.md`, `docs/DEPLOYMENT.md`, `docs/HTTPS_SETUP.md`, Android docs match reality or are marked historical.

### Data integrity
- ☐ 01-D1 Live claim → restore → claim cannot mint a second reward; property test covers 100 random sequences.
- ☐ 01-D2 Restore reverses or irrevocably preserves live-window progress/part counts consistently; no shared counter inflation.
- ☐ 01-D3 Guest→account merge preserves all `LivePart` rows, `claimedAt`, and contribution history.
- ☐ 01-D4 Lineage consequence provenance preserves `sourceEventId` (failing test fixed; `item.src` used).
- ☐ 01-D5 Replay of an old `actionId` returns either the original result or a documented, tested response; no silent state jump.
- ☐ 01-D6 Save fixtures exist for schema 1, 2, 5, 8; each parses and can advance one year.
- ☐ 01-D7 Corrupt/invalid `Life.state` returns a controlled 4xx/503, not an unhandled 500; alert emitted.

### Security/auth
- ☐ 01-S1 Revoked/expired OIDC session cannot revive after offline grace; time-controlled e2e proves it.
- ☐ 01-S2 Social block ownership cannot be overwritten; block/evasion test passes.
- ☐ 01-S3 OIDC link race returns 409 and never creates a session for another player; concurrency test passes.
- ☐ 01-S4 Rate-limit policy is explicit for Redis outage; expensive routes do not silently fail open.
- ☐ 01-S5 Alive-life cap is enforced under 10 concurrent creates/imports/successions.
- ☐ 01-S6 Import rejects age > configured max, name > 64 chars, invalid version/seq with 400; no 500.
- ☐ 01-S7 CSP present in production headers and does not break Next/avatars; HSTS/cookies verified.
- ☐ 01-S8 Ops token is scoped/rotated or route-disabled; no shared token in public UI bundle.

### Frontend
- ☐ 01-F1 Exactly one Dossier is visible at `lg`; no fourth grid child; desktop screenshot.
- ☐ 01-F2 Homepage `scrollWidth <= viewport` at 320/360/390/414/768px; no horizontal scrollbar.
- ☐ 01-F3 Android shell blocks new local lives when API health is down; retry screen shown.
- ☐ 01-F4 Play route has `loading.tsx`/`error.tsx`; fetch timeout produces a recoverable error.
- ☐ 01-F5 Cloud-list failure is visible; it does not look like “no lives”.
- ☐ 01-F6 Primary touch targets ≥44px on phone; header does not overflow at 360px.

### Android
- ☐ 01-A1 Clean clone + frozen install + `cap sync` + Gradle debug build succeeds in CI.
- ☐ 01-A2 Capacitor dependencies pinned in package/lockfile; no orphan `node_modules` path.
- ☐ 01-A3 Safe-area insets respected on gesture/3-button nav; bottom nav/dialog not clipped (API 36 screenshot).
- ☐ 01-A4 Signed release AAB dry-run succeeds with protected secrets; versionCode documented.
- ☐ 01-A5 Account deletion path exists (in-app or compliant URL); privacy policy URL set.
- ☐ 01-A6 `allowBackup` disabled or excludes WebView data; documented.

### Tests
- ☐ 01-T1 All existing game-core tests pass; the two 5s timeout tests are fixed or explicitly quarantined with an issue.
- ☐ 01-T2 New regression tests cover D1–D6 and S1–S6.
- ☐ 01-T3 API e2e and web Playwright run in CI (not only locally).
- ☐ 01-T4 No new flaky test; retries only for documented network races.

**STAGE 01 exit:** all P1 blockers closed; no new gameplay features; production reproducible.

---

## STAGE 02 — Advanced Life Simulation

- ☐ 02-01 Health/illness/injury states exist with causes, duration, recovery, and death interaction.
- ☐ 02-02 Cause of death is recorded and displayed for every death.
- ☐ 02-03 Education/career paths have prerequisites, choices, wages, unemployment, retirement.
- ☐ 02-04 Property/household/business can be acquired, maintained, and lost; expenses are visible.
- ☐ 02-05 Travel between settlements changes available events/economy.
- ☐ 02-06 Character creation offers meaningful agency (point-buy/background) while old saves still load.
- ☐ 02-07 A 60–80 year simulated life has ≥1 meaningful choice in each of health, education, career, property.
- ☐ 02-08 Economy/aging balance stays within agreed bands over 1,000 simulated lives.
- ☐ 02-09 Schema 8 saves advance without migration loss; new fields optional/normalized.
- ☐ 02-10 Long-run soak test passes without exceptions or unbounded state growth.

---

## STAGE 03 — Dynasty & Legacy

- ☐ 03-01 Relics are obtainable, inheritable, and losable in normal play (not test-only).
- ☐ 03-02 World tick and social memory persist across succession.
- ☐ 03-03 Family property/heirlooms/guardianship/regency work and are visible.
- ☐ 03-04 Player can choose an heir with visible consequences; AI heir choice is explainable.
- ☐ 03-05 Each world's inheritance law produces distinct tested outcomes.
- ☐ 03-06 Five consecutive generations can be played without corruption or duplication.
- ☐ 03-07 Succession + restore cannot duplicate heirs, property, or relics.
- ☐ 03-08 Family chronicle/achievements persist and render across generations.
- ☐ 03-09 Cross-generation economy stays within inflation bounds.

---

## STAGE 04 — Living Worlds

- ☐ 04-01 `World`/`Season`/`Settlement`/`Faction`/`WorldEvent` tables exist with ownership and constraints.
- ☐ 04-02 A season tick is deterministic and replayable from seed + command log.
- ☐ 04-03 Two players see identical settlement/faction state for the same season.
- ☐ 04-04 World feed/prices/resources are visible in web UI.
- ☐ 04-05 Solo life advance works without requiring a shared-world write.
- ☐ 04-06 Tick failure rolls back atomically and alerts; no partial season.
- ☐ 04-07 Projection lag and tick duration are measured and within budget.
- ☐ 04-08 Admin world controls require scoped auth and write an audit log.
- ☐ 04-09 Per-life world state and shared projection do not diverge silently; reconciliation report exists.

---

## STAGE 05 — Multiplayer Foundation

- ☐ 05-01 Account required for shared-world mutations; guests remain solo-only.
- ☐ 05-02 Presence works with heartbeat/reconnect; stale presence expires.
- ☐ 05-03 Two accounts receive each other's world notification in realtime.
- ☐ 05-04 Shared commands enforce idempotency + expected version + rate limit + audit.
- ☐ 05-05 Concurrent shared actions cannot duplicate rewards or corrupt projections (property tests).
- ☐ 05-06 Reconnect after network loss restores state without duplicate actions.
- ☐ 05-07 Account deletion/export works and removes/retains data per policy.
- ☐ 05-08 Moderation/report/block basics exist for shared surfaces.
- ☐ 05-09 Load test at target concurrency passes with documented latency/error budget.
- ☐ 05-10 Anti-cheat review: no client-supplied canonical rewards/seed for shared lives.

---

## STAGE 06 — Social & Economic Systems

- ☐ 06-01 Families/households support consent, roles, shared property, and cross-account inheritance.
- ☐ 06-02 Guilds/organizations support membership, roles, projects, reputation.
- ☐ 06-03 Append-only ledger records every currency/resource mutation; balances reconcile.
- ☐ 06-04 No negative/duplicated currency in randomized/property tests; anomaly alerts exist.
- ☐ 06-05 Player trade is atomic: complete or both sides unchanged; expiry/cancel work.
- ☐ 06-06 Shared market prices respond to supply/demand with sinks/faucets.
- ☐ 06-07 Businesses/contracts/wages/rent work in a narrow, tested scope.
- ☐ 06-08 Chat/notifications have moderation, report, block, and rate limits.
- ☐ 06-09 Admin corrections require audit and cannot silently mint currency.
- ☐ 06-10 Privacy: family/guild data visibility and consent are documented and enforced.

---

## STAGE 07 — Web & Android

- ☐ 07-01 Web performance budget met on low-end mobile (LCP/TBT targets agreed; measured).
- ☐ 07-02 Accessibility: keyboard/focus, labels, contrast, reduced motion, 44px targets.
- ☐ 07-03 Responsive: no overflow at 320–1440px; tablet layout usable; safe areas.
- ☐ 07-04 Android clean build/sign/AAB; internal testing track accepted.
- ☐ 07-05 Android login/logout/session and OIDC work on API 24/30/35/36.
- ☐ 07-06 Offline/network failure UX is graceful; no client-authoritative canonical life.
- ☐ 07-07 Web and Android share account/character/save.
- ☐ 07-08 Play compliance: privacy policy, data safety, account deletion, content rating, reviewer access.
- ☐ 07-09 Crash/ANR monitoring and rollback plan active.

---

## STAGE 08 — Final QA & Release

- ☐ 08-01 Full regression matrix passes: unit, API e2e, web e2e, Android, save schemas 1–8.
- ☐ 08-02 Restore/succession/live/trade/ledger property tests pass.
- ☐ 08-03 Load/soak/chaos: DB failover, Redis outage, worker crash, tick replay.
- ☐ 08-04 Backup restore into a clean environment meets documented RTO/RPO.
- ☐ 08-05 No open P0/P1 security findings; dependency audit clean/high findings accepted.
- ☐ 08-06 Incident runbooks/on-call/monitoring complete.
- ☐ 08-07 Staged rollout and rollback rehearsed.
- ☐ 08-08 Product sign-off on GDD success criteria.
- ☐ 08-09 Release notes, known limitations, and support plan published.

---

## Definition of Done (per feature)

A feature is done only when:

1. Behavior is implemented server-side where canonical.
2. Authorization and input validation are tested.
3. Idempotency/concurrency behavior is defined.
4. Save/migration impact is documented and tested.
5. UI has loading/error/empty states and mobile layout.
6. Unit + integration/e2e coverage exists for the happy path and at least one failure path.
7. Observability (logs/metrics/alerts) exists for new failure modes.
8. Documentation is updated.
9. Rollback/feature-flag path exists.
10. Acceptance criteria are checked with evidence, not asserted.

---

## Evidence register template

| Criterion | Evidence type | Location/link | Verified by | Date |
|---|---|---|---|---|
| e.g. 01-D1 | test output | CI run #… | … | … |

Keep this register in the release record. A checked box without evidence is not acceptance.
