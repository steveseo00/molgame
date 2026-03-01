/**
 * Integration Test v3 — Rules System + Spectator System
 * Tests new features: rules acceptance, enforcement, penalties, spectator registration
 */

const API = "http://localhost:8000/api/v1";
let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    failed++;
    failures.push(name);
    console.log(`  [FAIL] ${name}: ${err.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function authedApi(path: string, apiKey: string, options?: RequestInit) {
  return api(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...options?.headers,
    },
  });
}

async function main() {
  console.log("\n=== Integration Test v3: Rules + Spectator System ===\n");

  // --- SETUP: Register test agents ---
  let agentAKey = "";
  let agentAId = "";
  let agentBKey = "";
  let agentBId = "";

  console.log("--- Setup: Register Test Agents ---");

  await test("Register agent A for rules testing", async () => {
    const { status, body } = await api("/agents/register", {
      method: "POST",
      body: JSON.stringify({
        name: `RulesTestA_${Date.now()}`,
        owner_email: `rulesa_${Date.now()}@test.com`,
        model_type: "test",
      }),
    });
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body.agent_id, "Missing agent_id");
    assert(body.api_key, "Missing api_key");
    agentAId = body.agent_id;
    agentAKey = body.api_key;
  });

  await test("Register agent B for rules testing", async () => {
    const { status, body } = await api("/agents/register", {
      method: "POST",
      body: JSON.stringify({
        name: `RulesTestB_${Date.now()}`,
        owner_email: `rulesb_${Date.now()}@test.com`,
        model_type: "test",
      }),
    });
    assert(status === 201, `Expected 201, got ${status}`);
    agentBId = body.agent_id;
    agentBKey = body.api_key;
  });

  // --- PART 1: Rules System ---
  console.log("\n--- Part 1: Rules System ---");

  await test("GET /rules returns game rules (public)", async () => {
    const { status, body } = await api("/rules");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.version === 1, `Expected version 1, got ${body.version}`);
    assert(Array.isArray(body.rules), "rules should be an array");
    assert(body.rules.length === 10, `Expected 10 rules, got ${body.rules.length}`);
    assert(body.rules[0].id === "R1", `First rule should be R1`);
  });

  await test("GET /rules/status shows rules not accepted", async () => {
    const { status, body } = await authedApi("/rules/status", agentAKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.rules_accepted === false, "Rules should not be accepted yet");
    assert(body.agent_rules_version === 0, "Agent rules version should be 0");
    assert(body.current_rules_version === 1, "Current rules version should be 1");
  });

  await test("Card creation blocked without rules acceptance", async () => {
    const { status, body } = await authedApi("/cards/initiate", agentAKey, {
      method: "POST",
      body: JSON.stringify({ concept: "test dragon" }),
    });
    assert(status === 403, `Expected 403, got ${status}: ${JSON.stringify(body)}`);
    assert(body.error.code === "RULES_NOT_ACCEPTED", `Expected RULES_NOT_ACCEPTED, got ${body.error.code}`);
  });

  await test("POST /rules/accept accepts rules for agent A", async () => {
    const { status, body } = await authedApi("/rules/accept", agentAKey, {
      method: "POST",
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, "Expected success");
    assert(body.rules_version === 1, `Expected rules_version 1, got ${body.rules_version}`);
  });

  await test("GET /rules/status shows rules accepted", async () => {
    const { status, body } = await authedApi("/rules/status", agentAKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.rules_accepted === true, "Rules should be accepted");
    assert(body.agent_rules_version === 1, "Agent rules version should be 1");
    assert(body.ban_status === "clean", `Expected clean ban status, got ${body.ban_status}`);
  });

  await test("Card creation works after rules acceptance", async () => {
    const { status, body } = await authedApi("/cards/initiate", agentAKey, {
      method: "POST",
      body: JSON.stringify({ concept: "test dragon warrior" }),
    });
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body.session_id, "Expected session_id");
  });

  await test("Agent B still blocked (hasn't accepted rules)", async () => {
    const { status, body } = await authedApi("/cards/initiate", agentBKey, {
      method: "POST",
      body: JSON.stringify({ concept: "test phoenix" }),
    });
    assert(status === 403, `Expected 403, got ${status}`);
    assert(body.error.code === "RULES_NOT_ACCEPTED", "Expected RULES_NOT_ACCEPTED");
  });

  await test("Accept rules for agent B", async () => {
    const { status, body } = await authedApi("/rules/accept", agentBKey, {
      method: "POST",
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, "Expected success");
  });

  await test("GET /rules/penalties returns empty for clean agent", async () => {
    const { status, body } = await authedApi("/rules/penalties", agentAKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body.penalties), "penalties should be an array");
    assert(body.penalties.length === 0, "Should have no penalties");
  });

  // --- PART 2: Content Filter ---
  console.log("\n--- Part 2: Content Filter ---");

  await test("Card creation rejected for harmful content", async () => {
    const { status, body } = await authedApi("/cards/initiate", agentAKey, {
      method: "POST",
      body: JSON.stringify({ concept: "terrorist bomber dragon" }),
    });
    assert(status === 400, `Expected 400, got ${status}: ${JSON.stringify(body)}`);
    assert(body.error.message.includes("prohibited content"), `Expected prohibited content message, got: ${body.error.message}`);
  });

  await test("Agent now has a warning from content violation", async () => {
    // Wait a moment for async warning to be recorded
    await new Promise(r => setTimeout(r, 500));
    const { status, body } = await authedApi("/rules/penalties", agentAKey);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.penalties.length >= 1, `Expected at least 1 penalty, got ${body.penalties.length}`);
    assert(body.penalties[0].rule_id === "R5", `Expected rule R5, got ${body.penalties[0].rule_id}`);
    assert(body.penalties[0].penalty_type === "warning", `Expected warning, got ${body.penalties[0].penalty_type}`);
  });

  await test("Normal card creation still works after warning", async () => {
    const { status, body } = await authedApi("/cards/initiate", agentAKey, {
      method: "POST",
      body: JSON.stringify({ concept: "golden phoenix protector" }),
    });
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body.session_id, "Expected session_id");
  });

  // --- PART 3: Public Endpoints (Spectator Access) ---
  console.log("\n--- Part 3: Public Endpoints ---");

  await test("Agent profile is publicly accessible (no auth)", async () => {
    const { status, body } = await api(`/agents/${agentAId}/profile`);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body.id === agentAId, `Expected agent ${agentAId}`);
    assert(body.name, "Profile should have name");
  });

  await test("Agent cards are publicly accessible (no auth)", async () => {
    const { status, body } = await api(`/agents/${agentAId}/cards`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body.cards), "Expected cards array");
  });

  await test("Agent deck is publicly accessible (no auth)", async () => {
    const { status, body } = await api(`/agents/${agentAId}/deck`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body.deck), "Expected deck array");
  });

  await test("Card gallery is publicly accessible (no auth)", async () => {
    const { status, body } = await api("/cards/gallery");
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test("Stats endpoint is publicly accessible (no auth)", async () => {
    const { status, body } = await api("/stats");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof body.total_agents === "number", "Expected total_agents number");
  });

  await test("Auction list is publicly accessible (no auth)", async () => {
    const { status, body } = await api("/market/auction/list");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body.auctions), "Expected auctions array");
  });

  // --- PART 4: Spectator System ---
  console.log("\n--- Part 4: Spectator System ---");

  let spectatorToken = "";
  let spectatorId = "";

  await test("Register as human spectator", async () => {
    const { status, body } = await api("/spectators/register", {
      method: "POST",
      body: JSON.stringify({
        email: `spectator_${Date.now()}@test.com`,
        display_name: "TestSpectator",
      }),
    });
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert(body.auth_token, "Expected auth_token");
    assert(body.auth_token.startsWith("spec_"), `Token should start with 'spec_', got: ${body.auth_token.slice(0, 10)}`);
    assert(body.spectator_id, "Expected spectator_id");
    spectatorToken = body.auth_token;
    spectatorId = body.spectator_id;
  });

  await test("Get spectator profile", async () => {
    const { status, body } = await authedApi("/spectators/me", spectatorToken);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body.display_name === "TestSpectator", `Expected TestSpectator, got ${body.display_name}`);
    assert(body.id === spectatorId, "ID should match");
  });

  await test("Follow an agent", async () => {
    const { status, body } = await authedApi(`/spectators/favorites/${agentAId}`, spectatorToken, {
      method: "POST",
    });
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert(body.success === true, "Expected success");
  });

  await test("Verify agent in favorites", async () => {
    const { status, body } = await authedApi("/spectators/me", spectatorToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(body.favorite_agents), "Expected favorite_agents array");
    assert(body.favorite_agents.includes(agentAId), "Agent A should be in favorites");
  });

  await test("Unfollow an agent", async () => {
    const { status, body } = await authedApi(`/spectators/favorites/${agentAId}`, spectatorToken, {
      method: "DELETE",
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, "Expected success");
  });

  await test("Duplicate spectator registration rejected", async () => {
    const email = `dup_spec_${Date.now()}@test.com`;
    await api("/spectators/register", {
      method: "POST",
      body: JSON.stringify({ email, display_name: "Dup1" }),
    });
    const { status, body } = await api("/spectators/register", {
      method: "POST",
      body: JSON.stringify({ email, display_name: "Dup2" }),
    });
    assert(status === 400, `Expected 400, got ${status}`);
    assert(body.error.message.includes("already registered"), `Expected already registered: ${body.error.message}`);
  });

  // --- PART 5: Spectator Cannot Play ---
  console.log("\n--- Part 5: Spectator Cannot Perform Game Actions ---");

  await test("Spectator token rejected on agent auth endpoint (card creation)", async () => {
    const { status } = await authedApi("/cards/initiate", spectatorToken, {
      method: "POST",
      body: JSON.stringify({ concept: "spectator tries to create" }),
    });
    assert(status === 401, `Expected 401 (auth rejected), got ${status}`);
  });

  await test("Spectator token rejected on battle queue", async () => {
    const { status } = await authedApi("/battle/queue", spectatorToken, {
      method: "POST",
      body: JSON.stringify({ deck: ["a", "b", "c"], mode: "casual" }),
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // --- PART 6: Battle routes public access ---
  console.log("\n--- Part 6: Battle Replay Public Access ---");

  await test("Battle state/replay accessible without auth (404 for non-existent)", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const { status, body } = await api(`/battle/${fakeId}`);
    assert(status === 404, `Expected 404, got ${status}: ${JSON.stringify(body)}`);
    assert(body.error.message === "Battle not found", "Expected battle not found");
  });

  await test("Battle replay accessible without auth (404 for non-existent)", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const { status, body } = await api(`/battle/${fakeId}/replay`);
    assert(status === 404, `Expected 404, got ${status}`);
  });

  // --- PART 7: Edge Cases ---
  console.log("\n--- Part 7: Edge Cases ---");

  await test("Rules acceptance is idempotent", async () => {
    const { status, body } = await authedApi("/rules/accept", agentAKey, {
      method: "POST",
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(body.success === true, "Should succeed on re-acceptance");
  });

  await test("Invalid spectator token rejected", async () => {
    const { status } = await authedApi("/spectators/me", "spec_invalid_token_12345");
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test("Agent token rejected on spectator endpoints", async () => {
    const { status } = await authedApi("/spectators/me", agentAKey);
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // --- SUMMARY ---
  console.log("\n" + "=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failures.length > 0) {
    console.log("\nFailed tests:");
    for (const f of failures) {
      console.log(`  - ${f}`);
    }
  }
  console.log("=".repeat(50) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
