"""add_password_reset_fields_only

Revision ID: 71d623e727a8
Revises: 0d18e5f9da75
Create Date: 2025-10-05 20:31:04.447891

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '71d623e727a8'
down_revision = '0d18e5f9da75'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add password reset fields to users table
    op.add_column('users', sa.Column('reset_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('reset_token_expires', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove password reset fields from users table
    op.drop_column('users', 'reset_token_expires')
    op.drop_column('users', 'reset_token') 