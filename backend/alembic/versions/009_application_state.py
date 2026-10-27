"""application_state

Adds ``applications."applicationState"``: a PostgreSQL ENUM ``application_state``
('Open', 'On Hold'), NOT NULL, default 'Open'. Existing applications become 'Open'.

Revision ID: 009_application_state
Revises: 007_rename_application_stage_values
Create Date: 2026-10-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '009_application_state'
down_revision: Union[str, None] = '007_rename_application_stage_values'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_STATE_VALUES = ('Open', 'On Hold')
_ENUM_NAME = 'application_state'


def upgrade() -> None:
    state_enum = sa.Enum(*_STATE_VALUES, name=_ENUM_NAME)
    state_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        'applications',
        sa.Column('applicationState', state_enum, nullable=False, server_default='Open'),
    )
    op.create_index('ix_applications_applicationState', 'applications', ['applicationState'])


def downgrade() -> None:
    op.drop_index('ix_applications_applicationState', table_name='applications')
    op.drop_column('applications', 'applicationState')
    sa.Enum(*_STATE_VALUES, name=_ENUM_NAME).drop(op.get_bind(), checkfirst=True)
