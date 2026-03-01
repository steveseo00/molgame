/**
 * Agent Card Battle — Full Integration Test
 * Tests the complete game flow with 10 agents:
 * 1. Register agents
 * 2. Create cards
 * 3. Set decks
 * 4. Run battles
 * 5. Trade cards
 * 6. Check leaderboard
 */

const API = "http://localhost:8000/api/v1";

interface Agent {
  id: string;
  name: string;
  api_key: string;
  cards: string[];
}

const AGENT_CONFIGS = [
  { name: "AlphaStrategist", model: "claude", desc: "Master tactician with shadow affinity" },
  { name: "BlazeRunner", model: "gpt", desc: "Aggressive fire-based attacker" },
  { name: "AquaMind", model: "gemini", desc: "Defensive water specialist" },
  { name: "ThunderVolt", model: "claude", desc: "Speed-focused lightning expert" },
  { name: "NatureSage", model: "llama", desc: "Balanced nature healer" },
  { name: "ShadowPhantom", model: "gpt", desc: "Stealth and debuff master" },
  { name: "LightBringer", model: "gemini", desc: "Holy warrior with strong buffs" },
  { name: "IronForge", model: "mistral", desc: "Heavy defense tank build" },
  { name: "StormCaller", model: "claude", desc: "AoE lightning devastator" },
  { name: "VoidWalker", model: "custom", desc: "Unpredictable shadow trickster" },
];

const CARD_CONCEPTS = [
  ["fire phoenix warrior", "shadow assassin cat", "lightning mech dragon"],
  ["blazing inferno titan", "flame spirit fox", "volcanic golem"],
  ["ocean guardian whale", "ice crystal knight", "tidal wave serpent"],
  ["electric samurai", "thunder hawk", "plasma golem"],
  ["forest ancient treant", "vine whip serpent", "bloom fairy"],
  ["dark reaper", "nightmare wolf", "void wraith"],
  ["holy paladin", "divine eagle", "radiant angel"],
  ["steel fortress golem", "armored rhino", "iron wall sentinel"],
  ["storm dragon", "tornado eagle", "spark elemental"],
  ["shadow demon king", "abyss lurker", "dark matter beast"],
];

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error(`API ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function authHeader(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
}

// ─── Step 1: Register Agents ───────────────────────────────

async function registerAgents(): Promise<Agent[]> {
  console.log("\n═══ Step 1: Registering 10 Agents ═══\n");
  const agents: Agent[] = [];

  for (const cfg of AGENT_CONFIGS) {
    const result = await api("/agents/register", {
      method: "POST",
      body: JSON.stringify({
        name: cfg.name,
        description: cfg.desc,
        model_type: cfg.model,
        owner_email: `${cfg.name.toLowerCase()}@agentbattle.ai`,
      }),
    });

    if (result.error) {
      console.log(`  ✗ ${cfg.name}: ${result.error.message}`);
      continue;
    }

    agents.push({
      id: result.agent_id,
      name: cfg.name,
      api_key: result.api_key,
      cards: [],
    });
    console.log(`  ✓ ${cfg.name} registered (ELO: 1200, Spark: 100)`);
  }

  console.log(`\n  Total: ${agents.length} agents registered`);
  return agents;
}

// ─── Step 2: Create Cards ──────────────────────────────────

async function resetCooldown(agentId: string, apiKey: string) {
  // Reset cooldown by updating last_card_created_at to the past
  // We do this via a profile trick - actually we need Supabase direct access
  // Instead, we'll use the service role key from env
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
    }),
  });
}

async function createCardsForAgent(agent: Agent, concepts: string[]): Promise<string[]> {
  const cardIds: string[] = [];

  for (const concept of concepts) {
    // Reset cooldown before each card
    await resetCooldown(agent.id, agent.api_key);

    // Step 1: Initiate
    const initResult = await api("/cards/initiate", {
      method: "POST",
      headers: authHeader(agent.api_key),
      body: JSON.stringify({ concept }),
    });

    if (initResult.error) {
      console.log(`    ✗ ${agent.name} initiate failed: ${initResult.error.message}`);
      continue;
    }

    // Step 2: Generate (select first prompt)
    const genResult = await api("/cards/generate", {
      method: "POST",
      headers: authHeader(agent.api_key),
      body: JSON.stringify({
        session_id: initResult.session_id,
        prompt_id: "p1",
      }),
    });

    if (genResult.error) {
      console.log(`    ✗ ${agent.name} generate failed: ${genResult.error.message}`);
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
  console.log("\n═══ Step 2: Creating Cards (3 per agent) ═══\n");

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    console.log(`  ${agent.name}:`);
    const cardIds = await createCardsForAgent(agent, CARD_CONCEPTS[i]);
    agent.cards = cardIds;
  }

  const totalCards = agents.reduce((sum, a) => sum + a.cards.length, 0);
  console.log(`\n  Total: ${totalCards} cards created`);
}

// ─── Step 3: Set Decks ─────────────────────────────────────

async function setDecks(agents: Agent[]) {
  console.log("\n═══ Step 3: Setting Battle Decks ═══\n");

  for (const agent of agents) {
    if (agent.cards.length < 3) {
      console.log(`  ✗ ${agent.name}: Not enough cards (${agent.cards.length})`);
      continue;
    }

    const result = await api(`/agents/${agent.id}/deck`, {
      method: "PUT",
      headers: authHeader(agent.api_key),
      body: JSON.stringify({ card_ids: agent.cards.slice(0, 3) }),
    });

    if (result.error) {
      console.log(`  ✗ ${agent.name}: ${result.error.message}`);
    } else {
      console.log(`  ✓ ${agent.name}: Deck set with ${agent.cards.length} cards`);
    }
  }
}

// ─── Step 4: Run Battles ───────────────────────────────────

async function runBattle(agentA: Agent, agentB: Agent): Promise<any> {
  console.log(`\n  ⚔ ${agentA.name} vs ${agentB.name}`);

  // Agent A joins queue
  const queueA = await api("/battle/queue", {
    method: "POST",
    headers: authHeader(agentA.api_key),
    body: JSON.stringify({ deck: agentA.cards.slice(0, 3), mode: "ranked" }),
  });

  if (queueA.error) {
    console.log(`    ✗ ${agentA.name} queue failed: ${queueA.error.message}`);
    return null;
  }

  // Agent B joins queue (should match immediately)
  const queueB = await api("/battle/queue", {
    method: "POST",
    headers: authHeader(agentB.api_key),
    body: JSON.stringify({ deck: agentB.cards.slice(0, 3), mode: "ranked" }),
  });

  if (queueB.error) {
    console.log(`    ✗ ${agentB.name} queue failed: ${queueB.error.message}`);
    return null;
  }

  // Find the battle ID
  const battleId = queueA.battle_id || queueB.battle_id;
  if (!battleId) {
    console.log("    ✗ No battle created (both in queue, no match)");
    // Try to leave queue
    await api("/battle/queue", { method: "DELETE", headers: authHeader(agentA.api_key) });
    await api("/battle/queue", { method: "DELETE", headers: authHeader(agentB.api_key) });
    return null;
  }

  console.log(`    Battle ID: ${battleId}`);

  // Simulate battle turns
  let battleState: any = null;
  const actions = ["basic_attack", "basic_attack", "use_skill", "basic_attack", "defend"];

  for (let turn = 0; turn < 30; turn++) {
    // Get current state to check skills
    const state = await api(`/battle/${battleId}`, {
      headers: authHeader(agentA.api_key),
    });

    if (state.error || state.status === "finished") {
      battleState = state;
      break;
    }

    // Determine actions based on available skills
    const actionA = getSmartAction(state, agentA.id, turn);
    const actionB = getSmartAction(state, agentB.id, turn);

    // Both agents submit actions
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

  // Get final state
  const finalState = await api(`/battle/${battleId}`, {
    headers: authHeader(agentA.api_key),
  });

  if (finalState.winner_id) {
    const winner =
      finalState.winner_id === agentA.id ? agentA.name : agentB.name;
    console.log(
      `    → Winner: ${winner} (Turn ${finalState.turn})`,
    );
  } else {
    console.log(`    → Draw (Turn ${finalState.turn || "?"})`);
  }

  return finalState;
}

function getSmartAction(state: any, agentId: string, turn: number) {
  // Find which side this agent is
  const isA = state.agent_a?.agent_id === agentId;
  const agentState = isA ? state.agent_a : state.agent_b;

  if (!agentState?.cards) {
    return { action: "basic_attack" };
  }

  const activeCard = agentState.cards[agentState.active_card_index];
  if (!activeCard) {
    return { action: "basic_attack" };
  }

  // Try to use a skill if available (off cooldown)
  if (activeCard.card?.skills) {
    for (const skill of activeCard.card.skills) {
      const cooldown = activeCard.skill_cooldowns?.[skill.skill_id] ?? 0;
      if (cooldown === 0 && skill.type === "attack" && skill.power > 0) {
        return { action: "use_skill", skill_id: skill.skill_id };
      }
    }
  }

  // Defend every 4th turn
  if (turn % 4 === 3) {
    return { action: "defend" };
  }

  return { action: "basic_attack" };
}

async function runAllBattles(agents: Agent[]) {
  console.log("\n═══ Step 4: Running Battles ═══");

  const battleResults: any[] = [];
  // Create 5 battle matchups
  const matchups = [
    [0, 1], // AlphaStrategist vs BlazeRunner
    [2, 3], // AquaMind vs ThunderVolt
    [4, 5], // NatureSage vs ShadowPhantom
    [6, 7], // LightBringer vs IronForge
    [8, 9], // StormCaller vs VoidWalker
  ];

  for (const [a, b] of matchups) {
    if (agents[a].cards.length >= 3 && agents[b].cards.length >= 3) {
      const result = await runBattle(agents[a], agents[b]);
      battleResults.push(result);
    } else {
      console.log(`\n  ⚠ Skipping ${agents[a].name} vs ${agents[b].name} (insufficient cards)`);
    }
  }

  console.log(`\n  Total battles completed: ${battleResults.filter(Boolean).length}`);
  return battleResults;
}

// ─── Step 5: Test Trading ──────────────────────────────────

async function testTrading(agents: Agent[]) {
  console.log("\n═══ Step 5: Testing Marketplace ═══\n");

  if (agents.length < 2 || agents[0].cards.length < 1 || agents[1].cards.length < 1) {
    console.log("  ⚠ Not enough agents/cards to test trading");
    return;
  }

  const seller = agents[0];
  const buyer = agents[1];
  const offerCardId = seller.cards[seller.cards.length - 1]; // last card
  const requestCardId = buyer.cards[buyer.cards.length - 1]; // last card

  // Create trade offer
  console.log(`  ${seller.name} offers card to ${buyer.name}...`);
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
    return;
  }
  console.log(`  ✓ Trade offer created: ${offer.offer_id || offer.id}`);

  // View offers
  const offers = await api("/market/offers", {
    headers: authHeader(buyer.api_key),
  });
  console.log(`  ✓ ${buyer.name} has ${offers.offers?.length ?? 0} pending offers`);

  // Accept the offer
  const offerId = offer.offer_id || offer.id;
  if (offerId) {
    const response = await api("/market/respond", {
      method: "POST",
      headers: authHeader(buyer.api_key),
      body: JSON.stringify({
        offer_id: offerId,
        action: "accept",
      }),
    });

    if (response.error) {
      console.log(`  ✗ Trade accept failed: ${response.error.message}`);
    } else {
      console.log(`  ✓ Trade completed! Cards swapped between ${seller.name} and ${buyer.name}`);
    }
  }

  // Test auction
  if (agents[2] && agents[2].cards.length > 0) {
    const auctioneer = agents[2];
    const auctionCardId = auctioneer.cards[auctioneer.cards.length - 1];

    console.log(`\n  ${auctioneer.name} creates an auction...`);
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
    } else {
      console.log(`  ✓ Auction created: ${auction.auction_id || auction.id}`);

      // Place a bid
      const bidder = agents[3];
      const auctionId = auction.auction_id || auction.id;
      const bid = await api(`/market/auction/${auctionId}/bid`, {
        method: "POST",
        headers: authHeader(bidder.api_key),
        body: JSON.stringify({ amount: 30 }),
      });

      if (bid.error) {
        console.log(`  ✗ Bid failed: ${bid.error.message}`);
      } else {
        console.log(`  ✓ ${bidder.name} placed bid of 30 Spark`);
      }
    }
  }
}

// ─── Step 6: Leaderboard ───────────────────────────────────

async function checkLeaderboard() {
  console.log("\n═══ Step 6: Leaderboard ═══\n");

  const leaderboard = await api("/leaderboard");

  if (leaderboard.error) {
    console.log(`  ✗ Leaderboard error: ${leaderboard.error.message}`);
    return;
  }

  console.log("  Agent Rankings:");
  const entries = leaderboard.leaderboard || leaderboard;
  if (Array.isArray(entries)) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      console.log(
        `    ${i + 1}. ${e.name} — ELO: ${e.elo_rating}, Wins: ${e.total_wins}/${e.total_battles}`,
      );
    }
  }

  // Card rankings
  const cardRanking = await api("/leaderboard/cards");
  if (!cardRanking.error) {
    const cards = cardRanking.leaderboard || cardRanking;
    if (Array.isArray(cards) && cards.length > 0) {
      console.log("\n  Top Cards:");
      for (const c of cards.slice(0, 5)) {
        console.log(`    • ${c.name} [${c.element}/${c.rarity}] — Wins: ${c.win_count}/${c.battle_count}`);
      }
    }
  }
}

// ─── Step 7: Gallery Check ─────────────────────────────────

async function checkGallery() {
  console.log("\n═══ Step 7: Card Gallery ═══\n");

  const gallery = await api("/cards/gallery?limit=5");
  if (gallery.error) {
    console.log(`  ✗ Gallery error: ${gallery.error.message}`);
    return;
  }

  console.log(`  Total cards in gallery: ${gallery.total}`);
  if (gallery.cards) {
    for (const c of gallery.cards) {
      console.log(
        `    • ${c.name} [${c.element}/${c.rarity}] by ${c.creator_id?.slice(0, 8)}...`,
      );
    }
  }
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║   Agent Card Battle — Integration Test        ║");
  console.log("╚═══════════════════════════════════════════════╝");

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

  try {
    // Step 1
    const agents = await registerAgents();
    if (agents.length < 2) {
      console.error("\nNot enough agents registered. Aborting.");
      process.exit(1);
    }

    // Step 2
    await createAllCards(agents);

    // Step 3
    await setDecks(agents);

    // Step 4
    await runAllBattles(agents);

    // Step 5
    await testTrading(agents);

    // Step 6
    await checkLeaderboard();

    // Step 7
    await checkGallery();

    console.log("\n╔═══════════════════════════════════════════════╗");
    console.log("║   Integration Test Complete!                  ║");
    console.log("╚═══════════════════════════════════════════════╝\n");
  } catch (err) {
    console.error("\n✗ Test failed:", err);
    process.exit(1);
  }
}

main();
