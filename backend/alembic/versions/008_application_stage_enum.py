"""application_stage_enum

Restricts the ``status`` column on ``applications`` and ``candidates`` to the
five canonical pipeline stages (New, Shortlisted, Interviewing, Rejected, Offer)
using a PostgreSQL ENUM type. Existing rows whose status is outside the new set
are remapped to ``New`` before the column type is changed.

Revision ID: 007_application_stage_enum
Revises: 006_salted_password_hashing
Create Date: 2026-10-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '008_application_stage_enum'
down_revision: Union[str, None] = '006_salted_password_hashing'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The five canonical stages, in pipeline order.
_STAGE_VALUES = ('New', 'Shortlisted', 'Interviewing', 'Rejected', 'Offer')
_ENUM_NAME = 'application_stage'


def upgrade() -> None:
    # 1. Create the PostgreSQL ENUM type.
    stage_enum = sa.Enum(*_STAGE_VALUES, name=_ENUM_NAME)
    stage_enum.create(op.get_bind(), checkfirst=True)

    # 2. Remap any existing status values that are outside the new set to 'New'.
    #    This covers legacy values like 'Applied', 'Pending Evaluation',
    #    'Offered', 'Hired', 'Interview Cancelled', 'Talent Pool', etc.
    op.execute(
        sa.text(
            "UPDATE applications SET status = 'New' "
            "WHERE status IS NOT NULL AND status NOT IN :stages"
        ).bindparams(stages=tuple(_STAGE_VALUES))
    )
    op.execute(
        sa.text(
            "UPDATE candidates SET status = 'New' "
            "WHERE status IS NOT NULL AND status NOT IN :stages"
        ).bindparams(stages=tuple(_STAGE_VALUES))
    )

    # 3. Change the column type to the ENUM.
    op.alter_column(
        'applications', 'status',
        type_=stage_enum,
        existing_type=sa.String(),
        existing_nullable=True,
        postgresql_using='status::application_stage',
    )
    op.alter_column(
        'candidates', 'status',
        type_=stage_enum,
        existing_type=sa.String(),
        existing_nullable=True,
        postgresql_using='status::application_stage',
    )

    # 4. Set the default to 'New' (was 'Applied' on applications).
    op.alter_column(
        'applications', 'status',
        server_default='New',
        existing_nullable=True,
    )
    op.alter_column(
        'candidates', 'status',
        server_default='New',
        existing_nullable=True,
    )


def downgrade() -> None:
    # 1. Revert the column type back to plain String.
    op.alter_column(
        'applications', 'status',
        type_=sa.String(),
        existing_type=sa.Enum(*_STAGE_VALUES, name=_ENUM_NAME),
        existing_nullable=True,
        postgresql_using='status::VARCHAR',
    )
    op.alter_column(
        'candidates', 'status',
        type_=sa.String(),
        existing_type=sa.Enum(*_STAGE_VALUES, name=_ENUM_NAME),
        existing_nullable=True,
        postgresql_using='status::VARCHAR',
    )

    # 2. Drop the server defaults.
    op.alter_column('applications', 'status', server_default=None)
    op.alter_column('candidates', 'status', server_default=None)

    # 3. Drop the ENUM type.
    sa.Enum(*_STAGE_VALUES, name=_ENUM_NAME).drop(op.get_bind(), checkfirst=True)
