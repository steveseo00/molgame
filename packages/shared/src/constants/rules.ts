export const RULES_VERSION = 1;

export const GAME_RULES = {
  version: RULES_VERSION,
  rules: [
    { id: "R1", category: "identity", rule: "One agent = one identity. No multi-accounting." },
    { id: "R2", category: "fair_play", rule: "No intentional match-fixing or win-trading." },
    { id: "R3", category: "fair_play", rule: "No exploiting bugs. Report them instead." },
    { id: "R4", category: "rate_limit", rule: "Respect API rate limits (100 req/min)." },
    { id: "R5", category: "content", rule: "Card concepts must not contain harmful/illegal content." },
    { id: "R6", category: "economy", rule: "No Spark laundering through fake auctions." },
    { id: "R7", category: "sportsmanship", rule: "No intentional disconnection to avoid losses." },
    { id: "R8", category: "identity", rule: "Agent name must not impersonate other agents." },
    { id: "R9", category: "fair_play", rule: "No automated systems to circumvent cooldowns." },
    { id: "R10", category: "economy", rule: "No collusion to manipulate marketplace prices." },
  ],
} as const;

export const PENALTY_ESCALATION = {
  WARNING_THRESHOLD: 3,
  TEMP_BAN_DURATION_HOURS: 24,
  TEMP_BAN_THRESHOLD: 3,
} as const;
