### Task 27 — Serbian translation (i18n)

#### Overview

The app must be usable in both English and Serbian for the Serbian and foreign markets. A single toggle button in the navbar flips the whole UI between the two languages; English is the default and the choice is remembered across reloads (per D-0NN). The UI is translated with `react-i18next`; every visible string moves into `en` / `sr` resource files. Because some text the user sees today is produced on the backend as finished English words (the student-dashboard status column), the backend must return stable **codes** instead, so the frontend can localise them.

**The rules for this feature live in `UI.md` §13 (copy), `UI.md` §3 (navbar toggle), `Tech-Frontend.md` §1–§2 (i18n setup), and `Tech-Backend.md` §... for the status-code change, with `PRD.md` §5.5 owning the student status values.** This file is only the plan — read the rules from those sections, never from this Overview.

**Depends on:** nothing · **Blocks:** nothing

> Sequencing note: this task edits strings in nearly every component, so running it at the same time as task 26 on the same files will cause merge conflicts. Prefer to land it after 26, or on its own.

---

#### 27.0 — Docs: Promote the bilingual rules into the source-of-truth documents

Rules: none (this subtask creates the rules' home)
Not in scope: any code change.
Docs to update: PRD §5.5, UI §3, UI §13, Tech-Frontend §1, Tech-Frontend §2, Tech-Backend §6, new D-0NN
Verify: `node scripts/check-docs.mjs`

- [ ] The product rule — the app is bilingual, English by default, a single EN ⇄ SR toggle in the navbar, choice persisted in `localStorage` — is written down, with a new D-0NN.
- [ ] UI §13 states that all visible copy lives in `en` / `sr` resource files and that no English string is hardcoded in a component.
- [ ] The decision that backend status fields return **codes**, not display strings, and the frontend owns their labels, is recorded (Tech-Backend §6, PRD §5.5).
- [ ] `react-i18next` is listed as the chosen library in Tech-Frontend §1/§2.
- Commit: `docs: bilingual EN/SR rules, navbar toggle, and status-code contract (D-0NN)`

---

#### 27.1 — Backend-service: return status codes instead of English display strings

Rules: PRD §5.5 (student status values), DB §6.1 (student dashboard query), Tech-Backend §6
Not in scope: the professor `GradeState` and escalation `EscalationStatus`, which are already codes.
Docs to update: PRD §5.5, Tech-Backend §6
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter StudentDashboard`

- [ ] The student dashboard `Status` / `AppealStatus` fields return stable codes (e.g. `Passed`, `AppealPending`, `UnderAdminReview`) rather than human sentences.
- [ ] Any other DTO field that today carries a translatable English phrase is identified and converted, or explicitly noted as already a code.
- [ ] Backend tests assert the codes; no behaviour changes beyond the string values.
- Commit: `refactor(backend): student dashboard returns status codes, not display text`

---

#### 27.2 — Frontend-service: set up react-i18next with en/sr resources

Rules: Tech-Frontend §1 (project layout), Tech-Frontend §2 (patterns), UI §13
Not in scope: translating individual screens (27.4–27.7); the toggle UI (27.3).
Docs to update: Tech-Frontend §1, Tech-Frontend §2
Verify: `npm run test -- i18n`

- [ ] `react-i18next` initialised once at app start, with `en` as default and fallback, and `sr` registered.
- [ ] Empty-but-structured `en.json` / `sr.json` resource files exist in the agreed location (Tech-Frontend §1).
- [ ] The current language is read from `localStorage` on boot and defaults to `en` when absent or invalid.
- [ ] A smoke test renders a component through the provider and reads a key.
- Commit: `feat(i18n): react-i18next setup with en/sr resource files`

---

#### 27.3 — Frontend-component: navbar EN ⇄ SR toggle with persistence

Rules: UI §3 (navbar), UI §13
Not in scope: translating the rest of the app (27.4–27.7).
Docs to update: UI §3
Verify: `npm run test -- Navbar`

- [ ] A single button in the navbar switches the language and writes the choice to `localStorage`.
- [ ] The button label/affordance reflects the language it switches **to**.
- [ ] Reloading the page keeps the last chosen language.
- Commit: `feat(i18n): navbar language toggle with localStorage persistence`

---

#### 27.4 — Frontend-component: translate shared, auth, and navbar strings

Rules: UI §13, UI §3 (navbar), UI §5 (login page)
Not in scope: dashboard screens (27.5–27.7).
Docs to update: none
Verify: `npm run test -- auth`

- [ ] Every visible string in the navbar, login page, change-password page, modals, and shared primitives uses a translation key.
- [ ] Both `en.json` and `sr.json` carry each new key with a correct Serbian value.
- [ ] No hardcoded English remains in these components (spot-checked in review).
- Commit: `feat(i18n): translate shared, auth, and navbar copy`

---

#### 27.5 — Frontend-page: translate the student dashboard and map status codes

Rules: UI §6 (student dashboard), UI §13, PRD §5.5
Not in scope: professor/admin screens.
Docs to update: none
Verify: `npm run test -- integration/dashboards/StudentDashboard`

- [ ] All student-dashboard copy (info card, stats labels, subjects table headers, badges, modals) is keyed.
- [ ] The status codes from 27.1 map to localised labels in both languages.
- [ ] Switching to Serbian updates every visible string on the page, including badges.
- Commit: `feat(i18n): translate the student dashboard and localise status codes`

---

#### 27.6 — Frontend-page: translate the professor dashboard

Rules: UI §7 (professor dashboard), UI §13
Not in scope: student/admin screens.
Docs to update: none
Verify: `npm run test -- integration/grades/ProfessorDashboard`

- [ ] All professor-dashboard copy (subjects, students, grading panel, appeals, assigned cases, modals) is keyed in both languages.
- [ ] The grade-state and appeal-status labels render from codes, localised.
- Commit: `feat(i18n): translate the professor dashboard`

---

#### 27.7 — Frontend-page: translate the admin dashboard

Rules: UI §8 (admin dashboard), UI §13
Not in scope: student/professor screens.
Docs to update: none
Verify: `npm run test -- integration/escalations/AdminEscalations`

- [ ] All admin-dashboard copy (tabs, tables, create/edit forms, escalations tab, modals) is keyed in both languages.
- [ ] Reason and status labels in the escalations tab render from codes, localised.
- Commit: `feat(i18n): translate the admin dashboard`

---

#### 27.8 — Test: language toggle flips and persists the whole UI

Rules: Tech-Frontend §7 (testing), UI §13
Not in scope: visual regression.
Docs to update: none
Verify: `npm run test -- i18n`

- [ ] An integration test switches EN → SR and asserts representative strings change on each dashboard.
- [ ] A test asserts the language survives a remount (persistence).
- [ ] A test asserts an unknown/missing `localStorage` value falls back to English.
- Commit: `test(i18n): assert the toggle flips and persists the UI language`
