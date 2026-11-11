-- StudentPortal DEV-ONLY volume fixture — manual performance testing at scale.
--
--   RUN ORDER:  psql -f seed.sql   then   psql -f seed-dev-volume.sql
--
--   psql -U postgres -d StudentPortal -f backend/StudentPortal/Migrations/seed-dev-volume.sql
--
-- WHY A SEPARATE FILE (do NOT merge these rows into seed.sql):
--   seed.sql replays before EVERY integration test (Tech-Backend §7), and several
--   tests assert exact seed counts — AdminUserSearchTests expects "seed has 10
--   students", AdminSubjectSearchTests "15 subjects", AdminPaginationTests fixed
--   totals. Adding students to seed.sql breaks the suite. These rows DID live in
--   seed.sql for a while and did exactly that: AdminUserSearchTests
--   Search_RoleStudent_ReturnsOnlyStudents and Search_EmptyQuery_ReturnsPaginatedAll
--   both failed with TotalCount = 100010 instead of 10, and every one of the 190
--   tests paid for a 100 000-row insert, taking the suite from seconds to 3m12s.
--   This file is for manual (human-in-the-browser) measurement only; the
--   integration-test fixture loads seed.sql by exact path and never touches this
--   file. Same rule and reason as seed-dev-pagination.sql and seed-dev-escalations.sql.
--
-- WHAT IT ADDS (layered on top of seed.sql):
--   * 100 000 extra active students (ids b0000000-…-000000000001 … -000000100000)
--       Index numbers BLK-0000001 … BLK-0100000, emails student<i>@test.edu.
--       All share the seed password hash (Password123!), so any of them can log in.
--
-- WHAT IT IS FOR:
--   Measuring the Users-table read paths at volume — the admin Users list
--   (GET /api/User) and the admin user search (GET /api/User/search), whose
--   leading-wildcard ILIKE cannot use a btree index (DB §6.5, D-034). Run
--   EXPLAIN ANALYZE against those queries with this fixture loaded before deciding
--   whether a pg_trgm/GIN index is justified — D-034 requires that evidence and
--   forbids adding the index speculatively.
--
-- WHAT IT DOES NOT EXERCISE:
--   These students have NO enrollments, grades, drafts or appeals, so they do not
--   touch the student or professor dashboards, the escalation candidate query, or
--   earned-ECTS. Volume for those paths needs its own fixture; do not assume this
--   one covers them.
--
-- ADJUSTING THE VOLUME: change the single generate_series bound below. Nothing
-- else depends on the count.
--
-- Re-runnable: it deletes its own rows (by fixed id range) before reinserting, so
-- you can run it as many times as you like.
--
-- Depends on nothing in seed.sql — the rows are standalone Users.
--
-- Takes roughly a second or two on a local Postgres; the id prefix b0000000- is
-- reserved for this file and collides with no hand-crafted row.

BEGIN;

-- ── clean up a previous run ───────────────────────────────────────────────────
-- No child rows exist (these students are never enrolled), so Users alone is enough.
DELETE FROM "Users" WHERE "Id"::text LIKE 'b0000000-%';

-- ── 100 000 extra students ────────────────────────────────────────────────────
INSERT INTO "Users" (
  "Id","FirstName","LastName","Email","UserPassword",
  "IndexNumber","IsDeleted","UserRole","CreatedAt"
)
SELECT
  ('b0000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  'Student' || i,
  'Test' || i,
  'student' || i || '@test.edu',
  'AQAAAAIAAYagAAAAEKIzF5k/n5N0AMPcPu5bjZuhTcSTcONR3e3G65CFMs4dEBCjUT4xLAfIZ4MP0d5b0w==',
  'BLK-' || lpad(i::text, 7, '0'),
  false,
  'Student',
  '2024-09-05T08:00:00+00'
FROM generate_series(1, 100000) AS s(i);

COMMIT;
