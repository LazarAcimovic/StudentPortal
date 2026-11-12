# Database Schema

> This document reflects the schema **after** all planned migrations have been applied. Current (pre-migration) schema differences are called out in each table's "Changes" note.

Database engine: **PostgreSQL 15+** (integration tests pin `postgres:17`). Identifiers are quoted PascalCase (EF Core default). Primary keys are `uuid` (GUID). **All timestamps are `timestamp with time zone` (`timestamptz`), values in UTC** (per D-016) — every timestamp column in the EF model snapshot uses this type.

---

## 1. ER overview

```
Users ─┬─< Subjects       (Users.Id = Subjects.ProfessorId, Role must be Professor)
       └─< Enrollments    (Users.Id = Enrollments.StudentId, Role must be Student)
Subjects ──< Enrollments
Enrollments ─1──1─ Grades
Enrollments ─1──0..1─ GradeDrafts
Grades ──< Appeals
Grades ─1──0..1─ Escalations          (one open-or-resolved case per grade)
Escalations ──< EscalationAssignments (assignment history; one active row)
Grades ─0..1── Users                  (Grades.AssignedProfessorId, Role must be Professor)
Users ──< RefreshTokens
```

---

## 2. Tables

### 2.1 `Users`

| Column            | Type             | Null | Default              | Notes                                  |
|-------------------|------------------|------|----------------------|----------------------------------------|
| `Id`              | `uuid`           | NO   |                      | PK                                     |
| `FirstName`       | `varchar(50)`    | NO   |                      |                                        |
| `LastName`        | `varchar(50)`    | NO   |                      |                                        |
| `Email`           | `citext`         | NO   |                      | UQ index; **case-insensitive** (D-042) |
| `UserPassword`    | `varchar(255)`   | NO   |                      | PBKDF2-SHA512 hash (kept column name)  |
| `IndexNumber`     | `varchar(100)`   | YES  |                      | ASCII; only students have one          |
| `IsDeleted`       | `boolean`        | NO   | `false`              | Soft delete                            |
| `UserRole`        | `varchar(50)`    | NO   |                      | `Student` / `Professor` / `Admin`      |
| `CreatedAt`       | `timestamp`      | YES  | `CURRENT_TIMESTAMP`  |                                        |

**Indexes:** `UQ Users_Email (Email)` — case-insensitive, because `Email` is `citext` (D-042).

**Email identity (per D-042).** `Email` is a `citext` column (the `citext` extension is enabled by the model), so the unique index and every lookup compare without regard to case — `A@uni.edu` and `a@uni.edu` are one account. No per-write normalisation is performed; `citext` handles it at the column. `citext` has no length modifier, so the 100-character cap is enforced by the FluentValidation validators rather than the column type.

**Changes:** Password hashing algorithm stays. The column name `UserPassword` is kept for backwards compat with existing seed data; the entity property may be renamed to `PasswordHash` in the C# model with a `[Column("UserPassword")]` attribute.

**Delete behaviour (per D-047).** `DELETE /api/User/{id}` sets `IsDeleted = true` and never removes the row. The `RESTRICT` relationships on `Subjects.ProfessorId` and `Enrollments.StudentId` make a hard delete unsafe as soon as the user owns any linked row; and even when no linked rows exist, hard-deleting destroys the audit trail. Revoking the user's refresh rows happens in the same call (D-043).

---

### 2.2 `Subjects`

| Column        | Type           | Null | Default              | Notes                                      |
|---------------|----------------|------|----------------------|--------------------------------------------|
| `Id`          | `uuid`         | NO   |                      | PK                                         |
| `SubjectName` | `varchar(100)` | NO   |                      |                                            |
| `SubjectCode` | `varchar(50)`  | NO   | `''`                 | Groups the same course across professors   |
| `ECTS`        | `integer`      | NO   | `6`                  |                                            |
| `ProfessorId` | `uuid`         | NO   |                      | FK → `Users.Id`, must be Professor         |
| `IsDeleted`   | `boolean`      | NO   | `false`              |                                            |
| `CreatedAt`   | `timestamptz`  | YES  | `CURRENT_TIMESTAMP`  |                                            |

**Indexes:** `IX Subjects_ProfessorId (ProfessorId)` (FK index), `IX Subjects_SubjectCode (SubjectCode)` (eligible-professor lookup, DB §6.3).

**`SubjectCode` (per D-015).** The column is `varchar(50)` so the migration had headroom to back-fill existing rows with `''`, but **the contract is required, 1–20 characters**, enforced by `SubjectCreateDtoValidator` / `SubjectUpdateDtoValidator` and by the admin form's Zod schema. Two subjects sharing a code mean the same course taught by different professors, which is exactly what makes a professor *eligible* for an escalated case (PRD §4.8). A subject with an empty code can never have an eligible substitute professor.

**Delete behaviour (per D-047).** `DELETE /api/Subject/{id}` sets `IsDeleted = true` and never removes the row. The `RESTRICT` relationship on `Enrollments.SubjectId` makes a hard delete impossible as soon as any enrollment exists; a soft delete preserves both the subject record and the enrollment history.

---

### 2.3 `Enrollments`

| Column       | Type        | Null | Default              | Notes                                 |
|--------------|-------------|------|----------------------|---------------------------------------|
| `Id`         | `uuid`      | NO   |                      | PK                                    |
| `StudentId`  | `uuid`      | NO   |                      | FK → `Users.Id`, must be Student      |
| `SubjectId`  | `uuid`      | NO   |                      | FK → `Subjects.Id`                    |
| `IsDeleted`  | `boolean`   | NO   | `false`              |                                       |
| `EnrolledAt` | `timestamp` | YES  | `CURRENT_TIMESTAMP`  |                                       |

**Indexes:** `UQ Enrollments_StudentId_SubjectId (StudentId, SubjectId)`.

**Changes:** none.

---

### 2.4 `Grades` — **reshaped**

| Column                | Type             | Null | Default              | Notes                                                                 |
|-----------------------|------------------|------|----------------------|-----------------------------------------------------------------------|
| `Id`                  | `uuid`           | NO   |                      | PK                                                                    |
| `EnrollmentId`        | `uuid`           | NO   |                      | **FK + UQ** (1:1 with Enrollment)                                     |
| `Midterm1Points`      | `numeric(4,1)`   | NO   |                      | 0 – 30, step 0.5                                                      |
| `Midterm2Points`      | `numeric(4,1)`   | NO   |                      | 0 – 30, step 0.5                                                      |
| `AttendancePoints`    | `numeric(3,1)`   | NO   |                      | 0 – 5, step 0.5                                                       |
| `PracticalPoints`     | `numeric(3,1)`   | NO   |                      | 0 – 5, step 0.5                                                       |
| `ExamPoints`          | `numeric(4,1)`   | NO   |                      | 0 – 30, step 0.5                                                      |
| `FinalGrade`          | `integer`        | NO   |                      | 5 – 10. Snapshot computed from the 5 fields at confirm time.          |
| `ConfirmedAt`         | `timestamptz`    | NO   |                      | When the professor clicked Confirm (initial or re-confirm after accept).|
| `StudentConfirmedAt`  | `timestamptz`    | YES  | `NULL`               | Set when student clicks Confirm Grade.                                |
| `FinalizedAt`         | `timestamptz`    | YES  | `NULL`               | Set the moment the grade becomes truly final (per PRD §4.7).          |
| `AssignedProfessorId` | `uuid`           | YES  | `NULL`               | FK → `Users.Id`. The **currently** assigned professor on an escalated case (PRD §4.8). |
| `CreatedAt`           | `timestamptz`    | YES  | `CURRENT_TIMESTAMP`  |                                                                       |
| `IsDeleted`           | `boolean`        | NO   | `false`              |                                                                       |

**Constraints:**
- `CK_Grades_FinalGrade_Range` → `FinalGrade BETWEEN 5 AND 10`.
- `CK_Grades_Midterm1_Range` → `Midterm1Points BETWEEN 0 AND 30`.
- `CK_Grades_Midterm2_Range` → `Midterm2Points BETWEEN 0 AND 30`.
- `CK_Grades_Attendance_Range` → `AttendancePoints BETWEEN 0 AND 5`.
- `CK_Grades_Practical_Range` → `PracticalPoints BETWEEN 0 AND 5`.
- `CK_Grades_Exam_Range` → `ExamPoints BETWEEN 0 AND 30`.
- `CK_Grades_Half_Step` → each of the 5 point columns must be a multiple of 0.5 (checked via `col * 2 = FLOOR(col * 2)`).

**Indexes:** `UQ Grades_EnrollmentId (EnrollmentId)`, `IX Grades_AssignedProfessorId (AssignedProfessorId)`.

**`AssignedProfessorId` semantics.** It holds only the *current* assignment so ownership checks need a single value and no join (PRD §4.8, D-017). It is `NULL` on almost every grade, is rewritten on every (re-)assignment, and stays set until the grade is resolved. The full history lives in `EscalationAssignments` (§2.9). FK delete behaviour is `SET NULL`.

---

### 2.5 `GradeDrafts` — **new**

| Column            | Type           | Null | Default              | Notes                                        |
|-------------------|----------------|------|----------------------|----------------------------------------------|
| `Id`              | `uuid`         | NO   |                      | PK                                           |
| `EnrollmentId`    | `uuid`         | NO   |                      | **FK + UQ** (1:0..1 with Enrollment)         |
| `Midterm1Points`  | `numeric(4,1)` | YES  |                      | NULL until the professor fills it            |
| `Midterm2Points`  | `numeric(4,1)` | YES  |                      |                                              |
| `AttendancePoints`| `numeric(3,1)` | YES  |                      |                                              |
| `PracticalPoints` | `numeric(3,1)` | YES  |                      |                                              |
| `ExamPoints`      | `numeric(4,1)` | YES  |                      |                                              |
| `LastEditedAt`    | `timestamp`    | NO   | `CURRENT_TIMESTAMP`  | Updated on every PUT                         |

**Lifecycle:**
- Row inserted the first time the professor clicks Save Draft for an enrollment.
- Row updated on each subsequent Save Draft.
- Row **deleted** at the moment the professor clicks Confirm (grade becomes a row in `Grades`).
- Row deleted at the moment an appeal is accepted, so the re-confirm-exam flow starts from the Grade row (not a stale draft).

**Constraints:** same per-column range + half-step checks as on `Grades`.

---

### 2.6 `Appeals` — **new**

| Column        | Type           | Null | Default | Notes                                                     |
|---------------|----------------|------|---------|-----------------------------------------------------------|
| `Id`          | `uuid`         | NO   |         | PK                                                        |
| `GradeId`     | `uuid`         | NO   |         | FK → `Grades.Id` (NOT unique — 1:N)                       |
| `Text`        | `varchar(1000)`| NO   |         | Appeal body                                               |
| `SubmittedAt` | `timestamptz`  | NO   |         | Set at insert time. Drives the Overdue computation        |
| `Status`      | `varchar(16)`  | NO   | `Pending` | `Pending`, `Accepted`, `Denied` in storage; `Overdue` is computed, never written |
| `ReviewedAt`  | `timestamptz`  | YES  | `NULL`  | Set when prof accepts or denies. Drives Scenario A escalation |

**Business rules enforced in the service layer (not DB):**
- At most one `Pending` appeal per `GradeId` at a time; at most two appeals per grade in total (PRD §4.1, §4.5).
- `Overdue` is **not written** — it is computed at read time as `Status = 'Pending' AND SubmittedAt + 7 days < NOW()`. The row stays with `Status = 'Pending'` in storage but surfaces as `Overdue` through the API.
- **An `Accepted` row never becomes `Overdue`** (per D-018). Only `Pending` rows do. What expires after an accept is the professor's re-grade window, measured from `ReviewedAt`, and that expiry escalates the *grade* (PRD §4.8) without touching the appeal row.
- A grade never finalizes while its **most recent** appeal is effectively `Pending` or `Accepted`. An older superseded appeal — including an overdue one the student has already answered with a newer appeal — does not block finality (per D-007). See §6.2.

**Indexes:** `IX Appeals_GradeId (GradeId)`.

---

### 2.7 `RefreshTokens` — **new**

| Column               | Type           | Null | Default | Notes                                                   |
|----------------------|----------------|------|---------|---------------------------------------------------------|
| `Id`                 | `uuid`         | NO   |         | PK                                                      |
| `UserId`             | `uuid`         | NO   |         | FK → `Users.Id`. Index on this column.                  |
| `TokenHash`          | `varchar(128)` | NO   |         | SHA-256(raw) in base64 or hex. **Never stores the raw.** `UQ` index.|
| `ExpiresUtc`         | `timestamp`    | NO   |         | 7 days after creation                                   |
| `RevokedUtc`         | `timestamp`    | YES  | `NULL`  | Set when rotated out or on logout                       |
| `ReplacedByTokenId`  | `uuid`         | YES  | `NULL`  | Points at the row created to replace this one           |
| `CreatedUtc`         | `timestamp`    | NO   |         |                                                         |
| `CreatedByIp`        | `varchar(45)`  | YES  |         | For auditing (nice-to-have). 45 = longest IPv6 + zone id.|

**Indexes:** `IX RefreshTokens_UserId (UserId)`, `UQ RefreshTokens_TokenHash (TokenHash)`.

**Reuse detection:** on `/Refresh`, if the submitted hash matches a row whose `RevokedUtc IS NOT NULL`, the service invokes `RevokeAllForUserAsync(userId)` and returns 401. (A legitimate client never presents a revoked token; its presentation implies theft.)

**Retention (per D-041).** Rows are pruned opportunistically on the write path (token issuance in `AuthService`), never by a scheduled job — the project has no background service. When a row is issued, for that user: rows that are **both revoked and expired more than 30 days ago** are hard-deleted, and **live** (unrevoked, unexpired) rows beyond **10 per user** are revoked oldest-first. The values are `TokenLifetimeOptions.RevokedTokenRetentionDays` (30) and `TokenLifetimeOptions.MaxLiveTokensPerUser` (10). Nothing deleted these rows before — a single active session rotates ~4×/hour, so the table only grew.

---

### 2.8 `Escalations`

One row per escalated grade — 1:0..1 with `Grades`. The row is the **case**; who has been assigned to it lives in §2.9.

| Column       | Type          | Null | Default | Notes                                                        |
|--------------|---------------|------|---------|--------------------------------------------------------------|
| `Id`         | `uuid`        | NO   |         | PK                                                           |
| `GradeId`    | `uuid`        | NO   |         | FK → `Grades.Id`, **UNIQUE**                                 |
| `Reason`     | `varchar(32)` | NO   |         | `AcceptedUnresolved` \| `ChainExhausted` (stored as a string) |
| `ResolvedAt` | `timestamptz` | YES  | `NULL`  | Stamped when the grade finalizes and the case auto-closes    |

**Indexes:** `UQ Escalations_GradeId (GradeId)`.

**Rules enforced in the service layer:** a grade has at most one escalation record ever; `ResolvedAt` is set only by `CloseIfEscalatedAsync`, called from the two finalization paths (`GradeService.ReconfirmExamAsync` and `AppealService.DenyAsync`). A resolved row is kept for history, never deleted.

---

### 2.9 `EscalationAssignments`

One row per assignment attempt — 1:N with `Escalations`. This is the audit trail: nothing is overwritten.

| Column                | Type          | Null | Default | Notes                                                   |
|-----------------------|---------------|------|---------|---------------------------------------------------------|
| `Id`                  | `uuid`        | NO   |         | PK                                                      |
| `EscalationId`        | `uuid`        | NO   |         | FK → `Escalations.Id`, `CASCADE`                        |
| `AssignedProfessorId` | `uuid`        | NO   |         | FK → `Users.Id`, `RESTRICT`. Must be an eligible professor |
| `AssignedByAdminId`   | `uuid`        | NO   |         | FK → `Users.Id`, `RESTRICT`. Which admin assigned       |
| `AssignedAt`          | `timestamptz` | NO   |         | Start of this assignee's 7-day window                   |
| `SupersededAt`        | `timestamptz` | YES  | `NULL`  | Stamped when a reassignment replaces this row           |

**Indexes:** `IX EscalationAssignments_EscalationId`, `IX EscalationAssignments_AssignedProfessorId`, `IX EscalationAssignments_AssignedByAdminId`.

**The active assignment** is the single row with `SupersededAt IS NULL`. On reassignment the service stamps the old row's `SupersededAt`, inserts a new row, and updates `Grades.AssignedProfessorId` to match — those three writes always happen together.

---

## 3. Relationships summary

- `Subjects.ProfessorId → Users.Id` — `RESTRICT` delete.
- `Enrollments.StudentId → Users.Id` — `RESTRICT` delete.
- `Enrollments.SubjectId → Subjects.Id` — `RESTRICT` delete.
- `Grades.EnrollmentId → Enrollments.Id` — `CASCADE` delete.
- `Grades.AssignedProfessorId → Users.Id` — `SET NULL` delete.
- `GradeDrafts.EnrollmentId → Enrollments.Id` — `CASCADE` delete.
- `Appeals.GradeId → Grades.Id` — `CASCADE` delete.
- `Escalations.GradeId → Grades.Id` — `CASCADE` delete.
- `EscalationAssignments.EscalationId → Escalations.Id` — `CASCADE` delete.
- `EscalationAssignments.AssignedProfessorId → Users.Id` — `RESTRICT` delete.
- `EscalationAssignments.AssignedByAdminId → Users.Id` — `RESTRICT` delete.
- `RefreshTokens.UserId → Users.Id` — `CASCADE` delete.

---

## 4. Seed data (post-migration)

Per PRD §7. The `seed.sql` script runs in a single transaction:

```sql
BEGIN;

-- children first
DELETE FROM "EscalationAssignments";
DELETE FROM "Escalations";
DELETE FROM "Appeals";
DELETE FROM "GradeDrafts";
DELETE FROM "Grades";
DELETE FROM "RefreshTokens";
DELETE FROM "Enrollments";
DELETE FROM "Subjects";
DELETE FROM "Users";

-- Users (1 admin + 4 professors + 10 students) ...
-- Subjects (~15, all ECTS=6, every row with a SubjectCode;
--           shared codes: MATH-CALC on Mathematics I (Smith) + Discrete Mathematics (Wilson),
--                         CS-DS on Data Structures (Johnson) + Algorithms (Wilson)) ...
-- Enrollments (~30) ...
-- Grades (~20 across every state) ...
-- GradeDrafts (~3) ...
-- Appeals (~9) ...
-- Escalations / EscalationAssignments: none seeded (see below)

COMMIT;
```

**No time-sensitive row is seeded (per D-022).** `seed.sql` replays before every integration test, so a backdated `SubmittedAt` or `ReviewedAt` would inject an overdue or escalated case into every test in the suite. Overdue appeals, escalation Scenarios A and B, and the 24-hour undo window are created per test by the backdating helpers on `IntegrationTestBase` (`Tech-Backend.md` §7); for manual (in-browser) testing, the dev-only companion script `Migrations/seed-dev-escalations.sql` layers those escalated states on top of `seed.sql` and is never loaded by the integration-test fixture. The appeals the seed does create are freshly submitted or already reviewed, never mid-deadline.

**Dev-only volume fixtures.** `seed.sql` keeps small, fixed counts — **17 users (2 admins, 4 professors, 11 students, of which 10 are active) and 15 subjects** — because integration tests assert them exactly (`AdminUserSearchTests` expects 10 active students, `AdminSubjectSearchTests` 15 subjects, `AdminPaginationTests` stable totals). Volume belongs in a companion, never here. There are three companions, all applied manually with `psql`, all re-runnable, and **none of them ever loaded by the integration-test fixture**, which resolves `seed.sql` by exact path:

| Companion | Adds | For |
|---|---|---|
| `Migrations/seed-dev-escalations.sql` | 5 demo students plus backdated escalated states | seeing Scenarios A and B in a browser (§4, D-022) |
| `Migrations/seed-dev-pagination.sql` | 20 extra students, 10 of them in Calculus | professor students list spanning pages; enrollment combobox needing a second fetch (D-031, D-034) |
| `Migrations/seed-dev-volume.sql` | 100 000 extra students (`b0000000-…`, `BLK-0000001`…) | `EXPLAIN ANALYZE` on the admin Users list and user search before deciding whether the `pg_trgm`/GIN index of §6.5 is justified (D-034). Users-table paths only — these students have no enrollments, so no dashboard, aggregate or escalation query is exercised |

**Why `seed-dev-volume.sql` exists as a separate file.** Its rows were in `seed.sql` for a time, which is precisely the failure this paragraph warns about: `seed.sql` replays before **every** test, so the 100 000-row insert ran 190 times per suite (3 m 12 s instead of seconds) and `AdminUserSearchTests.Search_RoleStudent_ReturnsOnlyStudents` and `Search_EmptyQuery_ReturnsPaginatedAll` both failed with `TotalCount = 100010` against an expected 10. Adding volume rows to `seed.sql` is not a trade-off to weigh — it breaks the suite.

Fixed GUID prefixes (as in the pre-reset seed) keep FKs predictable:

| Prefix | Table |
|---|---|
| `10000000-...` | Users |
| `20000000-...` | Subjects |
| `30000000-...` | Enrollments |
| `40000000-...` | Grades |
| `50000000-...` | GradeDrafts |
| `60000000-...` | Appeals |
| `70000000-...` | RefreshTokens (none seeded — tokens are issued at runtime) |
| `80000000-...` | Escalations (none seeded — see the note above) |
| `90000000-...` | EscalationAssignments (none seeded) |

All seeded users share the plaintext password `Password123!` (PBKDF2 hashed in the SQL literal).

---

## 5. Migrations, in applied order

Migration names are the stable identifiers — not task numbers, which change as tasks are archived.

| # | Migration | What it does |
|---|---|---|
| 1 | `InitialCreate` | `Users`, `Subjects`, `Enrollments`, original `Grades`. |
| 2 | `AddRefreshToken` | `RefreshTokens` table (§2.7). |
| 3 | `GradeRedesign` | Drops old Grade columns, adds the 5 point columns + `FinalGrade` + the three timestamps, adds `GradeDrafts` and `Appeals`, flips Grade → Enrollment to 1:0..1. Destructive; `seed.sql` repopulates. |
| 4 | `SubjectEctsDefault` | Adds `DEFAULT 6` to `Subjects.ECTS` and back-fills. |
| 5 | `AddSubjectCode` | Adds `Subjects.SubjectCode varchar(50) NOT NULL DEFAULT ''` (§2.2). |
| 6 | `AddEscalationWorkflow` | Adds `Grades.AssignedProfessorId`, creates `Escalations` (§2.8) and `EscalationAssignments` (§2.9) with their indexes and FKs. |
| 7 | `AddRefreshTokenHashUniqueIndex` | Unique index `IX_RefreshTokens_TokenHash` on `RefreshTokens.TokenHash` (§2.7). |
| 8 | `CaseInsensitiveEmail` | Enables the `citext` extension and converts `Users.Email` to `citext`, making the unique index and all lookups case-insensitive (§2.1, D-042). |
| 9 | `AddSubjectCodeIndex` | Non-unique btree index `IX_Subjects_SubjectCode` on `Subjects.SubjectCode` (§2.2) for the eligible-professor lookup (§6.3). |

Each migration is one commit. The agent generates it with `dotnet ef migrations add <Name>` and commits the files; the human runs `dotnet ef database update`. Append new rows to the end of this table in the same commit as the migration.

---

## 6. Query cheat-sheet (what the dashboard endpoints run)

### 6.1 Student dashboard

```sql
-- current student's subjects with grade + appeal status
SELECT
  s."Id"             AS subject_id,
  s."SubjectName",
  s."ECTS",
  u."FirstName" || ' ' || u."LastName" AS professor_name,
  g."FinalGrade",
  g."ConfirmedAt",
  g."StudentConfirmedAt",
  g."FinalizedAt",
  (
    SELECT a."Status"
    FROM "Appeals" a
    WHERE a."GradeId" = g."Id"
    ORDER BY a."SubmittedAt" DESC
    LIMIT 1
  ) AS latest_appeal_status
FROM "Enrollments" e
JOIN "Subjects" s ON s."Id" = e."SubjectId"
JOIN "Users" u    ON u."Id" = s."ProfessorId"
LEFT JOIN "Grades" g ON g."EnrollmentId" = e."Id"
WHERE e."StudentId" = @studentId AND e."IsDeleted" = false;
```

The service then computes `canWriteAppeal`, `canConfirmGrade`, `status`, `appealStatus` and `isEscalated` labels per PRD §4.1, §4.6 and §4.8. The escalation branches are evaluated **before** the generic accepted-appeal and overdue branches, otherwise an escalated grade would be labelled "Appeal pending" instead of "Under admin review".

### 6.3 Escalated cases (admin Escalations tab)

The case list is derived, not stored. The repository loads only **candidate grades** — grades where `FinalizedAt IS NULL` and at least one escalation trigger condition is met, **or** grades that already have an `Escalations` row (including resolved ones, kept for history). Loading every grade and filtering in memory is not permitted (per D-032). For each candidate grade the service checks:

- **Scenario A** — any appeal with `Status = 'Accepted'` and `ReviewedAt + INTERVAL '7 days' < NOW()`.
- **Scenario B** — two or more appeals with `Status = 'Pending'` and `SubmittedAt + INTERVAL '7 days' < NOW()`.

A matching grade with no `Escalations` row is `NeedsAssignment`. With a row and `ResolvedAt IS NULL`, the active assignment (`SupersededAt IS NULL`) decides: `AssignedAt + INTERVAL '7 days' >= NOW()` → `Assigned`, otherwise `NeedsReassignment`. With `ResolvedAt` set → `Resolved`.

A partial index on `Grades` (`WHERE "FinalizedAt" IS NULL`) may reduce the candidate scan as data grows. Do not add it speculatively; add it only after `EXPLAIN ANALYZE` on production-sized data confirms it is needed.

**Non-sargable date predicates.** Scenarios A and B evaluate `a.ReviewedAt.Value.AddDays(7) < now` and `a.SubmittedAt.AddDays(7) < now` — the interval is added to the **column** side, so the predicate is non-sargable: a btree index on `ReviewedAt` or `SubmittedAt` cannot help it. To make them sargable, compare the column to a precomputed threshold (`column < now.AddDays(-7)` → `"ReviewedAt" < @threshold`). Do not rewrite without `EXPLAIN ANALYZE` on production-sized data; on seed-sized data the seq scan is undetectable.

Eligible professors for a case:

```sql
SELECT DISTINCT u.*
FROM "Users" u
JOIN "Subjects" s ON s."ProfessorId" = u."Id"
WHERE u."UserRole" = 'Professor'
  AND u."IsDeleted" = false
  AND s."SubjectCode" = @subjectCode
  AND u."Id" <> @originalProfessorId;
```

### 6.2 Earned ECTS

Gated by the **single most recent** appeal on the grade, never by any appeal (per D-007), and by the absence of an open escalation (per D-021).

```sql
SELECT COALESCE(SUM(s."ECTS"), 0) AS earned_ects
FROM "Enrollments" e
JOIN "Subjects" s ON s."Id" = e."SubjectId"
JOIN "Grades"   g ON g."EnrollmentId" = e."Id"
LEFT JOIN LATERAL (                        -- the latest appeal, whatever its status
  SELECT a."Status"
  FROM "Appeals" a
  WHERE a."GradeId" = g."Id"
  ORDER BY a."SubmittedAt" DESC
  LIMIT 1
) latest ON TRUE
WHERE e."StudentId" = @studentId
  AND e."IsDeleted" = false
  AND g."FinalGrade" >= 6
  -- (1) the grade is truly final by one of the PRD §4.7 routes
  AND (
       g."FinalizedAt" IS NOT NULL                      -- deny, or accept + re-confirm
    OR g."StudentConfirmedAt" IS NOT NULL               -- student confirmed
    OR (latest."Status" IS NULL                         -- no appeal was ever submitted,
        AND g."ConfirmedAt" + INTERVAL '7 days' < NOW())--   so day-8 silence finalizes it
  )
  -- (2) the latest appeal is not holding it open ('Pending' also covers Overdue)
  AND (latest."Status" IS NULL OR latest."Status" <> 'Pending')
  -- (3) no escalation is still open
  AND NOT EXISTS (
        SELECT 1 FROM "Escalations" esc
        WHERE esc."GradeId" = g."Id" AND esc."ResolvedAt" IS NULL
      );
```

Why each clause earns its place:

| Case | Outcome | Which clause decides |
|---|---|---|
| Appeal #1 overdue, student submitted #2, professor denied #2 | **counts** | latest is `Denied`, `FinalizedAt` set. The stale `Pending` row for #1 is ignored |
| Appeal accepted, exam not yet re-confirmed | does not count | `FinalizedAt` and `StudentConfirmedAt` both NULL → clause (1) fails |
| Appeal accepted and re-confirmed | counts | `FinalizedAt` set by the re-confirm |
| Denied, then undone inside 24 h | does not count | the undo clears `FinalizedAt` and returns the row to `Pending` → clauses (1) and (2) both fail |
| Single overdue appeal, student silent | does not count | latest is `Pending` → clause (2) fails |
| Never appealed, 8 days of silence | counts | clause (1)'s third branch |
| Escalated, not yet resolved | does not count | clause (3) |

### 6.4 Professor students (paged, per D-031)

Used by `GET /professor/subjects/{subjectId}/students?page=N&pageSize=N`. Two queries: one for the page of rows, one for the total count.

```sql
-- page of students enrolled in the selected subject
SELECT u."Id", u."FirstName", u."LastName"
FROM "Enrollments" e
JOIN "Users" u ON u."Id" = e."StudentId"
WHERE e."SubjectId" = @subjectId
  AND e."IsDeleted" = false
ORDER BY u."LastName", u."FirstName"
LIMIT @pageSize OFFSET (@page - 1) * @pageSize;

-- total count for the Pagination control
SELECT COUNT(*)
FROM "Enrollments" e
WHERE e."SubjectId" = @subjectId
  AND e."IsDeleted" = false;
```

The endpoint is gated `[Authorize(Roles = "Professor")]` on `ProfessorController`. The service verifies that `Subject.ProfessorId == callerProfId` before returning rows (ownership check, per Tech-Backend §3).

### 6.5 User search and subject search (admin comboboxes, per D-034)

`ILIKE` substring matching executed in SQL. **Do not filter in memory.** No index is added speculatively; add `pg_trgm` / GIN only if `EXPLAIN ANALYZE` on production-sized data justifies it. Omit the `ILIKE` predicate when `@query` is empty (return all rows matching the role / delete filter, paged).

**Pattern escaping (R05.5).** `EF.Functions.ILike` sends the pattern as a bound parameter — there is no SQL injection risk. However, `%` and `_` in the caller-supplied `query` would reach Postgres as wildcards (LIKE-pattern injection). Before interpolating, the repository escapes `\` → `\\`, `%` → `\%`, `_` → `\_` and passes `\` as the escape character: `ILIKE '%' || @escaped || '%' ESCAPE '\'`. Query length is also capped at **100 characters** in the repository before escaping.

```sql
-- GET /api/users/search?role=Professor
SELECT "Id", "FirstName", "LastName"
FROM "Users"
WHERE "UserRole" = 'Professor'
  AND "IsDeleted" = false
  AND (  "FirstName" ILIKE '%' || @query || '%'
       OR "LastName"  ILIKE '%' || @query || '%')
ORDER BY "Id"
LIMIT @pageSize OFFSET (@page - 1) * @pageSize;

-- GET /api/users/search?role=Student
SELECT "Id", "FirstName", "LastName", "IndexNumber"
FROM "Users"
WHERE "UserRole" = 'Student'
  AND "IsDeleted" = false
  AND (  "IndexNumber" ILIKE '%' || @query || '%'
       OR "FirstName"  ILIKE '%' || @query || '%'
       OR "LastName"   ILIKE '%' || @query || '%')
ORDER BY "Id"
LIMIT @pageSize OFFSET (@page - 1) * @pageSize;

-- GET /api/subjects/search
SELECT "Id", "SubjectName", "SubjectCode"
FROM "Subjects"
WHERE "IsDeleted" = false
  AND (  "SubjectName" ILIKE '%' || @query || '%'
       OR "SubjectCode" ILIKE '%' || @query || '%')
ORDER BY "Id"
LIMIT @pageSize OFFSET (@page - 1) * @pageSize;
```

A matching `COUNT(*)` query (same `WHERE`, no `LIMIT`/`OFFSET`) runs alongside each to populate `totalCount` in the response envelope.
