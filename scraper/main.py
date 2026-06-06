# -*- coding: utf-8 -*-
import os
import urllib.parse
import json
import time
import random
from datetime import datetime
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Constants
F1_BASE_URL = "https://fantasy.formula1.com"
LEAGUE_ID = os.getenv("F1_LEAGUE_ID", "6360509")
USER_GUID = os.getenv("F1_USER_GUID")
F1_TOKEN = os.getenv("F1_TOKEN")
SEASON = os.getenv("F1_SEASON", "2026")

# Target output file path
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dashboard", "public"))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "data.json")

# F1 Race Names mapping (2026 Schedule placeholder / standard names)
RACE_NAMES = {
    1: "Australian GP",
    2: "Chinese GP",
    3: "Japanese GP",
    4: "Miami GP",
    5: "Canadian GP",
    6: "Monaco GP",
    7: "Spanish GP",
    8: "Austrian GP",
    9: "British GP",
    10: "Belgian GP",
    11: "Hungarian GP",
    12: "Dutch GP",
    13: "Italian GP",
    14: "Azerbaijan GP",
    15: "Singapore GP",
    16: "United States GP",
    17: "Mexico City GP",
    18: "São Paulo GP",
    19: "Las Vegas GP",
    20: "Qatar GP",
    21: "Abu Dhabi GP"
}

def generate_mock_data():
    """Generates premium mock data for development and testing."""
    print("⚠️ Credentials not configured or invalid in scraper/.env.")
    print("⚙️ Generating premium mock data for dashboard development...")
    
    players_info = [
        {"name": "Alice Watts", "team": "Red Bull Rising"},
        {"name": "Bob Vance", "team": "Vance Refrigerator Racing"},
        {"name": "Charlie Box", "team": "Chuck's Speedstars"},
        {"name": "Daniel Ricciardo Fan", "team": "Honey Badger Racing"},
        {"name": "Emma Watson", "team": "Hermione's Turbos"},
        {"name": "Frank Castle", "team": "Punisher GP"},
        {"name": "Grace Hopper", "team": "Bug Hunters"},
        {"name": "Henry Cavill", "team": "Witcher F1"},
        {"name": "Ivy League", "team": "Academic Velocity"}
    ]
    
    # Generate mock drivers
    mock_drivers = {
        "1": {"name": "Max Verstappen", "tla": "VER", "team": "Red Bull", "price": 28.5},
        "2": {"name": "Lando Norris", "tla": "NOR", "team": "McLaren", "price": 24.5},
        "3": {"name": "Oscar Piastri", "tla": "PIA", "team": "McLaren", "price": 22.0},
        "4": {"name": "Lewis Hamilton", "tla": "HAM", "team": "Ferrari", "price": 23.5},
        "5": {"name": "George Russell", "tla": "RUS", "team": "Mercedes", "price": 19.8},
        "6": {"name": "Charles Leclerc", "tla": "LEC", "team": "Ferrari", "price": 22.5},
        "7": {"name": "Carlos Sainz", "tla": "SAI", "team": "Williams", "price": 18.0},
        "8": {"name": "Fernando Alonso", "tla": "ALO", "team": "Aston Martin", "price": 16.5},
        "9": {"name": "Lance Stroll", "tla": "STR", "team": "Aston Martin", "price": 12.0},
        "10": {"name": "Alex Albon", "tla": "ALB", "team": "Williams", "price": 11.2},
        "11": {"name": "Pierre Gasly", "tla": "GAS", "team": "Alpine", "price": 10.5},
        "12": {"name": "Esteban Ocon", "tla": "OCO", "team": "Haas", "price": 10.0},
        "13": {"name": "Nico Hulkenberg", "tla": "HUL", "team": "Sauber", "price": 9.5},
        "14": {"name": "Yuki Tsunoda", "tla": "TSU", "team": "RB", "price": 11.0},
        "15": {"name": "Liam Lawson", "tla": "LAW", "team": "RB", "price": 9.8},
        "16": {"name": "Oliver Bearman", "tla": "BEA", "team": "Haas", "price": 8.5},
        "17": {"name": "Gabriel Bortoleto", "tla": "BOR", "team": "Sauber", "price": 7.5},
        "18": {"name": "Andrea Kimi Antonelli", "tla": "ANT", "team": "Mercedes", "price": 12.5},
        "19": {"name": "Valtteri Bottas", "tla": "BOT", "team": "Mercedes (Reserve)", "price": 6.5},
        "20": {"name": "Kevin Magnussen", "tla": "MAG", "team": "Haas (Reserve)", "price": 7.0}
    }
    
    mock_constructors = {
        "101": {"name": "McLaren", "price": 28.0},
        "102": {"name": "Red Bull", "price": 27.5},
        "103": {"name": "Ferrari", "price": 26.0},
        "104": {"name": "Mercedes", "price": 21.0},
        "105": {"name": "Aston Martin", "price": 15.0},
        "106": {"name": "RB", "price": 11.0},
        "107": {"name": "Haas", "price": 10.0},
        "108": {"name": "Williams", "price": 9.5},
        "109": {"name": "Alpine", "price": 9.0},
        "110": {"name": "Sauber", "price": 7.0}
    }
    
    num_races = 5
    players_data = []
    
    # Seed random for repeatable mock data
    random.seed(42)
    
    # Standard chips list
    chips_list = ["wildcard", "limitless", "autopilot", "final_fix", "no_negative", "extra_drs"]
    
    for i, p_info in enumerate(players_info):
        guid = f"mock-user-{i+1}"
        history = []
        cumulative_points = 0
        current_budget = 100.0  # Base budget in millions
        current_team_val = 98.5
        
        # Pre-select player's starting roster
        # 5 drivers, 2 constructors
        driver_ids = random.sample(list(mock_drivers.keys()), 5)
        constructor_ids = random.sample(list(mock_constructors.keys()), 2)
        
        # Decide which races they use chips in
        chip_usage = {}
        used_chips = []
        for chip in chips_list:
            if random.random() > 0.4:
                race_used = random.randint(1, num_races)
                chip_usage[race_used] = chip
                used_chips.append({"chip": chip, "race_id": race_used})

        
        for race_id in range(1, num_races + 1):
            # Simulate slight changes in budget/value from race to race
            budget_change = round(random.uniform(-0.5, 1.2), 1)
            val_change = round(random.uniform(-0.3, 1.5), 1)
            
            # Make sure we don't drop budget too low
            current_budget = round(max(99.0, current_budget + budget_change), 1)
            current_team_val = round(current_team_val + val_change, 1)
            
            # Simulate roster changes (1 transfer in 50% of races)
            if race_id > 1 and random.random() > 0.5:
                # remove one driver, add another
                old_drv = driver_ids.pop(0)
                new_drv = random.choice([d for d in mock_drivers.keys() if d not in driver_ids])
                driver_ids.append(new_drv)
                
            # Score points
            base_score = random.randint(180, 320)
            # Add multiplier if limitless chip is active
            active_chip = chip_usage.get(race_id, None)
            if active_chip == "limitless":
                base_score = int(base_score * 1.4)
            elif active_chip == "no_negative":
                base_score += random.randint(20, 50)
                
            cumulative_points += base_score
            
            # Roster details for this race
            drivers_roster = []
            captain_id = driver_ids[0]
            for d_id in driver_ids:
                drv = mock_drivers[d_id]
                points_scored = random.randint(2, 45)
                if d_id == captain_id:
                    points_scored *= 2
                
                drivers_roster.append({
                    "id": d_id,
                    "name": drv["name"],
                    "tla": drv["tla"],
                    "team": drv["team"],
                    "price_at_race": drv["price"],
                    "points": points_scored,
                    "is_captain": d_id == captain_id,
                    "is_triple_captain": False
                })
                
            constructors_roster = []
            for c_id in constructor_ids:
                const = mock_constructors[c_id]
                constructors_roster.append({
                    "id": c_id,
                    "name": const["name"],
                    "price_at_race": const["price"],
                    "points": random.randint(10, 60)
                })
                
            history.append({
                "race_id": race_id,
                "race_name": RACE_NAMES[race_id],
                "points_gained": base_score,
                "total_points": cumulative_points,
                "rank_in_league": 1, # Will calculate ranks later
                "budget": current_budget,
                "team_value": current_team_val,
                "active_chip": active_chip,
                "team": {
                    "drivers": drivers_roster,
                    "constructors": constructors_roster
                }
            })
            
        players_data.append({
            "guid": guid,
            "player_name": p_info["name"],
            "team_name": p_info["team"],
            "total_points": cumulative_points,
            "rank": 1, # Will calculate ranks later
            "current_budget": current_budget,
            "current_team_value": current_team_val,
            "chips_used": used_chips,
            "history": history
        })
        
    # Calculate ranks for each race
    for race_idx in range(num_races):
        # Sort players by cumulative points at this race
        players_data.sort(key=lambda x: x["history"][race_idx]["total_points"], reverse=True)
        for rank_idx, player in enumerate(players_data):
            player["history"][race_idx]["rank_in_league"] = rank_idx + 1
            
    # Sort players by overall final points
    players_data.sort(key=lambda x: x["total_points"], reverse=True)
    for rank_idx, player in enumerate(players_data):
        player["rank"] = rank_idx + 1
        
    # Compile full output structure
    output_data = {
        "last_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "league_name": "Antigravity F1 Cup",
        "league_id": LEAGUE_ID,
        "current_race_id": num_races,
        "players": players_data
    }
    
    # Ensure directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Save to file
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_data, f, indent=2)
        
    print(f"✅ Mock data generated successfully at: {OUTPUT_FILE}")

def scrape_f1_data():
    """Performs the actual F1 Fantasy API scraping using session cookies."""
    print("🔌 Starting live scrape from F1 Fantasy API...")
    
    session = requests.Session()
    # F1 Fantasy uses F1_FANTASY_007 cookie for session auth
    session.cookies.set("F1_FANTASY_007", F1_TOKEN)
    
    # Include both cookies and authorization bearer header to be robust
    headers = {
        "Authorization": f"Bearer {F1_TOKEN}",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": F1_BASE_URL,
        "Referer": F1_BASE_URL
    }
    session.headers.update(headers)
    
    # 1. Fetch private league leaderboard
    # Endpoint: https://fantasy.formula1.com/services/user/leaderboard/{user_guid}/pvtleagueuserrankget/1/{league_id}/0/1/1/1000/
    leaderboard_url = f"{F1_BASE_URL}/services/user/leaderboard/{USER_GUID}/pvtleagueuserrankget/1/{LEAGUE_ID}/0/1/1/1000/"
    
    try:
        resp = session.get(leaderboard_url)
        resp.raise_for_status()
        res_json = resp.json()
        
        if not res_json.get("Data") or not res_json["Data"].get("Value"):
            raise ValueError(f"Invalid API response: {res_json.get('Meta')}")
            
        league_info = res_json["Data"]["Value"]["leagueInfo"]
        league_name = urllib.parse.unquote(league_info["leagueName"])
        members = res_json["Data"]["Value"]["memRank"]
        
        print(f"🏆 Found league: '{league_name}' with {len(members)} players.")
    except Exception as e:
        print(f"❌ Failed to fetch private leaderboard: {e}")
        print("Please verify your F1_TOKEN and F1_USER_GUID credentials.")
        return False
        
    # 2. Determine completed race IDs (Game Days)
    # Fetch from gameplay days endpoint to see completed races
    gamedays_url = f"{F1_BASE_URL}/services/user/gameplay/{USER_GUID}/getusergamedaysv1/1"
    gameday_status = {}
    user_team_no_map = {}
    try:
        resp = session.get(gamedays_url)
        resp.raise_for_status()
        gamedays_data = resp.json()["Data"]["Value"]
        
        # Normally data is a list. Let's find max race ID from mddetails keys
        if isinstance(gamedays_data, list) and len(gamedays_data) > 0:
            mddetails = gamedays_data[0]["mddetails"]
            races_occurred = [int(k) for k in mddetails.keys()]
            max_race_id = max(races_occurred)
            for k, v in mddetails.items():
                gameday_status[int(k)] = v.get("mds", 3)
            
            # Map team name to teamno for the token owner (lowercase, unquoted)
            for t in gamedays_data:
                t_name = urllib.parse.unquote(t.get("teamname", ""))
                t_no = t.get("teamno")
                if t_name and t_no is not None:
                    user_team_no_map[t_name.lower()] = int(t_no)
        else:
            max_race_id = 1
        
        print(f"🏎️ Current season has {max_race_id} completed races.")
    except Exception as e:
        print(f"⚠️ Failed to query game days ({e}). Defaulting to checking feeds up to race 24...")
        # fallback: ping driver feeds to see which ones are available
        max_race_id = 0
        for r_id in range(1, 25):
            feed_url = f"{F1_BASE_URL}/feeds/drivers/{r_id}_en.json"
            feed_resp = requests.head(feed_url)
            if feed_resp.status_code == 200:
                max_race_id = r_id
                gameday_status[r_id] = 3  # Assume completed
            else:
                break
        print(f"🏎️ Detected {max_race_id} completed races via driver feed pings.")

        
    if max_race_id == 0:
        print("❌ Could not determine any completed races. Cannot scrape.")
        return False
        
    # 3. Pre-load all driver feeds for each completed race to get name/TLA/price/points maps
    # We will build a nested map: race_feeds[race_id][player_id] = player_details
    race_feeds = {}
    for r_id in range(1, max_race_id + 1):
        print(f"📥 Fetching driver/constructor feed for race {r_id}...")
        feed_url = f"{F1_BASE_URL}/feeds/drivers/{r_id}_en.json"
        try:
            r = requests.get(feed_url)
            r.raise_for_status()
            val_list = r.json()["Data"]["Value"]
            race_feeds[r_id] = {item["PlayerId"]: item for item in val_list}
        except Exception as e:
            print(f"⚠️ Failed to get feed for race {r_id}: {e}")
            # Ensure we have at least an empty dict to avoid KeyError
            race_feeds[r_id] = {}
            
    # 4. Fetch the team details for each league member across all completed races
    players_data = []
    
    for member in members:
        m_guid = member["guid"]
        m_team_id = member["teamId"]
        m_team_name = urllib.parse.unquote(member["teamName"])
        m_user_name = urllib.parse.unquote(member["userName"])
        
        print(f"👤 Scraping player: {m_user_name} ({m_team_name})")
        
        history = []
        chips_used = []
        cumulative_points = 0.0
        
        # We loop from race 1 to max_race_id
        for r_id in range(1, max_race_id + 1):
            # Endpoint routing: Use opponentteam for everyone (including token owner using their full league GUID)
            if m_guid.startswith(USER_GUID):
                m_team_no = user_team_no_map.get(m_team_name.lower(), 1)
            else:
                m_team_no = 1
            
            team_url = f"{F1_BASE_URL}/services/user/opponentteam/opponentgamedayplayerteamget/1/{m_guid}/{m_team_no}/{r_id}/1"
            
            try:
                # Add delay to avoid aggressive rate limiting
                time.sleep(0.3)
                
                resp = session.get(team_url)
                resp.raise_for_status()
                team_payload = resp.json()["Data"]["Value"]
                
                if not team_payload or not team_payload.get("userTeam"):
                    print(f"  ⚠️ No team data for {m_user_name} in race {r_id}")
                    continue
                    
                user_team = team_payload["userTeam"][0]
                team_info = user_team.get("team_info")
                
                # Extract budget and value details with defensive fallbacks
                teambal = user_team.get("teambal")
                if teambal is None:
                    teambal = team_info.get("teamBal") if team_info else 0.0
                
                teamval = user_team.get("teamval")
                if teamval is None:
                    teamval = team_info.get("teamVal") if team_info else 100.0
                
                teambal = float(teambal) if teambal is not None else 0.0
                teamval = float(teamval) if teamval is not None else 100.0
                total_budget = round(teamval + teambal, 1)
                
                # Check active chips in this race using direct takengd fields
                active_chip = None
                if user_team.get("wildcardtakengd") == r_id or user_team.get("iswildcard") == 1:
                    active_chip = "wildcard"
                elif user_team.get("limitlesstakengd") == r_id:
                    active_chip = "limitless"
                elif user_team.get("autopilottakengd") == r_id:
                    active_chip = "autopilot"
                elif user_team.get("finalfixtakengd") == r_id:
                    active_chip = "final_fix"
                elif user_team.get("nonigativetakengd") == r_id:
                    active_chip = "no_negative"
                elif user_team.get("extradrstakengd") == r_id:
                    active_chip = "extra_drs"
                
                if active_chip and not any(c["chip"] == active_chip for c in chips_used):
                    chips_used.append({"chip": active_chip, "race_id": r_id})
                
                # Roster mapping
                drivers_list = []
                constructors_list = []
                
                # Hide team roster details if the race has not locked yet for privacy (for all players)
                is_unlocked = (gameday_status.get(r_id, 3) == 0)
                
                if not is_unlocked:
                    feed_map = race_feeds.get(r_id, {})
                    # playerid list contains the players in the roster
                    for p_item in user_team.get("playerid") or []:
                        p_id = p_item["id"]
                        is_captain = bool(p_item.get("iscaptain", 0))
                        is_triple_captain = bool(p_item.get("ismgcaptain", 0)) # Mega Captain
                        
                        # Fetch detailed stats from the feed map
                        feed_detail = feed_map.get(p_id, {})
                        p_name = urllib.parse.unquote(feed_detail.get("FUllName", f"Player {p_id}"))
                        p_tla = feed_detail.get("DriverTLA", "")
                        p_team = urllib.parse.unquote(feed_detail.get("TeamName", ""))
                        p_price = feed_detail.get("Value", 0.0)
                        p_points = float(feed_detail.get("GamedayPoints", 0.0)) if feed_detail.get("GamedayPoints") else 0.0
                        p_pos = feed_detail.get("PositionName", "DRIVER")
                        
                        # Multipliers
                        if is_captain:
                            p_points *= 2
                        elif is_triple_captain:
                            p_points *= 3
                            
                        if p_pos == "DRIVER":
                            drivers_list.append({
                                "id": p_id,
                                "name": p_name,
                                "tla": p_tla,
                                "team": p_team,
                                "price_at_race": p_price,
                                "points": p_points,
                                "is_captain": is_captain,
                                "is_triple_captain": is_triple_captain
                            })
                        else:
                            constructors_list.append({
                                "id": p_id,
                                "name": p_name,
                                "price_at_race": p_price,
                                "points": p_points
                            })
                
                points_gained = user_team.get("gdpoints")
                if points_gained is None:
                    # Sum team points
                    points_gained = sum(d["points"] for d in drivers_list) + sum(c["points"] for c in constructors_list)
                else:
                    points_gained = float(points_gained)
                    
                cumulative_points += points_gained
                
                history.append({
                    "race_id": r_id,
                    "race_name": RACE_NAMES.get(r_id, f"Race {r_id}"),
                    "points_gained": points_gained,
                    "total_points": cumulative_points,
                    "rank_in_league": 0, # Will set later
                    "budget": total_budget,
                    "team_value": teamval,
                    "active_chip": active_chip,
                    "team": {
                        "drivers": drivers_list,
                        "constructors": constructors_list
                    }
                })
                
            except Exception as e:
                print(f"  ⚠️ Error scraping race {r_id} for user {m_user_name}: {e}")
                
        # Overall totals
        players_data.append({
            "guid": m_guid,
            "player_name": m_user_name,
            "team_name": m_team_name,
            "total_points": member["ovPoints"],
            "rank": member["rank"],
            "current_budget": history[-1]["budget"] if history else 100.0,
            "current_team_value": history[-1]["team_value"] if history else 100.0,
            "chips_used": chips_used,
            "history": history
        })

        
    # 5. Post-process ranks race-by-race
    for race_idx in range(max_race_id):
        # Sort players by cumulative points at this race
        # Filter players who have history at this race
        active_players = [p for p in players_data if len(p["history"]) > race_idx]
        active_players.sort(key=lambda x: x["history"][race_idx]["total_points"], reverse=True)
        for rank_idx, player in enumerate(active_players):
            player["history"][race_idx]["rank_in_league"] = rank_idx + 1
            
    # Sort players by overall points
    players_data.sort(key=lambda x: x["total_points"], reverse=True)
    for rank_idx, player in enumerate(players_data):
        player["rank"] = rank_idx + 1
        
    # Compile output data structure
    output_data = {
        "last_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "league_name": league_name,
        "league_id": LEAGUE_ID,
        "current_race_id": max_race_id,
        "players": players_data
    }
    
    # Ensure directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Save output
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_data, f, indent=2)
        
    print(f"✅ Scraping completed! Output written to: {OUTPUT_FILE}")
    return True

if __name__ == "__main__":
    # If credentials are not set, generate premium mock data
    if not F1_TOKEN or not USER_GUID:
        generate_mock_data()
    else:
        success = scrape_f1_data()
        if not success:
            print("⚠️ Scraping failed. Generating mock fallback data for display...")
            generate_mock_data()
