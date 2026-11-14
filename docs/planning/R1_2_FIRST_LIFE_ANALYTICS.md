# R1.2 — First-Life Analytics and Funnel

**Status:** implemented locally, verified, not deployed<br>
**Save schema:** 14 (unchanged)<br>
**DB migration:** none — uses existing `insight` and life/history tables

## 1. Purpose

R1.1 added the First Life Guide. R1.2 makes its effect measurable without collecting personal data.

Two questions:

1. Do new players reach adulthood, make a decision, finish a life and continue the line?
2. Do players see and use the guide?

## 2. Client signal

`POST /api/insights/guide`

Body:

```json
{ "lifeId": "uuid", "event": "view" }
```

Allowed events: `view`, `advance`, `event`, `dossier`, `dismiss`.

Rules:

- requires a player session (guest or account);
- the life must belong to the current player;
- world and age are read from the database, not trusted from the client;
- ref is `lifeId:event:age`, so repeated signals for the same year deduplicate through the existing unique `(name, ref)` index;
- no free-form text, email, name or IP is stored in the insight row;
- failure never blocks play (`trackGuide` is fire-and-forget).

The guide sends `view` on mount and one signal for each explicit action.

## 3. Funnel

`GET /api/insights/funnel?days=30` — ops-only, same `x-live-ops` token as the existing insights endpoint.

Server-derived fields for lives created in the window:

| Field | Source |
|---|---|
| `lives.created` | `lives.created_at` |
| `lives.players` | distinct `player_id` |
| `lives.adults` | current/final age ≥ 18 |
| `lives.decisions` | at least one `history_entries.kind = event` |
| `lives.deaths` | `status = dead` |
| `lives.successors` | a successor life exists |
| `rates.adult/decision/death/successor` | ratios, 0–1 |
| `guide.view/advance/event/dossier/dismiss` | guide insight names |
| `byWorld` | created lives per universe |

No names, emails, free text or life ids are returned. The response is aggregate only.

## 4. Admin UI

`/insights` now loads both the existing facts summary and the funnel after the ops token is entered. It shows:

- created lives, players;
- reached adulthood and percentage;
- made a decision and percentage;
- completed life and percentage;
- continued the line and percentage of deaths;
- five guide counters.

## 5. Verification

| Check | Result |
|---|---|
| API e2e | **156/156**, 19 files |
| New R1.2 API tests | **2/2** |
| Guide e2e desktop + mobile | **2/2** |
| Web unit | **30/30** |
| Game-core unit | **775/775** |
| Shared unit | **18/18** |
| Typecheck | PASS |
| Web production build | PASS |
| Lint | 0 errors, pre-existing `play-screen.tsx:175` warning |

The two new API tests cover ownership, event validation, deduplication, session requirement, ops-token protection and funnel counts.

## 6. Limitations

- Guide events are client-reported; they prove exposure, not understanding.
- The funnel is retrospective from current life rows; a life that died before the window is included only by `createdAt`, as intended.
- Decisions are counted from history rows, not from distinct choices.
- No cohort retention yet; `days` provides a rolling window only.
- `LIVE_OPS_TOKEN` is absent in production compose by default, so the admin endpoint and `/insights` page are closed until the token is supplied.
- No chart library or export; the panel is deliberately text-first.

## 7. Rollback

No database migration. Reverting the code removes the endpoint and the guide signals; existing insight rows remain harmless and expire after 90 days.
