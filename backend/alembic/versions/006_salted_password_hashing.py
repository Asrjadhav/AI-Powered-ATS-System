"""salted_password_hashing

Adds a per-user passwordSalt column and switches password verification from
plain unsalted SHA-256 to salted PBKDF2-HMAC-SHA256 (see routers/auth.py).

Every existing passwordHash was computed with the old, salt-less scheme and
cannot be verified under the new one — there is no salt to combine with it,
and the algorithm itself has changed. Rather than leave those users
permanently locked out with an opaque "Invalid email or password", this
migration clears passwordHash on every row. /api/auth/login already treats a
user with no passwordHash as awaiting their first login: it accepts whatever
password comes in next and adopts it as their new (correctly salted)
password. So every existing account's next login "resets" it, with no
separate reset flow needed — consistent with how this system already
onboards a brand new email today.

Revision ID: 006_salted_password_hashing
Revises: 005_user_management_reports
Create Date: 2026-09-21 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '006_salted_password_hashing'
down_revision: Union[str, None] = '005_user_management_reports'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('users', sa.Column('passwordSalt', sa.String(), nullable=True))

    # Old unsalted hashes cannot be verified under the new scheme; clear them
    # so the next login for each account sets a fresh salted hash instead of
    # silently locking everyone out.
    op.execute('UPDATE users SET "passwordHash" = NULL')

def downgrade() -> None:
    # passwordHash values cleared in upgrade() cannot be restored; anyone who
    # logged in since upgrade() now has a salted hash that downgrade() also
    # cannot express. A downgrade means those users reset their password too.
    op.drop_column('users', 'passwordSalt')
