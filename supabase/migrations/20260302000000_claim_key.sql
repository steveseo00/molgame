-- Add claim_key support to agents table
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS claim_key_hash VARCHAR(128),
  ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT FALSE;
