"""add_workspaces

Revision ID: f208e3413f3c
Revises: add_pages_extracted_field
Create Date: 2025-09-28 22:14:14.634677

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f208e3413f3c'
down_revision = 'add_pages_extracted_field'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create workspaces table
    op.create_table('workspaces',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('color', sa.String(), nullable=True),
        sa.Column('icon', sa.String(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['parent_id'], ['workspaces.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workspaces_id'), 'workspaces', ['id'], unique=False)
    op.create_index(op.f('ix_workspaces_user_id'), 'workspaces', ['user_id'], unique=False)
    op.create_index(op.f('ix_workspaces_parent_id'), 'workspaces', ['parent_id'], unique=False)
    
    # Add workspace_id column to conversations table
    op.add_column('conversations', sa.Column('workspace_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_conversations_workspace_id', 'conversations', 'workspaces', ['workspace_id'], ['id'])
    op.create_index(op.f('ix_conversations_workspace_id'), 'conversations', ['workspace_id'], unique=False)


def downgrade() -> None:
    # Remove workspace_id column from conversations
    op.drop_index(op.f('ix_conversations_workspace_id'), table_name='conversations')
    op.drop_constraint('fk_conversations_workspace_id', 'conversations', type_='foreignkey')
    op.drop_column('conversations', 'workspace_id')
    
    # Drop workspaces table
    op.drop_index(op.f('ix_workspaces_parent_id'), table_name='workspaces')
    op.drop_index(op.f('ix_workspaces_user_id'), table_name='workspaces')
    op.drop_index(op.f('ix_workspaces_id'), table_name='workspaces')
    op.drop_table('workspaces') 