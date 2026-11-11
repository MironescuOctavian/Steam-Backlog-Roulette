# Steam Backlog Roulette & Time-to-Beat Planner

A Steam profile lookup and backlog planner using Solid 2, TypeScript, Rimelight UI, UnoCSS, Vite+, and a small Node server. Styling follows octavianmironescu.com: amber palettes, neutral dark surfaces, and fine orbital/grid decoration.

## Run the full app

Use Node 26.10+ (required by Rimelight UI) and pnpm 12.16.1.

```sh
pnpm install
pnpm build
pnpm start
```

Before starting, copy `.env.example` to `.env` and set `STEAM_API_KEY` to the application's Steam Web API key. This key remains on the server; visitors never provide a key or log in. Open `http://localhost:8787`. For a hosted deployment, set the secret through the hosting provider and set `HOST=0.0.0.0` when the platform requires it. Never commit `.env`.

For frontend development, run `pnpm start` for the backend and `pnpm dev` in a second terminal. Vite proxies `/api` requests to port 8787.

**Standalone:** opening `standalone/index.html` needs no installation and supports Top 250 discovery and JSON library imports. Steam profile lookup requires the hosted/server version. Builds refresh both `standalone/index.html` and `dist/index.html`, embedding JavaScript, CSS, icons, and fonts. Covers and optional confetti use external CDNs. This independent project is not affiliated with Valve or Steam.

## Profile-first behavior

There is no default profile or demo account. Before loading a library, the roulette and discovery grid use a real 250-game ranking snapshot. No personal playtime, pile-of-shame, cost/value, or backlog KPIs are displayed.

Enter your own or another person's public profile URL, custom handle, or Steam64 ID. Display names are not unique and cannot be used as a reliable identifier. On successful lookup, owned games replace the discovery pool, and recorded Steam playtime is shown. Private or failed lookups preserve the current library. An empty owned library stays empty; it never falls back to the Top 250. Switching profiles replaces the previous profile's games.

Steam does not provide prices paid or completion times. These remain unknown unless supplied through custom data/imports. Unknown costs are excluded from value calculations; unknown completion times are excluded by time filters and from time totals. Missing values are never assigned an invented 20-hour estimate. Review percentages and ranks come from the labeled Steam 250 snapshot; they are separate from Metacritic scores.

## Ranking data

`src/data/top250.json` is an attributed snapshot of [Steam 250](https://steam250.com/top250), an independent ranking based on Steam user reviews. Its source and date are shown in the app. Run `pnpm update:top250` then `pnpm build` to refresh it. The updater requires exactly 250 unique IDs and contiguous ranks before replacing the snapshot; source failures leave the previous file intact.

## Local data

The loaded library, profile identity, statuses, tags, and Play Next priority are saved in this browser's localStorage. Clearing browser data removes them. Failed writes preserve previous data. Invalid or unsupported saved data is preserved with a warning while discovery remains available. Legacy unmodified demo entries are not treated as owned games.

LocalStorage is scoped to the browser and origin; behavior under `file://` varies by browser. Use a static server for consistent persistence. Export JSON for backups or transfers between origins. Imports provide a preview and merge by App ID by default; replacement is an explicit choice.

## Server behavior

Profile lookup resolves vanity handles, requests profile identity and owned games from Steam, and returns sanitized public data. Requests are limited to Steam's fixed API host. Successful lookups are cached for five minutes; each client IP is limited to 30 lookups/minute. API responses never include the server key. The app no longer sends credentials through public CORS proxies.

Roulette draws equally from matching unfinished games. Reduced motion skips the long animation and confetti. Steam launch links require the desktop client and are shown only for a loaded library.

## Steam pulse

Steam pulse (`/activity`, or `#/activity` in the standalone file) is a secondary page for discovery; the default page remains the backlog and roulette. Four cards cover current player leaders, weekly rank gainers, new arrivals, and review favorites. The homepage has a compact link and an owned-library match count. Activity-table actions can mark owned games Play Next or return directly to their backlog card; unowned recommendations are never inserted into the library.

The server's `/api/activity` endpoint uses public Steam charts, the weekly ranking, store new releases, and StoreBrowse review summaries. It needs no Steam API key. Results are cached for five minutes, simultaneous refreshes share one upstream request, and refresh failures preserve the last good observation. Feed failures and timestamps are displayed. Review favorites are ranked only within the sampled top 100/new-release lists and require at least 50 reviews. Store prices are labeled US asking prices, never purchase prices.

The comparison chart shows current concurrent players and Steam's peak-today count. The hosted app records actual observations in ignored `.data/activity-history.json` on requests at least four minutes apart (normally five-minute refreshes), retaining up to seven days. History survives server restarts when that directory is persisted. It does not claim years of history or all-time peaks. Gaps longer than 15 minutes are not connected; missing counts are not zeros. Historical lines show relative activity using each series' own observed maximum; the now/peak view compares absolute counts.

The standalone HTML includes a dated real activity snapshot. Run `pnpm update:activity` then `pnpm build` to refresh this bundled fallback. Live charts/history require the hosted server; profile lookup independently still requires its server API key.

## Page routes

Routes follow the same filesystem convention as octavianmironescu.com, using `filesystem-routing` and Solid Router:

```text
src/
  main.tsx                         # browser entry and global styles
  App.tsx                          # router
  library-state.tsx                # shared library/profile state
  routes/
    (app).tsx                      # shared header, main, and footer layout
    (app)/
      index.tsx                    # / — backlog and roulette
      activity/index.tsx           # /activity — Steam pulse
      [...404].tsx                 # unknown pages
```

The Vite plugin generates `src/file-routes.d.ts`. Hosted navigation uses browser history with server-side HTML fallback for page reloads. The standalone build uses the router's hash-history adapter; route code stays bundled in the single HTML file. Shared library state remains mounted across page changes.

## Verification

Run `pnpm typecheck`, `pnpm test`, and `pnpm build`. `pnpm test:browser` uses headless Chrome to verify discovery without personal stats, library replacement, profile/private/empty states, persistence, filters, JSON transfers, roulette, and desktop/mobile layout. Hosted profile tests use explicit fixtures, not a default application profile. Set `CHROME_PATH` if Chrome is outside the default Windows location. Screenshots are saved to ignored `artifacts/`.

Live Steam requests require the server's `STEAM_API_KEY`; no live credential is shipped with the repository.
