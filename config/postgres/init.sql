-- Ensure pgvector extension is available for semantic memory features
CREATE EXTENSION IF NOT EXISTS vector;

-- Placeholder database health table for readiness probes
CREATE TABLE IF NOT EXISTS service_health (
  key text PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO service_health (key)
VALUES ('boot')
ON CONFLICT (key) DO UPDATE SET updated_at = EXCLUDED.updated_at;
