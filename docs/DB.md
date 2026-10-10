# Database Schema

> This document reflects the schema **after** all planned migrations have been applied. Current (pre-migration) schema differences are called out in each table's "Changes" note.

Database engine: **PostgreSQL 15+**. Identifiers are quoted PascalCase (EF Core default). Primary keys are `uuid` (GUID). All timestamps are `timestamp without time zone`, stored UTC.

---

## 1. ER overview

```
Users ─┬─< Subjects       (Users.Id = Subjects.ProfessorId, Role must be Professor)
       └─< Enrollments    (Users.Id = Enrollments.StudentId, Role must be Student)
Subjects ──< Enrollments
Enrollments ─1──1─ Grades
Enrollments ─1──0..1─ GradeDrafts
Grades ──< Appeals
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
| `Email`           | `varchar(100)`   | NO   |                      | UQ index                               |
| `UserPassword`    | `varchar(255)`   | NO   |                      | PBKDF2-SHA512 hash (kept column name)  |
| `IndexNumber`     | `varchar(100)`   | YES  |                      | ASCII; only students have one          |
| `IsDeleted`       | `boolean`        | NO   | `false`              | Soft delete                            |
| `UserRole`        | `varchar(50)`    | NO   |                      | `Student` / `Professor` / `Admin`      |
| `CreatedAt`       | `timestamp`      | YES  | `CURRENT_TIMESTAMP`  |                                        |

**Indexes:** `UQ Users_Email (Email)`.

**Changes:** no schema change in this round. Password hashing algorithm stays. The column name `UserPassword` is kept for backwards compat with existing seed data; the entity property may be renamed to `PasswordHash` in the C# model with a `[Column("UserPassword")]` attribute.

---

### 2.2 `Subjects`

| Column        | Type           | Null | Default              | Notes                              |
|---------------|----------------|------|----------------------|------------------------------------|
| `Id`          | `uuid`         | NO   |                      | PK                                 |
| `SubjectName` | `varchar(100)` | NO   |                      |                                    |
| `ECTS`        | `integer`      | NO   | `6`                  | **Default added** (was no default) |
| `ProfessorId` | `uuid`         | NO   |                      | FK → `Users.Id`, must be Professor |
| `IsDeleted`   | `boolean`      | NO   | `false`              |                                    |
| `CreatedAt`   | `timestamp`    | YES  | `CURRENT_TIMESTAMP`  |                                    |

**Indexes:** `IX Subjects_ProfessorId (ProfessorId)` (FK index).

**Changes:** add `DEFAULT 6` to `ECTS`. Rows without a value get back-filled to 6 by the migration.

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
| `ConfirmedAt`         | `timestamp`      | NO   |                      | When the professor clicked Confirm (initial or re-confirm after accept).|
| `StudentConfirmedAt`  | `timestamp`      | YES  | `NULL`               | Set when student clicks Confirm Grade.                                |
| `FinalizedAt`         | `timestamp`      | YES  | `NULL`               | Set the moment the grade becomes truly final (per PRD §4.7).          |
| `CreatedAt`           | `timestamp`      | YES  | `CURRENT_TIMESTAMP`  |                                                                       |
| `IsDeleted`           | `boolean`        | NO   | `false`              |                                                                       |

**Constraints:**
- `CK_Grades_FinalGrade_Range` → `FinalGrade BETWEEN 5 AND 10`.
- `CK_Grades_Midterm1_Range` → `Midterm1Points BETWEEN 0 AND 30`.
- `CK_Grades_Midterm2_Range` → `Midterm2Points BETWEEN 0 AND 30`.
- `CK_Grades_Attendance_Range` → `AttendancePoints BETWEEN 0 AND 5`.
- `CK_Grades_Practical_Range` → `PracticalPoints BETWEEN 0 AND 5`.
- `CK_Grades_Exam_Range` → `ExamPoints BETWEEN 0 AND 30`.
- `CK_Grades_Half_Step` → each of the 5 point columns must be a multiple of 0.5 (checked via `col * 2 = FLOOR(col * 2)`).

**Changes from current schema:**
- Dropped columns: `Grade` (int, aka `StudentGrade` in the entity), `Comment`, `IsConfirmed`.
- Added columns: the 5 point columns, `FinalGrade`, `ConfirmedAt`, `StudentConfirmedAt`, `FinalizedAt`.
- Relationship: `Enrollment → Grade` becomes 1:0..1 (was 1:N). The old `CK_Grades_Grade_Range` is replaced.
- Existing rows are dropped by the migration (schema change is destructive). `seed.sql` repopulates.

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
| `SubmittedAt` | `timestamp`    | NO   |         | Set at insert time                                        |
| `Status`      | `varchar(16)`  | NO   | `Pending` | `Pending`, `Accepted`, `Denied`, `Overdue`              |
| `ReviewedAt`  | `timestamp`    | YES  | `NULL`  | Set when prof accepts or denies (NULL for Pending / Overdue) |

**Business rules enforced in the service layer (not DB):**
- At most one `Pending` appeal per `GradeId` at a time.
- `Overdue` is **not written** — it is computed at read time as `Status = 'Pending' AND SubmittedAt + 7 days < NOW()`. The row stays with `Status = 'Pending'` in storage but surfaces as `Overdue` through the API.
- Grade never finalizes while an effective-`Pending` appeal exists.

**Indexes:** `IX Appeals_GradeId (GradeId)`.

---

### 2.7 `RefreshTokens` — **new**

| Column               | Type           | Null | Default | Notes                                                   |
|----------------------|----------------|------|---------|---------------------------------------------------------|
| `Id`                 | `uuid`         | NO   |         | PK                                                      |
| `UserId`             | `uuid`         | NO   |         | FK → `Users.Id`. Index on this column.                  |
| `TokenHash`          | `varchar(100)` | NO   |         | SHA-256(raw) in base64 or hex. **Never stores the raw.**|
| `ExpiresUtc`         | `timestamp`    | NO   |         | 7 days after creation                                   |
| `RevokedUtc`         | `timestamp`    | YES  | `NULL`  | Set when rotated out or on logout                       |
| `ReplacedByTokenId`  | `uuid`         | YES  | `NULL`  | Points at the row created to replace this one           |
| `CreatedUtc`         | `timestamp`    | NO   |         |                                                         |
| `CreatedByIp`        | `varchar(64)`  | YES  |         | For auditing (nice-to-have)                             |

**Indexes:** `IX RefreshTokens_UserId (UserId)`, `UQ RefreshTokens_TokenHash (TokenHash)`.

**Reuse detection:** on `/Refresh`, if the submitted hash matches a row whose `RevokedUtc IS NOT NULL`, the service invokes `RevokeAllForUserAsync(userId)` and returns 401. (A legitimate client never presents a revoked token; its presentation implies theft.)

---

## 3. Relationships summary

- `Subjects.ProfessorId → Users.Id` — `RESTRICT` delete.
- `Enrollments.StudentId → Users.Id` — `RESTRICT` delete.
- `Enrollments.SubjectId → Subjects.Id` — `RESTRICT` delete.
- `Grades.EnrollmentId → Enrollments.Id` — `CASCADE` delete.
- `GradeDrafts.EnrollmentId → Enrollments.Id` — `CASCADE` delete.
- `Appeals.GradeId → Grades.Id` — `CASCADE` delete.
- `RefreshTokens.UserId → Users.Id` — `CASCADE` delete.

---

## 4. Seed data (post-migration)

Per PRD §7. The `seed.sql` script runs in a single transaction:

```sql
BEGIN;

-- children first
DELETE FROM "Appeals";
DELETE FROM "GradeDrafts";
DELETE FROM "Grades";
DELETE FROM "RefreshTokens";
DELETE FROM "Enrollments";
DELETE FROM "Subjects";
DELETE FROM "Users";

-- Users (1 admin + 4 professors + 10 students) ...
-- Subjects (~15, all ECTS=6) ...
-- Enrollments (~30) ...
-- Grades (~20 across every state) ...
-- GradeDrafts (~3) ...
-- Appeals (~5, including one overdue chain) ...

COMMIT;
```

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

All seeded users share the plaintext password `Password123!` (PBKDF2 hashed in the SQL literal).

---

## 5. Migration order (applied by the agent, run by the human)

1. `AddRefreshToken` — PRD Task 6.8.
2. `GradeRedesign` — PRD Task 7.4. Drops old Grade columns, adds new columns, adds `GradeDrafts` and `Appeals` tables, flips Grade → Enrollment uniqueness.
3. `SubjectEctsDefault` — PRD Task 9.1. Adds `DEFAULT 6` and back-fills.

Each migration is one commit (per the plan's per-subtask commit rule).

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

The service then computes `canWriteAppeal`, `canConfirmGrade`, `status`, and `appealStatus` labels per PRD §4.6 and §4.1.

### 6.2 Earned ECTS

```sql
SELECT COALESCE(SUM(s."ECTS"), 0) AS earned_ects
FROM "Enrollments" e
JOIN "Subjects" s  ON s."Id" = e."SubjectId"
JOIN "Grades" g    ON g."EnrollmentId" = e."Id"
LEFT JOIN LATERAL (
  SELECT a.*
  FROM "Appeals" a
  WHERE a."GradeId" = g."Id" AND a."Status" IN ('Pending','Accepted')
  ORDER BY a."SubmittedAt" DESC
  LIMIT 1
) active_appeal ON TRUE
WHERE e."StudentId" = @studentId
  AND g."FinalGrade" >= 6
  AND active_appeal.* IS NULL              -- no live appeal blocking finality
  AND (
       g."StudentConfirmedAt" IS NOT NULL
    OR g."FinalizedAt" IS NOT NULL
    OR g."ConfirmedAt" + INTERVAL '7 days' < NOW()
  );
```
