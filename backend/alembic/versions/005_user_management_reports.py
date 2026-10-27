"""user_management_and_report_schedules

Adds the columns Users & Roles management needs on the users table, and a
report_schedules table so scheduled report configs are stored once, in the
database, instead of in per-browser localStorage.

Revision ID: 005_user_management_reports
Revises: 004_phase2h_resume_storage
Create Date: 2026-09-21 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '005_user_management_reports'
down_revision: Union[str, None] = '004_phase2h_resume_storage'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('users', sa.Column('avatarColor', sa.String(), nullable=True))
    op.add_column('users', sa.Column('designation', sa.String(), nullable=True))
    op.add_column('users', sa.Column('manager', sa.String(), nullable=True))
    op.add_column(
        'users',
        sa.Column('changePasswordOnFirstLogin', sa.Boolean(), nullable=True, server_default=sa.false())
    )

    op.create_table(
        'report_schedules',
        sa.Column('id', sa.String(), primary_key=True, index=True),
        sa.Column('frequency', sa.String(), nullable=False, server_default='Weekly'),
        sa.Column('format', sa.String(), nullable=False, server_default='PDF'),
        sa.Column('emails', sa.String(), nullable=False, server_default=''),
        sa.Column('department', sa.String(), nullable=True, server_default='All Departments'),
        sa.Column('status', sa.String(), nullable=True, server_default='Active'),
        sa.Column('lastSent', sa.String(), nullable=True, server_default='Never'),
        sa.Column('createdAt', sa.String(), nullable=True),
        sa.Column('updatedAt', sa.String(), nullable=True),
        sa.Column('createdBy', sa.String(), nullable=True),
    )

def downgrade() -> None:
    op.drop_table('report_schedules')
    op.drop_column('users', 'changePasswordOnFirstLogin')
    op.drop_column('users', 'manager')
    op.drop_column('users', 'designation')
    op.drop_column('users', 'avatarColor')
