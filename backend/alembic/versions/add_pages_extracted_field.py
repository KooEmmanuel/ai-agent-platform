"""add pages_extracted field to knowledge_base_collections

Revision ID: add_pages_extracted_field
Revises: b4517d633649
Create Date: 2025-08-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_pages_extracted_field'
down_revision = 'b4517d633649'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add pages_extracted column to knowledge_base_collections table
    op.add_column('knowledge_base_collections', sa.Column('pages_extracted', sa.Integer(), nullable=True, default=0))
    
    # Update existing records to have pages_extracted = 0
    op.execute("UPDATE knowledge_base_collections SET pages_extracted = 0 WHERE pages_extracted IS NULL")
    
    # Make the column not nullable after setting default values
    op.alter_column('knowledge_base_collections', 'pages_extracted', nullable=False)


def downgrade() -> None:
    # Remove pages_extracted column
    op.drop_column('knowledge_base_collections', 'pages_extracted') 