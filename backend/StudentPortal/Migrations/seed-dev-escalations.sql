-- StudentPortal DEV-ONLY escalation fixture — manual testing of task 23.
--
--   RUN ORDER:  psql -f seed.sql   then   psql -f seed-dev-escalations.sql
--
--   psql -U postgres -d StudentPortal -f backend/StudentPortal/Migrations/seed-dev-escalations.sql
--
-- WHY A SEPARATE FILE (do NOT merge these rows into seed.sql):
--   seed.sql replays before EVERY integration test (Tech-Backend §7), so a
--   backdated/escalated row there would leak an escalation into every test and
--   break the suite. PRD §7 / D-022 and DB §4 forbid time-sensitive and
--   escalation rows in seed.sql for exactly that reason, and task 23.14 lists
--   "seeding escalated cases" as out of scope. This file is for manual
--   (human-in-the-browser) testing only. The integration-test fixture loads
--   seed.sql by exact path and never touches this file.
--
-- It layers five escalation demo cases ON TOP of seed.sql, all on Smith's
-- "Mathematics I" (code MATH-CALC). It is re-runnable: it deletes its own demo
-- rows (children-first, by fixed GUID) before reinserting.
--
-- Depends on these seed.sql rows existing:
--   Admin  10000000-...-0001   Smith  10000000-...-0002  (original prof, MATH-CALC)
--   Davis  10000000-...-0004   Wilson 10000000-...-0005  (eligible subs, see below)
--   Subject "Mathematics I" 20000000-...-0001 (MATH-CALC, taught by Smith)
--
-- ELIGIBILITY. A professor is eligible for a MATH-CALC case if they teach any
-- subject with code MATH-CALC, excluding Smith (original) and anyone already in
-- the assignment history. seed.sql gives MATH-CALC to Smith (Mathematics I) and
-- Wilson (Discrete Mathematics) only. This file adds a THIRD MATH-CALC subject
-- ("Mathematical Logic", taught by Davis) so that a reassignment has somewhere
-- to go after Wilson is used up:  eligible = {Wilson, Davis}.
--
-- DEMO GUID block (suffix f1+, never collides with seed.sql which stops at 1e):
--   Users (demo students)   10000000-...-00f1 .. f5
--   Subject (Math Logic)    20000000-...-00f1
--   Enrollments             30000000-...-00f1 .. f5
--   Grades                  40000000-...-00f1 .. f5
--   Appeals                 60000000-...-00f1 .. f9
--   Escalations             80000000-...-00f1 .. f3
--   EscalationAssignments   90000000-...-00f1 .. f4
--
-- THE FIVE CASES (all admin "Escalations" tab statuses + both professor panels):
--   G_f1  NeedsAssignment · ChainExhausted      two overdue appeals, no record yet
--   G_f2  NeedsAssignment · AcceptedUnresolved  accepted appeal, re-grade window blown
--   G_f3  Assigned        · ChainExhausted      Wilson, assigned 2 days ago (in window)
--   G_f4  NeedsReassignment · ChainExhausted    Wilson, assigned 9 days ago (window blown)
--   G_f5  Resolved        · ChainExhausted      Wilson→Davis history, denied & finalized
--
-- All demo students share the same password as the rest of the seed: Password123!
--
-- Time is relative (NOW() - INTERVAL ...). Postgres evaluates NOW() once per
-- transaction, so every offset below is consistent within one run.

BEGIN;

-- ─── CLEAN UP PRIOR DEMO ROWS (children first, by fixed GUID) ───────────────
DELETE FROM "EscalationAssignments" WHERE "Id" IN (
  '90000000-0000-0000-0000-0000000000f1','90000000-0000-0000-0000-0000000000f2',
  '90000000-0000-0000-0000-0000000000f3','90000000-0000-0000-0000-0000000000f4');
DELETE FROM "Escalations" WHERE "Id" IN (
  '80000000-0000-0000-0000-0000000000f1','80000000-0000-0000-0000-0000000000f2',
  '80000000-0000-0000-0000-0000000000f3');
DELETE FROM "Appeals" WHERE "Id" IN (
  '60000000-0000-0000-0000-0000000000f1','60000000-0000-0000-0000-0000000000f2',
  '60000000-0000-0000-0000-0000000000f3','60000000-0000-0000-0000-0000000000f4',
  '60000000-0000-0000-0000-0000000000f5','60000000-0000-0000-0000-0000000000f6',
  '60000000-0000-0000-0000-0000000000f7','60000000-0000-0000-0000-0000000000f8',
  '60000000-0000-0000-0000-0000000000f9');
DELETE FROM "Grades" WHERE "Id" IN (
  '40000000-0000-0000-0000-0000000000f1','40000000-0000-0000-0000-0000000000f2',
  '40000000-0000-0000-0000-0000000000f3','40000000-0000-0000-0000-0000000000f4',
  '40000000-0000-0000-0000-0000000000f5');
DELETE FROM "Enrollments" WHERE "Id" IN (
  '30000000-0000-0000-0000-0000000000f1','30000000-0000-0000-0000-0000000000f2',
  '30000000-0000-0000-0000-0000000000f3','30000000-0000-0000-0000-0000000000f4',
  '30000000-0000-0000-0000-0000000000f5');
DELETE FROM "Subjects" WHERE "Id" = '20000000-0000-0000-0000-0000000000f1';
DELETE FROM "Users" WHERE "Id" IN (
  '10000000-0000-0000-0000-0000000000f1','10000000-0000-0000-0000-0000000000f2',
  '10000000-0000-0000-0000-0000000000f3','10000000-0000-0000-0000-0000000000f4',
  '10000000-0000-0000-0000-0000000000f5');

-- ─── DEMO STUDENTS (password: Password123!) ─────────────────────────────────
INSERT INTO "Users" (
  "Id","FirstName","LastName","Email","UserPassword",
  "IndexNumber","IsDeleted","UserRole","CreatedAt"
) VALUES
  ('10000000-0000-0000-0000-0000000000f1','Mila','Jovanovic','esc.demo1@student.edu',
   'AQAAAAIAAYagAAAAENdyz/qCTUw4UqhZ01kVz6jcnGIlpBDu5Bx2b+Nz67LtkbWnQTqOrGC49GeI723Krg==',
   'ESC-001-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-0000000000f2','Petar','Kovac','esc.demo2@student.edu',
   'AQAAAAIAAYagAAAAENdyz/qCTUw4UqhZ01kVz6jcnGIlpBDu5Bx2b+Nz67LtkbWnQTqOrGC49GeI723Krg==',
   'ESC-002-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-0000000000f3','Ana','Nikolic','esc.demo3@student.edu',
   'AQAAAAIAAYagAAAAENdyz/qCTUw4UqhZ01kVz6jcnGIlpBDu5Bx2b+Nz67LtkbWnQTqOrGC49GeI723Krg==',
   'ESC-003-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-0000000000f4','Marko','Ilic','esc.demo4@student.edu',
   'AQAAAAIAAYagAAAAENdyz/qCTUw4UqhZ01kVz6jcnGIlpBDu5Bx2b+Nz67LtkbWnQTqOrGC49GeI723Krg==',
   'ESC-004-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('10000000-0000-0000-0000-0000000000f5','Jelena','Pavlovic','esc.demo5@student.edu',
   'AQAAAAIAAYagAAAAENdyz/qCTUw4UqhZ01kVz6jcnGIlpBDu5Bx2b+Nz67LtkbWnQTqOrGC49GeI723Krg==',
   'ESC-005-2024',false,'Student','2024-09-05T08:00:00+00');

-- ─── THIRD MATH-CALC SUBJECT (gives reassignment a target: Davis) ───────────
INSERT INTO "Subjects" (
  "Id","SubjectName","SubjectCode","ECTS","ProfessorId","IsDeleted","CreatedAt"
) VALUES
  ('20000000-0000-0000-0000-0000000000f1','Mathematical Logic','MATH-CALC',6,
   '10000000-0000-0000-0000-000000000004',false,'2024-09-01T08:00:00+00');

-- ─── DEMO ENROLLMENTS (each demo student → Smith's Mathematics I 20..01) ────
INSERT INTO "Enrollments" (
  "Id","StudentId","SubjectId","IsDeleted","EnrolledAt"
) VALUES
  ('30000000-0000-0000-0000-0000000000f1','10000000-0000-0000-0000-0000000000f1','20000000-0000-0000-0000-000000000001',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-0000000000f2','10000000-0000-0000-0000-0000000000f2','20000000-0000-0000-0000-000000000001',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-0000000000f3','10000000-0000-0000-0000-0000000000f3','20000000-0000-0000-0000-000000000001',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-0000000000f4','10000000-0000-0000-0000-0000000000f4','20000000-0000-0000-0000-000000000001',false,'2024-10-01T08:00:00+00'),
  ('30000000-0000-0000-0000-0000000000f5','10000000-0000-0000-0000-0000000000f5','20000000-0000-0000-0000-000000000001',false,'2024-10-01T08:00:00+00');

-- ─── DEMO GRADES ────────────────────────────────────────────────────────────
-- Column order mirrors seed.sql, plus AssignedProfessorId.
INSERT INTO "Grades" (
  "Id","EnrollmentId",
  "Midterm1Points","Midterm2Points","AttendancePoints","PracticalPoints","ExamPoints",
  "FinalGrade","ConfirmedAt","StudentConfirmedAt","FinalizedAt","AssignedProfessorId","IsDeleted"
) VALUES
  -- G_f1  NeedsAssignment / ChainExhausted — grade 7 (sum 61), not final, unassigned
  ('40000000-0000-0000-0000-0000000000f1','30000000-0000-0000-0000-0000000000f1',
   18,16,4,3,20, 7,
   (NOW() - INTERVAL '30 days'),NULL,NULL,NULL,false),

  -- G_f2  NeedsAssignment / AcceptedUnresolved — grade 7 (sum 68), not final, unassigned
  ('40000000-0000-0000-0000-0000000000f2','30000000-0000-0000-0000-0000000000f2',
   20,18,4,4,22, 7,
   (NOW() - INTERVAL '30 days'),NULL,NULL,NULL,false),

  -- G_f3  Assigned / ChainExhausted — grade 6 (sum 56), assigned to Wilson (0005)
  ('40000000-0000-0000-0000-0000000000f3','30000000-0000-0000-0000-0000000000f3',
   16,15,4,3,18, 6,
   (NOW() - INTERVAL '30 days'),NULL,NULL,'10000000-0000-0000-0000-000000000005',false),

  -- G_f4  NeedsReassignment / ChainExhausted — grade 6 (sum 60), assigned to Wilson (0005)
  ('40000000-0000-0000-0000-0000000000f4','30000000-0000-0000-0000-0000000000f4',
   17,15,4,4,20, 6,
   (NOW() - INTERVAL '40 days'),NULL,NULL,'10000000-0000-0000-0000-000000000005',false),

  -- G_f5  Resolved / ChainExhausted — grade 7 (sum 65), finalized by Davis's deny
  ('40000000-0000-0000-0000-0000000000f5','30000000-0000-0000-0000-0000000000f5',
   18,17,4,4,22, 7,
   (NOW() - INTERVAL '50 days'),NULL,(NOW() - INTERVAL '2 days'),'10000000-0000-0000-0000-000000000004',false);

-- ─── DEMO APPEALS ───────────────────────────────────────────────────────────
-- An appeal stored Pending with SubmittedAt older than 7 days surfaces as
-- "Overdue" on read. Two such appeals on one grade = Scenario B (ChainExhausted).
INSERT INTO "Appeals" (
  "Id","GradeId","Text","SubmittedAt","Status","ReviewedAt"
) VALUES
  -- G_f1 chain: both overdue → Scenario B
  ('60000000-0000-0000-0000-0000000000f1','40000000-0000-0000-0000-0000000000f1',
   'My first midterm was marked too harshly; please review the exam paper.',
   (NOW() - INTERVAL '25 days'),'Pending',NULL),
  ('60000000-0000-0000-0000-0000000000f2','40000000-0000-0000-0000-0000000000f1',
   'My first appeal was never answered, so I am submitting a second one.',
   (NOW() - INTERVAL '10 days'),'Pending',NULL),

  -- G_f2: accepted but never re-graded (ReviewedAt + 7d < now) → Scenario A
  ('60000000-0000-0000-0000-0000000000f3','40000000-0000-0000-0000-0000000000f2',
   'My exam solution for the last problem was correct but received no points.',
   (NOW() - INTERVAL '20 days'),'Accepted',(NOW() - INTERVAL '12 days')),

  -- G_f3 chain: both overdue → Scenario B (this case is already assigned to Wilson)
  ('60000000-0000-0000-0000-0000000000f4','40000000-0000-0000-0000-0000000000f3',
   'I believe the grading rubric was not applied consistently to my paper.',
   (NOW() - INTERVAL '25 days'),'Pending',NULL),
  ('60000000-0000-0000-0000-0000000000f5','40000000-0000-0000-0000-0000000000f3',
   'Still no response to my first appeal — requesting a re-evaluation again.',
   (NOW() - INTERVAL '12 days'),'Pending',NULL),

  -- G_f4 chain: both overdue → Scenario B (assigned to Wilson, window now blown)
  ('60000000-0000-0000-0000-0000000000f6','40000000-0000-0000-0000-0000000000f4',
   'The exam total does not match my answer sheet; please recount.',
   (NOW() - INTERVAL '35 days'),'Pending',NULL),
  ('60000000-0000-0000-0000-0000000000f7','40000000-0000-0000-0000-0000000000f4',
   'My first appeal was ignored, so here is a second request for review.',
   (NOW() - INTERVAL '20 days'),'Pending',NULL),

  -- G_f5 chain: first overdue, second denied by the assignee → finalized (Resolved)
  ('60000000-0000-0000-0000-0000000000f8','40000000-0000-0000-0000-0000000000f5',
   'I would like my practical participation score reconsidered.',
   (NOW() - INTERVAL '45 days'),'Pending',NULL),
  ('60000000-0000-0000-0000-0000000000f9','40000000-0000-0000-0000-0000000000f5',
   'Resubmitting since the first appeal went unanswered past the deadline.',
   (NOW() - INTERVAL '30 days'),'Denied',(NOW() - INTERVAL '2 days'));

-- ─── DEMO ESCALATIONS (one open Assigned, one open NeedsReassignment, one Resolved) ──
INSERT INTO "Escalations" (
  "Id","GradeId","Reason","ResolvedAt"
) VALUES
  ('80000000-0000-0000-0000-0000000000f1','40000000-0000-0000-0000-0000000000f3','ChainExhausted',NULL),
  ('80000000-0000-0000-0000-0000000000f2','40000000-0000-0000-0000-0000000000f4','ChainExhausted',NULL),
  ('80000000-0000-0000-0000-0000000000f3','40000000-0000-0000-0000-0000000000f5','ChainExhausted',(NOW() - INTERVAL '2 days'));

-- ─── DEMO ESCALATION ASSIGNMENTS ────────────────────────────────────────────
-- Active assignment = the row with SupersededAt IS NULL. Status is derived from
-- AssignedAt + 7 days vs now:  in window → Assigned, past → NeedsReassignment.
INSERT INTO "EscalationAssignments" (
  "Id","EscalationId","AssignedProfessorId","AssignedByAdminId","AssignedAt","SupersededAt"
) VALUES
  -- G_f3: Wilson assigned 2 days ago → still inside the 7-day window → "Assigned"
  ('90000000-0000-0000-0000-0000000000f1','80000000-0000-0000-0000-0000000000f1',
   '10000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001',
   (NOW() - INTERVAL '2 days'),NULL),

  -- G_f4: Wilson assigned 9 days ago → window expired → "NeedsReassignment"
  ('90000000-0000-0000-0000-0000000000f2','80000000-0000-0000-0000-0000000000f2',
   '10000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001',
   (NOW() - INTERVAL '9 days'),NULL),

  -- G_f5: Wilson (superseded) → Davis (active, resolved it) — full history
  ('90000000-0000-0000-0000-0000000000f3','80000000-0000-0000-0000-0000000000f3',
   '10000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001',
   (NOW() - INTERVAL '15 days'),(NOW() - INTERVAL '9 days')),
  ('90000000-0000-0000-0000-0000000000f4','80000000-0000-0000-0000-0000000000f3',
   '10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001',
   (NOW() - INTERVAL '9 days'),NULL);

COMMIT;
