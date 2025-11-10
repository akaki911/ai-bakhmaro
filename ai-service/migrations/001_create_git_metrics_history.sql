-- Migration: Git Metrics History Table
-- Purpose: Store Git operation latency history for trend analysis
-- Date: 2025-01-10

-- Create git_metrics_history table
CREATE TABLE IF NOT EXISTS git_metrics_history (
  id SERIAL PRIMARY KEY,
  operation VARCHAR(50) NOT NULL CHECK (operation IN ('commit', 'push', 'pull')),
  duration_ms FLOAT NOT NULL,
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'error')),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT now()
);

-- Create index for faster queries on operation and timestamp
CREATE INDEX IF NOT EXISTS idx_git_metrics_operation ON git_metrics_history(operation);
CREATE INDEX IF NOT EXISTS idx_git_metrics_timestamp ON git_metrics_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_git_metrics_operation_timestamp ON git_metrics_history(operation, timestamp DESC);

-- Comment on table
COMMENT ON TABLE git_metrics_history IS 'Stores Git operation performance metrics for trend analysis and monitoring';
COMMENT ON COLUMN git_metrics_history.operation IS 'Type of Git operation: commit, push, or pull';
COMMENT ON COLUMN git_metrics_history.duration_ms IS 'Operation duration in milliseconds';
COMMENT ON COLUMN git_metrics_history.status IS 'Operation result: success or error';
COMMENT ON COLUMN git_metrics_history.metadata IS 'Additional metadata (branch, files count, etc.)';
COMMENT ON COLUMN git_metrics_history.timestamp IS 'When the operation occurred';
