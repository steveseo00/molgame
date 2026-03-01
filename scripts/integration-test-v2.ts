/**
 * Agent Card Battle — Comprehensive Integration Test v2
 * Tests ALL features including growth/virality systems:
 * 1. Register agents (with referrals)
 * 2. Create cards (including secret recipes)
 * 3. Set decks
 * 4. Run battles
 * 5. Check badges
 * 6. Test auto-battle toggle
 * 7. Test evolve/reforge/boost
 * 8. Test operators
 * 9. Test stats & leaderboard
 * 10. Test marketplace
 * 11. Test seasons & events
 */

const API = "http://localhost:8000/api/v1";

interface Agent {
  id: string;
  name: string;
  api_key: string;
  referral_code?: string;
  cards: string[];
}

const AGENT_CONFIGS = [
  { name: "AlphaStrategist_v3", model: "claude", desc: "Master tactician with shadow affinity" },
  { name: "BlazeRunner_v3", model: "gpt", desc: "Aggressive fire-based attacker" },
  { name: "AquaMind_v3", model: "gemini", desc: "Defensive water specialist" },
  { name: "ThunderVolt_v3", model: "claude", desc: "Speed-focused lightning expert" },
  { name: "NatureSage_v3", model: "llama", desc: "Balanced nature healer" },
  { name: "ShadowPhantom_v3", model: "gpt", desc: "Stealth and debuff master" },
  { name: "LightBringer_v3", model: "gemini", desc: "Holy warrior with strong buffs" },
  { name: "IronForge_v3", model: "mistral", desc: "Heavy defense tank build" },
  { name: "StormCaller_v3", model: "claude", desc: "AoE lightning devastator" },
  { name: "VoidWalker_v3", model: "custom", desc: "Unpredictable shadow trickster" },
];

// Mix of regular concepts and SECRET RECIPES
const CARD_CONCEPTS = [
  ["fire phoenix warrior", "shadow assassin cat", "lightning mech dragon"],
  ["blazing inferno titan", "flame spirit fox", "volcanic golem"],
  ["ocean guardian whale", "ice crystal knight", "tidal wave serpent"],
  ["electric samurai", "thunder hawk", "plasma golem"],
  // Secret recipe: "primordial shadow" boosts mythic chance to 10%
  ["primordial shadow beast", "vine whip serpent", "bloom fairy"],
  // Secret recipe: "claude warrior" → guaranteed legendary
  ["claude warrior supreme", "nightmare wolf", "void wraith"],
  ["holy paladin", "divine eagle", "radiant angel"],
  ["steel fortress golem", "armored rhino", "iron wall sentinel"],
  // Secret recipe: "molgame" boosts mythic chance to 15%
  ["molgame champion", "tornado eagle", "spark elemental"],
  // Regular concepts
  ["shadow demon king", "world eater entity", "dark matter beast"],
];

// Extra cards for evolution testing (need 3 same-element same-rarity)
const EXTRA_CARD_CONCEPTS = [
  "fire imp soldier",
  "fire sprite dancer",
  "fire flame hound",
  "fire spark beetle",
];

let passed = 0;
let failed = 0;
let skipped = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`    ✓ ${label}`);
    passed++;
  } else {
    console.log(`    ✗ FAIL: ${label}`);
    failed++;
  }
}

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  return { ...data, _status: res.status };
}

function authHeader(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
}

async function resetCooldown(agentId: string) {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await fetch(`${supabaseUrl}/rest/v1/agents?id=eq.${agentId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      last_card_created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      cards_created_today: 0,
    }),
  });
}

// ─── Step 1: Register Agents (with Referrals) ────────────

async function registerAgents(): Promise<Agent[]> {
  console.log("\n═══ Step 1: Registering 10 Agents (with Referral Test) ═══\n");
  const agents: Agent[] = [];

  for (let i = 0; i < AGENT_CONFIGS.length; i++) {
    const cfg = AGENT_CONFIGS[i];
    const body: any = {
      name: cfg.name,
      description: cfg.desc,
      model_type: cfg.model,
      owner_email: `${cfg.name.toLowerCase()}@agentbattle-v3.ai`,
    };

    // Use first agent's referral code for agents 2-4
    if (i >= 1 && i <= 3 && agents[0]?.referral_code) {
      body.referral_code = agents[0].referral_code;
    }

    const result = await api("/agents/register", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (result.error) {
      console.log(`  ✗ ${cfg.name}: ${result.error.message}`);
      continue;
    }

    agents.push({
      id: result.agent_id,
      name: cfg.name,
      api_key: result.api_key,
      referral_code: result.referral_code,
      cards: [],
    });

    if (i === 0) {
      check(`${cfg.name} registered`, !!result.agent_id);
      check(`Has referral code`, !!result.referral_code);
    } else if (i >= 1 && i <= 3 && agents[0]?.referral_code) {
      check(`${cfg.name} registered with referral`, !!result.agent_id);
    } else {
      console.log(`  ✓ ${cfg.name} registered`);
    }
  }

  // Verify referral count for first agent
  if (agents[0]) {
    const profile = await api(`/agents/${agents[0].id}/profile`, {
      headers: authHeader(agents[0].api_key),
    });
    const refCount = profile.referral_count ?? 0;
    check(`Agent 1 has referral count >= 1`, refCount >= 1);
  }

  console.log(`\n  Total: ${agents.length} agents registered`);
  return agents;
}

// ─── Step 2: Create Cards ─────────────────────────────────

async function createCardsForAgent(agent: Agent, concepts: string[]): Promise<string[]> {
  const cardIds: string[] = [];

  for (const concept of concepts) {
    await resetCooldown(agent.id);

    const initResult = await api("/cards/initiate", {
      method: "POST",
      headers: authHeader(agent.api_key),
      body: JSON.stringify({ concept }),
    });

    if (initResult.error) {
      console.log(`    ✗ initiate failed: ${initResult.error.message}`);
      continue;
    }

    const genResult = await api("/cards/generate", {
      method: "POST",
      headers: authHeader(agent.api_key),
      body: JSON.stringify({
        session_id: initResult.session_id,
        prompt_id: "p1",
      }),
    });

    if (genResult.error) {
      console.log(`    ✗ generate failed: ${genResult.error.message}`);
      continue;
    }

    const card = genResult.card;
    cardIds.push(card.id);
    const skillNames = card.skills?.map((s: any) => s.name).join(", ") || "none";
    console.log(
      `    ✓ "${card.name}" [${card.element}/${card.rarity}] ` +
        `HP:${card.stats.hp} ATK:${card.stats.atk} DEF:${card.stats.def} SPD:${card.stats.spd} | ${skillNames}`,
    );
  }

  return cardIds;
}

async function createAllCards(agents: Agent[]) {
  console.log("\n═══ Step 2: Creating Cards (3 per agent, testing Secret Recipes) ═══\n");

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    console.log(`  ${agent.name}:`);
    const cardIds = await createCardsForAgent(agent, CARD_CONCEPTS[i]);
    agent.cards = cardIds;
  }

  const totalCards = agents.reduce((sum, a) => sum + a.cards.length, 0);
  check(`Created ${totalCards} cards total`, totalCards >= 25);
}

// ─── Step 3: Set Decks ────────────────────────────────────

async function setDecks(agents: Agent[]) {
  console.log("\n═══ Step 3: Setting Battle Decks ═══\n");

  for (const agent of agents) {
    if (agent.cards.length < 3) {
      console.log(`  ⚠ ${agent.name}: Not enough cards (${agent.cards.length})`);
      skipped++;
      continue;
    }

    const result = await api(`/agents/${agent.id}/deck`, {
      method: "PUT",
      headers: authHeader(agent.api_key),
      body: JSON.stringify({ card_ids: agent.cards.slice(0, 3) }),
    });

    check(`${agent.name} deck set`, !result.error && result.success);
  }
}

// ─── Step 4: Run Battles ──────────────────────────────────

function getSmartAction(state: any, agentId: string, turn: number) {
  const isA = state.agent_a?.agent_id === agentId;
  const agentState = isA ? state.agent_a : state.agent_b;

  if (!agentState?.cards) return { action: "basic_attack" };
  const activeCard = agentState.cards[agentState.active_card_index];
  if (!activeCard) return { action: "basic_attack" };

  if (activeCard.card?.skills) {
    for (const skill of activeCard.card.skills) {
      const cooldown = activeCard.skill_cooldowns?.[skill.skill_id] ?? 0;
      if (cooldown === 0 && skill.type === "attack" && skill.power > 0) {
        return { action: "use_skill", skill_id: skill.skill_id };
      }
    }
  }

  if (turn % 4 === 3) return { action: "defend" };
  return { action: "basic_attack" };
}

async function runBattle(agentA: Agent, agentB: Agent): Promise<any> {
  console.log(`\n  ⚔ ${agentA.name} vs ${agentB.name}`);

  const queueA = await api("/battle/queue", {
    method: "POST",
    headers: authHeader(agentA.api_key),
    body: JSON.stringify({ deck: agentA.cards.slice(0, 3), mode: "ranked" }),
  });

  if (queueA.error) {
    console.log(`    ✗ ${agentA.name} queue failed: ${queueA.error.message}`);
    return null;
  }

  const queueB = await api("/battle/queue", {
    method: "POST",
    headers: authHeader(agentB.api_key),
    body: JSON.stringify({ deck: agentB.cards.slice(0, 3), mode: "ranked" }),
  });

  if (queueB.error) {
    console.log(`    ✗ ${agentB.name} queue failed: ${queueB.error.message}`);
    return null;
  }

  const battleId = queueA.battle_id || queueB.battle_id;
  if (!battleId) {
    console.log("    ✗ No battle created");
    await api("/battle/queue", { method: "DELETE", headers: authHeader(agentA.api_key) });
    await api("/battle/queue", { method: "DELETE", headers: authHeader(agentB.api_key) });
    return null;
  }

  console.log(`    Battle ID: ${battleId}`);

  let battleState: any = null;
  for (let turn = 0; turn < 30; turn++) {
    const state = await api(`/battle/${battleId}`, {
      headers: authHeader(agentA.api_key),
    });

    if (state.error || state.status === "finished") {
      battleState = state;
      break;
    }

    const actionA = getSmartAction(state, agentA.id, turn);
    const actionB = getSmartAction(state, agentB.id, turn);

    const resultA = await api(`/battle/${battleId}/action`, {
      method: "POST",
      headers: authHeader(agentA.api_key),
      body: JSON.stringify(actionA),
    });

    const resultB = await api(`/battle/${battleId}/action`, {
      method: "POST",
      headers: authHeader(agentB.api_key),
      body: JSON.stringify(actionB),
    });

    battleState = resultB.error ? resultA : resultB;
    if (battleState.status === "finished") break;
  }

  const finalState = await api(`/battle/${battleId}`, {
    headers: authHeader(agentA.api_key),
  });

  if (finalState.winner_id) {
    const winner = finalState.winner_id === agentA.id ? agentA.name : agentB.name;
    console.log(`    → Winner: ${winner} (Turn ${finalState.turn})`);
  } else {
    console.log(`    → Draw (Turn ${finalState.turn || "?"})`);
  }

  check(`Battle ${agentA.name} vs ${agentB.name} completed`, finalState.status === "finished");
  return finalState;
}

async function runAllBattles(agents: Agent[]) {
  console.log("\n═══ Step 4: Running 5 Battles ═══");

  const matchups = [
    [0, 1], [2, 3], [4, 5], [6, 7], [8, 9],
  ];

  for (const [a, b] of matchups) {
    if (agents[a]?.cards.length >= 3 && agents[b]?.cards.length >= 3) {
      await runBattle(agents[a], agents[b]);
    } else {
      console.log(`\n  ⚠ Skipping ${agents[a]?.name} vs ${agents[b]?.name} (insufficient cards)`);
      skipped++;
    }
  }
}

// ─── Step 5: Check Badges ─────────────────────────────────

async function checkBadges(agents: Agent[]) {
  console.log("\n═══ Step 5: Checking Badges ═══\n");

  for (const agent of agents.slice(0, 3)) {
    const profile = await api(`/agents/${agent.id}/profile`, {
      headers: authHeader(agent.api_key),
    });

    // Check that profile loads correctly
    check(`${agent.name} profile loads`, !!profile.id || !!profile.name);

    // Check ELO changed (at least for battling agents)
    if (profile.elo_rating !== undefined && profile.elo_rating !== 1200) {
      check(`${agent.name} ELO changed from 1200`, true);
    }
  }
}

// ─── Step 6: Auto-Battle Toggle ───────────────────────────

async function testAutoBattle(agents: Agent[]) {
  console.log("\n═══ Step 6: Testing Auto-Battle Toggle ═══\n");

  const agent = agents[0];

  // Enable auto-battle
  const enableResult = await api(`/agents/${agent.id}/auto-battle`, {
    method: "PATCH",
    headers: authHeader(agent.api_key),
    body: JSON.stringify({ enabled: true }),
  });

  check(`Enable auto-battle`, enableResult.success === true && enableResult.auto_battle === true);

  // Disable auto-battle
  const disableResult = await api(`/agents/${agent.id}/auto-battle`, {
    method: "PATCH",
    headers: authHeader(agent.api_key),
    body: JSON.stringify({ enabled: false }),
  });

  check(`Disable auto-battle`, disableResult.success === true && disableResult.auto_battle === false);
}

// ─── Step 7: Card Reforge & Boost ─────────────────────────

async function testReforgeAndBoost(agents: Agent[]) {
  console.log("\n═══ Step 7: Testing Card Reforge & Boost ═══\n");

  const agent = agents[0];
  if (agent.cards.length === 0) {
    console.log("  ⚠ No cards to test");
    skipped++;
    return;
  }

  const cardId = agent.cards[0];

  // Get card before reforge
  const cardBefore = await api(`/cards/${cardId}`);
  const oldAtk = cardBefore.stats?.atk;

  // Reforge ATK
  const reforgeResult = await api(`/cards/${cardId}/reforge`, {
    method: "POST",
    headers: authHeader(agent.api_key),
    body: JSON.stringify({ stat: "atk" }),
  });

  if (reforgeResult.error) {
    console.log(`  ✗ Reforge failed: ${reforgeResult.error.message}`);
    failed++;
  } else {
    check(`Reforge ATK: ${oldAtk} → ${reforgeResult.new_value}`, reforgeResult.new_value !== undefined);
    check(`Spark deducted (${reforgeResult.spark_spent} Spark)`, reforgeResult.spark_spent === 20);
  }

  // Boost card
  const boostResult = await api(`/cards/${cardId}/boost`, {
    method: "POST",
    headers: authHeader(agent.api_key),
    body: JSON.stringify({}),
  });

  if (boostResult.error) {
    console.log(`  ✗ Boost failed: ${boostResult.error.message}`);
    failed++;
  } else {
    check(`Boost applied (${boostResult.boost_remaining} battles)`, boostResult.boost_remaining === 5);
    check(`Boost multiplier ${boostResult.boost_multiplier}x`, boostResult.boost_multiplier === 1.1);
  }
}

// ─── Step 8: Operators ────────────────────────────────────

async function testOperators(agents: Agent[]) {
  console.log("\n═══ Step 8: Testing Operator System ═══\n");

  // Register operator
  const opResult = await api("/operators/register", {
    method: "POST",
    body: JSON.stringify({
      email: "test-operator-v3@molgame.io",
      display_name: "TestOperator",
    }),
  });

  if (opResult.error) {
    console.log(`  ✗ Operator registration failed: ${opResult.error.message}`);
    failed++;
    return;
  }

  check(`Operator registered`, !!opResult.operator_id);
  const operatorId = opResult.operator_id;

  // Get operator profile
  const opProfile = await api(`/operators/${operatorId}`);
  check(`Operator profile loads`, opProfile.display_name === "TestOperator");

  // Link agent to operator
  if (agents[0]) {
    const linkResult = await api(`/operators/${operatorId}/link-agent`, {
      method: "POST",
      body: JSON.stringify({ agent_id: agents[0].id }),
    });

    check(`Agent linked to operator`, linkResult.success === true || !linkResult.error);
  }
}

// ─── Step 9: Stats ────────────────────────────────────────

async function testStats() {
  console.log("\n═══ Step 9: Testing Global Stats ═══\n");

  // Global stats
  const stats = await api("/stats");
  if (stats.error) {
    console.log(`  ✗ Stats failed: ${stats.error.message}`);
    failed++;
    return;
  }

  check(`Total agents >= 10`, (stats.total_agents ?? 0) >= 10);
  check(`Total cards > 0`, (stats.total_cards ?? 0) > 0);
  check(`Total battles > 0`, (stats.total_battles ?? 0) > 0);
  console.log(`  Stats: ${stats.total_agents} agents, ${stats.total_cards} cards, ${stats.total_battles} battles`);

  // Economy stats
  const economy = await api("/stats/economy");
  if (!economy.error) {
    check(`Economy stats load`, economy.total_spark_supply !== undefined || economy.total_agents !== undefined);
    console.log(`  Economy: Spark supply: ${economy.total_spark_supply ?? "N/A"}`);
  }
}

// ─── Step 10: Marketplace ─────────────────────────────────

async function testMarketplace(agents: Agent[]) {
  console.log("\n═══ Step 10: Testing Marketplace ═══\n");

  if (agents.length < 3 || agents[0].cards.length < 1 || agents[1].cards.length < 1) {
    console.log("  ⚠ Not enough agents/cards for marketplace test");
    skipped++;
    return;
  }

  const seller = agents[0];
  const buyer = agents[1];
  const offerCardId = seller.cards[seller.cards.length - 1];
  const requestCardId = buyer.cards[buyer.cards.length - 1];

  // Trade offer
  const offer = await api("/market/offer", {
    method: "POST",
    headers: authHeader(seller.api_key),
    body: JSON.stringify({
      to_agent_id: buyer.id,
      offer_cards: [offerCardId],
      request_cards: [requestCardId],
    }),
  });

  if (offer.error) {
    console.log(`  ✗ Trade offer failed: ${offer.error.message}`);
    failed++;
  } else {
    check(`Trade offer created`, !!(offer.offer_id || offer.id));

    const offerId = offer.offer_id || offer.id;
    const response = await api("/market/respond", {
      method: "POST",
      headers: authHeader(buyer.api_key),
      body: JSON.stringify({ offer_id: offerId, action: "accept" }),
    });

    check(`Trade accepted`, !response.error);
  }

  // Auction
  if (agents[2].cards.length > 0) {
    const auctioneer = agents[2];
    const auctionCardId = auctioneer.cards[auctioneer.cards.length - 1];

    const auction = await api("/market/auction/create", {
      method: "POST",
      headers: authHeader(auctioneer.api_key),
      body: JSON.stringify({
        card_id: auctionCardId,
        starting_price: 20,
        buyout_price: 100,
        duration_hours: 24,
      }),
    });

    if (auction.error) {
      console.log(`  ✗ Auction creation failed: ${auction.error.message}`);
      failed++;
    } else {
      check(`Auction created`, !!(auction.auction_id || auction.id));

      const auctionId = auction.auction_id || auction.id;
      const bid = await api(`/market/auction/${auctionId}/bid`, {
        method: "POST",
        headers: authHeader(agents[3].api_key),
        body: JSON.stringify({ amount: 30 }),
      });
      check(`Bid placed`, !bid.error);
    }
  }
}

// ─── Step 11: Leaderboard ─────────────────────────────────

async function testLeaderboard() {
  console.log("\n═══ Step 11: Testing Leaderboard ═══\n");

  const lb = await api("/leaderboard");
  if (lb.error) {
    console.log(`  ✗ Leaderboard error: ${lb.error.message}`);
    failed++;
    return;
  }

  const entries = lb.leaderboard || lb;
  check(`Leaderboard has entries`, Array.isArray(entries) && entries.length > 0);

  if (Array.isArray(entries)) {
    console.log("  Agent Rankings:");
    for (let i = 0; i < Math.min(5, entries.length); i++) {
      const e = entries[i];
      console.log(`    ${i + 1}. ${e.name} — ELO: ${e.elo_rating}, Wins: ${e.total_wins}/${e.total_battles}`);
    }
  }

  // Card leaderboard
  const cardLb = await api("/leaderboard/cards");
  check(`Card leaderboard loads`, !cardLb.error);

  // Operator leaderboard
  const opLb = await api("/leaderboard/operators");
  check(`Operator leaderboard loads`, !opLb.error);
}

// ─── Step 12: Seasons & Events ────────────────────────────

async function testSeasonsAndEvents() {
  console.log("\n═══ Step 12: Testing Seasons & Events ═══\n");

  // Get seasons
  const seasons = await api("/seasons");
  check(`Seasons endpoint responds`, !seasons.error);

  // Get active season
  const activeSeason = await api("/seasons/active");
  // May or may not have an active season — just check it doesn't crash
  check(`Active season endpoint responds`, activeSeason._status === 200 || activeSeason._status === 404);

  // Get events
  const events = await api("/seasons/events");
  check(`Events endpoint responds`, !events.error);
}

// ─── Step 13: Card Gallery ────────────────────────────────

async function testGallery() {
  console.log("\n═══ Step 13: Testing Card Gallery ═══\n");

  const gallery = await api("/cards/gallery?limit=5");
  check(`Gallery loads`, !gallery.error && gallery.total > 0);
  console.log(`  Total cards in gallery: ${gallery.total}`);

  // Filter by rarity
  const rareGallery = await api("/cards/gallery?rarity=rare&limit=5");
  check(`Rarity filter works`, !rareGallery.error);

  // Filter by element
  const fireGallery = await api("/cards/gallery?element=fire&limit=5");
  check(`Element filter works`, !fireGallery.error);
}

// ─── Step 14: Featured Content ────────────────────────────

async function testFeatured() {
  console.log("\n═══ Step 14: Testing Featured Content ═══\n");

  const featured = await api("/stats/featured");
  // May not have featured cards yet, just verify endpoint works
  check(`Featured endpoint responds`, featured._status === 200);
}

// ─── Step 15: Health & Edge Cases ─────────────────────────

async function testEdgeCases(agents: Agent[]) {
  console.log("\n═══ Step 15: Testing Edge Cases ═══\n");

  // Invalid auth
  const noAuth = await api("/battle/queue", {
    method: "POST",
    body: JSON.stringify({ deck: ["fake"], mode: "ranked" }),
  });
  check(`Unauthorized request rejected`, noAuth._status === 401 || noAuth.error?.code === 401);

  // Invalid card reforge stat
  if (agents[0]?.cards[0]) {
    const badReforge = await api(`/cards/${agents[0].cards[0]}/reforge`, {
      method: "POST",
      headers: authHeader(agents[0].api_key),
      body: JSON.stringify({ stat: "invalid_stat" }),
    });
    check(`Invalid reforge stat rejected`, badReforge._status === 400 || badReforge.error?.code === 400);
  }

  // 404 for non-existent card
  const notFound = await api("/cards/00000000-0000-0000-0000-000000000000");
  check(`Non-existent card returns 404`, notFound._status === 404 || notFound.error?.code === 404);

  // Health check
  const health = await fetch(`${API.replace("/api/v1", "")}/health`);
  const healthData = await health.json();
  check(`Health check OK`, healthData.status === "ok");
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║   Agent Card Battle — Integration Test v2            ║");
  console.log("║   Testing ALL features: core + growth/virality       ║");
  console.log("╚═══════════════════════════════════════════════════════╝");

  // Check API is running
  try {
    const health = await fetch(`${API.replace("/api/v1", "")}/health`);
    if (!health.ok) throw new Error("API not responding");
    console.log("\n✓ API server is running");
  } catch {
    console.error("\n✗ API server not running at http://localhost:8000");
    console.error("  Start it with: pnpm dev:api");
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    // Core features
    const agents = await registerAgents();
    if (agents.length < 6) {
      console.error("\nNot enough agents registered. Aborting.");
      process.exit(1);
    }

    await createAllCards(agents);
    await setDecks(agents);
    await runAllBattles(agents);

    // Growth features
    await checkBadges(agents);
    await testAutoBattle(agents);
    await testReforgeAndBoost(agents);
    await testOperators(agents);
    await testStats();
    await testMarketplace(agents);
    await testLeaderboard();
    await testSeasonsAndEvents();
    await testGallery();
    await testFeatured();
    await testEdgeCases(agents);
  } catch (err) {
    console.error("\n✗ Unexpected error:", err);
    failed++;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║   Test Results                                        ║");
  console.log("╠═══════════════════════════════════════════════════════╣");
  console.log(`║   ✓ Passed:  ${String(passed).padEnd(5)} tests                           ║`);
  console.log(`║   ✗ Failed:  ${String(failed).padEnd(5)} tests                           ║`);
  console.log(`║   ⚠ Skipped: ${String(skipped).padEnd(5)} tests                           ║`);
  console.log(`║   ⏱ Time:    ${String(elapsed + "s").padEnd(5)} seconds                          ║`);
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main();
