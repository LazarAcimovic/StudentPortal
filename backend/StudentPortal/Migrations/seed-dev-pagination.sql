-- StudentPortal DEV-ONLY pagination fixture — manual testing of paging & comboboxes.
--
--   RUN ORDER:  psql -f seed.sql   then   psql -f seed-dev-pagination.sql
--
--   psql -U postgres -d StudentPortal -f backend/StudentPortal/Migrations/seed-dev-pagination.sql
--
-- WHY A SEPARATE FILE (do NOT merge these rows into seed.sql):
--   seed.sql replays before EVERY integration test (Tech-Backend §7), and several
--   tests assert exact seed counts — AdminUserSearchTests expects "seed has 10
--   students", AdminSubjectSearchTests "15 subjects", AdminPaginationTests fixed
--   totals. Adding students to seed.sql would break the whole suite. This file is
--   for manual (human-in-the-browser) testing only; the integration-test fixture
--   loads seed.sql by exact path and never touches this file. Same rule and reason
--   as seed-dev-escalations.sql.
--
-- WHAT IT ADDS (layered on top of seed.sql):
--   * 20 extra active students  (ids a0000000-…-0001 … a0000000-…-0014)
--       → total active students becomes 10 (seed) + 20 = 30, so the admin
--         "Create Enrollment" student combobox (15 per page) needs a second fetch
--         when you scroll to the bottom.
--   * 10 of them enrolled in Calculus (Smith, subject 2…0004)
--       → Calculus has Daniel (seed) + 10 = 11 students, so the professor
--         dashboard students list (5 per page) shows pages 1, 2 and 3.
--
-- Re-runnable: it deletes its own rows (children first, by fixed id range) before
-- reinserting, so you can run it as many times as you like.
--
-- Depends on these seed.sql rows existing:
--   Professor John Smith  10000000-…-0002
--   Subject   "Calculus"  20000000-…-0004  (code MATH-301, taught by Smith)

BEGIN;

-- ── clean up a previous run (children first) ──────────────────────────────────
DELETE FROM "Enrollments" WHERE "Id"::text LIKE 'a1000000-%';
DELETE FROM "Users"       WHERE "Id"::text LIKE 'a0000000-%';

-- ── 20 extra students ─────────────────────────────────────────────────────────
-- Password hash is the shared seed hash, so these accounts can also log in if you
-- ever need to (not required just to see them in a dropdown). Names start with
-- "Test" so you can find them by typing "Test" in a search box.
INSERT INTO "Users" (
  "Id","FirstName","LastName","Email","UserPassword",
  "IndexNumber","IsDeleted","UserRole","CreatedAt"
) VALUES
  ('a0000000-0000-0000-0000-000000000001','Test','Student01','test01@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-001-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000002','Test','Student02','test02@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-002-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000003','Test','Student03','test03@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-003-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000004','Test','Student04','test04@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-004-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000005','Test','Student05','test05@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-005-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000006','Test','Student06','test06@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-006-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000007','Test','Student07','test07@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-007-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000008','Test','Student08','test08@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-008-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000009','Test','Student09','test09@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-009-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-00000000000a','Test','Student10','test10@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-010-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-00000000000b','Test','Student11','test11@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-011-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-00000000000c','Test','Student12','test12@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-012-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-00000000000d','Test','Student13','test13@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-013-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-00000000000e','Test','Student14','test14@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-014-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-00000000000f','Test','Student15','test15@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-015-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000010','Test','Student16','test16@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-016-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000011','Test','Student17','test17@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-017-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000012','Test','Student18','test18@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-018-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000013','Test','Student19','test19@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-019-2024',false,'Student','2024-09-05T08:00:00+00'),
  ('a0000000-0000-0000-0000-000000000014','Test','Student20','test20@student.edu','AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==','PAG-020-2024',false,'Student','2024-09-05T08:00:00+00');

-- ── enroll the first 10 of them in Calculus (Smith, subject 2…0004) ───────────
INSERT INTO "Enrollments" (
  "Id","StudentId","SubjectId","IsDeleted","EnrolledAt"
) VALUES
  ('a1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004',false,'2024-10-01T08:00:00+00'),
  ('a1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000004',false,'2024-10-01T08:00:00+00'),
  ('a1000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000004',false,'2024-10-01T08:00:00+00'),
  ('a1000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004',false,'2024-10-01T08:00:00+00'),
  ('a1000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000004',false,'2024-10-01T08:00:00+00'),
  ('a1000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000004',false,'2024-10-01T08:00:00+00'),
  ('a1000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000004',false,'2024-10-01T08:00:00+00'),
  ('a1000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000004',false,'2024-10-01T08:00:00+00'),
  ('a1000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000009','20000000-0000-0000-0000-000000000004',false,'2024-10-01T08:00:00+00'),
  ('a1000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-00000000000a','20000000-0000-0000-0000-000000000004',false,'2024-10-01T08:00:00+00');

COMMIT;
