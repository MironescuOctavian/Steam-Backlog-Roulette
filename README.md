# Steam Backlog

Too many games, nothing to play. Load a public Steam library, narrow it down, and let the roulette pick your next game.

## What it does

- **Public profile lookup:** paste a Steam profile URL, custom handle, or Steam64 ID. No visitor login required.
- **Backlog roulette:** spin through unfinished games that match your filters, with optional sound and reduced-motion support.
- **Library management:** keep status and remaining time in view; expand Details & tags for purchase value, tags and source information. Save games to Play Next, and import or export JSON backups.
- **Filters:** quick choices for Never played, Under 10 hours and Play Next, with genre, review score and more inside Advanced filters.
- **Steam pulse:** browse 1,000 games in pages of 50, compare activity, and find popular games you already own. Four discovery cards show ten picks each.
- **Top 250 discovery:** start with six recommendations, or expand the full list. Once a library is loaded, roulette picks only from that library.

Your library and changes stay in your browser. Steam does not provide prices paid or time-to-beat, so those fields stay unknown unless you supply them.

Use **Refresh library** to update Steam playtime. The last sync time stays visible, and saved statuses, tags, priorities and filters are preserved when refreshing the same profile. Results can be up to five minutes old.

Hero motion pauses while you work with the library. Private profiles, empty libraries and failed activity refreshes offer recovery actions without replacing saved data. Bottom pagination brings you back to the ranking heading.

## Run locally

Requires Node 26.13.0 and pnpm 12.16.1.

```sh
pnpm install
pnpm build
pnpm start
```

Open **http://localhost:8787**. To enable profile lookup, copy `.env.example` to `.env` and set `STEAM_API_KEY`. This is the app's server key; visitors never enter one. Profiles and Game details must be public.

For frontend development, keep the backend running and use `pnpm dev` in another terminal.

## Cloudflare Workers

The build produces both the standalone app and Cloudflare Worker output. Use these settings in Workers Builds:

| Setting | Command |
| --- | --- |
| Build | `pnpm run build` |
| Deploy | `pnpm run deploy` |
| Version upload | `pnpm run upload:version` |
| Root directory | `/` |

`cf preview` is not a version-upload command. The scripts above use the prebuilt Worker output. Add `STEAM_API_KEY` as a Worker secret in Cloudflare to enable public-profile lookup. Keep it out of frontend variables and Git. The `HISTORY` KV binding stores observed activity; it is provisioned with the Worker. KV is eventually consistent, so overlapping refreshes may omit a sample. No missing counts are filled in.

Run `pnpm test:worker` after building to check the packaged app in Cloudflare’s local runtime. `pnpm cf deploy --prebuilt --dry-run` validates deployment packaging without publishing. On Workers, review enrichment is limited per refresh to leave room for the 1,000-game ranking requests and history storage; unavailable reviews remain unknown.

## Standalone version

Open **`standalone/index.html`** without installing anything. It includes discovery rankings and supports local JSON libraries. Live profile lookup and activity refreshes need the server. Steam covers and confetti load from CDNs.

The hosted build in `dist/` loads Steam pulse’s ranking separately when you visit that page. The standalone version embeds it so file-based navigation still works.

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
pnpm test:worker
```

Browser checks use Chrome; set `CHROME_PATH` if needed. See [VERIFICATION.md](VERIFICATION.md) for test coverage and remaining live-account checks.

Independent project. Not affiliated with Valve, Steam, Steam Charts, or Steam 250.
