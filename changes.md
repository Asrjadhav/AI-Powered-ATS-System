# Changes and future work

## 2026-10-27: Interviewers (CC) and BCC on interviews

### What was added
- **Schedule Interview** (the modal in `CandidatesView.tsx` and the form in `InterviewsView.tsx`) now has two searchable multi-select dropdowns:
  - **Interviewers**: one or more, **required** (cannot be empty). They are the **CC** recipients of the invitation email, so there is no separate CC field.
  - **BCC**: optional, hidden from other recipients.
- A person cannot be both an interviewer and in BCC (the dropdowns hide people already chosen in the other field; the backend rejects it too).
- The invitation email to the candidate is sent with the interviewers in CC and the BCC people in BCC (`email_service.send_email(..., cc=, bcc=)`, called from `automated_email_service.notify_interview_scheduled`).
- The list of people comes from the backend: `GET /api/directory/people` (optional `?q=`).

### Backend rules (also enforced in the UI)
Checked in `routers/interviews.py` -> `services/interview_participants.py`, **before** any Google Meet event is created or anything is saved:
- at least one interviewer; BCC may be empty;
- every person must exist in the people directory. Only the **id** is trusted from the request; the stored name and email are copied from the directory, so an email address cannot be typed in or spoofed;
- invalid input returns HTTP 422 with a readable message.

On update (`PUT /api/interviews/{id}`) only the lists that are sent are checked. A sent `interviewers` list cannot be empty.

### Database (run this yourself, it is NOT automatic)
`backend/migrations/001_interview_participants.sql` adds two JSONB columns to `interviews`: `interviewers` and `bcc`. Each holds a list of `{"id", "name", "email"}`. The old text column `interviewer` is kept and holds the comma-joined interviewer names, because several screens still show it.

Run the SQL once **before** starting the new backend. The interviews model selects the new columns, so interview endpoints fail with "column does not exist" until it is run. Existing interviews get `[]`.

If an earlier version of that SQL file was already run, it also created a `cc` column. The application no longer uses it; the file has a commented `DROP COLUMN IF EXISTS cc` line you can run to remove it.

### Where things live
| Piece | File |
|---|---|
| People list (temporary source) | `backend/data/employee_directory.json`, read by `backend/services/directory_service.py` |
| People endpoint | `backend/routers/directory.py` |
| Validation rules | `backend/services/interview_participants.py` |
| Columns | `backend/models/interview.py`, `backend/schema.sql`, the SQL migration above |
| Request/response shapes | `backend/schemas/interview.py` |
| Email CC/BCC | `backend/services/email_service.py`, `backend/services/automated_email_service.py` |
| UI | `src/components/common/PeopleMultiSelect.tsx`, `src/repositories/directoryRepository.ts` |

### Before real use
`backend/data/employee_directory.json` contains **placeholder people with `@example.com` addresses**. Replace them with real employees (or do the ERA step below) before scheduling real interviews, or the interviewer (CC) and BCC copies go nowhere. A refused CC/BCC address does not fail the email to the candidate; it is logged as a warning.

---

## 2026-10-27: Job description (JD) PDF attached to the interview invitation

- The automatic interview invitation now carries the job's description as a PDF (`Job_Description_<job title>.pdf`), built from the job saved under Jobs and printed on the company letterhead (same letterhead and PDF writer as the offer letter).
- Code: `backend/services/job_description_service.py` builds the PDF; `automated_email_service.notify_interview_scheduled` attaches it. No database or frontend change, and no new automation switch: it follows the existing "interview scheduled" trigger.
- Printed: title, job id, department, location, work mode, employment type, experience, education, openings, description, responsibilities, requirements, preferred skills, benefits. Empty sections are left out.
- **Never printed:** salary range, maximum budget, hiring manager, recruiter, status, deadline, custom fields.
- If the PDF cannot be built (job not found, job has no title or no details), the reason is logged as a warning and the invitation is still sent without it, because the interview is already saved.
- Characters outside Windows-1252 (for example Devanagari or a check mark) print as `?`, the same limit as the offer letter.

---

## Future: connect the Resource Hub (ERA) as the source of people

Goal: interviewers (the CC list) and BCC are chosen from ERA employees instead of the JSON file.

The ATS only depends on `backend/services/directory_service.py`, so the change is local:

1. **Replace `_load_people()`** (and keep `list_people()` / `get_people_by_id()` with the same signatures) so it reads from ERA. Each person must map to `{id, name, email, role}`.
   - `id` must be **stable**. It is stored on every interview, and the saved name and email are only a snapshot taken at scheduling time.
   - Do not let an ERA outage block scheduling silently: today an unreadable directory returns an empty list and the UI says "No people available". Decide whether to cache the last good list.
2. **Search**: `GET /api/directory/people?q=` already filters by name, email or role in the backend. For a large ERA, pass `q` to ERA's search and have the dropdown call it as the user types (today the frontend loads the whole list once in `useDirectoryPeople()` and filters in the browser).
3. **Eligibility**: decide whether interviewers and BCC should come from different ERA groups (for example only the engineering department as interviewers). The endpoint can take a `role=interviewer|bcc` parameter; the two dropdowns already use separate `aria-label`s.
4. **Auth**: keep ERA credentials server-side only, in environment variables (never in the frontend).
5. **People who leave**: an interview keeps the saved snapshot. Decide whether past interviews should show the current ERA name or the snapshot.
6. Delete `backend/data/employee_directory.json` once ERA is live.

## Other things to decide later
- **The Google Calendar event has no attendees** (`sendUpdates: none`), so CC/BCC people get the link by email only, not as a calendar invite. Adding attendees to the event (`google_calendar_service.create_meet_event`) would put the interview in their calendars.
- **Editing an interview does not resend the email or update the calendar event.** It only changes the saved data.
- **Interviews saved before this change** have empty lists. Editing one requires choosing at least one interviewer before it can be saved.
- **Interviewer availability** (`/api/interviewer/availability`) still returns "available" for any name. It was a stub before and is unchanged; with a real directory it can check each chosen interviewer.
- **Existing bug noticed, not changed:** `backend/services/interview_service.py` contains duplicated code (the second `create_interview` and `submit_feedback` definitions replace the first, and the first `submit_feedback` has stray lines from `get_interviews`). The later definitions are the ones in use. Worth cleaning up separately.
