-- Add build_metadata field to agents table for storing construction sequence
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS build_metadata jsonb DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN agents.build_metadata IS 'Stores the build sequence and metadata for replaying agent construction in Studio';