-- Interview participants: interviewers and BCC, stored as JSONB lists of
-- {"id": "...", "name": "...", "email": "..."}.
-- The interviewers are the CC recipients of the invitation email (required); BCC is optional.
--
-- NOT run automatically. Run it once against the ATS database, BEFORE starting the new backend
-- (the interviews model now selects these columns), for example in pgAdmin or:
--   psql -d <your_database> -f backend/migrations/001_interview_participants.sql
--
-- Safe to run twice. Existing interviews get empty lists ('[]').

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS interviewers JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS bcc          JSONB DEFAULT '[]'::jsonb;

-- Only if an earlier version of this file was already run and created a `cc` column
-- (the application no longer uses it). Uncomment to remove it:
--   ALTER TABLE interviews DROP COLUMN IF EXISTS cc;

-- Check afterwards:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'interviews' AND column_name IN ('interviewers', 'bcc');
