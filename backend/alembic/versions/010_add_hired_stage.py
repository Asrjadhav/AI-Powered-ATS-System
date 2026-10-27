"""add_hired_stage

Adds 'Hired' to the PostgreSQL ENUM ``application_stage`` (after 'Offer'), so an application and a
candidate can be marked Hired once an offer is accepted and the person joins. The same value is
``ApplicationStage.HIRED`` in services/application_stage.py.

Revision ID: 010_add_hired_stage
Revises: 009_application_state
Create Date: 2026-10-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = '010_add_hired_stage'
down_revision: Union[str, None] = '009_application_state'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block on older PostgreSQL versions,
    # so it runs in autocommit. IF NOT EXISTS makes it safe to run twice.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'Hired' AFTER 'Offer'")


def downgrade() -> None:
    # PostgreSQL cannot remove a value from an ENUM. Rows that are Hired go back to Offer (the
    # stage they came from) so nothing refers to a value the code no longer knows; the empty
    # 'Hired' label stays in the type, which is harmless.
    op.execute("UPDATE applications SET status = 'Offer' WHERE status::text = 'Hired'")
    op.execute("UPDATE candidates SET status = 'Offer' WHERE status::text = 'Hired'")
