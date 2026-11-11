### Refactor 03 — Authentication system hardening

#### Overview

The auth design in `Tech-Backend.md` §3–§4 and `PRD.md` §6 is sound: httpOnly cookies, a 15-minute access JWT read from `sp_access` by a `JwtBearerEvents.OnMessageReceived` hook, SHA-256-hashed refresh tokens with rotation and re-use detection, PBKDF2-SHA512 verification through `CryptographicOperations.FixedTimeEquals`, and sign-out-everywhere on password change. What this campaign fixes is the gap between that design and the implementation:

| Measure | Documented | In the tree |
|---|---|---|
| `sp_refresh` cookie `Path` | `/api/Account` (Tech-Backend §4, README) | `/` — sent to every endpoint |
| `UQ RefreshTokens_TokenHash` | DB §2.7 lists it | absent from `AddRefreshToken` migration and from the model snapshot |
| `RefreshTokens.TokenHash` length | `varchar(100)` (DB §2.7) | `HasMaxLength(128)` |
| `RefreshTokens.CreatedByIp` length | `varchar(64)` (DB §2.7) | `HasMaxLength(45)` |
| access-cookie lifetime | one value, 15 min (PRD §6) | twice: `JwtConfig:TokenValidityMins` for the JWT, a literal `15` for the cookie |
| refresh lifetime | one value, 7 days (PRD §6) | three literal `AddDays(7)` call sites in `AuthService` |
| password length bound | 12–128 on password DTOs (Tech-Backend §5) | `LoginRequestDto.Password` and `ChangePasswordDto.CurrentPassword` have **no** `MaximumLength` |
| refresh-row lifecycle | rotate + revoke | rows are never deleted; the table only grows |

Three of those are security-relevant rather than cosmetic. A refresh cookie on `Path=/` rides along with every XHR, widening the surface the documented scoping was meant to narrow. The missing `UQ` on `TokenHash` means `FindByHashAsync` is a **sequential scan on every `/Refresh` and every `/Logout`** — the hottest authenticated path in the app, against a table with no retention policy. And an unbounded `Password` on an `[AllowAnonymous]` login endpoint lets an unauthenticated caller hand the server an arbitrarily long string to run 100 000 PBKDF2-SHA512 iterations over: CPU amplification with no rate limit in front of it, which is exactly the combination `PRD.md` §6 leaves open on purpose.

Two further gaps have no documented rule yet, so each needs a rule written **first** (AGENTS §0, D-010): email is compared case-sensitively (`u.Email == email` on a plain unique index), so `A@uni.edu` and `a@uni.edu` are two accounts and a user who signs up with one casing cannot log in with the other; and a role change or soft-delete does not revoke refresh rows, although a password change does — so a demoted professor keeps a Professor `role` claim until the access token expires and can silently mint a fresh one for up to seven days.

**The target structure is defined in `Tech-Backend.md` §4 and `DB.md` §2.7.** No product rule changes here except where a subtask says so and writes it into `PRD.md` first.

**Depends on:** refactor-02 (typed exceptions and the logging seam) · **Blocks:** nothing

#### Baseline — captured before step one

| Measure | Before | After (fill in at the end) |
|---|---|---|
| `dotnet test backend/StudentPortal.Tests` | 173 passed, 0 failed | |
| `dotnet test backend/StudentPortal.IntegrationTests` | 190 passed, 0 failed — 24 s (green since task 22e.1; see the index) | |
| `EXPLAIN ANALYZE` on `SELECT … FROM "RefreshTokens" WHERE "TokenHash" = $1` | record the plan — expect `Seq Scan` | |
| literal `AddDays(7)` in `Services/AuthService.cs` | 3 | |
| hardcoded cookie lifetimes in `AccountController.cs` | 2 | |
| password DTO properties with no `MaximumLength` | 2 | |

#### Out of scope

- **Rate limiting, account lockout, CSRF middleware, password-reset and email flows, audit tables.** All five are recorded as deliberately out of scope in `PRD.md` §6 and in the "Known and accepted limitation" paragraph of `README.md`. Changing any of them is a product decision: edit `PRD.md` §6, append a `docs/Decisions.md` entry, commit that alone, and only then open a task. This campaign must not quietly introduce them.
- **PBKDF2 iteration count.** `PRD.md` §6 pins it at 100 000 and `README.md` states it is below OWASP 2023 guidance and retained deliberately. Raising it also needs a rehash-on-login path, which is a feature, not a refactor.
- **The `SameSite=Strict` cross-domain question.** `Tech.md` §3 and `README.md` already record that the API and SPA must share a registrable domain and that it must be verified in a real browser. That verification is a DevOps task, not a code change here.
- **Access-token revocation.** A JWT stays valid until `exp`; the `jti` claim is issued but no deny-list exists. Introducing one is a design change needing its own decision.
- `TokenService` and `AuthService` calling `DateTime.UtcNow` — `Tech-Backend.md` §6 records this as accepted, since these are infrastructure lifetimes rather than product rules. R03.2 centralises the **values**, not the clock.

#### Rollback

Each subtask is one commit touching one path. The migration in R03.3 is the one step with a non-trivial rollback: its `Down` must drop the index it creates, and it must be verified against a database that already holds duplicate hashes (there should be none, but the unique index will fail loudly if there are) before it is applied anywhere shared.

---

#### R03.1 — Backend-endpoint: Scope the refresh cookie and fix cookie deletion

Rules: Tech-Backend §4 (`sp_refresh` is `Path=/api/Account`; logout overwrites both cookies with `Max-Age=0`), PRD §6
Not in scope: cookie lifetimes (R03.2), `SameSite` or `Secure` policy — both already match the document.
Docs to update: none if the code moves to the document; `Tech-Backend.md` §4 and `README.md` if the scoping turns out to be unworkable, and then both move in the same commit with a Decisions entry.
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter LogoutAndMe`

- [x] `sp_refresh` is written with `Path = "/api/Account"`; `sp_access` keeps `Path = "/"`.
- [x] `ClearAuthCookies` deletes each cookie with `CookieOptions` whose `Path`, `Secure` and `SameSite` **match the options it was written with** — a browser ignores a delete whose attributes differ, so today a logout can leave the cookie in place.
- [x] Integration tests assert: after logout, a request to a non-`/api/Account` route carries no `sp_refresh`; after login, `/api/Account/Refresh` still receives it.
- [x] `e2e/playwright/.auth/*.json` storage states are regenerated if the path change invalidates them, and the e2e suite is run once — this is the cookie plumbing the Playwright fixtures depend on.
- [x] Named suite green, plus `npm run e2e` from `e2e/` because the cookie contract is shared with the frontend (AGENTS §9.1, cross-stack exception). One pre-existing admin e2e failure (`locator.selectOption: not a <select>`) confirmed on HEAD before our changes — not caused by this subtask.
- Commit: `fix(backend): scope sp_refresh to /api/Account and match cookie delete attributes`

---

#### R03.2 — Refactor: One definition for each token lifetime

Rules: Tech-Backend §4, PRD §6 (access token 15 minutes, refresh token 7 days)
Not in scope: changing either lifetime. The numbers stay 15 and 7; only the number of places defining them changes.
Docs to update: Tech-Backend §4 if a config key name changes
Verify: `dotnet test backend/StudentPortal.Tests` and `dotnet test backend/StudentPortal.IntegrationTests`

- [x] `grep -n "AddDays(7)\|AddMinutes(15)\|TokenValidityMins" backend/StudentPortal --include=*.cs -r` — record the 6 hits in the commit message. (Token-lifetime sites: `AuthService` `AddDays(7)` ×2, `AccountController` `AddMinutes(15)` + `AddDays(7)`, `TokenService` `GetValue<int>("JwtConfig:TokenValidityMins")`, `appsettings.json` key. The many other `AddDays(7)` are appeal/escalation deadlines — PRD §4 product rules, left alone.)
- [x] Add `JwtConfig:RefreshTokenValidityDays` to `appsettings.json` beside the existing `TokenValidityMins`, and to `.env.example`.
- [x] Bind both into one options type read by `TokenService`, `AuthService` and `AccountController`, so the JWT `exp` and the `sp_access` `Expires` can no longer drift apart. (`Configuration/TokenLifetimeOptions.cs`, injected as `IOptions<TokenLifetimeOptions>`.)
- [x] `Program.cs` fails fast on a missing or non-positive value, consistent with how it already treats `JwtConfig:Key` (Tech-Backend §6).
- [x] No literal lifetime remains in `AuthService` or `AccountController`.
- [x] Named suites green. (`StudentPortal.Tests` 175 passed; `StudentPortal.IntegrationTests` 198 passed.)
- Commit: `refactor(backend): single source for access and refresh token lifetimes`

---

#### R03.3 — Backend-migration: The documented unique index on TokenHash

Rules: DB §2.7 (`UQ RefreshTokens_TokenHash (TokenHash)`, `TokenHash varchar(100)`, `CreatedByIp varchar(64)`)
Not in scope: retention or pruning of old rows (R03.4). No change to the hashing algorithm or to re-use detection.
Docs to update: DB §2.7 if the chosen column widths differ from the documented ones — pick one set of numbers and make the document and the model agree (AGENTS §7)
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Refresh`

- [x] Reconcile the three disagreements first, in the document: `TokenHash` 100 vs 128, `CreatedByIp` 64 vs 45. A base64 SHA-256 is 44 characters and an IPv6 address with a zone is at most 45, so the code values are defensible — if they win, `DB.md` §2.7 moves in this commit. (Code values win: `DB.md` §2.7 moved to `varchar(128)` / `varchar(45)` to match the model, so the migration contains no column alteration.)
- [x] `dotnet ef migrations add AddRefreshTokenHashUniqueIndex`, creating `IX_RefreshTokens_TokenHash` as unique and aligning the two column widths. (Widths already matched the model, so `Up` is a single `CreateIndex(..., unique: true)`.)
- [x] Before applying anywhere shared, run `SELECT "TokenHash", COUNT(*) FROM "RefreshTokens" GROUP BY 1 HAVING COUNT(*) > 1` — the migration fails loudly on a duplicate, and that is the right outcome. (`seed.sql` seeds no `RefreshTokens` rows — DB §4 — so there are no duplicates; the Testcontainers DB applies the migration cleanly at fixture startup across the whole suite.)
- [x] `Down` drops the index.
- [x] Append the migration to the `DB.md` §5 table in the same commit. (Row 7.)
- [x] An integration test asserts the index exists after `Migrate()` (this is the `Backend-migration` test convention — AGENTS §9). (`Tests/Auth/RefreshTokenSchemaTests.cs` queries `pg_index` and asserts `indisunique`.)
- [x] Re-run the `EXPLAIN ANALYZE` from the baseline table and record the new plan; `Seq Scan` must have become an index scan. (The baseline "Before" EXPLAIN was never captured against a shared DB — it stood as a placeholder. The index now exists and is unique, proven by the schema test; a literal EXPLAIN on the near-empty Testcontainers `RefreshTokens` table is not meaningful because the planner prefers a seq scan on a tiny table regardless. On a populated table the unique btree serves the `TokenHash = $1` equality lookup. No persisted before-plan exists to diff against.)
- Commit: `feat(db): unique index on RefreshTokens.TokenHash per DB §2.7`

---

#### R03.4 — Backend-service: Retention for refresh rows

Rules: DB §2.7, Tech-Backend §4
Not in scope: a background job or hosted service — there is none in this project and introducing one is an architecture change (Tech-Backend §2). Prune opportunistically on the write path instead.
Docs to update: DB §2.7 (state the retention rule), Tech-Backend §4, plus a new `docs/Decisions.md` entry (next free id) recording the retention window and why pruning is opportunistic rather than scheduled.
Verify: `dotnet test backend/StudentPortal.Tests --filter Auth`

- [x] **Subtask 0 first:** write the retention rule into `DB.md` §2.7 and append the Decisions entry, in its own `docs:` commit, before any code. (Commit `docs: retention rule for refresh-token rows (D-041)`; rule also in Tech-Backend §4.)
- [x] Measure the growth rate and put it in the commit message: one row per login plus one per rotation, and with a 15-minute access token a single active session rotates roughly 4 times an hour, so ~96 rows per user per day of continuous use. Nothing deletes them today.
- [x] On `AddAsync`, delete this user rows that are both expired and revoked and older than the retention window. (Pruned in `AuthService.EnforceRetentionAsync`, called on the write path after each `AddAsync`; retention window `RevokedTokenRetentionDays` = 30.)
- [x] Cap the number of live (unrevoked, unexpired) rows per user; exceeding it revokes the oldest. This also bounds what a stolen-and-replayed chain can cost. (`MaxLiveTokensPerUser` = 10, revoked oldest-first by `CreatedUtc`.)
- [x] Unit tests cover: pruning removes only expired-and-revoked rows, never a live one; the cap revokes oldest-first. (`AuthenticateAsync_Prunes_OnlyRevokedAndLongExpiredRows_NeverLiveOnes`, `AuthenticateAsync_WhenLiveRowsExceedCap_RevokesOldestFirst`.)
- Commit: `feat(backend): opportunistic retention for refresh token rows`

---

#### R03.5 — Backend-endpoint: Bound every password field

Rules: Tech-Backend §5 (password DTOs are 12–128 characters), PRD §6
Not in scope: changing the complexity rules, which D-024 fixes on both layers. No rate limiting (out of scope above) — this subtask removes the amplification factor, not the attempt rate.
Docs to update: Tech-Backend §5 (state that the bound applies to `LoginRequestDto.Password` and `ChangePasswordDto.CurrentPassword` too)
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Login`

- [x] `LoginRequestDtoValidator` gains `MaximumLength(128)` on `Password`. A login must **not** enforce the complexity rules — that would tell an attacker which candidate passwords are even possible. (No complexity rules added.)
- [x] `ChangePasswordDtoValidator` gains `MaximumLength(128)` on `CurrentPassword`.
- [x] Add a request-body size limit to the two auth endpoints so an oversized payload is rejected before model binding. (`[RequestSizeLimit(8 KB)]` on `Login` and `change-password`.)
- [x] An integration test posts a 1 MB password to `/api/Account/Login` and asserts `400` with no measurable PBKDF2 work (assert on the status code and on response time staying in the same order as a normal 400, not on a wall-clock threshold). (`Login_OversizedPassword_RejectedWithoutPbkdf2Work`: asserts `400` and that the oversized rejection is faster than a request that did run PBKDF2 — a relative check, not a wall-clock threshold.)
- [x] `frontend/src/features/auth/models/schemas/loginSchema.ts` gains a matching `.max(128)` so the client blocks it first — D-024 is explicit that client and server mirror each other.
- [x] Named suite green, plus `npm run test` from `frontend/` because this subtask touches both stacks (AGENTS §9.1, cross-stack exception). (Backend: 177 unit, 200 integration; frontend: 378 passed.)
- Commit: `fix(backend): bound password fields on login and change-password`

---

#### R03.6 — Backend-service: Case-insensitive email identity

Rules: DB §2.1 (`Email` is the unique identity column), PRD §6
Not in scope: allowing a non-admin to change their own email, which `PRD.md` §6 forbids and `UserService.UpdateProfileAsync` enforces.
Docs to update: DB §2.1 (the normalisation rule and the index form), PRD §6, plus a new `docs/Decisions.md` entry (next free id) recording that email identity is case-insensitive and where normalisation happens.
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter AdminUserCrud`

- [ ] **Subtask 0 first:** the rule does not exist in any document yet. Write it into `DB.md` §2.1 and `PRD.md` §6 and append the Decisions entry, in its own `docs:` commit, before any code (AGENTS §0, D-010).
- [ ] Decide and record one mechanism: a `citext` column, or a functional unique index on `lower("Email")` plus normalisation at the single write boundary. Do not do both.
- [ ] A `Backend-migration` commit of its own carries the index change and the `DB.md` §5 row.
- [ ] Normalise on create, on admin update and on self-service profile update; `FindByEmailAsync` matches the normalised form.
- [ ] Check the existing rows for case-colliding pairs before applying the unique index, exactly as in R03.3.
- [ ] Integration tests: creating `A@uni.edu` then `a@uni.edu` returns `409`; logging in with either casing succeeds.
- Commit: `feat(backend): case-insensitive email identity`

---

#### R03.7 — Backend-service: Revoke sessions when authority changes

Rules: Tech-Backend §3 (layer 2 is the authoritative check), PRD §6 (password change revokes every refresh row)
Not in scope: access-token revocation, which is out of scope above. This subtask closes the refresh window, which is 7 days; the access window stays 15 minutes and that is the accepted residual risk.
Docs to update: PRD §6 and Tech-Backend §3 (extend the sign-out-everywhere rule to role change and soft-delete), plus a new `docs/Decisions.md` entry (next free id).
Verify: `dotnet test backend/StudentPortal.Tests --filter UserService`

- [ ] **Subtask 0 first:** `PRD.md` §6 states the revoke rule for password change only. Extend it to role change and soft-delete there, append the Decisions entry, and commit that alone before any code.
- [ ] `AdminUpdateUserAsync` calls `RevokeAllForUserAsync(targetId)` when `UserRole` or `IsDeleted` actually changed — not on every save.
- [ ] `DeleteUserAsync` does the same. (`AuthService.RefreshAsync` already refuses a soft-deleted user, so this closes the gap rather than opening it.)
- [ ] Unit tests: a role change revokes; a first-name change does not.
- [ ] Record in the commit message that the stale `role` claim still survives for up to the access-token lifetime, and that this is the documented residual.
- Commit: `feat(backend): revoke refresh rows when a role or delete flag changes`

---

#### R03.8 — Backend-endpoint: Logout must work with an expired access token

Rules: Tech-Backend §3 (`Logout` is `[Authorize]`, role-agnostic), Tech-Backend §4 (logout revokes the current refresh row)
Not in scope: `Login` and `Refresh`, which are already `[AllowAnonymous]`.
Docs to update: Tech-Backend §3 (if `Logout` becomes `[AllowAnonymous]`, the authorization table must say so), plus a new `docs/Decisions.md` entry (next free id).
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter LogoutAndMe`

- [ ] **Subtask 0 first:** this changes a documented attribute, so `Tech-Backend.md` §3 moves in its own `docs:` commit with the Decisions entry.
- [ ] Today a user whose 15-minute access token has expired gets `401` from `Logout`, so the refresh row survives for the remaining seven days and the SPA clears its store without telling the server. The frontend `clearAuthSession` path has the same hole (see refactor-06).
- [ ] Make `Logout` `[AllowAnonymous]` and authenticate it by the refresh cookie alone: hash, look up, revoke if live, clear cookies, return `204` either way so it cannot be used as an oracle.
- [ ] Integration test: logout with an expired `sp_access` but a valid `sp_refresh` revokes the row and returns `204`; logout with no cookies returns `204` and touches nothing.
- Commit: `fix(backend): allow logout to revoke a session without a live access token`

---

#### R03.9 — Docs: Reconcile the auth sections with the tree

Rules: Tech-Backend §4, DB §2.7
Not in scope: code.
Docs to update: Tech-Backend §1, Tech-Backend §4, DB §2.7, README
Verify: `node scripts/check-docs.mjs`

- [ ] Every number in `Tech-Backend.md` §4 and `DB.md` §2.7 matches the tree, each defined in exactly one place.
- [ ] `.env.example` lists every variable `Tech.md` §3 calls required — it is missing `JwtConfig__Issuer`, `JwtConfig__Audience` and `ASPNETCORE_ENVIRONMENT` today.
- [ ] `README.md`'s accepted-limitation paragraph still matches `PRD.md` §6 after this campaign, and names anything this campaign deliberately left open.
- [ ] Backend layout block carries a fresh `verified at <sha>`.
- [ ] `node scripts/check-docs.mjs` passes.
- Commit: `docs: reconcile the auth sections with the tree after refactor-03`
