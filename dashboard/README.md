# F1 Fantasy League Tracker Dashboard

This dashboard is a React + TypeScript + Vite application that visualizes statistics, budget changes, chips history, and trade analytics for your private F1 Fantasy league.

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (version 18+ recommended).

### 2. Install Dependencies
Run the following command from this directory ([dashboard/](file:///Users/dstringer/git/Workspaces/personal/F1Fantasy/dashboard)):
```bash
npm install
```

### 3. Run Locally
Start the local development server:
```bash
npm run dev
```
This will start Vite and output a URL (usually `http://localhost:5173`). Open it in your browser to view the dashboard.

---

## 🏎️ Data Integration

The dashboard consumes data from [dashboard/public/data.json](file:///Users/dstringer/git/Workspaces/personal/F1Fantasy/dashboard/public/data.json). 

* **Live Data updates:** Before running or deploying, you should run the Python scraper inside the [scraper/](file:///Users/dstringer/git/Workspaces/personal/F1Fantasy/scraper) folder to pull the latest race data. See [scraper/README.md](file:///Users/dstringer/git/Workspaces/personal/F1Fantasy/scraper/README.md) for credentials and run instructions.
* **Mock Data fallback:** If you run the scraper without credentials set in the `.env` file, it will automatically populate [dashboard/public/data.json](file:///Users/dstringer/git/Workspaces/personal/F1Fantasy/dashboard/public/data.json) with premium mock data for development.

---

## 📦 Deployment to GitHub Pages

The dashboard is configured to deploy directly to GitHub Pages.

To build and deploy the latest version of your dashboard:
```bash
npm run deploy
```

This script will:
1. Run `npm run build` (compiles TypeScript via `tsc` and bundles the site using Vite into the `dist/` directory).
2. Run `gh-pages -d dist` to push the production build output to the `gh-pages` branch on GitHub.
