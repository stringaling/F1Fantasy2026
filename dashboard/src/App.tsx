import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  X, 
  Info,
  Clock
} from 'lucide-react';
import type { F1FantasyData, Player, RaceHistory, MasterResult } from './types';

const chipLabels: Record<string, string> = {
  wildcard: 'WIL',
  limitless: 'LIM',
  autopilot: 'AUT',
  final_fix: 'FIX',
  no_negative: 'NEG',
  extra_drs: '3X'
};

const chipNames: Record<string, string> = {
  wildcard: 'Wildcard',
  limitless: 'Limitless',
  autopilot: 'Autopilot',
  final_fix: 'Final Fix',
  no_negative: 'No Negative',
  extra_drs: 'Extra DRS (3x)'
};

interface PlayerTradeStats {
  totalTrades: number;
  totalPenaltyPoints: number;
  totalSmartManagerGain: number;
  historyStats: {
    race_id: number;
    tradesMade: number;
    penaltyPoints: number;
    netTradeGain: number;
  }[];
}

function calculatePlayerTradeStats(
  player: Player,
  masterResults: Record<string, Record<string, MasterResult>>
): PlayerTradeStats {
  let totalTrades = 0;
  let totalPenaltyPoints = 0;
  let totalSmartManagerGain = 0;
  const historyStats: PlayerTradeStats['historyStats'] = [];

  if (!player.history || player.history.length === 0) {
    return { totalTrades, totalPenaltyPoints, totalSmartManagerGain, historyStats };
  }

  // Base team starts as the team from the first race in history
  let baseDrivers = [...player.history[0].team.drivers];
  let baseConstructors = [...player.history[0].team.constructors];

  // For race 1, stats are 0
  historyStats.push({
    race_id: player.history[0].race_id,
    tradesMade: 0,
    penaltyPoints: 0,
    netTradeGain: 0,
  });

  // Loop through subsequent races
  for (let i = 1; i < player.history.length; i++) {
    const raceHistory = player.history[i];
    const raceId = raceHistory.race_id;
    const activeChip = raceHistory.active_chip;

    const currentDrivers = raceHistory.team.drivers;
    const currentConstructors = raceHistory.team.constructors;

    // If selection is unlocked / not loaded yet, skip calculations for this race
    if (currentDrivers.length === 0 && currentConstructors.length === 0) {
      historyStats.push({
        race_id: raceId,
        tradesMade: 0,
        penaltyPoints: 0,
        netTradeGain: 0,
      });
      continue;
    }

    // Count driver transfers: drivers in baseDrivers that are not in currentDrivers
    const baseDriverIds = new Set(baseDrivers.map(d => d.id));
    const currentDriverIds = new Set(currentDrivers.map(d => d.id));
    let driverTransfers = 0;
    baseDriverIds.forEach(id => {
      if (!currentDriverIds.has(id)) {
        driverTransfers++;
      }
    });

    // Count constructor transfers: constructors in baseConstructors that are not in currentConstructors
    const baseConstructorIds = new Set(baseConstructors.map(c => c.id));
    const currentConstructorIds = new Set(currentConstructors.map(c => c.id));
    let constructorTransfers = 0;
    baseConstructorIds.forEach(id => {
      if (!currentConstructorIds.has(id)) {
        constructorTransfers++;
      }
    });

    const tradesMade = driverTransfers + constructorTransfers;

    // Calculate penalty points
    let penaltyPoints = 0;
    if (activeChip !== 'wildcard' && activeChip !== 'limitless') {
      penaltyPoints = Math.max(0, (tradesMade - 2) * 10);
    }

    // Calculate actual score before penalty
    const actualScoreBeforePenalty = currentDrivers.reduce((sum, d) => sum + d.points, 0) + 
                                     currentConstructors.reduce((sum, c) => sum + c.points, 0);

    // Calculate what the unchanged base team would have scored in this race
    let unchangedScore = 0;
    const raceResults = masterResults?.[raceId.toString()];

    if (raceResults) {
      baseDrivers.forEach(d => {
        const result = raceResults[d.id];
        const rawPoints = result ? result.points : 0;
        let points = rawPoints;
        if (d.is_captain) points *= 2;
        if (d.is_triple_captain) points *= 3;
        unchangedScore += points;
      });

      baseConstructors.forEach(c => {
        const result = raceResults[c.id];
        const rawPoints = result ? result.points : 0;
        unchangedScore += rawPoints;
      });
    } else {
      unchangedScore = actualScoreBeforePenalty;
    }

    const netTradeGain = actualScoreBeforePenalty - unchangedScore - penaltyPoints;

    historyStats.push({
      race_id: raceId,
      tradesMade,
      penaltyPoints,
      netTradeGain,
    });

    totalTrades += tradesMade;
    totalPenaltyPoints += penaltyPoints;
    totalSmartManagerGain += netTradeGain;

    // Update base team for next race's comparison
    if (activeChip !== 'limitless') {
      baseDrivers = [...currentDrivers];
      baseConstructors = [...currentConstructors];
    }
  }

  return {
    totalTrades,
    totalPenaltyPoints,
    totalSmartManagerGain,
    historyStats,
  };
}

function calculateRacesWon(players: Player[]): Record<string, number> {
  const racesWon: Record<string, number> = {};
  players.forEach(p => {
    racesWon[p.guid] = 0;
  });

  const allRaceIds = Array.from(
    new Set(players.flatMap(p => (p.history || []).map(h => h.race_id)))
  );

  allRaceIds.forEach(raceId => {
    let maxPoints = -Infinity;
    players.forEach(p => {
      const h = p.history.find(entry => entry.race_id === raceId);
      if (h && h.points_gained > maxPoints) {
        maxPoints = h.points_gained;
      }
    });

    if (maxPoints !== -Infinity) {
      players.forEach(p => {
        const h = p.history.find(entry => entry.race_id === raceId);
        if (h && h.points_gained === maxPoints) {
          racesWon[p.guid] = (racesWon[p.guid] || 0) + 1;
        }
      });
    }
  });

  return racesWon;
}

function getRaceRank(players: Player[], raceId: number, playerGuid: string): number {
  const scores = players.map(p => {
    const h = p.history.find(entry => entry.race_id === raceId);
    return {
      guid: p.guid,
      points: h ? h.points_gained : 0
    };
  });

  scores.sort((a, b) => b.points - a.points);

  let rank = 1;
  for (let i = 0; i < scores.length; i++) {
    if (i > 0 && scores[i].points < scores[i - 1].points) {
      rank = i + 1;
    }
    if (scores[i].guid === playerGuid) {
      return rank;
    }
  }
  return rank;
}

function App() {
  const [data, setData] = useState<F1FantasyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewRaceId, setViewRaceId] = useState<number | 'overall'>('overall');
  const [sortBy, setSortBy] = useState<'rank' | 'budget' | 'name'>('rank');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedRaceId, setSelectedRaceId] = useState<number>(1);

  // Load the F1 data JSON
  useEffect(() => {
    fetch('./data.json?t=' + Date.now())
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load fantasy league data. Make sure scraper has been run.');
        }
        return response.json();
      })
      .then((data: F1FantasyData) => {
        // Filter out history entries for upcoming races (which have no drivers loaded yet)
        const sanitizedPlayers = data.players.map(player => ({
          ...player,
          history: player.history.filter(h => h.team && h.team.drivers && h.team.drivers.length > 0)
        }));

        setData({
          ...data,
          players: sanitizedPlayers
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Update selected race when selected player changes
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.history.length > 0) {
      if (viewRaceId !== 'overall') {
        setSelectedRaceId(viewRaceId);
      } else {
        // Default to the latest completed race for this player
        const maxRace = Math.max(...selectedPlayer.history.map(h => h.race_id));
        setSelectedRaceId(maxRace);
      }
    }
  }, [selectedPlayer, viewRaceId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '50px', height: '50px', border: '5px solid rgba(255,255,255,0.1)', borderTopColor: '#e10600', borderRadius: '50%', animation: 'scaleUp 1s infinite alternate' }}></div>
        <p style={{ color: '#a0aec0', fontWeight: 600 }}>Loading F1 Fantasy Statistics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1.5rem', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🏎️💨</div>
        <h2 style={{ color: '#e53e3e' }}>Data Connection Error</h2>
        <p style={{ color: '#a0aec0', maxWidth: '500px' }}>
          {error || 'No data files were retrieved. Please check if F1Fantasy/dashboard/public/data.json exists.'}
        </p>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <code style={{ fontSize: '0.85rem', color: '#fff' }}>
            Run: python scraper/main.py
          </code>
        </div>
      </div>
    );
  }

  // Pre-calculate trade stats for all players
  const playerTradeStatsMap = new Map<string, PlayerTradeStats>();
  data.players.forEach(player => {
    playerTradeStatsMap.set(player.guid, calculatePlayerTradeStats(player, data.master_results));
  });

  // Calculate races won (number of times topped the standings for each race)
  const racesWonMap = calculateRacesWon(data.players);

  // Get completed races from player history
  const completedRaces = data.players[0]?.history.map(h => ({
    id: h.race_id,
    name: h.race_name
  })) || [];

  // Determine data per player depending on viewRaceId
  const processedPlayers = data.players.map(player => {
    if (viewRaceId === 'overall') {
      const hasHistory = player.history.length > 1;
      const latestRace = player.history[player.history.length - 1];
      const prevRace = hasHistory ? player.history[player.history.length - 2] : null;
      const budgetDiff = prevRace ? latestRace.budget - prevRace.budget : 0;

      return {
        guid: player.guid,
        player_name: player.player_name,
        team_name: player.team_name,
        rank: player.rank, // overall rank
        leagueRank: player.rank,
        points: player.total_points,
        budget: player.current_budget,
        team_value: player.current_team_value,
        budgetDiff,
        chips_used: player.chips_used,
        racesWon: racesWonMap[player.guid] || 0,
        activeChip: null,
        player, // reference to original player object
      };
    } else {
      const raceHistory = player.history.find(h => h.race_id === viewRaceId);
      const points = raceHistory ? raceHistory.points_gained : 0;
      const budget = raceHistory ? raceHistory.budget : 100.0;
      const team_value = raceHistory ? raceHistory.team_value : 100.0;
      const activeChip = raceHistory ? raceHistory.active_chip : null;

      // Rank in league after this race
      const leagueRank = raceHistory ? raceHistory.rank_in_league : player.rank;

      // Calculate budget difference compared to the race before this one
      const currentRaceIndex = player.history.findIndex(h => h.race_id === viewRaceId);
      const prevRaceHistory = currentRaceIndex > 0 ? player.history[currentRaceIndex - 1] : null;
      const budgetDiff = prevRaceHistory ? budget - prevRaceHistory.budget : 0;

      return {
        guid: player.guid,
        player_name: player.player_name,
        team_name: player.team_name,
        rank: 0, // calculated below dynamically
        leagueRank,
        points,
        budget,
        team_value,
        budgetDiff,
        chips_used: player.chips_used,
        racesWon: 0, // not shown
        activeChip,
        player,
      };
    }
  });

  // Calculate dynamic rank for race-scoped view
  if (viewRaceId !== 'overall') {
    const sortedByPoints = [...processedPlayers].sort((a, b) => b.points - a.points);
    let currentRank = 1;
    sortedByPoints.forEach((p, index) => {
      if (index > 0) {
        const prevP = sortedByPoints[index - 1];
        if (p.points < prevP.points) {
          currentRank = index + 1;
        }
      }
      const playerObj = processedPlayers.find(pl => pl.guid === p.guid);
      if (playerObj) {
        playerObj.rank = currentRank;
      }
    });
  }

  // Sort players
  const sortedPlayers = processedPlayers.sort((a, b) => {
    if (sortBy === 'rank') {
      return a.rank - b.rank;
    } else if (sortBy === 'budget') {
      return b.budget - a.budget;
    } else {
      return a.player_name.localeCompare(b.player_name);
    }
  });

  // Calculate some fun insights for the sidebar
  const getLeader = () => data.players.find(p => p.rank === 1);
  const getHighestBudget = () => [...data.players].sort((a, b) => b.current_budget - a.current_budget)[0];
  const getChipsKing = () => [...data.players].sort((a, b) => b.chips_used.length - a.chips_used.length)[0];

  const getSmartManager = () => {
    return [...data.players].sort((a, b) => {
      const statsA = playerTradeStatsMap.get(a.guid);
      const statsB = playerTradeStatsMap.get(b.guid);
      return (statsB?.totalSmartManagerGain ?? 0) - (statsA?.totalSmartManagerGain ?? 0);
    })[0];
  };

  const getMicromanager = () => {
    return [...data.players].sort((a, b) => {
      const statsA = playerTradeStatsMap.get(a.guid);
      const statsB = playerTradeStatsMap.get(b.guid);
      return (statsB?.totalPenaltyPoints ?? 0) - (statsA?.totalPenaltyPoints ?? 0);
    })[0];
  };

  // Helper to format timestamps nicely
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString();
    } catch (e) {
      return isoString;
    }
  };
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-title-container">
          <div className="f1-logo-badge">F1</div>
          <div className="header-title">
            <h1>Fantasy Tracker</h1>
            <p>{data.league_name} • Season 2026</p>
          </div>
        </div>
        <div className="header-meta">
          <div className="last-updated">
            <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Last Updated: <span>{formatTime(data.last_updated)}</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#718096', marginTop: '4px' }}>League ID: {data.league_id}</p>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="dashboard-grid">
        
        {/* Left Side: Leaderboard Column */}
        <section className="leaderboard-section">
          {/* Controls */}
          <div className="controls-bar">
            <div className="dropdown-wrapper">
              <select 
                className="race-dropdown"
                value={viewRaceId}
                onChange={(e) => {
                  const val = e.target.value;
                  setViewRaceId(val === 'overall' ? 'overall' : Number(val));
                }}
              >
                <option value="overall">Overall Standing</option>
                {completedRaces.map(race => (
                  <option key={race.id} value={race.id}>
                    {race.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <span style={{ fontSize: '0.8rem', color: '#718096', alignSelf: 'center', marginRight: '0.5rem', fontWeight: 600 }}>SORT BY:</span>
              <button 
                className={`filter-btn ${sortBy === 'rank' ? 'active' : ''}`}
                onClick={() => setSortBy('rank')}
              >
                {viewRaceId === 'overall' ? 'League Rank' : 'Race Rank'}
              </button>
              <button 
                className={`filter-btn ${sortBy === 'budget' ? 'active' : ''}`}
                onClick={() => setSortBy('budget')}
              >
                Budget
              </button>
              <button 
                className={`filter-btn ${sortBy === 'name' ? 'active' : ''}`}
                onClick={() => setSortBy('name')}
              >
                Name
              </button>
            </div>
          </div>

          {/* List of Players */}
          <div className="leaderboard-list">
            {sortedPlayers.map(player => {
              const budgetDiff = player.budgetDiff;

              return (
                <div 
                  key={player.guid} 
                  className={`glass-card player-card ${viewRaceId === 'overall' ? 'overall-view' : 'race-view'}`}
                  onClick={() => setSelectedPlayer(player.player)}
                >
                  {/* Rank */}
                  <div className="rank-badge">
                    #{player.rank}
                  </div>

                  {/* Identity */}
                  <div className="player-identity">
                    <span className="player-name">{player.player_name}</span>
                    <span className="team-name">{player.team_name}</span>
                    {viewRaceId !== 'overall' && (
                      <span style={{ fontSize: '0.75rem', color: '#718096', marginTop: '2px' }}>
                        League Standing: <strong>#{player.leagueRank}</strong>
                      </span>
                    )}
                  </div>

                  {/* Points */}
                  <div className="points-display">
                    <span className="points-val">{player.points.toLocaleString()}</span>
                    <span className="points-label">{viewRaceId === 'overall' ? 'PTS' : 'GP PTS'}</span>
                  </div>

                  {/* Races Won - only in Overall view */}
                  {viewRaceId === 'overall' && (
                    <div className="races-won-display hide-on-mobile">
                      <span className="races-won-val">{player.racesWon}</span>
                      <span className="races-won-label">Wins</span>
                    </div>
                  )}

                  {/* Budget details */}
                  <div className="budget-stats hide-on-mobile">
                    <div className="stat-item">
                      <span className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        ${player.budget.toFixed(1)}M
                        {budgetDiff > 0 && <TrendingUp size={12} className="trend-up" />}
                        {budgetDiff < 0 && <TrendingDown size={12} className="trend-down" />}
                      </span>
                      <span className="stat-label">Budget</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-val">${player.team_value.toFixed(1)}M</span>
                      <span className="stat-label">Team Val</span>
                    </div>
                  </div>

                  {/* Chips badges */}
                  <div className="chips-row hide-on-mobile">
                    {['wildcard', 'limitless', 'autopilot', 'final_fix', 'no_negative', 'extra_drs'].map(chip => {
                      const usage = player.chips_used.find(c => c.chip === chip);
                      const isUsed = !!usage && (viewRaceId === 'overall' || usage.race_id <= viewRaceId);
                      const isActiveInRace = !!usage && viewRaceId !== 'overall' && usage.race_id === viewRaceId;

                      return (
                        <span 
                          key={chip} 
                          className={`chip-badge ${isUsed ? 'used' : ''} ${isActiveInRace ? 'active-now' : ''} ${chip}`}
                          title={`${chip.replace('_', ' ')}: ${isActiveInRace ? 'Active this GP!' : isUsed ? 'Used' : 'Available'}`}
                        >
                          {chipLabels[chip] || chip.substring(0, 3)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {sortedPlayers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#718096' }}>
                No players loaded.
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Sidebar Insights Column */}
        <aside className="stats-summary">
          
          {/* Quick Stats overview */}
          <div className="glass-card">
            <h2>Season Leaders</h2>
            
            {/* 1st Place */}
            {getLeader() && (
              <div className="glass-card leader-card" style={{ marginTop: '1rem', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                <div className="leader-trophy">🥇</div>
                <div>
                  <p style={{ color: '#ffd700', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Championship Leader</p>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{getLeader()?.player_name}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#a0aec0' }}>{getLeader()?.team_name} • <strong>{getLeader()?.total_points.toLocaleString()} pts</strong></p>
                </div>
              </div>
            )}

            {/* Highest Budget */}
            {getHighestBudget() && (
              <div className="glass-card leader-card" style={{ marginTop: '1rem', border: '1px solid rgba(56, 161, 105, 0.2)' }}>
                <div className="leader-trophy">💰</div>
                <div>
                  <p style={{ color: '#48bb78', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Financial Tycoon</p>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{getHighestBudget()?.player_name}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#a0aec0' }}>Budget: <strong>${getHighestBudget()?.current_budget.toFixed(1)}M</strong></p>
                </div>
              </div>
            )}

            {/* Chips King */}
            {getChipsKing() && (
              <div className="glass-card leader-card" style={{ marginTop: '1rem', border: '1px solid rgba(128, 90, 213, 0.2)' }}>
                <div className="leader-trophy">⚡</div>
                <div>
                  <p style={{ color: '#a779e9', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Chip Master</p>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{getChipsKing()?.player_name}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#a0aec0' }}>Chips Played: <strong>{getChipsKing()?.chips_used.length} / 7</strong></p>
                </div>
              </div>
            )}

            {/* Smart Manager */}
            {getSmartManager() && (() => {
              const smPlayer = getSmartManager();
              const smStats = playerTradeStatsMap.get(smPlayer.guid);
              return (
                <div className="glass-card leader-card" style={{ marginTop: '1rem', border: '1px solid rgba(79, 209, 197, 0.2)' }}>
                  <div className="leader-trophy">🧠</div>
                  <div>
                    <p style={{ color: '#4fd1c5', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Smart Manager</p>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{smPlayer.player_name}</h3>
                    <p style={{ fontSize: '0.9rem', color: '#a0aec0' }}>
                      Net Trade Gain: <strong style={{ color: '#4fd1c5' }}>+{smStats?.totalSmartManagerGain ?? 0} pts</strong>
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Micromanager */}
            {getMicromanager() && (() => {
              const mmPlayer = getMicromanager();
              const mmStats = playerTradeStatsMap.get(mmPlayer.guid);
              return (
                <div className="glass-card leader-card" style={{ marginTop: '1rem', border: '1px solid rgba(229, 62, 62, 0.2)' }}>
                  <div className="leader-trophy">🚨</div>
                  <div>
                    <p style={{ color: '#fc8181', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Micromanager</p>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{mmPlayer.player_name}</h3>
                    <p style={{ fontSize: '0.9rem', color: '#a0aec0' }}>
                      Penalty Points: <strong style={{ color: '#fc8181' }}>-{mmStats?.totalPenaltyPoints ?? 0} pts</strong> ({mmStats?.totalTrades ?? 0} trades)
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Quick FAQ / Info */}
          <div className="glass-card" style={{ fontSize: '0.9rem', color: '#a0aec0', lineHeight: 1.5 }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={16} style={{ color: '#e10600' }} />
              About League Tracker
            </h3>
            <p style={{ marginBottom: '0.75rem' }}>
              Click on any player's card to open their dashboard overlay.
            </p>
            <p>
              This tracks points, budget growth, chip utilization timeline, and rosters from race GP to GP. Run the python scraper locally to retrieve new race data.
            </p>
          </div>
        </aside>
      </div>

      {/* Player Detail Overlay Modal */}
      {/* Player Detail Overlay Modal */}
      {selectedPlayer && (() => {
        const selectedPlayerStats = playerTradeStatsMap.get(selectedPlayer.guid);
        const activeHistory: RaceHistory | undefined = selectedPlayer.history.find(h => h.race_id === selectedRaceId);
        
        return (
          <div className="modal-overlay" onClick={() => setSelectedPlayer(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setSelectedPlayer(null)}>
                <X size={20} />
              </button>

              {/* Modal Header */}
              <div className="player-detail-header">
                <div className="player-detail-title">
                  <h2>{selectedPlayer.player_name}</h2>
                  <p>Team: <strong style={{ color: '#fff' }}>{selectedPlayer.team_name}</strong></p>
                </div>
                <div className="player-detail-meta">
                  <div className="points-display">
                    <span className="points-val" style={{ fontSize: '1.8rem' }}>#{selectedPlayer.rank}</span>
                    <span className="points-label">League Rank</span>
                  </div>
                  <div className="points-display">
                    <span className="points-val" style={{ fontSize: '1.8rem' }}>{selectedPlayer.total_points.toLocaleString()}</span>
                    <span className="points-label">Total Points</span>
                  </div>
                  <div className="points-display">
                    <span className="points-val" style={{ fontSize: '1.8rem' }}>${selectedPlayer.current_budget.toFixed(1)}M</span>
                    <span className="points-label">Budget</span>
                  </div>
                  <div className="points-display">
                    <span className="points-val" style={{ fontSize: '1.8rem' }}>{selectedPlayerStats?.totalTrades ?? 0}</span>
                    <span className="points-label">Total Trades</span>
                  </div>
                  <div className="points-display">
                    <span className="points-val" style={{ fontSize: '1.8rem', color: (selectedPlayerStats?.totalPenaltyPoints ?? 0) > 0 ? '#fc8181' : '#fff' }}>
                      -{selectedPlayerStats?.totalPenaltyPoints ?? 0}
                    </span>
                    <span className="points-label">Penalty Pts</span>
                  </div>
                </div>
              </div>

              {/* Progression & Timeline Section */}
              <div className="progression-section">
                {/* Left Column: Season Progression */}
                <div className="glass-card">
                  <h3 className="modal-section-title" style={{ marginTop: 0 }}>Season Progression</h3>
                  <div className="progression-table-container">
                    <table className="progression-table">
                      <thead>
                        <tr>
                          <th>GP Event</th>
                          <th>Points</th>
                          <th>League Rank</th>
                          <th>Race Rank</th>
                          <th>Budget</th>
                          <th>Team Value</th>
                          <th>Trades</th>
                          <th>Penalty</th>
                          <th>Chip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPlayer.history.map((h, index) => {
                          const prev = index > 0 ? selectedPlayer.history[index - 1] : null;
                          const budgetDiff = prev ? h.budget - prev.budget : 0;
                          const teamValDiff = prev ? h.team_value - prev.team_value : 0;
                          const gpStats = selectedPlayerStats?.historyStats.find(s => s.race_id === h.race_id);

                          return (
                            <tr key={h.race_id}>
                              <td style={{ fontWeight: 600 }}>{h.race_name}</td>
                              <td>{h.points_gained} <span style={{ fontSize: '0.75rem', color: '#718096' }}>({h.total_points})</span></td>
                              <td>#{h.rank_in_league}</td>
                              <td>#{getRaceRank(data.players, h.race_id, selectedPlayer.guid)}</td>
                              <td>
                                ${h.budget.toFixed(1)}M
                                {budgetDiff > 0 && <span className="trend-up" style={{ fontSize: '0.8rem', marginLeft: '3px' }}>▲</span>}
                                {budgetDiff < 0 && <span className="trend-down" style={{ fontSize: '0.8rem', marginLeft: '3px' }}>▼</span>}
                              </td>
                              <td>
                                ${h.team_value.toFixed(1)}M
                                {teamValDiff > 0 && <span className="trend-up" style={{ fontSize: '0.8rem', marginLeft: '3px' }}>▲</span>}
                                {teamValDiff < 0 && <span className="trend-down" style={{ fontSize: '0.8rem', marginLeft: '3px' }}>▼</span>}
                              </td>
                              <td>{gpStats ? gpStats.tradesMade : 0}</td>
                              <td style={{ color: gpStats && gpStats.penaltyPoints > 0 ? '#fc8181' : '#a0aec0', fontWeight: gpStats && gpStats.penaltyPoints > 0 ? 600 : 400 }}>
                                {gpStats && gpStats.penaltyPoints > 0 ? `-${gpStats.penaltyPoints}` : '-'}
                              </td>
                              <td>
                                {h.active_chip ? (
                                  <span className={`chip-badge used ${h.active_chip}`} style={{ fontSize: '0.65rem' }}>
                                    {h.active_chip.replace('_', ' ')}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column: Chips usage timeline */}
                <div className="glass-card">
                  <h3 className="modal-section-title" style={{ marginTop: 0 }}>Chips Summary</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {['wildcard', 'limitless', 'autopilot', 'final_fix', 'no_negative', 'extra_drs'].map(chip => {
                      const usage = selectedPlayer.chips_used.find(c => c.chip === chip);
                      const isUsed = !!usage;
                      const usedRace = usage ? selectedPlayer.history.find(h => h.race_id === usage.race_id) : null;

                      return (
                        <div 
                          key={chip} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '0.75rem', 
                            background: 'rgba(255,255,255,0.02)', 
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`chip-badge ${isUsed ? 'used' : ''} ${chip}`} style={{ fontSize: '0.7rem' }}>
                              {chipNames[chip] || chip.replace('_', ' ')}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.85rem', color: isUsed ? '#fff' : '#718096' }}>
                            {isUsed && usedRace ? `Used at ${usedRace.race_name}` : 'Not used yet'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Roster Selection History Section */}
              <h3 className="modal-section-title">Team Roster History</h3>
              
              {/* Race selector tabs */}
              <div className="race-tabs">
                {selectedPlayer.history.map(h => (
                  <button
                    key={h.race_id}
                    className={`race-tab ${selectedRaceId === h.race_id ? 'active' : ''}`}
                    onClick={() => setSelectedRaceId(h.race_id)}
                  >
                    {h.race_name}
                  </button>
                ))}
              </div>

              {/* Roster cards */}
              {activeHistory ? (() => {
                const activeGPStats = selectedPlayerStats?.historyStats.find(h => h.race_id === selectedRaceId);
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem 1.5rem', marginBottom: '1rem', color: '#a0aec0', fontSize: '0.9rem' }}>
                      <span>Roster value: <strong style={{ color: '#fff' }}>${activeHistory.team_value.toFixed(1)}M</strong></span>
                      <span>Roster budget: <strong style={{ color: '#fff' }}>${activeHistory.budget.toFixed(1)}M</strong></span>
                      {activeHistory.active_chip && (
                        <span>Active Chip: <strong style={{ color: '#e10600', textTransform: 'uppercase' }}>{activeHistory.active_chip.replace('_', ' ')}</strong></span>
                      )}
                      {selectedRaceId > 1 && activeGPStats && (
                        <>
                          <span>Trades: <strong style={{ color: '#fff' }}>{activeGPStats.tradesMade}</strong></span>
                          {activeGPStats.penaltyPoints > 0 && (
                            <span style={{ color: '#fc8181' }}>Penalty: <strong style={{ color: '#fc8181' }}>-{activeGPStats.penaltyPoints} pts</strong></span>
                          )}
                          <span>Trade Net Gain: <strong style={{ color: activeGPStats.netTradeGain > 0 ? '#4fd1c5' : activeGPStats.netTradeGain < 0 ? '#fc8181' : '#fff' }}>
                            {activeGPStats.netTradeGain > 0 ? `+${activeGPStats.netTradeGain}` : activeGPStats.netTradeGain} pts
                          </strong></span>
                        </>
                      )}
                    </div>
                    
                    {/* Roster Grid or Hidden Placeholder */}
                    {activeHistory.team.drivers.length === 0 && activeHistory.team.constructors.length === 0 ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '3rem 2rem', 
                        background: 'rgba(255,255,255,0.01)', 
                        borderRadius: '12px', 
                        border: '1px dashed rgba(255,255,255,0.1)', 
                        color: '#a0aec0',
                        margin: '1.5rem 0'
                      }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔒 Roster Selection Unlocked</div>
                        <p style={{ fontSize: '0.9rem', color: '#718096' }}>This team roster is hidden for privacy until selection locks at the race start.</p>
                      </div>
                    ) : (
                      <div className="roster-grid">
                        {/* Drivers */}
                        {activeHistory.team.drivers.map(drv => (
                          <div key={drv.id} className="roster-card driver-card">
                            {drv.is_captain && <span className="card-captain-badge">CAPTAIN</span>}
                            {drv.is_triple_captain && <span className="card-triple-captain-badge">3X CAPTAIN</span>}
                            
                            <div className="card-header-row">
                              <div>
                                <div className="roster-item-name">{drv.name}</div>
                                <div className="roster-item-team">{drv.team}</div>
                              </div>
                              <span className="driver-tla-badge">{drv.tla}</span>
                            </div>
                            
                            <div className="card-footer-row">
                              <span className="roster-item-price">${drv.price_at_race.toFixed(1)}M</span>
                              <div style={{ textAlign: 'right' }}>
                                <span className="points-label" style={{ fontSize: '0.65rem' }}>GP Points</span>
                                <div className="roster-item-pts">{drv.points}</div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Constructors */}
                        {activeHistory.team.constructors.map(c => (
                          <div key={c.id} className="roster-card constructor-card">
                            <div className="card-header-row">
                              <div>
                                <div className="roster-item-name">{c.name}</div>
                                <div className="roster-item-team">Constructor</div>
                              </div>
                              <span className="driver-tla-badge" style={{ background: 'rgba(49, 130, 206, 0.15)', color: '#63b3ed' }}>CSTR</span>
                            </div>
                            
                            <div className="card-footer-row">
                              <span className="roster-item-price">${c.price_at_race.toFixed(1)}M</span>
                              <div style={{ textAlign: 'right' }}>
                                <span className="points-label" style={{ fontSize: '0.65rem' }}>GP Points</span>
                                <div className="roster-item-pts">{c.points}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <p style={{ color: '#718096', fontStyle: 'italic' }}>No roster details loaded for this GP.</p>
              )}

            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default App;
