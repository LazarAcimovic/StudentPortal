# Refactor — remove the pre-feature-sliced frontend leftovers

> Campaign plan, not a task. When every step is done, move this file to `docs/refactors/done/` (AGENTS §5).

## Why

`Tech-Frontend.md` §1 describes a feature-sliced layout, and new code follows it. Several folders predate that layout and still sit in `src/`, holding files that nothing imports or that duplicate a feature-sliced equivalent. While they exist, an agent reading the tree can justify either layout, which is exactly the ambiguity the consistency pass set out to remove. §1 currently marks them "do not extend"; this campaign deletes them.

## Scope

| Path | State | Action |
|---|---|---|
| `src/models/` (7 files) | superseded by per-feature `models/` folders | re-point any remaining import at the feature model, then delete |
| `src/services/data/*Mock.ts` (6 files) | mock data from before the real API existed | delete; MSW fixtures in `src/test/helpers/fixtures/` replace them |
| `src/pages/dashboard/`, `src/pages/login/` | empty or superseded by `features/*/pages/` | delete |
| `src/test/renderWithProviders.tsx`, `src/test/time.ts` | duplicates of the `src/test/helpers/` versions | re-point imports at `helpers/`, then delete |
| `src/test/mswOverrides.ts` | predates `helpers/mswHandlers/` | fold into `helpers/mswHandlers/`, then delete |
| `src/components/common/` | empty directory | delete |

Out of scope: `src/pages/HomePage.tsx`, which is the real public landing page (UI §4), and `src/shared/`, which is current.

## Steps

1. For each path, `grep` the whole of `src/` for imports of it. Record the hit count in the commit message.
2. Re-point any live import at its feature-sliced equivalent. **No behaviour changes in the same commit** — this is a `Refactor` (AGENTS §9): the existing suites must stay green and no new test is required.
3. Delete the path.
4. Run `npm run test` and `npm run build`. Both must pass before moving to the next path.
5. Update `Tech-Frontend.md` §1 in the same commit: remove the deleted path from the "Legacy folders" paragraph, and refresh the `verified at <sha>` marker.

One path per commit, so a mistaken deletion is one revert:

```
refactor(frontend): remove legacy src/models in favour of feature models
refactor(frontend): remove mock data services superseded by MSW fixtures
refactor(frontend): remove superseded page folders
refactor(test): consolidate duplicate render and time helpers
```

## Done when

`Tech-Frontend.md` §1 has no "Legacy folders" paragraph left, `npm run test` and `npm run build` pass, and this file has moved to `docs/refactors/done/`.
