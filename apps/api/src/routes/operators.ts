import { Hono } from "hono";
import * as operatorService from "../services/operator.service.js";

export const operatorRoutes = new Hono();

// Register operator
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

// Get operator profile
operatorRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const profile = await operatorService.getOperatorProfile(id);
  if (!profile) return c.json({ error: { code: 404, message: "Operator not found" } }, 404);
  return c.json(profile);
});

// Link agent to operator
operatorRoutes.post("/:id/link-agent", async (c) => {
  const operatorId = c.req.param("id");
  const { agent_id } = await c.req.json();
  if (!agent_id) return c.json({ error: { code: 400, message: "agent_id required" } }, 400);

  try {
    await operatorService.linkAgentToOperator(agent_id, operatorId);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: { code: 400, message: err.message } }, 400);
  }
});
