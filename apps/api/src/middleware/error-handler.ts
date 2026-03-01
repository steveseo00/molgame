import type { Context } from "hono";
import { ERROR_CODES } from "@molgame/shared";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function insufficientSpark() {
  return new AppError(400, ERROR_CODES.INSUFFICIENT_SPARK, "Insufficient Spark balance");
}

export function invalidDeckSize() {
  return new AppError(400, ERROR_CODES.INVALID_DECK_SIZE, "Deck must contain 3-5 cards");
}

export function cardNotOwned() {
  return new AppError(403, ERROR_CODES.CARD_NOT_OWNED, "You do not own this card");
}

export function alreadyInQueue() {
  return new AppError(409, ERROR_CODES.ALREADY_IN_QUEUE, "Already in matchmaking queue");
}

export function notInBattle() {
  return new AppError(400, ERROR_CODES.NOT_IN_BATTLE, "Not currently in a battle");
}

export function invalidAction() {
  return new AppError(400, ERROR_CODES.INVALID_ACTION, "Invalid battle action");
}

export function authFailed() {
  return new AppError(401, ERROR_CODES.AUTH_FAILED, "Authentication failed");
}

export function rateLimitExceeded() {
  return new AppError(429, ERROR_CODES.RATE_LIMIT_EXCEEDED, "Rate limit exceeded");
}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      { error: { code: err.errorCode, message: err.message } },
      err.statusCode as 400,
    );
  }

  console.error("Unhandled error:", err);
  return c.json(
    { error: { code: 5000, message: "Internal server error" } },
    500,
  );
}
