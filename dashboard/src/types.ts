export interface Driver {
  id: string;
  name: string;
  tla: string;
  team: string;
  price_at_race: number;
  points: number;
  is_captain: boolean;
  is_triple_captain: boolean;
}

export interface Constructor {
  id: string;
  name: string;
  price_at_race: number;
  points: number;
}

export interface RaceTeam {
  drivers: Driver[];
  constructors: Constructor[];
}

export interface RaceHistory {
  race_id: number;
  race_name: string;
  points_gained: number;
  total_points: number;
  rank_in_league: number;
  budget: number;
  team_value: number;
  active_chip: string | null;
  team: RaceTeam;
}

export interface ChipUsage {
  chip: string;
  race_id: number;
}

export interface Player {
  guid: string;
  player_name: string;
  team_name: string;
  total_points: number;
  rank: number;
  current_budget: number;
  current_team_value: number;
  chips_used: ChipUsage[];
  history: RaceHistory[];
}

export interface MasterResult {
  points: number;
  name: string;
  tla: string;
  price: number;
}

export interface F1FantasyData {
  last_updated: string;
  league_name: string;
  league_id: string;
  current_race_id: number;
  players: Player[];
  master_results: Record<string, Record<string, MasterResult>>;
}

