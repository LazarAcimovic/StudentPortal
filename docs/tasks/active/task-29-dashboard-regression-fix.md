### Task 29 — Fix the professor-dashboard regressions from the task 26/28 parallel work

#### Overview

After tasks 26 and 28 landed, a professor clicking a subject threw `Cannot read properties of undefined (reading 'find')`, and clicking Back produced a runaway `Maximum update depth exceeded` loop that flooded the API, tripped the token-refresh path, and forced a sign-out. Root causes: the task 26 reshape removed the inline `students` array from each subject (a stale `.find` on it), and `SubjectsList`'s page-jump effect depends on the `subjects` **array reference** which the page recreates via `?? []` — a render loop whenever that array is unstable. This task hardens both classes of failure and gives the app a real error boundary so a single render error can never again dump a raw stack or cascade into a logout. The sign-out needs no auth-layer change: removing the loop removes the trigger.

> Reconcile first: the reported error line `ProfessorDashboardPage.tsx:48:35` does not match any `.find` in the committed file, which strongly suggests the browser was serving a **stale bundle** from the agents' mid-flight work. Step one of 29.2/29.3 is to rebuild clean (clear `frontend/node_modules/.vite`, restart the dev server) and reconfirm against genuinely fresh code before assuming a live crash remains. The hardening below stands either way.

**The rules for this feature live in `Tech-Frontend.md` §2 (React patterns), §4 (routing) and §7 (testing), and `UI.md` §7.1 / §11.** This file is only the plan — read the rules from those sections, never from this Overview.

**Depends on:** nothing · **Blocks:** nothing

---

#### 29.0 — Docs: Promote the error-boundary and effect-dependency conventions

Rules: none (this subtask creates the rules' home)
Not in scope: any code change.
Docs to update: Tech-Frontend §2, Tech-Frontend §4, new D-0NN
Verify: `node scripts/check-docs.mjs`

- [x] Tech-Frontend §4 states the app has a single top-level route-level error boundary with a friendly fallback that preserves the session.
- [x] Tech-Frontend §2 states that a `useEffect` must not depend on an array/object prop that a parent produces inline or via `?? []`; depend on a primitive (an id, a length) or a memoised value.
- [x] A new D-033 records why (the runaway-render regression this task fixes).
- Commit: `docs: error-boundary and effect-dependency conventions (D-033)`

---

#### 29.1 — Frontend-component: app-wide error boundary

Rules: Tech-Frontend §4 (routing), UI §11 (reusable primitives)
Not in scope: the loop/crash fixes (29.2, 29.3); the refresh/auth path.
Docs to update: Tech-Frontend §4, UI §11
Verify: `npm run test -- ErrorBoundary`

- [x] A route-level `errorElement` (in `providers/router.tsx`) renders a friendly fallback instead of the raw React Router error page.
- [x] The fallback keeps the session intact — a render error does not clear auth or redirect to login.
- [x] The fallback offers a way back (reload / go home) and is covered by a unit test that throws inside a child and asserts the fallback renders.
- Commit: `feat(frontend): app-wide route error boundary`

---

#### 29.2 — Frontend-component: remove the array-reference dependency in SubjectsList

Rules: UI §7.1 (subjects column), Tech-Frontend §2 (React patterns)
Not in scope: the error boundary (29.1); server-side paging (already shipped in task 26).
Docs to update: none
Verify: `npm run test -- integration/grades/ProfessorDashboard`

- [x] `SubjectsList`'s page-jump effect no longer depends on the `subjects` array reference — it depends on `selectedSubjectId` and `subjects.length`, or computes the target page during render.
- [x] A test that re-renders `SubjectsList` with a fresh-but-equal `subjects` array does not loop or exceed the update depth.
- [x] Selecting a subject still scrolls to the page that holds it.
- Commit: `fix(professor): stop SubjectsList page-jump effect depending on the array reference`

---

#### 29.3 — Frontend-page: stable arrays and consistent guards on the professor dashboard

Rules: Tech-Frontend §2 (React patterns)
Not in scope: the backend; the error boundary.
Docs to update: none
Verify: `npm run test -- integration/grades/ProfessorDashboard`

- [x] `ProfessorDashboardPage` passes a stable module-level `EMPTY` constant for `?? []` fallbacks instead of a fresh `[]` each render.
- [x] `data?.subjects.find(...)` is made consistent with the `?? []` guards so it cannot throw if `subjects` is ever absent.
- [x] A quick audit confirms no other page passes an inline `?? []` into a component whose effect depends on that array; any found are fixed the same way.
- Commit: `fix(professor): stable array props and consistent optional chaining on the dashboard`

---

#### 29.4 — Test: regression coverage for the crash, the loop, and the boundary

Rules: Tech-Frontend §7 (testing)
Not in scope: e2e (task 22d owns Playwright).
Docs to update: none
Verify: `npm run test -- integration/grades/ProfessorDashboard`

- [x] Selecting a subject with students renders the paged list and does not throw.
- [x] A professor dashboard given an unstable/empty `subjects` prop renders without exceeding the update depth.
- [x] A thrown render error shows the error-boundary fallback and the user stays logged in (no redirect to login).
- Commit: `test(frontend): regression coverage for the professor-dashboard crash and loop`
