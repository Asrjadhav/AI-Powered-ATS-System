"""candidate_preferred_work_mode

Adds ``candidates."preferredWorkMode"`` (nullable text): the candidate's own preferred way of working,
one of 'Work from Office', 'Hybrid' or 'Work from Home'. It is not the job's work mode
(``jobs."workMode"``). Existing candidates keep NULL (not specified).

Revision ID: 011_candidate_preferred_work_mode
Revises: 010_add_hired_stage
Create Date: 2026-10-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '011_candidate_preferred_work_mode'
down_revision: Union[str, None] = '010_add_hired_stage'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('ALTER TABLE candidates ADD COLUMN IF NOT EXISTS "preferredWorkMode" VARCHAR')


def downgrade() -> None:
    op.drop_column('candidates', 'preferredWorkMode')
