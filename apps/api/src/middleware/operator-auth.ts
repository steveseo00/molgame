import type { Context, Next } from "hono";
import { supabase } from "../db/client.js";
import { AppError } from "./error-handler.js";
import { ERROR_CODES } from "@molgame/shared";
import * as argon2 from "argon2";

export interface OperatorContext {
  operator_id: string;
  email: string;
  display_name: string;
}

// Cache verified operator tokens
const operatorCache = new Map<string, { operator_id: string; email: string; display_name: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function operatorAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer op_")) {
    throw new AppError(401, ERROR_CODES.OPERATOR_AUTH_FAILED, "Missing or invalid operator token. Must start with 'op_'");
  }

  const token = authHeader.slice(7);

  // Check cache first
  const cached = operatorCache.get(token);
  if (cached && cached.expires > Date.now()) {
    c.set("operator", { operator_id: cached.operator_id, email: cached.email, display_name: cached.display_name });
    await next();
    return;
  }

  // Verify against DB
  const { data: operators } = await supabase
    .from("operators")
    .select("id, email, display_name, auth_token_hash")
    .limit(100);

  if (!operators) {
    throw new AppError(401, ERROR_CODES.OPERATOR_AUTH_FAILED, "Authentication failed");
  }

  for (const op of operators) {
    try {
      const valid = await argon2.verify(op.auth_token_hash, token);
      if (valid) {
        operatorCache.set(token, {
          operator_id: op.id,
          email: op.email,
          display_name: op.display_name,
          expires: Date.now() + CACHE_TTL,
        });
        c.set("operator", { operator_id: op.id, email: op.email, display_name: op.display_name });
        await next();
        return;
      }
    } catch {
      continue;
    }
  }

  throw new AppError(401, ERROR_CODES.OPERATOR_AUTH_FAILED, "Invalid operator token");
}

export function getOperator(c: Context): OperatorContext {
  return c.get("operator") as OperatorContext;
}
