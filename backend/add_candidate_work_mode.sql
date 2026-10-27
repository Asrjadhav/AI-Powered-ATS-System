-- Adds the candidate's preferred Work Mode (same change as alembic migration 011_candidate_preferred_work_mode).
-- Run it yourself (pgAdmin / psql) BEFORE using the new backend code: the candidates table needs this column.
-- Safe to run more than once. Existing candidates keep NULL (shown as "not specified").
--
-- It is the CANDIDATE's preference: 'Work from Office', 'Hybrid' or 'Work from Home'.
-- The job's own work mode stays in jobs."workMode" (Remote / Hybrid / On-site) and is not touched.

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS "preferredWorkMode" VARCHAR;

-- Check:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'candidates' AND column_name = 'preferredWorkMode';

-- Only if you use alembic: afterwards run `alembic stamp 011_candidate_preferred_work_mode`.
