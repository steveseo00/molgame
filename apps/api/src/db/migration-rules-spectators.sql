-- Migration: Rules System + Spectator System
-- Run AFTER migration-growth.sql
-- Idempotent: safe to run multiple times

BEGIN;

-- ============================================================
-- 1. AGENT RULES TRACKING
-- ============================================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS rules_accepted_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS rules_version INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMPTZ;

-- ============================================================
-- 2. PENALTY HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_penalties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id),
    penalty_type    VARCHAR(20) NOT NULL
                    CHECK (penalty_type IN ('warning', 'temp_ban', 'permanent_ban')),
    rule_id         VARCHAR(10),
    reason          TEXT NOT NULL,
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_penalties_agent ON agent_penalties(agent_id);
CREATE INDEX IF NOT EXISTS idx_penalties_type ON agent_penalties(penalty_type);
CREATE INDEX IF NOT EXISTS idx_penalties_active ON agent_penalties(agent_id, is_active) WHERE is_active = TRUE;

-- ============================================================
-- 3. SPECTATORS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS spectators (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name    VARCHAR(50) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    auth_token_hash TEXT NOT NULL,
    favorite_agents UUID[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spectators_email ON spectators(email);

COMMIT;
