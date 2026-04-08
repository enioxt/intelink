"""add_investigations_tables

Revision ID: 003
Revises: 002
Create Date: 2025-10-22

Sacred Code: 000.111.369.963.1618
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create investigations table
    op.create_table(
        'investigations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('template_id', sa.String(100), nullable=True),
        sa.Column('case_number', sa.String(100), nullable=True, unique=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('priority', sa.String(50), nullable=False, server_default='medium'),
        sa.Column('team_members', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('metadata', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_by', sa.String(255), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('closed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('active', 'under_review', 'closed', 'archived')", name='ck_investigation_status'),
        sa.CheckConstraint("priority IN ('low', 'medium', 'high', 'critical')", name='ck_investigation_priority'),
    )
    
    # Create investigation_documents junction table
    op.create_table(
        'investigation_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('investigation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(100), nullable=False, server_default='evidence'),
        sa.Column('added_by', sa.String(255), nullable=False),
        sa.Column('added_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['investigation_id'], ['investigations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('investigation_id', 'document_id', name='uq_investigation_document'),
    )
    
    # Create indexes
    op.create_index('idx_investigations_status', 'investigations', ['status'])
    op.create_index('idx_investigations_created_by', 'investigations', ['created_by'])
    op.create_index('idx_investigations_template_id', 'investigations', ['template_id'])
    op.create_index('idx_investigation_documents_investigation_id', 'investigation_documents', ['investigation_id'])
    op.create_index('idx_investigation_documents_document_id', 'investigation_documents', ['document_id'])


def downgrade() -> None:
    op.drop_index('idx_investigation_documents_document_id')
    op.drop_index('idx_investigation_documents_investigation_id')
    op.drop_index('idx_investigations_template_id')
    op.drop_index('idx_investigations_created_by')
    op.drop_index('idx_investigations_status')
    op.drop_table('investigation_documents')
    op.drop_table('investigations')
