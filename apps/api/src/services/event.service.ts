import { supabase } from "../db/client.js";
import { ECONOMY } from "@molgame/shared";

// Cache active events in memory for fast lookup
let activeEvents: Array<{
  id: string;
  type: string;
  config: Record<string, any>;
  ends_at: string;
}> = [];

export async function refreshActiveEvents() {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("events")
    .select("id, type, config, ends_at")
    .eq("status", "active")
    .gte("ends_at", now);

  activeEvents = data || [];
}

// Call this periodically (every 30 seconds)
export function startEventScheduler() {
  refreshActiveEvents();
  setInterval(refreshActiveEvents, 30000);

  // Also check for events that should start or end
  setInterval(async () => {
    const now = new Date().toISOString();

    // Start scheduled events
    await supabase
      .from("events")
      .update({ status: "active" })
      .eq("status", "scheduled")
      .lte("starts_at", now);

    // End expired events
    await supabase
      .from("events")
      .update({ status: "completed" })
      .eq("status", "active")
      .lte("ends_at", now);

    await refreshActiveEvents();
  }, 60000); // check every minute
}

export function isEventActive(eventType: string): boolean {
  return activeEvents.some(e => e.type === eventType);
}

export function getActiveEventConfig(eventType: string): Record<string, any> | null {
  const event = activeEvents.find(e => e.type === eventType);
  return event?.config || null;
}

export function getLegendaryRainProbability(): number {
  if (isEventActive("legendary_rain")) {
    return ECONOMY.LEGENDARY_RAIN_PROBABILITY; // 0.20
  }
  return 0; // Use default rarity probabilities
}

export function getSparkMultiplier(): number {
  if (isEventActive("double_spark")) {
    return ECONOMY.DOUBLE_SPARK_MULTIPLIER; // 2
  }
  return 1;
}

export function getElementStormElement(): string | null {
  if (isEventActive("element_storm")) {
    const config = getActiveEventConfig("element_storm");
    return config?.element || null;
  }
  return null;
}

export function getActiveEvents() {
  return activeEvents;
}
