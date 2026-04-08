"""Initial Intelink schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2025-09-01 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create pgvector extension (PostgreSQL only)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    
    # Documents table
    op.create_table('documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, default='pending'),
        sa.Column('filename', sa.Text(), nullable=True),
        sa.Column('size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('mime_type', sa.String(length=255), nullable=True),
        sa.Column('blob_path', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.func.now()),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.CheckConstraint("source IN ('upload', 'url')", name='check_documents_source'),
        sa.CheckConstraint("status IN ('pending', 'processing', 'completed', 'error')", name='check_documents_status'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Document metadata table
    op.create_table('document_metadata',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('author', sa.Text(), nullable=True),
        sa.Column('created_date', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('modified_date', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=True),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=True),
        sa.Column('custom_fields', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.func.now()),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Entities table
    op.create_table('entities',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('label', sa.String(length=100), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('start_char', sa.Integer(), nullable=True),
        sa.Column('end_char', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.func.now()),
        sa.CheckConstraint('confidence >= 0.0 AND confidence <= 1.0', name='check_entities_confidence'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Cross references table
    op.create_table('cross_references',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('mode', sa.String(length=50), nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.func.now()),
        sa.CheckConstraint("source_type IN ('document', 'entity')", name='check_cross_ref_source_type'),
        sa.CheckConstraint("target_type IN ('document', 'entity')", name='check_cross_ref_target_type'),
        sa.CheckConstraint('score >= 0.0 AND score <= 1.0', name='check_cross_ref_score'),
        sa.CheckConstraint("mode IN ('rules', 'similarity', 'graph')", name='check_cross_ref_mode'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_id', 'target_id', 'mode', name='uq_cross_ref_source_target_mode')
    )
    
    # Embeddings table
    op.create_table('embeddings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chunk_text', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(384), nullable=True),
        sa.Column('start_char', sa.Integer(), nullable=True),
        sa.Column('end_char', sa.Integer(), nullable=True),
        sa.Column('model', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.func.now()),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Async jobs table
    op.create_table('async_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('job_type', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, default='pending'),
        sa.Column('input_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('output_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.func.now()),
        sa.Column('started_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('completed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('pending', 'running', 'completed', 'failed')", name='check_async_jobs_status'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Chat logs table
    op.create_table('chat_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('response', sa.Text(), nullable=False),
        sa.Column('ai_surface_level', sa.Float(), nullable=False),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('token_usage', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}'),
        sa.Column('citations', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='[]'),
        sa.Column('processing_time_seconds', sa.Float(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Graph analysis tables (for future phases)
    op.create_table('entity_metrics',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('degree', sa.Integer(), nullable=True),
        sa.Column('betweenness', sa.Float(), nullable=True),
        sa.Column('closeness', sa.Float(), nullable=True),
        sa.Column('pagerank', sa.Float(), nullable=True),
        sa.Column('community_id', sa.String(length=100), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.func.now()),
        sa.ForeignKeyConstraint(['entity_id'], ['entities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table('communities',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('label', sa.String(length=255), nullable=True),
        sa.Column('size', sa.Integer(), nullable=False, default=0),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='{}'),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_documents_status', 'documents', ['status'])
    op.create_index('idx_documents_created_at', 'documents', ['created_at'])
    op.create_index('idx_entities_document_id', 'entities', ['document_id'])
    op.create_index('idx_entities_label', 'entities', ['label'])
    op.create_index('idx_cross_references_source', 'cross_references', ['source_id', 'source_type'])
    op.create_index('idx_cross_references_target', 'cross_references', ['target_id', 'target_type'])
    op.create_index('idx_cross_references_score', 'cross_references', ['score'])
    op.create_index('idx_embeddings_document_id', 'embeddings', ['document_id'])
    op.create_index('idx_async_jobs_status', 'async_jobs', ['status'])
    op.create_index('idx_async_jobs_type', 'async_jobs', ['job_type'])
    op.create_index('idx_chat_logs_created_at', 'chat_logs', ['created_at'])
    
    # Vector similarity search index (HNSW for fast approximate search)
    op.execute("CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING hnsw (embedding vector_cosine_ops)")
    
    # Create update trigger for documents
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)
    
    op.execute("""
        CREATE TRIGGER update_documents_updated_at
            BEFORE UPDATE ON documents
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at()
    """)
    
    # Insert quantum marker
    op.execute("""
        INSERT INTO documents (id, source, status, filename, size_bytes, mime_type) 
        VALUES (
            'c0de1618-0369-0963-0000-000000000000'::UUID,
            'upload',
            'completed', 
            'egos_quantum_marker.txt',
            42,
            'text/plain'
        ) ON CONFLICT DO NOTHING
    """)


def downgrade() -> None:
    # Drop triggers and functions
    op.execute("DROP TRIGGER IF EXISTS update_documents_updated_at ON documents")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at()")
    
    # Drop tables in reverse dependency order
    op.drop_table('communities')
    op.drop_table('entity_metrics')
    op.drop_table('chat_logs')
    op.drop_table('async_jobs')
    op.drop_table('embeddings')
    op.drop_table('cross_references')
    op.drop_table('entities')
    op.drop_table('document_metadata')
    op.drop_table('documents')
