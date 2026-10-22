# StudentPortal — Project Overview

> One-stop orientation for every agent working on this repo. Always load this file first. It is deliberately short; detailed rules live in the other docs under `docs/`.

---

## 1. What this is

StudentPortal is an internal web app for a university faculty. **Admins** manage users / subjects / enrollments. **Professors** enter grades for the students enrolled in their subjects (five point fields summing to 0–100, mapped to the Serbian 5–10 scale). **Students** see their grades and can either accept them or appeal within a bounded window. There is no public self-registration — admins create every account.

---

## 2. Actors

- **Admin** — manages users, subjects, enrollments. No access to the grading flow. Also assigns escalated appeals to eligible professors (Task 23).
- **Professor** — enters, drafts, and confirms grades for their own subjects. Reviews appeals on those subjects (accept / deny; undo-deny within 24h).
- **Student** — sees own dashboard. Within the 7-day window after a grade is confirmed, can either confirm it or submit one appeal.

---

## 3. Where to find what — pointer map

Use this to decide which doc(s) to load. Each listed doc with a Table of Contents at its top (PRD.md, Tech.md, UI.md) must be read **by section**: Read lines 1–40 to see the TOC, then Read again with `offset` / `limit` for the section you need. Do not Read these files whole. DB.md has no TOC and is small enough to read whole.

| Concern | Primary doc | Secondary |
|---|---|---|
| Project orientation, glossary | `docs/Overview.md` (this file) | — |
| Product rules, flows, edge cases | `docs/PRD.md` | — |
| Backend architecture, services, DI, auth, deployment | `docs/Tech.md` section 2 | `docs/PRD.md` section 6 (security) |
| Frontend architecture (routing, state, folder layout, forms, testing) | `docs/Tech.md` section 3 | — |
| UI (screens, copy, modals, forms, responsiveness) | `docs/UI.md` | `docs/PRD.md` section 5 (screen inventory) |
| Database schema, migrations, seed data | `docs/DB.md` | `docs/PRD.md` section 7 (data seeding) |
| Open implementation tasks | `docs/tasks/active/index.md` (then the specific task file) | — |
| Archived (completed) tasks | `docs/tasks/done/YYYY-MM.md` | — |
| Refactor plans | `docs/refactors/<name>.md` | — |

Concept → where its rules live:

- Grading model (point fields, final-grade mapping, draft lifecycle) → PRD section 3
- Appeal flow (7-day window, overdue, undo-deny, accept re-confirm) → PRD section 4
- Escalation workflow (when professor fails to act, admin reassignment) → `tasks/active/task-23-escalation.md`
- Screen inventory (what each dashboard shows) → PRD section 5
- Security, auth, DTOs, cookies → PRD section 6 + Tech.md section 2
- Data seeding → PRD section 7 + DB.md section 4
- Deployment (Render) → PRD section 8 + Tech.md section 5

---

## 4. Glossary

- **Truly final** — a grade whose state can no longer change. Reached when the student confirms, the 7-day window silently expires on day 8, the professor denies past the 24h undo window, or the professor accepts an appeal and re-confirms.
- **7-day window** — the student's time to confirm or appeal a freshly confirmed grade, counted in calendar days.
- **Overdue appeal** — a Pending appeal more than 7 days old with no professor action. Computed on read; no background job flips rows. Starts a brand-new 7-day window for the student to submit one more appeal.
- **Undo-deny window** — 24 hours after a professor denies an appeal, during which they can revert the deny.
- **Point fields** — the five numeric inputs that make up a grade: midterm 1 (max 30), midterm 2 (30), lecture attendance (5), practical participation (5), exam (30). Sum maps to the 5–10 scale.
- **Draft** — a non-final set of 5 point values a professor saves before confirming.
- **Appeal cycle** — one submit → review → outcome sequence. A fresh grade allows one appeal; a second is allowed only after the first went Overdue.
- **Earned ECTS** — ECTS counted toward the student total. A subject's ECTS counts only when the grade is truly final AND the final grade is ≥ 6.
- **Soft-delete** — the `IsDeleted` flag on `Users`. Soft-deleted users cannot log in.
- **Escalation** — when a professor fails to act on an accepted appeal (Scenario A) or leaves two consecutive overdue appeals (Scenario B), the case escalates to the admin, who re-assigns it to another eligible professor. See `tasks/active/task-23-escalation.md`.
- **Eligible professor (for escalation)** — a professor who teaches another subject with the same `SubjectCode` as the escalated subject, excluding the original professor.

---

## 5. Hard rules

- PRD / Tech / DB / UI are the sources of truth. Do not invent product behaviour, architectural patterns, tables, or UI copy that isn't in them.
- Load docs by section, not whole-file. Use each doc's TOC and `offset` / `limit` on the Read tool.
- When editing a product rule in PRD, update sibling docs the same commit (see the cross-doc protocol in `AGENTS.md`).
- When editing a doc that has a TOC, if your edit changes line counts, update the TOC in the same commit.
