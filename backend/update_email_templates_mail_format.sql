-- Updates the stored email templates to the wording and formatting in the company's "ATS Mail Format" document.
-- Run it yourself (pgAdmin / psql). Only the subject, body and variables of the three templates below
-- are changed; their ids, names and the Welcome Email are left as they are. Rows are matched by
-- category, so it works whatever the template ids are. Safe to run more than once.
-- (**bold**, ***bold italic*** and [[label|link]] in the body are formatting marks: the email shows them
-- as bold / italic / links, with the company logo under the signature.)

BEGIN;

UPDATE email_templates SET
    subject = $tpl${{interview_round}} | {{job_title}} | {{interview_date_subject}} at {{interview_time}}$tpl$,
    body = $tpl$Dear {{candidate_first_name}},

***Greetings from EncureIT Systems!!***

As per our discussion, we are pleased to invite you for the {{interview_round_phrase}} for the position of **{{job_title}}.**

**The interview is scheduled as follows:**
**Date:** {{interview_date}}
**Time:** {{interview_time}}
**Mode:** {{interview_mode}}
**{{joining_label}}: {{joining_details}}**

We request you to confirm your availability by replying to this email and ensure you have a stable internet connection at the time of the interview. If you have any queries or require further information, feel free to reach out.

We look forward to connecting with you and wish you all the best for the interview.

**Yogesh Adsul**
HR Generalist
+91 8855 825 770
Office No 1, 2nd Floor, Raghunath Building, Market yard, Gultekdi,
Pune - 411037, (MH) INDIA
www.encureit.com$tpl$,
    variables = '["candidate_first_name", "candidate_name", "job_title", "interview_round", "interview_round_phrase", "interview_date", "interview_date_subject", "interview_time", "interview_mode", "joining_label", "joining_details", "meeting_link", "company_name"]',
    "updatedAt" = to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"+00:00"')
WHERE category = 'Interview Invitation';

UPDATE email_templates SET
    subject = $tpl$Offer Letter | {{candidate_name}} | EncureIT Systems Pvt Ltd.$tpl$,
    body = $tpl$Dear {{candidate_first_name}},

**Congratulations on receiving an offer from EncureIT Systems Pvt Ltd.!**

Please find your offer letter attached. The detailed appointment letter will be provided on your joining date.

We are confident that you will make valuable contributions to our organization, and we look forward to welcoming you on **{{joining_date}}.**

Kindly reply to this email with your acceptance and share a signed copy (digital signature also acceptable) of the offer letter by tomorrow EOD.

Yogesh Adsul,
HR Generalist
[[+91 8855825770|tel:+918855825770]]
EncureIT Systems Pvt Ltd,
Pune - 411037, (MH) INDIA
www.encureit.com$tpl$,
    variables = '["candidate_first_name", "candidate_name", "job_title", "joining_date", "offer_expiry", "salary", "company_name"]',
    "updatedAt" = to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"+00:00"')
WHERE category = 'Offer Letter';

UPDATE email_templates SET
    subject = $tpl$Update on Your Application – {{company_name}}$tpl$,
    body = $tpl$Dear {{candidate_name}},

Thank you for your interest in the {{job_title}} position at {{company_name}} and for taking the time to participate in our recruitment process.

After careful consideration, we regret to inform you that we will not be proceeding with your application for this position at this time.

We appreciate your interest in joining our organization and the effort you have invested in the interview process. We encourage you to apply for future opportunities that match your skills and experience.

We wish you all the best in your future career endeavors.

Regards,

Yogesh Adsul,
HR Generalist
[[+91 8855825770|tel:+918855825770]]
EncureIT Systems Pvt Ltd,
Pune - 411037, (MH) INDIA
www.encureit.com$tpl$,
    variables = '["candidate_name", "job_title", "company_name"]',
    "updatedAt" = to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"+00:00"')
WHERE category = 'Rejection Email';

COMMIT;

-- Check the result (expect 4 rows):
SELECT id, name, category, subject FROM email_templates ORDER BY id;
