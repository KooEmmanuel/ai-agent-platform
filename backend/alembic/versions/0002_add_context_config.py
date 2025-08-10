"""Add context configuration and user preferences

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add context_config column to agents table
    op.add_column('agents', sa.Column('context_config', sqlite.JSON, nullable=True))
    
    # Add session_id column to conversations table
    op.add_column('conversations', sa.Column('session_id', sa.String(), nullable=True))
    
    # Add context_summary column to conversations table
    op.add_column('conversations', sa.Column('context_summary', sa.Text(), nullable=True))
    
    # Add memory_metadata column to conversations table
    op.add_column('conversations', sa.Column('memory_metadata', sqlite.JSON, nullable=True))
    
    # Add retention_policy column to conversations table
    op.add_column('conversations', sa.Column('retention_policy', sqlite.JSON, nullable=True))
    
    # Create user_preferences table
    op.create_table('user_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=True),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('preferences', sqlite.JSON, nullable=False),
        sa.Column('is_persistent', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create index on user_preferences
    op.create_index(op.f('ix_user_preferences_user_id'), 'user_preferences', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_preferences_agent_id'), 'user_preferences', ['agent_id'], unique=False)


def downgrade() -> None:
    # Drop user_preferences table
    op.drop_index(op.f('ix_user_preferences_agent_id'), table_name='user_preferences')
    op.drop_index(op.f('ix_user_preferences_user_id'), table_name='user_preferences')
    op.drop_table('user_preferences')
    
    # Drop columns from conversations table
    op.drop_column('conversations', 'retention_policy')
    op.drop_column('conversations', 'memory_metadata')
    op.drop_column('conversations', 'context_summary')
    op.drop_column('conversations', 'session_id')
    
    # Drop context_config column from agents table
    op.drop_column('agents', 'context_config') 