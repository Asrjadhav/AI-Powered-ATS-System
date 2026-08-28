"""phase2d_talent_pool_schema

Revision ID: 003_phase2d_talent_pool
Revises: 002_phase1d_schema
Create Date: 2026-08-20 17:31:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_phase2d_talent_pool'
down_revision: Union[str, None] = '002_phase1d_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'talent_pool',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('candidateId', sa.String(), sa.ForeignKey('candidates.id'), nullable=False, unique=True),
        sa.Column('currentRole', sa.String(), nullable=True),
        sa.Column('currentCompany', sa.String(), nullable=True),
        sa.Column('skills', sa.JSON(), nullable=True),
        sa.Column('experienceYears', sa.Float(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('aiMatchScore', sa.Float(), nullable=True),
        sa.Column('availability', sa.String(), nullable=True),
        sa.Column('noticePeriod', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True, server_default='Available'),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('education', sa.JSON(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('aiSummary', sa.Text(), nullable=True),
        sa.Column('certifications', sa.JSON(), nullable=True),
        sa.Column('projects', sa.JSON(), nullable=True),
        sa.Column('recruitmentHistory', sa.JSON(), nullable=True),
        sa.Column('recruiterNotes', sa.Text(), nullable=True),
        sa.Column('createdAt', sa.String(), nullable=True),
        sa.Column('updatedAt', sa.String(), nullable=True),
    )
    op.create_index('ix_talent_pool_id', 'talent_pool', ['id'], unique=False)
    op.create_index('ix_talent_pool_candidateId', 'talent_pool', ['candidateId'], unique=True)

def downgrade() -> None:
    op.drop_index('ix_talent_pool_candidateId', table_name='talent_pool')
    op.drop_index('ix_talent_pool_id', table_name='talent_pool')
    op.drop_table('talent_pool')
