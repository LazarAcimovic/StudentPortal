### Refactor 06 — Frontend session: one source for the store and the role map

#### Overview

`Tech-Frontend.md` §2 and §4 define the session layer precisely. Two of those rules are violated across the tree, each in several places:

| Rule | Where it is written | Violations |
|---|---|---|
| "Zustand slice-selectors: `useUserStore(s => s.currentUser)` — **never** whole-store destructuring" | Tech-Frontend §2 | **8** bare `useUserStore()` calls; **0** selector calls |
| role → dashboard is one mapping | Tech-Frontend §4, D-030 | **4** independent definitions: `Navbar.getDashboardLink`, `LoginPage` (twice — once as `<Navigate>`, once as `navigate()`), `lib/auth.getRedirectTarget`, `providers/RoleHomeRedirect.DASHBOARD_BY_ROLE` |

The selector rule is the one with a measurable cost. `App.tsx` destructures five store members, so every `setCurrentUser` or `setHydrating` re-renders the component holding `<Outlet/>` and therefore the whole route tree. `authGuard`, `RoleGate`, `Navbar`, `LoginPage`, `MyProfilePage`, `AdminDashboardPage` and `RoleHomeRedirect` each re-render on any store write, including writes to a field they do not read.

The four role mappings are **not** interchangeable copies, which is what makes R06.3 narrower than it looks. The role → dashboard rows agree, but the fallbacks diverge three ways: with no user, `Navbar` returns `HOME` while `RoleHomeRedirect` returns `AUTH_LOGIN`; with an unrecognised role, `Navbar` and `lib/auth.getRedirectTarget` return `HOME` while `LoginPage` falls through to `STUDENT_DASHBOARD`. Consolidating the fallbacks would change behaviour on three paths, so R06.3 shares the mapping and keeps every fallback explicit at its own call site. `lib/auth.getRedirectTarget` is the dead limb: it exists, it is correct, and nothing calls it.

**The duplicated-looking refresh in `App.tsx` is deliberate and is not touched here** — see Out of scope. It was the first thing this campaign proposed to remove, and that was wrong.

Three smaller session gaps, all one-liners, listed so they are not rediscovered:

- `Navbar.handleLogout` calls `logout()` then clears the store and navigates by hand instead of going through `clearAuthSession`, which exists for exactly this.
- `clearAuthSession` never calls `POST /Account/Logout`, so a session cleared by the interceptor leaves its refresh row live on the server for the remainder of its seven days. The server-side half of this is refactor-03 R03.8.
- `registerClearCallback` pushes onto a module-level array with no removal, so under HMR and across test files the array grows and every registered callback fires on each clear.

**The target structure is defined in `Tech-Frontend.md` §2, §4 and §5.** No behaviour changes: the same renders, the same requests, the same routes.

**Depends on:** nothing · **Blocks:** nothing (refactor-07 touches different files; the two can run in parallel)

#### Baseline — captured before step one

| Measure | Before | After (fill in at the end) |
|---|---|---|
| `npm run test` from `frontend/` | 56 files, 382 tests passed | |
| `npx tsc --noEmit` from `frontend/` | clean | |
| `npm run build` from `frontend/` | succeeds — 268 modules, 629.58 kB JS (190.98 kB gzip), 12.2s | |
| bare `useUserStore()` calls (non-test) | 8 | |
| `useUserStore((s => …))` selector calls (non-test) | 0 | |
| role → dashboard mapping definitions | 4 (with 3 divergent fallbacks) | |
| deep `../features/...` imports in `providers/router.tsx` | 6 | |

#### Out of scope

- **Any new hook.** `Tech-Frontend.md` §2 is explicit: custom hooks other than data-fetching hooks are not in use — no `useForm`, `useToggle`, `useLocalStorage` or `useDebounce`. A selector is a selector, not a hook wrapper.
- **React Query, Context, `React.memo`, `useReducer`.** Same section lists all of them under "do not introduce".
- **A token or storage wrapper.** `Tech-Frontend.md` §5: no `token` field, the server owns token lifetime; §2 forbids a cookie or local-storage wrapper service.
- **The `403` behaviour.** D-029 decided it does not clear the session, and the interceptor honours it. Do not touch that branch.
- **The `isHydrating` spinner and the `AuthGuard` redirect contract.** D-030 and `Tech-Frontend.md` §4 define both. R06.3 shares the role mapping they use; it does not change either contract.
- **Component decomposition and file sizes** — refactor-07 owns those.
- **Unifying the role-map fallbacks.** Sharing the mapping is a refactor; agreeing on one no-user and one unrecognised-role destination is a product decision that needs a rule in `Tech-Frontend.md` §4 and a `docs/Decisions.md` entry first. R06.3 deliberately preserves all three divergent fallbacks.

**R06.2 — deferred, will not be done. The number is retired and there is no such subtask.** (Kept as prose, not a heading, so the `grep "^#### "` navigation in AGENTS §4.1 still finds only real subtasks, and no permanently-unticked box blocks the §5 archival gate.)

The slot after R06.1 was going to be "one refresh sequence, in the interceptor": drop the three `_retry: true` flags in `App.tsx` and let the bootstrap `GET /Account/Me` go through the axios interceptor like every other call, on the reasoning that `Tech-Frontend.md` §4 puts the 401 → refresh → retry sequence in the interceptor and `App.tsx` re-implements it.

**That reasoning was wrong, and the subtask is withdrawn.** The bypass is not redundancy — it is the fix for a real bug, and removing it reintroduces that bug (recorded as D-039):

- The interceptor's refresh-failure branch (`frontend/src/shared/api/axiosClient.ts:42`) calls `clearAuthSession({ redirectToLogin: true })`.
- `clearAuthSession` (`frontend/src/lib/auth.ts:20-22`) navigates to `/login` **unconditionally** — it takes no account of the current route.
- So without `_retry: true`, a logged-out visitor opening the **public Home page** triggers `GET /Me` → `401` → refresh → `401` → forced navigation to `/login`. A login-flash on a public page.
- The manual bootstrap instead uses the gentle `clearCurrentUser()` plus the guarded redirect effect in `App.tsx:72-81`, which explicitly spares `APP_ROUTES.HOME` and `APP_ROUTES.AUTH_LOGIN`. No flash.

**Removing `_retry` on its own is forbidden.** The dedup may only ever be attempted as one change that also makes the interceptor's refresh-failure branch *clear state only, with no navigation* — which is itself a change to a rule `Tech-Frontend.md` §4 currently states, so it needs docs-first treatment and a new Decisions entry — plus a test asserting "a logged-out visitor opens Home and **stays** on Home".

That test does not exist today. `src/test/integration/auth/bootstrap.test.tsx:21-37` renders at `HOME` and asserts the Home heading appears, but never asserts the location stays there, and `findByRole` can resolve before an async redirect lands — so it is not a reliable tripwire for this regression. Anyone attempting the dedup must add the location assertion first.

#### Rollback

Each subtask is one commit touching one path. The selector conversion is the one step where a mistake is invisible to the type checker and to most tests (a component that re-renders too often still renders correctly), so R06.1 goes one file per commit and leans on the integration tests under `src/test/integration/auth/`.

---

#### R06.1 — Refactor: Convert all eight store reads to slice selectors

Rules: Tech-Frontend §2 (slice-selectors, never whole-store destructuring), Tech-Frontend §5
Not in scope: adding, removing or renaming a store member. No change to `useUserStore`'s shape.
Docs to update: none — `Tech-Frontend.md` §2 already states the rule this subtask starts obeying.
Verify: `npm run test` and `npx tsc --noEmit`, both from `frontend/`

- [ ] `grep -rn "useUserStore()" frontend/src --include=*.tsx --include=*.ts | grep -v '\.test\.'` — record the 8 hits and their files in the commit message.
- [ ] One commit per file, in this order: `providers/authGuard.tsx`, `components/shared/RoleGate.tsx`, `providers/RoleHomeRedirect.tsx`, `components/ui/Navbar.tsx`, `features/auth/pages/LoginPage.tsx`, `features/user/pages/MyProfilePage.tsx`, `features/user/pages/AdminDashboardPage.tsx`, `App.tsx` last — it reads five members and is the largest change.
- [ ] Each read becomes its own selector call: `const currentUser = useUserStore((s) => s.currentUser);`. Actions are stable identities in Zustand, so selecting them individually is safe and does not need `useCallback`.
- [ ] Do **not** return an object from a selector — that defeats the point by creating a new reference each render, the same failure mode D-033 describes for effect dependencies.
- [ ] After the last file: `grep -c "useUserStore()"` outside tests is 0.
- [ ] `src/store/user/useUserStore.test.ts` and the integration tests under `src/test/integration/auth/` green at every step.
- [ ] Named suites green, typecheck clean.
- Commit: `refactor(frontend): slice-selector store reads in <file>`

---

#### R06.3 — Refactor: One role-to-dashboard mapping, fallbacks kept explicit

Rules: Tech-Frontend §4 (RoleHomeRedirect sends a mismatched role to its own dashboard), D-030
Not in scope: **the fallbacks.** The role → dashboard rows agree across all four copies, but the no-user and unrecognised-role destinations do not, and this subtask must preserve each one exactly. Unifying them is a product decision and is listed under Out of scope.
Docs to update: Tech-Frontend §1 (if `lib/auth.ts`'s exported surface changes), Tech-Frontend §4
Verify: `npm run test` and `npx tsc --noEmit`, both from `frontend/`

- [ ] Record the four definitions **and their differing fallbacks** in the commit message, because this is what makes a naive consolidation a behaviour change:

  | Call site | Role rows | No user | Unrecognised role |
  |---|---|---|---|
  | `Navbar.getDashboardLink` | agree | `HOME` | `HOME` |
  | `RoleHomeRedirect.DASHBOARD_BY_ROLE` | agree | `AUTH_LOGIN` | n/a (exhaustive `Record`) |
  | `lib/auth.getRedirectTarget` | agree | n/a (takes a role) | `HOME` |
  | `LoginPage` (`<Navigate>` and `navigate()`) | agree | n/a (guarded by `currentUser`) | `STUDENT_DASHBOARD` |

- [ ] Move `DASHBOARD_BY_ROLE` to `config/constants.ts` beside `APP_ROUTES` as the single role → dashboard mapping. It is already a `Record<UserRole, string>`, exhaustive by type, so a new role becomes a compile error rather than a silent fall-through.
- [ ] Each of the four call sites imports that record and **keeps its own fallback explicitly** — `DASHBOARD_BY_ROLE[role] ?? APP_ROUTES.HOME` in `Navbar`, `?? APP_ROUTES.STUDENT_DASHBOARD` in `LoginPage`, and so on. The divergence becomes visible in one line per site instead of hidden in four `switch` bodies. Do not collapse it.
- [ ] `lib/auth.getRedirectTarget` becomes a one-line lookup over that record, or is deleted — `grep -rn "getRedirectTarget" frontend/src` first; it has no caller today, and `lib/auth.test.ts` may be its only reference.
- [ ] `Navbar.handleLogout` calls `clearAuthSession({ redirectToLogin: true })` instead of clearing the store and navigating by hand. Note this is the one call site where the unconditional redirect in `clearAuthSession` is the *wanted* behaviour — the user asked to log out (compare D-039).
- [ ] The three `switch` statements and the two inline chains are gone; `grep -c "ADMIN_DASHBOARD" frontend/src` drops from 7 to the router, the record and the test helper.
- [ ] `RoleHomeRedirect.test.tsx`, `Navbar.test.tsx` and the integration tests under `src/test/integration/auth/` green — unchanged, which is the proof no fallback moved.
- [ ] Named suites green, typecheck clean.
- Commit: `refactor(frontend): share the role-to-dashboard mapping, keep fallbacks explicit`

---

#### R06.4 — Frontend-service: Tell the server when a session is cleared

Rules: Tech-Frontend §4 (`clearAuthSession` clears the store and navigates), PRD §6
Not in scope: the interceptor's refresh-failure branch, which must still clear and redirect even if the logout call fails. A failed logout must never block the redirect.
Docs to update: Tech-Frontend §4 (state that clearing the session revokes the refresh row), plus a new `docs/Decisions.md` entry (next free id) if the behaviour on a failed logout needs recording.
Verify: `npm run test -- auth` from `frontend/`

- [ ] **Depends on refactor-03 R03.8.** Until `POST /Account/Logout` works without a live access token, calling it from `clearAuthSession` fails with `401` on exactly the path that needs it most — the expired-token path. Do not start this subtask before that one has landed.
- [ ] `clearAuthSession` fires `POST /Account/Logout` on a best-effort basis before clearing: `await` it inside a `try`/`catch` that swallows everything, then clear and redirect regardless.
- [ ] Guard against recursion: the logout call must not itself trigger the interceptor's clear-and-redirect on a `401`. Add `ACCOUNT_LOGOUT` to the interceptor's `authEndpoint` bypass list beside `ACCOUNT_LOGIN` and `ACCOUNT_REFRESH`.
- [ ] A test asserts the refresh row is revoked (MSW handler called) and that a failing logout still clears the store and redirects.
- [ ] Named suite green.
- Commit: `feat(frontend): revoke the server session when clearing the client one`

---

#### R06.5 — Refactor: Bound the login inputs and stop the callback array growing

Rules: Tech-Frontend §5 (one Zod schema per form), D-024 (client and server mirror each other), Tech-Backend §5
Not in scope: the login error copy (`UI.md` §5 owns it) and the complexity rules, which a login form must not enforce.
Docs to update: Tech-Frontend §5
Verify: `npm run test -- loginSchema` from `frontend/`

- [ ] **Shared with refactor-03 R03.5** — the `.max(128)` on `loginSchema.password` is one box in two campaigns. Whichever lands first owns it; tick the other as already done and say so in the commit message.
- [ ] `loginSchema` gains `.max(128)` on `password` and `.max(100)` on `email`, matching `LoginRequestDtoValidator`. Today the client sends an unbounded string to an endpoint that runs 100 000 PBKDF2 iterations over it.
- [ ] `registerClearCallback` dedupes, or returns an unregister function the store calls on teardown. The array has no removal path today, so each test file and each HMR cycle appends another copy of the same callback.
- [ ] `lib/navigation.ts`'s fallback sends a non-string `To` to `/` silently. Make it either handle the object form or throw in development, so a mis-typed navigation target is visible.
- [ ] Named suite green.
- Commit: `refactor(frontend): bound the login schema and fix the clear-callback registry`

---

#### R06.6 — Docs: Refresh the frontend layout block

Rules: Tech-Frontend §1 (layout blocks are verified, not remembered — AGENTS §7)
Not in scope: code.
Docs to update: Tech-Frontend §1, Tech-Frontend §2, Tech-Frontend §4
Verify: `node scripts/check-docs.mjs`

- [ ] Layout block regenerated from a real directory listing of `frontend/src/`.
- [ ] The `verified at` marker is updated — it currently reads commit `85f802b` (2026-10-29), from refactor-01.
- [ ] `Tech-Frontend.md` §1 notes that `features/auth/api/authService.ts` exports `login`, `logout` and `me`; the block claims a `refresh` export that the file does not have (the interceptor calls the endpoint directly).
- [ ] `Tech-Frontend.md` §2's selector rule carries the measurement from this campaign, so the next agent can see it was enforced rather than merely stated.
- [ ] `node scripts/check-docs.mjs` passes.
- Commit: `docs(tech): refresh the frontend layout block after the session campaign`
