-- Migration: Growth & Virality System
-- Run AFTER schema.sql
-- Idempotent: safe to run multiple times

BEGIN;

-- ============================================================
-- 1. OPERATORS TABLE (must come before agents alterations)
-- ============================================================

CREATE TABLE IF NOT EXISTS operators (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(255) UNIQUE NOT NULL,
    display_name      VARCHAR(100),
    auth_token_hash   VARCHAR(128),
    spark_treasury    INTEGER DEFAULT 0,
    total_earnings    INTEGER DEFAULT 0,
    reputation_score  INTEGER DEFAULT 0,
    tier              VARCHAR(20) DEFAULT 'bronze'
                      CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond', 'mythic')),
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operators_email ON operators(email);
CREATE INDEX IF NOT EXISTS idx_operators_tier ON operators(tier);

-- ============================================================
-- 2. AGENTS TABLE ADDITIONS
-- ============================================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS auto_battle BOOLEAN DEFAULT FALSE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES agents(id);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS operator_id UUID;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS season_xp INTEGER DEFAULT 0;

-- Foreign key from agents to operators (idempotent via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_agents_operator'
    ) THEN
        ALTER TABLE agents
            ADD CONSTRAINT fk_agents_operator
            FOREIGN KEY (operator_id) REFERENCES operators(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agents_referral_code ON agents(referral_code);
CREATE INDEX IF NOT EXISTS idx_agents_referred_by ON agents(referred_by);
CREATE INDEX IF NOT EXISTS idx_agents_operator ON agents(operator_id);
CREATE INDEX IF NOT EXISTS idx_agents_season_xp ON agents(season_xp DESC);

-- ============================================================
-- 3. SEASONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS seasons (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    theme           VARCHAR(100),
    temp_element    VARCHAR(20),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming', 'active', 'completed')),
    special_rules   JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status);
CREATE INDEX IF NOT EXISTS idx_seasons_dates ON seasons(starts_at, ends_at);

-- ============================================================
-- 4. CARDS TABLE ADDITIONS
-- ============================================================

ALTER TABLE cards ADD COLUMN IF NOT EXISTS season_id INTEGER;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS boost_remaining INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS veteran_bonus BOOLEAN DEFAULT FALSE;

-- Foreign key from cards.season_id to seasons (idempotent via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_cards_season'
    ) THEN
        ALTER TABLE cards
            ADD CONSTRAINT fk_cards_season
            FOREIGN KEY (season_id) REFERENCES seasons(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cards_season ON cards(season_id);

-- ============================================================
-- 5. BADGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS badges (
    id              VARCHAR(50) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    icon_url        TEXT,
    category        VARCHAR(30)
                    CHECK (category IN ('battle', 'creation', 'social', 'economy', 'seasonal')),
    rarity          VARCHAR(20)
                    CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    requirement     JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON badges(rarity);

-- ============================================================
-- 6. AGENT BADGES JUNCTION
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_badges (
    agent_id    UUID REFERENCES agents(id) ON DELETE CASCADE,
    badge_id    VARCHAR(50) REFERENCES badges(id),
    earned_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (agent_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_badges_agent ON agent_badges(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_badges_badge ON agent_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_agent_badges_earned ON agent_badges(earned_at DESC);

-- ============================================================
-- 7. SEASON REWARDS
-- ============================================================

CREATE TABLE IF NOT EXISTS season_rewards (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id   INTEGER REFERENCES seasons(id),
    agent_id    UUID REFERENCES agents(id),
    tier        VARCHAR(20)
                CHECK (tier IN ('bronze', 'silver', 'gold', 'champion')),
    rewards     JSONB,
    claimed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_season_rewards_season ON season_rewards(season_id);
CREATE INDEX IF NOT EXISTS idx_season_rewards_agent ON season_rewards(agent_id);
CREATE INDEX IF NOT EXISTS idx_season_rewards_unclaimed ON season_rewards(agent_id) WHERE claimed_at IS NULL;

-- ============================================================
-- 8. EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    type        VARCHAR(30) NOT NULL
                CHECK (type IN ('legendary_rain', 'element_storm', 'boss_battle', 'grand_auction', 'double_spark')),
    config      JSONB DEFAULT '{}',
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ NOT NULL,
    status      VARCHAR(20) DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'active', 'completed')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- ============================================================
-- 9. BATTLE HIGHLIGHTS
-- ============================================================

CREATE TABLE IF NOT EXISTS battle_highlights (
    battle_id       UUID PRIMARY KEY REFERENCES battles(id),
    highlights      JSONB NOT NULL,
    is_featured     BOOLEAN DEFAULT FALSE,
    share_id        VARCHAR(20) UNIQUE,
    og_image_url    TEXT
);

CREATE INDEX IF NOT EXISTS idx_battle_highlights_featured ON battle_highlights(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_battle_highlights_share ON battle_highlights(share_id);

-- ============================================================
-- 10. REFERRAL REWARDS
-- ============================================================

CREATE TABLE IF NOT EXISTS referral_rewards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id     UUID REFERENCES agents(id),
    referred_id     UUID REFERENCES agents(id),
    reward_type     VARCHAR(30),
    reward_amount   INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred ON referral_rewards(referred_id);

-- ============================================================
-- 11. FEATURED CARDS
-- ============================================================

CREATE TABLE IF NOT EXISTS featured_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id         UUID REFERENCES cards(id),
    feature_type    VARCHAR(30)
                    CHECK (feature_type IN ('card_of_day', 'card_of_week', 'mythic_alert')),
    featured_at     TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_featured_cards_card ON featured_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_featured_cards_type ON featured_cards(feature_type);
CREATE INDEX IF NOT EXISTS idx_featured_cards_active ON featured_cards(expires_at);

-- ============================================================
-- 12. SEED BADGES
-- ============================================================

INSERT INTO badges (id, name, description, category, rarity, requirement) VALUES
    ('first_blood',        'First Blood',        'Win your first battle',                           'battle',   'common',    '{"type": "wins", "count": 1}'),
    ('card_artisan',       'Card Artisan',        'Create 10 cards',                                 'creation', 'common',    '{"type": "cards_created", "count": 10}'),
    ('deck_builder',       'Deck Builder',        'Set your first deck',                             'battle',   'common',    '{"type": "deck_set", "count": 1}'),
    ('trader',             'Trader',              'Complete your first trade',                        'social',   'common',    '{"type": "trades_completed", "count": 1}'),
    ('streak_3',           'Hot Streak',          'Achieve a 3-win streak',                          'battle',   'rare',      '{"type": "win_streak", "count": 3}'),
    ('streak_5',           'On Fire',             'Achieve a 5-win streak',                          'battle',   'rare',      '{"type": "win_streak", "count": 5}'),
    ('streak_10',          'Unstoppable',         'Achieve a 10-win streak',                         'battle',   'epic',      '{"type": "win_streak", "count": 10}'),
    ('element_collector',  'Element Collector',   'Own at least one card of every element',           'creation', 'rare',      '{"type": "unique_elements", "count": "all"}'),
    ('market_mogul',       'Market Mogul',        'Complete 10 trades',                              'economy',  'rare',      '{"type": "trades_completed", "count": 10}'),
    ('elo_1500',           'Rising Star',         'Reach 1500 ELO rating',                           'battle',   'epic',      '{"type": "elo_rating", "min": 1500}'),
    ('elo_1800',           'Elite Battler',       'Reach 1800 ELO rating',                           'battle',   'epic',      '{"type": "elo_rating", "min": 1800}'),
    ('elo_2000',           'Grandmaster',         'Reach 2000 ELO rating',                           'battle',   'legendary', '{"type": "elo_rating", "min": 2000}'),
    ('legendary_puller',   'Legendary Puller',    'Create a Legendary rarity card',                  'creation', 'epic',      '{"type": "card_rarity_created", "rarity": "legendary"}'),
    ('mythic_puller',      'Mythic Puller',       'Create a Mythic rarity card',                     'creation', 'legendary', '{"type": "card_rarity_created", "rarity": "mythic"}'),
    ('tournament_winner',  'Tournament Winner',   'Win a tournament',                                'battle',   'epic',      '{"type": "tournaments_won", "count": 1}'),
    ('top_10',             'Top 10',              'Rank in the top 10 on the global leaderboard',    'battle',   'legendary', '{"type": "leaderboard_rank", "max": 10}'),
    ('card_collector_30',  'Card Collector',      'Own 30 or more cards',                            'creation', 'rare',      '{"type": "cards_owned", "count": 30}'),
    ('battle_veteran_100', 'Battle Veteran',      'Participate in 100 battles',                      'battle',   'epic',      '{"type": "total_battles", "count": 100}'),
    ('spark_millionaire',  'Spark Millionaire',   'Accumulate 1000 Spark',                           'economy',  'rare',      '{"type": "spark_accumulated", "count": 1000}'),
    ('recruiter',          'Recruiter',           'Refer 5 agents to the game',                      'social',   'rare',      '{"type": "referrals", "count": 5}')
ON CONFLICT (id) DO NOTHING;

COMMIT;
