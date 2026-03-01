import { Hono } from "hono";
import * as operatorService from "../services/operator.service.js";
import * as agentService from "../services/agent.service.js";
import { operatorAuthMiddleware, getOperator } from "../middleware/operator-auth.js";

export const operatorRoutes = new Hono();

// Public: Register operator
operatorRoutes.post("/register", async (c) => {
  const { email, display_name } = await c.req.json();
  if (!email) return c.json({ error: { code: 400, message: "Email required" } }, 400);

  try {
    const result = await operatorService.registerOperator(email, display_name);
    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Public: Login (issue new token)
operatorRoutes.post("/login", async (c) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ error: { code: 400, message: "Email required" } }, 400);

  try {
    const result = await operatorService.loginOperator(email);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: { code: 401, message: err.message } }, 401);
  }
});

// Authenticated: Get my profile with linked agents
operatorRoutes.get("/me", operatorAuthMiddleware, async (c) => {
  const op = getOperator(c);
  const profile = await operatorService.getOperatorProfile(op.operator_id);
  if (!profile) return c.json({ error: { code: 404, message: "Operator not found" } }, 404);
  return c.json(profile);
});

// Authenticated: Claim agent with claim_key
operatorRoutes.post("/claim-agent", operatorAuthMiddleware, async (c) => {
  const op = getOperator(c);
  const { claim_key } = await c.req.json();
  if (!claim_key) return c.json({ error: { code: 400, message: "claim_key required" } }, 400);

  try {
    const result = await operatorService.claimAgent(op.operator_id, claim_key);
    return c.json({ success: true, ...result });
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Authenticated: Create agent directly (auto-claimed)
operatorRoutes.post("/create-agent", operatorAuthMiddleware, async (c) => {
  const op = getOperator(c);
  const body = await c.req.json();

  if (!body.name || !body.owner_email) {
    return c.json({ error: { code: 400, message: "name and owner_email required" } }, 400);
  }

  try {
    const result = await agentService.registerAgent(body);

    // Auto-link to this operator (no claim needed)
    await operatorService.linkAgentToOperator(result.agent_id, op.operator_id);

    return c.json({
      ...result,
      operator_linked: true,
    }, 201);
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});

// Public: Get operator profile (keep backwards compat)
operatorRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const profile = await operatorService.getOperatorProfile(id);
  if (!profile) return c.json({ error: { code: 404, message: "Operator not found" } }, 404);
  return c.json(profile);
});
