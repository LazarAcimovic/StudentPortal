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
| 22 | Tests — backend integration, frontend unit + integration, e2e | 33/39 | all four suites landed and green; 6 boxes lost their owner when tasks 23 and 25 were dropped | — | — | [task-22-tests.md](task-22-tests.md) |

## Order of work

**Subtasks are done in the order they appear in their task file.** The numbering *is* the order, which is why an agent resumes at the first unchecked subtask (AGENTS §4.1) rather than picking what looks most urgent.

Within task 22, 22d (Playwright) stays last — it is the end-loaded e2e sweep and depends on everything else existing.

New tasks follow [`../TEMPLATE.md`](../TEMPLATE.md).

Structural work that changes no behaviour is tracked separately as a **refactor campaign**, with its own index and its own number sequence: [`../../refactors/active/index.md`](../../refactors/active/index.md). Seven campaigns are open.
