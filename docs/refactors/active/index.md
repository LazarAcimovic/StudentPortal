# Active refactor campaigns

> Open campaigns live as individual files in this folder. Read this index first, then only the campaign file you are working on.
>
> **Resume at the first unchecked subtask** and tick it in the same commit as its work (AGENTS §4.1 applies here verbatim). A campaign file still being here does not mean nothing has been done.
>
> A campaign changes **structure only**. No behaviour changes, no new tests — the existing suites are the safety net (AGENTS §9, `Refactor` sub-tag). If you find a bug while moving code, leave it and open a box on the task that owns it.
>
> Before archiving a campaign, check: every subtask `- [x]`, the Baseline table's "After" column filled in, the named suites green, the Tech layout block refreshed with a new `verified at <sha>`. Then, in one commit: **move the whole file** to `docs/refactors/done/YYYY-MM-<slug>.md` and remove its row here.

Progress counts subtasks; a subtask counts as done only when every one of its boxes is ticked. `scripts/check-docs.mjs` recomputes these and fails the commit if a number here is stale.

| Campaign | Title | Progress | What's left | Depends on | Blocks | File |
|---|---|---|---|---|---|---|
| 01 | Remove the pre-feature-sliced frontend leftovers | 3/7 | R01.6 next | — | — | [refactor-01-legacy-frontend-cleanup.md](refactor-01-legacy-frontend-cleanup.md) |

Campaigns have their own number sequence (`refactor-01`, `refactor-02`, …), independent of task numbers. New campaigns follow [`../TEMPLATE.md`](../TEMPLATE.md).

Feature work is tracked separately in [`../../tasks/active/index.md`](../../tasks/active/index.md).
