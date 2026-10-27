"""rename application stage enum values

Revision ID: 007_rename_application_stage_values
Revises: 008_application_stage_enum
Create Date: 2026-10-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '007_rename_application_stage_values'
down_revision: Union[str, None] = '008_application_stage_enum'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_RENAMES = (
    ("NEW", "New"),
    ("SHORTLISTED", "Shortlisted"),
    ("INTERVIEWING", "Interviewing"),
    ("REJECTED", "Rejected"),
    ("OFFER", "Offer"),
)


def upgrade() -> None:
    """
    Rename application_stage ENUM values from uppercase to title case.

    Each rename only runs when the uppercase value still exists. Migration 008 creates the type
    with the title-case values already, so on a database built by the migrations there is nothing
    to rename; on one created in the old uppercase form, the values are renamed.
    """
    for old, new in _RENAMES:
        op.execute(
            "DO $$ BEGIN "
            "IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid "
            f"WHERE t.typname = 'application_stage' AND e.enumlabel = '{old}') THEN "
            f"ALTER TYPE application_stage RENAME VALUE '{old}' TO '{new}'; "
            "END IF; END $$;"
        )


def downgrade() -> None:
    """Nothing to undo: the title-case names are the ones the code uses."""
