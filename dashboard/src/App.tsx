import { useState, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  X, 
  Info,
  Clock
} from 'lucide-react';
import type { F1FantasyData, Player, RaceHistory } from './types';

function App() {
  const [data, setData] = useState<F1FantasyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rank' | 'budget' | 'name'>('rank');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedRaceId, setSelectedRaceId] = useState<number>(1);

  // Load the F1 data JSON
  useEffect(() => {
    fetch('./data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load fantasy league data. Make sure scraper has been run.');
        }
        return response.json();
      })
      .then((data: F1FantasyData) => {
        setData(data);
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
      // Default to the latest completed race for this player
      const maxRace = Math.max(...selectedPlayer.history.map(h => h.race_id));
      setSelectedRaceId(maxRace);
    }
  }, [selectedPlayer]);

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

  // Filter and Sort players
  const filteredPlayers = data.players
    .filter(player => {
      const search = searchTerm.toLowerCase();
      return (
        player.player_name.toLowerCase().includes(search) ||
        player.team_name.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'rank') {
        return a.rank - b.rank;
      } else if (sortBy === 'budget') {
        return b.current_budget - a.current_budget;
      } else {
        return a.player_name.localeCompare(b.player_name);
      }
    });

  // Calculate some fun insights for the sidebar
  const getLeader = () => data.players.find(p => p.rank === 1);
  const getHighestBudget = () => [...data.players].sort((a, b) => b.current_budget - a.current_budget)[0];
  const getChipsKing = () => [...data.players].sort((a, b) => b.chips_used.length - a.chips_used.length)[0];

  // Helper to format timestamps nicely
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString();
    } catch (e) {
      return isoString;
    }
  };

  const activeHistory: RaceHistory | undefined = selectedPlayer?.history.find(h => h.race_id === selectedRaceId);

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
            <div className="search-wrapper">
              <Search className="search-icon" />
              <input 
                type="text" 
                placeholder="Search players or teams..." 
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <span style={{ fontSize: '0.8rem', color: '#718096', alignSelf: 'center', marginRight: '0.5rem', fontWeight: 600 }}>SORT BY:</span>
              <button 
                className={`filter-btn ${sortBy === 'rank' ? 'active' : ''}`}
                onClick={() => setSortBy('rank')}
              >
                League Rank
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
            {filteredPlayers.map(player => {
              // Find latest budget trend (compare last race to race before)
              const hasHistory = player.history.length > 1;
              const latestRace = player.history[player.history.length - 1];
              const prevRace = hasHistory ? player.history[player.history.length - 2] : null;
              
              const budgetDiff = prevRace ? latestRace.budget - prevRace.budget : 0;

              return (
                <div 
                  key={player.guid} 
                  className="glass-card player-card"
                  onClick={() => setSelectedPlayer(player)}
                >
                  {/* Rank */}
                  <div className="rank-badge">
                    #{player.rank}
                  </div>

                  {/* Identity */}
                  <div className="player-identity">
                    <span className="player-name">{player.player_name}</span>
                    <span className="team-name">{player.team_name}</span>
                  </div>

                  {/* Points */}
                  <div className="points-display">
                    <span className="points-val">{player.total_points.toLocaleString()}</span>
                    <span className="points-label">PTS</span>
                  </div>

                  {/* Budget details */}
                  <div className="budget-stats hide-on-mobile">
                    <div className="stat-item">
                      <span className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        ${player.current_budget.toFixed(1)}M
                        {budgetDiff > 0 && <TrendingUp size={12} className="trend-up" />}
                        {budgetDiff < 0 && <TrendingDown size={12} className="trend-down" />}
                      </span>
                      <span className="stat-label">Budget</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-val">${player.current_team_value.toFixed(1)}M</span>
                      <span className="stat-label">Team Val</span>
                    </div>
                  </div>

                  {/* Chips badges */}
                  <div className="chips-row hide-on-mobile">
                    {['wildcard', 'limitless', 'autopilot', 'final_fix', 'no_negative', 'extra_streak', '3x_booster'].map(chip => {
                      const isUsed = player.chips_used.some(c => c.chip === chip);
                      return (
                        <span 
                          key={chip} 
                          className={`chip-badge ${isUsed ? 'used' : ''} ${chip}`}
                          title={`${chip.replace('_', ' ')}: ${isUsed ? 'Used' : 'Available'}`}
                        >
                          {chip.split('_')[0].substring(0, 3)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredPlayers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#718096' }}>
                No players match your search filter.
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
      {selectedPlayer && (
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
              </div>
            </div>

            {/* Progression & Timeline Section */}
            <div className="progression-section">
              {/* Left Column: Budget and Value Progression */}
              <div className="glass-card">
                <h3 className="modal-section-title" style={{ marginTop: 0 }}>Financial Progression</h3>
                <div className="progression-table-container">
                  <table className="progression-table">
                    <thead>
                      <tr>
                        <th>GP Event</th>
                        <th>Points</th>
                        <th>Rank</th>
                        <th>Budget</th>
                        <th>Team Value</th>
                        <th>Chip Played</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPlayer.history.map((h, index) => {
                        const prev = index > 0 ? selectedPlayer.history[index - 1] : null;
                        const budgetDiff = prev ? h.budget - prev.budget : 0;
                        const teamValDiff = prev ? h.team_value - prev.team_value : 0;

                        return (
                          <tr key={h.race_id}>
                            <td style={{ fontWeight: 600 }}>{h.race_name}</td>
                            <td>{h.points_gained} <span style={{ fontSize: '0.75rem', color: '#718096' }}>({h.total_points})</span></td>
                            <td>#{h.rank_in_league}</td>
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
                  {['wildcard', 'limitless', 'autopilot', 'final_fix', 'no_negative', 'extra_streak', '3x_booster'].map(chip => {
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
                            {chip.replace('_', ' ')}
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
            {activeHistory ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#a0aec0', fontSize: '0.9rem' }}>
                  <span>Roster value: <strong>${activeHistory.team_value.toFixed(1)}M</strong></span>
                  <span>Roster budget: <strong>${activeHistory.budget.toFixed(1)}M</strong></span>
                  {activeHistory.active_chip && (
                    <span style={{ color: '#fff' }}>Active Chip: <strong style={{ color: '#e10600', textTransform: 'uppercase' }}>{activeHistory.active_chip.replace('_', ' ')}</strong></span>
                  )}
                </div>
                
                {/* Roster Grid */}
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
              </div>
            ) : (
              <p style={{ color: '#718096', fontStyle: 'italic' }}>No roster details loaded for this GP.</p>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export default App;
