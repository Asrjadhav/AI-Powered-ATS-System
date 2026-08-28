"""phase1d_candidate_application_schema

Revision ID: 002_phase1d_schema
Revises: 001_initial_phase1a_schema
Create Date: 2026-08-18 17:18:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_phase1d_schema'
down_revision: Union[str, None] = '001_initial_phase1a_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Update Candidate Indexes for Candidate ID and Email Uniqueness
    op.drop_index('ix_candidates_candidateId', table_name='candidates', if_exists=True)
    op.create_index('ix_candidates_candidateId', 'candidates', ['candidateId'], unique=True)

    op.drop_index('ix_candidates_email', table_name='candidates', if_exists=True)
    op.create_index('ix_candidates_email', 'candidates', ['email'], unique=True)

    # 2. Update Application Indexes for Application ID Uniqueness
    op.drop_index('ix_applications_applicationId', table_name='applications', if_exists=True)
    op.create_index('ix_applications_applicationId', 'applications', ['applicationId'], unique=True)

    # 3. Add Composite Unique Constraint preventing duplicate applications on (candidateId, jobId)
    op.create_unique_constraint(
        'uq_candidate_job_application',
        'applications',
        ['candidateId', 'jobId']
    )

def downgrade() -> None:
    op.drop_constraint('uq_candidate_job_application', 'applications', type_='unique')
    
    op.drop_index('ix_applications_applicationId', table_name='applications')
    op.create_index('ix_applications_applicationId', 'applications', ['applicationId'], unique=False)

    op.drop_index('ix_candidates_email', table_name='candidates')
    op.create_index('ix_candidates_email', 'candidates', ['email'], unique=False)

    op.drop_index('ix_candidates_candidateId', table_name='candidates')
    op.create_index('ix_candidates_candidateId', 'candidates', ['candidateId'], unique=False)
