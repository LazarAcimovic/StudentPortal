-- StudentPortal seed data — v2 (5-field grading / draft / appeal schema)
-- Re-runnable: deletes all rows children-first then reinserts.
--
--   psql -U postgres -d StudentPortal -f seed.sql
--
-- All seeded users share plaintext password: Password123!
-- Stored as PBKDF2-HMACSHA512 (version byte 0x01, 100 000 iterations,
-- 128-bit salt, 256-bit subkey).
--
-- Fixed GUID prefixes keep FKs predictable across re-runs:
--   Users         10000000-...-00XX  (01 admin, 02-05 professors, 06-0f students)
--   Subjects      20000000-...-00XX  (01-04 Smith, 05-08 Johnson, 09-0c Davis, 0d-0f Wilson)
--   Enrollments   30000000-...-00XX  (01-1e, 30 rows)
--   Grades        40000000-...-00XX  (01-14, 20 rows)
--   GradeDrafts   50000000-...-00XX  (01-03, 3 rows)
--   Appeals       60000000-...-00XX  (01-09, 9 rows)
--   RefreshTokens 70000000-...       (none seeded — issued at runtime)
--
-- Grade states covered:
--   G01, G04, G07, G10, G13, G20  — truly final (student confirmed)
--   G02, G12, G16                 — truly final (7-day window lapsed, no appeals)
--   G05, G08, G18                 — truly final (appeal denied, undo window expired)
--   G03, G09, G15                 — inside initial 7-day window (no action yet)
--   G06                           — active pending appeal
--   G17                           — overdue chain: first appeal overdue, second pending
--   G11                           — appeal accepted, awaiting professor re-confirm
--   G14                           — appeal denied, still within 24-h undo window
--   G19                           — overdue chain: first appeal overdue, second pending
--
-- Time-sensitive rows use NOW() so the seed stays valid on any future re-run.
-- PostgreSQL evaluates NOW() once per transaction, so all relative offsets are
-- consistent within a single seed execution.

BEGIN;

DELETE FROM "Appeals";
DELETE FROM "GradeDrafts";
DELETE FROM "Grades";
DELETE FROM "RefreshTokens";
DELETE FROM "Enrollments";
DELETE FROM "Subjects";
DELETE FROM "Users";

-- ─── USERS (1 admin + 4 professors + 10 students) ─────────────────────────
INSERT INTO "Users" (
  "Id","FirstName","LastName","Email","UserPassword",
  "IndexNumber","IsDeleted","UserRole","CreatedAt"
) VALUES
  -- Admin
  ('10000000-0000-0000-0000-000000000001',
   'Admin','Admin','admin@uni.edu',
   'AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==',
   NULL,false,'Admin','2024-09-01T08:00:00+00'),

  -- Professors
  ('10000000-0000-0000-0000-000000000002',
   'John','Smith','john.smith@uni.edu',
   'AQAAAAIAAYagAAAAEMcAcDT7xDL8/O0v9b7ZQTEIGwm8Tx90O464I96PdjTGZWt1+/eF9KeNRcZCbNccYw==',
   NULL,false,'Professor','2024-09-01T08:00:00+00'),
  ('10000000-0000-0000-0000-000000000003',
   'Emily','Johnson','emily.johnson@uni.edu',
   'AQAAAAIAAYagAAAAEPuml3JRgIFBLAEdfbN5RCZVj9ih80b/6nGIEcBqhKk1vBCoJi6hgJXFdKgKePPnDA==',
   NULL,false,'Professor','2024-09-01T08:00:00+00'),
  ('10000000-0000-0000-0000-000000000004',
   'Michael','Davis','michael.davis@uni.edu',
   'AQAAAAIAAYagAAAAEC5oa8ga9I1lGxJg3+lnIFXNAzCjdDe+KaBR778AJZBgz9zVkcDncA/muHeXvF5Smg==',
   NULL,false,'Professor','2024-09-01T08:00:00+00'),
  ('10000000-0000-0000-0000-000000000005',
   'Laura','Wilson','laura.wilson@uni.edu',
   'AQAAAAIAAYagAAAAEFYs++5b/7gnchHZ9/9SZ7h7Ii9qyuQXNOBD4j8jSu5eI6hNSYhG0jAij+6klaSo9Q==',
   NULL,false,'Professor','2024-09-01T08:00:00+00'),

  -- Students
  ('10000000-0000-0000-0000-000000000006',
   'Sarah','Williams','sarah.williams@student.edu',
   'AQAAAAIAAYagAAAAENdyz/qCTUw4UqhZ01kVz6jcnGIlpBDu5Bx2b+Nz67LtkbWnQTqOrGC49GeI723Krg==',
   'SW-001-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-000000000007',
   'David','Brown','david.brown@student.edu',
   'AQAAAAIAAYagAAAAEHuZ4CHdD9Kx7/95v/jQQ/97xAHj2UxFOSxCqRio7pPCvtVgP5GPNs9f/MOgwdYiZQ==',
   'SW-002-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-000000000008',
   'Jessica','Taylor','jessica.taylor@student.edu',
   'AQAAAAIAAYagAAAAENAtPUKcqPV6URC7R+BOCMinvZG5uV7tbx0wN6b54e6KtTSvoPBQb1qY2iV9c1Pm5g==',
   'SW-003-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-000000000009',
   'Daniel','Anderson','daniel.anderson@student.edu',
   'AQAAAAIAAYagAAAAEJZ666SFKzHzY2LryZoXRQGmTkESaNHYbWDdbNs564yUrSeN0u+0CEhCft4l601gcg==',
   'SW-004-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-00000000000a',
   'Olivia','Martin','olivia.martin@student.edu',
   'AQAAAAIAAYagAAAAEFfZc8HmlOoklk2l1LiTO/ielMc5EZtDTZzpmMWubyBuihBDgMuiRIdTYyv5G9niFw==',
   'SW-005-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-00000000000b',
   'James','Thompson','james.thompson@student.edu',
   'AQAAAAIAAYagAAAAEMcAcDT7xDL8/O0v9b7ZQTEIGwm8Tx90O464I96PdjTGZWt1+/eF9KeNRcZCbNccYw==',
   'SW-006-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-00000000000c',
   'Emma','Garcia','emma.garcia@student.edu',
   'AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==',
   'SW-007-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-00000000000d',
   'Noah','Martinez','noah.martinez@student.edu',
   'AQAAAAIAAYagAAAAEPuml3JRgIFBLAEdfbN5RCZVj9ih80b/6nGIEcBqhKk1vBCoJi6hgJXFdKgKePPnDA==',
   'SW-008-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-00000000000e',
   'Sophia','Robinson','sophia.robinson@student.edu',
   'AQAAAAIAAYagAAAAEC5oa8ga9I1lGxJg3+lnIFXNAzCjdDe+KaBR778AJZBgz9zVkcDncA/muHeXvF5Smg==',
   'SW-009-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-00000000000f',
   'Liam','Clark','liam.clark@student.edu',
   'AQAAAAIAAYagAAAAEFYs++5b/7gnchHZ9/9SZ7h7Ii9qyuQXNOBD4j8jSu5eI6hNSYhG0jAij+6klaSo9Q==',
   'SW-010-2024',false,'Student','2024-09-05T08:00:00+00');

-- ─── SUBJECTS (15 subjects, ECTS=6 each) ──────────────────────────────────
-- Smith  (0002): 4 subjects   Johnson (0003): 4 subjects
-- Davis  (0004): 4 subjects   Wilson  (0005): 3 subjects
INSERT INTO "Subjects" (
  "Id","SubjectName","ECTS","ProfessorId","IsDeleted","CreatedAt"
) VALUES
  ('20000000-0000-0000-0000-000000000001','Mathematics I',            6,'10000000-0000-0000-0000-000000000002',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-000000000002','Mathematics II',           6,'10000000-0000-0000-0000-000000000002',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-000000000003','Linear Algebra',           6,'10000000-0000-0000-0000-000000000002',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-000000000004','Calculus',                 6,'10000000-0000-0000-0000-000000000002',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-000000000005','Programming Fundamentals', 6,'10000000-0000-0000-0000-000000000003',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-000000000006','Data Structures',          6,'10000000-0000-0000-0000-000000000003',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-000000000007','Software Engineering',     6,'10000000-0000-0000-0000-000000000003',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-000000000008','Web Development',          6,'10000000-0000-0000-0000-000000000003',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-000000000009','Operating Systems',        6,'10000000-0000-0000-0000-000000000004',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-00000000000a','Computer Networks',        6,'10000000-0000-0000-0000-000000000004',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-00000000000b','Distributed Systems',      6,'10000000-0000-0000-0000-000000000004',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-00000000000c','Computer Architecture',    6,'10000000-0000-0000-0000-000000000004',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-00000000000d','Database Systems',         6,'10000000-0000-0000-0000-000000000005',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-00000000000e','Algorithms',               6,'10000000-0000-0000-0000-000000000005',false,'2024-09-01T08:00:00+00'),
  ('20000000-0000-0000-0000-00000000000f','Discrete Mathematics',     6,'10000000-0000-0000-0000-000000000005',false,'2024-09-01T08:00:00+00');

-- ─── ENROLLMENTS (30 rows) ─────────────────────────────────────────────────
-- Rows 01-03  Sarah Williams   | 04-06  David Brown      | 07-09  Jessica Taylor
-- Rows 0a-0c  Daniel Anderson  | 0d-0f  Olivia Martin    | 10-12  James Thompson
-- Rows 13-15  Emma Garcia      | 16-18  Noah Martinez    | 19-1b  Sophia Robinson
-- Rows 1c-1e  Liam Clark
INSERT INTO "Enrollments" (
  "Id","StudentId","SubjectId","IsDeleted","EnrolledAt"
) VALUES
  -- Sarah Williams (S06)
  ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000001',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000005',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-00000000000d',false,'2024-10-01T08:00:00+00'),
  -- David Brown (S07)
  ('30000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000002',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000006',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000009',false,'2024-10-01T08:00:00+00'),
  -- Jessica Taylor (S08)
  ('30000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000003',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000007',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-00000000000a',false,'2024-10-01T08:00:00+00'),
  -- Daniel Anderson (S09)
  ('30000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000009','20000000-0000-0000-0000-000000000004',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-000000000009','20000000-0000-0000-0000-000000000008',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-000000000009','20000000-0000-0000-0000-00000000000e',false,'2024-10-01T08:00:00+00'),
  -- Olivia Martin (S0a)
  ('30000000-0000-0000-0000-00000000000d','10000000-0000-0000-0000-00000000000a','20000000-0000-0000-0000-000000000001',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-00000000000e','10000000-0000-0000-0000-00000000000a','20000000-0000-0000-0000-00000000000b',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-00000000000f','10000000-0000-0000-0000-00000000000a','20000000-0000-0000-0000-00000000000f',false,'2024-10-01T08:00:00+00'),
  -- James Thompson (S0b)
  ('30000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-00000000000b','20000000-0000-0000-0000-000000000002',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-00000000000b','20000000-0000-0000-0000-000000000005',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-00000000000b','20000000-0000-0000-0000-000000000009',false,'2024-10-01T08:00:00+00'),
  -- Emma Garcia (S0c)
  ('30000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-00000000000c','20000000-0000-0000-0000-00000000000c',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000014','10000000-0000-0000-0000-00000000000c','20000000-0000-0000-0000-00000000000d',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000015','10000000-0000-0000-0000-00000000000c','20000000-0000-0000-0000-00000000000e',false,'2024-10-01T08:00:00+00'),
  -- Noah Martinez (S0d)
  ('30000000-0000-0000-0000-000000000016','10000000-0000-0000-0000-00000000000d','20000000-0000-0000-0000-000000000001',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000017','10000000-0000-0000-0000-00000000000d','20000000-0000-0000-0000-000000000006',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-000000000018','10000000-0000-0000-0000-00000000000d','20000000-0000-0000-0000-00000000000f',false,'2024-10-01T08:00:00+00'),
  -- Sophia Robinson (S0e) — no grades, no drafts
  ('30000000-0000-0000-0000-000000000019','10000000-0000-0000-0000-00000000000e','20000000-0000-0000-0000-000000000002',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-00000000001a','10000000-0000-0000-0000-00000000000e','20000000-0000-0000-0000-000000000007',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-00000000001b','10000000-0000-0000-0000-00000000000e','20000000-0000-0000-0000-00000000000b',false,'2024-10-01T08:00:00+00'),
  -- Liam Clark (S0f) — no grades, no drafts
  ('30000000-0000-0000-0000-00000000001c','10000000-0000-0000-0000-00000000000f','20000000-0000-0000-0000-000000000003',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-00000000001d','10000000-0000-0000-0000-00000000000f','20000000-0000-0000-0000-00000000000a',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-00000000001e','10000000-0000-0000-0000-00000000000f','20000000-0000-0000-0000-00000000000e',false,'2024-10-01T08:00:00+00');

-- ─── GRADES (20 rows, all states covered) ─────────────────────────────────
-- Column order: Id, EnrollmentId,
--   Midterm1Points, Midterm2Points, AttendancePoints, PracticalPoints, ExamPoints,
--   FinalGrade, ConfirmedAt, StudentConfirmedAt, FinalizedAt, IsDeleted
--
-- Final grade thresholds (sum of 5 fields):
--   ≤50 → 5 | 51-60 → 6 | 61-70 → 7 | 71-80 → 8 | 81-90 → 9 | 91-100 → 10

-- ── Static grades (all finalized, timestamps fixed) ────────────────────────
INSERT INTO "Grades" (
  "Id","EnrollmentId",
  "Midterm1Points","Midterm2Points","AttendancePoints","PracticalPoints","ExamPoints",
  "FinalGrade","ConfirmedAt","StudentConfirmedAt","FinalizedAt","IsDeleted"
) VALUES

  -- G01  Sarah / Mathematics I — student confirmed — grade 8 (sum 75)
  ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',
   22,20,4,4,25, 8,
   '2026-09-01T10:00:00+00','2026-09-02T14:00:00+00','2026-09-02T14:00:00+00',false),

  -- G02  Sarah / Programming Fundamentals — 7-day lapse — grade 9 (sum 85)
  -- FinalizedAt is NULL; service auto-finalizes via ConfirmedAt + 7d < NOW()
  ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',
   25,26,5,4,25, 9,
   '2026-08-01T09:00:00+00',NULL,NULL,false),

  -- G04  David / Mathematics II — student confirmed — grade 10 (sum 95)
  ('40000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000004',
   28,28,5,5,29, 10,
   '2026-09-10T11:00:00+00','2026-09-11T09:00:00+00','2026-09-11T09:00:00+00',false),

  -- G05  David / Data Structures — appeal denied, undo window expired — grade 6 (sum 55)
  ('40000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000005',
   15,13,3.5,3.5,20, 6,
   '2026-07-15T08:00:00+00',NULL,'2026-07-25T10:00:00+00',false),

  -- G07  Jessica / Linear Algebra — student confirmed — grade 9 (sum 82)
  ('40000000-0000-0000-0000-000000000007','30000000-0000-0000-0000-000000000007',
   24,23,5,4.5,25.5, 9,
   '2026-09-20T14:00:00+00','2026-09-21T10:00:00+00','2026-09-21T10:00:00+00',false),

  -- G08  Jessica / Software Engineering — deny past 24-h undo — grade 8 (sum 73)
  ('40000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000008',
   20,22,4,4,23, 8,
   '2026-09-05T10:00:00+00',NULL,'2026-09-10T15:00:00+00',false),

  -- G10  Daniel / Calculus — student confirmed — grade 7 (sum 68)
  ('40000000-0000-0000-0000-00000000000a','30000000-0000-0000-0000-00000000000a',
   20,18,5,4,21, 7,
   '2026-09-15T10:00:00+00','2026-09-16T11:00:00+00','2026-09-16T11:00:00+00',false),

  -- G12  Daniel / Algorithms — 7-day lapse — grade 8 (sum 78)
  ('40000000-0000-0000-0000-00000000000c','30000000-0000-0000-0000-00000000000c',
   23,22,5,4,24, 8,
   '2026-09-01T08:00:00+00',NULL,NULL,false),

  -- G13  Olivia / Mathematics I — student confirmed — grade 6 (sum 56)
  ('40000000-0000-0000-0000-00000000000d','30000000-0000-0000-0000-00000000000d',
   15,14,4,4,19, 6,
   '2026-09-25T10:00:00+00','2026-09-26T09:00:00+00','2026-09-26T09:00:00+00',false),

  -- G16  James / Mathematics II — 7-day lapse, failed — grade 5 (sum 38)
  ('40000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000010',
   10,8,2,2,16, 5,
   '2026-08-15T09:00:00+00',NULL,NULL,false),

  -- G18  James / Operating Systems — deny past 24-h undo — grade 9 (sum 84)
  ('40000000-0000-0000-0000-000000000012','30000000-0000-0000-0000-000000000012',
   25,24,5,4,26, 9,
   '2026-09-18T10:00:00+00',NULL,'2026-09-23T15:00:00+00',false),

  -- G20  Emma / Database Systems — student confirmed — grade 8 (sum 74)
  ('40000000-0000-0000-0000-000000000014','30000000-0000-0000-0000-000000000014',
   22,20,5,3,24, 8,
   '2026-09-28T10:00:00+00','2026-09-29T14:00:00+00','2026-09-29T14:00:00+00',false);

-- ── Dynamic grades (live states that must stay correct on every re-run) ─────
INSERT INTO "Grades" (
  "Id","EnrollmentId",
  "Midterm1Points","Midterm2Points","AttendancePoints","PracticalPoints","ExamPoints",
  "FinalGrade","ConfirmedAt","StudentConfirmedAt","FinalizedAt","IsDeleted"
) VALUES

  -- G03  Sarah / Database Systems — inside 7-day window — grade 7 (sum 65)
  ('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003',
   18,17,5,4,21, 7,
   (NOW() - INTERVAL '3 days'),NULL,NULL,false),

  -- G06  David / Operating Systems — active pending appeal — grade 7 (sum 62)
  ('40000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000006',
   20,18,4,3,17, 7,
   (NOW() - INTERVAL '5 days'),NULL,NULL,false),

  -- G09  Jessica / Computer Networks — inside 7-day window — grade 6 (sum 53)
  ('40000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000009',
   14,12,3,3,21, 6,
   (NOW() - INTERVAL '4 days'),NULL,NULL,false),

  -- G11  Daniel / Web Development — appeal accepted, awaiting re-confirm — grade 7 (sum 67)
  ('40000000-0000-0000-0000-00000000000b','30000000-0000-0000-0000-00000000000b',
   20,18,4,4,21, 7,
   (NOW() - INTERVAL '10 days'),NULL,NULL,false),

  -- G14  Olivia / Distributed Systems — appeal denied, within 24-h undo — grade 8 (sum 72)
  ('40000000-0000-0000-0000-00000000000e','30000000-0000-0000-0000-00000000000e',
   21,20,4,4,23, 8,
   (NOW() - INTERVAL '7 days'),NULL,(NOW() - INTERVAL '6 hours'),false),

  -- G15  Olivia / Discrete Mathematics — inside 7-day window — grade 9 (sum 88)
  ('40000000-0000-0000-0000-00000000000f','30000000-0000-0000-0000-00000000000f',
   26,25,5,5,27, 9,
   (NOW() - INTERVAL '2 days'),NULL,NULL,false),

  -- G17  James / Programming Fundamentals — overdue chain — grade 6 (sum 57)
  --   first appeal (A09): SubmittedAt = NOW()-10d  → overdue (went overdue at NOW()-3d)
  --   second appeal (A05): SubmittedAt = NOW()-2d  → active pending
  ('40000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000011',
   16,14,4,3,20, 6,
   (NOW() - INTERVAL '17 days'),NULL,NULL,false),

  -- G19  Emma / Computer Architecture — overdue chain — grade 7 (sum 63)
  --   first appeal (A07): SubmittedAt = NOW()-10d  → overdue (went overdue at NOW()-3d)
  --   second appeal (A08): SubmittedAt = NOW()-2d  → active pending
  ('40000000-0000-0000-0000-000000000013','30000000-0000-0000-0000-000000000013',
   18,16,4,4,21, 7,
   (NOW() - INTERVAL '17 days'),NULL,NULL,false);

-- ─── GRADE DRAFTS (3 rows — professor saved draft, not yet confirmed) ─────
INSERT INTO "GradeDrafts" (
  "Id","EnrollmentId",
  "Midterm1Points","Midterm2Points","AttendancePoints","PracticalPoints","ExamPoints",
  "LastEditedAt"
) VALUES
  -- D01  Emma / Algorithms — partial: only Midterm1 filled
  ('50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000015',
   20,NULL,NULL,NULL,NULL,
   NOW()),
  -- D02  Noah / Mathematics I — mostly filled: Midterm1, Midterm2, Attendance
  ('50000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000016',
   25,24,5,NULL,NULL,
   NOW()),
  -- D03  Noah / Data Structures — partial: Midterm1 and Midterm2 filled
  ('50000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000017',
   15,12,NULL,NULL,NULL,
   NOW());

-- ─── APPEALS (8 rows) ──────────────────────────────────────────────────────
-- A01  G06 (David/OpSys)              — active Pending (submitted 2 days ago)
-- A02  G08 (Jessica/SoftEng)          — Denied, undo window long expired
-- A03  G11 (Daniel/WebDev)            — Accepted, professor must re-confirm exam
-- A04  G14 (Olivia/DistSys)           — Denied, within 24-h undo window
-- A05  G17 (James/ProgFund) — chain 2  — active Pending (second appeal, 2 days ago)
-- A09  G17 (James/ProgFund) — chain 1  — Pending stored, goes Overdue on read (submitted 10d ago)
-- A06  G18 (James/OpSys)              — Denied, undo window long expired
-- A07  G19 (Emma/CompArch) — chain 1  — Pending stored, goes Overdue on read (submitted 10d ago)
-- A08  G19 (Emma/CompArch) — chain 2  — active Pending (second appeal, 2 days ago)
-- A10  G05 (David/DataStructures)     — Denied, undo window long expired (Test 4)
INSERT INTO "Appeals" (
  "Id","GradeId","Text","SubmittedAt","Status","ReviewedAt"
) VALUES
  -- A01 active pending on G06
  ('60000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006',
   'I believe my exam paper was graded too harshly. Some of my answers were partially correct and should have received more credit.',
   (NOW() - INTERVAL '2 days'),'Pending',NULL),

  -- A02 denied (undo expired) on G08
  ('60000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000008',
   'I would like to appeal this grade. I answered all questions but my handwriting may have caused confusion during grading.',
   '2026-09-07T12:00:00+00','Denied','2026-09-10T15:00:00+00'),

  -- A03 accepted (awaiting re-confirm) on G11
  ('60000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-00000000000b',
   'I completed all exam questions and my solution for the last problem was correct but received zero points.',
   (NOW() - INTERVAL '8 days'),'Accepted',(NOW() - INTERVAL '4 days')),

  -- A04 denied (within 24-h undo) on G14
  ('60000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-00000000000e',
   'The grading rubric was not applied consistently. My distributed transaction implementation was correct and should be worth full points.',
   (NOW() - INTERVAL '5 days'),'Denied',(NOW() - INTERVAL '6 hours')),

  -- A09 first appeal on G17 — stored as Pending, computed Overdue on read
  --   SubmittedAt = NOW()-10d; goes Overdue at NOW()-10d+7d = NOW()-3d
  ('60000000-0000-0000-0000-000000000009','40000000-0000-0000-0000-000000000011',
   'I think the grading was unfair. My assignment was complete and working correctly.',
   (NOW() - INTERVAL '10 days'),'Pending',NULL),

  -- A05 second appeal on G17 — active Pending (fresh window after A09 went Overdue)
  ('60000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000011',
   'Since my first appeal was not reviewed within the deadline, I am submitting a new appeal. The logic in my assignment was correct and the grade should be higher.',
   (NOW() - INTERVAL '2 days'),'Pending',NULL),

  -- A06 denied (undo expired) on G18
  ('60000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000012',
   'My exam answers were complete and correct. I am requesting a re-evaluation of the grading.',
   '2026-09-20T12:00:00+00','Denied','2026-09-23T15:00:00+00'),

  -- A07 first appeal on G19 — stored as Pending, computed Overdue on read
  --   SubmittedAt = NOW()-10d; goes Overdue at NOW()-10d+7d = NOW()-3d
  ('60000000-0000-0000-0000-000000000007','40000000-0000-0000-0000-000000000013',
   'I disagree with the grade. My project implementation met all the requirements specified in the assignment.',
   (NOW() - INTERVAL '10 days'),'Pending',NULL),

  -- A08 second appeal on G19 — active Pending (fresh window after first went Overdue)
  ('60000000-0000-0000-0000-000000000008','40000000-0000-0000-0000-000000000013',
   'Since my first appeal was not reviewed within the deadline, I am submitting a new appeal. The grading was incorrect.',
   (NOW() - INTERVAL '2 days'),'Pending',NULL),

  -- A10 denied (undo expired) on G05 — David / Data Structures
  ('60000000-0000-0000-0000-00000000000a','40000000-0000-0000-0000-000000000005',
   'I believe my exam was graded incorrectly. Several of my answers were partially correct and deserved more credit.',
   '2026-07-18T08:00:00+00','Denied','2026-07-25T10:00:00+00');

COMMIT;
