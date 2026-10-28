# Frontend testing

Two layers share one Vitest project:

- **Unit tests** — co-located beside the source file they cover (`Foo.tsx` → `Foo.test.tsx`). One component, one service, one schema, one store, or one helper at a time, with its collaborators mocked. This document.
- **Integration tests** — in `src/test/integration/`, mounting real routes against the real `axiosClient`, store and component tree, with MSW as the only HTTP boundary. See [`src/test/integration/README.md`](src/test/integration/README.md).

Both derive their expectations from the source-of-truth documents under `docs/` (PRD wins on behaviour — `AGENTS.md` §0), never from the current implementation. When a test and the implementation disagree, the test wins and the discrepancy is a suspected defect; when a test and a *document* disagree, that is a Decisions.md entry, not a quiet edit.

## Stack

| Tool | Role |
|---|---|
| `vitest` | runner + assertions (`expect`), globals on (`vite.config.ts` → `test.globals`) |
| `jsdom` | DOM environment (`test.environment`) |
| `@testing-library/react` | render + queries (`screen.getByRole`, …) |
| `@testing-library/user-event` | realistic user interaction (`userEvent.setup()`) |
| `@testing-library/jest-dom` | DOM matchers (`toBeInTheDocument`, …), registered in `src/test/setup.ts` |
| `msw` v2 | HTTP mock boundary (`src/test/server.ts`); `onUnhandledRequest: 'error'` |

No Docker, no backend, no network. Node 20+.

## Running

From `frontend/`:

```bash
npm run test                                 # watch mode (vitest)
npx vitest run                               # one-shot, whole suite (unit + integration)
npx vitest run src/features/auth             # one folder
npx vitest run src/components/ui/Navbar.test.tsx   # one file
npx vitest run -t "shows an inline server error"   # one test by name
```

The `npm run test` script is bare `vitest`; append `run` (or use `npx vitest run`) in CI and non-interactive shells so it exits instead of watching.

## Shared helpers

Unit helpers live at the top of `src/test/` (the integration tree has its own richer set under `src/test/helpers/` — don't cross-import):

- **`renderWithProviders(ui, { route, user, isHydrating })`** (`src/test/renderWithProviders.tsx`) — renders `ui` inside a `MemoryRouter` and primes `useUserStore` first. Pass `user` to start authenticated, `route` to set the initial entry. `resetUserStore(user?, isHydrating?)` is exposed for tests that set state without rendering.
- **`factories.ts`** — `makeStudent()`, `makeProfessor()`, `makeAdmin()`, plus subject/grade/appeal shape builders. Every factory takes an overrides object (`makeStudent({ firstName: 'Ana' })`).
- **`server.ts`** — the MSW node server and its default handlers (login, refresh, logout, `/Account/Me`). Started in `setup.ts`; override per test with `server.use(...)`.
- **`setup.ts`** — global `beforeAll`/`beforeEach`/`afterEach`/`afterAll`: starts/stops MSW, resets the store, creates and tears down the `#modal-root` and `#root` portal nodes, restores real timers.

## Writing a unit test

1. **Co-locate.** `src/features/auth/pages/LoginPage.tsx` → `LoginPage.test.tsx` in the same folder. Integration-level flows go in `src/test/integration/` instead (see "unit vs integration" below).
2. **Mock the unit's collaborators, never its logic.** A page test mocks the feature's `api/` service module (`vi.mock('../api/authService', …)`) and asserts the page calls it with the right payload and reacts to its result. A service test does the opposite: it exercises the real service and puts MSW at the HTTP edge.
3. **Mock `react-router-dom` navigation** when you need to assert redirects: `vi.mock('react-router-dom', … useNavigate: () => mockedNavigate)`.
4. **Query by role/label/text, act with `userEvent`, assert what the user sees.** Reach for `waitFor` only for async effects; never assert on implementation details or class names when a role or text will do.
5. **Reset between tests** — mocks in `beforeEach` (`mockReset()`), store via `renderWithProviders`/`resetUserStore`. `setup.ts` handles MSW handlers and timers.
6. **Fake timers** for countdowns (`vi.useFakeTimers()` / `vi.advanceTimersByTime(...)`); `setup.ts` restores real timers in `afterEach`.

A page's error and toast copy is owned by `docs/UI.md`. For example UI §5 renders a login submit error as an inline `alert alert-danger` and fires **no** error toast, and UI §11.5 lists every toast the app may fire — assert against that list, not against habit.

## Unit vs integration — which to write

Write a **unit** test when the behaviour lives in one unit and its collaborators are noise:

- a Zod schema's accept/reject cases;
- a service's request shape and response parsing (MSW at the edge, no React);
- a presentational component's rendering and callbacks given props;
- a store transition or a pure helper.

Write an **integration** test (`src/test/integration/`, documented separately) when the behaviour *is* the wiring:

- a route redirecting through `AuthGuard`;
- submit → service → store → navigation → toast as one flow;
- the silent-refresh interceptor retrying a 401;
- a page binding a real dashboard payload end to end.

Rule of thumb: if mocking the collaborator would mock away the thing under test, it's an integration test.

## Layout

```
frontend/
  TESTING.md                 ← this file
  src/
    **/*.test.ts(x)           co-located unit tests (27 files)
    test/
      setup.ts                global hooks (MSW, store, portals, timers)
      server.ts               MSW node server + default handlers
      renderWithProviders.tsx unit render helper + resetUserStore
      factories.ts            user / subject / grade / appeal builders
      smoke.test.tsx          trivial render smoke test
      integration/            integration suite — see its own README
```
