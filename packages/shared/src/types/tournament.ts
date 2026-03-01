export type TournamentType = "daily_blitz" | "weekly_cup" | "monthly_championship" | "season_finals";

export type TournamentStatus = "upcoming" | "registering" | "in_progress" | "completed";

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  max_participants: number;
  entry_fee: number;
  prize_pool: number;
  status: TournamentStatus;
  bracket: TournamentBracket;
  participants: string[];
  starts_at: string;
  ends_at: string | null;
}

export interface TournamentBracket {
  rounds: TournamentRound[];
}

export interface TournamentRound {
  round_number: number;
  matches: TournamentMatch[];
}

export interface TournamentMatch {
  match_id: string;
  agent_a_id: string | null;
  agent_b_id: string | null;
  winner_id: string | null;
  battle_id: string | null;
  status: "pending" | "in_progress" | "completed" | "bye";
}

export interface TournamentRegisterRequest {
  deck: string[];
}
