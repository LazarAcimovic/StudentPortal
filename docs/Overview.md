# StudentPortal — Project Overview

> One-stop orientation for every agent working on this repo. Always load this file first. It is deliberately short; detailed rules live in the other documents under `docs/`.

---

## 1. What this is

StudentPortal is an internal web app for a university faculty. **Admins** manage users / subjects / enrollments. **Professors** enter grades for the students enrolled in their subjects (five point fields summing to 0–100, mapped to the Serbian 5–10 scale). **Students** see their grades and can either accept them or appeal within a bounded window. When a professor leaves an appeal unresolved, the case escalates to an admin, who reassigns it to another eligible professor. There is no public self-registration — admins create every account.

---

## 2. Actors

- **Admin** — manages users, subjects, enrollments. No access to the grading flow. Assigns and reassigns escalated appeal cases to eligible professors.
- **Professor** — enters, drafts and confirms grades for their own subjects. Reviews appeals on those subjects (accept / deny; undo-deny within 24 h). May also be assigned someone else's escalated case.
- **Student** — sees own dashboard. Within the 7-day window after a grade is confirmed, can either confirm it or submit one appeal.

---

## 3. Where to find what — pointer map

Use this to decide which document(s) to load. For any document with a **Section index**, `grep -n "^## "` it for live line numbers and Read only the range you need — never the whole file. `DB.md` and `Decisions.md` have no index and are small enough to read whole.

| Concern | Primary document | Secondary |
|---|---|---|
| Project orientation, glossary | `docs/Overview.md` (this file) | — |
| Product rules, flows, states, edge cases | `docs/PRD.md` | — |
| Why a rule is what it is | `docs/Decisions.md` | — |
| Backend architecture, services, DI, auth | `docs/Tech-Backend.md` | `docs/PRD.md` §6 (security) |
| Frontend architecture (layout, routing, state, forms, data hooks) | `docs/Tech-Frontend.md` | — |
| Libraries and versions, DB tooling, deployment | `docs/Tech.md` | — |
| UI (screens, copy, modals, badges, responsiveness) | `docs/UI.md` | `docs/PRD.md` §5 (screen inventory) |
| Database schema, migrations, seed data | `docs/DB.md` | `docs/PRD.md` §7 (data seeding) |
| Open implementation tasks | `docs/tasks/active/index.md` (then the specific task file) | — |
| Archived (completed) tasks | `docs/tasks/done/YYYY-MM.md` | — |
| Refactor plans | `docs/refactors/<name>.md` | — |

Concept → where its rules live:

- Grading model (point fields, final-grade mapping, draft lifecycle) → PRD §3
- Appeal flow (7-day window, overdue, undo-deny, accept re-confirm) → PRD §4
- Escalation workflow (professor inaction, admin reassignment, eligible professors) → PRD §4.8
- Screen inventory (what each dashboard shows) → PRD §5
- Security, auth, DTOs, cookies → PRD §6 + Tech-Backend §3–§4
- Data seeding → PRD §7 + DB §4
- Deployment (Render) → PRD §8 + Tech §3

---

## 4. Glossary

- **Truly final** — a grade whose state can no longer change. Reached when the student confirms, the initial 7-day window silently expires on day 8, the professor denies past the 24 h undo window, or a professor accepts an appeal and re-confirms the exam points. Rules: PRD §4.7.
- **7-day window** — the student's time to confirm or appeal a freshly confirmed grade, counted in calendar days.
- **Overdue appeal** — a Pending appeal more than 7 days old with no professor action. Computed on read; no background job flips rows. Starts a brand-new 7-day window for the student to submit one more appeal.
- **Undo-deny window** — 24 hours after a professor denies an appeal, during which they can revert the deny.
- **Point fields** — the five numeric inputs that make up a grade: midterm 1 (max 30), midterm 2 (30), lecture attendance (5), practical participation (5), exam (30). The sum maps to the 5–10 scale.
- **Draft** — a non-final set of 5 point values a professor saves before confirming.
- **Appeal cycle** — one submit → review → outcome sequence. A fresh grade allows one appeal; a second is allowed only after the first went Overdue.
- **Earned ECTS** — ECTS counted toward the student total. A subject's ECTS counts only when the grade is truly final AND the final grade is ≥ 6, gated by the grade's single most recent appeal. Rules: PRD §4.7.
- **Soft-delete** — the `IsDeleted` flag on `Users`. Soft-deleted users cannot log in.
- **Escalation** — when a professor fails to re-grade an accepted appeal within 7 days (Scenario A) or leaves two consecutive overdue appeals (Scenario B), the case escalates to an admin, who assigns it to another eligible professor. Rules: PRD §4.8.
- **Eligible professor** — a professor who teaches another subject with the same `SubjectCode` as the escalated subject, excluding the original professor. Rules: PRD §4.8.
- **Assigned professor** — the professor currently holding an escalated case (`Grade.AssignedProfessorId`). While set, they hold write authority on that grade and the original professor does not. Rules: PRD §4.8.

---

## 5. Hard rules

- **Precedence.** PRD owns behaviour. UI owns visuals and copy where PRD is silent. DB owns schema. Tech / Tech-Backend / Tech-Frontend own code structure and test conventions. A value is defined in exactly one document.
- **Never resolve a contradiction by choosing.** If two documents disagree, stop, add an `OPEN` entry to `docs/Decisions.md` naming both sources, and report it. See `AGENTS.md` §0.
- **A task file is a plan, never a source of truth.** New rules go into PRD / UI / DB / Tech before any code.
- `docs/old/**` is a git-ignored snapshot of superseded documents. Never read it unless asked by name.
- Load documents by section, grepping for `^## ` to get live line numbers. Section indexes carry no line numbers.
- When you change behaviour, schema or a screen — wherever the change starts — update the owning sibling documents in the same commit (`AGENTS.md` §6).
- `node scripts/check-docs.mjs` must pass before a documentation commit.
