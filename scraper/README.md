# F1 Fantasy Private League Scraper

This folder contains the Python script used to fetch F1 Fantasy private league standings, points, budgets, chip usage, and rosters from the official F1 Fantasy REST API.

## Setup Instructions

### 1. Install Dependencies
Ensure you have Python 3.10+ installed. Install the required Python packages into your environment:
```bash
# Set up a virtual environment (if you haven't already)
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 2. Extract F1 Fantasy Cookies & GUID
Because F1 Fantasy does not offer a public API, the script needs your session token to authenticate requests on your behalf.

1. Log in to [fantasy.formula1.com](https://fantasy.formula1.com) in your web browser.
2. Open your browser's **Developer Tools** (F12 or Right Click -> Inspect) and go to the **Network** tab.
3. Refresh the page or view your private league.
4. Filter by Fetch/XHR and look for a request containing `fantasy.formula1.com/services/`.
5. Select the request and inspect the headers:
   * **`F1_USER_GUID`**: Look at the request URL path. You will see a long alphanumeric GUID in the path, for example: `/services/user/leaderboard/a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6/pvtleagueuserrankget/...`. The string `a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6` is your **`F1_USER_GUID`**.
   * **`F1_TOKEN`**: Under **Headers -> Request Headers -> Cookie**, find the cookie named `F1_FANTASY_007`. Copy its value (a long base64/cryptographic string). This is your **`F1_TOKEN`**.

### 3. Configure `.env`
Create a `.env` file in this folder (`F1Fantasy/scraper/`) and populate it:
```env
F1_LEAGUE_ID=6360509
F1_USER_GUID=your_extracted_user_guid
F1_TOKEN=your_extracted_cookie_value
F1_SEASON=2026
```

> [!WARNING]
> Keep your `.env` secure and never commit it to git. The `.gitignore` file is already configured to ignore `.env` files.

---

## Running the Scraper

Run the script from this folder:
```bash
python main.py
```

* **If Credentials Are Set:** The script will query the live F1 Fantasy API, pull data for all players in your league, map their rosters to driver feeds, and write the output directly to the React dashboard at `../dashboard/public/data.json`.
* **If Credentials Are NOT Set (or blank):** The script will automatically generate premium mock data showing 9 players across 5 races so you can develop and test the React dashboard immediately!
