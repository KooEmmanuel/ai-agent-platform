"""fix_organization_integration_agent_fk

Revision ID: 6ae3fe5b3298
Revises: 03800315db7b
Create Date: 2025-10-28 15:41:02.705547

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6ae3fe5b3298'
down_revision = '03800315db7b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the existing foreign key constraint
    op.drop_constraint('organization_integrations_agent_id_fkey', 'organization_integrations', type_='foreignkey')
    
    # Add the new foreign key constraint to organization_agents table
    op.create_foreign_key(
        'organization_integrations_agent_id_fkey',
        'organization_integrations', 
        'organization_agents',
        ['agent_id'], 
        ['id']
    )


def downgrade() -> None:
    # Drop the organization_agents foreign key constraint
    op.drop_constraint('organization_integrations_agent_id_fkey', 'organization_integrations', type_='foreignkey')
    
    # Restore the original foreign key constraint to agents table
    op.create_foreign_key(
        'organization_integrations_agent_id_fkey',
        'organization_integrations', 
        'agents',
        ['agent_id'], 
        ['id']
    ) 