### Task 25 — Align the shipped UI with the rules settled in the consistency pass

#### Overview

The 2026-10-23 consistency pass resolved six places where PRD and UI contradicted each other (D-001, D-004, D-005, D-006, D-007, D-008). Most of the code already matched the answer we chose. Two things do not, and one needs checking rather than assuming.

Each subtask below states what was verified and what was not. Do not "fix" a bullet marked *verify first* until you have confirmed there is something to fix — if the code is already correct, tick the box and say so in the commit.

**Depends on:** nothing · **Blocks:** 22c.7's three-stage assertion

---

#### 25.1 — Frontend-component: three-stage responsive columns on the professor dashboard

Rules: UI §7.1 (the three stages and the exact classes), PRD §5.4, D-008
Not in scope: the Appeals and Assigned Cases tables, which keep their own `sm` card cutoff (UI §12.2).
Docs to update: none
Verify: `npm run test -- integration/responsive`, plus a manual check at 575 / 576 / 991 / 992 px (UI §12.3)

**Verified wrong:** `SubjectsList.tsx`, `StudentsList.tsx` and `GradePanel.tsx` each wrap their panel in a bare `<div className="col-lg-4">`, which jumps from one column straight to three and skips the two-column stage.

- [ ] All three panels use `col-12 col-sm-6 col-lg-4`.
- [ ] At 576–991 px two panels sit side by side and the third wraps to its own row.
- [ ] No horizontal scrollbar at 320 px (UI §12.3).
- Commit: `fix(professor): three-stage responsive columns on the dashboard`

---

#### 25.2 — Test: cover the two-column stage

Rules: UI §7.1, UI §12.2, UI §12.3, Tech-Frontend §7 (the `matchMedia` helper)
Not in scope: visual regression tooling.
Docs to update: none
Verify: `npm run test -- integration/responsive`

- [ ] Assertions at all three stages: 1 column below 576 px, 2 columns at 576–991 px, 3 columns at 992 px and above.
- [ ] Tick the matching open box in `task-22-tests.md` 22c.7 in the same commit.
- Commit: `test(frontend): assert all three professor-dashboard layout stages`

---

#### 25.3 — Backend-service: confirm the stat tiles count only truly-final grades

Rules: PRD §5.5 (the four tile definitions), PRD §4.7 (truly-final), DB §6.2 (the ECTS query and its case table), D-005, D-006, D-007, D-021
Not in scope: the formatting, which is already correct — `StudyStatsCard` renders `averageGrade.toFixed(2)` per D-004.
Docs to update: none, unless you find the documents wrong — then follow AGENTS §6
Verify: `dotnet test backend/StudentPortal.Tests --filter StudentDashboard` and `dotnet test backend/StudentPortal.IntegrationTests --filter Dashboards`

*Verify first.* `StudentDashboardService` computes all four tiles, but the pass did not confirm which population each one uses. The resolved rules are:

- [ ] Average Grade — mean of **truly-final** grades with `FinalGrade >= 6`, failures excluded (D-005).
- [ ] Passed Exams — count of truly-final grades with `FinalGrade >= 6`.
- [ ] Non-passed Exams — truly-final `FinalGrade = 5` **plus** every enrollment with no truly-final grade yet, including in-window, appealed and escalated ones (D-006). The two groups must not overlap.
- [ ] Earned ECTS — gated by the **latest** appeal only, with no open escalation (D-007, D-021, DB §6.2). In particular "appeal #1 overdue → appeal #2 denied" **must** count.
- [ ] A grade confirmed two days ago and passing appears in **no** tile except Non-passed.
- Commit: `fix(backend): count only truly-final grades in student dashboard statistics` — or `test(backend): confirm student statistics populations` if nothing needed changing

---

#### 25.4 — Frontend-service: the `relativeTime` helper

Rules: UI §13 (relative times come from `dateUtils.ts`, no date library), UI §7.4 (appeal "Submitted" column), UI §8.6 (Escalated Since column), Tech.md §1 (no `date-fns`, no `dayjs`)
Not in scope: absolute date formatting, which `formatDate` already handles.
Docs to update: UI §13 (drop the "does not exist yet" note once it does)
Verify: `npm run test -- dateUtils`

**Verified missing:** `features/user/utils/dateUtils.ts` exports only `formatDate`. Nothing in the app renders a relative time, so the Appeals "Submitted" column and the Escalations "Escalated Since" column cannot meet their specs.

- [ ] `relativeTime(value: Date | string, now?: Date): string` in `dateUtils.ts`, hand-written, ~20 lines.
- [ ] Buckets: "just now" under a minute, then minutes, hours, days, weeks, months — singular and plural both correct ("1 day ago", "2 days ago").
- [ ] A future date returns "just now" rather than a negative string.
- [ ] Adopted by the Appeals section (UI §7.4) and, when it lands, the Escalations tab (UI §8.6).
- Commit: `feat(frontend): relativeTime helper for appeal and escalation timestamps`
