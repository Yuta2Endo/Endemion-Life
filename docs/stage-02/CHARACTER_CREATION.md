# Character Creation: Upbringing & Point-Buy (Stage 02.5)

This document describes the optional creation choices added in Stage 02.5. The existing random birth remains the default and is unchanged when the new fields are omitted.

## Request

`POST /api/lives` accepts:

```json
{
  "universeId": "academy",
  "seed": "my-seed",
  "upbringingId": "ac-salon-upbringing",
  "statPoints": { "charisma": 2, "wisdom": 1 }
}
```

| Field | Rules |
|---|---|
| `upbringingId` | optional; id from the selected universe's `UniverseSummary.upbringings`. Unknown ids and packages from another world are rejected. |
| `statPoints` | optional object keyed by attribute names. Each value is an integer 0..2; the sum is at most 3. Unknown keys, negatives and fractions are rejected. |
| `stats`, `finalStats`, `character` | never accepted. The strict zod schema returns 400; the server computes final values. |

The client never sends a completed character. `createLifeSchema` and `game-core` both validate the intent; the server applies the package and points to the rolled character.

## Point-buy constants

- `POINT_BUY_TOTAL = 3`
- `POINT_BUY_PER_STAT = 2`
- `BIRTH_SKILL_MAX = 30` for starting skills

Final birth attributes are clamped to the existing `STAT_MIN` (1) and `BIRTH_STAT_MAX` (30). Existing race, origin and temperament modifiers are applied first, then the package, then the distributed points, then the clamp.

## Upbringing packages

Common packages are available in all six universes:

| id | Stats | Skills | Talent |
|---|---|---|---|
| `common-scholar` | INT +2, WIS +1, STR -1 | lore +8, medicine +4 | `quick-learner` |
| `common-martial` | STR +2, VIT +1, INT -1 | melee +8, athletics +5 | `iron-body` |
| `common-artisan` | AGI +1, INT +1, LCK +1, CHA -1 | craft +8, trade +4 | `golden-hands` |

World-specific packages:

| World | id | Stats | Skills | Talent |
|---|---|---|---|---|
| dark-fantasy | `df-chapel-ward` | WIS +2, WIL +1, AGI -1 | relic-lore +6, medicine +5 | `ash-blessed` |
| isekai | `is-guild-runner` | AGI +2, LCK +1, WIS -1 | guild-craft +6, survival +6 | `beast-senses` |
| murim | `mu-sect-yard` | AGI +2, WIL +1, CHA -1 | martial-arts +7, inner-cultivation +5 | `sword-heart` |
| xianxia | `xx-herb-garden` | WIS +2, INT +1, STR -1 | alchemy +7, survival +5 | `pill-sense` |
| hunter | `hu-gate-drill` | AGI +2, VIT +1, CHA -1 | dungeon-combat +7, athletics +5 | `gate-born` |
| academy | `ac-salon-upbringing` | CHA +2, WIS +1, VIT -1 | etiquette +7, persuasion +5 | `courtly-grace` |

A package talent is added to `character.talents` and counts toward the normal birth talent budget. It replaces one random talent rather than adding a fourth, and is excluded from random rolls and weakness conflicts.

## Determinism

- `generateCharacter` draws the same gender, race, origin, temperament, name and base statistics in the same order regardless of package or points.
- Applying a package and points performs no `Rng` calls. The life `rngState` after `newGame` is therefore the same with or without a choice.
- Same `seed` + same creation input -> identical `GameState` and identical birth history.
- Omitting both new fields produces the original random baseline.

## Persistence

`CharacterState.creation` is optional:

```ts
interface CharacterCreationState {
  upbringingId?: string;
  statPoints?: Partial<Record<StatKey, number>>;
}
```

Save schema is **13**. The 12 -> 13 migration only advances the version: old saves have no `creation` and remain readable. `seed`, `rngState` and all existing fields are preserved. `parseSave` validates a present `creation` against the world package catalogue and the point budget.

## UI

- `CreationChoices` renders package cards with stat, skill and talent details, plus a point-buy grid with remaining budget.
- The full `CreateForm` keeps the existing quick “Be born now” button; leaving the fields untouched sends no new choices.
- `CharacterSheet` and `Dossier` display the selected upbringing, its skills and talent.
- RU/EN strings live in `apps/web/src/lib/messages.ts`; the layout uses the existing responsive grid and accessible radio/button controls.

## Tests

| Area | Test file |
|---|---|
| Core rules, packages, determinism, old saves | `packages/game-core/test/stage02-character-creation.test.ts` |
| Request schema and view | `packages/shared/test/schemas.test.ts` |
| API authority and 400s | `apps/api/test/stage02-character-creation.e2e-spec.ts` |
| Package/point UI | `apps/web/src/components/creation-choices.test.tsx` |
| Full creation form render | `apps/web/src/components/create-form.test.tsx` |
