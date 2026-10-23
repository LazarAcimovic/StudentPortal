# Active implementation tasks

> Open tasks live as individual files in this folder. Read this index first, then only the task file you are working on.
>
> **Resume at the first unchecked subtask** in that file and tick it in the same commit as its work (AGENTS §4). A task file still being here does not mean nothing has been done.
>
> Before archiving a task, pass the archival gate in AGENTS §4: every rule in its Overview must already live in PRD / UI / DB / Tech, every pointer to the task file must be repointed, and every subtask must be `- [x]`. Then, in one commit: append the trimmed entry to `docs/tasks/done/YYYY-MM.md`, delete the task file, remove its row here.

Progress counts **subtasks**, and a subtask counts as done only when every one of its boxes is ticked. `scripts/check-docs.mjs` recomputes these and fails the commit if a number here is stale.

| Task | Title | Progress | Status | Depends on | Blocks | File |
|---|---|---|---|---|---|---|
| 22 | Tests — backend integration, frontend unit + integration, e2e | 20/38 | 22a–22c essentially done, 6 subtasks part-ticked; **22d not started** | 23 (23.15 owns escalation coverage) | — | [task-22-tests.md](task-22-tests.md) |
| 23 | Escalation workflow for unresolved appeals | 11/16 | backend + professor/student UI shipped; **admin tab, SubjectCode form, seed and all tests outstanding** | — | 22 | [task-23-escalation.md](task-23-escalation.md) |
| 24 | `<PasswordInput>` primitive and a toggle on every password field | 0/4 | not started | — | 22 (22b.9) | [task-24-password-input.md](task-24-password-input.md) |
| 25 | Align the shipped UI with the rules settled in the consistency pass | 0/4 | not started | — | 22 (22c.7) | [task-25-ui-alignment.md](task-25-ui-alignment.md) |

## Suggested order

1. **23.13** — the admin subject forms do not send `SubjectCode` while the API requires it, so creating or editing a subject from the UI currently fails with `400`. This is a live bug; do it first.
2. **23.12, 23.14, 23.15** — finish escalation: the admin tab, the seed codes, and the tests that 23.1–23.11 shipped without.
3. **24** — build `<PasswordInput>` and adopt it, which also closes 22b.9.
4. **25** — the three-stage professor layout and the statistics check.
5. **22d** — Playwright, last, as the end-loaded e2e sweep.

Refactor campaigns are tracked separately in `docs/refactors/` and are not tasks. One is open: [legacy-frontend-cleanup.md](../../refactors/legacy-frontend-cleanup.md).
