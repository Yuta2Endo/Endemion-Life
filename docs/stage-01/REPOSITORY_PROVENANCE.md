# Repository Provenance — STAGE 01

**Inspection date:** 2026-11-13  
**Repository:** `G:\III\endemion-life`  
**Rule:** no commit, push, merge, rebase, reset, clean, stash drop, or file deletion was performed.

---

## 1. Verified Git state

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD | `cda9a39f4717d3c1d4890fa6e3be703e349e78ea` |
| HEAD subject | `docs: record production deployment of stage 04.5.4 release ca72b8b` |
| `origin/main` | `c7951d008c51816f488b9aa8e3dbb4e3c56e05e6` |
| Ahead/behind | **3 ahead, 0 behind** (`origin/main...HEAD`) |
| Latest release-code commit | `ca72b8b` (`deploy-release`) — living world stages 04.3–04.5.4 |
| Previous commits | `1bcf224` footer contact; `c7951d0` origin/main |
| Production SHA (STAGE 00 evidence) | `ca72b8b70d0d1a657832d67ad6322312cd85a4b4` |
| Production branch/status at audit | `main`, clean working tree |

The three commits not on `origin/main`:

```text
cda9a39 docs: record production deployment of stage 04.5.4 release ca72b8b
ca72b8b living world: stages 04.3-04.5.4, dynasty panel, world feedback
1bcf224 footer: contact email to endemion@internet.ru
```

`ca72b8b` is present locally and is the parent of `HEAD`, so the deployed code is locally recoverable. It is **not** reachable from `origin/main`; a fresh clone of GitHub would deploy `c7951d0`.

---

## 2. Working tree

### Tracked modifications (4 files, +132/−7)

| File | Change |
|---|---|
| `.env.example` | Adds commented `PORTAL_*` settings |
| `apps/api/src/app.module.ts` | Registers portal controller/providers/guard and no-store middleware |
| `apps/api/src/config.ts` | Adds `PortalConfig`, env schema, validation |
| `packages/shared/src/views.ts` | Adds portal error codes and `PortalProfileView` |

### Untracked

- `apps/api/src/portal/` — Stage 11.2 portal implementation.
- 74 `STAGE_11_*` root reports (11.0 through 11.2.7).
- `docs/Endemion_Life_Development_Blueprint_RU.docx`.
- `docs/audit/` — STAGE 00 audit documents.
- `docs/stage-01/` — this stage’s documents.

**No uncommitted change was reverted, staged, or discarded.**

---

## 3. Portal provenance

The portal is an **unfinished integration**, not part of production:

- Code exists only in the working tree (`apps/api/src/portal/`).
- `app.module.ts` and `config.ts` reference it, so `pnpm typecheck`/tests compile it locally.
- `.env.example` documents it, but production compose and `env.production.example` do **not** pass `PORTAL_*`.
- Production has no portal routes enabled (audit observed no `PORTAL_*` env keys).
- STAGE 11.2 reports describe staging/verification plans but no deployed staging environment.
- Portal tests exist only as unit tests with fake Prisma/Redis; no e2e against real infrastructure.

**Decision status:** pending product-owner approval. STAGE 01 will document Option A (integrate) vs Option B (keep out of release) and will **not** delete or archive portal files.

---

## 4. Safety assessment

| Risk | Assessment | Mitigation |
|---|---|---|
| Deployed SHA not on remote | High | Keep local commits; after approval push `main` + tag release |
| Dirty tree mixes portal and release work | High | Do not commit during STAGE 01; separate changes by path; document |
| Untracked reports could be lost | Medium | Leave untouched; include in future commit only with approval |
| Local build differs from production | Medium | Record SHAs; CI builds from committed tree; release checklist |
| Accidental production change | Low (no deploy) | No deploy commands; no env/DB writes |
| Historical reports overwritten | Low | Only new `docs/stage-01/` files; no edits to root reports |

**Provenance conclusion:** implementation can proceed safely on the current tree because all work is additive and reversible, and production is untouched. Release is **blocked** until the tree is intentionally committed/pushed and the portal decision is approved.

---

## 5. Proposed safe recovery/release strategy (requires approval)

1. Preserve the current tree; finish STAGE 01 changes.
2. Review the diff by sub-stage; do not mix portal integration with stabilization.
3. Decide portal:
   - **A:** commit portal code + tests + compose/env wiring + staging verification.
   - **B:** keep portal out of the release; preserve its files/reports in a separate branch or archive with owner approval.
4. Create a stabilization commit (or small series) on `main`.
5. Push `main`; verify `origin/main` contains `ca72b8b`, `cda9a39`, and the stabilization commit.
6. Tag the release (`v0.1.x` or agreed scheme) and record the SHA.
7. Run CI from the pushed SHA; deploy only after separate approval.
8. Keep the production rollback SHA (`ca72b8b`) and a verified backup ID in the release record.

No step above is executed in STAGE 01 without explicit approval.
