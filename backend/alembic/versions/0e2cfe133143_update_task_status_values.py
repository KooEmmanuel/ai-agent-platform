"""update_task_status_values

Revision ID: 0e2cfe133143
Revises: 71d623e727a8
Create Date: 2025-10-13 14:32:56.886527

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0e2cfe133143'
down_revision = '71d623e727a8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update existing task status values to new format
    # Map old status values to new ones
    op.execute("""
        UPDATE project_tasks 
        SET status = CASE 
            WHEN status = 'todo' THEN 'pending'
            WHEN status = 'review' THEN 'in_progress'
            WHEN status = 'cancelled' THEN 'closed'
            ELSE status
        END
        WHERE status IN ('todo', 'review', 'cancelled')
    """)


def downgrade() -> None:
    # Revert task status values to old format
    op.execute("""
        UPDATE project_tasks 
        SET status = CASE 
            WHEN status = 'pending' THEN 'todo'
            WHEN status = 'in_progress' THEN 'review'
            WHEN status = 'closed' THEN 'cancelled'
            ELSE status
        END
        WHERE status IN ('pending', 'in_progress', 'closed')
    """) 