# Steam Backlog Roulette

Too many games, nothing to play. Load a public Steam library, narrow it down, and let the roulette pick your next game.

## What it does

- **Public profile lookup:** paste a Steam profile URL, custom handle, or Steam64 ID. No visitor login required.
- **Backlog roulette:** spin through unfinished games that match your filters, with optional sound and reduced-motion support.
- **Library management:** track status, add tags, save games to Play Next, and import or export JSON backups.
- **Filters:** search by title, genre, review score, playtime, and known completion estimates.
- **Steam pulse:** browse 1,000 games by reported player counts, compare activity, and find popular games you already own. Four discovery cards show ten picks each.
- **Top 250 discovery:** start with six recommendations, or expand the full list. Once a library is loaded, roulette picks only from that library.

Your library and changes stay in your browser. Steam does not provide prices paid or time-to-beat, so those fields stay unknown unless you supply them.

## Run locally

Requires Node 26.10+ and pnpm 12.16.1.

```sh
pnpm install
pnpm build
pnpm start
```

Open **http://localhost:8787**. To enable profile lookup, copy `.env.example` to `.env` and set `STEAM_API_KEY`. This is the app's server key; visitors never enter one. Profiles and Game details must be public.

For frontend development, keep the backend running and use `pnpm dev` in another terminal.

## Standalone version

Open **`standalone/index.html`** without installing anything. It includes discovery rankings and supports local JSON libraries. Live profile lookup and activity refreshes need the server. Steam covers and confetti load from CDNs.

## Data sources

- [Steam](https://store.steampowered.com/charts/mostplayed) supplies public libraries, the official top-100 player feed, weekly rankings, store listings, and reviews.
- [Steam Charts](https://steamcharts.com/top) provides the wider player ranking, captured hourly. Official Steam counts take precedence where available. The combined list is sorted by reported counts; today's peaks are unknown outside Steam's official feed.
- [Steam 250](https://steam250.com/top250) supplies the discovery ranking. Its source and snapshot date appear in the app.

Activity history contains only samples this app has recorded for Steam's official top 100. It keeps up to seven days in `.data/activity-history.json`; persist that directory when hosting. Store prices are asking prices, not what a user paid.

Refresh bundled snapshots with `pnpm update:top250` or `pnpm update:activity`, then rebuild. Export your library before clearing browser data or moving to another browser.

## Development

Built with Solid 2, TypeScript, UnoCSS, Rimelight UI, Vite+, and Node. Pages live in `src/routes`: `(app)/index.tsx` for the backlog and `(app)/activity/index.tsx` for Steam pulse. `(app).tsx` holds the shared layout.

```sh
pnpm typecheck
pnpm test
pnpm test:browser
```

Browser checks use Chrome; set `CHROME_PATH` if needed. See [VERIFICATION.md](VERIFICATION.md) for test coverage and remaining live-account checks.

Independent project. Not affiliated with Valve, Steam, Steam Charts, or Steam 250.
