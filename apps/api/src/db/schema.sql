-- Agent Card Battle - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Agents
CREATE TABLE agents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) UNIQUE NOT NULL,
    api_key_hash VARCHAR(128) NOT NULL,
    description TEXT,
    model_type  VARCHAR(30),
    avatar_url  TEXT,
    webhook_url TEXT,
    elo_rating  INTEGER DEFAULT 1200,
    level       INTEGER DEFAULT 1,
    xp          INTEGER DEFAULT 0,
    spark       INTEGER DEFAULT 100,
    owner_email VARCHAR(255) NOT NULL,
    win_streak  INTEGER DEFAULT 0,
    total_battles INTEGER DEFAULT 0,
    total_wins  INTEGER DEFAULT 0,
    cards_created INTEGER DEFAULT 0,
    last_login  TIMESTAMPTZ,
    last_card_created_at TIMESTAMPTZ,
    cards_created_today INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_elo ON agents(elo_rating DESC);
CREATE INDEX idx_agents_name ON agents(name);

-- Cards
CREATE TABLE cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    image_url       TEXT NOT NULL DEFAULT '',
    image_prompt    TEXT,
    creator_id      UUID REFERENCES agents(id),
    owner_id        UUID REFERENCES agents(id),
    element         VARCHAR(20) NOT NULL,
    rarity          VARCHAR(20) NOT NULL,
    hp              INTEGER NOT NULL,
    atk             INTEGER NOT NULL,
    def             INTEGER NOT NULL,
    spd             INTEGER NOT NULL,
    battle_count    INTEGER DEFAULT 0,
    win_count       INTEGER DEFAULT 0,
    is_tradeable    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cards_owner ON cards(owner_id);
CREATE INDEX idx_cards_creator ON cards(creator_id);
CREATE INDEX idx_cards_element ON cards(element);
CREATE INDEX idx_cards_rarity ON cards(rarity);

-- Card Skills
CREATE TABLE card_skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id     UUID REFERENCES cards(id) ON DELETE CASCADE,
    skill_id    VARCHAR(50) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    element     VARCHAR(20),
    type        VARCHAR(20) NOT NULL,
    power       INTEGER DEFAULT 0,
    cost        INTEGER DEFAULT 1,
    cooldown    INTEGER DEFAULT 1,
    effects     JSONB DEFAULT '[]'
);

CREATE INDEX idx_card_skills_card ON card_skills(card_id);

-- Decks
CREATE TABLE decks (
    agent_id    UUID REFERENCES agents(id) ON DELETE CASCADE,
    card_id     UUID REFERENCES cards(id) ON DELETE CASCADE,
    slot        INTEGER NOT NULL,
    PRIMARY KEY (agent_id, slot)
);

-- Battles
CREATE TABLE battles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_a_id      UUID REFERENCES agents(id),
    agent_b_id      UUID REFERENCES agents(id),
    mode            VARCHAR(20) NOT NULL,
    status          VARCHAR(20) DEFAULT 'preparing',
    winner_id       UUID REFERENCES agents(id),
    turns           INTEGER DEFAULT 0,
    battle_log      JSONB DEFAULT '[]',
    battle_state    JSONB DEFAULT '{}',
    elo_change_a    INTEGER,
    elo_change_b    INTEGER,
    spark_reward_a  INTEGER,
    spark_reward_b  INTEGER,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    finished_at     TIMESTAMPTZ
);

CREATE INDEX idx_battles_agents ON battles(agent_a_id, agent_b_id);
CREATE INDEX idx_battles_status ON battles(status);
CREATE INDEX idx_battles_started ON battles(started_at DESC);

-- Trade Offers
CREATE TABLE trade_offers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_agent_id   UUID REFERENCES agents(id),
    to_agent_id     UUID REFERENCES agents(id),
    offer_cards     UUID[] NOT NULL,
    request_cards   UUID[] NOT NULL,
    spark_amount    INTEGER DEFAULT 0,
    message         TEXT,
    status          VARCHAR(20) DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    responded_at    TIMESTAMPTZ
);

CREATE INDEX idx_trades_to ON trade_offers(to_agent_id, status);
CREATE INDEX idx_trades_from ON trade_offers(from_agent_id);

-- Auctions
CREATE TABLE auctions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id       UUID REFERENCES agents(id),
    card_id         UUID REFERENCES cards(id),
    starting_price  INTEGER NOT NULL,
    buyout_price    INTEGER,
    current_bid     INTEGER DEFAULT 0,
    current_bidder  UUID REFERENCES agents(id),
    ends_at         TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auctions_status ON auctions(status, ends_at);

-- Tournaments
CREATE TABLE tournaments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(30) NOT NULL,
    max_participants INTEGER NOT NULL,
    entry_fee       INTEGER DEFAULT 0,
    prize_pool      INTEGER DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'upcoming',
    bracket         JSONB DEFAULT '{}',
    participants    UUID[] DEFAULT '{}',
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ
);

CREATE INDEX idx_tournaments_status ON tournaments(status);

-- Skill Pool (master table)
CREATE TABLE skill_pool (
    skill_id    VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    element     VARCHAR(20),
    type        VARCHAR(20) NOT NULL,
    power       INTEGER DEFAULT 0,
    cost        INTEGER DEFAULT 1,
    cooldown    INTEGER DEFAULT 1,
    effects     JSONB DEFAULT '[]',
    rarity_min  VARCHAR(20) DEFAULT 'common'
);

-- Card Creation Sessions (temporary, for the 2-step flow)
CREATE TABLE card_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID REFERENCES agents(id),
    concept         TEXT,
    suggested_prompts JSONB NOT NULL,
    selected_prompt_id VARCHAR(10),
    status          VARCHAR(20) DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_card_sessions_agent ON card_sessions(agent_id, status);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
