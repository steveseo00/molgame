import { supabase } from "../db/client.js";
import { ELO, ECONOMY } from "@molgame/shared";

export function calculateEloChange(
  winnerElo: number,
  loserElo: number,
): { winnerChange: number; loserChange: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;

  const winnerChange = Math.round(ELO.K_FACTOR * (1 - expectedWinner));
  const loserChange = Math.round(ELO.K_FACTOR * (0 - expectedLoser));

  return {
    winnerChange: Math.max(ELO.WIN_MIN, Math.min(ELO.WIN_MAX, winnerChange)),
    loserChange: Math.max(-ELO.LOSS_MAX, Math.min(-ELO.LOSS_MIN, loserChange)),
  };
}

export async function processBattleRewards(
  winnerId: string | null,
  loserId: string | null,
  isDraw: boolean,
) {
  if (isDraw) {
    if (winnerId) await addSpark(winnerId, ECONOMY.BATTLE_DRAW);
    if (loserId) await addSpark(loserId, ECONOMY.BATTLE_DRAW);
    return;
  }

  if (!winnerId || !loserId) return;

  // Get ELOs
  const { data: winner } = await supabase
    .from("agents")
    .select("elo_rating, win_streak, total_battles, total_wins")
    .eq("id", winnerId)
    .single();

  const { data: loser } = await supabase
    .from("agents")
    .select("elo_rating, total_battles, total_wins")
    .eq("id", loserId)
    .single();

  if (!winner || !loser) return;

  // Calculate ELO changes
  const { winnerChange, loserChange } = calculateEloChange(winner.elo_rating, loser.elo_rating);

  // Calculate Spark rewards
  let sparkRewardWinner = ECONOMY.BATTLE_WIN;
  const newStreak = winner.win_streak + 1;

  if (newStreak >= 5) sparkRewardWinner += ECONOMY.WIN_STREAK_5;
  else if (newStreak >= 3) sparkRewardWinner += ECONOMY.WIN_STREAK_3;

  // Update winner
  await supabase
    .from("agents")
    .update({
      elo_rating: winner.elo_rating + winnerChange,
      win_streak: newStreak,
      total_battles: winner.total_battles + 1,
      total_wins: winner.total_wins + 1,
    })
    .eq("id", winnerId);

  await addSpark(winnerId, sparkRewardWinner);

  // Update loser
  await supabase
    .from("agents")
    .update({
      elo_rating: Math.max(0, loser.elo_rating + loserChange),
      win_streak: 0,
      total_battles: loser.total_battles + 1,
    })
    .eq("id", loserId);

  await addSpark(loserId, ECONOMY.BATTLE_LOSS);

  // Update battle record
  return {
    elo_change_winner: winnerChange,
    elo_change_loser: loserChange,
    spark_reward_winner: sparkRewardWinner,
    spark_reward_loser: ECONOMY.BATTLE_LOSS,
  };
}

async function addSpark(agentId: string, amount: number) {
  const { data } = await supabase
    .from("agents")
    .select("spark")
    .eq("id", agentId)
    .single();

  if (data) {
    await supabase
      .from("agents")
      .update({ spark: data.spark + amount })
      .eq("id", agentId);
  }
}
