"""phase2h_resume_storage_schema

Revision ID: 004_phase2h_resume_storage
Revises: 003_phase2d_talent_pool
Create Date: 2026-08-25 14:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '004_phase2h_resume_storage'
down_revision: Union[str, None] = '003_phase2d_talent_pool'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('candidates', sa.Column('resumeFileName', sa.String(), nullable=True))
    op.add_column('candidates', sa.Column('resumeStorageKey', sa.String(), nullable=True))
    op.add_column('candidates', sa.Column('resumeUploadedAt', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('candidates', 'resumeUploadedAt')
    op.drop_column('candidates', 'resumeStorageKey')
    op.drop_column('candidates', 'resumeFileName')
