-- Adds 'Hired' to the application_stage enum (same change as alembic migration 010_add_hired_stage).
-- Run it yourself in pgAdmin / psql. It is safe to run more than once.
--
-- Run this statement ON ITS OWN (not inside BEGIN ... COMMIT) and run the SELECT below separately:
-- PostgreSQL does not let a new enum value be used in the same transaction that adds it.

ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'Hired' AFTER 'Offer';

-- Check (expect: New, Shortlisted, Interviewing, Rejected, Offer, Hired):
-- SELECT e.enumlabel
-- FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
-- WHERE t.typname = 'application_stage'
-- ORDER BY e.enumsortorder;

-- Only if you use alembic: afterwards run `alembic stamp 010_add_hired_stage`, so alembic knows this is done
-- (otherwise `alembic upgrade head` runs the same statement again, which is harmless because of IF NOT EXISTS).
