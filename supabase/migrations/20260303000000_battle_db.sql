-- Matchmaking queue (DB-based, replaces in-memory queue)
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  agent_name TEXT NOT NULL,
  elo INT NOT NULL,
  deck JSONB NOT NULL,
  mode TEXT NOT NULL,
  queued_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id)
);

-- Battle pending actions (replaces in-memory pending actions)
CREATE TABLE IF NOT EXISTS battle_pending_actions (
  battle_id UUID NOT NULL REFERENCES battles(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  action TEXT NOT NULL,
  skill_id TEXT,
  card_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (battle_id, agent_id)
);

-- Add battle_state JSONB column to battles for serverless state persistence
ALTER TABLE battles ADD COLUMN IF NOT EXISTS battle_state JSONB;
