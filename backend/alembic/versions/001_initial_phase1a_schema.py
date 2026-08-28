"""initial_phase1a_schema

Revision ID: 001_initial_phase1a_schema
Revises: 
Create Date: 2026-08-17 16:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial_phase1a_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('fullName', sa.String(), nullable=True),
        sa.Column('role', sa.String(), nullable=True),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('employeeId', sa.String(), nullable=True),
        sa.Column('avatarUrl', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('lastLogin', sa.String(), nullable=True),
        sa.Column('createdAt', sa.String(), nullable=True),
        sa.Column('updatedAt', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. Jobs
    op.create_table(
        'jobs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('jobId', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('workMode', sa.String(), nullable=True),
        sa.Column('experienceRange', sa.String(), nullable=True),
        sa.Column('experienceLevel', sa.String(), nullable=True),
        sa.Column('salaryRange', sa.String(), nullable=True),
        sa.Column('maxBudget', sa.Float(), nullable=True),
        sa.Column('openings', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('responsibilities', sa.JSON(), nullable=True),
        sa.Column('requirements', sa.JSON(), nullable=True),
        sa.Column('preferredSkills', sa.JSON(), nullable=True),
        sa.Column('education', sa.String(), nullable=True),
        sa.Column('benefits', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('hiringManager', sa.String(), nullable=True),
        sa.Column('recruiter', sa.String(), nullable=True),
        sa.Column('deadline', sa.String(), nullable=True),
        sa.Column('targetJoiningDate', sa.String(), nullable=True),
        sa.Column('customFields', sa.JSON(), nullable=True),
        sa.Column('publicApplicationInfo', sa.JSON(), nullable=True),
        sa.Column('createdAt', sa.String(), nullable=True),
        sa.Column('updatedAt', sa.String(), nullable=True),
        sa.Column('createdBy', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['createdBy'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jobs_id'), 'jobs', ['id'], unique=False)
    op.create_index(op.f('ix_jobs_jobId'), 'jobs', ['jobId'], unique=True)
    op.create_index(op.f('ix_jobs_title'), 'jobs', ['title'], unique=False)

    # 3. Candidates
    op.create_table(
        'candidates',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('candidateId', sa.String(), nullable=True),
        sa.Column('jobId', sa.String(), nullable=True),
        sa.Column('firstName', sa.String(), nullable=True),
        sa.Column('lastName', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('currentRole', sa.String(), nullable=True),
        sa.Column('currentCompany', sa.String(), nullable=True),
        sa.Column('skills', sa.JSON(), nullable=True),
        sa.Column('experienceYears', sa.Float(), nullable=True),
        sa.Column('resumeText', sa.Text(), nullable=True),
        sa.Column('linkedinUrl', sa.String(), nullable=True),
        sa.Column('avatarUrl', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('expectedCTC', sa.Float(), nullable=True),
        sa.Column('currentCTC', sa.Float(), nullable=True),
        sa.Column('hrNotes', sa.Text(), nullable=True),
        sa.Column('hrApprovalStatus', sa.String(), nullable=True),
        sa.Column('customFields', sa.JSON(), nullable=True),
        sa.Column('experienceLevel', sa.String(), nullable=True),
        sa.Column('noticePeriod', sa.String(), nullable=True),
        sa.Column('portfolioUrl', sa.String(), nullable=True),
        sa.Column('highestEducation', sa.String(), nullable=True),
        sa.Column('specialization', sa.String(), nullable=True),
        sa.Column('yearOfPassing', sa.String(), nullable=True),
        sa.Column('totalExperience', sa.String(), nullable=True),
        sa.Column('keySkills', sa.String(), nullable=True),
        sa.Column('inHandSalary', sa.String(), nullable=True),
        sa.Column('projectsWorkedOn', sa.Text(), nullable=True),
        sa.Column('relocateToPune', sa.String(), nullable=True),
        sa.Column('createdAt', sa.String(), nullable=True),
        sa.Column('updatedAt', sa.String(), nullable=True),
        sa.Column('createdBy', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('aiScore', sa.Integer(), nullable=True),
        sa.Column('timeline', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['jobId'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_candidates_id'), 'candidates', ['id'], unique=False)
    op.create_index(op.f('ix_candidates_candidateId'), 'candidates', ['candidateId'], unique=False)
    op.create_index(op.f('ix_candidates_email'), 'candidates', ['email'], unique=False)

    # 4. Applications
    op.create_table(
        'applications',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('applicationId', sa.String(), nullable=True),
        sa.Column('candidateId', sa.String(), nullable=False),
        sa.Column('jobId', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('atsScore', sa.Integer(), nullable=True),
        sa.Column('appliedRole', sa.String(), nullable=True),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('candidateEmail', sa.String(), nullable=True),
        sa.Column('candidateName', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('createdAt', sa.String(), nullable=True),
        sa.Column('updatedAt', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['candidateId'], ['candidates.id'], ),
        sa.ForeignKeyConstraint(['jobId'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_applications_id'), 'applications', ['id'], unique=False)
    op.create_index(op.f('ix_applications_applicationId'), 'applications', ['applicationId'], unique=True)
    op.create_index(op.f('ix_applications_candidateId'), 'applications', ['candidateId'], unique=False)
    op.create_index(op.f('ix_applications_jobId'), 'applications', ['jobId'], unique=False)

    # 5. Interviews
    op.create_table(
        'interviews',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('candidateId', sa.String(), nullable=False),
        sa.Column('jobId', sa.String(), nullable=False),
        sa.Column('applicationId', sa.String(), nullable=True),
        sa.Column('candidateName', sa.String(), nullable=True),
        sa.Column('candidateEmail', sa.String(), nullable=True),
        sa.Column('jobTitle', sa.String(), nullable=True),
        sa.Column('round', sa.String(), nullable=True),
        sa.Column('date', sa.String(), nullable=True),
        sa.Column('time', sa.String(), nullable=True),
        sa.Column('interviewer', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('meetingLink', sa.String(), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('technicalScore', sa.Float(), nullable=True),
        sa.Column('communicationScore', sa.Float(), nullable=True),
        sa.Column('createdAt', sa.String(), nullable=True),
        sa.Column('updatedAt', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['applicationId'], ['applications.id'], ),
        sa.ForeignKeyConstraint(['candidateId'], ['candidates.id'], ),
        sa.ForeignKeyConstraint(['jobId'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_interviews_id'), 'interviews', ['id'], unique=False)
    op.create_index(op.f('ix_interviews_candidateId'), 'interviews', ['candidateId'], unique=False)
    op.create_index(op.f('ix_interviews_jobId'), 'interviews', ['jobId'], unique=False)

    # 6. Offers
    op.create_table(
        'offers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('candidateId', sa.String(), nullable=False),
        sa.Column('jobId', sa.String(), nullable=False),
        sa.Column('applicationId', sa.String(), nullable=True),
        sa.Column('candidateName', sa.String(), nullable=True),
        sa.Column('candidateEmail', sa.String(), nullable=True),
        sa.Column('jobTitle', sa.String(), nullable=True),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('offeredCTC', sa.Float(), nullable=True),
        sa.Column('joiningDate', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('workflowStage', sa.String(), nullable=True),
        sa.Column('contractTemplate', sa.String(), nullable=True),
        sa.Column('customTerms', sa.Text(), nullable=True),
        sa.Column('createdAt', sa.String(), nullable=True),
        sa.Column('updatedAt', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['applicationId'], ['applications.id'], ),
        sa.ForeignKeyConstraint(['candidateId'], ['candidates.id'], ),
        sa.ForeignKeyConstraint(['jobId'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_offers_id'), 'offers', ['id'], unique=False)
    op.create_index(op.f('ix_offers_candidateId'), 'offers', ['candidateId'], unique=False)

    # 7. Notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('userId', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('isRead', sa.Boolean(), nullable=False),
        sa.Column('candidateName', sa.String(), nullable=True),
        sa.Column('jobTitle', sa.String(), nullable=True),
        sa.Column('createdAt', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['userId'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)

    # 8. Email Templates
    op.create_table(
        'email_templates',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('subject', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('variables', sa.JSON(), nullable=True),
        sa.Column('createdAt', sa.String(), nullable=True),
        sa.Column('updatedAt', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_templates_id'), 'email_templates', ['id'], unique=False)
    op.create_index(op.f('ix_email_templates_name'), 'email_templates', ['name'], unique=False)

    # 9. Sent Emails
    op.create_table(
        'sent_emails',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('toEmail', sa.String(), nullable=False),
        sa.Column('toName', sa.String(), nullable=True),
        sa.Column('subject', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('sentAt', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('candidateId', sa.String(), nullable=True),
        sa.Column('jobId', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sent_emails_id'), 'sent_emails', ['id'], unique=False)

    # 10. System Tokens
    op.create_table(
        'system_tokens',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tokenType', sa.String(), nullable=False),
        sa.Column('accessToken', sa.Text(), nullable=True),
        sa.Column('refreshToken', sa.Text(), nullable=True),
        sa.Column('expiryDate', sa.BigInteger(), nullable=True),
        sa.Column('updatedAt', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_system_tokens_id'), 'system_tokens', ['id'], unique=False)


def downgrade() -> None:
    op.drop_table('system_tokens')
    op.drop_table('sent_emails')
    op.drop_table('email_templates')
    op.drop_table('notifications')
    op.drop_table('offers')
    op.drop_table('interviews')
    op.drop_table('applications')
    op.drop_table('candidates')
    op.drop_table('jobs')
    op.drop_table('users')
