-- ATS database schema for PostgreSQL (run in pgAdmin's Query Tool on an EMPTY database).
-- Generated from backend/alembic/versions (001 -> 006) plus the catch-up block below.
-- Creates the alembic_version table stamped at 006_salted_password_hashing, so a later
-- "alembic upgrade head" is a no-op. Single transaction: if any statement fails, nothing is applied.

BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 001_initial_phase1a_schema

CREATE TABLE users (
    id VARCHAR NOT NULL, 
    email VARCHAR NOT NULL, 
    "fullName" VARCHAR, 
    role VARCHAR, 
    department VARCHAR, 
    "employeeId" VARCHAR, 
    "avatarUrl" VARCHAR, 
    status VARCHAR, 
    "lastLogin" VARCHAR, 
    "createdAt" VARCHAR, 
    "updatedAt" VARCHAR, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_users_id ON users (id);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE jobs (
    id VARCHAR NOT NULL, 
    "jobId" VARCHAR NOT NULL, 
    title VARCHAR NOT NULL, 
    department VARCHAR, 
    location VARCHAR, 
    type VARCHAR, 
    "workMode" VARCHAR, 
    "experienceRange" VARCHAR, 
    "experienceLevel" VARCHAR, 
    "salaryRange" VARCHAR, 
    "maxBudget" FLOAT, 
    openings INTEGER, 
    description TEXT, 
    responsibilities JSON, 
    requirements JSON, 
    "preferredSkills" JSON, 
    education VARCHAR, 
    benefits JSON, 
    status VARCHAR, 
    "hiringManager" VARCHAR, 
    recruiter VARCHAR, 
    deadline VARCHAR, 
    "targetJoiningDate" VARCHAR, 
    "customFields" JSON, 
    "publicApplicationInfo" JSON, 
    "createdAt" VARCHAR, 
    "updatedAt" VARCHAR, 
    "createdBy" VARCHAR, 
    PRIMARY KEY (id), 
    FOREIGN KEY("createdBy") REFERENCES users (id)
);

CREATE INDEX ix_jobs_id ON jobs (id);

CREATE UNIQUE INDEX "ix_jobs_jobId" ON jobs ("jobId");

CREATE INDEX ix_jobs_title ON jobs (title);

CREATE TABLE candidates (
    id VARCHAR NOT NULL, 
    "candidateId" VARCHAR, 
    "jobId" VARCHAR, 
    "firstName" VARCHAR, 
    "lastName" VARCHAR, 
    email VARCHAR, 
    phone VARCHAR, 
    "currentRole" VARCHAR, 
    "currentCompany" VARCHAR, 
    skills JSON, 
    "experienceYears" FLOAT, 
    "resumeText" TEXT, 
    "linkedinUrl" VARCHAR, 
    "avatarUrl" VARCHAR, 
    source VARCHAR, 
    location VARCHAR, 
    "expectedCTC" FLOAT, 
    "currentCTC" FLOAT, 
    "hrNotes" TEXT, 
    "hrApprovalStatus" VARCHAR, 
    "customFields" JSON, 
    "experienceLevel" VARCHAR, 
    "noticePeriod" VARCHAR, 
    "portfolioUrl" VARCHAR, 
    "highestEducation" VARCHAR, 
    specialization VARCHAR, 
    "yearOfPassing" VARCHAR, 
    "totalExperience" VARCHAR, 
    "keySkills" VARCHAR, 
    "inHandSalary" VARCHAR, 
    "projectsWorkedOn" TEXT, 
    "relocateToPune" VARCHAR, 
    "createdAt" VARCHAR, 
    "updatedAt" VARCHAR, 
    "createdBy" VARCHAR, 
    status VARCHAR, 
    "aiScore" INTEGER, 
    timeline JSON, 
    PRIMARY KEY (id), 
    FOREIGN KEY("jobId") REFERENCES jobs (id)
);

CREATE INDEX ix_candidates_id ON candidates (id);

CREATE INDEX "ix_candidates_candidateId" ON candidates ("candidateId");

CREATE INDEX ix_candidates_email ON candidates (email);

CREATE TABLE applications (
    id VARCHAR NOT NULL, 
    "applicationId" VARCHAR, 
    "candidateId" VARCHAR NOT NULL, 
    "jobId" VARCHAR NOT NULL, 
    status VARCHAR, 
    source VARCHAR, 
    "atsScore" INTEGER, 
    "appliedRole" VARCHAR, 
    department VARCHAR, 
    "candidateEmail" VARCHAR, 
    "candidateName" VARCHAR, 
    notes TEXT, 
    "createdAt" VARCHAR, 
    "updatedAt" VARCHAR, 
    PRIMARY KEY (id), 
    FOREIGN KEY("candidateId") REFERENCES candidates (id), 
    FOREIGN KEY("jobId") REFERENCES jobs (id)
);

CREATE INDEX ix_applications_id ON applications (id);

CREATE UNIQUE INDEX "ix_applications_applicationId" ON applications ("applicationId");

CREATE INDEX "ix_applications_candidateId" ON applications ("candidateId");

CREATE INDEX "ix_applications_jobId" ON applications ("jobId");

CREATE TABLE interviews (
    id VARCHAR NOT NULL, 
    "candidateId" VARCHAR NOT NULL, 
    "jobId" VARCHAR NOT NULL, 
    "applicationId" VARCHAR, 
    "candidateName" VARCHAR, 
    "candidateEmail" VARCHAR, 
    "jobTitle" VARCHAR, 
    round VARCHAR, 
    date VARCHAR, 
    time VARCHAR, 
    interviewer VARCHAR,
    interviewers JSONB DEFAULT '[]'::jsonb,
    bcc JSONB DEFAULT '[]'::jsonb,
    status VARCHAR,
    "meetingLink" VARCHAR, 
    feedback TEXT, 
    "technicalScore" FLOAT, 
    "communicationScore" FLOAT, 
    "createdAt" VARCHAR, 
    "updatedAt" VARCHAR, 
    PRIMARY KEY (id), 
    FOREIGN KEY("applicationId") REFERENCES applications (id), 
    FOREIGN KEY("candidateId") REFERENCES candidates (id), 
    FOREIGN KEY("jobId") REFERENCES jobs (id)
);

CREATE INDEX ix_interviews_id ON interviews (id);

CREATE INDEX "ix_interviews_candidateId" ON interviews ("candidateId");

CREATE INDEX "ix_interviews_jobId" ON interviews ("jobId");

CREATE TABLE offers (
    id VARCHAR NOT NULL, 
    "candidateId" VARCHAR NOT NULL, 
    "jobId" VARCHAR NOT NULL, 
    "applicationId" VARCHAR, 
    "candidateName" VARCHAR, 
    "candidateEmail" VARCHAR, 
    "jobTitle" VARCHAR, 
    department VARCHAR, 
    "offeredCTC" FLOAT, 
    "joiningDate" VARCHAR, 
    status VARCHAR, 
    "workflowStage" VARCHAR, 
    "contractTemplate" VARCHAR, 
    "customTerms" TEXT, 
    "createdAt" VARCHAR, 
    "updatedAt" VARCHAR, 
    PRIMARY KEY (id), 
    FOREIGN KEY("applicationId") REFERENCES applications (id), 
    FOREIGN KEY("candidateId") REFERENCES candidates (id), 
    FOREIGN KEY("jobId") REFERENCES jobs (id)
);

CREATE INDEX ix_offers_id ON offers (id);

CREATE INDEX "ix_offers_candidateId" ON offers ("candidateId");

CREATE TABLE notifications (
    id VARCHAR NOT NULL, 
    "userId" VARCHAR, 
    title VARCHAR NOT NULL, 
    message TEXT, 
    type VARCHAR, 
    "isRead" BOOLEAN NOT NULL, 
    "candidateName" VARCHAR, 
    "jobTitle" VARCHAR, 
    "createdAt" VARCHAR, 
    PRIMARY KEY (id), 
    FOREIGN KEY("userId") REFERENCES users (id)
);

CREATE INDEX ix_notifications_id ON notifications (id);

CREATE TABLE email_templates (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    subject VARCHAR NOT NULL, 
    body TEXT NOT NULL, 
    category VARCHAR, 
    variables JSON, 
    "createdAt" VARCHAR, 
    "updatedAt" VARCHAR, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_email_templates_id ON email_templates (id);

CREATE INDEX ix_email_templates_name ON email_templates (name);

CREATE TABLE sent_emails (
    id VARCHAR NOT NULL, 
    "toEmail" VARCHAR NOT NULL, 
    "toName" VARCHAR, 
    subject VARCHAR NOT NULL, 
    body TEXT NOT NULL, 
    "sentAt" VARCHAR, 
    status VARCHAR, 
    "candidateId" VARCHAR, 
    "jobId" VARCHAR, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_sent_emails_id ON sent_emails (id);

CREATE TABLE system_tokens (
    id VARCHAR NOT NULL, 
    "tokenType" VARCHAR NOT NULL, 
    "accessToken" TEXT, 
    "refreshToken" TEXT, 
    "expiryDate" BIGINT, 
    "updatedAt" VARCHAR, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_system_tokens_id ON system_tokens (id);

INSERT INTO alembic_version (version_num) VALUES ('001_initial_phase1a_schema') RETURNING alembic_version.version_num;

-- Running upgrade 001_initial_phase1a_schema -> 002_phase1d_schema

DROP INDEX IF EXISTS "ix_candidates_candidateId";

CREATE UNIQUE INDEX "ix_candidates_candidateId" ON candidates ("candidateId");

DROP INDEX IF EXISTS ix_candidates_email;

CREATE UNIQUE INDEX ix_candidates_email ON candidates (email);

DROP INDEX IF EXISTS "ix_applications_applicationId";

CREATE UNIQUE INDEX "ix_applications_applicationId" ON applications ("applicationId");

ALTER TABLE applications ADD CONSTRAINT uq_candidate_job_application UNIQUE ("candidateId", "jobId");

UPDATE alembic_version SET version_num='002_phase1d_schema' WHERE alembic_version.version_num = '001_initial_phase1a_schema';

-- Running upgrade 002_phase1d_schema -> 003_phase2d_talent_pool

CREATE TABLE talent_pool (
    id VARCHAR NOT NULL, 
    "candidateId" VARCHAR NOT NULL, 
    "currentRole" VARCHAR, 
    "currentCompany" VARCHAR, 
    skills JSON, 
    "experienceYears" FLOAT, 
    location VARCHAR, 
    "aiMatchScore" FLOAT, 
    availability VARCHAR, 
    "noticePeriod" VARCHAR, 
    status VARCHAR DEFAULT 'Available', 
    department VARCHAR, 
    education JSON, 
    tags JSON, 
    "aiSummary" TEXT, 
    certifications JSON, 
    projects JSON, 
    "recruitmentHistory" JSON, 
    "recruiterNotes" TEXT, 
    "createdAt" VARCHAR, 
    "updatedAt" VARCHAR, 
    PRIMARY KEY (id), 
    UNIQUE ("candidateId"), 
    FOREIGN KEY("candidateId") REFERENCES candidates (id)
);

CREATE INDEX ix_talent_pool_id ON talent_pool (id);

CREATE UNIQUE INDEX "ix_talent_pool_candidateId" ON talent_pool ("candidateId");

UPDATE alembic_version SET version_num='003_phase2d_talent_pool' WHERE alembic_version.version_num = '002_phase1d_schema';

-- Running upgrade 003_phase2d_talent_pool -> 004_phase2h_resume_storage

ALTER TABLE candidates ADD COLUMN "resumeFileName" VARCHAR;

ALTER TABLE candidates ADD COLUMN "resumeStorageKey" VARCHAR;

ALTER TABLE candidates ADD COLUMN "resumeUploadedAt" VARCHAR;

UPDATE alembic_version SET version_num='004_phase2h_resume_storage' WHERE alembic_version.version_num = '003_phase2d_talent_pool';

-- Running upgrade 004_phase2h_resume_storage -> 005_user_management_reports

ALTER TABLE users ADD COLUMN "avatarColor" VARCHAR;

ALTER TABLE users ADD COLUMN designation VARCHAR;

ALTER TABLE users ADD COLUMN manager VARCHAR;

ALTER TABLE users ADD COLUMN "changePasswordOnFirstLogin" BOOLEAN DEFAULT false;

CREATE TABLE report_schedules (
    id VARCHAR NOT NULL, 
    frequency VARCHAR DEFAULT 'Weekly' NOT NULL, 
    format VARCHAR DEFAULT 'PDF' NOT NULL, 
    emails VARCHAR DEFAULT '' NOT NULL, 
    department VARCHAR DEFAULT 'All Departments', 
    status VARCHAR DEFAULT 'Active', 
    "lastSent" VARCHAR DEFAULT 'Never', 
    "createdAt" VARCHAR, 
    "updatedAt" VARCHAR, 
    "createdBy" VARCHAR, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_report_schedules_id ON report_schedules (id);

UPDATE alembic_version SET version_num='005_user_management_reports' WHERE alembic_version.version_num = '004_phase2h_resume_storage';

-- ---------------------------------------------------------------------------
-- Catch-up: columns and constraints the application models require that no
-- Alembic migration creates. The app previously got them from
-- Base.metadata.create_all() and startup ALTERs (database.py,
-- migrate_total_experience.py). Idempotent, and placed before 006 because 006
-- updates users."passwordHash", which migration 001 never created.
-- ---------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR;

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR;

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR;

ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS "totalExperienceMonths" INTEGER DEFAULT 0;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS "aiEvaluation" JSON;

ALTER TABLE applications ALTER COLUMN "jobId" DROP NOT NULL;

ALTER TABLE interviews ALTER COLUMN "jobId" DROP NOT NULL;

ALTER TABLE offers ALTER COLUMN "jobId" DROP NOT NULL;

ALTER TABLE candidates ALTER COLUMN "candidateId" SET NOT NULL;

ALTER TABLE candidates ALTER COLUMN email SET NOT NULL;

ALTER TABLE applications ALTER COLUMN "applicationId" SET NOT NULL;

-- Running upgrade 005_user_management_reports -> 006_salted_password_hashing

ALTER TABLE users ADD COLUMN "passwordSalt" VARCHAR;

UPDATE users SET "passwordHash" = NULL;

UPDATE alembic_version SET version_num='006_salted_password_hashing' WHERE alembic_version.version_num = '005_user_management_reports';

COMMIT;

