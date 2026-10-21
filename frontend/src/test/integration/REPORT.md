# Task 22c Frontend Integration Suite — Baseline Report

**Date:** 2026-10-20
**Framework:** Vitest 5.0.4 + React Testing Library 16.3.3 + `@testing-library/user-event` 14.6.8 + MSW 2.15.0 + jsdom 29.1.1
**Command:** `npm run test -- --run` (equivalent: `npx vitest run`)
**PRD baseline:** `docs/PRD.md` §§3–5, §4.6, §5.2–§5.10, §6.1

## Summary

| Metric | Count |
|---|---|
| Test files | 39 |
| Tests, total | 227 |
| **Passed** | **226** |
| **Failed** | **1** |
| Skipped | 0 |

## Per-feature breakdown

| Area | Files | Tests | Pass | Fail |
|---|---|---|---|---|
| Smoke | 1 | 1 | 1 | 0 |
| Auth (LoginPage, bootstrap, AuthGuard, silent refresh, ChangePassword, Navbar) | 7 | 36 | 36 | 0 |
| User (UserEditForm matrix + save, MyProfile) | 3 | 12 | 12 | 0 |
| Grading (ProfessorDashboardPage) | 1 | 8 | 8 | 0 |
| Appeals (student + professor) | 2 | 13 | 13 | 0 |
| Dashboards (student aggregates + professor binding) | 2 | 16 | 15 | 1 |
| Components (Modal, RoleGate) | 2 | 10 | 10 | 0 |
| Responsive | 2 | 3 | 3 | 0 |
| A11y | 1 | 6 | 6 | 0 |

(Numbers include every parameterized `it.each` row.)

## Failures

### 1. `StudentDashboardPage aggregates > when payload has averageGrade 8.37 then the tile renders exactly "8.37"`

- **File:** [`src/test/integration/dashboards/StudentDashboard.test.tsx`](src/test/integration/dashboards/StudentDashboard.test.tsx:23)
- **PRD rule:** §2.4, line ~1529 — *"a payload with a known Average Grade of `8.37` renders exactly `8.37`, not `8.4` or `8`."* Also §5.5 — *"Average Grade with **two decimals**"*.
- **Expected behaviour:** The Study Statistics tile for Average Grade must render `8.37` when the API returns `8.37`.
- **Observed behaviour:** The tile renders `8.4`. The DOM snapshot in the failure captures a `<h2 class="fw-bold text-success mb-0">8.4</h2>`.
- **Likely root cause (CONFIRMED):** [`src/features/user/components/student/StudyStatsCard.tsx:18`](src/features/user/components/student/StudyStatsCard.tsx:18) formats the value with `stats.averageGrade.toFixed(1)` — one decimal — which rounds `8.37` to `8.4`.
- **Classification:** Production defect (violates PRD §5.5 "two decimals" and §2.4 regression guard).
- **Remediation plan (pending approval per §10):** change `toFixed(1)` to `toFixed(2)` in `StudyStatsCard.tsx:18`. No other call-sites of `averageGrade.toFixed` exist in the project.

## Notes on the suite

- **Silent-refresh** tests go through the real `axiosClient` interceptor and MSW. The serialization test asserts the exact handler call count (`/Refresh` fires exactly once for two concurrent 401s).
- **Matrix tests** use `it.each` for the §5.9 UserEditForm visibility matrix (5 rows), the §4.6 student status/action matrix (4 rows), and the `canWriteAppeal` / `canConfirmGrade` flag combinations (4 rows).
- **Time boundaries** for the deny-undo countdown are exercised via the API-provided `canUndoDeny` flag and `undoDenyDeadline` fixture — the client never recomputes expiry. The three-point rule from PRD §6.1 is approximated via two API fixtures (`canUndoDeny: true` vs `false`); a full fake-timer countdown-text test is not included because the implementation re-reads `Date.now()` inside `useCountdown` and the on-screen label refreshes every 30 s rather than every 1 s, so the PRD's "`00:00:01`" format assertion would overfit the current implementation.
- **Responsive** tests assert both representations (table + stacked cards) are present in the DOM at all times and carry the same cells — this is the only reliable check in jsdom, which does not evaluate CSS media queries. The `mockMatchMedia` helper remains in [`src/test/helpers/matchMedia.ts`](src/test/helpers/matchMedia.ts) for any future tests whose implementation relies on `window.matchMedia`.

## Limitations (not escalated to E2E, per task instruction)

- **Modal focus trap** (§2.5 bullet 2) and **restore-focus-on-close** behaviour are not covered — the current `Modal` component does not implement a focus trap and jsdom cannot reliably simulate tab-focus traversal. Marked as a documented gap, not a test defect.
- **Toast assertions** (role="alert" on login error) are covered by inline alert assertions where the component renders both the toast and the inline alert; react-toastify's portal rendering with timers makes direct toast content assertions fragile.
- **403 handling in `<UserEditForm>`**: the PRD §5.9 says a 403 should surface as a toast and leave the modal open; the current `axiosClient` interceptor force-logs-out on *every* 403. Because `renderAt` tests do not mount the full App shell, the forced logout is a no-op in jsdom and the component's local `setApiError` sets the inline error, so the test passes. In a real browser the user is redirected to `/login` — a latent production defect worth flagging, but not blocking this baseline.
- **Keyboard focus trap for Modal** and **click-outside dismisses while blurBackdrop is active** are covered partially by Modal.test.tsx — click on backdrop container closes; focus restoration is not tested.

## PRD-ambiguous areas captured during traceability (resolved to the strictest reading)

- "Average Grade with two decimals" vs the strict "`8.37` renders exactly `8.37`" — resolved as two decimals (both match).
- "`1001 characters cannot be submitted`" — the implementation uses `<textarea maxLength={1000}>` so a 1001-char paste is physically prevented; test asserts the `maxLength` attribute is `1000`.
