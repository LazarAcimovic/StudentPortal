# Decision log

> Append-only. One numbered entry per resolved question. **Never edit or renumber an existing entry** — supersede it with a new one and mark the old one `Superseded by D-0NN`.
>
> Any `(per D-0NN)` reference in `PRD.md`, `Tech*.md`, `UI.md`, `DB.md` or a task file must resolve to an entry here. `scripts/check-docs.mjs` fails the commit if it does not.
>
> An entry is **not** a source of truth. It records *why* a rule is what it is. The rule itself lives in PRD / Tech / UI / DB.

---

## Format

```
### D-0NN — <one-line question>
**Decided:** <YYYY-MM-DD> · **Status:** Accepted | Superseded by D-0NN | OPEN | N/A
**Answer:** <the rule, one or two sentences>
**Lives in:** <PRD §x / UI §x / DB §x / Tech-Backend §x — where the rule is written down>
**Why:** <the reasoning, one or two sentences>
```

The four statuses:

- **Accepted** — the rule is in force and written in the documents named under **Lives in**.
- **Superseded by D-0NN** — a later entry replaced it. The old entry stays; it is never edited or renumbered.
- **OPEN** — the question is unanswered. It **blocks every section listed under Lives in**; do not write code that depends on it.
- **N/A** — the question was asked and the answer is "this system has none". **Lives in** becomes `—`, and **Why** says why it does not apply. This status exists so that "nobody asked" and "asked, and there are none" are distinguishable — a system with no deadlines should say so explicitly rather than leave a silence an agent can fill with an invention.

---

### D-001 — Where is the password show/hide toggle available?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** Every password field in the app has a show/hide eye toggle — login, admin create-user, and all three fields on the change-password page. There is no screen where a password input lacks it.
**Lives in:** PRD §5.2, PRD §5.10, UI §5, UI §8.3, UI §10, UI §11.2
**Why:** A toggle on one screen and not another is an inconsistency users notice, and the earlier split rule ("admin create only") was the source of a direct PRD/UI contradiction.

### D-002 — Does the initial 7-day student window auto-finalize the grade when it expires in silence?

**Decided:** 2026-10-23 · **Status:** Accepted (recovered from the retired `Q28` reference)
**Answer:** Yes. If the student takes no action for 7 calendar days after `Grade.ConfirmedAt` and no appeal was ever submitted, the grade becomes truly final on day 8, exactly as if the student had clicked **Confirm grade**.
**Lives in:** PRD §4.6, PRD §4.7
**Why:** Silence on a fresh grade is treated as acceptance, so grades do not hang open forever when a student never logs in.

### D-003 — Does the post-overdue window auto-finalize the grade when it expires in silence?

**Decided:** 2026-10-23 · **Status:** Accepted (recovered from the retired `Q53` reference)
**Answer:** No. If the student lets the second (post-overdue) window lapse without acting, the grade stays open. A grade with an overdue chain is only closed by a professor's accept/deny on a later student appeal, or through the escalation path (PRD §4.8).
**Lives in:** PRD §4.6, PRD §4.7
**Why:** The overdue chain exists because a *professor* failed to act. Auto-finalizing would let professor inaction silently lock a grade the student is still contesting.

### D-004 — How many decimals does Average Grade show?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** Two (`.toFixed(2)`), e.g. `8.37`.
**Lives in:** PRD §5.5, UI §6.3
**Why:** One decimal rounds 8.37 to 8.4 and hides real differences between students.

### D-005 — Which grades do the student stat tiles count?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** All four tiles count **only truly-final grades** (PRD §4.7). A grade that is confirmed but still inside the student's 7-day window, or held open by an appeal or an escalation, is counted by no tile except as "non-passed" per D-006.
**Lives in:** PRD §5.5, UI §6.3
**Why:** Statistics that move while a grade is still contestable are misleading, and "confirmed-passed" vs "truly-final" was a live PRD/UI contradiction.

### D-006 — What counts as a Non-passed Exam?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** Truly-final grades with `FinalGrade = 5`, **plus** every enrollment that has no truly-final grade yet (not graded, in-window, appealed, or escalated).
**Lives in:** PRD §5.5, UI §6.3
**Why:** From the student's point of view, anything not yet passed is outstanding work. The two populations are disjoint, so nothing is double-counted.

### D-007 — Which appeal gates Earned ECTS?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** Only the **single most recent appeal** on the grade (highest `SubmittedAt`). If that appeal is effectively Pending (including Overdue) or Accepted-awaiting-reconfirm, ECTS does not count. A superseded older appeal — in particular an overdue one the student has already answered with a newer appeal — never blocks ECTS.
**Lives in:** PRD §4.7, DB §6.2
**Why:** The earlier query excluded a grade if *any* appeal was still stored as `Pending`. Because Overdue is stored as `Pending`, the chain "appeal #1 overdue → appeal #2 denied" produced a truly-final grade that earned 0 ECTS forever, contradicting PRD §4.7 case 3.

### D-008 — How does the professor dashboard respond to screen width?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** Three stages: **1 column** below 576 px, **2 columns** from 576 to 991 px, **3 columns** at 992 px and above. Implemented as `col-12 col-sm-6 col-lg-4`.
**Lives in:** PRD §5.4, UI §7.1, UI §12.2
**Why:** PRD previously implied three columns from 576 px up while UI used `col-lg-4`. Both breakpoints were real; they describe different stages of one layout, not a conflict.

### D-009 — Which document wins when two documents disagree?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** Product behaviour → PRD. Visual rules and copy → UI (only where PRD is silent). Schema → DB. Code structure, libraries, tests → Tech / Tech-Backend / Tech-Frontend. A conflict is never resolved by choosing: stop, open an entry here, report it.
**Lives in:** AGENTS §0, Overview §5
**Why:** Four co-equal "sources of truth" with no tie-breaker meant an agent silently picked whichever file it read last.

### D-010 — Can a task file define a product rule?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** No. A task file is a plan. Its `Rules:` line may only name PRD / UI / DB / Tech sections, or `none`. A task that introduces a new rule writes that rule into the owning document in its **subtask 0**, before any code.
**Lives in:** AGENTS §0, AGENTS §4, AGENTS §6
**Why:** Task files are deleted on completion. Task 23 held the whole escalation rule set and nothing else did, so archiving it would have erased those rules from the documentation entirely.

### D-011 — How does an agent locate a section inside a long document?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** Grep for `^## ` in the file to get live heading line numbers, then `Read` with `offset`/`limit`. Section indexes list headings only and carry **no line numbers**.
**Lives in:** AGENTS §3
**Why:** Stored line ranges decay with every edit, fail silently (a section quietly loses its tail), and cost manual arithmetic on every commit. Grep is self-healing and free.

### D-012 — Is `docs/old/` authoritative?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** No. `docs/old/**` is a local, git-ignored snapshot of superseded documents. Never Read, Grep or Glob it unless the user names it explicitly.
**Lives in:** AGENTS §1
**Why:** It holds a 2500-line earlier PRD whose rules contradict the current ones. Git-ignoring hides it from version control, not from file search.

### D-013 — How is Tech.md organised?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** Three files. `Tech.md` holds the shared parts (stack snapshot, database tooling, deployment, accepted trade-offs). `Tech-Backend.md` holds backend architecture and backend testing. `Tech-Frontend.md` holds frontend architecture and frontend testing. No `##` section exceeds ~150 lines.
**Lives in:** AGENTS §2, AGENTS §3, Overview §3
**Why:** The old `Tech.md §3` was 330 lines — reading "just that section" loaded 60% of the file, which defeated the point of section reads.

### D-014 — What colour is the "Under admin review" badge?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** Bootstrap's own `$purple` (`#6f42c1`), applied with an inline `backgroundColor` style because Bootstrap 5 ships no `.bg-purple` utility class. This is the **only** colour in the app not applied through a Bootstrap utility class.
**Lives in:** UI §1, UI §2.5
**Why:** Every Bootstrap contextual utility was already taken by an existing status, and escalation must be visually distinct from "Appeal pending". The value is Bootstrap's own palette, not an invented brand colour.

### D-015 — How long is `Subject.SubjectCode`?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** The column is `varchar(50) NOT NULL` with a migration back-fill default of `''`. The API and the UI both validate **required, 1–20 characters**. The column is deliberately wider than the validator to leave migration headroom; **20 is the contract**.
**Lives in:** DB §2.2, Tech-Backend §5, UI §8.4
**Why:** Three different lengths (50 / 20 / 20) appeared across the task file with no statement of which was the contract.

### D-016 — What timestamp type does the database use?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** `timestamp with time zone` (PostgreSQL `timestamptz`) for every timestamp column, values in UTC.
**Lives in:** DB §1
**Why:** DB.md claimed `timestamp without time zone`; all 16 timestamp columns in the EF model snapshot are `timestamp with time zone`. The code was right and the doc was wrong.

### D-017 — Who may act on a grade once it is escalated?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** Reads are allowed for both the original and the assigned professor. Writes (accept, deny, undo-deny, reconfirm exam) are allowed **only** for the currently assigned professor once `Grade.AssignedProfessorId` is set; the original professor gets `403`. The assigned professor — and only the assigned professor — may act on an appeal that is already overdue.
**Lives in:** PRD §4.8, PRD §6, Tech-Backend §3
**Why:** Escalation exists because the original professor did not act. Handing write authority to the assignee is the whole point, and the overdue guard would otherwise block the very person brought in to clear it.

### D-018 — Does an Accepted appeal ever become Overdue?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** No. Only `Pending` appeals surface as `Overdue` (computed as `SubmittedAt + 7d < now`). An appeal the professor accepted stays `Accepted` forever. What expires instead is the professor's 7-day window to re-enter the exam points, measured from `appeal.ReviewedAt`; when it lapses the **grade** escalates with reason `AcceptedUnresolved`.
**Lives in:** PRD §4.8, DB §2.6
**Why:** It is the obvious wrong guess, it was asked explicitly, and the two clocks (`SubmittedAt` for overdue, `ReviewedAt` for Scenario A) are easy to confuse.

### D-019 — `features/user/util` or `features/user/utils`?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** `utils` only. `features/user/util/` is removed and `gradeUtils.ts` plus its test move into `features/user/utils/`.
**Lives in:** Tech-Frontend §1
**Why:** Both folders held live files, so an agent adding a helper had two equally valid-looking homes and imports split across a typo.

### D-020 — What happens to the old Students page?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** `src/pages/students/StudentsPage.tsx` is deleted. The student dashboard is the only student-facing view.
**Lives in:** PRD §5.5, UI §3
**Why:** PRD and UI both stated it was already removed, and the file was unrouted dead code that contradicted them.

### D-021 — Does an escalated grade count toward Earned ECTS?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** No. An open escalation means the grade is not truly final, so it contributes no ECTS and counts as non-passed per D-006 until the assigned professor resolves it and the grade finalizes.
**Lives in:** PRD §4.7, PRD §4.8
**Why:** Escalation exists precisely because the grade's outcome is still undecided; D-007's latest-appeal gate already produces this result, and stating it prevents a special case being invented.

### D-023 — Can the admin re-pick a professor who was already assigned to this escalation?

**Decided:** 2026-10-28 · **Status:** Accepted
**Answer:** No. Any professor who appears in the escalation's assignment history is excluded from the eligible list, in addition to the original grading professor.
**Lives in:** PRD §4.8
**Why:** A professor who already failed to act on the same escalation provides no additional chance of resolution; the assignment history is already stored in `EscalationAssignments`, so the exclusion costs one extra query with no schema change.

### D-022 — Are time-dependent states seeded in `seed.sql`?

**Decided:** 2026-10-23 · **Status:** Accepted
**Answer:** No. `seed.sql` contains no time-sensitive row. Overdue appeals, escalation Scenarios A and B, and the 24-hour undo window are produced per test by the backdating helpers on `IntegrationTestBase`, and in manual testing by the test-mode clock endpoint.
**Lives in:** PRD §7, Tech-Backend §7
**Why:** The seed replays before every integration test, so one backdated row would inject an overdue or escalated case into every test in the suite and silently corrupt unrelated dashboard assertions.

### D-024 — How does admin create-user report a duplicate email and validate the password?

**Decided:** 2026-10-29 · **Status:** Accepted
**Answer:** A create-user request whose email already exists is rejected with `409 Conflict` (never a silent 500), and the SPA renders the message under the Email field. The password rules (12–128 chars; ≥1 upper, lower, digit and special `!@#$%^&*`; no spaces) are validated on **both** layers — Zod on the client, FluentValidation on the server — and the client blocks submit until Zod passes, so the user always sees the (identical) Zod message. A student must have an index number; a professor must not.
**Lives in:** PRD §6, Tech-Backend §5, UI §8.3, Tech-Frontend §5
**Why:** The old flow collapsed every failure into a hardcoded "a user with that email may already exist" alert while the backend never checked for duplicates, so a password that failed the server rules was misreported as a duplicate email. An explicit 409, inline per-field errors, and a client mirror of the server rules make the real cause visible and stop the bad request before it is sent.

### D-025 — Can a soft-deleted professor be assigned to a subject?

**Decided:** 2026-10-29 · **Status:** Accepted
**Answer:** No. Creating a subject with a professor who is missing or `IsDeleted` is rejected: `SubjectService.AddSubjectAsync` returns a failure (controller `400`), and the admin picker omits inactive professors. The create form also validates inline (Create disabled until valid, errors under each field, server errors as a top-of-form alert) instead of a popup, mirroring the create-user form (D-024).
**Lives in:** PRD §6, Tech-Backend §5, UI §8.4
**Why:** A soft-deleted user cannot log in (Overview glossary), so assigning them a subject would create a course nobody can grade. The dropdown filter is a convenience; the service check is the authoritative guard, matching the pattern used everywhere else (PRD §6).

### D-026 — Can editing a subject assign it to an inactive professor?

**Decided:** 2026-10-29 · **Status:** Accepted
**Answer:** No, with one exception. `UpdateSubjectAsync` rejects reassigning a subject to a missing or soft-deleted professor (`400`), but allows **keeping** the subject's current professor even if that professor later became inactive. The edit form mirrors this: the current professor stays selectable, other inactive professors are hidden, and the form validates inline (Save disabled until valid, server errors shown, no `alert()`).
**Lives in:** PRD §6, Tech-Backend §5, UI §8.4
**Why:** Extends D-025 to the edit path, which previously did no professor validation at all (you could reassign to an inactive professor, or to an invalid id → 500). The keep-current exception avoids blocking an unrelated edit (e.g. a rename) just because the assigned professor was since deactivated — reassignment is a deliberate separate action.

### D-027 — Can an enrollment be edited or deleted, and what makes one valid?

**Decided:** 2026-10-29 · **Status:** Accepted
**Answer:** Enrollments are create-only — there is **no edit and no delete** in the UI. Creating one requires an active user with the Student role and an active subject, and rejects a duplicate (same student and subject); `AddEnrollmentAsync` throws a specific `InvalidOperationException` for each case, returned as `400` and shown inline. The student picker lists active students only and the subject picker excludes already-enrolled and inactive subjects.
**Lives in:** PRD §6, Tech-Backend §5, UI §8.5
**Why:** Supersedes the earlier "delete / recreate" note in UI §8.5: the delete was never wired to the backend (a local-only stub) and the product decision is that enrollments are permanent. Distinct server messages replace a single generic alert so a duplicate and an inactive student are no longer indistinguishable to the admin.

### D-028 — Which subjects appear on the professor dashboard?

**Decided:** 2026-10-30 · **Status:** Accepted
**Answer:** Every non-deleted subject assigned to the professor (`Subject.ProfessorId`), including a subject with no enrolled students yet. `ProfessorDashboardService` lists the professor's subjects and attaches enrollment rows to each, rather than deriving the subject list from enrollments.
**Lives in:** PRD §5.4, UI §7.1
**Why:** The dashboard was built by grouping the professor's enrollments by subject, so a freshly created subject with no students produced no group and never appeared — while the admin Subjects tab (which lists all subjects) did show it. "My Subjects" means the subjects the professor teaches, independent of whether anyone is enrolled.

### D-029 — Does a `403` response log the user out?

**Decided:** 2026-10-30 · **Status:** Accepted
**Answer:** No. The axios response interceptor no longer calls `clearAuthSession` on `403`; it rejects the promise and leaves the session untouched. Only a failed silent refresh (the retried `401`) clears the session. A `403` is surfaced to the caller to handle (e.g. an error toast).
**Lives in:** Tech-Frontend §4
**Why:** `403 Forbidden` means the caller is authenticated but not authorized for *that* resource (wrong role), not that their session is invalid. Treating it as a logout desynced the frontend from a still-valid backend session: `currentUser` was nulled while the httpOnly cookies stayed valid, so any request a role could not make (e.g. the admin dashboard's `GET /api/User` reached by a student via the Back button) dumped the user onto a stale login form without ever clicking logout. Addressed together with D-030, which stops the forbidden request from being fired at all.

### D-030 — What happens when a user opens a route meant for another role?

**Decided:** 2026-10-30 · **Status:** Accepted
**Answer:** They are redirected to **their own** dashboard. The three role-specific dashboard routes wrap `<RoleGate allowed={…} fallback={<RoleHomeRedirect/>}>`; on a role mismatch the gate renders the fallback, which `<Navigate replace>`s to the caller's own dashboard (`providers/RoleHomeRedirect.tsx`). `/profile` and `/profile/change-password` remain open to any authenticated user. `AuthGuard` (authentication) is unchanged and still wraps all of them.
**Lives in:** Tech-Frontend §4
**Why:** Without a role gate, a logged-in student could mount `/admin-dashboard` (only authentication was checked), which fired admin-only requests the backend answered with `403`. Redirecting at the route boundary means the forbidden page — and its requests — never run, which is the clean complement to D-029.

### D-031 — Which lists page client-side versus server-side?

**Decided:** 2026-10-31 · **Status:** Accepted
**Answer:** Per-user lists page in the browser (the full payload already arrives in one call): student My Subjects, professor My Subjects, professor Appeals, professor Assigned Cases. Lists whose size grows with total system data page on the server: admin Users, admin Subjects, admin Enrollments, and professor Students (fetched per-subject on demand via `GET /professor/subjects/{subjectId}/students?page=N&pageSize=N`). The professor dashboard main call is reshaped to drop the students list entirely; students are loaded only when the professor selects a subject. Page-size defaults and options: student and professor lists default to 5 items per page with options 5 / 20 / 50; admin lists default to 15 with options 15 / 20 / 50. The pagination control renders whenever `totalItems >= 1`; it is hidden only when the list is empty.
**Lives in:** PRD §5.4, PRD §5.5, UI §6.4, UI §7.1, UI §7.4, UI §7.6, UI §8.2, UI §8.4, UI §8.5, UI §11.7, UI §13, DB §6.4, Tech-Backend §2, Tech-Frontend §3
**Why:** Per-user payload size is bounded — a professor teaches tens of subjects, not thousands, so paging a per-user list on the server adds round-trips with no scalability gain. System-wide table sizes are not bounded — an admin list can grow to thousands of rows. "Table size" is the wrong criterion; "payload size after the user's scope is applied" is the right one. The professor-students list is server-side because it is scoped per subject, not per professor, and a subject enrollment can grow without bound.

### D-032 — How are escalated cases queried and paged?

**Decided:** 2026-10-31 · **Status:** Accepted
**Answer:** The repository loads only **candidate grades** — grades where `FinalizedAt IS NULL` with a qualifying appeal trigger (Scenario A or B), or grades that already have an `Escalations` row (including resolved). It never loads all grades and filters in memory. The `GET /api/Escalation` endpoint is server-side paginated: `page` (1-based, default 1) and `pageSize` (default 15, allowed 15 / 20 / 50). Multi-`Include` escalation reads use `AsSplitQuery()` + `AsNoTracking()` on pure-read paths; mutate paths omit `AsNoTracking()`.
**Lives in:** DB §6.3, Tech-Backend §2, UI §8.6
**Why:** Loading every grade with its full escalation graph does not survive production data volumes. Filtering in SQL, split queries, and no-tracking read models are the standard EF Core remedies for this class of N+1 / Cartesian blowup.
