-- Migration: Vector Memory with pgvector Extension
-- Purpose: Enable semantic search with vector embeddings in PostgreSQL
-- Date: 2025-01-10

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memory_embeddings table for storing text embeddings
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  embedding VECTOR(1536),  -- OpenAI ada-002 / Groq embeddings dimension
  metadata JSONB DEFAULT '{}',
  source VARCHAR(100),  -- Source type: 'knowledge_base', 'conversation', 'code', etc.
  user_id VARCHAR(100),  -- User who created this embedding
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster vector similarity search
-- Note: Using ivfflat index for approximate nearest neighbor search
-- Will create after we have enough data (>1000 rows recommended)
-- CREATE INDEX ON memory_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_source ON memory_embeddings(source);
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_user_id ON memory_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_created_at ON memory_embeddings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_metadata ON memory_embeddings USING gin(metadata);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_memory_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_memory_embeddings_updated_at ON memory_embeddings;
CREATE TRIGGER trigger_update_memory_embeddings_updated_at
  BEFORE UPDATE ON memory_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_memory_embeddings_updated_at();

-- Comments
COMMENT ON TABLE memory_embeddings IS 'Stores text embeddings for semantic search using pgvector';
COMMENT ON COLUMN memory_embeddings.text IS 'Original text that was embedded';
COMMENT ON COLUMN memory_embeddings.embedding IS 'Vector embedding (1536 dimensions for OpenAI ada-002 / Groq)';
COMMENT ON COLUMN memory_embeddings.metadata IS 'Additional metadata (tags, context, references, etc.)';
COMMENT ON COLUMN memory_embeddings.source IS 'Source type: knowledge_base, conversation, code, etc.';
COMMENT ON COLUMN memory_embeddings.user_id IS 'User who created this embedding';

-- Create view for recent embeddings
CREATE OR REPLACE VIEW recent_memory_embeddings AS
SELECT 
  id,
  LEFT(text, 100) as text_preview,
  source,
  user_id,
  metadata,
  created_at
FROM memory_embeddings
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON VIEW recent_memory_embeddings IS 'Shows 100 most recent embeddings with text previews';
