# StudentPortal

Internal web application for a university faculty. **Admins** manage users, subjects and enrollments. **Professors** grade the students enrolled in their subjects — five point fields summing to 0–100, mapped to the Serbian 5–10 scale. **Students** see their own grades and can either accept them or appeal inside a bounded window. When a professor lets an appeal rot, the case **escalates** to an admin, who reassigns it to another professor teaching the same course. There is no public self-registration: an admin creates every account.

**Stack:** ASP.NET Core 8 Web API · PostgreSQL 15+ / EF Core 9 · React 19 + TypeScript 5.8 + Vite 7 · Bootstrap 5 · Zustand · httpOnly-cookie JWT auth with refresh-token rotation.

> ### Two projects in one repository
>
> The application itself was built in autumn 2025. What makes this repo worth reading now is the second layer on top of it: a **documentation and process system built so that an AI coding agent can work in this codebase without inventing requirements, without silently resolving contradictions, and without reading 2 500-line files to answer one question.**
>
> That system — [`AGENTS.md`](AGENTS.md), the `docs/` set, an append-only decision log and a mechanical pre-commit gate — is the part under active development, and it is documented in full below in [Agentic engineering](#agentic-engineering). If you are here to see how a codebase is prepared for agents rather than how a grade book works, start there.

---

## Contents

- [Domain in sixty seconds](#domain-in-sixty-seconds)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Agentic engineering](#agentic-engineering)
  - [The failure modes this is built against](#the-failure-modes-this-is-built-against)
  - [Document ownership and precedence](#document-ownership-and-precedence)
  - [The dispatcher: AGENTS.md](#the-dispatcher-agentsmd)
  - [Reading long documents cheaply](#reading-long-documents-cheaply)
  - [The decision log](#the-decision-log)
  - [Tasks as plans, never as truth](#tasks-as-plans-never-as-truth)
  - [TDD discipline and the sub-tag taxonomy](#tdd-discipline-and-the-sub-tag-taxonomy)
  - [The mechanical gate](#the-mechanical-gate)
  - [What this bought](#what-this-bought)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Configuration and secrets](#configuration-and-secrets)
- [Deployment](#deployment)
- [Security posture](#security-posture)
- [Current state and roadmap](#current-state-and-roadmap)
- [Working conventions](#working-conventions)
- [Demo](#demo)

---

## Domain in sixty seconds

**Grading.** A grade is five decimal point fields in steps of 0.5 — first midterm (max 30), second midterm (30), lecture attendance (5), practical participation (5), exam (30). The sum maps to a final grade: 0–50 → **5** (fail), 51–60 → **6**, 61–70 → **7**, 71–80 → **8**, 81–90 → **9**, 91–100 → **10**. A professor can save a partial **draft** indefinitely; **Confirm** appears only once all five fields are filled, and it snapshots the final grade and starts the student's clock.

**Appeals.** For 7 calendar days after confirmation the student either confirms the grade ("lock it in now") or submits **one** appeal. The professor accepts (re-enter exam points, re-confirm) or denies (revocable for 24 h). An appeal the professor ignores for 7 days becomes **Overdue** — which grants the student one further appeal rather than finalizing anything.

**Escalation.** A grade must never finalize because a professor failed to act. Two triggers, both computed on read — no background jobs, no schedulers:

| Scenario | Trigger | Reason code |
|---|---|---|
| **A** — accepted but not re-graded | `appeal.ReviewedAt + 7d < now` and the grade is still open | `AcceptedUnresolved` |
| **B** — chain exhausted | two or more appeals on the grade are all effectively overdue | `ChainExhausted` |

The case appears on the admin's board as `NeedsAssignment`, and the admin assigns an **eligible professor** — one who teaches another subject with the same `SubjectCode`, excluding the original. The assignee then holds *write* authority on that grade; the original professor keeps read access and gets `403` on every write. If the assignee also misses their 7-day window, the case resurfaces as `NeedsReassignment`. Full assignment history is kept; nothing is overwritten.

Every rule above is normative in [`docs/PRD.md`](docs/PRD.md) — §3 grading, §4 appeals, §4.8 escalation, §4.7 the Earned-ECTS rule. The glossary is [`docs/Overview.md`](docs/Overview.md) §4.

---

## Architecture

```
[SPA] → HTTPS → CORS allow-list → JwtBearer (reads the sp_access cookie)
      → role policies → FluentValidation (auto 400) → Controller
      → Service (ownership checks) → Repository → EF Core → PostgreSQL
```

**Backend** — a classic layered API: 10 controllers, 11 services, 9 repositories, every abstraction in `Interfaces/`, AutoMapper profiles, one FluentValidation validator per DTO, and a single global exception middleware mapping typed exceptions (`NotFoundException`, `ForbiddenAccessException`, `ValidationException`, `ConflictException`) to 404 / 403 / 400 / 409. Authorization is **two-layered on purpose**: the controller attribute gates by role, and the service-level ownership check is the authoritative one — it must hold even when the UI is bypassed. Every service that implements a time-dependent product rule takes `System.TimeProvider` by constructor injection, so tests move the clock instead of sleeping.

**Frontend** — feature-sliced React. Pages own state; presentational components take props. One data-fetching hook per network read, each calling a service function in its own feature's `api/` folder, with `AbortSignal` plumbed hook → service → axios. One Zustand slice (`currentUser`, `isHydrating`) and **no token in JS** — the access JWT lives in an httpOnly cookie, and the axios interceptor handles silent refresh, serialising a burst of 401s through a single module-scoped `refreshPromise`. Forms are raw `useState` plus a Zod `safeParse`; there is no form library. Styling is Bootstrap utility classes, with exactly one documented exception (the purple "Under admin review" badge, per D-014).

Both halves carry a deliberate *not in use* list — no React Query, no Tailwind or shadcn, no custom hooks other than data-fetching ones, no Serilog, no background workers. See [`docs/Tech.md`](docs/Tech.md) §1 and §4, [`docs/Tech-Backend.md`](docs/Tech-Backend.md), [`docs/Tech-Frontend.md`](docs/Tech-Frontend.md) §2.

### Versions that matter

| Backend | | Frontend | |
|---|---|---|---|
| .NET | 8.0 | React / React DOM | 19.1 |
| Npgsql EF Core provider | 9.0.4 | TypeScript | 5.8 |
| AutoMapper | 15.0.1 | Vite | 7.1 |
| FluentValidation.AspNetCore | 11.3.1 | react-router-dom | 6.30 |
| Swashbuckle | 6.6.2 | Zustand / Zod | 5.0 / 4.6 |
| xUnit · NSubstitute · FluentAssertions | unit tests | Vitest · RTL · MSW 2 | frontend tests |
| Testcontainers (`postgres:17`) · Respawn | integration tests | Bootstrap | 5.3 |

---

## Repository layout

```
AGENTS.md                  agent dispatcher — precedence, read-by-sub-tag, hard rules
CLAUDE.md                  one line: @AGENTS.md
docs/                      the authoritative document set (see below)
scripts/check-docs.mjs     mechanical documentation consistency checker
.githooks/pre-commit       runs the checker when docs/ or AGENTS.md is staged
.env.example               production environment variables for Render
backend/
  StudentPortal/           API — Controllers, Services, Repositories, Interfaces,
                           Models/{Entities,Enums}, Dtos, Validators, Profiles,
                           Handlers, Migrations (+ seed.sql)
  StudentPortal.Tests/            unit tests, one class per service
  StudentPortal.IntegrationTests/ real HTTP + real Postgres, grouped by domain
frontend/
  src/features/{auth,user,grades,appeals,subjects}/   api · hooks · models · components · pages
  src/{components,providers,shared,store,lib,config}/ cross-feature shell
  src/test/{helpers,integration}/                     fixtures, MSW handlers, page-level suites
```

The live trees are documented — and carry a `verified at <sha>` marker — in `Tech-Backend.md` §1 and `Tech-Frontend.md` §1. If a document and the filesystem disagree, the document is the bug and it gets fixed in the same commit as the change.

---

## Agentic engineering

This is the part of the repo that is actually being built right now. The application code is the *subject*; the system below is the *product*.

### The failure modes this is built against

Each mechanism exists because an agent — or a human — actually failed in that specific way.

| Failure mode | Mechanism |
|---|---|
| An agent invents a product rule nobody asked for | PRD is the single owner of behaviour; `AGENTS.md` §8 forbids invention outright |
| An agent reads the wrong document and implements a plausible-but-wrong rule | one owner per *kind* of truth, plus a concern → document pointer map in `Overview.md` §3 |
| Two documents disagree and the agent silently picks whichever it read last | **never resolve by choosing**: stop, log an `OPEN` decision, report, wait |
| An agent burns its context window reading a 2 500-line PRD to answer one question | section indexes with **no** line numbers, plus a grep-then-ranged-read protocol (D-011) |
| Stored line-range tables of contents decay and silently truncate a section | line numbers are never stored; they are derived with `grep -n "^## "` on every read |
| A rule lives only in a task file, and archiving the task erases it | a task is a plan, never a rule source (D-010); new rules land in the owning document first |
| An agent ships behaviour and forgets the sibling documents | cross-document update protocol: owning siblings change in the **same commit** |
| Documentation rots quietly between commits | `scripts/check-docs.mjs`, wired into a pre-commit hook |
| An agent "resumes" a task it has already half-finished | per-subtask checkboxes, ticked in the same commit as the work |
| An agent writes code first and a test afterwards, if ever | mandatory red-green-refactor-verify per subtask, with an explicit `Verify:` command |

### Document ownership and precedence

Four documents are authoritative, and a value or rule is defined in **exactly one** of them. Everywhere else points at it; two definitions is a bug even when they currently agree.

| Kind of truth | Owner |
|---|---|
| Product behaviour, rules, states, numbers, flows | `docs/PRD.md` |
| Visual rules, copy, Bootstrap classes, breakpoints | `docs/UI.md` — *only where PRD is silent* |
| Schema: tables, columns, types, indexes, constraints | `docs/DB.md` |
| Code structure, libraries, patterns, test conventions | `docs/Tech.md`, `docs/Tech-Backend.md`, `docs/Tech-Frontend.md` |
| *Why* a rule is what it is | `docs/Decisions.md` (a log of reasoning, not of rules) |

Supporting files: [`docs/Overview.md`](docs/Overview.md) — always read first; one paragraph of context, the three actors, the pointer map and the glossary — then `docs/tasks/active/` (open work), `docs/tasks/done/YYYY-MM.md` (archive) and `docs/refactors/` (campaign plans).

**The escalation rule is the load-bearing part.** When two documents disagree, the agent does not arbitrate. It stops, appends an `OPEN` entry to `Decisions.md` naming both sources as `file:line`, reports to the human, and waits. Writing code that depends on an unresolved rule is explicitly out of bounds.

### The dispatcher: AGENTS.md

[`AGENTS.md`](AGENTS.md) loads on every session (via the one-line `CLAUDE.md`) and is kept deliberately short — it routes, it does not explain. Its most load-bearing table maps a subtask's **sub-tag** to the *minimum* set of sections that must be loaded before any code is written:

| Sub-tag | Minimum reads |
|---|---|
| `Backend-service` | `Tech-Backend` §2–§3, §6 + every section on the `Rules:` line |
| `Backend-endpoint` | `Tech-Backend` §2–§5 + `Rules:` sections |
| `Backend-migration` | `DB.md` (whole), `Tech` §2 + `Rules:` sections |
| `Frontend-component` | `Tech-Frontend` §1–§2, §5–§6, `UI.md` (that screen) + `Rules:` sections |
| `Frontend-page` | `Tech-Frontend` §1–§5, `UI.md` (that screen) + `Rules:` sections |
| `Seed` | `DB` §4, `PRD` §7, `Tech-Backend` §7 + `Rules:` sections |

Then the part that makes it auditable: **before writing a single line of code, the agent echoes what it actually loaded.**

```
Loaded: PRD §4.8, UI §7.6, Tech-Frontend §1, Tech-Frontend §3
```

One line, and it turns "I forgot to read the PRD" from an invisible failure into a visible one. A subtask whose `Rules:` line names a section missing from that echo was not started correctly.

### Reading long documents cheaply

`PRD.md`, `Tech*.md` and `UI.md` each carry a **Section index** that lists headings and, on purpose, **no line numbers** (per D-011). The read protocol is:

```bash
grep -n "^## " docs/PRD.md     # live, correct line numbers
# pick your section; the next heading's line minus one is where yours ends
# then read with offset/limit for that range only
```

Stored line ranges were tried and rejected: they decay with every edit, they fail *silently* (a section quietly loses its tail), and they cost manual arithmetic on every commit. Grep is self-healing and free. `DB.md` and `Decisions.md` carry no index — they are small enough to read whole. No `##` section may exceed ~150 lines; the checker warns when one does, and the fix is to split the section, or the file, in the same commit. That cap is why `Tech.md` became three files (D-013): the old `Tech.md §3` had grown to 330 lines, so "read just that section" loaded 60 % of the file and defeated the point of section reads.

### The decision log

[`docs/Decisions.md`](docs/Decisions.md) is an append-only ADR log — 22 entries so far — in a fixed five-field shape:

```
### D-0NN — <the question>
**Decided:** <date> · **Status:** Accepted | Superseded by D-0NN | OPEN
**Answer:**   <the rule, one or two sentences>
**Lives in:** <PRD §x / UI §x / DB §x / Tech-Backend §x — where the rule is written down>
**Why:**      <the reasoning>
```

Three properties make it work:

1. **An entry is not a source of truth.** It records *why*; the rule itself lives in the owning document. `Lives in:` is that pointer, and every `(per D-0NN)` reference anywhere in the docs must resolve here — the checker fails the commit if it does not.
2. **Entries are never edited or renumbered.** A changed mind gets a new entry, and the old one is marked `Superseded by D-0NN`.
3. **`OPEN` blocks work.** An open entry makes every section under its `Lives in:` unsafe to implement, and the checker surfaces it as a warning on every run.

The log doubles as a record of what went wrong. D-007, for instance, exists because an ECTS query excluded a grade if *any* appeal was still stored as `Pending` — and since Overdue is *stored* as Pending, the chain "appeal #1 overdue → appeal #2 denied" produced a truly-final grade that earned 0 ECTS forever, contradicting PRD §4.7. The fix was a rule ("only the single most recent appeal gates Earned ECTS"), and that rule now has its reasoning attached permanently.

### Tasks as plans, never as truth

Open work lives as **one file per task** in `docs/tasks/active/`, with [`index.md`](docs/tasks/active/index.md) as the only file an agent reads up front — one row per task carrying progress, status, `Depends on:` and `Blocks:`. Other task files are other people's concerns and stay unloaded.

Every subtask carries a checkbox and a four-line contract:

```
Rules:          <PRD §x / UI §x / DB §x / Tech-Backend §x / none>
Not in scope:   <what this subtask must not touch>
Docs to update: <PRD §x / UI §x / DB §x / none>
Verify:         <the exact command that must pass>
```

`Rules:` tells the agent which sections to load, and turns the subtask bullets into test cases. `Not in scope:` is what stops a subtask growing. `Verify:` is what stops the agent inventing its own definition of done. `Rules:` may name **only** PRD / UI / DB / Tech sections or `none` — never a task file (D-010), because task files get deleted on completion and a rule stored only there would vanish with it.

Progress is counted in *subtasks*, not boxes: a subtask is done only when every one of its boxes is ticked, and the checker recomputes the `done/total` cell in `index.md` and fails the commit when that number is stale. Work resumes at the first unchecked subtask, and a box is ticked in the same commit as its code.

**Archival gate.** A task may be archived only when (1) every rule in its Overview already appears in PRD / UI / DB / Tech, (2) every pointer to the task file from any other document is repointed at the owning section, and (3) every subtask is `- [x]`. Then, in one commit: append the trimmed entry to `docs/tasks/done/YYYY-MM.md`, delete the task file, remove its row from the index. [`docs/tasks/done/2026-10.md`](docs/tasks/done/2026-10.md) holds the 23 tasks already through that gate, trimmed to id plus commit message.

Longer restructuring campaigns are not tasks — they live in `docs/refactors/<name>.md` and move to `docs/refactors/done/` when finished.

### TDD discipline and the sub-tag taxonomy

Every implementation subtask runs **red → green → refactor → verify**: write a failing test for the behaviour this subtask adds and confirm it fails *for the right reason*; write the minimum code that makes it pass; clean up without changing behaviour; run the full suite for the touched layer. The sub-tag picks the *subject* of the change, and therefore the kind of test — bare `Backend` and `Frontend` are not valid tags.

| Sub-tag | The change is in… | Test type |
|---|---|---|
| `Backend-service` | a class under `Services/` or `Repositories/` | unit, mocked dependencies |
| `Backend-endpoint` | a controller, route, DTO or validator | integration, real HTTP + real DB |
| `Backend-migration` | an EF migration and its entity mapping | integration, asserts the schema after migrate |
| `Frontend-service` | a function under a feature's `api/` | unit with MSW, no React |
| `Frontend-component` | one presentational component | unit, RTL, co-located |
| `Frontend-page` | a page, or a section owning state and fetches | integration, RTL + router + MSW |
| `Seed` | `seed.sql` | integration against the real DB |
| `Refactor` | behaviour-preserving restructuring | **no new test**; existing suites stay green and you state which you ran |
| `UI` / `Docs` / `DevOps` | docs-only, documentation, tooling | none / exempt |

### The mechanical gate

Prose conventions decay. [`scripts/check-docs.mjs`](scripts/check-docs.mjs) is ~370 lines of zero-dependency Node that enforces the half of `AGENTS.md` a machine can check, across 15 documents:

- **Section indexes match reality** — every `## N.` heading is listed, every listed row has a heading, titles match (modulo parenthetical glosses), and **no index row carries a line range** (D-011).
- **Section size cap** — warns on any `##` (or `###`, where subsections exist) over ~150 lines.
- **`§` cross-references resolve** — `PRD §4.8`, `Tech-Frontend §3`, `UI §12.2` must point at a heading that really exists in that document.
- **Decision references resolve** — every `D-0NN` mention must be an entry in `Decisions.md`; `OPEN` entries warn on every run; the retired `per QNN` reference style is a hard error.
- **The `Rules:` contract** — every fragment must start with a document name, `§`, `D-0NN` or `none`, and naming a task file is a hard error (D-010).
- **The subtask contract** — every subtask heading must carry its `Rules:`, `Not in scope:`, `Docs to update:` and `Verify:` lines.
- **Task index integrity** — every row links a real file, every task file has a row, and the `done/total` cell is recomputed from the ticked checkboxes.
- **Documented paths exist** — any `path/like/this.ts` in backticks in a source document must exist on disk (`Decisions.md` is exempt: as a historical record it legitimately names deleted files).
- **The `docs/old/` ban** — that git-ignored snapshot of superseded documents is never authoritative (D-012), and mentioning it outside three sanctioned files warns.

```bash
node scripts/check-docs.mjs                        # 0 = clean, 1 = at least one error
node scripts/check-docs.mjs --warnings-as-errors   # strict mode

check-docs: OK (15 documents, 22 decisions, 4 active tasks)
```

The [pre-commit hook](.githooks/pre-commit) runs it — but only when something under `docs/`, `AGENTS.md` or the checker itself is staged, so code-only commits stay fast. It also skips cleanly when `node` is unavailable. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

When it fails, the fix is the documents. `--no-verify` is not an option.

### What this bought

The honest summary. The first pass of this system caught a genuine ECTS-calculation bug that had been live and invisible (D-007), two direct PRD↔UI contradictions that had each been "resolved" differently in different files (D-001, D-005), a schema field documented at three different lengths with no statement of which was the contract (D-015), a timestamp type where the documentation was wrong and the code was right (D-016), and two sibling folders holding live files for the same purpose under near-identical names, so that imports had split across a typo (D-019). None of those were found by reading code. All of them were found by making the documents prove they agreed.

The cost is real too: a behaviour change now touches three to five files instead of one, and a new rule has to be written down before it can be implemented. That is the trade, made on purpose.

---

## Getting started

**Prerequisites** — .NET 8 SDK · Node 20+ · PostgreSQL 15+ with `psql` on `PATH` · Docker Desktop (only for the integration suite).

### 1. Backend

```bash
cd backend/StudentPortal

# secrets never live in appsettings.json; the app fails fast at startup without them
dotnet user-secrets set "JwtConfig:Key" "<a random key of at least 32 bytes>"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=StudentPortal;Username=postgres;Password=<your-password>"

dotnet ef database update
psql "postgresql://postgres:<your-password>@localhost:5432/StudentPortal" -f Migrations/seed.sql

dotnet run --launch-profile https
```

API on `https://localhost:7253`, Swagger UI at `/swagger` (Development only).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

SPA on `http://localhost:5173`. `VITE_API_BASE_URL` is `/api` in development and Vite proxies `/api` → `https://localhost:7253`, so cookies stay same-site.

### 3. Sign in

All seeded users share the password `Password123!` — local seed data only, never a deployed credential.

| Role | Email |
|---|---|
| Admin | `admin@uni.edu` |
| Professor | `john.smith@uni.edu` (also `emily.johnson@`, `michael.davis@`, `laura.wilson@uni.edu`) |
| Student | `sarah.williams@student.edu`, plus nine more `*@student.edu` |

The seed provides 1 admin + 4 professors + 10 students, ~15 subjects (every one with a `SubjectCode`, at least two shared across professors so escalation has an eligible assignee), ~30 enrollments and ~20 grades spread across every state. **It is deliberately free of time-sensitive rows** (per D-022): the seed replays before every integration test, so one backdated timestamp would inject an overdue or escalated case into the whole suite. Elapsed-time states are produced per test by backdating helpers instead.

---

## Testing

```bash
dotnet test backend/StudentPortal.Tests              # unit — no Docker, no DB
dotnet test backend/StudentPortal.IntegrationTests   # integration — needs Docker
cd frontend && npm run test                          # Vitest (watch); npm run build typechecks
```

**Unit, backend** — xUnit + NSubstitute + FluentAssertions, one class per service, AAA structure, names as `MethodName_Scenario_ExpectedResult`. Mocks are for external collaborators only, never for the logic under test.

**Integration, backend** — one pinned `postgres:17` Testcontainer per suite (never `latest`), `WebApplicationFactory<Program>`, EF migrations applied, and Respawn truncating every table before each test with `seed.sql` replayed on top. Authentication goes through the real `/api/Account/Login` with a cookie-carrying client — JWTs are never hand-minted and no test `AuthenticationHandler` is installed. The clock is a `FakeTimeProvider` swapped in for the singleton, so every time-dependent rule is asserted at three points: just before, exactly at, and just after the deadline. No `Thread.Sleep`, ever.

**Frontend** — Vitest + jsdom + React Testing Library + user-event, with MSW 2 as the HTTP boundary and `onUnhandledRequest: 'error'`. Two co-existing layouts: unit tests co-located next to their subject, and page-level integration suites under `src/test/integration/<area>/` (`auth`, `appeals`, `dashboards`, `grades`, `user`, `components`, `a11y`, `responsive`). Service modules are exercised through MSW; component tests `vi.mock()` the service instead. Describe blocks name the rule they enforce — `describe('StudentDashboardPage aggregates (PRD §5.5)', …)` — so a failing test points straight at a document section.

Full conventions, including the explicit anti-pattern lists: `Tech-Backend.md` §7 and `Tech-Frontend.md` §7.

---

## Configuration and secrets

Nothing production-sensitive is committed. `appsettings.json` holds non-secret values only (issuer, audience, token lifetime, CORS origins), and `Program.cs` throws at startup on a missing connection string, a missing JWT issuer or audience, or a signing key under 32 bytes.

| Variable | Where | Notes |
|---|---|---|
| `JwtConfig__Key` | user-secrets locally, env var in prod | ≥ 32 bytes; HMAC-SHA512 is pinned |
| `JwtConfig__Issuer` / `__Audience` | `appsettings.json` / env var | validated on every request |
| `ConnectionStrings__DefaultConnection` | user-secrets locally, env var in prod | PostgreSQL |
| `Cors__Origins__0`, `__1` | `appsettings.json` / env var | explicit allow-list, credentials allowed |
| `ASPNETCORE_ENVIRONMENT` | env var | `Production` disables Swagger |
| `VITE_API_BASE_URL` | `frontend/.env.*` | `/api` in dev, absolute API URL in prod |

See [`.env.example`](.env.example) for the production set.

---

## Deployment

The target is Render, and it is currently **scaffolding only** — local development is the supported mode and production URLs are placeholders (PRD §8).

- Backend: web service, build `dotnet publish -c Release -o out`, start `dotnet out/StudentPortal.dll`.
- Frontend: static site, build `npm run build`, publish directory `dist/`.
- HTTPS terminates at Render; the app keeps `UseHttpsRedirection()` and emits `Secure` cookies.
- Auth cookies are `SameSite=Strict`, so the API and the SPA must share a registrable domain. Verify it in a real browser before trusting it.

---

## Security posture

Scoped as a junior / learning project, with the boundaries written down rather than implied.

- **No public self-registration.** No `/register` endpoint, no sign-up form; admins create every account.
- **Tokens never reach JavaScript.** `sp_access` (15 min) and `sp_refresh` (7 days, scoped to `Path=/api/Account`) are both `HttpOnly; Secure; SameSite=Strict`. The SPA has no token field and no storage wrapper.
- **Refresh rotation with reuse detection.** Each refresh issues a new row and revokes the old one; presenting an already-rotated token revokes the user's entire chain and returns 401.
- **Two-layer authorization.** A role attribute on the controller, an ownership check in the service — and the service is authoritative. On an escalated grade that check is two-tier (D-017): reads allow the original *or* the assigned professor, writes allow only the assignee.
- **Mass assignment is structurally impossible.** Self-service DTOs do not expose role, soft-delete or password-hash fields, and an admin cannot demote or soft-delete themselves even if the UI is bypassed.
- **Sign-out-everywhere on password change**, verified against the current password, revoking every refresh row for that user.
- **Validation at the edge** through FluentValidation, returning `400 ValidationProblemDetails` with no controller code.
- **Opaque errors.** One exception middleware returns `ProblemDetails { title, traceId }`; details go to the log, never to the client.

**Known and accepted limitation.** Password hashing is PBKDF2-SHA512 at **100 000 iterations**, which is *below* OWASP 2023 guidance (600 000 for PBKDF2-SHA256). It is retained deliberately for this project and is not suitable as-is for production. Also explicitly out of scope: rate limiting, account lockout, CSRF middleware beyond `SameSite=Strict`, password-reset and email flows, and audit tables. See PRD §6 and §10.

---

## Current state and roadmap

The application runs end to end: auth, admin CRUD, drafts, grading, the full appeal lifecycle, both dashboards, profile and change-password. The escalation workflow is shipped on the backend and on the professor and student side. Open work, as tracked in [`docs/tasks/active/index.md`](docs/tasks/active/index.md):

| Task | Title | Progress |
|---|---|---|
| 23 | Escalation workflow — admin tab, `SubjectCode` form field, seed, tests | 11/16 |
| 22 | Test coverage — backend integration, frontend unit + integration, e2e | 20/38 |
| 24 | `<PasswordInput>` primitive, adopted on every password field (D-001) | 0/4 |
| 25 | Align the shipped UI with the rules settled in the consistency pass | 0/4 |

Known gaps, stated rather than hidden: the admin **Escalations** tab is not built yet, so assignment currently happens only through the API; the admin subject create and edit forms do not yet send `SubjectCode` while the API requires it, which makes both forms fail with `400` (task 23.13, first in the queue); Playwright is not installed, so there is no e2e suite yet (task 22d); and one refactor campaign is open — [`docs/refactors/legacy-frontend-cleanup.md`](docs/refactors/legacy-frontend-cleanup.md) — to delete the pre-feature-sliced folders that `Tech-Frontend.md` §1 still marks "do not extend".

---

## Working conventions

1. **Read `docs/Overview.md` first, every session.** Then load by sub-tag, and echo what you loaded.
2. **Never resolve a contradiction by choosing.** Stop, log an `OPEN` decision naming both sources as `file:line`, and report it.
3. **The trigger is the change, not the file you started in.** A behaviour, schema or screen change updates its owning sibling documents in the **same commit** — "I only edited a task file" is not an exemption.
4. **One definition per value.** A number, status string, breakpoint or class name lives in exactly one document; everywhere else points at it.
5. **Run `node scripts/check-docs.mjs` before a documentation commit**, and keep the hook enabled.
6. **Commit messages** follow `type(scope): imperative subject` — `feat(professor)`, `security(backend)`, `refactor(frontend)`, `docs(tasks)`, `fix(responsive)`. The archive in `docs/tasks/done/` is the reference corpus.
7. **Tick the subtask checkbox in the same commit as its work.** A task file still existing does not mean nothing has been done.

---

## Demo

The recording below is of the **original 2025 build**, before the agentic-engineering pass — the five-field grading model, the appeal flow and the escalation workflow described above all postdate it:

https://github.com/user-attachments/assets/2c9b963a-cb31-46c0-9f42-b8efd9efffa9

---

*Personal project by Lazar Aćimović. No open-source license has been applied; all rights reserved.*
