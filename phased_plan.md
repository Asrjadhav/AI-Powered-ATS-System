# ATS Project: Review Findings & Phased Improvement Plan

Source: full project review (diagnosis only; no files, data or migrations were changed).

## How this was reviewed

- **Method:** reading code, `schema.sql`, Alembic migrations and git history.
- **Not done:** no tests, no server run, no live DB access, no `.env` values read.
- **Not verified:** live data, SMTP/Gemini/Render configuration, production behavior.
- **"Confirmed"** means the exact code was read; file links point at the evidence.

## Status of work already done (context)

| Item | State |
|---|---|
| Google Meet link creation on "Schedule Session" (service account + domain-wide delegation) | Implemented. 15 mocked tests pass. **Not run against real Google.** No update/cancel sync, no invites. |
| `GET /api/applications` 500 when `jobId` is NULL | Fixed in code (`schemas/application.py`, 2 frontend fallbacks). 3 no-DB tests pass. **Not run against the real DB.** |
| Same NULL-`jobId` bug in interviews and offers | **Not fixed** (see H4). |

---

## Findings

### Critical

**C1. No authentication or authorization anywhere**
- None of the 86 routes has an auth dependency (no `get_current_user`, JWT or bearer check).
- Login returns `bearer-token-<uuid>` ([routers/auth.py:162](backend/routers/auth.py#L162)); nothing verifies it.
- Anyone who knows the URL can read all candidate PII and resumes, create or delete users, change roles, delete data and call AI endpoints.
- The frontend role check is cosmetic ([IntegrationsView.tsx](src/components/IntegrationsView.tsx): "dummy role-based check").
- **Fix:** signed, expiring tokens verified server-side; role checks on every router.

**C2. Account takeover paths** (all in [routers/auth.py](backend/routers/auth.py))
- `login` auto-creates an admin ("Lead Recruiting Admin") for any unknown email and password ([111-136](backend/routers/auth.py#L111-L136)).
- Accounts with no `passwordHash` adopt the first password entered ([141-147](backend/routers/auth.py#L141-L147)). That covers accounts seeded from `users_db.json` ([seed_users.py](backend/seed_users.py)) and anyone created through the open `POST /users`.
- Unauthenticated `POST /auth/update-profile` can change any user's role, email and password ([198-247](backend/routers/auth.py#L198-L247)); the current-password check only applies if a hash exists.
- `forgot-password` and `reset-password` report success without doing anything ([183-196](backend/routers/auth.py#L183-L196)).
- **Fix:** invitation / set-password tokens, no auto-create, authenticated admin-only profile and user endpoints, real password reset or remove the UI.

**C3. Two tests send a real DELETE to production when `pytest` runs**
- [test_live_and_prod_job_delete.py:32](backend/tests/test_live_and_prod_job_delete.py#L32) and [test_prod_browser_delete_simulation.py](backend/tests/test_prod_browser_delete_simulation.py) delete `https://ats-fastapi-backend.onrender.com/api/jobs/JOB-0004`.
- `delete_job` nulls `jobId` on all linked applications, candidates, interviews and offers ([job_service.py:216-220](backend/services/job_service.py#L216-L220)). This is the likeliest origin of the NULL-`jobId` rows behind the earlier 500; [restore_job_0004.py](backend/restore_job_0004.py) suggests it already happened.
- **Fix:** delete these tests or guard them behind an explicit env flag. They must never run by default.

### High

**H1. Failed or unconfigured emails are recorded as sent**
- `send_email` returns `True` when SMTP isn't configured ([email_service.py:30-35](backend/services/email_service.py#L30-L35)).
- The caller sets `rejectionEmailSent = True` without checking the result ([application_service.py:866-873](backend/services/application_service.py#L866-L873)); that flag blocks any retry, so rejected candidates may never be told.

**H2. ATS scoring is inconsistent and unsafe**
- **Three thresholds:** backend default 50 with strict `>` ([application_service.py:800,809](backend/services/application_service.py#L800)); frontend default 80 ([CandidatesView.tsx:247](src/components/CandidatesView.tsx#L247)); tests/commits/docs say 70 using `>=`.
- **Test proves nothing:** the "70% workflow" test re-implements the logic rather than calling production code, and pytest doesn't collect it ([test_ats_70_percent_workflow.py:85-112](backend/tests/test_ats_70_percent_workflow.py#L85-L112)).
- **Score depends on Gemini availability:** any Gemini error silently falls back to a different heuristic engine ([450-451](backend/services/application_service.py#L450-L451)); the model is hardcoded `gemini-2.5-flash` ([441](backend/services/application_service.py#L441)), ignoring `config.GEMINI_MODEL`.
- **Prompt injection:** raw resume text goes into the prompt ([405](backend/services/application_service.py#L405)) and the result auto-shortlists or auto-rejects and emails.
- **Re-screening overwrites the stage unconditionally** ([809-824](backend/services/application_service.py#L809-L824)): Interviewing/Offer candidates drop back; an application whose job was deleted is scored against an empty job description and can be auto-rejected and emailed.
- **Synchronous screening inside `POST /applications`**, no Gemini timeout ([182](backend/services/application_service.py#L182)).
- The earlier `test_phase1d` failure (87 expected, 30 returned) is consistent with this drift.

**H3. The UI shows invented data as if real**
- Made-up ATS scores for unscored applications: `?? 75` / `?? 85` ([applicationRepository.ts:48](src/repositories/applicationRepository.ts#L48), [ApplicationsView.tsx:102](src/components/ApplicationsView.tsx#L102), [CandidatesView.tsx:2442,3808](src/components/CandidatesView.tsx#L2442)).
- [IntegrationsView.tsx:67-126, 278-292](src/components/IntegrationsView.tsx#L67): ~15 hardcoded "connected" services; "Test connection" is `Math.random() > 0.15`.
- "Email dispatched successfully" only writes to localStorage ([emailRepository.ts](src/repositories/emailRepository.ts), [EmailTemplatesView.tsx:520](src/components/EmailTemplatesView.tsx#L520)), with a fake Meet link and hardcoded recruiter name.
- Job syndication in [JobsView.tsx](src/components/JobsView.tsx) is simulated.
- Report schedules are stored but nothing sends them (the service docstring admits it).

**H4. Interview/offer data-integrity bugs** ([interview_service.py](backend/services/interview_service.py))
- `delete_interview` also matches `candidateName ILIKE %id%` ([554-563](backend/services/interview_service.py#L554)): `DELETE /interviews/ab` deletes every interview whose candidate name contains "ab".
- `get_interview_by_id` falls back to `candidateId`/`applicationId` with `.first()` ([19-34](backend/services/interview_service.py#L19)): update/cancel/feedback can hit the wrong round.
- Four functions are defined twice; the first copies (132-306) are dead code. The live `create_interview` auto-creates candidates and falls back to the first job.
- `GET /interviews` writes placeholder interviews ("today 14:00") for any candidate in Interviewing ([36-98](backend/services/interview_service.py#L36)).
- `InterviewBase.jobId` and `OfferBase.jobId` are required strings, so `GET /interviews` and the offers list return 500 for rows whose job was deleted (same bug fixed for applications).

**H5. `delete_candidate` is unsafe** ([candidate_service.py:457-547](backend/services/candidate_service.py#L457))
- Resume files are deleted before the DB commit; if the commit fails they are gone.
- Hard delete of PII, offers and interviews with no audit trail; returns success for ids that don't exist.

**H6. Public apply weaknesses**
- Applying with an existing candidate's email overwrites their profile from unauthenticated input ([candidate_service.py:309-321](backend/services/candidate_service.py#L309)).
- No CAPTCHA or rate limit on the apply form or AI endpoints (job import, template AI, resume parsing): abuse and Gemini-cost risk.
- `except Exception: pass` after candidate creation silently drops application failures ([339, 393](backend/services/candidate_service.py#L339)).
- The browser runs create-candidate → create-application → screen as three non-atomic calls, with a `"JOB-0001"` fallback ([candidateRepository.ts:170](src/repositories/candidateRepository.ts#L170)).

**H7. Credentials in the repo**
- `users_db.json` is tracked in git with a `passwordHash` field for 4 users (the seed code calls them legacy unsalted hashes).
- Checked in history: `.env`, `backend/.env` and `google_oauth_token.json` were never committed.

### Medium

- **M1. Migrations are broken.**
  - `007_rename_application_stage_values` revises a nonexistent `007_application_stage_enum`; 008's docstring says it is revision 007; the Alembic CLI cannot load.
  - [schema.sql](backend/schema.sql) stops at 006.
  - On a fresh DB the model uses `create_type=False` and `create_all` failures are swallowed ([main.py:11-15](backend/main.py#L11)).
  - Migration 008 remapped legacy `Offered`/`Hired` rows to `New`.
- **M2. Platform hygiene.**
  - [database.py:22-23](backend/database.py#L22) silently falls back to in-memory SQLite (the app boots "healthy" on a throwaway DB; this happened with the `ats` venv).
  - `load_dotenv(override=True)` overrides real environment variables.
  - `requirements.txt` is unpinned (SQLAlchemy 2.1 broke the venv); two JS lockfiles exist.
  - Migrations and seeds run at import time.
- **M3. Performance.** `GET /candidates` is unbounded with 2 extra queries per candidate ([candidate_service.py:149-264](backend/services/candidate_service.py#L149)) and returns full resume text; no pagination anywhere.
- **M4. Resume handling.**
  - Extension-only validation; allowed types differ between `candidate_service` (pdf/docx/txt) and `file_storage_service` (pdf/docx/doc).
  - Local-disk storage on an ephemeral host, with a fallback that stores base64 files inside `customFields` JSON.
  - Resumes are served inline with no auth.
- **M5. Login lookup uses `ILIKE`** ([auth.py:107, 201](backend/routers/auth.py#L107)): `_` and `%` act as wildcards and can match a different user. No lockout or rate limit; tokens never expire.
- **M6. XSS sink:** [CandidatesView.tsx:4511](src/components/CandidatesView.tsx#L4511) renders `log.body` with `dangerouslySetInnerHTML`, no sanitizer; candidate-supplied names flow into those email bodies (data source is browser-local logs).
- **M7. Status denormalization:** `candidate.status` mirrors the latest application's status ([application_service.py:229-234](backend/services/application_service.py#L229)); with several applications per candidate, one overwrites the others.
- **M8. Hardcoded names:** rejection email signs off as "Aditi Jadhav"/"EncureIT Talent AI" ([email_service.py](backend/services/email_service.py)); the UI shows a fake sender `aura-hiring@acme-corp.io`.

### Low / housekeeping

- Hardcoded OAuth client ID literal in [firebaseAuth.ts:30](src/lib/firebaseAuth.ts#L30) (public identifier).
- `tsconfig` has `strict` off; several components exceed 2,000 lines ([CandidatesView.tsx](src/components/CandidatesView.tsx) is 5,913).
- **Tests:** 21 of 34 test files collect no tests; no `conftest`, no CI, no test DB.
- **Deployment:** no Dockerfile, `render.yaml` or CI config in the repo; CORS includes localhost origins.
- **Leftovers:** Express remnants (`PORT=3000`, `get_apps.js`, `restart.js`, `delete_app.patch`); dates stored as strings throughout.

### Missing features

Real authentication and roles, password reset, audit log, data retention/deletion policy, pagination, a report scheduler, real integrations (or honest "not available" labels), email delivery tracking, Google Calendar update/cancel sync (deliberately not built).

---

## Phased plan

Rule for all phases: no change touches the database or `.env` values without explicit approval; schema changes are delivered as SQL for you to run.

### Phase 0: Immediate safety (no code risk; owner: you)
- [ ] Stop `pytest` from reaching production: delete or guard the two prod tests (C3).
- [ ] Decide whether the committed hashes in `users_db.json` need purging from git history (H7).
- [ ] Review production users for unexpected admin accounts (C2).
- [ ] Check production for NULL-`jobId` rows: `SELECT id FROM applications WHERE "jobId" IS NULL;` (same for `interviews`, `offers`).
- [ ] Confirm SMTP is configured in production and decide the real `ATS_MATCH_THRESHOLD` (H1, H2).

### Phase 1: Security
- [ ] Signed, expiring tokens verified by a server-side dependency; role checks on every router (C1).
- [ ] Remove auto-create-on-login and first-login password adoption; use invitation / set-password tokens (C2).
- [ ] Authenticate and admin-restrict `/users` and `/auth/update-profile`; real password reset or remove the UI (C2).
- [ ] Replace `ILIKE` email lookups with exact lowercase comparison; add login rate limit/lockout (M5).
- [ ] CAPTCHA and rate limits on the public apply form and AI endpoints (H6).
- [ ] Authenticate resume and candidate-PII endpoints (C1, M4).

### Phase 2: Data integrity
- [ ] Make `jobId` optional in interview and offer response schemas, mirroring the applications fix (H4).
- [ ] Fix `delete_interview` (exact id only) and `get_interview_by_id` (no candidate/application fallback); remove the dead duplicate functions (H4).
- [ ] Stop `GET /interviews` from writing placeholder rows (H4).
- [ ] `delete_candidate`: commit the DB first, then delete files; consider soft delete and an audit log; return 404 for unknown ids (H5).
- [ ] Replace the silent `except: pass` blocks with logged, surfaced failures; stop overwriting an existing candidate's profile from public input (H6).
- [ ] Make "email sent" truthful: honor the send result and record failures (H1).
- [ ] Decide how candidate status relates to multiple applications (M7).

### Phase 3: ATS correctness
- [ ] One threshold source and one comparison rule (`>=` or `>`), shared by backend, frontend and tests (H2).
- [ ] One screening code path; model from `config.GEMINI_MODEL`; request timeout; record which engine produced each score (H2).
- [ ] Run screening in the background instead of inside `POST /applications` (H2).
- [ ] Guard stage regression: don't re-stage Interviewing/Offer applications; don't auto-reject applications without a job (H2).
- [ ] Prompt-injection hardening: delimited inputs, strict output validation, score sanity checks (H2).
- [ ] Replace the re-implementing "70%" test with tests that call the real functions (H2).

### Phase 4: Honest UI
- [ ] Remove fabricated scores, emails, dates and job defaults; show "not scored yet" (H3).
- [ ] Mark unbuilt integrations "Not available"; remove the random "Test connection" (H3).
- [ ] Either build real email sending or stop labelling localStorage writes as "sent" (H3).
- [ ] Sanitize or stop using `dangerouslySetInnerHTML` for email bodies (M6).
- [ ] Remove hardcoded recruiter and company names (M8).

### Phase 5: Platform and quality
- [ ] Repair the Alembic chain or establish a fresh baseline; refresh `schema.sql` (M1).
- [ ] Remove the silent SQLite fallback; stop `override=True` on `load_dotenv`; pin dependencies; keep one JS lockfile (M2).
- [ ] Pagination and N+1 fixes for candidates, applications and interviews (M3).
- [ ] Resume storage: validate content, not only the extension; unify allowed types; durable storage instead of local disk and DB base64 (M4).
- [ ] CI with a `conftest` and an isolated test database; convert script-style tests to real pytest tests (Low).
- [ ] Deployment files (Dockerfile / `render.yaml`) and environment documentation; trim CORS origins per environment.
- [ ] Enable strict TypeScript incrementally; split the largest components.
- [ ] Remove Express leftovers and dead code.

### Optional: Google Calendar follow-ups
- [ ] Update and cancel sync for scheduled interviews.
- [ ] Surface Meet-creation failures to HR instead of only logging them.
- [ ] Multi-organizer support (allowlist plus the scheduling user's email), which depends on Phase 1 auth.
- [ ] Add the candidate as an attendee, if invites are wanted.

## Approval

Nothing in this plan is started. Each phase needs your go-ahead, and your choice of order, before any change is made.
