-- StudentPortal seed data for PostgreSQL.
-- Re-runnable: each execution deletes all rows (children-first, so FK
-- constraints are satisfied without CASCADE) and reinserts the same
-- 10 rows per table.
--
--   psql -U postgres -d StudentPortal -f seed.sql
--
-- All seeded users share the plaintext password: Password123!
-- The UserPassword column stores a PBKDF2-HMACSHA512 hash in the format
-- expected by PasswordHashHandler.VerifyPassword (version byte 0x01,
-- 100000 iterations, 128-bit salt, 256-bit subkey).
--
-- Fixed UUIDs are used so FKs are predictable across reruns and easy to
-- reference by eye:
--   Users        1000...-00X
--   Subjects     2000...-00X
--   Enrollments  3000...-00X
--   Grades       4000...-00X
-- (X is hex 1..a for rows 1..10.)

BEGIN;

-- Delete order matters: Grades references Enrollments, Enrollments
-- references Subjects and Users, Subjects references Users.
DELETE FROM "Grades";
DELETE FROM "Enrollments";
DELETE FROM "Subjects";
DELETE FROM "Users";

INSERT INTO "Users" ("Id", "FirstName", "LastName", "Email", "UserPassword", "IndexNumber", "IsDeleted", "UserRole") VALUES
  ('10000000-0000-0000-0000-000000000001', 'John',    'Smith',    'john.smith@uni.edu',          'AQAAAAIAAYagAAAAEMcAcDT7xDL8/O0v9b7ZQTEIGwm8Tx90O464I96PdjTGZWt1+/eF9KeNRcZCbNccYw==', NULL,          false, 'Professor'),
  ('10000000-0000-0000-0000-000000000002', 'Emily',   'Johnson',  'emily.johnson@uni.edu',       'AQAAAAIAAYagAAAAEPuml3JRgIFBLAEdfbN5RCZVj9ih80b/6nGIEcBqhKk1vBCoJi6hgJXFdKgKePPnDA==', NULL,          false, 'Professor'),
  ('10000000-0000-0000-0000-000000000003', 'Michael', 'Davis',    'michael.davis@uni.edu',       'AQAAAAIAAYagAAAAEC5oa8ga9I1lGxJg3+lnIFXNAzCjdDe+KaBR778AJZBgz9zVkcDncA/muHeXvF5Smg==', NULL,          false, 'Professor'),
  ('10000000-0000-0000-0000-000000000004', 'Admin',   'Admin',    'admin@uni.edu',               'AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==', NULL,          false, 'Admin'),
  ('10000000-0000-0000-0000-000000000005', 'Sarah',   'Wilson',   'sarah.wilson@student.edu',    'AQAAAAIAAYagAAAAEFYs++5b/7gnchHZ9/9SZ7h7Ii9qyuQXNOBD4j8jSu5eI6hNSYhG0jAij+6klaSo9Q==', 'SW-01-2024',  false, 'Student'),
  ('10000000-0000-0000-0000-000000000006', 'David',   'Brown',    'david.brown@student.edu',     'AQAAAAIAAYagAAAAENdyz/qCTUw4UqhZ01kVz6jcnGIlpBDu5Bx2b+Nz67LtkbWnQTqOrGC49GeI723Krg==', 'SW-02-2024',  false, 'Student'),
  ('10000000-0000-0000-0000-000000000007', 'Jessica', 'Taylor',   'jessica.taylor@student.edu',  'AQAAAAIAAYagAAAAEHuZ4CHdD9Kx7/95v/jQQ/97xAHj2UxFOSxCqRio7pPCvtVgP5GPNs9f/MOgwdYiZQ==', 'SW-03-2024',  false, 'Student'),
  ('10000000-0000-0000-0000-000000000008', 'Daniel',  'Anderson', 'daniel.anderson@student.edu', 'AQAAAAIAAYagAAAAENAtPUKcqPV6URC7R+BOCMinvZG5uV7tbx0wN6b54e6KtTSvoPBQb1qY2iV9c1Pm5g==', 'SW-04-2024',  false, 'Student'),
  ('10000000-0000-0000-0000-000000000009', 'Olivia',  'Martin',   'olivia.martin@student.edu',   'AQAAAAIAAYagAAAAEJZ666SFKzHzY2LryZoXRQGmTkESaNHYbWDdbNs564yUrSeN0u+0CEhCft4l601gcg==', 'SW-05-2024',  false, 'Student'),
  ('10000000-0000-0000-0000-00000000000a', 'James',   'Thompson', 'james.thompson@student.edu',  'AQAAAAIAAYagAAAAEFfZc8HmlOoklk2l1LiTO/ielMc5EZtDTZzpmMWubyBuihBDgMuiRIdTYyv5G9niFw==', 'SW-06-2024',  false, 'Student');

INSERT INTO "Subjects" ("Id", "SubjectName", "ECTS", "ProfessorId", "IsDeleted") VALUES
  ('20000000-0000-0000-0000-000000000001', 'Mathematics 1',            8, '10000000-0000-0000-0000-000000000001', false),
  ('20000000-0000-0000-0000-000000000002', 'Programming Fundamentals', 7, '10000000-0000-0000-0000-000000000002', false),
  ('20000000-0000-0000-0000-000000000003', 'Data Structures',          7, '10000000-0000-0000-0000-000000000002', false),
  ('20000000-0000-0000-0000-000000000004', 'Database Systems',         6, '10000000-0000-0000-0000-000000000001', false),
  ('20000000-0000-0000-0000-000000000005', 'Operating Systems',        6, '10000000-0000-0000-0000-000000000003', false),
  ('20000000-0000-0000-0000-000000000006', 'Computer Networks',        5, '10000000-0000-0000-0000-000000000003', false),
  ('20000000-0000-0000-0000-000000000007', 'Software Engineering',     7, '10000000-0000-0000-0000-000000000002', false),
  ('20000000-0000-0000-0000-000000000008', 'Web Development',          5, '10000000-0000-0000-0000-000000000002', false),
  ('20000000-0000-0000-0000-000000000009', 'Algorithms',               7, '10000000-0000-0000-0000-000000000001', false),
  ('20000000-0000-0000-0000-00000000000a', 'Discrete Mathematics',     6, '10000000-0000-0000-0000-000000000001', false);

-- Each (StudentId, SubjectId) pair is unique per the UQ index.
INSERT INTO "Enrollments" ("Id", "StudentId", "SubjectId", "IsDeleted") VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', false),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', false),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', false),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', false),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', false),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000004', false),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000005', false),
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000006', false),
  ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000007', false),
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000008', false);

-- Grade values stay in [5..10] per the CK_Grades_Grade_Range constraint.
INSERT INTO "Grades" ("Id", "EnrollmentId", "Grade", "Comment", "IsConfirmed", "IsDeleted") VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 9,  'Excellent work.',      true,  false),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 8,  NULL,                   true,  false),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 7,  'Good first attempt.',  false, false),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 10, NULL,                   true,  false),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', 6,  NULL,                   true,  false),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006', 8,  'Needs more practice.', true,  false),
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000007', 9,  NULL,                   false, false),
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000008', 5,  'Barely passing.',      true,  false),
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000009', 7,  NULL,                   true,  false),
  ('40000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 10, 'Perfect exam!',        true,  false);

COMMIT;
