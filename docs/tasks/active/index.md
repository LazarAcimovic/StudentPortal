# Active implementation tasks

> Open tasks live as individual files in this folder. Read this index first, then only the task file you are working on.
>
> **Resume at the first unchecked subtask** in that file and tick it in the same commit as its work (AGENTS §4). A task file still being here does not mean nothing has been done.
>
> Before archiving a task, pass the archival gate in AGENTS §4: every rule in its Overview must already live in PRD / UI / DB / Tech, every pointer to the task file must be repointed, and every subtask must be `- [x]`. Then, in one commit: append the trimmed entry to `docs/tasks/done/YYYY-MM.md`, delete the task file, remove its row here.

Progress counts **subtasks**, and a subtask counts as done only when every one of its boxes is ticked. `scripts/check-docs.mjs` recomputes these and fails the commit if a number here is stale.

`What's left` describes the *remaining* work in a dozen words or so; it never restates the count, and it only changes when the shape of what remains changes.

| Task | Title | Progress | What's left | Depends on | Blocks | File |
|---|---|---|---|---|---|---|
| 22 | Tests — backend integration, frontend unit + integration, e2e | 27/38 | 22a–22c essentially done, 6 subtasks part-ticked; **22d in progress** | 23 (23.15 owns escalation coverage) | — | [task-22-tests.md](task-22-tests.md) |
| 25 | Align the shipped UI with the rules settled in the consistency pass | 0/4 | not started | — | 22 (22c.7) | [task-25-ui-alignment.md](task-25-ui-alignment.md) |

## Order of work

**Subtasks are done in the order they appear in their task file.** The numbering *is* the order, which is why an agent resumes at the first unchecked subtask (AGENTS §4.1) rather than picking what looks most urgent. Task 23 therefore runs 23.12 → 23.13 → 23.14 → 23.15 → 23.16.

Two things to be aware of while working through it, neither of which changes the order:

- **23.13 is fixing a live bug, not adding a feature.** The API requires `SubjectCode` and no admin form sends it, so creating or editing a subject from the UI fails with `400` until 23.13 lands. If that blocks you sooner, pull 23.13 forward deliberately — do not drift into it halfway through 23.12.
- **23.12 cannot be manually verified before 23.14.** Until the seed sets subject codes, every subject shares the empty code, so the eligible-professor list is noise. The subtask carries its own `Depends on:` line saying so. Unit tests are unaffected.

Across tasks, 22d (Playwright) stays last — it is the end-loaded e2e sweep and depends on everything else existing.

New tasks follow [`../TEMPLATE.md`](../TEMPLATE.md).

Structural work that changes no behaviour is tracked separately as a **refactor campaign**, with its own index and its own number sequence: [`../../refactors/active/index.md`](../../refactors/active/index.md). One campaign is open.
