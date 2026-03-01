import { supabase } from "../db/client.js";
import { nanoid } from "nanoid";
import * as argon2 from "argon2";

export async function registerSpectator(email: string, displayName: string) {
  const authToken = `spec_${nanoid(48)}`;
  const authTokenHash = await argon2.hash(authToken);

  const { data, error } = await supabase
    .from("spectators")
    .insert({
      email,
      display_name: displayName || email.split("@")[0],
      auth_token_hash: authTokenHash,
    })
    .select("id, display_name, email, created_at")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Email already registered as spectator");
    throw error;
  }

  return { spectator_id: data.id, ...data, auth_token: authToken };
}

export async function getSpectatorProfile(spectatorId: string) {
  const { data } = await supabase
    .from("spectators")
    .select("id, display_name, email, favorite_agents, created_at")
    .eq("id", spectatorId)
    .single();

  return data;
}

export async function addFavoriteAgent(spectatorId: string, agentId: string) {
  // Verify agent exists
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .single();

  if (!agent) throw new Error("Agent not found");

  const { data: spectator } = await supabase
    .from("spectators")
    .select("favorite_agents")
    .eq("id", spectatorId)
    .single();

  if (!spectator) throw new Error("Spectator not found");

  const favorites: string[] = spectator.favorite_agents || [];
  if (favorites.includes(agentId)) return { success: true, message: "Already following" };

  favorites.push(agentId);

  await supabase
    .from("spectators")
    .update({ favorite_agents: favorites })
    .eq("id", spectatorId);

  return { success: true, favorites_count: favorites.length };
}

export async function removeFavoriteAgent(spectatorId: string, agentId: string) {
  const { data: spectator } = await supabase
    .from("spectators")
    .select("favorite_agents")
    .eq("id", spectatorId)
    .single();

  if (!spectator) throw new Error("Spectator not found");

  const favorites: string[] = (spectator.favorite_agents || []).filter(
    (id: string) => id !== agentId,
  );

  await supabase
    .from("spectators")
    .update({ favorite_agents: favorites })
    .eq("id", spectatorId);

  return { success: true, favorites_count: favorites.length };
}
