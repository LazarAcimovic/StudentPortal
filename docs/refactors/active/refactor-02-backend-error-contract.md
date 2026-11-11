### Refactor 02 — Backend error contract and observability

#### Overview

`Tech-Backend.md` §6 specifies one `UseExceptionHandler` middleware returning `ProblemDetails { title, traceId }`, four typed business exceptions mapped to 404 / 403 / 400 / 409, exceptions logged with the traceId, and — verbatim — "No per-controller `catch (Exception ex) { return StatusCode(500, ex.Message) }`". The tree currently holds:

| Measure | Count |
|---|---|
| `catch (Exception ex)` blocks in `Controllers/` | 14 |
| `return StatusCode(500, $"Internal server error: {ex.Message}")` | 14 |
| `UseExceptionHandler` registrations in `Program.cs` | 0 |
| `AddProblemDetails` registrations | 0 |
| `ILogger` injections anywhere in `backend/StudentPortal/` | 0 |
| typed business exceptions in `Exceptions/` | 2 of the 4 the document names |
| duplicated `User.FindFirstValue(ClaimTypes.NameIdentifier)` + `Guid.TryParse` + `Unauthorized()` blocks | 21, across 8 controllers |

Those 14 echoes are the largest information-disclosure surface in the project: a `DbUpdateException` from the `UQ Users_Email` index, a connection failure, or an EF `InvalidOperationException` returns its raw `.Message` to the browser, naming tables, columns, constraints and sometimes the host. They also mask real status codes — a duplicate email on an update path surfaces as `500` where `PRD.md` §6 promises `409`, "never a generic 500".

**The target structure is defined in `Tech-Backend.md` §6.** This file is only the plan for getting there. Two subtasks here do change the HTTP surface (the body and status code of a failure), so they carry `Backend-endpoint` rather than `Refactor` and are gated accordingly — see `AGENTS.md` §9.1. Nothing in this campaign changes a product rule; it makes the code match a rule the document already states.

**Depends on:** nothing · **Blocks:** refactor-03, refactor-04 (both throw the typed exceptions this campaign introduces)

#### Baseline — captured before step one

| Measure | Before | After (fill in at the end) |
|---|---|---|
| `dotnet test backend/StudentPortal.Tests` | 173 passed, 0 failed | 175 passed, 0 failed |
| `dotnet test backend/StudentPortal.IntegrationTests` | 190 passed, 0 failed — 24 s (green since task 22e.1; see the index) | 198 passed, 0 failed |
| `catch (Exception ex)` in `Controllers/` | 14 | 0 |
| `StatusCode(500, …ex.Message)` | 14 | 0 |
| `ILogger` injections | 0 | 3 (`AuthService`, `UserService`, `GlobalExceptionHandler`) |
| duplicated claim-extraction blocks | 21 | 0 (one shared `ControllerBase.CallerId()`) |

#### Out of scope

- **Rate limiting and account lockout.** `PRD.md` §6 and `README.md` list both as explicitly out of scope, and `README.md` records it as a known accepted limitation. Adding either means editing `PRD.md` §6 and appending a `docs/Decisions.md` entry **first**, in its own `docs:` commit (AGENTS §0, D-010) — not smuggling it in behind an error-handling campaign.
- **CSRF middleware.** Same reason: `PRD.md` §6 states the reliance on `SameSite=Strict` as a decision, not an oversight.
- **Which status code a given business rule deserves.** Where `PRD.md` or `Tech-Backend.md` already names one, use it. Where neither does, keep the current behaviour and open a box; do not invent a mapping.
- `AuthService` and `TokenService` calling `DateTime.UtcNow` — `Tech-Backend.md` §6 records both as known, accepted deviations. Left alone deliberately.

#### Rollback

Each subtask is one commit touching one path. If a step breaks a suite and the cause is not obvious within a few minutes, `git revert` that commit and record what failed in the subtask box rather than pressing on.

---

#### R02.1 — Refactor: Complete the typed exception set

Rules: Tech-Backend §6 (the four exceptions the middleware maps)
Not in scope: the middleware itself (R02.2), any controller edit (R02.3), any new status code.
Docs to update: none — `Tech-Backend.md` §6 already names the four types.
Verify: `dotnet test backend/StudentPortal.Tests` and `dotnet test backend/StudentPortal.IntegrationTests`

- [x] `grep -rln "Exceptions" backend/StudentPortal --include=*.cs` and record the current hit count in the commit message.
- [x] Add `NotFoundException`, `ValidationException` and `ConflictException` beside the existing `ForbiddenAccessException`, each with a single `string message` constructor, in `backend/StudentPortal/Exceptions/`.
- [x] Make `EmailAlreadyExistsException` derive from `ConflictException`, so the existing `catch (EmailAlreadyExistsException)` in `UserController` keeps compiling and keeps returning `409` unchanged.
- [x] No call-site changes. Nothing throws the new types yet; this commit is additive only.
- [x] Named suites green.
- Commit: `refactor(backend): add the three missing typed business exceptions`

---

#### R02.2 — Backend-endpoint: Mount the ProblemDetails exception handler

Rules: Tech-Backend §6 (one `UseExceptionHandler`, `ProblemDetails { title, traceId }`, exceptions logged with the traceId)
Not in scope: removing the per-controller catch blocks (R02.3) — while they exist they still win, so this commit changes nothing the controllers already handle. No logging of auth events (R02.4).
Docs to update: Tech-Backend §6 only if the implemented shape differs from the documented one in any detail — and then the document is what moves, in the same commit.
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Smoke`

- [x] `builder.Services.AddProblemDetails()` and `app.UseExceptionHandler()` in `Program.cs`, registered before `UseAuthentication`.
- [x] Map `NotFoundException` to 404, `ForbiddenAccessException` to 403, `ValidationException` to 400, `ConflictException` to 409, everything else to 500.
- [x] A 500 body carries `title: "An error occurred."` and `traceId`, and **never** `ex.Message`, `ex.StackTrace` or an inner exception.
- [x] The handler logs the exception at `Error` level with the same `traceId` it returns.
- [x] A new integration test asserts an unhandled exception returns 500 with no exception text in the body. This subtask is `Backend-endpoint`, not `Refactor`, so it writes that test Red first (AGENTS §9).
- [x] Development still shows the developer exception page, so local debugging is unchanged.
- Commit: `feat(backend): ProblemDetails exception handler per Tech-Backend §6`

---

#### R02.3 — Backend-endpoint: Delete the 14 catch-and-leak blocks

Rules: Tech-Backend §6, PRD §6 (a duplicate email is `409`, never a generic 500)
Not in scope: adding a status code no document names. Where the current behaviour is undefined by PRD and Tech, keep it and open a box.
Docs to update: Tech-Backend §6 (trim the deviations note if this campaign empties it)
Verify: `dotnet test backend/StudentPortal.IntegrationTests --filter Auth`

- [x] `grep -c "StatusCode(500" backend/StudentPortal/Controllers/*.cs` before and after; the after must be 0, recorded in the commit message.
- [x] One commit per controller, in this order: `UserController` (4), `SubjectController` (5), `EnrollmentController` (3), `AccountController` (2) — so a regression is one revert, not a bisect.
- [x] Each removed block either disappears entirely (the middleware handles it) or becomes a typed throw in the **service**, never a new catch in the controller.
- [x] `SubjectController.UpdateSubject` is the one action with no generic catch today; leave its typed `InvalidOperationException` handling intact so the diff stays about removal.
- [x] Integration tests assert that the former 500 paths return the documented code, and that no response body contains the substring `Internal server error`.
- [x] Named suite green after each controller.
- Commit: `fix(backend): stop returning exception messages from <Controller>`

---

#### R02.4 — Backend-service: Structured logging for authentication events

Rules: Tech-Backend §6 (exceptions logged with the traceId)
Not in scope: an audit **table** — `PRD.md` §6 and `README.md` list audit tables as out of scope. This subtask writes to `ILogger` only. Logging a password, a raw token, a token hash or a full email address is forbidden; log the user id and an outcome.
Docs to update: Tech-Backend §6 (add the event list), plus a new `docs/Decisions.md` entry (next free id) recording that auth events are logged while audit tables stay out of scope.
Verify: `dotnet test backend/StudentPortal.Tests --filter Auth`

- [x] **Subtask 0 first:** write the event list into `Tech-Backend.md` §6 and append the Decisions entry, in its own `docs:` commit, before any code (AGENTS §0, D-010).
- [x] Inject `ILogger<T>` into `AuthService` and `UserService`.
- [x] Log at `Warning`: a failed login (carrying the user id when one resolved, never the submitted address), a refresh presented with an unknown hash, and refresh re-use detection — which already revokes the whole chain and today does so silently.
- [x] Log at `Information`: successful login, logout, password change, and the two admin mutations that move authority — role change and soft-delete.
- [x] Unit tests assert the re-use path logs at `Warning`, and that no log call receives a raw password or raw token.
- Commit: `feat(backend): log authentication and authority-change events`

---

#### R02.5 — Refactor: One caller-id accessor instead of 21 copies

Rules: Tech-Backend §3 (layer 2 reads `currentUserId` from the `ClaimTypes.NameIdentifier` claim), Tech-Backend §2
Not in scope: any change to what happens when the claim is missing — it stays `401` with the same empty body. No controller gains or loses an endpoint.
Docs to update: Tech-Backend §1 layout block, if a new file lands under `Handlers/`
Verify: `dotnet test backend/StudentPortal.Tests` and `dotnet test backend/StudentPortal.IntegrationTests`

- [x] `grep -c "FindFirstValue(ClaimTypes.NameIdentifier)" backend/StudentPortal/Controllers/*.cs` — record the 21 hits and the per-file split in the commit message. (Actual: 22 blocks across 8 controllers — Account 4, Appeal 6, Escalation 2, Grade 4, GradeDraft 2, Professor 2, Student 1, User 1.)
- [x] Add one `ControllerBase` extension under `Handlers/` (`TryGetCallerId(out Guid)` or `CallerId()` returning `Guid?`). (`Handlers/ControllerCallerExtensions.cs`, `CallerId()` → `Guid?`.)
- [x] Replace all 21 blocks. Behaviour identical. (Call sites use `if (this.CallerId() is not { } callerId) return Unauthorized();`; `Logout` keeps its `Guid.Empty` fallback.)
- [x] `AccountController.Logout` stops resolving `ITokenService` and `IRefreshTokenRepository` through `HttpContext.RequestServices` and takes both as constructor dependencies like every other controller (Tech-Backend §2). (Already resolved: `Logout` delegates to the constructor-injected `IAuthService.LogoutAsync`; no `RequestServices` lookup exists anywhere in the tree.)
- [x] No reference to the old inline pattern remains.
- [x] Named suites green. (`StudentPortal.Tests` 175 passed; `StudentPortal.IntegrationTests` 198 passed.)
- Commit: `refactor(backend): single caller-id accessor and constructor-injected logout deps`

---

#### R02.6 — Docs: Refresh the backend layout block

Rules: Tech-Backend §1 (layout blocks are verified, not remembered — AGENTS §7)
Not in scope: code.
Docs to update: Tech-Backend §1, Tech-Backend §6
Verify: `node scripts/check-docs.mjs`

- [x] Layout block regenerated from a real directory listing of `backend/`.
- [x] `Exceptions/` appears in the block — `Tech-Backend.md` §1 does not list it today, although the folder exists.
- [x] `TestSupport/` appears in the block for the same reason.
- [x] The "No per-controller `catch (Exception ex)`" line in §6 now describes the tree rather than contradicting it, and the "two known deviations" paragraph is trimmed to whatever is still true. (Verified: zero `catch (Exception`/`StatusCode(500` in `Controllers/` after R02.3, so the §6 rule now matches; both deviations — `EscalationService` threading `DateTime now`, `AuthService`/`TokenService` on `DateTime.UtcNow` — are still true in the tree, so the paragraph stands unchanged.)
- [x] `node scripts/check-docs.mjs` passes.
- Commit: `docs(tech): refresh the backend layout block after the error-contract campaign`
