### Refactor 05 — Data access: query shape, indexes and the crash order

#### Overview

D-032 states the principle this campaign enforces everywhere rather than in one place: "Loading every grade with its full escalation graph does not survive production data volumes. Filtering in SQL, split queries, and no-tracking read models are the standard EF Core remedies." The escalation path was fixed under that decision; the rest of the data layer was not.

The seed is 15 users, 15 subjects, 30 enrollments and 20 grades (`PRD.md` §7), so nothing here shows up locally. Ranked by what fails first as the data grows, with the measurable cause:

| # | Endpoint | What breaks | Cause |
|---|---|---|---|
| 1 | `GET /api/Professor/me/dashboard` | memory and latency, then timeout | `ProfessorDashboardService` issues 4 unpaginated queries and groups in C#. `GetEnrollmentsForProfessorDashboardAsync` loads every enrollment of every subject the professor teaches with `Subject`, `Student`, `Grade`, `Grade.Appeals` and `GradeDraft` in **one** query with no `AsSplitQuery()`, so the appeal rows multiply the enrollment rows in a single Cartesian result set |
| 2 | `POST /api/Account/Refresh` and `POST /api/Account/Logout` | latency on the hottest authenticated path | `FindByHashAsync` filters on `TokenHash`, which has no index, in a table nothing ever prunes. Fixed in refactor-03 R03.3 and R03.4 — do not duplicate it here |
| 3 | `GET /api/Escalation` | latency, on both the count and the page | the `Where` runs two correlated subqueries over `Appeals` using `a.ReviewedAt.Value.AddDays(7) < now` and `a.SubmittedAt.AddDays(7) < now`. Date arithmetic on the column side is non-sargable, so no index can ever serve it; `CountAsync` pays the same cost again |
| 4 | `GET /api/User/search`, `GET /api/Subject/search` | latency per keystroke | leading-wildcard `ILIKE '%q%'` cannot use a btree index. D-034 and `DB.md` §6.5 accept this until `EXPLAIN ANALYZE` says otherwise — so the index is **not** in scope, but the full-entity materialisation behind it is: both repositories load whole `User` / `Subject` rows, `UserPassword` hash included, where `DB.md` §6.5 selects three or four columns |
| 5 | `GET /api/Subject/{subjectId}/students` | unbounded response | no paging at all. Handled by refactor-04 R04.1 and R04.2 |
| 6 | `GET /api/Escalation/eligible-professors` | latency | `GetProfessorsBySubjectCodeAsync` filters on `u.Subjects.Any(s => s.SubjectCode == subjectCode)`, and `Subjects` has no index on `SubjectCode` (`DB.md` §2.2 lists only `IX Subjects_ProfessorId`) |

Alongside those, the layer carries dead weight that is a landmine rather than a cost today — nine repository and service methods with no production caller, four of which load an entire table:

| Method | Caller |
|---|---|
| `IUserRepository.GetAllUsersAsync` / `IUserService.GetAllUsersAsync` | none |
| `IEnrollmentRepository.GetAllEnrollmentsAsync` / `IEnrollmentService.GetAllEnrollmentsAsync` | none |
| `ISubjectRepository.GetAllSubjectsAsync` / `ISubjectService.GetAllSubjectsAsync` | none |
| `IGradeRepository.GetAllGradesAsync` | none (and tracked, with no `AsNoTracking`) |
| `IGradeRepository.GetGradeByStudentIdAsync`, `GetGradesByStudentAndSubjectAsync` | none |
| `IGradeRepository.ConfirmGradeAsync(Guid)` | none — `GradeService` stamps `ConfirmedAt` from the injected `TimeProvider`; this method still uses `DateTime.UtcNow` |
| `IUserService.FindByEmailAsync` | none — `AuthService` uses the repository directly |
| `IGradeRepository.GetAllWithEscalationDetailsAsync` | `EscalationService.GetAllCasesAsync`, which no controller calls; `EscalationController` uses `GetPagedCasesAsync`. Ten unit tests keep the unpaginated path alive |

**The target structure is defined in `Tech-Backend.md` §2 and `DB.md` §6.** Every subtask here is behaviour-preserving, so every one is `Refactor` except the two that add an index (`Backend-migration`) and the one that escapes search input, which changes what a query matches.

**Depends on:** nothing · **Blocks:** nothing

#### Baseline — captured before step one

Capture rows 1–4 against `Migrations/seed-dev-pagination.sql` layered on `seed.sql` (`DB.md` §4), and record the generated SQL with `dotnet ef dbcommand` logging or `EXPLAIN ANALYZE` from `psql`.

| Measure | Before | After (fill in at the end) |
|---|---|---|
| `dotnet test backend/StudentPortal.Tests` | 173 passed, 0 failed | |
| `dotnet test backend/StudentPortal.IntegrationTests` | 190 passed, 0 failed — 24 s (green since task 22e.1; see the index) | |
| `GET /api/Professor/me/dashboard` — SQL statements issued | record (expect 4) | |
| `GET /api/Professor/me/dashboard` — rows returned by the enrollment query | record (expect enrollments × appeals) | |
| `GET /api/Escalation?page=1` — `EXPLAIN ANALYZE` plan | record (expect a seq scan on `Grades` and `Appeals`) | |
| `GET /api/User/search?role=Student&query=a` — columns in the generated `SELECT` | record (expect every `Users` column) | |
| repository / service methods with no production caller | 9 | |
| `AsNoTracking` calls across `Repositories/` | 22 | |

#### Out of scope

- **`pg_trgm` / GIN indexes for the search endpoints.** D-034 and `DB.md` §6.5 both say explicitly: added only if `EXPLAIN ANALYZE` on production-sized data justifies it, none upfront. Recording the plan is in scope (the baseline table); adding the index is not.
- **The partial index on `Grades WHERE "FinalizedAt" IS NULL".** `DB.md` §6.3 says the same thing about it, and `GradeRepository` carries a comment saying so. Same treatment.
- **Caching of any kind.** Not in `Tech.md` §1, and `Tech.md` §4 is about what is intentionally simple.
- **Computing appeal status in SQL instead of on read.** The Overview glossary and `DB.md` §2.6 are explicit that `Overdue` is computed at read time and never written. Reshaping that is a product change, not a refactor.
- **Refresh-token indexing and retention** — refactor-03 R03.3 and R03.4 own them. Row 2 of the table above is listed for the ranking only.

#### Rollback

Each subtask is one commit touching one path. The two migrations have a `Down` that drops exactly what they create. For the query-shape subtasks the safety property is that the suites never went red: an EF query rewrite that changes a result set will fail an existing dashboard or escalation test, which is why those tests are the gate.

---

#### R05.1 — Refactor: Split the professor dashboard query

Rules: Tech-Backend §2, D-032 (`AsSplitQuery()` + `AsNoTracking()` on multi-`Include` read paths)
Not in scope: changing the payload. `Tech-Frontend.md` §1.1 documents the three arrays the SPA binds to; every field must survive byte-identical. No paging of the dashboard — that is a product change (D-031 decided which lists page).
Docs to update: Tech-Backend §2
Verify: `dotnet test backend/StudentPortal.Tests` and `dotnet test backend/StudentPortal.IntegrationTests`

- [x] Record the generated SQL and row count for `GetEnrollmentsForProfessorDashboardAsync` before the change, in the commit message.
- [x] Add `AsSplitQuery()` to it. It has five `Include`/`ThenInclude` levels and no split, which is the exact Cartesian shape D-032 names.
- [x] Do the same for `AppealRepository.GetAppealsByProfessorIdForDashboardAsync` (two three-level `Include` chains) and `GetPendingByProfessorIdAsync`.
- [x] `GetPendingByProfessorIdAsync` also gains `AsNoTracking()` — it is a pure read and `AppealRepository` has exactly one `AsNoTracking` call across the file.
- [x] `ProfessorDashboardService` keeps its four calls and its C# grouping. Collapsing them is a bigger change; this subtask fixes the row multiplication only, and the measurement in the Baseline table says whether a second pass is needed.
- [x] `ProfessorDashboardTests` and `ProfessorDashboard.binding` integration tests green, proving the payload is unchanged.
- [x] Named suites green.
- Commit: `refactor(backend): split the professor dashboard include graph`

---

#### R05.2 — Refactor: Delete the nine uncalled methods

Rules: Tech-Backend §1 (one interface and one implementation per domain), Tech-Backend §2
Not in scope: any method with a caller, however awkward. Confirm each deletion with a grep recorded in the commit message.
Docs to update: Tech-Backend §1 if an interface disappears entirely
Verify: `dotnet test backend/StudentPortal.Tests` and `dotnet test backend/StudentPortal.IntegrationTests`

- [ ] One grep per method, hits recorded in the commit message. A method whose only callers are its own interface and its own tests counts as uncalled.
- [ ] Delete `GetAllUsersAsync`, `GetAllEnrollmentsAsync`, `GetAllSubjectsAsync`, `GetAllGradesAsync`, `GetGradeByStudentIdAsync`, `GetGradesByStudentAndSubjectAsync`, `ConfirmGradeAsync(Guid)` and `IUserService.FindByEmailAsync`, from both the interface and the implementation.
- [ ] Each of the first four loads a whole table with no paging; leaving them in the interface is an invitation for the next agent to call one.
- [ ] `ConfirmGradeAsync(Guid)` is also the last `DateTime.UtcNow` on a **product-rule** timestamp in the tree — `ConfirmedAt` drives the 7-day window. Deleting it closes that without touching the accepted infrastructure deviations in `Tech-Backend.md` §6.
- [ ] `EnrollmentRepository.AddEnrollmentAsync` drops its first statement, `_context.Users.Any(x => x.Id == enrollment.StudentId && !x.IsDeleted);` — a synchronous query whose result is discarded, so it blocks the request thread to compute nothing. `EnrollmentService` already performs this check properly.
- [ ] Named suites green. Any test that fails is a test of dead code; delete it with its subject and say so in the commit message.
- Commit: `refactor(backend): delete the uncalled repository and service methods`

---

#### R05.3 — Refactor: Retire the unpaginated escalation case path

Rules: D-032 (the endpoint is server-side paginated; the repository never loads all grades), DB §6.3, Tech-Backend §2
Not in scope: the paging contract itself (page 1-based, size 15/20/50) and the four derived statuses. Both stay exactly as they are.
Docs to update: Tech-Backend §3 (the escalation service surface still lists `GetAllCasesAsync`)
Verify: `dotnet test backend/StudentPortal.Tests` and `dotnet test backend/StudentPortal.IntegrationTests`

- [ ] Record that `EscalationController` calls only `GetPagedCasesAsync`, while `GetAllCasesAsync` and `GetAllWithEscalationDetailsAsync` survive solely because ten unit tests in `EscalationServiceTests` target them.
- [ ] Retarget those ten tests to `GetPagedCasesAsync(now, 1, 50)`. Coverage must be identical — same scenarios, same assertions on the same derived statuses — because a `Refactor` writes no new test and loses none (AGENTS §9).
- [ ] Delete `GetAllCasesAsync` from `IEscalationService` and `EscalationService`, and `GetAllWithEscalationDetailsAsync` from `IGradeRepository` and `GradeRepository`.
- [ ] `EscalationCandidateFilterTests` asserts the candidate filter against the method name in its header comment; retarget it the same way.
- [ ] `Tech-Backend.md` §3 stops listing a method that no longer exists.
- [ ] Named suites green, with the same total count as the baseline.
- Commit: `refactor(backend): retire the unpaginated escalation case path`

---

#### R05.4 — Refactor: Project list and search reads to their documented columns

Rules: DB §6.4, DB §6.5 (the documented projections), D-034 (`AsNoTracking` on read paths), Tech-Backend §2
Not in scope: the `ILIKE` predicate itself, its page sizes and its `Id` tie-breaker — all three are D-034 decisions. Escaping comes in R05.5.
Docs to update: Tech-Backend §2
Verify: `dotnet test backend/StudentPortal.Tests` and `dotnet test backend/StudentPortal.IntegrationTests`

- [ ] Record the current generated `SELECT` column list for `UserRepository.SearchAsync` in the commit message — it is every `Users` column, including `UserPassword`.
- [ ] Both search repositories project into the DTO shape inside the `IQueryable`, so the hash never leaves Postgres. `DB.md` §6.5 already defines the column list for all three queries.
- [ ] Add `AsNoTracking()` to the read-only methods that lack it: `SubjectRepository.GetAllSubjectsAsync` (if R05.2 has not already deleted it), `GetSubjectByIdAsync`, `GetSubjectsByProfessorIdAsync`, `GetStudentsBySubjectIdAsync`, and `AppealRepository.GetByGradeIdAsync`.
- [ ] Leave tracking on the mutate paths — `GetUserByIdForUpdateAsync`, `GradeRepository.GetByEnrollmentIdAsync`, `EscalationRepository`, `GradeDraftRepository`, `RefreshTokenRepository`. D-032 is explicit that mutate paths omit `AsNoTracking`.
- [ ] `AsNoTracking` count rises from the baseline 22; record the new number.
- [ ] Named suites green.
- Commit: `refactor(backend): project search reads and add AsNoTracking to pure reads`

---

#### R05.5 — Backend-service: Escape the search pattern

Rules: DB §6.5 (`ILIKE` substring matching executed in SQL), D-034
Not in scope: switching away from `ILIKE`, or adding an index. Both are D-034 decisions.
Docs to update: DB §6.5 (state that the pattern is escaped), Tech-Backend §5
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter AdminUserSearch`

- [ ] This is not SQL injection. `EF.Functions.ILike(u.FirstName, $"%{query}%")` sends the pattern as a bound parameter — the audit found no raw SQL anywhere in `backend/StudentPortal/` except `TestModeEndpoints` replaying the static `seed.sql` file. Say that in the commit message so the next reader does not re-derive it.
- [ ] It is **LIKE-pattern injection**: `%` and `_` in `query` reach Postgres as wildcards. `_` makes the match wider than the caller asked for; a query of `%%%%%%%%` forces a pathological pattern match across the whole table on an endpoint with no rate limit in front of it.
- [ ] Escape `\`, `%` and `_` in `query` before interpolating, and pass the escape character through.
- [ ] Also bound the query length. There is no cap today, so an arbitrarily long pattern is accepted.
- [ ] Integration tests: searching for a literal `_` matches only rows containing `_`; a wildcard-only query returns the same page as an empty query rather than a full scan.
- [ ] Named suite green.
- Commit: `fix(backend): escape wildcards in the admin search pattern`

---

#### R05.6 — Backend-migration: Index SubjectCode

Rules: DB §2.2 (`SubjectCode` groups the same course across professors), DB §6.3 (the eligible-professor query joins on it), PRD §4.8
Not in scope: the search indexes, excluded above.
Docs to update: DB §2.2 (add the index to the Indexes line), DB §5 (append the migration row)
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter EscalationCandidateFilter`

- [ ] Record the `EXPLAIN ANALYZE` plan for the `DB.md` §6.3 eligible-professor query before the change.
- [ ] `dotnet ef migrations add AddSubjectCodeIndex` creating a non-unique btree index on `Subjects.SubjectCode`. It is an equality predicate, so unlike the `ILIKE` searches a plain btree index serves it — which is why this one is in scope and those are not.
- [ ] `Down` drops it.
- [ ] Append the row to the `DB.md` §5 table and the index to §2.2, in the same commit.
- [ ] An integration test asserts the index exists after `Migrate()`.
- [ ] Record the new plan in the Baseline table.
- Commit: `feat(db): index Subjects.SubjectCode for the eligible-professor lookup`

---

#### R05.7 — Docs: Record the query-shape rules and the measurements

Rules: DB §6, Tech-Backend §2, D-032
Not in scope: code.
Docs to update: DB §6, Tech-Backend §1, Tech-Backend §2
Verify: `node scripts/check-docs.mjs`

- [ ] `Tech-Backend.md` §2 states the three rules this campaign enforced, as rules rather than as history: multi-`Include` reads use `AsSplitQuery()`; pure reads use `AsNoTracking()`; list endpoints project to the `DB.md` §6 column list rather than materialising entities.
- [ ] `DB.md` §6 carries the non-sargable note on the escalation predicate, so the next agent does not add an index that cannot help it.
- [ ] Every `EXPLAIN ANALYZE` plan from the Baseline table is recorded in this file, before and after. A campaign whose point is performance and which records no numbers has proved nothing.
- [ ] Backend layout block carries a fresh `verified at <sha>`.
- [ ] `node scripts/check-docs.mjs` passes.
- Commit: `docs: record the data-access rules and the before/after plans`
